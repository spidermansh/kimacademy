import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../../src/infrastructure/db/prisma.client';
import { REPORT_GROUPS } from '../../src/shared/business/reports';

function getReportById(id: string) {
  for (const group of REPORT_GROUPS) {
    const found = group.reports.find(r => r.id === id);
    if (found) return found;
  }
  return undefined;
}

async function buildReportParams(filters: any = {}) {
  // Fetch all raw data required for reports
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
    dailyClosesRaw,
    auditLogsRaw,
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
    prisma.dailyClose.findMany(),
    prisma.auditLog.findMany(),
    prisma.systemParameter.findMany(),
    prisma.enrollment.findMany({ include: { class: true, student: true, ledgerEntries: true } }),
    prisma.admissionLead.findMany()
  ]);

  const staffMap = new Map<string, string>();
  staffRaw.forEach(s => staffMap.set(s.id, s.name));

  const students = studentsRaw.map(s => {
    const primaryContact = s.guardianContacts.find(c => c.isPrimary) || s.guardianContacts[0];
    const activeEnroll = enrollmentsRaw.find(e => e.studentId === s.id && e.isActive);
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      vietnameseName: s.vietnameseName,
      englishName: s.englishName,
      vietAnhName: s.vietnameseName && s.englishName ? `${s.vietnameseName} (${s.englishName})` : s.vietnameseName || s.englishName || s.name,
      gender: s.gender || '',
      birthYear: s.birthDate ? parseInt(s.birthDate.slice(0, 4)) : 0,
      parentPhone: primaryContact ? primaryContact.phone : '',
      className: activeEnroll?.class.name || '',
      feePerSession: activeEnroll ? activeEnroll.feePerSession : 0,
      feeHistory: activeEnroll ? JSON.parse(activeEnroll.feeHistory) : [],
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
      code: c.code,
      name: c.name,
      type: c.type as any,
      teacher: teacherName,
      teacherId: c.teacherId,
      room: c.room || '',
      maxStudents: c.maxStudents || 15,
      status: c.status as any,
      defaultFee: c.defaultFeePerSession,
      scheduleDays: JSON.parse(c.scheduleDays),
      scheduleTime: c.scheduleTime || '',
      description: c.description || '',
      schedule: c.scheduleTime ? `${JSON.parse(c.scheduleDays).join(', ')} — ${c.scheduleTime}` : '',
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
    createdBy: e.createdBy,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString()
  }));

  const staff = staffRaw.map(s => ({
    id: s.id,
    code: s.code,
    name: s.name,
    role: s.role as any,
    phone: s.phone || '',
    linkedUserId: s.linkedUserId || '',
    baseSalary: s.baseSalary,
    ratePerSession: s.ratePerSession,
    ratePerHour: s.ratePerHour || 0,
    otherMonthlyAllowance: s.otherMonthlyAllowance || 0,
    otherMonthlyAllowanceNote: s.otherMonthlyAllowanceNote || '',
    bankAccount: s.bankAccount || '',
    bankName: s.bankName || '',
    startDate: s.startDate,
    status: s.status as any,
    notes: s.notes || '',
    taxMethod: s.taxMethod || 'no_tax',
    taxMethodValue: s.taxMethodValue || 0,
    dependentsCount: s.dependentsCount || 0,
    applySocialInsurance: s.applySocialInsurance || false,
    applyHealthInsurance: s.applyHealthInsurance || false,
    applyUnemploymentInsurance: s.applyUnemploymentInsurance || false,
    insuranceBaseSalary: s.insuranceBaseSalary || 0,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString()
  }));

  const teachingLogs = teachingLogsRaw.map(t => {
    const cls = classesRaw.find(c => c.id === t.classId);
    return {
      id: t.id,
      staffId: t.staffId,
      staffName: t.staff.name,
      date: t.date,
      classId: t.classId,
      className: cls?.name || '',
      sessions: t.sessions,
      hoursWorked: t.hoursWorked,
      isSubstitute: t.isSubstitute,
      originalTeacherId: t.originalTeacherId || undefined,
      originalTeacherName: staffRaw.find(s => s.id === t.originalTeacherId)?.name || undefined,
      source: t.source as any,
      note: t.note || '',
      createdAt: t.createdAt.toISOString()
    };
  });

  const advances = advancesRaw.map(a => ({
    id: a.id,
    staffId: a.staffId,
    staffName: a.staff.name,
    amount: a.amount,
    date: a.date,
    reason: a.reason || '',
    approvedBy: a.approvedBy || '',
    createdAt: a.createdAt.toISOString()
  }));

  const salaries = salariesRaw.map(s => ({
    id: s.id,
    staffId: s.staffId,
    staffName: s.staff.name,
    month: s.payrollPeriod.month,
    role: s.role as any,
    totalSessions: s.totalSessions,
    ratePerSession: s.ratePerSession,
    teachingIncome: s.teachingIncome,
    totalHours: s.totalHours,
    ratePerHour: s.ratePerHour || 0,
    hourlyIncome: s.hourlyIncome,
    baseSalary: s.baseSalary,
    otherIncome: s.otherIncome,
    otherMonthlyAllowance: s.otherMonthlyAllowance,
    otherMonthlyAllowanceNote: s.otherMonthlyAllowanceNote || '',
    kpiDeduction: s.kpiDeduction,
    grossSalary: s.grossSalary,
    taxRate: s.taxRate,
    taxAmount: s.taxAmount,
    totalAdvance: s.totalAdvance,
    advanceApplied: s.advanceApplied,
    netSalary: s.netSalary,
    status: s.status as any,
    notes: s.notes || '',
    createdAt: s.createdAt.toISOString()
  }));

  const dailyCloses = dailyClosesRaw.map(d => ({
    id: d.id,
    date: d.date,
    status: d.status as any,
    completedAt: d.completedAt,
    completedBy: d.completedBy,
    summary: JSON.parse(d.summary),
    note: d.note || '',
    createdAt: (d as any).createdAt ? (d as any).createdAt.toISOString() : new Date().toISOString()
  }));

  const auditLogs = auditLogsRaw.map(a => ({
    id: a.id,
    timestamp: a.timestamp.toISOString(),
    user: a.user,
    action: a.action,
    entity: a.entity,
    entityId: a.entityId || '',
    details: a.details || ''
  }));

  const systemParameters = systemParametersRaw.map(s => ({
    id: s.id,
    key: s.key,
    name: s.name,
    group: s.group as any,
    valueType: s.valueType as any,
    value: s.value,
    unit: s.unit || undefined,
    description: s.description || '',
    effectiveFrom: s.effectiveFrom,
    effectiveTo: s.effectiveTo || null,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    createdBy: s.createdBy,
    updatedAt: s.updatedAt?.toISOString() || undefined,
    updatedBy: s.updatedBy || undefined
  }));

  const admissionLeads = admissionLeadsRaw.map(l => ({
    id: l.id,
    leadCode: l.leadCode || '',
    studentName: l.studentName,
    dateOfBirth: l.dateOfBirth || '',
    address: l.address || '',
    parentName: l.parentName || '',
    parentPhone: l.parentPhone,
    parentZalo: l.parentZalo || '',
    source: l.source || '',
    learningNeed: l.learningNeed || '',
    consultationNote: l.consultationNote || '',
    assignedCounselor: l.assignedCounselor || '',
    registrationDate: l.registrationDate,
    status: l.status as any,
    testScheduleDate: l.testScheduleDate || '',
    testScheduleTime: l.testScheduleTime || '',
    testAssignee: l.testAssignee || '',
    testScheduleNote: l.testScheduleNote || '',
    testDate: l.testDate || '',
    testType: l.testType || '',
    testScore: l.testScore ? Number(l.testScore) : undefined,
    suggestedLevel: l.suggestedLevel || '',
    testNote: l.testNote || '',
    testResultNote: l.testResultNote || '',
    rejectionReason: l.rejectionReason || '',
    convertedStudentId: l.convertedStudentId || '',
    convertedAt: l.convertedAt || undefined,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString()
  }));

  const enrollments = enrollmentsRaw.map(e => ({
    id: e.id,
    studentId: e.studentId,
    studentName: e.student.name,
    classId: e.classId,
    className: e.class.name,
    feePerSession: e.feePerSession,
    startDate: e.startDate,
    endDate: e.endDate || undefined,
    isActive: e.isActive,
    feeHistory: e.feeHistory || '[]',
    createdAt: e.createdAt.toISOString(),
    balance: e.ledgerEntries?.[0]?.balance ?? 0,
    sessionsRemaining: e.ledgerEntries?.[0]?.sessionsRemaining ?? 0
  }));

  return {
    students,
    classes,
    transactions,
    attendance,
    expenses,
    staff,
    teachingLogs,
    advances,
    salaries,
    dailyCloses,
    auditLogs,
    systemParameters,
    admissionLeads,
    enrollments,
    filters
  };
}

