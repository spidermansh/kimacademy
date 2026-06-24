import { Router } from 'express';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken, requireRole } from '../middleware/auth';
import { generateUniqueCode } from '../utils/codes';
import { monthRange } from '../utils/dates';
import { validateBody } from '../utils/validate';
import { createAdmissionLeadSchema } from '../schemas';

export const admissionsRouter = Router();

admissionsRouter.use(authenticateToken);
const requireAdmissionRole = requireRole(['admin', 'staff', 'accountant']);

// GET all admission leads
admissionsRouter.get('/admission-leads', async (req, res) => {
  try {
    const { status, source, startDate, endDate, search } = req.query;

    const where: any = {};
    if (status) where.status = status as string;
    if (source) where.source = source as string;
    if (startDate || endDate) {
      where.registrationDate = {};
      if (startDate) where.registrationDate.gte = startDate as string;
      if (endDate) where.registrationDate.lte = endDate as string;
    }

    if (search) {
      const s = (search as string).toLowerCase();
      where.OR = [
        { studentName: { contains: s, mode: 'insensitive' } },
        { parentName: { contains: s, mode: 'insensitive' } },
        { parentPhone: { contains: s } }
      ];
    }

    const list = await prisma.admissionLead.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET admission lead by ID
admissionsRouter.get('/admission-leads/:id', async (req, res) => {
  try {
    const lead = await prisma.admissionLead.findUnique({
      where: { id: req.params.id }
    });
    if (!lead) {
      return res.status(404).json({ message: 'Không tìm thấy hồ sơ tuyển sinh' });
    }
    res.json(lead);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST create admission lead
admissionsRouter.post('/admission-leads', requireAdmissionRole, validateBody(createAdmissionLeadSchema), async (req, res) => {
  const data = req.body;

  try {
    // Generate lead code if not provided
    const count = await prisma.admissionLead.count();
    const leadCode = data.leadCode || `TS-${String(count + 1).padStart(4, '0')}`;

    const created = await prisma.admissionLead.create({
      data: {
        leadCode,
        studentName: data.studentName,
        dateOfBirth: data.dateOfBirth || null,
        address: data.address || null,
        parentName: data.parentName || null,
        parentPhone: data.parentPhone,
        parentZalo: data.parentZalo || null,
        source: data.source || 'Facebook',
        learningNeed: data.learningNeed || null,
        consultationNote: data.consultationNote || null,
        assignedCounselor: data.assignedCounselor || null,
        registrationDate: data.registrationDate || new Date().toISOString().slice(0, 10),
        status: 'test_scheduled',
        testScheduleDate: data.testScheduleDate || null,
        testScheduleTime: data.testScheduleTime || null,
        testAssignee: data.testAssignee || null,
        testScheduleNote: data.testScheduleNote || null,
        createdBy: req.user?.name || req.user?.username || 'unknown', createdById: req.user?.userId || null
      }
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update admission lead
admissionsRouter.put('/admission-leads/:id', requireAdmissionRole, async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const existing = await prisma.admissionLead.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy hồ sơ tuyển sinh' });
    }

    const updated = await prisma.admissionLead.update({
      where: { id },
      data: {
        studentName: data.studentName,
        dateOfBirth: data.dateOfBirth,
        address: data.address,
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        parentZalo: data.parentZalo,
        source: data.source,
        learningNeed: data.learningNeed,
        consultationNote: data.consultationNote,
        assignedCounselor: data.assignedCounselor,
        registrationDate: data.registrationDate,
        status: data.status,
        testScheduleDate: data.testScheduleDate,
        testScheduleTime: data.testScheduleTime,
        testAssignee: data.testAssignee,
        testScheduleNote: data.testScheduleNote,
        testDate: data.testDate,
        testType: data.testType,
        testScore: data.testScore !== undefined ? Number(data.testScore) : undefined,
        suggestedLevel: data.suggestedLevel,
        testNote: data.testNote,
        testResultNote: data.testResultNote,
        rejectionReason: data.rejectionReason,
        assignedClassId: data.assignedClassId,
        updatedBy: req.user?.name || req.user?.username || 'unknown'
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST schedule test
admissionsRouter.post('/admission-leads/:id/schedule-test', requireAdmissionRole, async (req, res) => {
  const { id } = req.params;
  const { testScheduleDate, testScheduleTime, testAssignee, testScheduleNote } = req.body;

  try {
    const updated = await prisma.admissionLead.update({
      where: { id },
      data: {
        status: 'test_scheduled',
        testScheduleDate,
        testScheduleTime,
        testAssignee,
        testScheduleNote
      }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST save test result
admissionsRouter.post('/admission-leads/:id/test-result', requireAdmissionRole, async (req, res) => {
  const { id } = req.params;
  const { testDate, testType, testScore, suggestedLevel, testNote, testResultNote } = req.body;

  try {
    const updated = await prisma.admissionLead.update({
      where: { id },
      data: {
        status: 'tested',
        testDate,
        testType,
        testScore: Number(testScore),
        suggestedLevel,
        testNote,
        testResultNote
      }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST reject lead
admissionsRouter.post('/admission-leads/:id/reject', requireAdmissionRole, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const updated = await prisma.admissionLead.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: reason || 'Không có lý do cụ thể'
      }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST accept waiting class
admissionsRouter.post('/admission-leads/:id/accept-waiting-class', requireAdmissionRole, async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await prisma.admissionLead.update({
      where: { id },
      data: { status: 'accepted_waiting_class' }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST convert lead to official student (with duplicate checking)
admissionsRouter.post('/admission-leads/:id/convert', requireAdmissionRole, async (req, res) => {
  const { id } = req.params;
  const { classId, confirmDuplicate } = req.body;

  try {
    const lead = await prisma.admissionLead.findUnique({ where: { id } });
    if (!lead) {
      return res.status(404).json({ message: 'Không tìm thấy hồ sơ tuyển sinh' });
    }

    // 1. Duplicate check: Name + Parent Phone matching
    if (!confirmDuplicate) {
      const match = await prisma.student.findFirst({
        where: {
          name: { equals: lead.studentName, mode: 'insensitive' },
          guardianContacts: {
            some: { phone: lead.parentPhone }
          }
        }
      });

      if (match) {
        return res.status(409).json({
          message: `Học viên "${lead.studentName}" với SĐT "${lead.parentPhone}" đã tồn tại trên hệ thống.`,
          duplicateStudent: match
        });
      }
    }

    // 2. Resolve Class
    let dbClass = null;
    if (classId) {
      dbClass = await prisma.class.findUnique({ where: { id: classId } });
    } else if (lead.assignedClassId) {
      dbClass = await prisma.class.findUnique({ where: { id: lead.assignedClassId } });
    }

    const studentCode = await generateUniqueCode(prisma.student, 'HV');

    // 3. Create Student
    const student = await prisma.student.create({
      data: {
        code: studentCode,
        name: lead.studentName,
        vietnameseName: lead.studentName,
        englishName: lead.suggestedLevel || '',
        birthDate: lead.dateOfBirth,
        status: dbClass ? 'active' : 'waiting_class',
        enrollDate: new Date().toISOString().slice(0, 10),
        admissionLeadId: lead.id,
        notes: `Convert từ hồ sơ tuyển sinh mã ${lead.leadCode || ''}`,
        createdBy: req.user?.name || req.user?.username || 'unknown', createdById: req.user?.userId || null
      }
    });

    // 4. Create primary contact
    await prisma.guardianContact.create({
      data: {
        studentId: student.id,
        phone: lead.parentPhone,
        name: lead.parentName || (lead.studentName + ' Parent'),
        zalo: lead.parentZalo || null,
        address: lead.address || null,
        isPrimary: true,
        relationship: 'parent'
      }
    });

    // 5. Enroll in class if resolved
    if (dbClass) {
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: student.id,
          classId: dbClass.id,
          feePerSession: dbClass.defaultFeePerSession,
          startDate: new Date().toISOString().slice(0, 10),
          isActive: true,
          createdBy: req.user?.name || req.user?.username || 'unknown', createdById: req.user?.userId || null,
          feeHistory: []
        }
      });

      await prisma.tuitionLedgerEntry.create({
        data: {
          studentId: student.id,
          enrollmentId: enrollment.id,
          totalPaid: 0,
          totalSpent: 0,
          balance: 0,
          sessionsRemaining: 0
        }
      });
    }

    // 6. Update Lead status
    const updatedLead = await prisma.admissionLead.update({
      where: { id },
      data: {
        status: dbClass ? 'converted_assigned_class' : 'converted_waiting_class',
        assignedClassId: dbClass ? dbClass.id : null,
        convertedStudentId: student.id,
        convertedAt: new Date().toISOString().slice(0, 10),
        convertedBy: req.user?.name || req.user?.username || 'unknown'
      }
    });

    res.json({
      success: true,
      student,
      lead: updatedLead
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admission-summary
admissionsRouter.get('/admission-summary', async (req, res) => {
  const { month } = req.query;
  const m = month || new Date().toISOString().slice(0, 7);

  try {
    const leadsInMonth = await prisma.admissionLead.findMany({
      where: { registrationDate: monthRange(m as string) }
    });

    const total = leadsInMonth.length;
    const test_scheduled = leadsInMonth.filter(l => l.status === 'test_scheduled').length;
    const tested = leadsInMonth.filter(l => l.status === 'tested').length;
    const rejected = leadsInMonth.filter(l => l.status === 'rejected').length;
    const accepted_waiting_class = leadsInMonth.filter(l => l.status === 'accepted_waiting_class').length;
    const converted_waiting_class = leadsInMonth.filter(l => l.status === 'converted_waiting_class').length;
    const converted_assigned_class = leadsInMonth.filter(l => l.status === 'converted_assigned_class').length;
    const cancelled = leadsInMonth.filter(l => l.status === 'cancelled').length;

    const convertedCount = converted_waiting_class + converted_assigned_class;
    const conversionRate = total > 0 ? Math.round((convertedCount / total) * 100) : 0;

    const waitingLeads = await prisma.admissionLead.findMany({
      where: {
        status: {
          in: ['accepted_waiting_class', 'converted_waiting_class']
        }
      },
      orderBy: { registrationDate: 'asc' }
    });

    res.json({
      month: m,
      stats: {
        total,
        test_scheduled,
        tested,
        rejected,
        accepted_waiting_class,
        converted_waiting_class,
        converted_assigned_class,
        cancelled
      },
      conversionRate,
      waitingLeads
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
