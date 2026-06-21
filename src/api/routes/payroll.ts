import { Router } from 'express';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken, requireAdmin, requireRole } from '../middleware/auth';
import { generateUniqueCode } from '../utils/codes';
import { toArray } from '../../shared/json';
import { monthRange, toDateStr } from '../utils/dates';
import { validateBody } from '../utils/validate';
import { createStaffSchema, createTeachingLogSchema, createSalaryAdvanceSchema, updateSalaryAdvanceSchema } from '../schemas';
import { writeAudit } from '../utils/audit';

export const payrollRouter = Router();

payrollRouter.use(authenticateToken);
const requirePayrollRole = requireRole(['admin', 'staff', 'accountant']);

// Helper to get system parameters with default fallback
async function getParameter(key: string, defaultValue: any): Promise<any> {
  try {
    const param = await prisma.systemParameter.findUnique({ where: { key } });
    if (param) {
      if (param.valueType === 'number') return Number(param.value);
      if (param.valueType === 'boolean') return param.value === 'true';
      return param.value;
    }
  } catch (err) {
    // Ignore and fallback
  }
  return defaultValue;
}

// ==========================================
// STAFF (Nhân sự)
// ==========================================

// GET all staff members
payrollRouter.get('/staff', async (req, res) => {
  try {
    const list = await prisma.staffMember.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST create staff member
payrollRouter.post('/staff', requireAdmin, validateBody(createStaffSchema), async (req, res) => {
  const data = req.body;

  try {
    const startMonth = (data.startDate || new Date().toISOString().slice(0, 10)).slice(0, 7);
    const initialHistory = [{
      changedAt: new Date().toISOString(),
      effectiveMonth: startMonth,
      baseSalary: Number(data.baseSalary || 0),
      ratePerSession: Number(data.ratePerSession || 0),
      ratePerHour: Number(data.ratePerHour || 0),
      otherMonthlyAllowance: Number(data.otherMonthlyAllowance || 0)
    }];

    const code = await generateUniqueCode(prisma.staffMember, 'NV', data.code);
    const created = await prisma.staffMember.create({
      data: {
        code,
        name: data.name,
        role: data.role,
        phone: data.phone || null,
        baseSalary: Number(data.baseSalary || 0),
        ratePerSession: Number(data.ratePerSession || 0),
        otherMonthlyAllowance: Number(data.otherMonthlyAllowance || 0),
        otherMonthlyAllowanceNote: data.otherMonthlyAllowanceNote || '',
        bankAccount: data.bankAccount || null,
        bankName: data.bankName || null,
        startDate: data.startDate || new Date().toISOString().slice(0, 10),
        status: data.status || 'active',
        notes: data.notes || '',
        taxMethod: data.taxMethod || 'fixed_percent',
        taxMethodValue: data.taxMethodValue !== undefined ? Number(data.taxMethodValue) : 10.0,
        dependentsCount: data.dependentsCount !== undefined ? Number(data.dependentsCount) : 0,
        applySocialInsurance: !!data.applySocialInsurance,
        applyHealthInsurance: !!data.applyHealthInsurance,
        applyUnemploymentInsurance: !!data.applyUnemploymentInsurance,
        insuranceBaseSalary: data.insuranceBaseSalary !== undefined ? Number(data.insuranceBaseSalary) : null,
        ratePerHour: Number(data.ratePerHour || 0),
        salaryHistory: initialHistory
      }
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update staff member
payrollRouter.put('/staff/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const existing = await prisma.staffMember.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
    }

    // Check if salary rates are being changed
    const baseSalNew = data.baseSalary !== undefined ? Number(data.baseSalary) : existing.baseSalary;
    const ratePerSessNew = data.ratePerSession !== undefined ? Number(data.ratePerSession) : existing.ratePerSession;
    const ratePerHrNew = data.ratePerHour !== undefined ? Number(data.ratePerHour) : (existing.ratePerHour || 0);
    const otherAllowNew = data.otherMonthlyAllowance !== undefined ? Number(data.otherMonthlyAllowance) : (existing.otherMonthlyAllowance || 0);

    const isSalaryChanged = 
      baseSalNew !== existing.baseSalary ||
      ratePerSessNew !== existing.ratePerSession ||
      ratePerHrNew !== (existing.ratePerHour || 0) ||
      otherAllowNew !== (existing.otherMonthlyAllowance || 0);

    let salaryHistoryValue: any[] = toArray(existing.salaryHistory);

    if (isSalaryChanged) {
      let history = toArray<any>(existing.salaryHistory);

      const targetMonth = data.effectiveMonth || new Date().toISOString().slice(0, 7);

      // Filter out existing history entry for the same month to prevent duplicates
      history = history.filter((h: any) => h.effectiveMonth !== targetMonth);

      history.push({
        changedAt: new Date().toISOString(),
        effectiveMonth: targetMonth,
        baseSalary: baseSalNew,
        ratePerSession: ratePerSessNew,
        ratePerHour: ratePerHrNew,
        otherMonthlyAllowance: otherAllowNew
      });

      salaryHistoryValue = history;

      // Create AuditLog entry
      const changes = [];
      if (baseSalNew !== existing.baseSalary) {
        changes.push(`Lương cứng: ${existing.baseSalary} -> ${baseSalNew}`);
      }
      if (ratePerSessNew !== existing.ratePerSession) {
        changes.push(`Lương/buổi: ${existing.ratePerSession} -> ${ratePerSessNew}`);
      }
      if (ratePerHrNew !== (existing.ratePerHour || 0)) {
        changes.push(`Lương/giờ: ${existing.ratePerHour || 0} -> ${ratePerHrNew}`);
      }
      if (otherAllowNew !== (existing.otherMonthlyAllowance || 0)) {
        changes.push(`Phụ cấp MĐ: ${existing.otherMonthlyAllowance || 0} -> ${otherAllowNew}`);
      }

      await writeAudit(prisma, req, {
        action: 'UPDATE_STAFF_SALARY',
        entity: 'staff',
        entityId: id,
        details: `Điều chỉnh lương nhân sự ${existing.name} áp dụng từ tháng ${targetMonth}. Thay đổi: ${changes.join(', ')}`,
        oldValue: {
          baseSalary: existing.baseSalary,
          ratePerSession: existing.ratePerSession,
          ratePerHour: existing.ratePerHour,
          otherMonthlyAllowance: existing.otherMonthlyAllowance
        },
        newValue: {
          baseSalary: baseSalNew,
          ratePerSession: ratePerSessNew,
          ratePerHour: ratePerHrNew,
          otherMonthlyAllowance: otherAllowNew
        },
      });
    }

    const updated = await prisma.staffMember.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role,
        phone: data.phone,
        baseSalary: data.baseSalary !== undefined ? Number(data.baseSalary) : undefined,
        ratePerSession: data.ratePerSession !== undefined ? Number(data.ratePerSession) : undefined,
        otherMonthlyAllowance: data.otherMonthlyAllowance !== undefined ? Number(data.otherMonthlyAllowance) : undefined,
        otherMonthlyAllowanceNote: data.otherMonthlyAllowanceNote,
        bankAccount: data.bankAccount,
        bankName: data.bankName,
        startDate: data.startDate,
        status: data.status,
        notes: data.notes,
        taxMethod: data.taxMethod,
        taxMethodValue: data.taxMethodValue !== undefined ? Number(data.taxMethodValue) : undefined,
        dependentsCount: data.dependentsCount !== undefined ? Number(data.dependentsCount) : undefined,
        applySocialInsurance: data.applySocialInsurance !== undefined ? !!data.applySocialInsurance : undefined,
        applyHealthInsurance: data.applyHealthInsurance !== undefined ? !!data.applyHealthInsurance : undefined,
        applyUnemploymentInsurance: data.applyUnemploymentInsurance !== undefined ? !!data.applyUnemploymentInsurance : undefined,
        insuranceBaseSalary: data.insuranceBaseSalary !== undefined ? Number(data.insuranceBaseSalary) : undefined,
        ratePerHour: data.ratePerHour !== undefined ? Number(data.ratePerHour) : undefined,
        salaryHistory: salaryHistoryValue
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE staff member
payrollRouter.delete('/staff/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const staff = await prisma.staffMember.findUnique({
      where: { id },
      include: {
        sessions: true,
        teachingLogs: true
      }
    });

    if (!staff) {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
    }

    // If has history, soft-delete by setting status = 'inactive'
    if (staff.sessions.length > 0 || staff.teachingLogs.length > 0) {
      await prisma.staffMember.update({
        where: { id },
        data: { status: 'inactive' }
      });
      return res.json({ success: true, message: 'Đã chuyển trạng thái nhân sự thành "Nghỉ việc" do có lịch sử giảng dạy.' });
    }

    await prisma.staffMember.delete({ where: { id } });
    res.json({ success: true, message: 'Xóa nhân sự thành công.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});


// ==========================================
// TEACHING LOGS (Chấm công giảng dạy)
// ==========================================

// GET teaching logs
payrollRouter.get('/teaching-logs', async (req, res) => {
  try {
    const { staffId, month } = req.query;
    const where: any = {};
    if (staffId) where.staffId = staffId as string;
    if (month) {
      where.date = monthRange(month as string);
    }

    const [list, allClasses] = await Promise.all([
      prisma.teachingLog.findMany({
        where,
        include: { staff: true },
        orderBy: { date: 'desc' }
      }),
      prisma.class.findMany({ select: { id: true, name: true } })
    ]);

    const classMap = new Map(allClasses.map(c => [c.id, c.name]));

    const formatted = list.map(l => ({
      id: l.id,
      date: l.date,
      staffId: l.staffId,
      staffName: l.staff.name,
      teacherId: l.staffId, // legacy match
      teacherName: l.staff.name,
      classId: l.classId,
      className: classMap.get(l.classId) || 'Không rõ lớp',
      sessions: l.sessions,
      sessionsCount: l.sessions,
      isSubstitute: l.isSubstitute,
      hoursWorked: l.hoursWorked,
      source: l.source,
      note: l.note || '',
      createdAt: l.createdAt
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST create manual teaching log
payrollRouter.post('/teaching-logs', requirePayrollRole, validateBody(createTeachingLogSchema), async (req, res) => {
  const data = req.body;

  try {
    const created = await prisma.teachingLog.create({
      data: {
        staffId: data.staffId,
        date: data.date,
        classId: data.classId,
        sessions: data.sessions !== undefined ? Number(data.sessions) : 1,
        isSubstitute: !!data.isSubstitute,
        hoursWorked: data.hoursWorked !== undefined ? Number(data.hoursWorked) : 1.5,
        source: 'manual',
        note: data.note || ''
      }
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE teaching log
payrollRouter.delete('/teaching-logs/:id', requirePayrollRole, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.teachingLog.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});


// ==========================================
// SALARY ADVANCES (Tạm ứng lương)
// ==========================================

// GET advances
payrollRouter.get('/salary-advances', async (req, res) => {
  try {
    const { staffId, month } = req.query;
    const where: any = {};
    if (staffId) where.staffId = staffId as string;
    if (month) {
      where.date = monthRange(month as string);
    }

    const list = await prisma.salaryAdvance.findMany({
      where,
      include: { staff: true },
      orderBy: { date: 'desc' }
    });

    const formatted = list.map(a => ({
      id: a.id,
      staffId: a.staffId,
      staffName: a.staff.name,
      teacherId: a.staffId, // legacy support
      teacherName: a.staff.name,
      amount: a.amount,
      date: a.date,
      reason: a.reason || '',
      approvedBy: a.approvedBy || '',
      createdAt: a.createdAt
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST create salary advance
payrollRouter.post('/salary-advances', requirePayrollRole, validateBody(createSalaryAdvanceSchema), async (req, res) => {
  const data = req.body;

  try {
    const created = await prisma.salaryAdvance.create({
      data: {
        staffId: data.staffId,
        amount: Number(data.amount),
        date: data.date,
        reason: data.reason || '',
        approvedBy: req.user?.name || req.user?.username || 'unknown'
      }
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update salary advance
payrollRouter.put('/salary-advances/:id', requirePayrollRole, validateBody(updateSalaryAdvanceSchema), async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const updated = await prisma.salaryAdvance.update({
      where: { id },
      data: {
        amount: data.amount ? Number(data.amount) : undefined,
        date: data.date,
        reason: data.reason,
        approvedBy: data.approvedBy
      }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE salary advance
payrollRouter.delete('/salary-advances/:id', requirePayrollRole, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.salaryAdvance.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// MONTHLY SALARIES (Bảng tính lương tháng)
// ==========================================

// Calculate single staff salary (ported formula)
async function calculateStaffSalary(staffId: string, month: string, periodId: string) {
  const staff = await prisma.staffMember.findUnique({ where: { id: staffId } });
  if (!staff) throw new Error('Không tìm thấy nhân viên');

  // 1. Resolve salary rates from history based on calculation month
  let baseSalary = staff.baseSalary || 0;
  let ratePerSession = staff.ratePerSession || 0;
  let ratePerHour = staff.ratePerHour || 0;
  let otherMonthlyAllowance = staff.otherMonthlyAllowance || 0;

  if (staff.salaryHistory) {
    try {
      const history = toArray<any>(staff.salaryHistory);
      if (Array.isArray(history) && history.length > 0) {
        const sorted = [...history].sort((a: any, b: any) => a.effectiveMonth.localeCompare(b.effectiveMonth));
        const applicable = sorted.filter((h: any) => h.effectiveMonth <= month);
        if (applicable.length > 0) {
          const entry = applicable[applicable.length - 1];
          baseSalary = entry.baseSalary ?? baseSalary;
          ratePerSession = entry.ratePerSession ?? ratePerSession;
          ratePerHour = entry.ratePerHour ?? ratePerHour;
          otherMonthlyAllowance = entry.otherMonthlyAllowance ?? otherMonthlyAllowance;
        } else {
          // If all history is in the future, fallback to the earliest rates
          const entry = sorted[0];
          baseSalary = entry.baseSalary ?? baseSalary;
          ratePerSession = entry.ratePerSession ?? ratePerSession;
          ratePerHour = entry.ratePerHour ?? ratePerHour;
          otherMonthlyAllowance = entry.otherMonthlyAllowance ?? otherMonthlyAllowance;
        }
      }
    } catch (e) {
      // Ignore parse error and fallback to staff fields
    }
  }

  // 2. Fetch teaching logs and advances
  const teachingLogs = await prisma.teachingLog.findMany({
    where: { staffId, date: monthRange(month) }
  });
  const advances = await prisma.salaryAdvance.findMany({
    where: { staffId, date: monthRange(month) }
  });

  const totalSessions = teachingLogs.reduce((sum, l) => sum + (l.sessions || 1), 0);

  let teachingIncome = 0;
  let totalHours = 0;
  let hourlyIncome = 0;

  if (staff.role === 'teaching_assistant' || staff.role === 'assistant') {
    totalHours = teachingLogs.reduce((sum, l) => sum + (l.hoursWorked || 0), 0);
    hourlyIncome = totalHours * ratePerHour;
    teachingIncome = hourlyIncome;
  } else if (staff.role === 'teacher') {
    teachingIncome = totalSessions * ratePerSession;
  }

  // 3. Fetch carry-over from previous month
  const [year, mStr] = month.split('-').map(Number);
  const prevDate = new Date(year, mStr - 2, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  
  // Find prev payroll period
  const prevPeriod = await prisma.payrollPeriod.findFirst({ where: { month: prevMonth } });
  let carryOverFromPrevMonth = 0;
  if (prevPeriod) {
    const prevItem = await prisma.payrollItem.findFirst({
      where: { payrollPeriodId: prevPeriod.id, staffId }
    });
    if (prevItem) {
      // Calculate remaining advance carryOver if any
      carryOverFromPrevMonth = prevItem.totalAdvance - prevItem.advanceApplied;
    }
  }

  const totalAdvance = advances.reduce((sum, a) => sum + a.amount, 0) + carryOverFromPrevMonth;

  // 4. Gross salary calculation
  const otherMonthlyAllowanceNote = staff.otherMonthlyAllowanceNote || '';
  
  // Check if there is an existing draft calculation to preserve manual edits
  const currentPeriod = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
  const existingItem = await prisma.payrollItem.findFirst({
    where: { payrollPeriodId: periodId, staffId }
  });

  const kpiDeduction = existingItem?.kpiDeduction || 0;
  const otherIncome = existingItem?.otherIncome || 0; // manual edits

  const grossSalary = Math.max(teachingIncome + baseSalary + otherMonthlyAllowance + otherIncome - kpiDeduction, 0);

  // 5. Dynamic Insurance Deductions
  let baseInsWage = staff.insuranceBaseSalary ?? baseSalary ?? 0;
  if (baseInsWage === 0) {
    baseInsWage = await getParameter('regionalMinimumWage', 4680000);
  }

  const socInsRateEmp = await getParameter('socialInsuranceEmployeeRate', 8.0);
  const hlthInsRateEmp = await getParameter('healthInsuranceEmployeeRate', 1.5);
  const unempInsRateEmp = await getParameter('unemploymentInsuranceEmployeeRate', 1.0);

  const insuranceRefLevel = await getParameter('insuranceReferenceLevel', 1800000);
  const regMinWage = await getParameter('regionalMinimumWage', 4680000);
  
  const socCap = insuranceRefLevel * 20;
  const hlthCap = insuranceRefLevel * 20;
  const unempCap = regMinWage * 20;

  const socialInsuranceAmount = staff.applySocialInsurance ? Math.round(Math.min(baseInsWage, socCap) * (socInsRateEmp / 100)) : 0;
  const healthInsuranceAmount = staff.applyHealthInsurance ? Math.round(Math.min(baseInsWage, hlthCap) * (hlthInsRateEmp / 100)) : 0;
  const unemploymentInsuranceAmount = staff.applyUnemploymentInsurance ? Math.round(Math.min(baseInsWage, unempCap) * (unempInsRateEmp / 100)) : 0;

  // 6. Personal Income Tax (PIT) TNCN
  let taxRate = 0;
  let taxAmount = 0;

  const method = staff.taxMethod || 'fixed_percent';
  const methodVal = staff.taxMethodValue || 0;

  if (method === 'none') {
    taxRate = 0;
    taxAmount = 0;
  } else if (method === 'fixed_percent') {
    taxRate = methodVal; // Store as percentage (e.g. 10.0 instead of 0.1)
    taxAmount = Math.round(grossSalary * (taxRate / 100));
  } else if (method === 'manual_amount') {
    taxAmount = methodVal;
    taxRate = grossSalary > 0 ? (taxAmount / grossSalary) * 100 : 0;
  } else if (method === 'progressive') {
    const personalAllowance = await getParameter('personalAllowanceAmount', 11000000);
    const dependentAllowance = await getParameter('dependantAllowanceAmount', 4400000);
    const dependentsCount = staff.dependentsCount || 0;
    const totalInsuranceEmp = socialInsuranceAmount + healthInsuranceAmount + unemploymentInsuranceAmount;

    const tntt = grossSalary - personalAllowance - (dependentAllowance * dependentsCount) - totalInsuranceEmp;
    
    if (tntt > 0) {
      if (tntt <= 5000000) {
        taxAmount = tntt * 0.05;
      } else if (tntt <= 10000000) {
        taxAmount = 5000000 * 0.05 + (tntt - 5000000) * 0.10;
      } else if (tntt <= 18000000) {
        taxAmount = 5000000 * 0.05 + 5000000 * 0.10 + (tntt - 10000000) * 0.15;
      } else if (tntt <= 32000000) {
        taxAmount = 5000000 * 0.05 + 5000000 * 0.10 + 8000000 * 0.15 + (tntt - 18000000) * 0.20;
      } else if (tntt <= 52000000) {
        taxAmount = 5000000 * 0.05 + 5000000 * 0.10 + 8000000 * 0.15 + 14000000 * 0.20 + (tntt - 32000000) * 0.25;
      } else if (tntt <= 80000000) {
        taxAmount = 5000000 * 0.05 + 5000000 * 0.10 + 8000000 * 0.15 + 14000000 * 0.20 + 20000000 * 0.25 + (tntt - 52000000) * 0.30;
      } else {
        taxAmount = 5000000 * 0.05 + 5000000 * 0.10 + 8000000 * 0.15 + 14000000 * 0.20 + 20000000 * 0.25 + 28000000 * 0.30 + (tntt - 80000000) * 0.35;
      }
      taxAmount = Math.round(taxAmount);
      taxRate = grossSalary > 0 ? (taxAmount / grossSalary) * 100 : 0;
    }
  }

  // 7. Net salary & advance applied
  const payableAmount = grossSalary - taxAmount - socialInsuranceAmount - healthInsuranceAmount - unemploymentInsuranceAmount;
  const advanceApplied = Math.min(totalAdvance, Math.max(payableAmount, 0));
  
  const roundingUnit = await getParameter('salaryRoundingUnit', 1000);
  let netSalary = Math.max(payableAmount - advanceApplied, 0);
  if (roundingUnit > 1) {
    netSalary = Math.round(netSalary / roundingUnit) * roundingUnit;
  }

  return {
    id: existingItem?.id || undefined,
    payrollPeriodId: periodId,
    staffId,
    role: staff.role,
    baseSalary,
    totalSessions,
    ratePerSession,
    teachingIncome,
    totalHours,
    ratePerHour,
    hourlyIncome,
    otherIncome,
    otherMonthlyAllowance,
    otherMonthlyAllowanceNote,
    kpiDeduction,
    grossSalary,
    socialInsuranceAmount,
    healthInsuranceAmount,
    unemploymentInsuranceAmount,
    taxRate,
    taxAmount,
    totalAdvance,
    advanceApplied,
    netSalary,
    status: existingItem?.status || 'draft',
    notes: existingItem?.notes || ''
  };
}

// GET calculated salaries
payrollRouter.get('/monthly-salaries', async (req, res) => {
  try {
    const { month, staffId } = req.query;
    
    // Find all matching payroll items
    const where: any = {};
    if (staffId) where.staffId = staffId as string;
    if (month) {
      where.payrollPeriod = { month: month as string };
    }

    const items = await prisma.payrollItem.findMany({
      where,
      include: {
        staff: true,
        payrollPeriod: true
      }
    });

    const formatted = items.map(item => ({
      id: item.id,
      month: item.payrollPeriod.month,
      staffId: item.staffId,
      staffName: item.staff.name,
      teacherId: item.staffId, // legacy support
      teacherName: item.staff.name,
      role: item.role,
      baseSalary: item.baseSalary,
      totalSessions: item.totalSessions,
      ratePerSession: item.ratePerSession,
      teachingIncome: item.teachingIncome,
      totalHours: item.totalHours,
      ratePerHour: item.ratePerHour,
      hourlyIncome: item.hourlyIncome,
      otherIncome: item.otherIncome,
      otherMonthlyAllowance: item.otherMonthlyAllowance,
      otherMonthlyAllowanceNote: item.otherMonthlyAllowanceNote,
      otherSalary: item.otherIncome, // legacy
      otherSalaryNote: item.notes, // legacy
      kpiDeduction: item.kpiDeduction,
      grossSalary: item.grossSalary,
      socialInsuranceAmount: item.socialInsuranceAmount,
      healthInsuranceAmount: item.healthInsuranceAmount,
      unemploymentInsuranceAmount: item.unemploymentInsuranceAmount,
      taxRate: item.taxRate,
      taxAmount: item.taxAmount,
      tax: item.taxAmount, // legacy
      totalAdvance: item.totalAdvance,
      advanceApplied: item.advanceApplied,
      netSalary: item.netSalary,
      status: item.status,
      notes: item.notes
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST calculate salaries
payrollRouter.post('/monthly-salaries/calculate', requireAdmin, async (req, res) => {
  const { month } = req.body;
  if (!month) {
    return res.status(400).json({ message: 'Thiếu tháng tính lương' });
  }

  try {
    // 1. Find or create payroll period
    let period = await prisma.payrollPeriod.findFirst({ where: { month } });
    if (!period) {
      // Ngày cuối tháng thực tế (28/29/30/31) thay vì cứng "-31".
      const [y, m] = month.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      period = await prisma.payrollPeriod.create({
        data: {
          month,
          startDate: `${month}-01`,
          endDate: `${month}-${String(lastDay).padStart(2, '0')}`,
          status: 'draft',
          createdBy: req.user?.name || req.user?.username || 'unknown'
        }
      });
    }

    // 2. Fetch all staff and check activity in target month
    const [allStaff, teachingLogs, assistantLogs, advances, existingItems] = await Promise.all([
      prisma.staffMember.findMany(),
      prisma.teachingLog.findMany({
        where: { date: monthRange(month) },
        select: { staffId: true }
      }),
      prisma.assistantWorkLog.findMany({
        where: { date: monthRange(month) },
        select: { staffId: true }
      }),
      prisma.salaryAdvance.findMany({
        where: { date: monthRange(month) },
        select: { staffId: true }
      }),
      prisma.payrollItem.findMany({
        where: { payrollPeriod: { month } },
        select: { staffId: true }
      })
    ]);

    const activeStaffIds = new Set([
      ...teachingLogs.map(l => l.staffId),
      ...assistantLogs.map(l => l.staffId),
      ...advances.map(a => a.staffId),
      ...existingItems.map(i => i.staffId)
    ]);

    const staff = allStaff.filter(s => {
      // Exclude if start date is after calculation month (YYYY-MM-DD vs YYYY-MM)
      const startMonth = (toDateStr(s.startDate) || '').slice(0, 7);
      if (startMonth > month) {
        return false;
      }

      // Include if status is active, OR if status is inactive but has activity this month
      return s.status === 'active' || activeStaffIds.has(s.id);
    });

    const results: any[] = [];

    // 3. Calculate and save payroll items
    for (const s of staff) {
      const calculated = await calculateStaffSalary(s.id, month, period.id);

      let savedItem;
      if (calculated.id) {
        savedItem = await prisma.payrollItem.update({
          where: { id: calculated.id },
          data: calculated
        });
      } else {
        savedItem = await prisma.payrollItem.create({
          data: calculated
        });
      }

      // Format to V1 legacy shape
      results.push({
        id: savedItem.id,
        month,
        staffId: s.id,
        staffName: s.name,
        teacherId: s.id,
        teacherName: s.name,
        role: s.role,
        baseSalary: savedItem.baseSalary,
        totalSessions: savedItem.totalSessions,
        ratePerSession: savedItem.ratePerSession,
        teachingIncome: savedItem.teachingIncome,
        totalHours: savedItem.totalHours,
        ratePerHour: savedItem.ratePerHour,
        hourlyIncome: savedItem.hourlyIncome,
        otherIncome: savedItem.otherIncome,
        otherMonthlyAllowance: savedItem.otherMonthlyAllowance,
        otherMonthlyAllowanceNote: savedItem.otherMonthlyAllowanceNote,
        otherSalary: savedItem.otherIncome,
        kpiDeduction: savedItem.kpiDeduction,
        grossSalary: savedItem.grossSalary,
        socialInsuranceAmount: savedItem.socialInsuranceAmount,
        healthInsuranceAmount: savedItem.healthInsuranceAmount,
        unemploymentInsuranceAmount: savedItem.unemploymentInsuranceAmount,
        taxRate: savedItem.taxRate,
        taxAmount: savedItem.taxAmount,
        tax: savedItem.taxAmount,
        totalAdvance: savedItem.totalAdvance,
        advanceApplied: savedItem.advanceApplied,
        netSalary: savedItem.netSalary,
        status: savedItem.status,
        notes: savedItem.notes
      });
    }

    // Add audit log
    await writeAudit(prisma, req, {
      action: 'CALCULATE_PAYROLL',
      entity: 'payroll',
      details: `Tính lương tháng ${month} cho ${results.length} nhân viên`,
    });

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update salary item status (e.g. paid, approved)
payrollRouter.put('/monthly-salaries/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updated = await prisma.payrollItem.update({
      where: { id },
      data: { status }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update salary item details (manual adjustments)
payrollRouter.put('/monthly-salaries/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const existing = await prisma.payrollItem.findUnique({
      where: { id },
      include: { payrollPeriod: true }
    });
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy bảng lương' });
    }

    // Apply manual overrides
    const updatedDraft = await prisma.payrollItem.update({
      where: { id },
      data: {
        kpiDeduction: data.kpiDeduction !== undefined ? Number(data.kpiDeduction) : undefined,
        otherIncome: data.otherSalary !== undefined ? Number(data.otherSalary) : (data.otherIncome !== undefined ? Number(data.otherIncome) : undefined),
        notes: data.notes !== undefined ? data.notes : (data.otherSalaryNote !== undefined ? data.otherSalaryNote : undefined)
      }
    });

    // Recalculate salary with overrides
    const calculated = await calculateStaffSalary(existing.staffId, existing.payrollPeriod.month, existing.payrollPeriodId);
    const updatedFinal = await prisma.payrollItem.update({
      where: { id },
      data: calculated
    });

    res.json(updatedFinal);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
