import { Student, Transaction, AttendanceRecord, Class, TuitionSummary, FeeChangeLog, Enrollment, EnrollmentBreakdown } from '../types';
import { isTuitionRevenue } from '../constants';

export function parseFeeHistory(feeHistory: any): FeeChangeLog[] {
  if (!feeHistory) return [];
  if (Array.isArray(feeHistory)) return feeHistory;
  if (typeof feeHistory === 'string') {
    try {
      return JSON.parse(feeHistory);
    } catch {
      return [];
    }
  }
  return [];
}

export function getFeeAtDate(attendanceDate: string, currentFee: number, feeHistory: FeeChangeLog[]): number {
  if (!feeHistory || feeHistory.length === 0) return currentFee;

  // Sắp xếp lịch sử theo thời gian tăng dần
  const sorted = [...feeHistory].sort((a, b) => a.changedAt.localeCompare(b.changedAt));

  // Tìm thay đổi retroactive cuối cùng - đây là điểm reset
  let lastRetroIdx = -1;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].mode === 'retroactive' || !sorted[i].mode) {
      lastRetroIdx = i;
      break;
    }
  }

  // Chỉ xem xét các thay đổi prospective SAU thay đổi retroactive cuối cùng
  const prospective = sorted.slice(lastRetroIdx + 1).filter(h => h.mode === 'prospective');
  if (prospective.length === 0) return currentFee;

  // Học phí gốc trước các thay đổi prospective là oldFee của thay đổi đầu tiên
  const baseFee = prospective[0].oldFee;

  let fee = baseFee;
  for (const entry of prospective) {
    const changeDate = entry.changedAt.slice(0, 10); // YYYY-MM-DD
    if (attendanceDate >= changeDate) {
      fee = entry.newFee;
    }
  }
  return fee;
}

export function computeTuitionCost(
  attendance: AttendanceRecord[],
  studentId: string,
  currentFee: number,
  feeHistory: FeeChangeLog[]
): number {
  const sorted = [...(feeHistory || [])].sort((a, b) => a.changedAt.localeCompare(b.changedAt));
  
  let lastRetroIdx = -1;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].mode === 'retroactive' || !sorted[i].mode) {
      lastRetroIdx = i;
      break;
    }
  }
  const prospective = sorted.slice(lastRetroIdx + 1).filter(h => h.mode === 'prospective');
  const hasProspective = prospective.length > 0;

  if (!hasProspective) {
    // Đơn giản: tất cả các buổi đều tính theo học phí hiện tại.
    // Dùng TỔNG sessionsDeducted (vắng = 0) thay vì đếm bản ghi.
    const sessionsUsed = attendance
      .filter(a => a.studentId === studentId && a.status !== 'excused')
      .reduce((s, a) => s + (a.sessionsDeducted ?? 1), 0);
    return sessionsUsed * currentFee;
  }

  // Tính chi phí từng buổi học
  let totalCost = 0;
  attendance
    .filter(a => a.studentId === studentId && a.status !== 'excused')
    .forEach(a => {
      totalCost += getFeeAtDate(a.date, currentFee, feeHistory);
    });
  return totalCost;
}