async function setupReportTestData() {
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);
  const tables = [
    'AttendanceRecord',
    'TuitionLedgerEntry',
    'TuitionTransaction',
    'RevenueOther',
    'Enrollment',
    'Session',
    'Class',
    'Student',
    'AdmissionLead',
    'Expense',
    'StaffMember',
    'DailyClose',
  ];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);

  // Create mock teacher
  const teacher = await prisma.staffMember.create({
    data: {
      code: 'STAFF-REPORT-TEACHER',
      name: 'Giáo Viên Báo Cáo',
      role: 'teacher',
      startDate: '2026-06-01',
    },
  });

  // Create mock student
  const student = await prisma.student.create({
    data: {
      code: 'HV-REPORT-STUDENT',
      name: 'Nguyễn Văn Báo Cáo',
      vietnameseName: 'Nguyễn Văn Báo Cáo',
      englishName: 'Report Student',
      status: 'active',
      enrollDate: '2026-06-20',
      createdBy: 'report-test',
    },
  });

  // Create mock class
  const cls = await prisma.class.create({
    data: {
      code: 'LH-REPORT-CLASS',
      name: 'Lớp Báo Cáo Starter',
      teacherId: teacher.id,
      defaultFeePerSession: 150000,
      scheduleDays: '["Thứ 2", "Thứ 7"]',
    },
  });

  // Create mock enrollment
  const enrollment = await prisma.enrollment.create({
    data: {
      studentId: student.id,
      classId: cls.id,
      feePerSession: 150000,
      startDate: '2026-06-20',
      isActive: true,
      createdBy: 'report-test',
    },
  });

  // Create mock TuitionLedgerEntry
  await prisma.tuitionLedgerEntry.create({
    data: {
      studentId: student.id,
      enrollmentId: enrollment.id,
      totalPaid: 1000000,
      totalSpent: 300000,
      balance: 700000,
      sessionsRemaining: 4,
    },
  });

  // Create mock session
  const session = await prisma.session.create({
    data: {
      classId: cls.id,
      date: '2026-06-20',
      teacherId: teacher.id,
      status: 'completed',
      createdBy: 'report-test',
    },
  });

  // Create mock attendance records
  await prisma.attendanceRecord.create({
    data: {
      sessionId: session.id,
      studentId: student.id,
      classId: cls.id,
      enrollmentId: enrollment.id,
      date: '2026-06-20',
      status: 'present',
      sessionsDeducted: 1,
      feeApplied: 150000,
      createdBy: 'report-test',
    },
  });

  // Create mock tuition transaction
  await prisma.tuitionTransaction.create({
    data: {
      studentId: student.id,
      enrollmentId: enrollment.id,
      amount: 1000000,
      paymentDate: '2026-06-20',
      paymentMethod: 'Chuyển khoản',
      createdBy: 'report-test',
    },
  });

  // Create mock expense
  await prisma.expense.create({
    data: {
      date: '2026-06-20',
      category: 'Điện nước',
      description: 'Tiền điện nước tháng 6',
      amount: 300000,
      paymentMethod: 'Chuyển khoản',
      createdBy: 'report-test',
    },
  });

  // Create mock lead
  await prisma.admissionLead.create({
    data: {
      studentName: 'Nguyễn Lead Tiềm Năng',
      parentPhone: '0909999999',
      registrationDate: '2026-06-20',
      status: 'test_scheduled',
      testScheduleDate: '2026-06-20',
      testScheduleTime: '18:00',
    },
  });

  // Create mock student with debt
  const studentDebt = await prisma.student.create({
    data: {
      code: 'HV-DEBT-STUDENT',
      name: 'Học Viên Nợ Phí',
      vietnameseName: 'Học Viên Nợ Phí',
      englishName: 'Debt Student',
      status: 'active',
      enrollDate: '2026-06-20',
      createdBy: 'report-test',
    },
  });

  const enrollmentDebt = await prisma.enrollment.create({
    data: {
      studentId: studentDebt.id,
      classId: cls.id,
      feePerSession: 150000,
      startDate: '2026-06-20',
      isActive: true,
      createdBy: 'report-test',
    },
  });

  await prisma.tuitionLedgerEntry.create({
    data: {
      studentId: studentDebt.id,
      enrollmentId: enrollmentDebt.id,
      totalPaid: 0,
      totalSpent: 300000,
      balance: -300000,
      sessionsRemaining: -2,
    },
  });

  // Create mock attendance records for studentDebt to generate 300,000 costUsed
  await prisma.attendanceRecord.create({
    data: {
      sessionId: session.id,
      studentId: studentDebt.id,
      classId: cls.id,
      enrollmentId: enrollmentDebt.id,
      date: '2026-06-20',
      status: 'present',
      sessionsDeducted: 1,
      feeApplied: 150000,
      createdBy: 'report-test',
    },
  });

  const session2 = await prisma.session.create({
    data: {
      classId: cls.id,
      date: '2026-06-21',
      teacherId: teacher.id,
      status: 'completed',
      createdBy: 'report-test',
    },
  });

  await prisma.attendanceRecord.create({
    data: {
      sessionId: session2.id,
      studentId: studentDebt.id,
      classId: cls.id,
      enrollmentId: enrollmentDebt.id,
      date: '2026-06-21',
      status: 'present',
      sessionsDeducted: 1,
      feeApplied: 150000,
      createdBy: 'report-test',
    },
  });

  // Create mock daily close
  await prisma.dailyClose.create({
    data: {
      date: '2026-06-20',
      status: 'completed',
      completedAt: '2026-06-20T17:30:00.000Z',
      completedBy: 'report-test',
      summary: '{}',
      note: 'Chốt ca test',
    },
  });
}

