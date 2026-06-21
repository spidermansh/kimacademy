import { Student, Transaction, AttendanceRecord, Class, StaffMember, TeachingLog, SalaryAdvance, MonthlySalary, Expense, SystemParameter, Enrollment } from '../types';
import { computeTuitionSummary } from './tuition';
import { formatDate, isDayMatch } from '../utils';

export interface BusinessAlert {
  id: string;
  category: 'student' | 'class' | 'finance' | 'staff';
  level: 'low' | 'medium' | 'high' | 'critical'; // thấp / vừa / cao / nghiêm trọng
  message: string;
  details?: string;
  link?: string; // TabId to navigate to
}

export function computeAlerts(
  students: Student[] | any,
  classes?: Class[],
  transactions?: Transaction[],
  attendance?: AttendanceRecord[],
  staff?: StaffMember[],
  teachingLogs?: TeachingLog[],
  advances?: SalaryAdvance[],
  salaries?: MonthlySalary[],
  expenses?: Expense[],
  parameters?: SystemParameter[],
  admissionLeads?: any[],
  enrollments: Enrollment[] = []
): BusinessAlert[] {
  if (students && !Array.isArray(students) && typeof students === 'object') {
    const opts = students as any;
    return computeAlerts(
      opts.students || [],
      opts.classes || [],
      opts.transactions || [],
      opts.attendance || [],
      opts.staff || [],
      opts.teachingLogs || opts.teachingLog || [],
      opts.advances || opts.salaryAdvance || [],
      opts.salaries || opts.monthlySalary || [],
      opts.expenses || opts.expense || [],
      opts.systemParameters || opts.parameters || [],
      opts.leads || opts.admissionLeads || [],
      opts.enrollments || []
    );
  }

  const alerts: BusinessAlert[] = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const genId = () => Math.random().toString(36).substring(2, 9);


  const getParam = (key: string, fallback: any) => {
    if (!parameters) return fallback;
    const p = parameters.find(x => x.key === key && x.isActive);
    if (!p) return fallback;
    if (p.valueType === 'number' || p.valueType === 'money' || p.valueType === 'percent') return Number(p.value);
    if (p.valueType === 'boolean') return p.value === true || p.value === 'true';
    return p.value;
  };

  const longAbsenceDaysVal = getParam('longAbsenceDaysThreshold', 14);
  const date14DaysAgo = new Date(Date.now() - longAbsenceDaysVal * 24 * 3600 * 1000).toISOString().slice(0, 10);

  // ─── A. HỌC VIÊN ────────────────────────────────────────────────────────────
  students.forEach(student => {
    // 1. Kiểm tra học phí bằng computeTuitionSummary
    const summary = computeTuitionSummary(student, transactions, attendance, enrollments);
    
    const studentFee = Number(student.feePerSession) || 0;
    const hasEnrollmentFee = enrollments.some(e => e.studentId === student.id && e.isActive && e.feePerSession > 0);
    if (student.status !== 'left' && (studentFee > 0 || hasEnrollmentFee)) {
      if (summary.moneyRemaining < 0) {
        alerts.push({
          id: `std-neg-${student.id}`,
          category: 'student',
          level: 'critical',
          message: `Học viên ${student.name} có học phí chưa thực hiện âm (học phí âm hoặc nợ phí: ${summary.moneyRemaining.toLocaleString('vi-VN')}đ).`,
          details: 'Học viên đã học vượt tiền đã đóng, là công nợ cần thu.',
          link: 'hoc-phi'
        });
      } else if (summary.sessionsRemaining === 0) {
        alerts.push({
          id: `std_zero_${student.id}`,
          category: 'student',
          level: 'high',
          message: `Học viên ${student.name} đã hết buổi học (còn 0 buổi).`,
          details: 'Đã học hết số buổi đã mua. Cần nhắc đóng học phí khóa mới.',
          link: 'hoc-phi'
        });
      } else if (summary.sessionsRemaining > 0 && summary.sessionsRemaining <= getParam('lowRemainingSessionsThreshold', 2)) {
        alerts.push({
          id: `std_low_${student.id}`,
          category: 'student',
          level: 'medium',
          message: `Học viên ${student.name} sắp hết buổi học (còn ${summary.sessionsRemaining} buổi).`,
          details: 'Số buổi còn lại ít. Nên chuẩn bị nhắc phụ huynh đóng học phí.',
          link: 'hoc-phi'
        });
      }
      
      const largeUnearnedVal = getParam('largeUnearnedTuitionThreshold', 5000000);
      if (summary.moneyRemaining > largeUnearnedVal) {
        alerts.push({
          id: `std_high_unearned_${student.id}`,
          category: 'student',
          level: 'medium',
          message: `Học viên ${student.name} có học phí chưa thực hiện quá lớn (${summary.moneyRemaining.toLocaleString('vi-VN')}đ).`,
          details: 'Số tiền đóng trước còn nhiều, cần theo dõi lộ trình học tập để đảm bảo hoàn thành khóa học.',
          link: 'hoc-phi'
        });
      }
    }

    // 2. Học viên active nhưng không có lớp
    const hasClass = enrollments.some(e => e.studentId === student.id && e.isActive);
    if (student.status === 'active' && !hasClass) {
      alerts.push({
        id: `std_noclass_${student.id}`,
        category: 'student',
        level: 'medium',
        message: `Học viên ${student.name} đang hoạt động nhưng chưa được xếp lớp.`,
        details: 'Vui lòng kiểm tra và xếp lớp học phù hợp cho học viên.',
        link: 'quan-ly-hoc-vien'
      });
    }

    // 3. Học viên active nhưng không có điểm danh trong 14 ngày
    const studentAttendance = attendance.filter(a => a.studentId === student.id);
    if (student.status === 'active') {
      const hasRecentAttendance = studentAttendance.some(a => a.date >= date14DaysAgo);
      if (!hasRecentAttendance) {
        const latestAtt = studentAttendance.length > 0
          ? [...studentAttendance].sort((a, b) => b.date.localeCompare(a.date))[0].date
          : null;
        alerts.push({
          id: `std_no_att_${student.id}`,
          category: 'student',
          level: 'medium',
          message: `Học viên ${student.name} không phát sinh điểm danh trong ${longAbsenceDaysVal} ngày qua.`,
          details: latestAtt 
            ? `Buổi học gần nhất vào ngày ${formatDate(latestAtt)}. Cần xác minh lý do nghỉ dài.`
            : `Chưa từng được điểm danh kể từ khi nhập học (${student.enrollDate || 'N/A'}).`,
          link: 'diem-danh'
        });
      }
    }

    // 4. Học viên đã nghỉ/tạm nghỉ nhưng vẫn phát sinh điểm danh hoặc thu tiền hôm nay/gần đây
    if (student.status === 'left' || student.status === 'suspended') {
      const statusLabel = student.status === 'left' ? 'đã nghỉ' : 'tạm nghỉ';
      const hasRecentAtt = studentAttendance.some(a => a.date >= date14DaysAgo);
      const hasRecentTx = transactions.some(t => 
        t.studentId === student.id && 
        t.paymentDate >= date14DaysAgo
      );
      if (hasRecentAtt || hasRecentTx) {
        alerts.push({
          id: `std_inactive_active_${student.id}`,
          category: 'student',
          level: 'critical',
          message: `Học viên ${student.name} (${statusLabel}) vẫn phát sinh điểm danh hoặc đóng tiền gần đây.`,
          details: 'Hồ sơ học viên ở trạng thái ngừng học nhưng hệ thống vẫn ghi nhận học vụ hoặc tài chính mới. Cần kiểm tra lại trạng thái.',
          link: 'quan-ly-hoc-vien'
        });
      }
    }

    // 5. Học viên vắng liên tục từ N buổi trở lên
    const frequentAbsenceVal = getParam('frequentAbsenceThreshold', 2);
    if (student.status === 'active' && studentAttendance.length >= frequentAbsenceVal) {
      const sortedAtt = [...studentAttendance].sort((a, b) => b.date.localeCompare(a.date));
      let allAbsent = true;
      for (let i = 0; i < frequentAbsenceVal; i++) {
        if (!sortedAtt[i] || (sortedAtt[i].status !== 'absent' && sortedAtt[i].status !== 'excused')) {
          allAbsent = false;
          break;
        }
      }
      if (allAbsent) {
        let consecutiveCount = 0;
        for (const a of sortedAtt) {
          if (a.status === 'absent' || a.status === 'excused') {
            consecutiveCount++;
          } else {
            break;
          }
        }
        alerts.push({
          id: `std_absent_consec_${student.id}`,
          category: 'student',
          level: 'high',
          message: `Học viên ${student.name} vắng liên tục ${consecutiveCount} buổi học.`,
          details: `Học viên vắng từ ngày ${formatDate(sortedAtt[consecutiveCount - 1].date)} đến nay. Cần gọi điện hỏi thăm phụ huynh.`,
          link: 'nhac-ph'
        });
      }
    }
  });

  // ─── B. LỚP HỌC ─────────────────────────────────────────────────────────────
  const dayOfWeek = today.getDay();

  classes.forEach(cls => {
    if (cls.status === 'ended') return;

    if (cls.type === 'online') {
      return;
    }

    // Sĩ số học viên trong lớp
    const classStudents = students.filter(s => s.status === 'active' && enrollments.some(e => e.studentId === s.id && e.className === cls.name && e.isActive));
    const studentCount = classStudents.length;

    // 1. Lớp active nhưng không có học viên
    if (cls.status === 'active' && studentCount === 0) {
      alerts.push({
        id: `cls_no_students_${cls.id}`,
        category: 'class',
        level: 'medium',
        message: `Lớp ${cls.name} đang hoạt động nhưng chưa có học viên nào.`,
        details: 'Vui lòng kiểm tra lại danh sách hoặc xếp học viên mới tuyển sinh vào lớp này.',
        link: 'quan-ly-lop'
      });
    }

    // 2. Lớp không có giáo viên
    if (cls.status === 'active' && !cls.teacherId && !cls.teacher) {
      alerts.push({
        id: `cls_no_teacher_${cls.id}`,
        category: 'class',
        level: 'high',
        message: `Lớp ${cls.name} chưa được phân công giáo viên giảng dạy.`,
        details: 'Cần chỉ định giáo viên phụ trách để thực hiện điểm danh và tính lương.',
        link: 'quan-ly-lop'
      });
    }

    // 3. Lớp không có lịch học
    const days: string[] = Array.isArray(cls.scheduleDays) ? cls.scheduleDays : [];
    if (cls.status === 'active' && (!cls.schedule || days.length === 0)) {
      alerts.push({
        id: `cls_no_sched_${cls.id}`,
        category: 'class',
        level: 'medium',
        message: `Lớp ${cls.name} chưa cấu hình lịch học cụ thể.`,
        details: 'Thiếu thông tin thứ học trong tuần hoặc khung giờ học. Vui lòng thiết lập trong mục Lớp học.',
        link: 'quan-ly-lop'
      });
    }

    // 4. Lớp vượt sĩ số tối đa
    if (cls.status === 'active' && cls.maxStudents && studentCount > cls.maxStudents) {
      alerts.push({
        id: `cls_overflow_${cls.id}`,
        category: 'class',
        level: 'high',
        message: `Lớp ${cls.name} vượt sĩ số tối đa (${studentCount}/${cls.maxStudents} học viên).`,
        details: 'Sĩ số học viên hiện tại lớn hơn giới hạn tối đa cho phép của lớp học này.',
        link: 'quan-ly-lop'
      });
    }

    // 5. Lớp có lịch học hôm nay nhưng chưa điểm danh
    const hasToday = days.some((d: string) => isDayMatch(d, dayOfWeek));
    if (cls.status === 'active' && hasToday) {
      const attendedToday = attendance.some(a => a.date === todayStr && (a.classId === cls.id || a.className === cls.name || a.classId === cls.name));
      if (!attendedToday) {
        alerts.push({
          id: `cls_no_att_today_${cls.id}`,
          category: 'class',
          level: 'high',
          message: `Lớp ${cls.name} có lịch học hôm nay nhưng chưa được điểm danh.`,
          details: 'Vui lòng thực hiện điểm danh cho lớp học này trước khi kết thúc ngày.',
          link: 'diem-danh'
        });
      }
    }
  });

  // ─── C. TÀI CHÍNH ───────────────────────────────────────────────────────────
  transactions.forEach(t => {
    // Bỏ qua hoàn toàn giao dịch online cũ
    if (t.studyType === 'Online' || t.revenueCategory === 'Học phí online') {
      return;
    }

    // 1. Giao dịch chưa đối chiếu
    if (!t.isReconciled) {
      alerts.push({
        id: `tx-unreconciled-${t.id}`,
        category: 'finance',
        level: 'medium',
        message: `Giao dịch thu ${t.amount.toLocaleString('vi-VN')}đ (${t.studentName}) chưa được đối chiếu.`,
        details: `Khoản thu ngày ${formatDate(t.paymentDate)} bằng ${t.paymentMethod} cần xác thực ngân hàng hoặc quỹ tiền mặt.`,
        link: 'thu-tien'
      });
    }

    // 2. Giao dịch học phí không gắn được học viên hợp lệ
    const isTuition = t.revenueCategory === 'Học phí offline';
    if (isTuition) {
      const studentExists = t.studentId ? students.some(s => s.id === t.studentId) : false;
      if (!studentExists) {
        alerts.push({
          id: `tx_invalid_student_${t.id}`,
          category: 'finance',
          level: 'critical',
          message: `Giao dịch học phí của "${t.studentName || 'Không tên'}" (${t.amount.toLocaleString('vi-VN')}đ) chưa được gắn học viên hợp lệ.`,
          details: 'Giao dịch thiếu mã học viên (studentId) hoặc mã không khớp với học viên nào. Số tiền này không được tính vào học phí đã đóng của học viên.',
          link: 'thu-tien'
        });
      }
    }
  });

  // 3. Khoản chi > largeExpenseThreshold
  const largeExpenseVal = getParam('largeExpenseThreshold', 2000000);
  expenses.forEach(e => {
    if (e.amount > largeExpenseVal) {
      alerts.push({
        id: `exp_large_${e.id}`,
        category: 'finance',
        level: 'high',
        message: `Khoản chi lớn: Chi ${e.amount.toLocaleString('vi-VN')}đ cho "${e.category}".`,
        details: `Lý do chi: ${e.description || 'Không có mô tả'}. Cần xác minh hóa đơn và phê duyệt từ ban giám đốc.`,
        link: 'chi-phi'
      });
    }

    // 4. Khoản chi thiếu mô tả hoặc thiếu người duyệt
    const hasNoDesc = !e.description || !e.description.trim();
    const hasNoApprover = !e.approvedBy || !e.approvedBy.trim();
    if (hasNoDesc || hasNoApprover) {
      const problems = [];
      if (hasNoDesc) problems.push('thiếu mô tả chi tiết');
      if (hasNoApprover) problems.push('thiếu người duyệt');
      alerts.push({
        id: `exp_missing_info_${e.id}`,
        category: 'finance',
        level: 'medium',
        message: `Khoản chi ${e.amount.toLocaleString('vi-VN')}đ (${e.category}) ${problems.join(' và ')}.`,
        details: `Ngày phát sinh: ${formatDate(e.date)}. Vui lòng bổ sung đầy đủ thông tin kiểm soát chi tiêu.`,
        link: 'chi-phi'
      });
    }
  });

  // 5. Chi phí tháng này tăng trên expenseSpikeWarningRate so với tháng trước
  const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthStr = lastMonthDate.toISOString().slice(0, 7);

  const currentMonthExpenses = expenses
    .filter(e => e.date?.startsWith(currentMonthStr))
    .reduce((sum, e) => sum + e.amount, 0);

  const lastMonthExpenses = expenses
    .filter(e => e.date?.startsWith(lastMonthStr))
    .reduce((sum, e) => sum + e.amount, 0);

  if (lastMonthExpenses > 0) {
    const increaseRate = (currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses;
    const spikeRateVal = getParam('expenseSpikeWarningRate', 30) / 100;
    if (increaseRate > spikeRateVal) {
      alerts.push({
        id: `exp_increase_30`,
        category: 'finance',
        level: 'high',
        message: `Chi phí vận hành tháng này tăng vọt (+${(increaseRate * 100).toFixed(0)}% so với tháng trước).`,
        details: `Tháng này: ${currentMonthExpenses.toLocaleString('vi-VN')}đ | Tháng trước: ${lastMonthExpenses.toLocaleString('vi-VN')}đ. Cần rà soát các khoản chi bất thường.`,
        link: 'chi-phi'
      });
    }
  }

  // 6. Tổng học phí chưa thực hiện toàn trung tâm > largeTotalUnearnedTuitionThreshold
  let totalCenterUnearned = 0;
  students.forEach(student => {
    if (student.status !== 'left') {
      const summary = computeTuitionSummary(student, transactions, attendance, enrollments);
      if (summary.moneyRemaining > 0) {
        totalCenterUnearned += summary.moneyRemaining;
      }
    }
  });
  const largeTotalUnearnedVal = getParam('largeTotalUnearnedTuitionThreshold', 20000000);
  if (totalCenterUnearned > largeTotalUnearnedVal) {
    alerts.push({
      id: `sys_high_unearned_total`,
      category: 'finance',
      level: 'medium',
      message: `Tổng học phí chưa thực hiện toàn trung tâm > ${largeTotalUnearnedVal.toLocaleString('vi-VN')}đ (${totalCenterUnearned.toLocaleString('vi-VN')}đ).`,
      details: `Tổng học phí chưa thực hiện toàn trung tâm vượt quá ${largeTotalUnearnedVal.toLocaleString('vi-VN')}đ. Cần theo dõi chất lượng đào tạo và tiến độ dạy học.`,
      link: 'hoc-phi'
    });
  }

  // ─── D. NHÂN SỰ / LƯƠNG ──────────────────────────────────────────────────────
  // 1. Giáo viên có lớp nhưng thiếu đơn giá/buổi
  const teachers = staff.filter(s => (s.role === 'teacher' || s.role === 'teaching_assistant') && s.status === 'active');
  teachers.forEach(t => {
    const hasClass = classes.some(c => c.status === 'active' && (c.teacherId === t.id || c.teacher?.toLowerCase() === t.name.toLowerCase()));
    const missingRate = !t.ratePerSession || t.ratePerSession <= 0;
    if (hasClass && missingRate) {
      alerts.push({
        id: `stf_missing_rate_${t.id}`,
        category: 'staff',
        level: 'high',
        message: `Giáo viên ${t.name} đã được phân lớp dạy nhưng chưa cài đặt đơn giá/buổi.`,
        details: 'Nếu không cài đặt đơn giá/buổi, hệ thống sẽ không thể tự động tính toán lương dạy học cho giáo viên này.',
        link: 'staff-list'
      });
    }
  });

  // 2. Có điểm danh lớp nhưng không có TeachingLog tương ứng
  // Gom nhóm điểm danh theo ngày + classId
  const attGroups: Record<string, { classId: string; className: string; date: string; hasPresent: boolean }> = {};
  attendance.forEach(a => {
    const key = `${a.date}_${a.classId}`;
    if (!attGroups[key]) {
      attGroups[key] = { classId: a.classId, className: a.className, date: a.date, hasPresent: false };
    }
    if (a.status === 'present') {
      attGroups[key].hasPresent = true;
    }
  });

  Object.values(attGroups).forEach(group => {
    if (group.hasPresent) {
      const cls = classes.find(c => c.id === group.classId || c.name === group.classId || c.name === group.className);
      if (cls && cls.status === 'active') {
        const teacherId = cls.teacherId;
        const teacherName = cls.teacher;
        // Kiểm tra xem có TeachingLog nào vào ngày đó cho lớp đó không
        const logExists = teachingLogs.some(l => 
          l.date === group.date && 
          (l.classId === group.classId || l.className === group.className)
        );
        if (!logExists) {
          alerts.push({
            id: `stf_missing_tlog_${group.date}_${group.classId}`,
            category: 'staff',
            level: 'critical',
            message: `Lớp ${group.className} đã điểm danh ngày ${formatDate(group.date)} nhưng chưa có Chấm công dạy (TeachingLog).`,
            details: `Giáo viên phụ trách: ${teacherName || 'Chưa rõ'}. Cần xác nhận chấm công dạy để tính lương chính xác.`,
            link: 'cham-cong'
          });
        }
      }
    }
  });

  // 3. Ứng lương vượt lương khả dụng
  // Tính tổng ứng trong tháng hiện tại của từng nhân sự
  const monthlyAdvancesByStaff: Record<string, number> = {};
  advances
    .filter(a => a.date?.startsWith(currentMonthStr))
    .forEach(a => {
      monthlyAdvancesByStaff[a.staffId] = (monthlyAdvancesByStaff[a.staffId] || 0) + a.amount;
    });

  // Tính lương khả dụng tạm tính dựa trên TeachingLog tháng này
  const monthlyLogsByStaff: Record<string, number> = {};
  teachingLogs
    .filter(l => l.date?.startsWith(currentMonthStr))
    .forEach(l => {
      monthlyLogsByStaff[l.staffId] = (monthlyLogsByStaff[l.staffId] || 0) + (l.sessions || 1);
    });

  staff.filter(s => s.status === 'active').forEach(s => {
    const totalAdv = monthlyAdvancesByStaff[s.id] || 0;
    if (totalAdv > 0) {
      const sessions = monthlyLogsByStaff[s.id] || 0;
      const teachingIncome = (s.role === 'teacher' || s.role === 'teaching_assistant') ? sessions * (s.ratePerSession || 0) : 0;
      const baseSalary = s.baseSalary || 0;
      
      // Lấy các thay đổi nháp từ MonthlySalary nếu có
      const savedSalary = salaries.find(sal => sal.staffId === s.id && sal.month === currentMonthStr);
      const otherIncome = savedSalary?.otherIncome ?? 0;
      const kpiDeduction = savedSalary?.kpiDeduction ?? 0;

      const gross = teachingIncome + baseSalary + otherIncome - kpiDeduction;
      const tax = Math.round(gross * 0.10);
      const available = gross - tax;

      if (totalAdv > available) {
        alerts.push({
          id: `stf_adv_over_${s.id}`,
          category: 'staff',
          level: 'critical',
          message: `Nhân viên ${s.name} ứng lương vượt quá lương khả dụng tháng này (${totalAdv.toLocaleString('vi-VN')}đ > ${available.toLocaleString('vi-VN')}đ).`,
          details: `Lương khả dụng tạm tính: ${available.toLocaleString('vi-VN')}đ (Lương gộp: ${gross.toLocaleString('vi-VN')}đ, Thuế: ${tax.toLocaleString('vi-VN')}đ). Phần vượt sẽ phải chuyển nợ sang tháng sau.`,
          link: 'ung-luong'
        });
      }
    }
  });

  // 4. Bảng lương tháng đã trả nhưng bị tính lại (đã có thay đổi về dạy học hoặc ứng lương sau khi xác nhận thanh toán)
  salaries.forEach(sal => {
    if (sal.status === 'paid') {
      const logsInMonth = teachingLogs.filter(l => l.staffId === sal.staffId && l.date?.startsWith(sal.month));
      const sessionsCount = logsInMonth.reduce((sum, l) => sum + (l.sessions || 1), 0);
      
      const advsInMonth = advances.filter(a => a.staffId === sal.staffId && a.date?.startsWith(sal.month));
      const advsSum = advsInMonth.reduce((sum, a) => sum + a.amount, 0);

      if (sessionsCount !== sal.totalSessions || advsSum !== sal.totalAdvance) {
        alerts.push({
          id: `stf_sal_recalc_${sal.id}`,
          category: 'staff',
          level: 'critical',
          message: `Bảng lương tháng ${sal.month} của ${sal.staffName} đã TRẢ nhưng dữ liệu chấm công/ứng lương đã bị thay đổi!`,
          details: `Lương đã khóa: ${sal.totalSessions} buổi dạy, ứng ${sal.totalAdvance.toLocaleString()}đ | Thực tế hiện tại: ${sessionsCount} buổi, ứng ${advsSum.toLocaleString()}đ. Cần đối soát điều chỉnh.`,
          link: 'bang-luong'
        });
      }
    }
  });

  // ─── E. TUYỂN SINH (LỊCH HẸN TEST & HỒ SƠ MỚI) ──────────────────────────────
  if (admissionLeads && Array.isArray(admissionLeads)) {
    admissionLeads.forEach(lead => {
      if (lead.status !== 'test_scheduled' || !lead.testScheduleDate) return;

      if (lead.testScheduleDate === todayStr) {
        alerts.push({
          id: `lead_test_today_${lead.id}`,
          category: 'student',
          level: 'high',
          message: `Lịch hẹn test hôm nay cho học viên tuyển sinh: ${lead.studentName}.`,
          details: `Lúc ${lead.testScheduleTime || 'chưa gán giờ'} hôm nay. Phụ trách: ${lead.testAssignee || 'Chưa gán'}. Ghi chú: ${lead.testScheduleNote || 'Không có'}.`,
          link: 'tuyen-sinh'
        });
      } else if (lead.testScheduleDate < todayStr) {
        alerts.push({
          id: `lead_test_overdue_${lead.id}`,
          category: 'student',
          level: 'critical',
          message: `Hồ sơ tuyển sinh ${lead.studentName} đã quá hạn lịch hẹn test (${lead.testScheduleDate.split('-').reverse().join('/')}).`,
          details: `Hồ sơ ở trạng thái "Đã hẹn test" nhưng chưa được cập nhật kết quả sau ngày hẹn. Cần liên hệ lại hoặc lưu kết quả.`,
          link: 'tuyen-sinh'
        });
      }
    });
  }

  return alerts;
}