export function computeTuitionSummary(
  student: Student,
  transactions: Transaction[],
  attendance: AttendanceRecord[],
  enrollments: Enrollment[] = []
): TuitionSummary {
  // Khớp strict theo studentId
  const totalPaidOffline = transactions
    .filter(t =>
      t.studentId === student.id &&
      isTuitionRevenue(t.revenueCategory) &&
      t.studyType !== 'Online'
    )
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const feePerSession = Number(student.feePerSession) || 0;
  const feeHistory: FeeChangeLog[] = student.feeHistory || [];

  // Lấy các enrollment của học sinh này
  const studentEnrollments = enrollments.filter(e => e.studentId === student.id);
  const studentAttendance = attendance.filter(a => a.studentId === student.id && a.status !== 'excused');

  // Số buổi đã học = TỔNG sessionsDeducted (buổi vắng có deducted=0 sẽ không tính),
  // nhất quán với sổ cái (totalSpent) và chi phí. KHÔNG dùng .length (đếm cả buổi vắng).
  let totalSessionsUsed = studentAttendance.reduce((sum, a) => sum + (a.sessionsDeducted ?? 1), 0);

  // Tính chi phí dựa trên enrollments
  let totalCostUsed = 0;
  const classBreakdownMap = new Map<string, { sessions: number; cost: number; fee: number }>();

  // Khởi tạo breakdown cho các enrollment đang học
  studentEnrollments.forEach(e => {
    if (!classBreakdownMap.has(e.className)) {
      classBreakdownMap.set(e.className, { sessions: 0, cost: 0, fee: e.feePerSession });
    }
  });

  studentAttendance.forEach(a => {
    // Tìm enrollment phù hợp cho buổi điểm danh này
    const match = studentEnrollments.find(e => {
      if (e.className !== a.className) return false;
      return a.date >= e.startDate && (!e.endDate || a.date <= e.endDate);
    });

    let fee = 0;
    if (match) {
      fee = getFeeAtDate(a.date, match.feePerSession, parseFeeHistory(match.feeHistory));
    } else {
      // Nếu không tìm thấy enrollment trùng ngày, tìm bất kỳ enrollment nào cùng lớp
      const classMatch = studentEnrollments.find(e => e.className === a.className);
      if (classMatch) {
        fee = getFeeAtDate(a.date, classMatch.feePerSession, parseFeeHistory(classMatch.feeHistory));
      } else {
        // Fallback về học phí chung của học sinh
        fee = getFeeAtDate(a.date, feePerSession, feeHistory);
      }
    }

    const cost = fee * (a.sessionsDeducted ?? 1);
    totalCostUsed += cost;

    const breakdown = classBreakdownMap.get(a.className) || { sessions: 0, cost: 0, fee };
    breakdown.sessions += a.sessionsDeducted ?? 1;
    breakdown.cost += cost;
    classBreakdownMap.set(a.className, breakdown);
  });

  // TỐI ƯU TẢI: khi KHÔNG nạp dữ liệu điểm danh thô (để tránh kéo 48k bản ghi),
  // lấy "đã học" & "chi phí" trực tiếp từ SỔ CÁI (totalSpent) — kết quả giống hệt.
  if (studentAttendance.length === 0 && studentEnrollments.length > 0) {
    totalCostUsed = studentEnrollments.reduce((s, e) => s + ((e as any).totalSpent ?? 0), 0);
    // Số buổi đã học = Σ sessionsUsed của sổ cái (đúng cả lớp miễn phí, không qua phí).
    totalSessionsUsed = studentEnrollments.reduce((s, e) => s + ((e as any).sessionsUsed ?? 0), 0);
  }

  const activeEnrollments = studentEnrollments.filter(e => e.isActive);

  const primaryEnrollment = studentEnrollments.find(e => e.isActive) || studentEnrollments[0];
  const primaryFee = primaryEnrollment ? primaryEnrollment.feePerSession : feePerSession;

  let moneyRemaining = 0;
  let sessionsRemaining = 0;

  if (activeEnrollments.length > 0) {
    moneyRemaining = activeEnrollments.reduce((sum, e) => sum + ((e as any).balance ?? 0), 0);
    sessionsRemaining = activeEnrollments.reduce((sum, e) => sum + ((e as any).sessionsRemaining ?? 0), 0);
  } else {
    moneyRemaining = totalPaidOffline - totalCostUsed;
    sessionsRemaining = primaryFee > 0 ? Math.floor(moneyRemaining / primaryFee) : 0;
  }

  const totalSessionsBought = sessionsRemaining + totalSessionsUsed;

  const enrollmentBreakdown: EnrollmentBreakdown[] = Array.from(classBreakdownMap.entries()).map(([className, data]) => ({
    className,
    feePerSession: data.fee,
    sessionsUsed: data.sessions,
    costUsed: data.cost
  }));

  // Xác định className hiển thị (lớp chính + badge, hoặc join)
  let displayClassName = student.className || '';
  if (activeEnrollments.length > 0) {
    displayClassName = activeEnrollments[0].className;
  }

  return {
    studentId: student.id,
    studentName: student.name,
    className: displayClassName,
    feePerSession: primaryFee,
    totalPaidOffline,
    totalCostUsed,
    moneyRemaining,
    totalSessionsBought,
    totalSessionsUsed,
    sessionsRemaining,
    enrollmentBreakdown
  };
}

export interface RevenueSummary {
  tuitionCollectedInPeriod: number;
  tuitionEarnedInPeriod: number;
  otherRevenueCollectedInPeriod: number;
  totalCashCollectedInPeriod: number;
  totalEarnedRevenueInPeriod: number;
  tuitionEarnedToDate: number;    // Doanh thu thực học phí lũy kế
  tuitionUnearnedToDate: number;  // Học phí chưa thực hiện lũy kế
}

