import { Router } from 'express';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken, requireRole } from '../middleware/auth';
import { PAYMENT_METHOD_BALANCE_TRANSFER } from '../../shared/constants';
import { validateBody } from '../utils/validate';
import { createEnrollmentSchema } from '../schemas';
import { recalcEnrollmentLedger } from '../services/ledger';

export const enrollmentsRouter = Router();

enrollmentsRouter.use(authenticateToken);
const requireAcademicRole = requireRole(['admin', 'staff', 'accountant']);

// GET all enrollments
enrollmentsRouter.get('/enrollments', async (req, res) => {
  try {
    const { studentId, className, isActive } = req.query;

    const where: any = {};
    if (studentId) where.studentId = studentId as string;
    if (className) {
      const cls = await prisma.class.findFirst({
        where: {
          OR: [
            { id: className as string },
            { code: className as string },
            { name: className as string }
          ]
        }
      });
      if (cls) where.classId = cls.id;
    }
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const list = await prisma.enrollment.findMany({
      where,
      include: {
        student: true,
        class: true,
        ledgerEntries: true
      },
      orderBy: { startDate: 'desc' }
    });

    const formatted = list.map(e => ({
      id: e.id,
      studentId: e.studentId,
      studentName: e.student.name,
      classId: e.classId,
      className: e.class.name,
      feePerSession: e.feePerSession,
      startDate: e.startDate,
      endDate: e.endDate || '',
      isActive: e.isActive,
      transferNote: e.transferNote || '',
      feeHistory: JSON.parse(e.feeHistory || '[]'),
      createdAt: e.createdAt,
      sessionsRemaining: e.ledgerEntries[0]?.sessionsRemaining || 0,
      balance: e.ledgerEntries[0]?.balance || 0
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST create enrollment
enrollmentsRouter.post('/enrollments', requireAcademicRole, validateBody(createEnrollmentSchema), async (req, res) => {
  const data = req.body;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.create({
        data: {
          studentId: data.studentId,
          classId: data.classId,
          feePerSession: Number(data.feePerSession),
          startDate: data.startDate || new Date().toISOString().slice(0, 10),
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdBy: req.user?.name || req.user?.username || 'unknown',
          feeHistory: '[]'
        }
      });

      await tx.tuitionLedgerEntry.create({
        data: {
          studentId: data.studentId,
          enrollmentId: enrollment.id,
          totalPaid: 0,
          totalSpent: 0,
          balance: 0,
          sessionsRemaining: 0
        }
      });

      return enrollment;
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST class transfer
enrollmentsRouter.post('/enrollments/transfer', requireAcademicRole, async (req, res) => {
  const { studentId, studentName, oldClassName, newClassName, newFeePerSession, transferDate, transferNote } = req.body;

  if (!studentId || !newClassName || !transferDate) {
    return res.status(400).json({ message: 'Thiếu thông tin chuyển lớp' });
  }

  try {
    // Find new class
    const newClass = await prisma.class.findFirst({
      where: {
        OR: [
          { id: newClassName },
          { code: newClassName },
          { name: newClassName }
        ]
      }
    });
    if (!newClass) {
      return res.status(400).json({ message: `Không tìm thấy lớp học mới: ${newClassName}` });
    }

    await prisma.$transaction(async (tx) => {
    let oldEnrollmentId = '';
    let oldBalance = 0;

    // Close old enrollment if exists
    if (oldClassName) {
      const oldClass = await tx.class.findFirst({
        where: {
          OR: [
            { id: oldClassName },
            { code: oldClassName },
            { name: oldClassName }
          ]
        }
      });
      if (oldClass) {
        const oldEnroll = await tx.enrollment.findFirst({
          where: { studentId, classId: oldClass.id, isActive: true }
        });

        if (oldEnroll) {
          oldEnrollmentId = oldEnroll.id;
          await tx.enrollment.update({
            where: { id: oldEnroll.id },
            data: {
              isActive: false,
              endDate: transferDate,
              transferNote: transferNote || `Chuyển sang lớp ${newClassName}`
            }
          });

          // Read old ledger balance
          const oldLedger = await tx.tuitionLedgerEntry.findUnique({
            where: { enrollmentId: oldEnroll.id }
          });
          if (oldLedger) {
            oldBalance = oldLedger.balance;
          }
        }
      }
    }

    // Create new enrollment
    const newEnroll = await tx.enrollment.create({
      data: {
        studentId,
        classId: newClass.id,
        feePerSession: Number(newFeePerSession),
        startDate: transferDate,
        isActive: true,
        createdBy: req.user?.name || req.user?.username || 'unknown',
        feeHistory: '[]',
        transferNote: `Chuyển từ lớp ${oldClassName || 'Không lớp'}`
      }
    });

    // Create new tuition ledger
    const newLedger = await tx.tuitionLedgerEntry.create({
      data: {
        studentId,
        enrollmentId: newEnroll.id,
        totalPaid: 0,
        totalSpent: 0,
        balance: 0,
        sessionsRemaining: 0
      }
    });

    // Carry over balance — mang theo cả số dư dương (còn tiền) lẫn âm (đang nợ),
    // để công nợ của học viên không bị bỏ lại trên enrollment đã đóng. Ghi 2 bút
    // toán đối ứng rồi tính lại sổ cái hai bên từ dữ liệu gốc.
    if (oldBalance !== 0 && oldEnrollmentId) {
      await tx.tuitionTransaction.create({
        data: {
          studentId,
          enrollmentId: oldEnrollmentId,
          amount: -oldBalance,
          paymentDate: transferDate,
          paymentMethod: PAYMENT_METHOD_BALANCE_TRANSFER,
          notes: `Chuyển số dư sang lớp ${newClassName}`,
          createdBy: req.user?.name || req.user?.username || 'unknown'
        }
      });

      await tx.tuitionTransaction.create({
        data: {
          studentId,
          enrollmentId: newEnroll.id,
          amount: oldBalance,
          paymentDate: transferDate,
          paymentMethod: PAYMENT_METHOD_BALANCE_TRANSFER,
          notes: `Nhận số dư chuyển từ lớp ${oldClassName}`,
          createdBy: req.user?.name || req.user?.username || 'unknown'
        }
      });

      await recalcEnrollmentLedger(tx, oldEnrollmentId);
      await recalcEnrollmentLedger(tx, newEnroll.id);
    }

    // Update student's primary class name in student profile
    await tx.student.update({
      where: { id: studentId },
      data: { status: 'active' }
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        action: 'TRANSFER_CLASS',
        entity: 'student',
        entityId: studentId,
        details: `Chuyển lớp học viên ${studentName}: ${oldClassName || ''} -> ${newClassName}`,
        user: req.user?.name || req.user?.username || 'unknown'
      }
    });

    });
    res.json({ success: true, message: 'Chuyển lớp thành công' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST add class enrollment
enrollmentsRouter.post('/enrollments/add-class', requireAcademicRole, async (req, res) => {
  const { studentId, studentName, className, feePerSession, startDate } = req.body;
  if (!studentId || !className || !startDate) {
    return res.status(400).json({ message: 'Thiếu thông tin đăng ký lớp' });
  }

  try {
    const cls = await prisma.class.findFirst({
      where: {
        OR: [
          { id: className },
          { code: className },
          { name: className }
        ]
      }
    });
    if (!cls) {
      return res.status(404).json({ message: `Không tìm thấy lớp học: ${className}` });
    }

    const existing = await prisma.enrollment.findFirst({
      where: { studentId, classId: cls.id, isActive: true }
    });
    if (existing) {
      return res.status(400).json({ message: 'Học viên đã đăng ký học lớp này' });
    }

    const created = await prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.create({
      data: {
        studentId,
        classId: cls.id,
        feePerSession: Number(feePerSession),
        startDate,
        isActive: true,
        createdBy: req.user?.name || req.user?.username || 'unknown',
        feeHistory: '[]',
        transferNote: 'Đăng ký thêm lớp học'
      }
    });

    await tx.tuitionLedgerEntry.create({
      data: {
        studentId,
        enrollmentId: enrollment.id,
        totalPaid: 0,
        totalSpent: 0,
        balance: 0,
        sessionsRemaining: 0
      }
    });

      return enrollment;
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update enrollment fee (retroactive or prospective)
enrollmentsRouter.put('/enrollments/:id/fee', requireAcademicRole, async (req, res) => {
  const { id } = req.params;
  const { feePerSession, feeChangeMode } = req.body;

  if (feePerSession === undefined) {
    return res.status(400).json({ message: 'Thiếu học phí mới' });
  }

  const newFee = Number(feePerSession);
  const changeMode = feeChangeMode || 'retroactive';

  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: { ledgerEntries: true }
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin đăng ký lớp' });
    }

    const oldFee = enrollment.feePerSession;

    if (oldFee !== newFee) {
      const feeHistory = JSON.parse(enrollment.feeHistory || '[]');
      feeHistory.push({
        changedBy: req.user?.name || req.user?.username || 'Hệ thống',
        changedAt: new Date().toISOString(),
        oldFee,
        newFee,
        mode: changeMode
      });

      await prisma.$transaction(async (tx) => {
      await tx.enrollment.update({
        where: { id },
        data: {
          feePerSession: newFee,
          feeHistory: JSON.stringify(feeHistory)
        }
      });

      // Update Attendance records:
      if (changeMode === 'retroactive') {
        // Update all attendance records where sessionsDeducted === 1
        await tx.attendanceRecord.updateMany({
          where: {
            enrollmentId: id,
            sessionsDeducted: 1
          },
          data: {
            feeApplied: newFee
          }
        });
      } else if (changeMode === 'prospective') {
        // Update only today and future attendance records where sessionsDeducted === 1
        const todayStr = new Date().toISOString().slice(0, 10);
        await tx.attendanceRecord.updateMany({
          where: {
            enrollmentId: id,
            sessionsDeducted: 1,
            date: { gte: todayStr }
          },
          data: {
            feeApplied: newFee
          }
        });
      }

      // Tính lại sổ cái từ dữ liệu gốc (sau khi đã cập nhật feeApplied ở trên).
      await recalcEnrollmentLedger(tx, id);
      });
    }

    res.json({ success: true, message: 'Cập nhật học phí thành công' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE remove class enrollment (closes it)
enrollmentsRouter.delete('/enrollments/:id', requireAcademicRole, async (req, res) => {
  const { id } = req.params;
  const { endDate } = req.query;
  const dateStr = (endDate as string) || new Date().toISOString().slice(0, 10);

  try {
    const enrollment = await prisma.enrollment.findUnique({ where: { id } });
    if (!enrollment) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin đăng ký lớp' });
    }

    const updated = await prisma.enrollment.update({
      where: { id },
      data: {
        isActive: false,
        endDate: dateStr
      }
    });

    res.json({ success: true, updated });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
