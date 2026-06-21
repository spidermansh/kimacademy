import { Router } from 'express';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken, requireRole } from '../middleware/auth';
import { generateUniqueCode } from '../utils/codes';
import { parseFeeHistory } from '../../shared/business/tuition';

export const studentsRouter = Router();

studentsRouter.use(authenticateToken);
const requireAcademicRole = requireRole(['admin', 'staff', 'accountant']);

// GET all students (formatted for V1 frontend)
studentsRouter.get('/students', async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        guardianContacts: true,
        enrollments: {
          include: {
            class: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const formatted = students.map(s => {
      const activeEnrollment = s.enrollments.find(e => e.isActive) || s.enrollments[0];
      const primaryContact = s.guardianContacts.find(c => c.isPrimary) || s.guardianContacts[0];
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        vietnameseName: s.vietnameseName,
        englishName: s.englishName,
        vietAnhName: `${s.vietnameseName} (${s.englishName})`,
        gender: s.gender,
        birthYear: s.birthDate ? parseInt(s.birthDate.slice(0, 4)) : null,
        parentPhone: primaryContact ? primaryContact.phone : '',
        className: activeEnrollment?.class?.name || '',
        feePerSession: activeEnrollment ? activeEnrollment.feePerSession : 0,
        feeHistory: activeEnrollment ? parseFeeHistory(activeEnrollment.feeHistory) : [],
        status: s.status,
        enrollDate: s.enrollDate,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      };
    });

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST create student
studentsRouter.post('/students', requireAcademicRole, async (req, res) => {
  const data = req.body;
  try {
    const code = await generateUniqueCode(prisma.student, 'HV', data.code);
    const student = await prisma.$transaction(async (tx) => {
      const createdStudent = await tx.student.create({
        data: {
          code,
          name: data.name,
          vietnameseName: data.vietnameseName || data.name,
          englishName: data.englishName || '',
          gender: data.gender || null,
          birthDate: data.birthYear ? `${data.birthYear}-01-01` : null,
          status: data.status || 'active',
          enrollDate: data.enrollDate || new Date().toISOString().slice(0, 10),
          createdBy: req.user?.name || req.user?.username || 'unknown'
        }
      });

      if (data.parentPhone) {
        await tx.guardianContact.create({
          data: {
            studentId: createdStudent.id,
            phone: data.parentPhone,
            name: data.parentName || (data.name + ' Parent'),
            isPrimary: true,
            relationship: 'parent'
          }
        });
      }

      if (data.className) {
        const cls = await tx.class.findUnique({
          where: { name: data.className }
        });
        if (cls) {
          const fee = data.feePerSession !== undefined ? Number(data.feePerSession) : cls.defaultFeePerSession;
          const enrollment = await tx.enrollment.create({
            data: {
              studentId: createdStudent.id,
              classId: cls.id,
              feePerSession: fee,
              startDate: data.enrollDate || new Date().toISOString().slice(0, 10),
              isActive: true,
              createdBy: req.user?.name || req.user?.username || 'unknown',
              feeHistory: []
            }
          });

          await tx.tuitionLedgerEntry.create({
            data: {
              studentId: createdStudent.id,
              enrollmentId: enrollment.id,
              totalPaid: 0,
              totalSpent: 0,
              balance: 0,
              sessionsRemaining: 0
            }
          });
        }
      }

      return createdStudent;
    });

    res.status(201).json(student);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update student
studentsRouter.put('/students/:id', requireAcademicRole, async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        guardianContacts: true,
        enrollments: {
          include: {
            class: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ message: 'Không tìm thấy học viên' });
    }

    // Update core student details
    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        name: data.name,
        vietnameseName: data.vietnameseName,
        englishName: data.englishName,
        gender: data.gender,
        birthDate: data.birthYear ? `${data.birthYear}-01-01` : null,
        status: data.status,
        enrollDate: data.enrollDate,
        updatedBy: req.user?.name || req.user?.username || 'unknown'
      }
    });

    // Tự động đóng các đăng ký lớp hoạt động khi chuyển trạng thái nghỉ học / tạm nghỉ
    if (data.status === 'left' || data.status === 'suspended') {
      const todayStr = new Date().toISOString().slice(0, 10);
      await prisma.enrollment.updateMany({
        where: {
          studentId: id,
          isActive: true
        },
        data: {
          isActive: false,
          endDate: todayStr
        }
      });
    }

    // Update parent phone
    if (data.parentPhone !== undefined) {
      const primaryContact = student.guardianContacts.find(c => c.isPrimary);
      if (primaryContact) {
        await prisma.guardianContact.update({
          where: { id: primaryContact.id },
          data: { phone: data.parentPhone }
        });
      } else {
        await prisma.guardianContact.create({
          data: {
            studentId: id,
            phone: data.parentPhone,
            isPrimary: true,
            relationship: 'parent'
          }
        });
      }
    }

    res.json(updatedStudent);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE student (soft delete by setting status='left' if financial records exist)
studentsRouter.delete('/students/:id', requireAcademicRole, async (req, res) => {
  const { id } = req.params;

  try {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        transactions: true,
        attendanceRecords: true
      }
    });

    if (!student) {
      return res.status(404).json({ message: 'Không tìm thấy học viên' });
    }

    // Check if student has transactions or attendance
    if (student.transactions.length > 0 || student.attendanceRecords.length > 0) {
      const todayStr = new Date().toISOString().slice(0, 10);
      // Must soft-delete to preserve references
      await prisma.student.update({
        where: { id },
        data: { status: 'left' }
      });
      await prisma.enrollment.updateMany({
        where: {
          studentId: id,
          isActive: true
        },
        data: {
          isActive: false,
          endDate: todayStr
        }
      });
      return res.json({ success: true, message: 'Đã chuyển trạng thái học viên thành "Đã nghỉ" và đóng tất cả đăng ký lớp học.' });
    }

    // Otherwise, clean delete
    await prisma.tuitionLedgerEntry.deleteMany({ where: { studentId: id } });
    await prisma.enrollment.deleteMany({ where: { studentId: id } });
    await prisma.guardianContact.deleteMany({ where: { studentId: id } });
    await prisma.student.delete({ where: { id } });

    res.json({ success: true, message: 'Xóa học viên thành công.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Batch imports (legacy endpoint support)
studentsRouter.post('/students/batch', requireAcademicRole, async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students)) {
    return res.status(400).json({ message: 'Dữ liệu danh sách không hợp lệ' });
  }

  const results: any[] = [];
  try {
    for (const data of students) {
      const code = await generateUniqueCode(prisma.student, 'HV', data.code);
      // Find or create student
      const student = await prisma.$transaction(async (tx) => {
        const createdStudent = await tx.student.create({
          data: {
            code,
            name: data.name,
            vietnameseName: data.vietnameseName || data.name,
            englishName: data.englishName || '',
            gender: data.gender || null,
            birthDate: data.birthYear ? `${data.birthYear}-01-01` : null,
            status: data.status || 'active',
            enrollDate: data.enrollDate || new Date().toISOString().slice(0, 10),
            createdBy: req.user?.name || req.user?.username || 'import'
          }
        });

        if (data.parentPhone) {
          await tx.guardianContact.create({
            data: {
              studentId: createdStudent.id,
              phone: data.parentPhone,
              name: data.parentName || '',
              isPrimary: true,
              relationship: 'parent'
            }
          });
        }

        if (data.className) {
          const cls = await tx.class.findUnique({
            where: { name: data.className }
          });
          if (cls) {
            const fee = data.feePerSession !== undefined ? Number(data.feePerSession) : cls.defaultFeePerSession;
            const enrollment = await tx.enrollment.create({
              data: {
                studentId: createdStudent.id,
                classId: cls.id,
                feePerSession: fee,
                startDate: data.enrollDate || new Date().toISOString().slice(0, 10),
                isActive: true,
                createdBy: req.user?.name || req.user?.username || 'import',
                feeHistory: []
              }
            });

            await tx.tuitionLedgerEntry.create({
              data: {
                studentId: createdStudent.id,
                enrollmentId: enrollment.id,
                totalPaid: 0,
                totalSpent: 0,
                balance: 0,
                sessionsRemaining: 0
              }
            });
          }
        }

        return createdStudent;
      });

      results.push(student);
    }

    res.status(201).json(results);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST check duplicate student
studentsRouter.post('/students/check-duplicate', async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }
  try {
    const exists = await prisma.student.findFirst({
      where: {
        name,
        guardianContacts: {
          some: { phone }
        }
      }
    });
    res.json({ exists: !!exists });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

