import { Student, Transaction, AttendanceRecord, Class, StaffMember, MonthlySalary, Expense, Enrollment } from '../types';
import { computeTuitionSummary, computeRevenueSummary, getFeeAtDate } from './tuition';
import { formatDateKey, isDayMatch } from '../utils';

export interface TodayOverviewStats {
  classesScheduled: number;
  classesAttended: number;
  classesUnattended: number;
  studentsPresent: number;
  studentsAbsent: number;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  totalEarned: number;
  earnedTuitionToday: number;
  otherRevenueToday: number;
}

export interface MonthOverviewStats {
  revenue: number;              // Tiền thu tháng này (cash)
  earnedRevenue: number;        // Tổng doanh thu thực tháng này (earned)
  tuitionEarned: number;        // Doanh thu thực học phí tháng này
  otherRevenue: number;         // Doanh thu khác tháng này
  operatingExpense: number;
  payroll: number;
  profit: number;               // Lợi nhuận theo tổng doanh thu thực
  cashProfit: number;           // Lợi nhuận theo tiền thu
  activeStudents: number;
  newStudents: number;
  inactiveStudents: number;
  totalDebt: number;            // Tổng công nợ học viên (unearned < 0)
  tuitionUnearned: number;      // Học phí chưa thực hiện lũy kế toàn trung tâm
}

export function computeTodayOverview(
  classes: Class[],
  attendance: AttendanceRecord[],
  transactions: Transaction[],
  expenses: Expense[],
  students: Student[],
  enrollments: Enrollment[] = []
): TodayOverviewStats {
  const todayStr = formatDateKey(new Date());
  return computeDayOverview(todayStr, classes, attendance, transactions, expenses, students, enrollments);
}

export function computeDayOverview(
  targetDateStr: string | any,
  classes?: Class[],
  attendance?: AttendanceRecord[],
  transactions?: Transaction[],
  expenses?: Expense[],
  students?: Student[],
  enrollments: Enrollment[] = []
): TodayOverviewStats {
  if (targetDateStr && typeof targetDateStr === 'object') {
    const opts = targetDateStr as any;
    const mappedTx = [
      ...(opts.transactions || []).map((t: any) => ({
        ...t,
        revenueCategory: t.revenueCategory || 'Học phí offline'
      })),
      ...(opts.revenueOthers || []).map((r: any) => ({
        ...r,
        revenueCategory: r.category || 'Khác'
      }))
    ];
    return computeDayOverview(
      opts.targetDateStr,
      opts.classes || [],
      opts.attendance || [],
      mappedTx,
      opts.expenses || [],
      opts.students || [],
      opts.enrollments || []
    );
  }

  // Convert YYYY-MM-DD targetDateStr to get dayOfWeek in local timezone safely
  const parts = targetDateStr.split('-');

  const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const dayOfWeek = dateObj.getDay();

  // Xem xét lớp nào có lịch hôm nay

  const activeClasses = classes.filter(c => c.status === 'active' && c.type !== 'online');
  
  let classesScheduled = 0;
  let classesAttended = 0;

  activeClasses.forEach(cls => {
    const days: string[] = Array.isArray(cls.scheduleDays) ? cls.scheduleDays : [];
    const hasToday = days.some((d: string) => isDayMatch(d, dayOfWeek));
    if (hasToday) {
      classesScheduled++;
      const isAttended = attendance.some(a => a.date === targetDateStr && (a.classId === cls.id || a.className === cls.name || a.classId === cls.name));
      if (isAttended) {
        classesAttended++;
      }
    }
  });

  const classesUnattended = Math.max(classesScheduled - classesAttended, 0);

  // Học viên điểm danh hôm nay (chỉ tính lớp offline)
  const offlineClassIds = new Set(classes.filter(c => c.type !== 'online').map(c => c.id));
  const offlineClassNames = new Set(classes.filter(c => c.type !== 'online').map(c => c.name));
  const todayAttendance = attendance.filter(a => 
    a.date === targetDateStr && 
    (offlineClassIds.has(a.classId) || offlineClassNames.has(a.classId) || offlineClassNames.has(a.className))
  );
  const studentsPresent = todayAttendance.filter(a => a.status === 'present').length;
  const studentsAbsent = todayAttendance.filter(a => a.status === 'absent').length;

  // Thu chi hôm nay
  const totalIncome = transactions
    .filter(t => t.paymentDate === targetDateStr && t.revenueCategory !== 'Học phí online' && t.studyType !== 'Online')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalExpense = expenses
    .filter(e => e.date === targetDateStr)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const netCashFlow = totalIncome - totalExpense;

  // Doanh thu thực hôm nay
  let earnedTuitionToday = 0;
  const studentMap = new Map<string, Student>();
  students.forEach(s => studentMap.set(s.id, s));
  
  const enrollmentMap = new Map<string, Enrollment[]>();
  enrollments.forEach(e => {
    const list = enrollmentMap.get(e.studentId) || [];
    list.push(e);
    enrollmentMap.set(e.studentId, list);
  });

  todayAttendance
    .filter(a => a.status === 'present' || a.status === 'absent')
    .forEach(a => {
      const student = studentMap.get(a.studentId);
      if (student) {
        const studentEnrolls = enrollmentMap.get(a.studentId) || [];
        const match = studentEnrolls.find(e => {
          if (e.className !== a.className) return false;
          return a.date >= e.startDate && (!e.endDate || a.date <= e.endDate);
        });

        let fee = 0;
        if (match) {
          fee = match.feePerSession;
        } else {
          const classMatch = studentEnrolls.find(e => e.className === a.className);
          if (classMatch) {
            fee = classMatch.feePerSession;
          } else {
            fee = getFeeAtDate(a.date, Number(student.feePerSession) || 0, student.feeHistory || []);
          }
        }
        earnedTuitionToday += fee * (a.sessionsDeducted ?? 1);
      } else {
        earnedTuitionToday += (a.feeApplied ?? 0) * (a.sessionsDeducted ?? 1);
      }
    });

  const otherRevenueToday = transactions
    .filter(t => t.paymentDate === targetDateStr && t.revenueCategory !== 'Học phí offline' && t.revenueCategory !== 'Học phí online' && t.studyType !== 'Online')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalEarned = earnedTuitionToday + otherRevenueToday;

  return {
    classesScheduled,
    classesAttended,
    classesUnattended,
    studentsPresent,
    studentsAbsent,
    totalIncome,
    totalExpense,
    netCashFlow,
    totalEarned,
    earnedTuitionToday,
    otherRevenueToday,
  };
}

