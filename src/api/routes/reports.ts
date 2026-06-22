import { Router } from 'express';
import { prisma } from '../../infrastructure/db/prisma.client';
import { REPORT_GROUPS, ReportParams } from '../../shared/business/reports';
import { parseFeeHistory } from '../../shared/business/tuition';
import { toArray, toObject, toJsonString } from '../../shared/json';
import { toDateStr, toIso } from '../utils/dates';
import { authenticateToken } from '../middleware/auth';

export const reportsRouter = Router();

reportsRouter.use(authenticateToken);

// GET report catalog
reportsRouter.get('/reports/catalog', async (req, res) => {
  try {
    const catalog = REPORT_GROUPS.map(group => ({
      id: group.id,
      label: group.label,
      icon: group.icon,
      reports: group.reports.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        type: r.type,
        filters: r.filters,
        columns: r.columns
      }))
    }));
    res.json(catalog);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST run report
reportsRouter.post('/reports/run', async (req, res) => {
  const { reportId, filters } = req.body;
  if (!reportId) {
    return res.status(400).json({ message: 'Thiếu mã báo cáo (reportId)' });
  }

  // Find report definition
  let reportDef;
  for (const group of REPORT_GROUPS) {
    const found = group.reports.find(r => r.id === reportId);
    if (found) {
      reportDef = found;
      break;
    }
  }

  if (!reportDef) {
    return res.status(404).json({ message: `Không tìm thấy báo cáo: ${reportId}` });
  }

  try {
    // 1. Fetch all raw data required for reports
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
      invItemsRaw,
      invCategoriesRaw,
      invStocksRaw,
      invMovementsRaw,
      assignedTasksRaw
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
      prisma.enrollment.findMany({ include: { class: true, student: true } }),
      prisma.inventoryItem.findMany({ include: { category: true } }),
      prisma.inventoryCategory.findMany(),
      prisma.inventoryStock.findMany({ include: { item: true, location: true } }),
      prisma.inventoryMovement.findMany({ include: { item: true, fromLocation: true, toLocation: true, relatedStudent: true, relatedStaff: true, supplier: true } }),
      prisma.assignedTask.findMany()
    ]);

    // 2. Format database objects to match V1 Types expected by the report engine
    
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
        birthYear: s.birthDate ? parseInt((toDateStr(s.birthDate) || '').slice(0, 4)) : 0,
        parentPhone: primaryContact ? primaryContact.phone : '',
        className: activeEnroll?.class.name || '',
        feePerSession: activeEnroll ? activeEnroll.feePerSession : 0,
        feeHistory: activeEnroll ? parseFeeHistory(activeEnroll.feeHistory) : [],
        status: s.status as any,
        enrollDate: toDateStr(s.enrollDate) || '',
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

    // Union transactions: tuition (Học phí offline) + other revenue
    const transactions = [
      ...tuitionTxRaw.map(t => ({
        id: t.id,
        createdAt: t.createdAt.toISOString(),
        paymentDate: toDateStr(t.paymentDate) || '',
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
        paymentDate: toDateStr(t.paymentDate) || '',
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
      date: toDateStr(a.date) || '',
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
      date: toDateStr(e.date) || '',
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
      startDate: toDateStr(s.startDate) || '',
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
      date: toDateStr(l.date) || '',
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
      date: toDateStr(a.date) || '',
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

    const dailyCloses = dailyClosesRaw.map(c => ({
      id: c.id,
      date: toDateStr(c.date) || '',
      status: c.status as any,
      completedAt: toIso(c.completedAt) || '',
      completedBy: c.completedBy,
      summary: toObject(c.summary),
      note: c.note || ''
    }));

    const auditLogs = auditLogsRaw.map(l => ({
      id: l.id,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId || '',
      details: l.details || '',
      user: l.user,
      timestamp: l.timestamp.toISOString()
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
      effectiveFrom: toDateStr(p.effectiveFrom) || '',
      effectiveTo: toDateStr(p.effectiveTo) || null,
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
      startDate: toDateStr(e.startDate) || '',
      endDate: toDateStr(e.endDate) || undefined,
      isActive: e.isActive,
      transferNote: e.transferNote || undefined,
      feeHistory: parseFeeHistory(e.feeHistory),
      createdAt: e.createdAt.toISOString(),
      createdBy: e.createdBy
    }));

    // Inventory rows (shape phẳng cho report engine)
    const invItemMap = new Map(invItemsRaw.map(it => [it.id, it]));
    const invCatName = (it: any) => it?.category?.name || invCategoriesRaw.find(c => c.id === it?.categoryId)?.name || 'Khác';
    const inventoryItems = invItemsRaw.map(it => ({
      id: it.id, code: it.code, name: it.name, unit: it.unit, categoryId: it.categoryId, categoryName: invCatName(it),
      minStockLevel: it.minStockLevel || 0, defaultSalePrice: it.defaultSalePrice || 0, defaultCostPrice: it.defaultCostPrice || 0,
    }));
    const inventoryStocks = invStocksRaw.map((s: any) => {
      const it = invItemMap.get(s.itemId);
      return { itemId: s.itemId, itemCode: it?.code || '', itemName: s.item?.name || '', unit: s.item?.unit || '', categoryName: invCatName(it), locationId: s.locationId, locationName: s.location?.name || '', quantityOnHand: s.quantityOnHand || 0, averageCost: s.averageCost || 0, minStockLevel: it?.minStockLevel || 0, salePrice: it?.defaultSalePrice || 0 };
    });
    const inventoryMovements = invMovementsRaw.map((m: any) => {
      const it = invItemMap.get(m.itemId);
      return { id: m.id, movementDate: m.movementDate, movementType: m.movementType, itemId: m.itemId, itemCode: it?.code || '', itemName: m.item?.name || '', unit: m.item?.unit || '', categoryName: invCatName(it), fromLocationName: m.fromLocation?.name || '', toLocationName: m.toLocation?.name || '', quantity: m.quantity || 0, unitCost: m.unitCost || 0, unitSalePrice: m.unitSalePrice || 0, totalAmount: m.totalAmount || 0, studentId: m.relatedStudentId || undefined, studentName: m.relatedStudent?.name || '', staffName: m.relatedStaff?.name || '', paymentStatus: m.paymentStatus, issued: m.issued !== false, paymentDate: m.paymentDate || undefined, paymentMethod: m.paymentMethod || undefined, createdBy: m.createdBy || '', supplierId: m.supplierId || undefined, supplierName: m.supplier?.name || '' };
    });
    const inventoryCategories = invCategoriesRaw.map(c => ({ id: c.id, name: c.name }));
    const assignedTasks = (assignedTasksRaw as any[]).map((t: any) => ({
      id: t.id, title: t.title, content: t.content || undefined,
      dueDate: t.dueDate || undefined, priority: t.priority, status: t.status,
      assigneeUserId: t.assigneeUserId, assigneeName: t.assigneeName,
      assignedByName: t.assignedByName || undefined, completionNote: t.completionNote || undefined,
      completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : undefined,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : undefined,
    }));

    const reportParams: ReportParams = {
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
      enrollments,
      inventoryItems,
      inventoryStocks,
      inventoryMovements,
      inventoryCategories,
      assignedTasks,
      filters: filters || {}
    };

    // Calculate report data
    const computedRows = reportDef.compute(reportParams);

    res.json({
      columns: reportDef.columns,
      rows: computedRows
    });
  } catch (error: any) {
    console.error('Report run error:', error);
    res.status(500).json({ message: 'Lỗi khi tính toán báo cáo: ' + error.message });
  }
});
