import { Router } from 'express';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken, requireRole } from '../middleware/auth';
import { getFeeAtDate, parseFeeHistory } from '../../shared/business/tuition';
import { recalcEnrollmentLedger } from '../services/ledger';

export const attendanceRouter = Router();

attendanceRouter.use(authenticateToken);
const requireAttendanceRole = requireRole(['admin', 'staff', 'accountant', 'teacher', 'teaching_assistant']);

// GET attendance records
attendanceRouter.get('/attendance', async (req, res) => {
  try {
    const { date, classId, studentId } = req.query;

    const where: any = {};
    if (date) where.date = date as string;
    if (classId) {
      const cls = await prisma.class.findFirst({
        where: {
          OR: [
            { id: classId as string },
            { code: classId as string },
            { name: classId as string }
          ]
        }
      });
      if (cls) {
        where.classId = cls.id;
      }
    }
    if (studentId) where.studentId = studentId as string;

    const list = await prisma.attendanceRecord.findMany({
      where,
      include: {
        student: true,
        class: true
      },
      orderBy: { date: 'desc' }
    });

    const formatted = list.map(a => ({
      id: a.id,
      sessionId: a.sessionId,
      studentId: a.studentId,
      studentName: a.student.name,
      classId: a.classId,
      className: a.class.name,
      enrollmentId: a.enrollmentId,
      date: a.date,
      status: a.status,
      sessionsDeducted: a.sessionsDeducted,
      feeApplied: a.feeApplied,
      note: a.note || '',
      source: a.source || 'manual',
      createdAt: a.createdAt
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST save attendance batch (with ledger recalculation and TeachingLog creation)
attendanceRouter.post('/attendance/batch', requireAttendanceRole, async (req, res) => {
  try {
    const { records, teacherId, teacherName, isSubstitute, originalTeacherId, originalTeacherName, classId, date: bodyDate } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'Dữ liệu điểm danh không hợp lệ' });
    }

    const firstRecord = records[0];
    const date = bodyDate || firstRecord.date;
    const className = firstRecord.className;

    // Resolve classId
    let dbClassId = classId || firstRecord.classId;
    let cls = await prisma.class.findFirst({
      where: {
        OR: [
          { id: dbClassId },
          { code: dbClassId },
          { name: dbClassId },
          { code: className },
          { name: className }
        ]
      }
    });
    if (!cls) {
      return res.status(400).json({ message: `Không tìm thấy lớp học ${className || dbClassId}` });
    }
    dbClassId = cls.id;

    // Resolve teacher
    const finalTeacherId = teacherId || cls.teacherId;
    const teacher = await prisma.staffMember.findUnique({ where: { id: finalTeacherId } });
    const finalTeacherName = teacher?.name || teacherName || 'Giáo viên';

    const savedRecords = await prisma.$transaction(async (tx) => {
    // 1. Find or create Session
    let session = await tx.session.findFirst({
      where: { classId: dbClassId, date }
    });

    if (!session) {
      session = await tx.session.create({
        data: {
          classId: dbClassId,
          date,
          teacherId: finalTeacherId,
          isSubstitute: isSubstitute || false,
          substituteForTeacherId: isSubstitute ? (originalTeacherId || cls.teacherId) : null,
          status: 'completed',
          createdBy: req.user?.name || req.user?.username || 'unknown'
        }
      });
    } else {
      // Update session teacher if modified
      session = await tx.session.update({
        where: { id: session.id },
        data: {
          teacherId: finalTeacherId,
          isSubstitute: isSubstitute || false,
          substituteForTeacherId: isSubstitute ? (originalTeacherId || cls.teacherId) : null
        }
      });
    }

    const savedRecords: any[] = [];
    const enrollmentsToUpdate = new Set<string>(); // Keep track of enrollments to update ledgers

    // 2. Save each attendance record
    for (const r of records) {
      const student = await tx.student.findFirst({
        where: {
          OR: [
            { id: r.studentId },
            { code: r.studentId },
            { name: r.studentId },
            { code: r.studentName },
            { name: r.studentName }
          ]
        }
      });
      if (!student) continue;

      // Find enrollment
      let enrollment = await tx.enrollment.findFirst({
        where: { studentId: student.id, classId: dbClassId, isActive: true }
      });
      if (!enrollment) {
        // Fallback to any enrollment for this student in this class
        enrollment = await tx.enrollment.findFirst({
          where: { studentId: student.id, classId: dbClassId }
        });
      }
      if (!enrollment) continue;

      const sessionsDeducted = r.status === 'excused' ? 0 : 1;
      const feeApplied = r.status === 'excused' ? 0 : getFeeAtDate(date, enrollment.feePerSession, parseFeeHistory(enrollment.feeHistory));

      // Check if already exists
      const existing = await tx.attendanceRecord.findFirst({
        where: { sessionId: session.id, studentId: student.id }
      });

      let saved;
      if (existing) {
        saved = await tx.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            status: r.status,
            sessionsDeducted,
            feeApplied,
            note: r.note || null,
            source: r.source || 'manual'
          }
        });
      } else {
        saved = await tx.attendanceRecord.create({
          data: {
            id: r.id || undefined,
            sessionId: session.id,
            studentId: student.id,
            classId: dbClassId,
            enrollmentId: enrollment.id,
            date,
            status: r.status,
            sessionsDeducted,
            feeApplied,
            note: r.note || null,
            source: r.source || 'manual',
            createdBy: req.user?.name || req.user?.username || 'unknown'
          }
        });
      }
      savedRecords.push(saved);
      enrollmentsToUpdate.add(enrollment.id);
    }

    // 3. Recalculate Tuition Ledgers (một nguồn sự thật duy nhất).
    for (const enrollmentId of enrollmentsToUpdate) {
      await recalcEnrollmentLedger(tx, enrollmentId);
    }

    // 4. Auto-generate TeachingLog
    const hasPresent = records.some(r => r.status === 'present');
    if (finalTeacherId && hasPresent) {
      const existingLog = await tx.teachingLog.findFirst({
        where: { staffId: finalTeacherId, date, classId: dbClassId }
      });

      if (!existingLog) {
        await tx.teachingLog.create({
          data: {
            staffId: finalTeacherId,
            date,
            classId: dbClassId,
            sessionId: session.id,
            sessions: 1,
            isSubstitute: isSubstitute || false,
            originalTeacherId: isSubstitute ? (originalTeacherId || cls.teacherId) : null,
            hoursWorked: 1.5,
            source: 'auto',
            note: isSubstitute ? 'Dạy thay' : 'Dạy chính'
          }
        });
      }
    }

    // 5. Add audit log
    await tx.auditLog.create({
      data: {
        action: 'SAVE_ATTENDANCE_BATCH',
        entity: 'attendance',
        details: `Điểm danh lớp ${cls.name} ngày ${date}`,
        user: req.user?.name || req.user?.username || 'unknown'
      }
    });

      return savedRecords;
    });

    res.status(201).json(savedRecords);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE attendance record
attendanceRouter.delete('/attendance/:id', requireAttendanceRole, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.$transaction(async (tx) => {
    const record = await tx.attendanceRecord.findUnique({
      where: { id }
    });

    if (!record) {
      throw new Error('ATTENDANCE_NOT_FOUND');
    }

    const { enrollmentId, sessionId, classId, date } = record;

    // Delete the record
    await tx.attendanceRecord.delete({
      where: { id }
    });

    // Tính lại sổ cái từ dữ liệu gốc sau khi xóa điểm danh.
    await recalcEnrollmentLedger(tx, enrollmentId);

    // Cleanup TeachingLog if no more present students
    const presentCount = await tx.attendanceRecord.count({
      where: { sessionId, status: 'present' }
    });

    if (presentCount === 0) {
      await tx.teachingLog.deleteMany({
        where: { sessionId, source: 'auto' }
      });
    }
    });

    res.json({ success: true, message: 'Xóa điểm danh thành công.' });
  } catch (error: any) {
    if (error.message === 'ATTENDANCE_NOT_FOUND') {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi điểm danh' });
    }
    res.status(500).json({ message: error.message });
  }
});