export function computeMonthOverview(
  students: Student[],
  transactions: Transaction[],
  attendance: AttendanceRecord[],
  expenses: Expense[],
  salaries: MonthlySalary[],
  classes?: Class[],
  enrollments: Enrollment[] = []
): MonthOverviewStats {
  const today = new Date();
  const currentMonthStr = today.toISOString().slice(0, 7); // YYYY-MM

  // Tính các chỉ số doanh thu qua helper mới
  const revenueSummary = computeRevenueSummary(students, transactions, attendance, currentMonthStr, classes, enrollments);

  const revenue = revenueSummary.totalCashCollectedInPeriod;
  const earnedRevenue = revenueSummary.totalEarnedRevenueInPeriod;
  const tuitionEarned = revenueSummary.tuitionEarnedInPeriod;
  const otherRevenue = revenueSummary.otherRevenueCollectedInPeriod;
  const tuitionUnearned = revenueSummary.tuitionUnearnedToDate;

  // Chi phí tháng này
  const operatingExpense = expenses
    .filter(e => e.date?.startsWith(currentMonthStr))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Lương nhân sự tháng này
  const payroll = salaries
    .filter(s => s.month === currentMonthStr)
    .reduce((sum, s) => sum + (Number(s.grossSalary) || 0), 0);

  // Lợi nhuận
  const profit = earnedRevenue - operatingExpense - payroll;
  const cashProfit = revenue - operatingExpense - payroll;

  // Số học viên đang học
  const activeStudents = students.filter(s => s.status === 'active').length;

  // Số học viên mới trong tháng
  const newStudents = students.filter(s => s.enrollDate?.startsWith(currentMonthStr)).length;

  // Số học viên nghỉ/tạm nghỉ trong tháng
  const inactiveStudents = students.filter(s => 
    (s.status === 'left' || s.status === 'suspended') && 
    (s.updatedAt?.startsWith(currentMonthStr) || s.createdAt?.startsWith(currentMonthStr))
  ).length;

  // Tổng công nợ (số dư học phí âm)
  let totalDebt = 0;
  students.forEach(student => {
    const summary = computeTuitionSummary(student, transactions, attendance, enrollments);
    if (summary.moneyRemaining < 0) {
      totalDebt += Math.abs(summary.moneyRemaining);
    }
  });

  return {
    revenue,
    earnedRevenue,
    tuitionEarned,
    otherRevenue,
    operatingExpense,
    payroll,
    profit,
    cashProfit,
    activeStudents,
    newStudents,
    inactiveStudents,
    totalDebt,
    tuitionUnearned
  };
}
