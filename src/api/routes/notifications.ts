import { Router } from 'express';
import { prisma } from '../../infrastructure/db/prisma.client';
import { computeAlerts } from '../../shared/business/alerts';
import { parseFeeHistory } from '../../shared/business/tuition';
import { toArray, toJsonString } from '../../shared/json';
import { authenticateToken } from '../middleware/auth';

export const notificationsRouter = Router();

notificationsRouter.use(authenticateToken);

// GET /api/notifications
notificationsRouter.get('/notifications', async (req, res) => {
  try {
    const list = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/notifications/:id/read
notificationsRouter.patch('/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/notifications/read-all
notificationsRouter.patch('/notifications/read-all', async (req, res) => {
  try {
    const batch = await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true, count: batch.count });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/notifications/:id
notificationsRouter.delete('/notifications/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.notification.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/notifications/generate (runs V1 logic and saves alerts)
notificationsRouter.post('/notifications/generate', async (req, res) => {
  try {
    // 1. Fetch all raw data
    const [
      studentsRaw,
      classesRaw,
      tuitionTxRaw,
      revenueOtherRaw,
      attendanceRaw,
      expensesRaw,
      staffRaw,
      teachingLogsRaw,
      advancesRaw,
      salariesRaw,
      systemParametersRaw,
      enrollmentsRaw,
      admissionLeadsRaw
    ] = await Promise.all([
      prisma.student.findMany({ include: { guardianContacts: true } }),
      prisma.class.findMany(),
      prisma.tuitionTransaction.findMany(),
      prisma.revenueOther.findMany(),
      prisma.attendanceRecord.findMany({ include: { student: true, class: true } }),
      prisma.expense.findMany(),
      prisma.staffMember.findMany(),
      prisma.teachingLog.findMany({ include: { staff: true } }),
      prisma.salaryAdvance.findMany({ include: { staff: true } }),
      prisma.payrollItem.findMany({ include: { staff: true, payrollPeriod: true } }),
      prisma.systemParameter.findMany(),
      prisma.enrollment.findMany({ include: { class: true, student: true } }),
      prisma.admissionLead.findMany()
    ]);

    // 2. Format database objects to match V1 Types
    const staffMap = new Map<string, string>();
    staffRaw.forEach(s => staffMap.set(s.id, s.name));

    const classMap = new Map<string, string>();
    classesRaw.forEach(c => classMap.set(c.id, c.name));

    const students = studentsRaw.map(s => {
      const primaryContact = s.guardianContacts.find(c => c.isPrimary) || s.guardianContacts[0];
      const activeEnroll = enrollmentsRaw.find(e => e.studentId === s.id && e.isActive);
      return {
        id: s.id,
        name: s.name,
        vietnameseName: s.vietnameseName,
        englishName: s.englishName,
        vietAnhName: s.vietnameseName && s.englishName ? `${s.vietnameseName} (${s.englishName})` : s.vietnameseName || s.englishName || s.name,
        gender: s.gender || '',
        birthYear: s.birthDate ? parseInt(s.birthDate.slice(0, 4)) : 0,
        parentPhone: primaryContact ? primaryContact.phone : '',
        className: activeEnroll?.class.name || '',
        feePerSession: activeEnroll ? activeEnroll.feePerSession : 0,
        feeHistory: activeEnroll ? parseFeeHistory(activeEnroll.feeHistory) : [],
        status: s.status as any,
        enrollDate: s.enrollDate || '',
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        notes: s.notes || ''
      };
    });

    const classes = classesRaw.map(c => {
      const teacherName = staffMap.get(c.teacherId) || '';
      return {
        id: c.id,
        name: c.name,
        type: c.type as any,
        teacher: teacherName,
        teacherId: c.teacherId,
        room: c.room || '',
        maxStudents: c.maxStudents || 15,
        status: c.status as any,
        defaultFee: c.defaultFeePerSession,
        scheduleDays: toArray<string>(c.scheduleDays),
        scheduleTime: c.scheduleTime || '',
        description: c.description || '',
        schedule: c.scheduleTime ? `${toArray<string>(c.scheduleDays).join(', ')} — ${c.scheduleTime}` : '',
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString()
      };
    });

    const transactions = [
      ...tuitionTxRaw.map(t => ({
        id: t.id,
        createdAt: t.createdAt.toISOString(),
        paymentDate: t.paymentDate,
        studentId: t.studentId,
        studentName: students.find(s => s.id === t.studentId)?.name || 'Học viên',
        className: classesRaw.find(c => c.id === (enrollmentsRaw.find(e => e.id === t.enrollmentId)?.classId))?.name || '',
        term: t.term || '',
        amount: t.amount,
        paymentMethod: t.paymentMethod,
        revenueCategory: 'Học phí offline',
        notes: t.notes || '',
        isReconciled: t.isReconciled,
        isInvoiced: t.isInvoiced,
        senderName: '',
        studyType: 'Trực tiếp' as const
      })),
      ...revenueOtherRaw.map(t => ({
        id: t.id,
        createdAt: t.createdAt.toISOString(),
        paymentDate: t.paymentDate,
        studentId: t.studentId || '',
        studentName: students.find(s => s.id === t.studentId)?.name || 'Khách vãng lai',
        className: '',
        term: '',
        amount: t.amount,
        paymentMethod: t.paymentMethod,
        revenueCategory: t.category,
        notes: t.description || '',
        isReconciled: t.isReconciled,
        isInvoiced: false,
        senderName: '',
        studyType: 'Trực tiếp' as const
      }))
    ];

    const attendance = attendanceRaw.map(a => ({
      id: a.id,
      sessionId: a.sessionId,
      studentId: a.studentId,
      studentName: a.student.name,
      classId: a.classId,
      className: a.class.name,
      enrollmentId: a.enrollmentId,
      date: a.date,
      status: a.status as any,
      sessionsDeducted: a.sessionsDeducted,
      feeApplied: a.feeApplied,
      note: a.note || '',
      checkedBy: 'admin',
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.createdAt.toISOString()
    }));

    const expenses = expensesRaw.map(e => ({
      id: e.id,
      date: e.date,
      category: e.category,
      description: e.description,
      amount: e.amount,
      paymentMethod: e.paymentMethod,
      isRecurring: e.isRecurring,
      approvedBy: e.approvedBy || '',
      createdBy: e.createdBy,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString()
    }));

    const staff = staffRaw.map(s => ({
      id: s.id,
      name: s.name,
      role: s.role as any,
      phone: s.phone || '',
      baseSalary: s.baseSalary,
      ratePerSession: s.ratePerSession,
      otherMonthlyAllowance: s.otherMonthlyAllowance || 0,
      otherMonthlyAllowanceNote: s.otherMonthlyAllowanceNote || '',
      bankAccount: s.bankAccount || '',
      bankName: s.bankName || '',
      startDate: s.startDate,
      status: s.status as any,
      notes: s.notes || '',
      taxMethod: s.taxMethod as any,
      taxMethodValue: s.taxMethodValue,
      dependentsCount: s.dependentsCount,
      applySocialInsurance: s.applySocialInsurance,
      applyHealthInsurance: s.applyHealthInsurance,
      applyUnemploymentInsurance: s.applyUnemploymentInsurance,
      insuranceBaseSalary: s.insuranceBaseSalary || 0,
      ratePerHour: s.ratePerHour || 0,
      salaryHistory: toJsonString(s.salaryHistory),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString()
    }));

    const teachingLogs = teachingLogsRaw.map(l => ({
      id: l.id,
      staffId: l.staffId,
      staffName: l.staff.name,
      teacherId: l.staffId,
      teacherName: l.staff.name,
      date: l.date,
      classId: l.classId,
      className: classMap.get(l.classId) || '',
      sessions: l.sessions,
      isSubstitute: l.isSubstitute,
      hoursWorked: l.hoursWorked,
      source: l.source as any,
      note: l.note || '',
      createdAt: l.createdAt.toISOString()
    }));

    const advances = advancesRaw.map(a => ({
      id: a.id,
      staffId: a.staffId,
      staffName: a.staff.name,
      teacherId: a.staffId,
      teacherName: a.staff.name,
      amount: a.amount,
      date: a.date,
      reason: a.reason || '',
      approvedBy: a.approvedBy || '',
      createdAt: a.createdAt.toISOString()
    }));

    const salaries = salariesRaw.map(item => ({
      id: item.id,
      month: item.payrollPeriod.month,
      staffId: item.staffId,
      staffName: item.staff.name,
      teacherId: item.staffId,
      teacherName: item.staff.name,
      role: item.role as any,
      baseSalary: item.baseSalary,
      totalSessions: item.totalSessions,
      ratePerSession: item.ratePerSession,
      teachingIncome: item.teachingIncome,
      totalHours: item.totalHours,
      ratePerHour: item.ratePerHour,
      hourlyIncome: item.hourlyIncome,
      otherIncome: item.otherIncome,
      otherMonthlyAllowance: item.otherMonthlyAllowance,
      otherMonthlyAllowanceNote: item.otherMonthlyAllowanceNote || '',
      otherSalary: item.otherIncome,
      otherSalaryNote: item.notes || '',
      kpiDeduction: item.kpiDeduction,
      grossSalary: item.grossSalary,
      socialInsuranceAmount: item.socialInsuranceAmount,
      healthInsuranceAmount: item.healthInsuranceAmount,
      unemploymentInsuranceAmount: item.unemploymentInsuranceAmount,
      taxRate: item.taxRate,
      taxAmount: item.taxAmount,
      tax: item.taxAmount,
      totalAdvance: item.totalAdvance,
      advanceApplied: item.advanceApplied,
      netSalary: item.netSalary,
      status: item.status as any,
      notes: item.notes || '',
      createdAt: item.createdAt.toISOString()
    }));

    const systemParameters = systemParametersRaw.map(p => ({
      id: p.id,
      key: p.key,
      name: p.name,
      group: p.group as any,
      valueType: p.valueType as any,
      value: p.value,
      unit: p.unit || '',
      description: p.description || '',
      effectiveFrom: p.effectiveFrom,
      effectiveTo: p.effectiveTo || null,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      createdBy: p.createdBy,
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null,
      updatedBy: p.updatedBy || null
    }));

    const enrollments = enrollmentsRaw.map(e => ({
      id: e.id,
      studentId: e.studentId,
      studentName: e.student.name,
      className: e.class.name,
      feePerSession: e.feePerSession,
      startDate: e.startDate,
      endDate: e.endDate || undefined,
      isActive: e.isActive,
      transferNote: e.transferNote || undefined,
      feeHistory: parseFeeHistory(e.feeHistory),
      createdAt: e.createdAt.toISOString(),
      createdBy: e.createdBy
    }));

    const admissionLeads = admissionLeadsRaw.map(l => ({
      id: l.id,
      studentName: l.studentName,
      parentPhone: l.parentPhone,
      status: l.status,
      registrationDate: l.registrationDate
    }));

    // 3. Compute alerts
    const alerts = computeAlerts(
      students,
      classes,
      transactions,
      attendance,
      staff,
      teachingLogs,
      advances,
      salaries,
      expenses,
      systemParameters,
      admissionLeads,
      enrollments
    );

    // 4. Save computed alerts to database
    // Clear old unread notifications of computed types to prevent bloat
    await prisma.notification.deleteMany({ where: { isRead: false } });

    const createdNotifications = [];
    for (const alert of alerts) {
      const created = await prisma.notification.create({
        data: {
          type: alert.category,
          title: alert.message,
          message: alert.details || '',
          priority: alert.level,
          link: alert.link || null,
          isRead: false
        }
      });
      createdNotifications.push(created);
    }

    res.json(createdNotifications);
  } catch (error: any) {
    console.error('Notification generation error:', error);
    res.status(500).json({ message: 'Lỗi khi tạo cảnh báo tự động: ' + error.message });
  }
});