export function computeRevenueSummary(
  students: Student[],
  transactions: Transaction[],
  attendance: AttendanceRecord[],
  monthStr?: string,
  classes?: Class[],
  enrollments: Enrollment[] = []
): RevenueSummary {
  const studentMap = new Map<string, Student>();
  students.forEach(s => studentMap.set(s.id, s));

  const enrollmentMap = new Map<string, Enrollment[]>();
  enrollments.forEach(e => {
    const list = enrollmentMap.get(e.studentId) || [];
    list.push(e);
    enrollmentMap.set(e.studentId, list);
  });

  const offlineClassesMap = new Map<string, Class>();
  if (classes) {
    classes.forEach(c => {
      offlineClassesMap.set(c.id, c);
    });
  }

  const isClassOffline = (classId?: string) => {
    if (!classId) return true;
    const cls = offlineClassesMap.get(classId);
    return !cls || cls.type !== 'online';
  };

  const getYearMonth = (dateStr?: string): string => {
    if (!dateStr) return '';
    const match = dateStr.match(/^(\d{4})[./-](\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}`;
    }
    return dateStr.slice(0, 7);
  };

  // 1. Tiền thu học phí & doanh thu khác trong kỳ (in-period)
  const isTxInPeriod = (t: Transaction) => {
    if (!monthStr) return true;
    return getYearMonth(t.paymentDate) === monthStr;
  };

  const isAttInPeriod = (a: AttendanceRecord) => {
    if (!monthStr) return true;
    return getYearMonth(a.date) === monthStr;
  };

  // 2. Tiền thu học phí lũy kế (cumulative) tính đến cuối tháng
  const isTxBeforeOrEndPeriod = (t: Transaction) => {
    if (!monthStr) return true;
    const ym = getYearMonth(t.paymentDate);
    return ym !== '' && ym <= monthStr;
  };

  // Điểm danh lũy kế (cumulative) tính đến cuối tháng
  const isAttBeforeOrEndPeriod = (a: AttendanceRecord) => {
    if (!monthStr) return true;
    const ym = getYearMonth(a.date);
    return ym !== '' && ym <= monthStr;
  };

  // A. Calculations for the specific Period (Month)
  const tuitionCollected = transactions
    .filter(t => 
      t.studentId && 
      studentMap.has(t.studentId) && 
      t.revenueCategory === 'Học phí offline' && 
      t.studyType !== 'Online' &&
      t.paymentMethod !== 'Chuyển số dư' &&
      isTxInPeriod(t)
    )
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  let tuitionEarned = 0;
  attendance
    .filter(a => 
      a.studentId && 
      studentMap.has(a.studentId) && 
      (a.status === 'present' || a.status === 'absent') &&
      isClassOffline(a.classId) &&
      isAttInPeriod(a)
    )
    .forEach(a => {
      const student = studentMap.get(a.studentId)!;
      const studentEnrolls = enrollmentMap.get(a.studentId) || [];
      
      // Tìm enrollment trùng khớp
      const match = studentEnrolls.find(e => {
        if (e.className !== a.className) return false;
        return a.date >= e.startDate && (!e.endDate || a.date <= e.endDate);
      });

      let fee = 0;
      if (match) {
        fee = getFeeAtDate(a.date, match.feePerSession, parseFeeHistory(match.feeHistory));
      } else {
        const classMatch = studentEnrolls.find(e => e.className === a.className);
        if (classMatch) {
          fee = getFeeAtDate(a.date, classMatch.feePerSession, parseFeeHistory(classMatch.feeHistory));
        } else {
          fee = getFeeAtDate(a.date, Number(student.feePerSession) || 0, student.feeHistory || []);
        }
      }
      tuitionEarned += fee * (a.sessionsDeducted ?? 1);
    });

  const otherRevenueCollected = transactions
    .filter(t => 
      t.revenueCategory !== 'Học phí offline' && 
      t.revenueCategory !== 'Học phí online' && 
      t.studyType !== 'Online' &&
      isTxInPeriod(t)
    )
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalCashCollected = tuitionCollected + otherRevenueCollected;
  const totalEarnedRevenue = tuitionEarned + otherRevenueCollected;

  // B. Calculations for Cumulative to date (End of Period)
  const cumulativeTuitionCollected = transactions
    .filter(t => 
      t.studentId && 
      studentMap.has(t.studentId) && 
      t.revenueCategory === 'Học phí offline' && 
      t.studyType !== 'Online' &&
      t.paymentMethod !== 'Chuyển số dư' &&
      isTxBeforeOrEndPeriod(t)
    )
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  let cumulativeTuitionEarned = 0;
  attendance
    .filter(a => 
      a.studentId && 
      studentMap.has(a.studentId) && 
      (a.status === 'present' || a.status === 'absent') &&
      isClassOffline(a.classId) &&
      isAttBeforeOrEndPeriod(a)
    )
    .forEach(a => {
      const student = studentMap.get(a.studentId)!;
      const studentEnrolls = enrollmentMap.get(a.studentId) || [];
      
      const match = studentEnrolls.find(e => {
        if (e.className !== a.className) return false;
        return a.date >= e.startDate && (!e.endDate || a.date <= e.endDate);
      });

      let fee = 0;
      if (match) {
        fee = getFeeAtDate(a.date, match.feePerSession, parseFeeHistory(match.feeHistory));
      } else {
        const classMatch = studentEnrolls.find(e => e.className === a.className);
        if (classMatch) {
          fee = getFeeAtDate(a.date, classMatch.feePerSession, parseFeeHistory(classMatch.feeHistory));
        } else {
          fee = getFeeAtDate(a.date, Number(student.feePerSession) || 0, student.feeHistory || []);
        }
      }
      cumulativeTuitionEarned += fee * (a.sessionsDeducted ?? 1);
    });

  // Học phí chưa thực hiện lũy kế đến cuối tháng đó
  const tuitionUnearned = cumulativeTuitionCollected - cumulativeTuitionEarned;

  return {
    tuitionCollectedInPeriod: tuitionCollected,
    tuitionEarnedInPeriod: tuitionEarned,
    otherRevenueCollectedInPeriod: otherRevenueCollected,
    totalCashCollectedInPeriod: totalCashCollected,
    totalEarnedRevenueInPeriod: totalEarnedRevenue,
    tuitionEarnedToDate: cumulativeTuitionEarned,
    tuitionUnearnedToDate: tuitionUnearned
  };
}