describe('Kim Academy v3 - Report Engine Tests', () => {
  beforeAll(async () => {
    await setupReportTestData();
  });

  // 1. center_active_summary
  it('should run center_active_summary report successfully', async () => {
    const report = getReportById('center_active_summary');
    expect(report).toBeDefined();
    const data = await report!.compute(await buildReportParams());
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0]).toHaveProperty('metric');
    expect(data[0]).toHaveProperty('value');
    expect(data[0]).toHaveProperty('desc');
  });

  // 2. center_finance_summary
  it('should run center_finance_summary report successfully', async () => {
    const report = getReportById('center_finance_summary');
    expect(report).toBeDefined();
    const data = await report!.compute(await buildReportParams({ startDate: '2026-06-01', endDate: '2026-06-30' }));
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0]).toHaveProperty('metric');
    expect(data[0]).toHaveProperty('amount');
    expect(data[0]).toHaveProperty('desc');
  });

  // 3. tuition_collected_summary
  it('should run tuition_collected_summary report successfully', async () => {
    const report = getReportById('tuition_collected_summary');
    expect(report).toBeDefined();
    const data = await report!.compute(await buildReportParams({ startDate: '2026-06-01', endDate: '2026-06-30' }));
    expect(data.length).toBe(1);
    expect(data[0].amount).toBe(1000000);
  });

  // 4. tuition_debt_summary
  it('should run tuition_debt_summary report successfully', async () => {
    const report = getReportById('tuition_debt_summary');
    expect(report).toBeDefined();
    const data = await report!.compute(await buildReportParams());
    expect(data.length).toBe(1);
    expect(data[0].debt).toBe(300000);
    expect(data[0].collected).toBe(0);
  });

  // 5. attendance_by_class_detail
  it('should run attendance_by_class_detail report successfully', async () => {
    const report = getReportById('attendance_by_class_detail');
    expect(report).toBeDefined();
    const classes = await prisma.class.findMany();
    const data = await report!.compute(await buildReportParams({ classId: classes[0].name, startDate: '2026-06-01', endDate: '2026-06-30' }));
    expect(data.length).toBe(2);
    expect(data.map(d => d.studentName)).toContain('Nguyễn Văn Báo Cáo');
    expect(data.find(d => d.studentName === 'Nguyễn Văn Báo Cáo')?.present).toBe(1);
  });

  // 6. reconcile_daily_summary
  it('should run reconcile_daily_summary report successfully', async () => {
    const report = getReportById('reconcile_daily_summary');
    expect(report).toBeDefined();
    const data = await report!.compute(await buildReportParams({ startDate: '2026-06-01', endDate: '2026-06-30' }));
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  // 7. student_active_summary
  it('should run student_active_summary report successfully', async () => {
    const report = getReportById('student_active_summary');
    expect(report).toBeDefined();
    const data = await report!.compute(await buildReportParams());
    expect(data.length).toBe(2); // Nguyễn Văn Báo Cáo and Học Viên Nợ Phí
    expect(data.map(d => d.name)).toContain('Nguyễn Văn Báo Cáo');
  });

  // 8. student_near_end_detail
  it('should run student_near_end_detail report successfully', async () => {
    const report = getReportById('student_near_end_detail');
    expect(report).toBeDefined();
    const data = await report!.compute(await buildReportParams({ threshold: 5 }));
    expect(data.length).toBe(1);
    expect(data[0].remaining).toBe(4);
  });

  // 9. pnl_monthly_summary
  it('should run pnl_monthly_summary report successfully', async () => {
    const report = getReportById('pnl_monthly_summary');
    expect(report).toBeDefined();
    const data = await report!.compute(await buildReportParams({ startDate: '2026-06-01', endDate: '2026-06-30' }));
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  // 10. admission_summary_report
  it('should run admission_summary_report report successfully', async () => {
    const report = getReportById('admission_summary_report');
    expect(report).toBeDefined();
    const data = await report!.compute(await buildReportParams({ startDate: '2026-06-01', endDate: '2026-06-30' }));
    expect(data.length).toBe(8);
    expect(data[0].metric).toContain('Tổng đăng ký tuyển sinh');
    expect(data[0].value).toContain('1 lead');
  });

  // 11. Multi-class enrollment and balance summaries
  it('should correctly sum sessionsRemaining and balance for multi-class students', async () => {
    const { computeTuitionSummary } = await import('../../src/shared/business/tuition');
    const mockStudent = {
      id: 'student-multi',
      code: 'HV-TEST-MULTI',
      name: 'Học Sinh Song Song',
      vietnameseName: 'Học Sinh Song Song',
      englishName: 'Parallel Student',
      className: 'Class A',
      gender: 'Nam',
      birthYear: 2015,
      parentPhone: '0909123456',
      feePerSession: 100000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const mockEnrollments = [
      {
        id: 'enr-a',
        studentId: 'student-multi',
        studentName: 'Học Sinh Song Song',
        className: 'Class A',
        feePerSession: 100000,
        startDate: '2026-06-01',
        isActive: true,
        createdAt: new Date().toISOString(),
        balance: 400000,
        sessionsRemaining: 4
      },
      {
        id: 'enr-b',
        studentId: 'student-multi',
        studentName: 'Học Sinh Song Song',
        className: 'Class B',
        feePerSession: 150000,
        startDate: '2026-06-01',
        isActive: true,
        createdAt: new Date().toISOString(),
        balance: 300000,
        sessionsRemaining: 2
      }
    ];

    const summary = computeTuitionSummary(mockStudent as any, [], [], mockEnrollments as any);
    expect(summary.moneyRemaining).toBe(700000); // 400k + 300k
    expect(summary.sessionsRemaining).toBe(6); // 4 + 2
  });

  // 12. Exclusion of 'Chuyển số dư' transactions from reports
  it('should exclude transactions with paymentMethod "Chuyển số dư" from tuition_collected_summary', async () => {
    const report = getReportById('tuition_collected_summary');
    expect(report).toBeDefined();
    
    // We already have 1000000 paid offline transaction seeded with 'Chuyển khoản' payment method.
    // Let's verify that a transaction with 'Chuyển số dư' does not contribute.
    const params = await buildReportParams({ startDate: '2026-06-01', endDate: '2026-06-30' });
    
    // Insert a dummy transfer transaction to the params list
    params.transactions.push({
      id: 'tx-transfer-dummy',
      createdAt: new Date().toISOString(),
      paymentDate: '2026-06-20',
      studentId: 'report-student-id',
      studentName: 'Report Student',
      className: 'Lớp Báo Cáo Starter',
      term: 'Tháng 06/2026',
      amount: 500000,
      paymentMethod: 'Chuyển số dư', // should be excluded
      revenueCategory: 'Học phí offline',
      notes: 'Transfer class transaction',
      isReconciled: false,
      isInvoiced: false,
      senderName: '',
      studyType: 'Trực tiếp'
    });
    
    const data = await report!.compute(params);
    expect(data.length).toBe(1);
    expect(data[0].amount).toBe(1000000); // remains 1,000,000, not 1,500,000!
  });
});
