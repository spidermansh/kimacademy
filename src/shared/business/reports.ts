import { Student, Transaction, AttendanceRecord, Class, StaffMember, TeachingLog, SalaryAdvance, MonthlySalary, Expense, DailyCloseRecord, SystemParameter, AdmissionLead, Enrollment } from '../types';
import { getFeeAtDate, computeTuitionSummary, computeRevenueSummary, computeTuitionCost } from './tuition';
import { formatDateKey, formatDate } from '../utils';

// ===== Kho vật tư (Inventory) — các shape phẳng cho report engine =====
export interface InventoryItemRow {
  id: string; code: string; name: string; unit: string;
  categoryId: string; categoryName: string;
  minStockLevel: number; defaultSalePrice: number; defaultCostPrice: number;
}
export interface InventoryStockRow {
  itemId: string; itemCode: string; itemName: string; unit: string;
  categoryName: string; locationId: string; locationName: string;
  quantityOnHand: number; averageCost: number; minStockLevel: number; salePrice: number;
}
export interface InventoryMovementRow {
  id: string; movementDate: string; movementType: string;
  itemId: string; itemCode: string; itemName: string; unit: string; categoryName: string;
  fromLocationName: string; toLocationName: string;
  quantity: number; unitCost: number; unitSalePrice: number; totalAmount: number;
  studentId?: string; studentName: string; staffName: string;
  paymentStatus: string; issued: boolean; paymentDate?: string; paymentMethod?: string;
  createdBy: string;
  supplierId?: string; supplierName?: string;
}
export interface InventoryCategoryRow { id: string; name: string }

export interface ReportParams {
  students: Student[];
  classes: Class[];
  transactions: Transaction[];
  attendance: AttendanceRecord[];
  expenses: Expense[];
  staff: StaffMember[];
  teachingLogs: TeachingLog[];
  advances: SalaryAdvance[];
  salaries: MonthlySalary[];
  dailyCloses: DailyCloseRecord[];
  auditLogs: any[];
  systemParameters?: SystemParameter[];
  admissionLeads?: AdmissionLead[];
  enrollments?: Enrollment[];
  inventoryItems?: InventoryItemRow[];
  inventoryStocks?: InventoryStockRow[];
  inventoryMovements?: InventoryMovementRow[];
  inventoryCategories?: InventoryCategoryRow[];
  filters: {
    month?: string;
    startDate?: string;
    endDate?: string;
    classId?: string;
    studentId?: string;
    teacherId?: string;
    paymentMethod?: string;
    revenueCategory?: string;
    expenseCategory?: string;
    staffId?: string;
    classStatus?: string;
    reconciliationStatus?: string;
    searchQuery?: string;
    threshold?: number;
    itemId?: string;
    categoryId?: string;
    locationId?: string;
  };
}

const getStudentClassesStr = (student: Student, enrollList: Enrollment[]) => {
  const activeList = enrollList.filter(e => e.studentId === student.id && e.isActive).map(e => e.className);
  return activeList.length > 0 ? activeList.join(', ') : (student.className || 'Chưa xếp lớp');
};

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  type: 'summary' | 'detail' | 'object';
  filters: ('month' | 'dateRange' | 'class' | 'student' | 'teacher' | 'paymentMethod' | 'revenueCategory' | 'expenseCategory' | 'staff' | 'classStatus' | 'reconciliationStatus' | 'search' | 'invItem' | 'invCategory' | 'invLocation')[];
  columns: { key: string; label: string; align?: 'left' | 'right' | 'center'; format?: 'currency' | 'date' | 'number' | 'text' }[];
  compute: (params: ReportParams) => any[];
  implemented: boolean;
}

export const REPORT_GROUPS: { id: string; label: string; icon: string; reports: ReportDefinition[] }[] = [
  {
    id: 'grp_overview',
    label: 'Báo cáo tổng quan trung tâm',
    icon: '📊',
    reports: [
      {
        id: 'center_active_summary',
        implemented: true,
        name: 'Báo cáo tổng hợp hoạt động tháng',
        description: 'Tổng hợp số lớp, số học viên, sĩ số và chuyên cần trong tháng.',
        type: 'summary',
        filters: ['month'],
        columns: [
          { key: 'metric', label: 'Chỉ số', align: 'left', format: 'text' },
          { key: 'value', label: 'Số lượng / Tỷ lệ', align: 'right', format: 'text' },
          { key: 'desc', label: 'Mô tả', align: 'left', format: 'text' }
        ],
        compute: ({ students, classes, attendance, filters }) => {
          const m = filters.month || new Date().toISOString().slice(0, 7);
          const activeClasses = classes.filter(c => c.status === 'active' && c.type !== 'online');
          const activeStudents = students.filter(s => s.status === 'active');
          const avgSize = activeClasses.length > 0 ? (activeStudents.length / activeClasses.length).toFixed(1) : '0';
          const newStuds = students.filter(s => s.enrollDate?.startsWith(m)).length;
          const leftStuds = students.filter(s => 
            (s.status === 'left' || s.status === 'suspended') && 
            (s.updatedAt?.startsWith(m) || s.createdAt?.startsWith(m))
          ).length;

          // Chuyên cần trong tháng
          const monthlyAtt = attendance.filter(a => a.date?.startsWith(m));
          const total = monthlyAtt.length;
          const present = monthlyAtt.filter(a => a.status === 'present').length;
          const attRate = total > 0 ? `${Math.round((present / total) * 100)}%` : '—';

          return [
            { metric: 'Tổng số lớp học hoạt động', value: `${activeClasses.length} lớp`, desc: 'Lớp học trạng thái active, loại offline.' },
            { metric: 'Tổng số học viên đang học', value: `${activeStudents.length} học viên`, desc: 'Học viên trạng thái active.' },
            { metric: 'Sĩ số trung bình / lớp', value: `${avgSize} HV/lớp`, desc: 'Số học viên đang học chia số lớp offline.' },
            { metric: 'Số học viên mới nhập học', value: `${newStuds} học viên`, desc: 'Học viên đăng ký mới trong tháng.' },
            { metric: 'Số học viên nghỉ/tạm nghỉ', value: `${leftStuds} học viên`, desc: 'Học viên cập nhật trạng thái nghỉ/tạm nghỉ trong tháng.' },
            { metric: 'Tỷ lệ chuyên cần trung bình', value: attRate, desc: 'Số buổi có mặt chia tổng số buổi điểm danh.' }
          ];
        }
      },
      {
        id: 'center_finance_summary',
        implemented: true,
        name: 'Báo cáo tổng hợp tài chính tháng',
        description: 'Tổng hợp thu chi thực tế, chi phí lương và lợi nhuận thực tế trong tháng.',
        type: 'summary',
        filters: ['month'],
        columns: [
          { key: 'metric', label: 'Chỉ tiêu tài chính', align: 'left', format: 'text' },
          { key: 'amount', label: 'Số tiền', align: 'right', format: 'currency' },
          { key: 'desc', label: 'Mô tả ý nghĩa', align: 'left', format: 'text' }
        ],
        compute: ({ students, transactions, expenses, salaries, attendance, classes, enrollments = [], filters }) => {
          const m = filters.month || new Date().toISOString().slice(0, 7);
          
          // Doanh thu dòng tiền (Cash Collected)
          const totalIncome = transactions
            .filter(t => t.paymentDate?.startsWith(m) && t.revenueCategory !== 'Học phí online' && t.studyType !== 'Online' && t.paymentMethod !== 'Chuyển số dư')
            .reduce((sum, t) => sum + t.amount, 0);

          // Chi phí vận hành
          const opExpense = expenses
            .filter(e => e.date?.startsWith(m))
            .reduce((sum, e) => sum + e.amount, 0);

          // Chi phí nhân sự lương
          const payroll = salaries
            .filter(s => s.month === m)
            .reduce((sum, s) => sum + (s.netSalary || 0), 0);

          const totalExpense = opExpense + payroll;

          // Doanh thu thực
          const revSummary = computeRevenueSummary(students, transactions, attendance, m, classes, enrollments);
          const earnedTuition = revSummary.tuitionEarnedInPeriod;
          const otherRevenue = revSummary.otherRevenueCollectedInPeriod;
          const totalEarned = revSummary.totalEarnedRevenueInPeriod;

          return [
            { metric: '1. Tổng tiền thực thu (Cash)', amount: totalIncome, desc: 'Dòng tiền mặt & chuyển khoản thu trong tháng.' },
            { metric: '2. Chi phí vận hành trung tâm', amount: opExpense, desc: 'Mặt bằng, điện nước, marketing...' },
            { metric: '3. Lương còn thanh toán / Thực nhận', amount: payroll, desc: 'Tổng lương thực nhận của giáo viên & văn phòng trong tháng (sau thuế & tạm ứng).' },
            { metric: '4. Tổng tiền chi thực tế (2 + 3)', amount: totalExpense, desc: 'Tổng dòng tiền thực chi trong tháng. Dòng tiền lương đầy đủ, bao gồm tạm ứng và các khoản nộp thay, sẽ được chuẩn hóa ở PAY-05.' },
            { metric: '5. Doanh thu thực học phí (Earned Tuition)', amount: earnedTuition, desc: 'Số tiền tương ứng số buổi học sinh đã học thực tế.' },
            { metric: '6. Doanh thu thực khác', amount: otherRevenue, desc: 'Thu sách, đồng phục, lệ phí thi...' },
            { metric: '7. Tổng doanh thu thực tháng (5 + 6)', amount: totalEarned, desc: 'Tổng giá trị dịch vụ/hàng hóa đã cung cấp hoàn tất.' },
            { metric: '8. Lợi nhuận thực (Earned Profit) (7 - 4)', amount: totalEarned - totalExpense, desc: 'Doanh thu thực tế trừ chi phí thực tế.' },
            { metric: '9. Lợi nhuận theo dòng tiền (1 - 4)', amount: totalIncome - totalExpense, desc: 'Chênh lệch thu chi thực tế trong tháng.' }
          ];
        }
      },
      {
        id: 'center_student_class_detail',
        implemented: true,
        name: 'Báo cáo tổng hợp học viên/lớp học',
        description: 'Chi tiết quy mô lớp, giáo viên phụ trách, và sĩ số hoạt động.',
        type: 'detail',
        filters: ['classStatus'],
        columns: [
          { key: 'className', label: 'Tên lớp', align: 'left', format: 'text' },
          { key: 'type', label: 'Hình thức', align: 'center', format: 'text' },
          { key: 'teacher', label: 'Giáo viên', align: 'left', format: 'text' },
          { key: 'schedule', label: 'Lịch học', align: 'left', format: 'text' },
          { key: 'room', label: 'Phòng học', align: 'center', format: 'text' },
          { key: 'activeCount', label: 'Sĩ số hiện tại', align: 'right', format: 'number' },
          { key: 'maxStudents', label: 'Sĩ số tối đa', align: 'right', format: 'number' }
        ],
        compute: ({ classes, students, enrollments = [], filters }) => {
          const status = filters.classStatus || 'active';
          const filteredClasses = classes.filter(c => {
            if (c.type === 'online') return false; // offline-only
            if (status !== 'all' && c.status !== status) return false;
            return true;
          });

          return filteredClasses.map(c => {
            const count = students.filter(s => s.status === 'active' && enrollments.some(e => e.studentId === s.id && e.className === c.name && e.isActive)).length;
            return {
              className: c.name,
              type: c.type === 'offline' ? 'Trực tiếp' : c.type,
              teacher: c.teacher || 'Chưa phân công',
              schedule: c.schedule || '—',
              room: c.room || '—',
              activeCount: count,
              maxStudents: c.maxStudents || 0
            };
          });
        }
      },
      {
        id: 'center_tuition_unearned_detail',
        implemented: true,
        name: 'Báo cáo tổng hợp công nợ/học phí chưa thực hiện',
        description: 'Chi tiết số tiền chưa thực hiện và tổng công nợ học viên toàn trung tâm.',
        type: 'detail',
        filters: [],
        columns: [
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'studentCount', label: 'Số học viên', align: 'right', format: 'number' },
          { key: 'totalCollected', label: 'Tổng đã đóng lũy kế', align: 'right', format: 'currency' },
          { key: 'totalUsed', label: 'Học phí đã dùng', align: 'right', format: 'currency' },
          { key: 'unearned', label: 'Học phí chưa thực hiện', align: 'right', format: 'currency' },
          { key: 'debt', label: 'Nợ học phí (Âm tiền)', align: 'right', format: 'currency' }
        ],
        compute: ({ students, transactions, attendance, classes, enrollments = [] }) => {
          const classNames = classes.filter(c => c.type !== 'online').map(c => c.name);
          return classNames.map(clsName => {
            const classStuds = students.filter(s => enrollments.some(e => e.studentId === s.id && e.className === clsName && e.isActive));
            let totalCollected = 0;
            let totalUsed = 0;
            let unearned = 0;
            let debt = 0;

            classStuds.forEach(s => {
              const summary = computeTuitionSummary(s, transactions, attendance, enrollments);
              const activeClassesOfStudent = enrollments.filter(e => e.studentId === s.id && e.isActive).map(e => e.className);
              const primaryClass = activeClassesOfStudent[0] || s.className;

              const classCollected = transactions
                .filter(t =>
                  t.studentId === s.id &&
                  t.revenueCategory === 'Học phí offline' &&
                  t.studyType !== 'Online' &&
                  (t.className === clsName || (clsName === primaryClass && (!t.className || !activeClassesOfStudent.includes(t.className))))
                )
                .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

              const breakdown = summary.enrollmentBreakdown?.find(b => b.className === clsName);
              const classUsed = breakdown ? breakdown.costUsed : 0;
              const classRemaining = classCollected - classUsed;

              totalCollected += classCollected;
              totalUsed += classUsed;
              if (classRemaining >= 0) {
                unearned += classRemaining;
              } else {
                debt += Math.abs(classRemaining);
              }
            });

            return {
              className: clsName,
              studentCount: classStuds.length,
              totalCollected,
              totalUsed,
              unearned,
              debt
            };
          });
        }
      }
    ]
  },
  {
    id: 'grp_students',
    label: 'Báo cáo học viên',
    icon: '👤',
    reports: [
      {
        id: 'student_active_summary',
        implemented: true,
        name: 'Báo cáo danh sách học viên đang học',
        description: 'Danh sách học viên đang hoạt động tại trung tâm.',
        type: 'summary',
        filters: ['class', 'search'],
        columns: [
          { key: 'id', label: 'Mã học viên', align: 'left', format: 'text' },
          { key: 'name', label: 'Họ và tên', align: 'left', format: 'text' },
          { key: 'englishName', label: 'Tên tiếng Anh', align: 'left', format: 'text' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'enrollDate', label: 'Ngày nhập học', align: 'center', format: 'date' },
          { key: 'phone', label: 'SĐT Phụ huynh', align: 'center', format: 'text' }
        ],
        compute: ({ students, enrollments = [], filters }) => {
          return students
            .filter(s => {
              if (s.status !== 'active') return false;
              if (filters.classId) {
                const isEnrolled = enrollments.some(e => e.studentId === s.id && e.className === filters.classId && e.isActive);
                if (!isEnrolled) return false;
              }
              if (filters.searchQuery) {
                const q = filters.searchQuery.toLowerCase();
                return s.name.toLowerCase().includes(q) || (s.englishName || '').toLowerCase().includes(q) || s.parentPhone?.includes(q);
              }
              return true;
            })
            .map(s => ({
              id: s.id,
              name: s.name,
              englishName: s.englishName || '—',
              className: getStudentClassesStr(s, enrollments),
              enrollDate: s.enrollDate || '—',
              phone: s.parentPhone || '—'
            }));
        }
      },
      {
        id: 'student_new_detail',
        implemented: true,
        name: 'Báo cáo học viên mới',
        description: 'Danh sách học viên đăng ký mới trong khoảng thời gian chọn.',
        type: 'detail',
        filters: ['dateRange', 'search'],
        columns: [
          { key: 'name', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'className', label: 'Lớp xếp', align: 'left', format: 'text' },
          { key: 'enrollDate', label: 'Ngày nhập học', align: 'center', format: 'date' },
          { key: 'rate', label: 'Đơn giá/buổi', align: 'right', format: 'currency' },
          { key: 'phone', label: 'SĐT Phụ huynh', align: 'center', format: 'text' }
        ],
        compute: ({ students, enrollments = [], filters }) => {
          const start = filters.startDate;
          const end = filters.endDate;
          return students
            .filter(s => {
              if (!s.enrollDate) return false;
              if (start && s.enrollDate < start) return false;
              if (end && s.enrollDate > end) return false;
              if (filters.searchQuery) {
                const q = filters.searchQuery.toLowerCase();
                return s.name.toLowerCase().includes(q) || s.parentPhone?.includes(q);
              }
              return true;
            })
            .map(s => ({
              name: s.name,
              className: getStudentClassesStr(s, enrollments),
              enrollDate: s.enrollDate,
              rate: s.feePerSession || 0,
              phone: s.parentPhone || '—'
            }));
        }
      },
      {
        id: 'student_left_detail',
        implemented: true,
        name: 'Báo cáo học viên nghỉ học',
        description: 'Học viên đã nghỉ hẳn hoặc tạm nghỉ.',
        type: 'detail',
        filters: ['month', 'search'],
        columns: [
          { key: 'name', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'className', label: 'Lớp cũ', align: 'left', format: 'text' },
          { key: 'status', label: 'Trạng thái', align: 'center', format: 'text' },
          { key: 'date', label: 'Ngày cập nhật', align: 'center', format: 'date' },
          { key: 'notes', label: 'Lý do / Ghi chú', align: 'left', format: 'text' }
        ],
        compute: ({ students, enrollments = [], filters }) => {
          const m = filters.month;
          return students
            .filter(s => {
              if (s.status !== 'left' && s.status !== 'suspended') return false;
              const dateStr = s.updatedAt || s.createdAt;
              if (m && !dateStr?.startsWith(m)) return false;
              if (filters.searchQuery) {
                const q = filters.searchQuery.toLowerCase();
                return s.name.toLowerCase().includes(q) || s.parentPhone?.includes(q);
              }
              return true;
            })
            .map(s => ({
              name: s.name,
              className: getStudentClassesStr(s, enrollments),
              status: s.status === 'left' ? 'Đã nghỉ học' : 'Tạm nghỉ',
              date: (s.updatedAt || s.createdAt || '').slice(0, 10),
              notes: s.notes || '—'
            }));
        }
      },
      {
        id: 'student_near_end_detail',
        implemented: true,
        name: 'Báo cáo học viên sắp hết buổi',
        description: 'Học viên chỉ còn từ 1 đến 2 buổi học.',
        type: 'detail',
        filters: ['class', 'search'],
        columns: [
          { key: 'name', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'bought', label: 'Buổi đã mua', align: 'right', format: 'number' },
          { key: 'used', label: 'Buổi đã dùng', align: 'right', format: 'number' },
          { key: 'remaining', label: 'Buổi còn lại', align: 'right', format: 'number' }
        ],
        compute: ({ students, transactions, attendance, enrollments = [], filters, systemParameters }) => {
          const lowSessionsParam = systemParameters?.find(p => p.key === 'lowRemainingSessionsThreshold' && p.isActive);
          const lowSessionsVal = filters.threshold ? Number(filters.threshold) : (lowSessionsParam ? Number(lowSessionsParam.value) : 2);
          return students
            .filter(s => {
              if (s.status !== 'active') return false;
              if (filters.classId) {
                const isEnrolled = enrollments.some(e => e.studentId === s.id && e.className === filters.classId && e.isActive);
                if (!isEnrolled) return false;
              }
              if (filters.searchQuery) {
                const q = filters.searchQuery.toLowerCase();
                return s.name.toLowerCase().includes(q);
              }
              return true;
            })
            .map(s => {
              const summary = computeTuitionSummary(s, transactions, attendance, enrollments);
              return {
                name: s.name,
                className: getStudentClassesStr(s, enrollments),
                bought: summary.totalSessionsBought,
                used: summary.totalSessionsUsed,
                remaining: summary.sessionsRemaining
              };
            })
            .filter(row => row.remaining > 0 && row.remaining <= lowSessionsVal);
        }
      },
      {
        id: 'student_end_detail',
        implemented: true,
        name: 'Báo cáo học viên hết buổi',
        description: 'Học viên đã học hết 100% số buổi đã đóng tiền (buổi còn lại <= 0).',
        type: 'detail',
        filters: ['class', 'search'],
        columns: [
          { key: 'name', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'bought', label: 'Buổi đã mua', align: 'right', format: 'number' },
          { key: 'used', label: 'Buổi đã học', align: 'right', format: 'number' },
          { key: 'remaining', label: 'Buổi còn lại', align: 'right', format: 'number' }
        ],
        compute: ({ students, transactions, attendance, enrollments = [], filters }) => {
          return students
            .filter(s => {
              if (s.status !== 'active') return false;
              if (filters.classId) {
                const isEnrolled = enrollments.some(e => e.studentId === s.id && e.className === filters.classId && e.isActive);
                if (!isEnrolled) return false;
              }
              if (filters.searchQuery) {
                const q = filters.searchQuery.toLowerCase();
                return s.name.toLowerCase().includes(q);
              }
              return true;
            })
            .map(s => {
              const summary = computeTuitionSummary(s, transactions, attendance, enrollments);
              return {
                name: s.name,
                className: getStudentClassesStr(s, enrollments),
                bought: summary.totalSessionsBought,
                used: summary.totalSessionsUsed,
                remaining: summary.sessionsRemaining
              };
            })
            .filter(row => row.remaining === 0);
        }
      },
      {
        id: 'student_debt_detail',
        implemented: true,
        name: 'Báo cáo học viên âm học phí',
        description: 'Học viên có số dư học phí chưa thực hiện âm (học quá số tiền đóng).',
        type: 'detail',
        filters: ['class', 'search'],
        columns: [
          { key: 'name', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'totalPaid', label: 'Tiền đã đóng', align: 'right', format: 'currency' },
          { key: 'totalUsed', label: 'Giá trị đã học', align: 'right', format: 'currency' },
          { key: 'debt', label: 'Số tiền âm (Nợ)', align: 'right', format: 'currency' }
        ],
        compute: ({ students, transactions, attendance, enrollments = [], filters }) => {
          return students
            .filter(s => {
              if (s.status !== 'active') return false;
              if (filters.classId) {
                const isEnrolled = enrollments.some(e => e.studentId === s.id && e.className === filters.classId && e.isActive);
                if (!isEnrolled) return false;
              }
              if (filters.searchQuery) {
                const q = filters.searchQuery.toLowerCase();
                return s.name.toLowerCase().includes(q);
              }
              return true;
            })
            .map(s => {
              const summary = computeTuitionSummary(s, transactions, attendance, enrollments);
              return {
                name: s.name,
                className: getStudentClassesStr(s, enrollments),
                totalPaid: summary.totalPaidOffline,
                totalUsed: summary.totalCostUsed,
                debt: summary.moneyRemaining < 0 ? Math.abs(summary.moneyRemaining) : 0
              };
            })
            .filter(row => row.debt > 0);
        }
      },
      {
        id: 'student_absent_frequent',
        implemented: true,
        name: 'Báo cáo học viên vắng nhiều',
        description: 'Học viên vắng từ 2 buổi học liên tục gần nhất trở lên.',
        type: 'object',
        filters: ['class', 'search'],
        columns: [
          { key: 'name', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'consecutive', label: 'Số buổi vắng liên tục', align: 'right', format: 'number' },
          { key: 'lastDate', label: 'Buổi vắng gần nhất', align: 'center', format: 'date' },
          { key: 'phone', label: 'SĐT Phụ huynh', align: 'center', format: 'text' }
        ],
        compute: ({ students, attendance, enrollments = [], filters }) => {
          return students
            .filter(s => {
              if (s.status !== 'active') return false;
              if (filters.classId) {
                const isEnrolled = enrollments.some(e => e.studentId === s.id && e.className === filters.classId && e.isActive);
                if (!isEnrolled) return false;
              }
              if (filters.searchQuery) {
                return s.name.toLowerCase().includes(filters.searchQuery.toLowerCase());
              }
              return true;
            })
            .map(s => {
              const records = attendance
                .filter(a => a.studentId === s.id)
                .sort((a, b) => b.date.localeCompare(a.date));

              if (records.length < 2) return null;
              
              let consec = 0;
              for (const r of records) {
                if (r.status === 'absent' || r.status === 'excused') {
                  consec++;
                } else if (r.status === 'present') {
                  break;
                }
              }

              if (consec >= 2) {
                return {
                  name: s.name,
                  className: getStudentClassesStr(s, enrollments),
                  consecutive: consec,
                  lastDate: records[0].date,
                  phone: s.parentPhone || '—'
                };
              }
              return null;
            })
            .filter((x): x is NonNullable<typeof x> => x !== null);
        }
      },
      {
        id: 'student_no_attendance',
        implemented: true,
        name: 'Báo cáo học viên lâu chưa đi học',
        description: 'Học viên active nhưng không phát sinh điểm danh trong 14 ngày qua.',
        type: 'object',
        filters: ['class', 'search'],
        columns: [
          { key: 'name', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'lastAttDate', label: 'Ngày đi học gần nhất', align: 'center', format: 'date' },
          { key: 'daysInactive', label: 'Số ngày không học', align: 'right', format: 'number' },
          { key: 'phone', label: 'SĐT Phụ huynh', align: 'center', format: 'text' }
        ],
        compute: ({ students, attendance, enrollments = [], filters }) => {
          const date14Ago = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);
          return students
            .filter(s => {
              if (s.status !== 'active') return false;
              if (filters.classId) {
                const isEnrolled = enrollments.some(e => e.studentId === s.id && e.className === filters.classId && e.isActive);
                if (!isEnrolled) return false;
              }
              if (filters.searchQuery) {
                return s.name.toLowerCase().includes(filters.searchQuery.toLowerCase());
              }
              return true;
            })
            .map(s => {
              const studsAtt = attendance.filter(a => a.studentId === s.id);
              const hasRecent = studsAtt.some(a => a.date >= date14Ago);
              if (hasRecent) return null;

              const sorted = [...studsAtt].sort((a, b) => b.date.localeCompare(a.date));
              const latestDate = sorted.length > 0 ? sorted[0].date : null;
              
              let daysDiff = 999;
              if (latestDate) {
                const diffTime = Math.abs(new Date().getTime() - new Date(latestDate).getTime());
                daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              }

              return {
                name: s.name,
                className: getStudentClassesStr(s, enrollments),
                lastAttDate: latestDate || 'Chưa từng học',
                daysInactive: daysDiff,
                phone: s.parentPhone || '—'
              };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
            .sort((a, b) => b.daysInactive - a.daysInactive);
        }
      },
      {
        id: 'student_waiting_class_detail',
        implemented: true,
        name: 'Báo cáo danh sách học viên chờ xếp lớp',
        description: 'Danh sách các học viên đã tạo hồ sơ chính thức nhưng chưa được phân vào lớp học cụ thể.',
        type: 'detail',
        filters: ['search'],
        columns: [
          { key: 'id', label: 'Mã học viên', align: 'left', format: 'text' },
          { key: 'name', label: 'Họ và tên', align: 'left', format: 'text' },
          { key: 'parentPhone', label: 'SĐT Phụ huynh', align: 'center', format: 'text' },
          { key: 'enrollDate', label: 'Ngày nhập học', align: 'center', format: 'date' },
          { key: 'notes', label: 'Ghi chú', align: 'left', format: 'text' }
        ],
        compute: ({ students, enrollments = [], filters }) => {
          return students
            .filter(s => {
              // 1. Ưu tiên admissionStatus === 'waiting_class'
              // 2. Xét không có enrollment active hoặc className rỗng
              const hasActiveEnroll = enrollments.some(e => e.studentId === s.id && e.isActive);
              const isWaiting = s.admissionStatus === 'waiting_class' || 
                                !hasActiveEnroll ||
                                !s.className || 
                                s.className.trim() === '' || 
                                s.className === 'Chưa xếp lớp';
              if (!isWaiting) return false;
              if (filters.searchQuery) {
                const q = filters.searchQuery.toLowerCase();
                return s.name.toLowerCase().includes(q) || (s.parentPhone || '').includes(q);
              }
              return true;
            })
            .map(s => ({
              id: s.id,
              name: s.name,
              parentPhone: s.parentPhone || '—',
              enrollDate: s.enrollDate || '—',
              notes: s.notes || '—'
            }));
        }
      }
    ]
  },
  {
    id: 'grp_classes',
    label: 'Báo cáo lớp học & điểm danh',
    icon: '🏫',
    reports: [
      {
        id: 'class_list_summary',
        implemented: true,
        name: 'Báo cáo danh sách lớp học',
        description: 'Tổng hợp danh sách các lớp đang quản lý tại trung tâm.',
        type: 'summary',
        filters: ['teacher', 'classStatus'],
        columns: [
          { key: 'className', label: 'Lớp', align: 'left', format: 'text' },
          { key: 'type', label: 'Loại', align: 'center', format: 'text' },
          { key: 'schedule', label: 'Khung giờ', align: 'left', format: 'text' },
          { key: 'teacher', label: 'Giáo viên chính', align: 'left', format: 'text' },
          { key: 'activeCount', label: 'Học viên', align: 'right', format: 'number' },
          { key: 'maxStudents', label: 'Tối đa', align: 'right', format: 'number' },
          { key: 'status', label: 'Trạng thái', align: 'center', format: 'text' }
        ],
        compute: ({ classes, students, enrollments = [], filters }) => {
          return classes
            .filter(c => {
              if (c.type === 'online') return false; // offline-only
              if (filters.teacherId && c.teacherId !== filters.teacherId && c.teacher !== filters.teacherId) return false;
              if (filters.classStatus && filters.classStatus !== 'all' && c.status !== filters.classStatus) return false;
              return true;
            })
            .map(c => {
              const cnt = students.filter(s => s.status === 'active' && enrollments.some(e => e.studentId === s.id && e.className === c.name && e.isActive)).length;
              return {
                className: c.name,
                type: c.type === 'offline' ? 'Offline' : c.type,
                schedule: c.schedule || '—',
                teacher: c.teacher || 'Chưa phân công',
                activeCount: cnt,
                maxStudents: c.maxStudents || 0,
                status: c.status === 'active' ? 'Đang dạy' : c.status === 'suspended' ? 'Tạm dừng' : 'Đã kết thúc'
              };
            });
        }
      },
      {
        id: 'attendance_by_date_detail',
        implemented: true,
        name: 'Báo cáo điểm danh theo ngày',
        description: 'Chi tiết thông tin đi học / vắng của học viên trong khoảng thời gian.',
        type: 'detail',
        filters: ['dateRange', 'class', 'search'],
        columns: [
          { key: 'date', label: 'Ngày', align: 'center', format: 'date' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'studentName', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'status', label: 'Điểm danh', align: 'center', format: 'text' },
          { key: 'sessions', label: 'Buổi trừ', align: 'right', format: 'number' },
          { key: 'note', label: 'Lý do vắng', align: 'left', format: 'text' }
        ],
        compute: ({ attendance, filters }) => {
          const start = filters.startDate;
          const end = filters.endDate;
          return attendance
            .filter(a => {
              if (start && a.date < start) return false;
              if (end && a.date > end) return false;
              if (filters.classId && a.classId !== filters.classId && a.className !== filters.classId) return false;
              if (filters.searchQuery) {
                return a.studentName.toLowerCase().includes(filters.searchQuery.toLowerCase());
              }
              return true;
            })
            .map(a => ({
              date: a.date,
              className: a.className,
              studentName: a.studentName,
              status: a.status === 'present' ? 'Có mặt' : a.status === 'absent' ? 'Vắng không phép' : 'Có phép',
              sessions: a.sessionsDeducted || 0,
              note: a.note || '—'
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
        }
      },
      {
        id: 'attendance_by_class_detail',
        implemented: true,
        name: 'Báo cáo điểm danh theo lớp',
        description: 'Thống kê tổng hợp số buổi học và chuyên cần của học viên trong lớp học.',
        type: 'detail',
        filters: ['class', 'dateRange', 'search'],
        columns: [
          { key: 'studentName', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'total', label: 'Tổng số buổi', align: 'right', format: 'number' },
          { key: 'present', label: 'Có mặt', align: 'right', format: 'number' },
          { key: 'absent', label: 'Vắng ko phép', align: 'right', format: 'number' },
          { key: 'excused', label: 'Vắng có phép', align: 'right', format: 'number' },
          { key: 'rate', label: 'Tỷ lệ chuyên cần', align: 'right', format: 'text' }
        ],
        compute: ({ students, attendance, enrollments = [], filters }) => {
          const targetClass = filters.classId;
          if (!targetClass) return [];
          const start = filters.startDate;
          const end = filters.endDate;
          return students
            .filter(s => enrollments.some(e => e.studentId === s.id && e.className === targetClass && e.isActive) && (filters.searchQuery ? s.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) : true))
            .map(s => {
              const classAtt = attendance.filter(a => {
                if (a.studentId !== s.id || a.className !== targetClass) return false;
                if (start && a.date < start) return false;
                if (end && a.date > end) return false;
                return true;
              });
              const total = classAtt.length;
              const present = classAtt.filter(a => a.status === 'present').length;
              const absent = classAtt.filter(a => a.status === 'absent').length;
              const excused = classAtt.filter(a => a.status === 'excused').length;
              const rate = total > 0 ? `${Math.round((present / total) * 100)}%` : '—';
              return {
                studentName: s.name,
                className: targetClass,
                total,
                present,
                absent,
                excused,
                rate
              };
            });
        }
      },
      {
        id: 'attendance_rate_detail',
        implemented: true,
        name: 'Báo cáo chuyên cần học viên',
        description: 'Xem xếp hạng chuyên cần của tất cả học viên.',
        type: 'detail',
        filters: ['class', 'search'],
        columns: [
          { key: 'name', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'total', label: 'Số buổi điểm danh', align: 'right', format: 'number' },
          { key: 'present', label: 'Số buổi đi học', align: 'right', format: 'number' },
          { key: 'rateValue', label: 'Tỷ lệ chuyên cần', align: 'right', format: 'number' }
        ],
        compute: ({ students, attendance, enrollments = [], filters }) => {
          return students
            .filter(s => {
              if (s.status !== 'active') return false;
              if (filters.classId) {
                const isEnrolled = enrollments.some(e => e.studentId === s.id && e.className === filters.classId && e.isActive);
                if (!isEnrolled) return false;
              }
              if (filters.searchQuery) return s.name.toLowerCase().includes(filters.searchQuery.toLowerCase());
              return true;
            })
            .map(s => {
              const studsAtt = attendance.filter(a => a.studentId === s.id);
              const total = studsAtt.length;
              const present = studsAtt.filter(a => a.status === 'present').length;
              const rate = total > 0 ? Math.round((present / total) * 100) : 0;
              return {
                name: s.name,
                className: getStudentClassesStr(s, enrollments),
                total,
                present,
                rateValue: rate
              };
            })
            .filter(row => row.total > 0)
            .sort((a, b) => b.rateValue - a.rateValue);
        }
      },
      {
        id: 'attendance_sessions_used',
        implemented: true,
        name: 'Báo cáo số buổi đã học',
        description: 'Thống kê tổng số buổi đã sử dụng (gồm có mặt & vắng không phép) của học viên.',
        type: 'object',
        filters: ['class', 'student'],
        columns: [
          { key: 'studentName', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'sessionsUsed', label: 'Buổi đã học (Trừ phí)', align: 'right', format: 'number' },
          { key: 'present', label: 'Số buổi đi học', align: 'right', format: 'number' },
          { key: 'absent', label: 'Số buổi vắng ko phép', align: 'right', format: 'number' }
        ],
        compute: ({ students, attendance, filters }) => {
          return students
            .filter(s => {
              if (filters.classId && s.className !== filters.classId) return false;
              if (filters.studentId && s.id !== filters.studentId) return false;
              return true;
            })
            .map(s => {
              const classAtt = attendance.filter(a => a.studentId === s.id);
              const present = classAtt.filter(a => a.status === 'present').length;
              const absent = classAtt.filter(a => a.status === 'absent').length;
              return {
                studentName: s.name,
                className: s.className || '—',
                sessionsUsed: present + absent,
                present,
                absent
              };
            });
        }
      },
      {
        id: 'student_attendance_detail_ledger',
        implemented: true,
        name: 'Báo cáo chuyên cần & học phí chi tiết học viên',
        description: 'Bảng tổng hợp chi tiết lịch học, ngày học, ngày nghỉ có phép/không phép, số buổi đã đóng, và số buổi còn lại của học viên được chọn.',
        type: 'object',
        filters: ['student'],
        columns: [
          { key: 'date', label: 'Ngày', align: 'center', format: 'date' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'status', label: 'Trạng thái / Nội dung', align: 'left', format: 'text' },
          { key: 'sessionsAdded', label: 'Số buổi đóng', align: 'right', format: 'number' },
          { key: 'sessionsDeducted', label: 'Số buổi trừ', align: 'right', format: 'number' },
          { key: 'runningPaid', label: 'Buổi đã đóng (lũy kế)', align: 'right', format: 'number' },
          { key: 'runningRemaining', label: 'Buổi còn lại', align: 'right', format: 'number' },
          { key: 'note', label: 'Ghi chú', align: 'left', format: 'text' }
        ],
        compute: ({ students, transactions, attendance, filters }) => {
          const targetStud = filters.studentId;
          if (!targetStud) return [];
          const student = students.find(s => s.id === targetStud);
          if (!student) return [];

          const feePerSession = Number(student.feePerSession) || 0;
          const feeHistory = student.feeHistory || [];

          // 1. Get transactions (Học phí offline)
          const studTxs = transactions.filter(t => 
            t.studentId === targetStud && 
            t.revenueCategory === 'Học phí offline' && 
            t.studyType !== 'Online'
          );

          // 2. Get attendance records
          const studAtt = attendance.filter(a => a.studentId === targetStud);

          // 3. Combine and sort
          const events: any[] = [];
          
          studTxs.forEach(t => {
            events.push({
              date: t.paymentDate,
              type: 'tx',
              amount: t.amount,
              className: t.className || '',
              term: t.term || '',
              notes: t.notes || '',
              raw: t
            });
          });

          studAtt.forEach(a => {
            events.push({
              date: a.date,
              type: 'att',
              status: a.status,
              className: a.className || '',
              sessionsDeducted: a.status === 'excused' ? 0 : 1,
              note: a.note || '',
              raw: a
            });
          });

          events.sort((a, b) => {
            const cmp = a.date.localeCompare(b.date);
            if (cmp !== 0) return cmp;
            if (a.type === 'tx' && b.type === 'att') return -1;
            if (a.type === 'att' && b.type === 'tx') return 1;
            return 0;
          });

          // 4. Calculate running balances
          let runningPaid = 0;
          let runningRemaining = 0;
          const rows: any[] = [];

          events.forEach(ev => {
            if (ev.type === 'tx') {
              const fee = getFeeAtDate(ev.date, feePerSession, feeHistory) || 1;
              const sessionsAdded = feePerSession > 0 ? Math.round(ev.amount / fee) : 0;
              runningPaid += sessionsAdded;
              runningRemaining += sessionsAdded;

              const amountFormatted = ev.amount.toLocaleString('vi-VN') + ' đ';

              rows.push({
                date: ev.date,
                className: ev.className || '—',
                status: `Đóng phí (+${amountFormatted})`,
                sessionsAdded,
                sessionsDeducted: 0,
                runningPaid,
                runningRemaining,
                note: ev.term ? `Kỳ đóng phí: ${ev.term}. ${ev.notes}` : ev.notes || '—'
              });
            } else {
              const sessionsDeducted = ev.sessionsDeducted;
              runningRemaining -= sessionsDeducted;

              let statusText = '';
              if (ev.status === 'present') {
                statusText = 'Có mặt';
              } else if (ev.status === 'absent') {
                statusText = 'Vắng không phép';
              } else if (ev.status === 'excused') {
                statusText = 'Nghỉ có phép';
              } else {
                statusText = ev.status;
              }

              rows.push({
                date: ev.date,
                className: ev.className || '—',
                status: statusText,
                sessionsAdded: 0,
                sessionsDeducted,
                runningPaid,
                runningRemaining,
                note: ev.note || '—'
              });
            }
          });

          return rows;
        }
      },
      {
        id: 'class_unattended_detail',
        implemented: true,
        name: 'Báo cáo lớp chưa điểm danh',
        description: 'Lớp có lịch học nhưng chưa thực hiện điểm danh.',
        type: 'object',
        filters: ['dateRange'],
        columns: [
          { key: 'dateStr', label: 'Ngày học', align: 'center', format: 'date' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'teacher', label: 'Giáo viên phụ trách', align: 'left', format: 'text' },
          { key: 'schedule', label: 'Khung giờ học', align: 'left', format: 'text' }
        ],
        compute: ({ classes, attendance, filters }) => {
          const start = filters.startDate || formatDateKey(new Date());
          const end = filters.endDate || formatDateKey(new Date());

          const startD = new Date(start);
          const endD = new Date(end);
          const list: any[] = [];

          const VIET_DAY_MAP: Record<number, string[]> = {
            0: ['cn', 'chủ nhật'],
            1: ['thứ 2', 't2', 'thứ hai'],
            2: ['thứ 3', 't3', 'thứ ba'],
            3: ['thứ 4', 't4', 'thứ tư'],
            4: ['thứ 5', 't5', 'thứ năm'],
            5: ['thứ 6', 't6', 'thứ sáu'],
            6: ['thứ 7', 't7', 'thứ bảy'],
          };

          for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
            const dateStr = formatDateKey(d);
            const dayOfWeek = d.getDay();
            const dayNames = VIET_DAY_MAP[dayOfWeek] || [];

            classes.forEach(cls => {
              if (cls.status !== 'active' || cls.type === 'online') return;
              const days = cls.scheduleDays || [];
              const hasDay = days.some(day => dayNames.some(tn => day.toLowerCase().includes(tn)));
              if (hasDay) {
                const attended = attendance.some(a => a.date === dateStr && (a.classId === cls.id || a.className === cls.name || a.classId === cls.name));
                if (!attended) {
                  list.push({
                    dateStr,
                    className: cls.name,
                    teacher: cls.teacher || 'Chưa rõ',
                    schedule: cls.scheduleTime || cls.schedule
                  });
                }
              }
            });
          }
          return list.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
        }
      },
      {
        id: 'class_waiting_open_detail',
        implemented: true,
        name: 'Báo cáo danh sách lớp chờ mở',
        description: 'Danh sách các lớp học đã thiết lập cấu hình nhưng chưa có học viên, chưa có buổi học hoặc chưa xác nhận trạng thái.',
        type: 'detail',
        filters: ['search'],
        columns: [
          { key: 'className', label: 'Tên lớp', align: 'left', format: 'text' },
          { key: 'teacher', label: 'Giáo viên', align: 'left', format: 'text' },
          { key: 'schedule', label: 'Lịch học', align: 'left', format: 'text' },
          { key: 'defaultFee', label: 'Học phí mặc định', align: 'right', format: 'currency' },
          { key: 'studentCount', label: 'Sĩ số', align: 'right', format: 'number' },
          { key: 'note', label: 'Ghi chú vận hành', align: 'left', format: 'text' }
        ],
        compute: ({ classes, students, attendance, enrollments = [], filters }) => {
          return classes
            .filter(c => {
              if (c.status === 'ended') return false;
              
              const activeCount = students.filter(s => s.status === 'active' && enrollments.some(e => e.studentId === s.id && e.className === c.name && e.isActive)).length;
              const hasAttendance = attendance.some(a => a.className === c.name || a.classId === c.id);
              
              // Tiêu chí lớp chờ mở:
              // 1. Chưa có học viên
              // 2. Hoặc chưa có buổi điểm danh nào
              // 3. Hoặc trạng thái rỗng/không hoạt động/không xác định
              const statusStr = c.status as string;
              const isWaitingOpen = !statusStr || 
                                    statusStr === 'pending' || 
                                    statusStr === 'waiting' || 
                                    activeCount === 0 || 
                                    !hasAttendance;
              
              // Tránh nhầm lẫn với lớp đang hoạt động bình thường
              if (c.status === 'active' && activeCount > 0 && hasAttendance) {
                return false;
              }
              
              if (filters.searchQuery) {
                const q = filters.searchQuery.toLowerCase();
                return c.name.toLowerCase().includes(q) || (c.teacher || '').toLowerCase().includes(q);
              }
              return true;
            })
            .map(c => {
              const activeCount = students.filter(s => s.status === 'active' && enrollments.some(e => e.studentId === s.id && e.className === c.name && e.isActive)).length;
              const hasAttendance = attendance.some(a => a.className === c.name || a.classId === c.id);
              
              let operNote = '';
              if (!c.status) {
                operNote = 'Cần xác nhận trạng thái lớp';
              } else if (activeCount === 0) {
                operNote = 'Chưa có học viên';
              } else if (!hasAttendance) {
                operNote = 'Chưa có buổi học nào';
              } else {
                operNote = `Trạng thái: ${c.status}`;
              }
              
              return {
                className: c.name,
                teacher: c.teacher || 'Chưa phân công',
                schedule: c.schedule || '—',
                defaultFee: c.defaultFee || 0,
                studentCount: activeCount,
                note: operNote
              };
            });
        }
      }
    ]
  },
  {
    id: 'grp_tuition',
    label: 'Báo cáo học phí & công nợ',
    icon: '💰',
    reports: [
      {
        id: 'tuition_collected_summary',
        implemented: true,
        name: 'Báo cáo học phí đã thu',
        description: 'Danh sách các khoản đóng học phí offline thực tế từ học viên.',
        type: 'summary',
        filters: ['dateRange', 'paymentMethod', 'search', 'class', 'student'],
        columns: [
          { key: 'date', label: 'Ngày thu', align: 'center', format: 'date' },
          { key: 'studentName', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'term', label: 'Kỳ học', align: 'left', format: 'text' },
          { key: 'amount', label: 'Số tiền đóng', align: 'right', format: 'currency' },
          { key: 'method', label: 'Hình thức', align: 'center', format: 'text' }
        ],
        compute: ({ transactions, filters }) => {
          return transactions
            .filter(t => {
              if (t.revenueCategory !== 'Học phí offline' || t.studyType === 'Online') return false;
              if (t.paymentMethod === 'Chuyển số dư') return false; // Loại bỏ các khoản chuyển đổi số dư nội bộ
              if (filters.startDate && t.paymentDate < filters.startDate) return false;
              if (filters.endDate && t.paymentDate > filters.endDate) return false;
              if (filters.paymentMethod && t.paymentMethod !== filters.paymentMethod) return false;
              if (filters.classId && t.className !== filters.classId) return false;
              if (filters.studentId && t.studentId !== filters.studentId) return false;
              if (filters.searchQuery) {
                return t.studentName.toLowerCase().includes(filters.searchQuery.toLowerCase());
              }
              return true;
            })
            .map(t => ({
              date: t.paymentDate,
              studentName: t.studentName,
              className: t.className,
              term: t.term || '—',
              amount: t.amount,
              method: t.paymentMethod
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
        }
      },
      {
        id: 'tuition_unearned_summary',
        implemented: true,
        name: 'Báo cáo học phí chưa thực hiện',
        description: 'Thống kê số dư học phí chưa dạy lũy kế của từng học viên.',
        type: 'summary',
        filters: ['class', 'search'],
        columns: [
          { key: 'studentName', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'collected', label: 'Học phí đã thu lũy kế', align: 'right', format: 'currency' },
          { key: 'used', label: 'Giá trị đã học lũy kế', align: 'right', format: 'currency' },
          { key: 'unearned', label: 'Học phí chưa thực hiện', align: 'right', format: 'currency' }
        ],
        compute: ({ students, transactions, attendance, enrollments = [], filters }) => {
          return students
            .filter(s => {
              if (s.status !== 'active') return false;
              if (filters.classId) {
                const isEnrolled = enrollments.some(e => e.studentId === s.id && e.className === filters.classId && e.isActive);
                if (!isEnrolled) return false;
              }
              if (filters.searchQuery) return s.name.toLowerCase().includes(filters.searchQuery.toLowerCase());
              return true;
            })
            .map(s => {
              const summary = computeTuitionSummary(s, transactions, attendance, enrollments);
              return {
                studentName: s.name,
                className: getStudentClassesStr(s, enrollments),
                collected: summary.totalPaidOffline,
                used: summary.totalCostUsed,
                unearned: Math.max(0, summary.moneyRemaining)
              };
            })
            .filter(row => row.unearned > 0);
        }
      },
      {
        id: 'tuition_debt_summary',
        implemented: true,
        name: 'Báo cáo công nợ học viên',
        description: 'Chi tiết các học viên đang có nợ học phí âm tiền.',
        type: 'detail',
        filters: ['class', 'search'],
        columns: [
          { key: 'studentName', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'collected', label: 'Tổng đóng lũy kế', align: 'right', format: 'currency' },
          { key: 'used', label: 'Tổng học lũy kế', align: 'right', format: 'currency' },
          { key: 'debt', label: 'Số tiền nợ (VND)', align: 'right', format: 'currency' }
        ],
        compute: ({ students, transactions, attendance, enrollments = [], filters }) => {
          return students
            .filter(s => {
              if (s.status !== 'active') return false;
              if (filters.classId) {
                const isEnrolled = enrollments.some(e => e.studentId === s.id && e.className === filters.classId && e.isActive);
                if (!isEnrolled) return false;
              }
              if (filters.searchQuery) return s.name.toLowerCase().includes(filters.searchQuery.toLowerCase());
              return true;
            })
            .map(s => {
              const summary = computeTuitionSummary(s, transactions, attendance, enrollments);
              return {
                studentName: s.name,
                className: getStudentClassesStr(s, enrollments),
                collected: summary.totalPaidOffline,
                used: summary.totalCostUsed,
                debt: summary.moneyRemaining < 0 ? Math.abs(summary.moneyRemaining) : 0
              };
            })
            .filter(row => row.debt > 0);
        }
      },
      {
        id: 'tuition_payment_history',
        implemented: true,
        name: 'Báo cáo lịch sử đóng học phí',
        description: 'Chi tiết toàn bộ các lần đóng học phí của học viên được chọn.',
        type: 'detail',
        filters: ['student'],
        columns: [
          { key: 'date', label: 'Ngày đóng', align: 'center', format: 'date' },
          { key: 'term', label: 'Kỳ học', align: 'left', format: 'text' },
          { key: 'category', label: 'Nội dung', align: 'left', format: 'text' },
          { key: 'amount', label: 'Số tiền', align: 'right', format: 'currency' },
          { key: 'method', label: 'Phương thức', align: 'center', format: 'text' },
          { key: 'reconciled', label: 'Đối chiếu', align: 'center', format: 'text' },
          { key: 'invoiced', label: 'Xuất hóa đơn', align: 'center', format: 'text' }
        ],
        compute: ({ transactions, filters }) => {
          const targetStud = filters.studentId;
          if (!targetStud) return [];
          return transactions
            .filter(t => t.studentId === targetStud && t.revenueCategory === 'Học phí offline')
            .map(t => ({
              date: t.paymentDate,
              term: t.term || '—',
              category: t.revenueCategory,
              amount: t.amount,
              method: t.paymentMethod,
              reconciled: t.isReconciled ? 'Đã khớp' : 'Chưa',
              invoiced: t.isInvoiced ? 'Đã xuất' : 'Chưa'
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
        }
      },
      {
        id: 'tuition_sessions_remaining',
        implemented: true,
        name: 'Báo cáo số buổi còn lại',
        description: 'Chi tiết số buổi học còn lại của học viên tính theo đơn giá lớp hiện tại.',
        type: 'object',
        filters: ['class', 'search'],
        columns: [
          { key: 'studentName', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'rate', label: 'Học phí/buổi', align: 'right', format: 'currency' },
          { key: 'moneyRemaining', label: 'Số dư học phí', align: 'right', format: 'currency' },
          { key: 'remaining', label: 'Buổi còn lại', align: 'right', format: 'number' }
        ],
        compute: ({ students, transactions, attendance, enrollments = [], filters }) => {
          return students
            .filter(s => {
              if (s.status !== 'active') return false;
              if (filters.classId) {
                const isEnrolled = enrollments.some(e => e.studentId === s.id && e.className === filters.classId && e.isActive);
                if (!isEnrolled) return false;
              }
              if (filters.searchQuery) return s.name.toLowerCase().includes(filters.searchQuery.toLowerCase());
              return true;
            })
            .map(s => {
              const summary = computeTuitionSummary(s, transactions, attendance, enrollments);
              return {
                studentName: s.name,
                className: getStudentClassesStr(s, enrollments),
                rate: (() => {
                  if (filters.classId) {
                    const match = enrollments.find(e => e.studentId === s.id && e.className === filters.classId && e.isActive);
                    if (match) return match.feePerSession;
                  }
                  return s.feePerSession || 0;
                })(),
                moneyRemaining: summary.moneyRemaining,
                remaining: summary.sessionsRemaining
              };
            });
        }
      },
      {
        id: 'tuition_by_class',
        implemented: true,
        name: 'Báo cáo học phí theo lớp',
        description: 'Tổng thu, đã thực hiện, chưa thực hiện và công nợ nhóm theo lớp học.',
        type: 'object',
        filters: ['class'],
        columns: [
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'totalCollected', label: 'Tổng thu lũy kế', align: 'right', format: 'currency' },
          { key: 'totalUsed', label: 'Đã thực hiện', align: 'right', format: 'currency' },
          { key: 'unearned', label: 'Chưa thực hiện', align: 'right', format: 'currency' },
          { key: 'debt', label: 'Tổng nợ (Âm)', align: 'right', format: 'currency' }
        ],
        compute: ({ students, transactions, attendance, classes, enrollments = [], filters }) => {
          const classNames = filters.classId ? [filters.classId] : classes.filter(c => c.type !== 'online').map(c => c.name);
          return classNames.map(clsName => {
            const classStuds = students.filter(s => enrollments.some(e => e.studentId === s.id && e.className === clsName && e.isActive));
            let totalCollected = 0;
            let totalUsed = 0;
            let unearned = 0;
            let debt = 0;

            classStuds.forEach(s => {
              const summary = computeTuitionSummary(s, transactions, attendance, enrollments);
              const activeClassesOfStudent = enrollments.filter(e => e.studentId === s.id && e.isActive).map(e => e.className);
              const primaryClass = activeClassesOfStudent[0] || s.className;

              const classCollected = transactions
                .filter(t =>
                  t.studentId === s.id &&
                  t.revenueCategory === 'Học phí offline' &&
                  t.studyType !== 'Online' &&
                  (t.className === clsName || (clsName === primaryClass && (!t.className || !activeClassesOfStudent.includes(t.className))))
                )
                .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

              const breakdown = summary.enrollmentBreakdown?.find(b => b.className === clsName);
              const classUsed = breakdown ? breakdown.costUsed : 0;
              const classRemaining = classCollected - classUsed;

              totalCollected += classCollected;
              totalUsed += classUsed;
              if (classRemaining >= 0) {
                unearned += classRemaining;
              } else {
                debt += Math.abs(classRemaining);
              }
            });

            return {
              className: clsName,
              totalCollected,
              totalUsed,
              unearned,
              debt
            };
          });
        }
      },
      {
        id: 'tuition_by_student',
        implemented: true,
        name: 'Báo cáo học phí theo học viên',
        description: 'Xem chi tiết số liệu tài chính của từng học viên.',
        type: 'object',
        filters: ['student'],
        columns: [
          { key: 'studentName', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'collected', label: 'Đã đóng offline', align: 'right', format: 'currency' },
          { key: 'used', label: 'Đã học thực tế', align: 'right', format: 'currency' },
          { key: 'remaining', label: 'Số dư học phí', align: 'right', format: 'currency' },
          { key: 'sessions', label: 'Buổi còn lại', align: 'right', format: 'number' }
        ],
        compute: ({ students, transactions, attendance, enrollments = [], filters }) => {
          const targetStud = filters.studentId;
          if (!targetStud) return [];
          const s = students.find(x => x.id === targetStud);
          if (!s) return [];
          const summary = computeTuitionSummary(s, transactions, attendance, enrollments);
          return [{
            studentName: s.name,
            className: getStudentClassesStr(s, enrollments),
            collected: summary.totalPaidOffline,
            used: summary.totalCostUsed,
            remaining: summary.moneyRemaining,
            sessions: summary.sessionsRemaining
          }];
        }
      }
    ]
  },
  {
    id: 'grp_finance',
    label: 'Báo cáo thu chi & lợi nhuận',
    icon: '📈',
    reports: [
      {
        id: 'pnl_monthly_summary',
        implemented: true,
        name: 'Báo cáo lợi nhuận thực tế (P&L)',
        description: 'Tài chính lãi lỗ hàng tháng dựa trên doanh thu thực (earned) và chi phí thực.',
        type: 'summary',
        filters: ['month'],
        columns: [
          { key: 'item', label: 'Chỉ tiêu tài chính', align: 'left', format: 'text' },
          { key: 'amount', label: 'Số tiền', align: 'right', format: 'currency' },
          { key: 'ratio', label: 'Tỷ lệ %', align: 'right', format: 'text' }
        ],
        compute: ({ students, transactions, expenses, salaries, attendance, classes, filters }) => {
          const m = filters.month || new Date().toISOString().slice(0, 7);

          const revSummary = computeRevenueSummary(students, transactions, attendance, m, classes);
          const earnedTuition = revSummary.tuitionEarnedInPeriod;
          const otherRevenue = revSummary.otherRevenueCollectedInPeriod;
          const totalRevenue = revSummary.totalEarnedRevenueInPeriod;

          const opExpense = expenses.filter(e => e.date?.startsWith(m)).reduce((sum, e) => sum + e.amount, 0);
          const payroll = salaries.filter(s => s.month === m).reduce((sum, s) => sum + (s.grossSalary || 0), 0);
          const totalCost = opExpense + payroll;

          const profit = totalRevenue - totalCost;
          const getRatio = (val: number) => totalRevenue > 0 ? `${Math.round((val / totalRevenue) * 100)}%` : '—';

          return [
            { item: 'A. TỔNG DOANH THU THỰC TẾ (1 + 2)', amount: totalRevenue, ratio: '100%' },
            { item: '  1. Doanh thu thực học phí (Earned Tuition)', amount: earnedTuition, ratio: getRatio(earnedTuition) },
            { item: '  2. Doanh thu thực khác (Sách/Đồng phục...)', amount: otherRevenue, ratio: getRatio(otherRevenue) },
            { item: 'B. TỔNG CHI PHÍ THỰC TẾ (3 + 4)', amount: totalCost, ratio: getRatio(totalCost) },
            { item: '  3. Chi phí vận hành trung tâm', amount: opExpense, ratio: getRatio(opExpense) },
            { item: '  4. Chi phí lương phát sinh / payrollCost', amount: payroll, ratio: getRatio(payroll) },
            { item: 'C. LỢI NHUẬN THỰC TẾ (A - B)', amount: profit, ratio: getRatio(profit) }
          ];
        }
      },
      {
        id: 'cash_income_detail',
        implemented: true,
        name: 'Báo cáo tiền đã thu',
        description: 'Chi tiết tất cả các khoản thu phát sinh của trung tâm.',
        type: 'detail',
        filters: ['dateRange', 'paymentMethod', 'search'],
        columns: [
          { key: 'date', label: 'Ngày thu', align: 'center', format: 'date' },
          { key: 'studentName', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'category', label: 'Loại khoản thu', align: 'left', format: 'text' },
          { key: 'amount', label: 'Số tiền', align: 'right', format: 'currency' },
          { key: 'method', label: 'Hình thức', align: 'center', format: 'text' },
          { key: 'sender', label: 'Người gửi/Chuyển', align: 'left', format: 'text' },
          { key: 'notes', label: 'Ghi chú', align: 'left', format: 'text' }
        ],
        compute: ({ transactions, filters }) => {
          return transactions
            .filter(t => {
              if (t.studyType === 'Online' || t.revenueCategory === 'Học phí online') return false; // offline-only
              if (t.paymentMethod === 'Chuyển số dư') return false; // Loại bỏ các khoản chuyển đổi số dư nội bộ
              if (filters.startDate && t.paymentDate < filters.startDate) return false;
              if (filters.endDate && t.paymentDate > filters.endDate) return false;
              if (filters.paymentMethod && t.paymentMethod !== filters.paymentMethod) return false;
              if (filters.searchQuery) {
                return t.studentName.toLowerCase().includes(filters.searchQuery.toLowerCase()) || (t.notes || '').toLowerCase().includes(filters.searchQuery.toLowerCase());
              }
              return true;
            })
            .map(t => ({
              date: t.paymentDate,
              studentName: t.studentName || '—',
              category: t.revenueCategory,
              amount: t.amount,
              method: t.paymentMethod,
              sender: t.senderName || '—',
              notes: t.notes || '—'
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
        }
      },
      {
        id: 'earned_tuition_detail',
        implemented: true,
        name: 'Báo cáo doanh thu thực học phí',
        description: 'Chi tiết doanh thu thực học phí ghi nhận từ điểm danh theo ngày.',
        type: 'detail',
        filters: ['dateRange', 'class', 'search'],
        columns: [
          { key: 'date', label: 'Ngày dạy học', align: 'center', format: 'date' },
          { key: 'studentName', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'status', label: 'Điểm danh', align: 'center', format: 'text' },
          { key: 'rate', label: 'Đơn giá buổi', align: 'right', format: 'currency' },
          { key: 'earned', label: 'Doanh thu ghi nhận', align: 'right', format: 'currency' }
        ],
        compute: ({ attendance, students, enrollments = [], filters }) => {
          const start = filters.startDate;
          const end = filters.endDate;
          const studentMap = new Map<string, Student>();
          students.forEach(s => studentMap.set(s.id, s));

          return attendance
            .filter(a => {
              if (a.status !== 'present' && a.status !== 'absent') return false;
              if (start && a.date < start) return false;
              if (end && a.date > end) return false;
              if (filters.classId && a.classId !== filters.classId && a.className !== filters.classId) return false;
              if (filters.searchQuery) return a.studentName.toLowerCase().includes(filters.searchQuery.toLowerCase());
              return true;
            })
            .map(a => {
              const student = studentMap.get(a.studentId);
              let rate = 0;
              if (student) {
                const studentEnrollments = enrollments.filter(e => e.studentId === student.id);
                const match = studentEnrollments.find(e => {
                  if (e.className !== a.className) return false;
                  return a.date >= e.startDate && (!e.endDate || a.date <= e.endDate);
                });
                if (match) {
                  rate = match.feePerSession;
                } else {
                  const classMatch = studentEnrollments.find(e => e.className === a.className);
                  if (classMatch) {
                    rate = classMatch.feePerSession;
                  } else {
                    rate = getFeeAtDate(a.date, Number(student.feePerSession) || 0, student.feeHistory || []);
                  }
                }
              }
              return {
                date: a.date,
                studentName: a.studentName,
                className: a.className,
                status: a.status === 'present' ? 'Có mặt' : 'Vắng mặt',
                rate,
                earned: rate
              };
            })
            .sort((a, b) => b.date.localeCompare(a.date));
        }
      },
      {
        id: 'other_income_detail',
        implemented: true,
        name: 'Báo cáo doanh thu khác',
        description: 'Chi tiết các khoản thu không phải học phí (sách, đồng phục, lệ phí...).',
        type: 'detail',
        filters: ['dateRange', 'revenueCategory', 'search'],
        columns: [
          { key: 'date', label: 'Ngày thu', align: 'center', format: 'date' },
          { key: 'category', label: 'Danh mục thu', align: 'left', format: 'text' },
          { key: 'studentName', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'amount', label: 'Số tiền', align: 'right', format: 'currency' },
          { key: 'method', label: 'Phương thức', align: 'center', format: 'text' },
          { key: 'notes', label: 'Chi tiết ghi chú', align: 'left', format: 'text' }
        ],
        compute: ({ transactions, filters }) => {
          return transactions
            .filter(t => {
              if (t.revenueCategory === 'Học phí offline' || t.revenueCategory === 'Học phí online' || t.studyType === 'Online') return false;
              if (filters.startDate && t.paymentDate < filters.startDate) return false;
              if (filters.endDate && t.paymentDate > filters.endDate) return false;
              if (filters.revenueCategory && t.revenueCategory !== filters.revenueCategory) return false;
              if (filters.searchQuery) {
                return t.studentName.toLowerCase().includes(filters.searchQuery.toLowerCase()) || (t.notes || '').toLowerCase().includes(filters.searchQuery.toLowerCase());
              }
              return true;
            })
            .map(t => ({
              date: t.paymentDate,
              category: t.revenueCategory,
              studentName: t.studentName || '—',
              amount: t.amount,
              method: t.paymentMethod,
              notes: t.notes || '—'
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
        }
      },
      {
        id: 'operating_expenses_detail',
        implemented: true,
        name: 'Báo cáo chi phí',
        description: 'Chi tiết các khoản chi tiêu vận hành tại trung tâm.',
        type: 'detail',
        filters: ['dateRange', 'expenseCategory', 'search'],
        columns: [
          { key: 'date', label: 'Ngày chi', align: 'center', format: 'date' },
          { key: 'category', label: 'Danh mục chi', align: 'left', format: 'text' },
          { key: 'desc', label: 'Nội dung mô tả', align: 'left', format: 'text' },
          { key: 'amount', label: 'Số tiền', align: 'right', format: 'currency' },
          { key: 'method', label: 'Phương thức', align: 'center', format: 'text' },
          { key: 'createdBy', label: 'Người tạo', align: 'left', format: 'text' },
          { key: 'approvedBy', label: 'Người duyệt', align: 'left', format: 'text' }
        ],
        compute: ({ expenses, filters }) => {
          return expenses
            .filter(e => {
              if (filters.startDate && e.date < filters.startDate) return false;
              if (filters.endDate && e.date > filters.endDate) return false;
              if (filters.expenseCategory && e.category !== filters.expenseCategory) return false;
              if (filters.searchQuery) {
                return e.description.toLowerCase().includes(filters.searchQuery.toLowerCase()) || e.category.toLowerCase().includes(filters.searchQuery.toLowerCase());
              }
              return true;
            })
            .map(e => ({
              date: e.date,
              category: e.category,
              desc: e.description,
              amount: e.amount,
              method: e.paymentMethod,
              createdBy: e.createdBy || '—',
              approvedBy: e.approvedBy || '—'
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
        }
      },
      {
        id: 'profit_earned_object',
        implemented: true,
        name: 'Báo cáo lợi nhuận thực',
        description: 'Lợi nhuận dựa trên Doanh thu thực tế (earned) tích lũy theo tháng.',
        type: 'object',
        filters: [],
        columns: [
          { key: 'month', label: 'Tháng', align: 'center', format: 'text' },
          { key: 'earnedTuition', label: 'DT thực học phí', align: 'right', format: 'currency' },
          { key: 'otherRevenue', label: 'Doanh thu khác', align: 'right', format: 'currency' },
          { key: 'expenses', label: 'Chi phí vận hành', align: 'right', format: 'currency' },
          { key: 'salaries', label: 'Chi phí lương phát sinh / payrollCost', align: 'right', format: 'currency' },
          { key: 'profit', label: 'Lợi nhuận thực', align: 'right', format: 'currency' },
          { key: 'margin', label: 'Tỷ suất (%)', align: 'right', format: 'text' }
        ],
        compute: ({ students, transactions, expenses, salaries, attendance, classes }) => {
          const months: string[] = [];
          const now = new Date();
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
          }

          return months.map(m => {
            const revSummary = computeRevenueSummary(students, transactions, attendance, m, classes);
            const earnedTuition = revSummary.tuitionEarnedInPeriod;
            const otherRevenue = revSummary.otherRevenueCollectedInPeriod;
            const totalRev = revSummary.totalEarnedRevenueInPeriod;

            const opEx = expenses.filter(e => e.date?.startsWith(m)).reduce((sum, e) => sum + e.amount, 0);
            const sal = salaries.filter(s => s.month === m).reduce((sum, s) => sum + (s.grossSalary || 0), 0);
            const totalCost = opEx + sal;
            const profit = totalRev - totalCost;
            const margin = totalRev > 0 ? `${Math.round((profit / totalRev) * 100)}%` : '—';

            return {
              month: m,
              earnedTuition,
              otherRevenue,
              expenses: opEx,
              salaries: sal,
              profit,
              margin
            };
          });
        }
      },
      {
        id: 'profit_cash_object',
        implemented: true,
        name: 'Báo cáo lợi nhuận theo tiền thu',
        description: 'Lợi nhuận dựa trên Dòng tiền thu thực tế (cash) tích lũy theo tháng.',
        type: 'object',
        filters: [],
        columns: [
          { key: 'month', label: 'Tháng', align: 'center', format: 'text' },
          { key: 'tuitionCollected', label: 'Tiền học phí đã thu', align: 'right', format: 'currency' },
          { key: 'otherRevenue', label: 'Tiền thu khác', align: 'right', format: 'currency' },
          { key: 'expenses', label: 'Chi phí vận hành', align: 'right', format: 'currency' },
          { key: 'salaries', label: 'Chi phí lương phát sinh / payrollCost', align: 'right', format: 'currency' },
          { key: 'cashProfit', label: 'Lợi nhuận dòng tiền', align: 'right', format: 'currency' },
          { key: 'margin', label: 'Tỷ suất dòng tiền', align: 'right', format: 'text' }
        ],
        compute: ({ students, transactions, expenses, salaries, attendance, classes }) => {
          const months: string[] = [];
          const now = new Date();
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
          }

          return months.map(m => {
            const revSummary = computeRevenueSummary(students, transactions, attendance, m, classes);
            const tuitionCollected = revSummary.tuitionCollectedInPeriod;
            const otherRevenue = revSummary.otherRevenueCollectedInPeriod;
            const totalCollected = revSummary.totalCashCollectedInPeriod;

            const opEx = expenses.filter(e => e.date?.startsWith(m)).reduce((sum, e) => sum + e.amount, 0);
            const sal = salaries.filter(s => s.month === m).reduce((sum, s) => sum + (s.grossSalary || 0), 0);
            const totalCost = opEx + sal;
            const cashProfit = totalCollected - totalCost;
            const margin = totalCollected > 0 ? `${Math.round((cashProfit / totalCollected) * 100)}%` : '—';

            return {
              month: m,
              tuitionCollected,
              otherRevenue,
              expenses: opEx,
              salaries: sal,
              cashProfit,
              margin
            };
          });
        }
      }
    ]
  },
  {
    id: 'grp_staff',
    label: 'Báo cáo nhân sự & giáo viên',
    icon: '👥',
    reports: [
      {
        id: 'staff_salary_summary',
        implemented: true,
        name: 'Báo cáo lương nhân viên & giáo viên',
        description: 'Báo cáo bảng lương tổng hợp của nhân viên và giáo viên trong tháng.',
        type: 'summary',
        filters: ['month', 'staff'],
        columns: [
          { key: 'name', label: 'Họ và tên', align: 'left', format: 'text' },
          { key: 'role', label: 'Chức vụ', align: 'center', format: 'text' },
          { key: 'base', label: 'Lương cứng', align: 'right', format: 'currency' },
          { key: 'sessions', label: 'Buổi dạy', align: 'right', format: 'number' },
          { key: 'teachingIncome', label: 'Lương dạy học', align: 'right', format: 'currency' },
          { key: 'allowance', label: 'Phụ cấp MĐ', align: 'right', format: 'currency' },
          { key: 'otherSalary', label: 'Lương khác tháng này', align: 'right', format: 'currency' },
          { key: 'gross', label: 'Tổng lương', align: 'right', format: 'currency' },
          { key: 'advance', label: 'Đã ứng', align: 'right', format: 'currency' },
          { key: 'tax', label: 'Thuế TNCN', align: 'right', format: 'currency' },
          { key: 'net', label: 'Còn thanh toán', align: 'right', format: 'currency' },
          { key: 'status', label: 'Trạng thái', align: 'center', format: 'text' }
        ],
        compute: ({ salaries, filters }) => {
          const m = filters.month || new Date().toISOString().slice(0, 7);
          return salaries
            .filter(s => {
              if (s.month !== m) return false;
              if (filters.staffId && s.staffId !== filters.staffId) return false;
              return true;
            })
            .map(s => {
              const effectiveOtherSalary = s.otherSalary ?? s.otherIncome ?? 0;
              return {
                name: s.staffName,
                role: s.role === 'teacher' ? 'Giáo viên' : s.role === 'teaching_assistant' ? 'Trợ giảng' : 'Văn phòng',
                base: s.baseSalary || 0,
                sessions: s.totalSessions || 0,
                teachingIncome: s.teachingIncome || 0,
                allowance: s.otherMonthlyAllowance || 0,
                otherSalary: effectiveOtherSalary,
                gross: s.grossSalary || 0,
                advance: s.advanceApplied ?? s.totalAdvance ?? 0,
                tax: s.taxAmount || 0,
                net: s.netSalary || 0,
                status: s.status === 'paid' ? 'Đã chi trả' : s.status === 'confirmed' ? 'Đã duyệt' : 'Bản nháp'
              };
            });
        }
      },
      {
        id: 'teacher_attendance_detail',
        implemented: true,
        name: 'Báo cáo chấm công giáo viên',
        description: 'Chi tiết danh sách các buổi dạy học đã chấm công (TeachingLog) của giáo viên.',
        type: 'detail',
        filters: ['month', 'teacher'],
        columns: [
          { key: 'date', label: 'Ngày dạy', align: 'center', format: 'date' },
          { key: 'teacher', label: 'Giáo viên', align: 'left', format: 'text' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'sessions', label: 'Số buổi dạy', align: 'right', format: 'number' },
          { key: 'sub', label: 'Dạy thay', align: 'center', format: 'text' },
          { key: 'originalTeacher', label: 'GV chính được thay', align: 'left', format: 'text' },
          { key: 'source', label: 'Nguồn', align: 'center', format: 'text' }
        ],
        compute: ({ teachingLogs, filters }) => {
          const m = filters.month;
          return teachingLogs
            .filter(l => {
              if (m && !l.date?.startsWith(m)) return false;
              if (filters.teacherId && l.staffId !== filters.teacherId && l.staffName !== filters.teacherId) return false;
              return true;
            })
            .map(l => ({
              date: l.date,
              teacher: l.staffName,
              className: l.className,
              sessions: l.sessions || 1,
              sub: l.isSubstitute ? 'Có' : '—',
              originalTeacher: l.originalTeacherName || '—',
              source: l.source === 'auto' ? 'Tự động (D.Danh)' : 'Thủ công'
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
        }
      },
      {
        id: 'salary_advance_detail',
        implemented: true,
        name: 'Báo cáo tạm ứng lương',
        description: 'Chi tiết các giao dịch tạm ứng lương cho nhân viên & giáo viên.',
        type: 'detail',
        filters: ['month', 'staff'],
        columns: [
          { key: 'date', label: 'Ngày ứng', align: 'center', format: 'date' },
          { key: 'name', label: 'Nhân viên', align: 'left', format: 'text' },
          { key: 'amount', label: 'Số tiền ứng', align: 'right', format: 'currency' },
          { key: 'reason', label: 'Lý do ứng', align: 'left', format: 'text' },
          { key: 'approvedBy', label: 'Người duyệt', align: 'left', format: 'text' }
        ],
        compute: ({ advances, filters }) => {
          const m = filters.month;
          return advances
            .filter(a => {
              if (m && !a.date?.startsWith(m)) return false;
              if (filters.staffId && a.staffId !== filters.staffId) return false;
              return true;
            })
            .map(a => ({
              date: a.date,
              name: a.staffName,
              amount: a.amount,
              reason: a.reason || '—',
              approvedBy: a.approvedBy || '—'
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
        }
      },
      {
        id: 'staff_missing_teaching_log',
        implemented: true,
        name: 'Báo cáo thiếu TeachingLog',
        description: 'Lớp đã được điểm danh có học viên đi học nhưng giáo viên chưa chấm công dạy.',
        type: 'object',
        filters: ['month'],
        columns: [
          { key: 'date', label: 'Ngày dạy', align: 'center', format: 'date' },
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'teacher', label: 'Giáo viên phụ trách', align: 'left', format: 'text' },
          { key: 'warning', label: 'Cảnh báo', align: 'left', format: 'text' }
        ],
        compute: ({ classes, attendance, teachingLogs, filters }) => {
          const m = filters.month || new Date().toISOString().slice(0, 7);
          
          // Nhóm điểm danh theo ngày + lớp
          const attGroups: Record<string, { className: string; classId: string; date: string; hasPresent: boolean }> = {};
          attendance
            .filter(a => a.date?.startsWith(m))
            .forEach(a => {
              const key = `${a.date}_${a.className}`;
              if (!attGroups[key]) {
                attGroups[key] = { className: a.className, classId: a.classId, date: a.date, hasPresent: false };
              }
              if (a.status === 'present') {
                attGroups[key].hasPresent = true;
              }
            });

          const list: any[] = [];
          Object.values(attGroups).forEach(group => {
            if (group.hasPresent) {
              const cls = classes.find(c => c.name === group.className || c.id === group.classId);
              if (cls && cls.status === 'active') {
                const logExists = teachingLogs.some(l => 
                  l.date === group.date && 
                  (l.className === group.className || l.classId === group.classId)
                );
                if (!logExists) {
                  list.push({
                    date: group.date,
                    className: group.className,
                    teacher: cls.teacher || 'Chưa phân công',
                    warning: 'Đã điểm danh học sinh nhưng giáo viên chưa được ghi nhận Chấm công dạy.'
                  });
                }
              }
            }
          });
          return list.sort((a, b) => b.date.localeCompare(a.date));
        }
      },
      {
        id: 'staff_missing_rate',
        implemented: true,
        name: 'Báo cáo giáo viên thiếu đơn giá',
        description: 'Danh sách giáo viên đã được phân lớp dạy nhưng chưa cài đặt đơn giá/buổi.',
        type: 'object',
        filters: [],
        columns: [
          { key: 'name', label: 'Giáo viên', align: 'left', format: 'text' },
          { key: 'classes', label: 'Các lớp phụ trách', align: 'left', format: 'text' },
          { key: 'status', label: 'Trạng thái nhân sự', align: 'center', format: 'text' }
        ],
        compute: ({ staff, classes }) => {
          return staff
            .filter(s => {
              if ((s.role !== 'teacher' && s.role !== 'teaching_assistant') || s.status !== 'active') return false;
              const hasClass = classes.some(c => c.status === 'active' && (c.teacherId === s.id || c.teacher?.toLowerCase().trim() === s.name.toLowerCase().trim()));
              const missingRate = !s.ratePerSession || s.ratePerSession <= 0;
              return hasClass && missingRate;
            })
            .map(s => {
              const teacherClasses = classes
                .filter(c => c.status === 'active' && (c.teacherId === s.id || c.teacher?.toLowerCase().trim() === s.name.toLowerCase().trim()))
                .map(c => c.name)
                .join(', ');
              return {
                name: s.name,
                classes: teacherClasses || '—',
                status: 'Đang hoạt động'
              };
            });
        }
      }
    ]
  },
  {
    id: 'grp_reconciliation',
    label: 'Báo cáo đối soát & nhật ký',
    icon: '⏳',
    reports: [
      {
        id: 'reconcile_daily_summary',
        implemented: true,
        name: 'Báo cáo đối soát cuối ngày',
        description: 'Danh sách các ngày đã được đối soát hoàn tất và lưu nhật ký.',
        type: 'summary',
        filters: ['dateRange'],
        columns: [
          { key: 'date', label: 'Ngày đối soát', align: 'center', format: 'date' },
          { key: 'income', label: 'Tiền thực thu', align: 'right', format: 'currency' },
          { key: 'expense', label: 'Tiền thực chi', align: 'right', format: 'currency' },
          { key: 'balance', label: 'Chênh lệch quỹ', align: 'right', format: 'currency' },
          { key: 'tuitionEarned', label: 'DT thực học phí', align: 'right', format: 'currency' },
          { key: 'completedAt', label: 'Thời gian hoàn tất', align: 'center', format: 'date' },
          { key: 'completedBy', label: 'Người thực hiện', align: 'left', format: 'text' },
          { key: 'note', label: 'Ghi chú đối soát', align: 'left', format: 'text' }
        ],
        compute: ({ dailyCloses, filters }) => {
          return dailyCloses
            .filter(r => {
              if (filters.startDate && r.date < filters.startDate) return false;
              if (filters.endDate && r.date > filters.endDate) return false;
              return true;
            })
            .map(r => ({
              date: r.date,
              income: r.summary.cashIncome,
              expense: r.summary.cashExpense,
              balance: r.summary.cashBalance,
              tuitionEarned: r.summary.tuitionEarned || 0,
              completedAt: formatDate(r.completedAt, true),
              completedBy: r.completedBy,
              note: r.note || '—'
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
        }
      },
      {
        id: 'reconcile_pending_detail',
        implemented: true,
        name: 'Báo cáo ngày chưa đối soát',
        description: 'Các ngày gần đây có hoạt động nghiệp vụ nhưng chưa được đối soát cuối ngày.',
        type: 'detail',
        filters: [],
        columns: [
          { key: 'date', label: 'Ngày chưa đối soát', align: 'center', format: 'date' },
          { key: 'attCheck', label: 'Lớp cần điểm danh', align: 'left', format: 'text' },
          { key: 'txCheck', label: 'Giao dịch phát sinh', align: 'left', format: 'text' },
          { key: 'expCheck', label: 'Khoản chi phát sinh', align: 'left', format: 'text' },
          { key: 'status', label: 'Yêu cầu hành động', align: 'center', format: 'text' }
        ],
        compute: ({ dailyCloses, classes, attendance, transactions, expenses }) => {
          // Quét 7 ngày gần đây
          const dates: string[] = [];
          for (let i = 1; i <= 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(formatDateKey(d));
          }

          const VIET_DAY_MAP: Record<number, string[]> = {
            0: ['cn', 'chủ nhật'],
            1: ['thứ 2', 't2', 'thứ hai'],
            2: ['thứ 3', 't3', 'thứ ba'],
            3: ['thứ 4', 't4', 'thứ tư'],
            4: ['thứ 5', 't5', 'thứ năm'],
            5: ['thứ 6', 't6', 'thứ sáu'],
            6: ['thứ 7', 't7', 'thứ bảy'],
          };

          const list: any[] = [];
          dates.forEach(dateStr => {
            const isReconciled = dailyCloses.some(r => r.date === dateStr);
            if (isReconciled) return;

            const parts = dateStr.split('-');
            const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            const dayOfWeek = dateObj.getDay();
            const dayNames = VIET_DAY_MAP[dayOfWeek] || [];

            const scheduledClasses = classes.filter(cls => {
              if (cls.status !== 'active' || cls.type === 'online') return false;
              const days = cls.scheduleDays || [];
              return days.some(d => dayNames.some(tn => d.toLowerCase().includes(tn)));
            });

            const dayAtt = attendance.filter(a => a.date === dateStr);
            const dayTxs = transactions.filter(t => t.paymentDate === dateStr && t.revenueCategory !== 'Học phí online' && t.studyType !== 'Online');
            const dayExps = expenses.filter(e => e.date === dateStr);

            if (scheduledClasses.length > 0 || dayAtt.length > 0 || dayTxs.length > 0 || dayExps.length > 0) {
              const attCheck = `${dayAtt.length}/${scheduledClasses.length} lớp đã d.danh`;
              const txCheck = `${dayTxs.length} giao dịch thu`;
              const expCheck = `${dayExps.length} khoản chi`;
              list.push({
                date: dateStr,
                attCheck,
                txCheck,
                expCheck,
                status: 'Cần làm Đối soát bù'
              });
            }
          });
          return list;
        }
      },
      {
        id: 'audit_logs_detail',
        implemented: true,
        name: 'Báo cáo audit log thao tác',
        description: 'Nhật ký toàn bộ các thao tác nghiệp vụ/hệ thống của người dùng.',
        type: 'detail',
        filters: ['dateRange', 'search'],
        columns: [
          { key: 'time', label: 'Thời gian', align: 'center', format: 'date' },
          { key: 'user', label: 'Tài khoản', align: 'left', format: 'text' },
          { key: 'action', label: 'Hành động', align: 'center', format: 'text' },
          { key: 'entity', label: 'Đối tượng', align: 'center', format: 'text' },
          { key: 'details', label: 'Chi tiết thao tác', align: 'left', format: 'text' }
        ],
        compute: ({ auditLogs, filters }) => {
          return auditLogs
            .filter(l => {
              const dateStr = l.timestamp || l.createdAt || '';
              if (filters.startDate && dateStr.slice(0, 10) < filters.startDate) return false;
              if (filters.endDate && dateStr.slice(0, 10) > filters.endDate) return false;
              if (filters.searchQuery) {
                const q = filters.searchQuery.toLowerCase();
                return (l.user || '').toLowerCase().includes(q) || (l.details || '').toLowerCase().includes(q) || (l.action || '').toLowerCase().includes(q);
              }
              return true;
            })
            .map(l => ({
              time: formatDate(l.timestamp || l.createdAt, true),
              user: l.user || '—',
              action: l.action || '—',
              entity: l.entity || '—',
              details: l.details || '—'
            }));
        }
      },
      {
        id: 'reconcile_error_transactions',
        implemented: true,
        name: 'Báo cáo giao dịch lỗi dữ liệu',
        description: 'Danh sách các giao dịch bị lỗi số tiền, thiếu mã học viên hoặc thiếu phương thức thanh toán.',
        type: 'object',
        filters: [],
        columns: [
          { key: 'id', label: 'ID GD', align: 'left', format: 'text' },
          { key: 'date', label: 'Ngày', align: 'center', format: 'date' },
          { key: 'name', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'amount', label: 'Số tiền', align: 'right', format: 'currency' },
          { key: 'method', label: 'Hình thức', align: 'center', format: 'text' },
          { key: 'category', label: 'Danh mục', align: 'left', format: 'text' },
          { key: 'error', label: 'Lỗi dữ liệu phát hiện', align: 'left', format: 'text' }
        ],
        compute: ({ transactions, students }) => {
          const list: any[] = [];
          transactions.forEach(t => {
            if (t.studyType === 'Online' || t.revenueCategory === 'Học phí online') return;

            const errs: string[] = [];
            if (t.amount <= 0) errs.push('Số tiền <= 0đ');
            if (!t.paymentDate) errs.push('Thiếu ngày đóng');
            if (!t.paymentMethod?.trim()) errs.push('Thiếu hình thức thanh toán');
            
            if (t.revenueCategory === 'Học phí offline') {
              const hasValidStudent = t.studentId && students.some(s => s.id === t.studentId);
              if (!hasValidStudent) {
                errs.push('Thiếu studentId hợp lệ khớp với hồ sơ học viên');
              }
            }

            if (errs.length > 0) {
              list.push({
                id: t.id,
                date: t.paymentDate,
                name: t.studentName || '—',
                amount: t.amount,
                method: t.paymentMethod || '—',
                category: t.revenueCategory || '—',
                error: errs.join(', ')
              });
            }
          });
          return list.sort((a, b) => b.date.localeCompare(a.date));
        }
      },
      {
        id: 'reconcile_warning_expenses',
        implemented: true,
        name: 'Báo cáo khoản chi cần kiểm tra',
        description: 'Chi tiết các khoản chi có giá trị lớn (> 2.000.000đ) hoặc chưa được người duyệt phê chuẩn.',
        type: 'object',
        filters: [],
        columns: [
          { key: 'id', label: 'ID Khoản chi', align: 'left', format: 'text' },
          { key: 'date', label: 'Ngày chi', align: 'center', format: 'date' },
          { key: 'category', label: 'Danh mục chi', align: 'left', format: 'text' },
          { key: 'amount', label: 'Số tiền', align: 'right', format: 'currency' },
          { key: 'desc', label: 'Mô tả chi tiết', align: 'left', format: 'text' },
          { key: 'reason', label: 'Lý do cảnh báo', align: 'left', format: 'text' }
        ],
        compute: ({ expenses }) => {
          const list: any[] = [];
          expenses.forEach(e => {
            const warns: string[] = [];
            if (e.amount > 2000000) warns.push('Khoản chi lớn hơn 2 triệu');
            if (!e.approvedBy?.trim()) warns.push('Thiếu người duyệt chi');
            
            if (warns.length > 0) {
              list.push({
                id: e.id,
                date: e.date,
                category: e.category,
                amount: e.amount,
                desc: e.description || '—',
                reason: warns.join(' và ')
              });
            }
          });
          return list.sort((a, b) => b.date.localeCompare(a.date));
        }
      }
    ]
  },
  {
    id: 'grp_admission',
    label: 'Báo cáo Tuyển sinh',
    icon: '🎯',
    reports: [
      {
        id: 'admission_summary_report',
        implemented: true,
        name: 'Báo cáo tổng hợp tuyển sinh',
        description: 'Thống kê số lượng đăng ký, hẹn test, đã test, không nhận, nhận chờ xếp lớp, đã chuyển đổi học viên và tỷ lệ chuyển đổi.',
        type: 'summary',
        filters: ['month', 'dateRange'],
        columns: [
          { key: 'metric', label: 'Chỉ số tuyển sinh', align: 'left', format: 'text' },
          { key: 'value', label: 'Số lượng / Tỷ lệ', align: 'right', format: 'text' },
          { key: 'desc', label: 'Chi tiết / Mô tả', align: 'left', format: 'text' }
        ],
        compute: ({ admissionLeads = [], filters }) => {
          const m = filters.month;
          const start = filters.startDate;
          const end = filters.endDate;

          const periodLeads = admissionLeads.filter(l => {
            if (m && !l.registrationDate?.startsWith(m)) return false;
            if (start && l.registrationDate < start) return false;
            if (end && l.registrationDate > end) return false;
            return true;
          });

          const total = periodLeads.length;
          const testSched = periodLeads.filter(l => l.status === 'test_scheduled').length;
          const tested = periodLeads.filter(l => l.status === 'tested').length;
          const rejected = periodLeads.filter(l => l.status === 'rejected').length;
          const acceptedWaiting = periodLeads.filter(l => l.status === 'accepted_waiting_class').length;
          const convWaiting = periodLeads.filter(l => l.status === 'converted_waiting_class').length;
          const convAssigned = periodLeads.filter(l => l.status === 'converted_assigned_class').length;
          
          const convertedCount = convWaiting + convAssigned;
          const convRate = total > 0 ? `${((convertedCount / total) * 100).toFixed(1)}%` : '0.0%';

          return [
            { metric: '1. Tổng đăng ký tuyển sinh', value: `${total} lead`, desc: 'Tổng số lead đăng ký trong thời kỳ chọn.' },
            { metric: '2. Đã hẹn test', value: `${testSched} lead`, desc: 'Đã thiết lập ngày hẹn test đầu vào.' },
            { metric: '3. Đã test (Chờ đánh giá)', value: `${tested} lead`, desc: 'Đã hoàn thành bài test đầu vào.' },
            { metric: '4. Không nhận', value: `${rejected} lead`, desc: 'Học viên không đạt điều kiện hoặc từ chối nhập học.' },
            { metric: '5. Nhận chờ xếp lớp', value: `${acceptedWaiting} lead`, desc: 'Đã trúng tuyển nhưng chưa tạo tài khoản học viên chính thức.' },
            { metric: '6. Đã chuyển học viên (Chờ lớp)', value: `${convWaiting} học viên`, desc: 'Đã chuyển thành học viên chính thức, đang đợi xếp lớp.' },
            { metric: '7. Đã chuyển và xếp lớp chính thức', value: `${convAssigned} học viên`, desc: 'Đã là học viên chính thức và được phân vào lớp học cụ thể.' },
            { metric: '8. Tỷ lệ chuyển đổi thành công', value: convRate, desc: 'Tỷ lệ học viên chính thức trên tổng số lead đăng ký.' }
          ];
        }
      },
      {
        id: 'admission_waiting_class_detail',
        implemented: true,
        name: 'Báo cáo danh sách chờ xếp lớp',
        description: 'Chi tiết các học viên tiềm năng đã trúng tuyển hoặc đã chuyển đổi nhưng chưa được xếp lớp học.',
        type: 'detail',
        filters: ['search'],
        columns: [
          { key: 'leadCode', label: 'Mã Lead', align: 'center', format: 'text' },
          { key: 'studentName', label: 'Họ và tên', align: 'left', format: 'text' },
          { key: 'parentPhone', label: 'Số điện thoại', align: 'center', format: 'text' },
          { key: 'source', label: 'Nguồn', align: 'center', format: 'text' },
          { key: 'suggestedLevel', label: 'Trình độ đề xuất', align: 'left', format: 'text' },
          { key: 'registrationDate', label: 'Ngày đăng ký', align: 'center', format: 'date' }
        ],
        compute: ({ admissionLeads = [], filters }) => {
          const list = admissionLeads.filter(l => 
            l.status === 'accepted_waiting_class' || l.status === 'converted_waiting_class'
          );
          return list
            .filter(l => {
              if (filters.searchQuery) {
                const q = filters.searchQuery.toLowerCase();
                return (
                  l.studentName.toLowerCase().includes(q) ||
                  (l.leadCode || '').toLowerCase().includes(q) ||
                  l.parentPhone.includes(q)
                );
              }
              return true;
            })
            .map(l => ({
              leadCode: l.leadCode || '—',
              studentName: l.studentName,
              parentPhone: l.parentPhone,
              source: l.source || '—',
              suggestedLevel: l.suggestedLevel || '—',
              registrationDate: l.registrationDate
            }));
        }
      }
    ]
  },
  {
    id: 'grp_inventory',
    label: 'Báo cáo kho vật tư',
    icon: '📦',
    reports: [
      // #2 — Giá trị tồn kho hiện tại
      {
        id: 'inv_stock_valuation',
        implemented: true,
        name: 'Giá trị tồn kho hiện tại',
        description: 'Số lượng tồn, giá vốn bình quân và giá trị tồn theo từng mặt hàng / kho.',
        type: 'summary',
        filters: ['invCategory', 'invLocation'],
        columns: [
          { key: 'itemCode', label: 'Mã SKU', align: 'left', format: 'text' },
          { key: 'itemName', label: 'Mặt hàng', align: 'left', format: 'text' },
          { key: 'categoryName', label: 'Nhóm', align: 'left', format: 'text' },
          { key: 'locationName', label: 'Kho', align: 'left', format: 'text' },
          { key: 'quantityOnHand', label: 'SL tồn', align: 'right', format: 'number' },
          { key: 'averageCost', label: 'Giá vốn BQ', align: 'right', format: 'currency' },
          { key: 'value', label: 'Giá trị tồn', align: 'right', format: 'currency' },
        ],
        compute: ({ inventoryStocks = [], inventoryCategories = [], filters }) => {
          const catName = filters.categoryId ? inventoryCategories.find(c => c.id === filters.categoryId)?.name : null;
          return inventoryStocks
            .filter(s => (!catName || s.categoryName === catName) && (!filters.locationId || s.locationId === filters.locationId))
            .map(s => ({
              itemCode: s.itemCode, itemName: s.itemName, categoryName: s.categoryName, locationName: s.locationName,
              quantityOnHand: s.quantityOnHand, averageCost: s.averageCost, value: s.quantityOnHand * s.averageCost,
            }))
            .sort((a, b) => b.value - a.value);
        },
      },
      // #1 — Nhập – Xuất – Tồn theo kỳ
      {
        id: 'inv_in_out_balance',
        implemented: true,
        name: 'Nhập – Xuất – Tồn theo kỳ',
        description: 'Tồn đầu kỳ, tổng nhập, tổng xuất và tồn cuối kỳ theo từng mặt hàng.',
        type: 'summary',
        filters: ['dateRange', 'invCategory'],
        columns: [
          { key: 'itemCode', label: 'Mã SKU', align: 'left', format: 'text' },
          { key: 'itemName', label: 'Mặt hàng', align: 'left', format: 'text' },
          { key: 'unit', label: 'ĐVT', align: 'left', format: 'text' },
          { key: 'opening', label: 'Tồn đầu', align: 'right', format: 'number' },
          { key: 'totalIn', label: 'Nhập', align: 'right', format: 'number' },
          { key: 'totalOut', label: 'Xuất', align: 'right', format: 'number' },
          { key: 'closing', label: 'Tồn cuối', align: 'right', format: 'number' },
          { key: 'closingValue', label: 'Giá trị tồn cuối', align: 'right', format: 'currency' },
        ],
        compute: ({ inventoryMovements = [], inventoryItems = [], inventoryStocks = [], inventoryCategories = [], filters }) => {
          const start = filters.startDate || '0000-00-00';
          const end = filters.endDate || '9999-99-99';
          const catName = filters.categoryId ? inventoryCategories.find(c => c.id === filters.categoryId)?.name : null;
          // Giá vốn BQ theo mặt hàng (gộp các kho).
          const costMap: Record<string, { v: number; q: number }> = {};
          inventoryStocks.forEach(s => {
            costMap[s.itemId] = costMap[s.itemId] || { v: 0, q: 0 };
            costMap[s.itemId].v += s.quantityOnHand * s.averageCost;
            costMap[s.itemId].q += s.quantityOnHand;
          });
          const avgCost = (itemId: string, fallback: number) => {
            const c = costMap[itemId];
            return c && c.q > 0 ? c.v / c.q : fallback;
          };
          const delta = (m: any) => {
            if (m.movementType === 'issue_to_student' && m.issued === false) return 0;
            return (m.toLocationName ? m.quantity : 0) - (m.fromLocationName ? m.quantity : 0);
          };
          const items = inventoryItems.filter(it => !catName || it.categoryName === catName);
          return items.map(it => {
            let opening = 0, totalIn = 0, totalOut = 0;
            inventoryMovements.filter(m => m.itemId === it.id).forEach(m => {
              const d = delta(m);
              if (m.movementDate < start) opening += d;
              else if (m.movementDate <= end) { if (d > 0) totalIn += d; else totalOut += -d; }
            });
            const closing = opening + totalIn - totalOut;
            return {
              itemCode: it.code, itemName: it.name, unit: it.unit,
              opening, totalIn, totalOut, closing,
              closingValue: closing * avgCost(it.id, it.defaultCostPrice),
            };
          }).filter(r => r.opening || r.totalIn || r.totalOut || r.closing);
        },
      },
      // #3 — Doanh thu – Giá vốn – Lãi gộp vật tư
      {
        id: 'inv_gross_margin',
        implemented: true,
        name: 'Doanh thu – Giá vốn – Lãi gộp vật tư',
        description: 'Doanh thu bán, giá vốn xuất bán và lãi gộp theo nhóm vật tư trong kỳ.',
        type: 'summary',
        filters: ['dateRange', 'invCategory'],
        columns: [
          { key: 'categoryName', label: 'Nhóm vật tư', align: 'left', format: 'text' },
          { key: 'qty', label: 'SL bán', align: 'right', format: 'number' },
          { key: 'revenue', label: 'Doanh thu', align: 'right', format: 'currency' },
          { key: 'cogs', label: 'Giá vốn', align: 'right', format: 'currency' },
          { key: 'grossProfit', label: 'Lãi gộp', align: 'right', format: 'currency' },
          { key: 'marginPct', label: 'Tỷ suất', align: 'right', format: 'text' },
        ],
        compute: ({ inventoryMovements = [], inventoryStocks = [], inventoryItems = [], inventoryCategories = [], filters }) => {
          const start = filters.startDate || '0000-00-00';
          const end = filters.endDate || '9999-99-99';
          const filterCat = filters.categoryId ? inventoryCategories.find(c => c.id === filters.categoryId)?.name : null;
          const costMap: Record<string, { v: number; q: number }> = {};
          inventoryStocks.forEach(s => {
            costMap[s.itemId] = costMap[s.itemId] || { v: 0, q: 0 };
            costMap[s.itemId].v += s.quantityOnHand * s.averageCost;
            costMap[s.itemId].q += s.quantityOnHand;
          });
          const itemCost: Record<string, number> = {};
          inventoryItems.forEach(it => { itemCost[it.id] = it.defaultCostPrice; });
          const unitCost = (itemId: string) => {
            const c = costMap[itemId];
            return c && c.q > 0 ? c.v / c.q : (itemCost[itemId] || 0);
          };
          const byCat: Record<string, any> = {};
          inventoryMovements
            .filter(m => m.movementType === 'issue_to_student' && (m.totalAmount || 0) > 0 && m.movementDate >= start && m.movementDate <= end)
            .filter(m => !filterCat || m.categoryName === filterCat)
            .forEach(m => {
              const cat = m.categoryName || 'Khác';
              byCat[cat] = byCat[cat] || { categoryName: cat, qty: 0, revenue: 0, cogs: 0 };
              byCat[cat].qty += m.quantity;
              byCat[cat].revenue += m.totalAmount;
              byCat[cat].cogs += unitCost(m.itemId) * m.quantity;
            });
          return Object.values(byCat).map((r: any) => ({
            ...r,
            grossProfit: r.revenue - r.cogs,
            marginPct: r.revenue > 0 ? `${Math.round(((r.revenue - r.cogs) / r.revenue) * 100)}%` : '—',
          }));
        },
      },
      // #4 — Tổng hợp công nợ vật tư
      {
        id: 'inv_receivables_summary',
        implemented: true,
        name: 'Tổng hợp công nợ vật tư',
        description: 'Nợ tiền (đã phát chưa thu) và nợ hàng (đã thu chưa phát) tính tới hiện tại.',
        type: 'summary',
        filters: ['dateRange'],
        columns: [
          { key: 'type', label: 'Loại công nợ', align: 'left', format: 'text' },
          { key: 'count', label: 'Số giao dịch', align: 'right', format: 'number' },
          { key: 'qty', label: 'SL', align: 'right', format: 'number' },
          { key: 'value', label: 'Giá trị', align: 'right', format: 'currency' },
        ],
        compute: ({ inventoryMovements = [], filters }) => {
          const start = filters.startDate || '0000-00-00';
          const end = filters.endDate || '9999-99-99';
          const inP = (d: string) => d >= start && d <= end;
          const debtMoney = inventoryMovements.filter(m => m.movementType === 'issue_to_student' && m.paymentStatus === 'unpaid' && (m.totalAmount || 0) > 0 && inP(m.movementDate));
          const debtGoods = inventoryMovements.filter(m => m.movementType === 'issue_to_student' && m.paymentStatus === 'paid' && m.issued === false && inP(m.movementDate));
          return [
            { type: 'Nợ tiền (đã phát – chưa thu)', count: debtMoney.length, qty: debtMoney.reduce((s, m) => s + m.quantity, 0), value: debtMoney.reduce((s, m) => s + (m.totalAmount || 0), 0) },
            { type: 'Nợ hàng (đã thu – chờ phát)', count: debtGoods.length, qty: debtGoods.reduce((s, m) => s + m.quantity, 0), value: debtGoods.reduce((s, m) => s + (m.totalAmount || 0), 0) },
          ];
        },
      },
      // #5 — Sổ chi tiết Nhật ký xuất nhập
      {
        id: 'inv_movement_detail',
        implemented: true,
        name: 'Sổ chi tiết Nhật ký xuất nhập',
        description: 'Liệt kê chi tiết từng giao dịch nhập/xuất kho trong kỳ.',
        type: 'detail',
        filters: ['dateRange', 'invCategory', 'search'],
        columns: [
          { key: 'movementDate', label: 'Ngày', align: 'left', format: 'date' },
          { key: 'typeLabel', label: 'Loại GD', align: 'left', format: 'text' },
          { key: 'itemName', label: 'Mặt hàng', align: 'left', format: 'text' },
          { key: 'quantity', label: 'SL', align: 'right', format: 'number' },
          { key: 'totalAmount', label: 'Thành tiền', align: 'right', format: 'currency' },
          { key: 'partner', label: 'Đối tác', align: 'left', format: 'text' },
          { key: 'status', label: 'Trạng thái', align: 'left', format: 'text' },
        ],
        compute: ({ inventoryMovements = [], inventoryCategories = [], filters }) => {
          const start = filters.startDate || '0000-00-00';
          const end = filters.endDate || '9999-99-99';
          const catName = filters.categoryId ? inventoryCategories.find(c => c.id === filters.categoryId)?.name : null;
          const q = (filters.searchQuery || '').toLowerCase().trim();
          const typeLabels: Record<string, string> = {
            opening: 'Tồn đầu kỳ', purchase_in: 'Mua nhập kho', return_in: 'Trả lại kho', issue_to_student: 'Bán học viên',
            issue_to_staff: 'Cấp nhân sự', internal_use: 'Sử dụng nội bộ', adjustment: 'Kiểm kê điều chỉnh', damage: 'Hỏng hóc', loss: 'Mất mát', transfer: 'Chuyển kho',
          };
          return inventoryMovements
            .filter(m => m.movementDate >= start && m.movementDate <= end)
            .filter(m => !catName || m.categoryName === catName)
            .filter(m => !q || `${m.itemName} ${m.studentName} ${m.staffName}`.toLowerCase().includes(q))
            .sort((a, b) => b.movementDate.localeCompare(a.movementDate))
            .map(m => ({
              movementDate: m.movementDate,
              typeLabel: typeLabels[m.movementType] || m.movementType,
              itemName: m.itemName,
              quantity: m.quantity,
              totalAmount: m.totalAmount || 0,
              partner: m.studentName ? `HV: ${m.studentName}` : m.staffName ? `NV: ${m.staffName}` : '—',
              status: m.movementType !== 'issue_to_student' ? '—'
                : m.paymentStatus === 'unpaid' ? 'Chưa thu tiền'
                : !m.issued ? 'Đã thu – chờ phát'
                : 'Đã thu – đã phát',
            }));
        },
      },
      // #7 — Cảnh báo tồn dưới định mức
      {
        id: 'inv_low_stock',
        implemented: true,
        name: 'Cảnh báo tồn dưới định mức',
        description: 'Các mặt hàng có số lượng tồn nhỏ hơn hoặc bằng định mức tối thiểu.',
        type: 'detail',
        filters: ['invLocation'],
        columns: [
          { key: 'itemCode', label: 'Mã SKU', align: 'left', format: 'text' },
          { key: 'itemName', label: 'Mặt hàng', align: 'left', format: 'text' },
          { key: 'locationName', label: 'Kho', align: 'left', format: 'text' },
          { key: 'quantityOnHand', label: 'SL tồn', align: 'right', format: 'number' },
          { key: 'minStockLevel', label: 'Định mức', align: 'right', format: 'number' },
          { key: 'shortBy', label: 'Thiếu', align: 'right', format: 'number' },
        ],
        compute: ({ inventoryStocks = [], filters }) => {
          return inventoryStocks
            .filter(s => (!filters.locationId || s.locationId === filters.locationId))
            .filter(s => s.minStockLevel > 0 && s.quantityOnHand <= s.minStockLevel)
            .map(s => ({
              itemCode: s.itemCode, itemName: s.itemName, locationName: s.locationName,
              quantityOnHand: s.quantityOnHand, minStockLevel: s.minStockLevel,
              shortBy: Math.max(s.minStockLevel - s.quantityOnHand, 0),
            }))
            .sort((a, b) => b.shortBy - a.shortBy);
        },
      },
      // #9 — Vật tư theo học viên
      {
        id: 'inv_by_student',
        implemented: true,
        name: 'Vật tư bán theo học viên',
        description: 'Các mặt hàng đã bán cho từng học viên kèm trạng thái thu tiền và phát hàng.',
        type: 'object',
        filters: ['student', 'dateRange'],
        columns: [
          { key: 'studentName', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'itemName', label: 'Mặt hàng', align: 'left', format: 'text' },
          { key: 'quantity', label: 'SL', align: 'right', format: 'number' },
          { key: 'totalAmount', label: 'Thành tiền', align: 'right', format: 'currency' },
          { key: 'payment', label: 'Thu tiền', align: 'left', format: 'text' },
          { key: 'delivery', label: 'Phát hàng', align: 'left', format: 'text' },
          { key: 'movementDate', label: 'Ngày', align: 'left', format: 'date' },
        ],
        compute: ({ inventoryMovements = [], filters }) => {
          const start = filters.startDate || '0000-00-00';
          const end = filters.endDate || '9999-99-99';
          return inventoryMovements
            .filter(m => m.movementType === 'issue_to_student' && (m.totalAmount || 0) > 0)
            .filter(m => m.movementDate >= start && m.movementDate <= end)
            .filter(m => !filters.studentId || m.studentId === filters.studentId)
            .sort((a, b) => (a.studentName || '').localeCompare(b.studentName || '') || b.movementDate.localeCompare(a.movementDate))
            .map(m => ({
              studentName: m.studentName || '—', itemName: m.itemName, quantity: m.quantity, totalAmount: m.totalAmount || 0,
              payment: m.paymentStatus === 'paid' ? 'Đã thu' : 'Chưa thu',
              delivery: m.issued ? 'Đã phát' : 'Chờ phát',
              movementDate: m.movementDate,
            }));
        },
      },
      // #C1 — Thẻ kho (Kardex) theo mặt hàng
      {
        id: 'inv_kardex',
        implemented: true,
        name: 'Thẻ kho (Kardex) theo mặt hàng',
        description: 'Chọn một mặt hàng để xem từng dòng nhập/xuất kèm tồn lũy kế trong kỳ.',
        type: 'detail',
        filters: ['invItem', 'dateRange'],
        columns: [
          { key: 'movementDate', label: 'Ngày', align: 'left', format: 'date' },
          { key: 'typeLabel', label: 'Loại GD', align: 'left', format: 'text' },
          { key: 'partner', label: 'Diễn giải', align: 'left', format: 'text' },
          { key: 'inQty', label: 'Nhập', align: 'right', format: 'number' },
          { key: 'outQty', label: 'Xuất', align: 'right', format: 'number' },
          { key: 'balance', label: 'Tồn lũy kế', align: 'right', format: 'number' },
        ],
        compute: ({ inventoryMovements = [], filters }) => {
          if (!filters.itemId) return [];
          const start = filters.startDate || '0000-00-00';
          const end = filters.endDate || '9999-99-99';
          const typeLabels: Record<string, string> = {
            opening: 'Tồn đầu kỳ', purchase_in: 'Mua nhập kho', return_in: 'Trả lại kho', issue_to_student: 'Bán học viên',
            issue_to_staff: 'Cấp nhân sự', internal_use: 'Sử dụng nội bộ', adjustment: 'Kiểm kê điều chỉnh', damage: 'Hỏng hóc', loss: 'Mất mát', transfer: 'Chuyển kho',
          };
          // Cùng quy ước delta như báo cáo Nhập–Xuất–Tồn: issue_to_student chờ phát (issued=false) chưa trừ kho.
          const delta = (m: any) => {
            if (m.movementType === 'issue_to_student' && m.issued === false) return 0;
            return (m.toLocationName ? m.quantity : 0) - (m.fromLocationName ? m.quantity : 0);
          };
          const mine = inventoryMovements.filter(m => m.itemId === filters.itemId);
          let opening = 0;
          mine.forEach(m => { if (m.movementDate < start) opening += delta(m); });
          let balance = opening;
          const rows: any[] = [{
            movementDate: filters.startDate || '', typeLabel: 'Tồn đầu kỳ', partner: '—',
            inQty: 0, outQty: 0, balance: opening,
          }];
          mine
            .filter(m => m.movementDate >= start && m.movementDate <= end && delta(m) !== 0)
            .sort((a, b) => a.movementDate.localeCompare(b.movementDate))
            .forEach(m => {
              const d = delta(m);
              balance += d;
              rows.push({
                movementDate: m.movementDate,
                typeLabel: typeLabels[m.movementType] || m.movementType,
                partner: m.studentName ? `HV: ${m.studentName}` : m.staffName ? `NV: ${m.staffName}`
                  : (m.fromLocationName && m.toLocationName ? `${m.fromLocationName} → ${m.toLocationName}` : '—'),
                inQty: d > 0 ? d : 0,
                outQty: d < 0 ? -d : 0,
                balance,
              });
            });
          return rows;
        },
      },
      // #C2 — Giao dịch kho chưa hoàn tất
      {
        id: 'inv_incomplete',
        implemented: true,
        name: 'Giao dịch kho chưa hoàn tất',
        description: 'Các giao dịch bán học viên còn dang dở: chưa thu tiền hoặc đã thu nhưng chờ phát hàng.',
        type: 'detail',
        filters: ['dateRange'],
        columns: [
          { key: 'movementDate', label: 'Ngày', align: 'left', format: 'date' },
          { key: 'studentName', label: 'Học viên', align: 'left', format: 'text' },
          { key: 'itemName', label: 'Mặt hàng', align: 'left', format: 'text' },
          { key: 'quantity', label: 'SL', align: 'right', format: 'number' },
          { key: 'totalAmount', label: 'Thành tiền', align: 'right', format: 'currency' },
          { key: 'payment', label: 'Thu tiền', align: 'left', format: 'text' },
          { key: 'delivery', label: 'Phát hàng', align: 'left', format: 'text' },
        ],
        compute: ({ inventoryMovements = [], filters }) => {
          const start = filters.startDate || '0000-00-00';
          const end = filters.endDate || '9999-99-99';
          return inventoryMovements
            .filter(m => m.movementType === 'issue_to_student')
            .filter(m => m.paymentStatus === 'unpaid' || m.issued === false)
            .filter(m => m.movementDate >= start && m.movementDate <= end)
            .sort((a, b) => b.movementDate.localeCompare(a.movementDate))
            .map(m => ({
              movementDate: m.movementDate,
              studentName: m.studentName || '—',
              itemName: m.itemName,
              quantity: m.quantity,
              totalAmount: m.totalAmount || 0,
              payment: m.paymentStatus === 'paid' ? 'Đã thu' : 'Chưa thu',
              delivery: m.issued ? 'Đã phát' : 'Chờ phát',
            }));
        },
      },
      // #C3 — Bán vật tư theo lớp
      {
        id: 'inv_sales_by_class',
        implemented: true,
        name: 'Bán vật tư theo lớp',
        description: 'Tổng hợp số lượng và doanh thu vật tư bán cho học viên, gom theo lớp đang học.',
        type: 'object',
        filters: ['class', 'dateRange'],
        columns: [
          { key: 'className', label: 'Lớp học', align: 'left', format: 'text' },
          { key: 'count', label: 'Số giao dịch', align: 'right', format: 'number' },
          { key: 'qty', label: 'SL bán', align: 'right', format: 'number' },
          { key: 'revenue', label: 'Doanh thu', align: 'right', format: 'currency' },
        ],
        compute: ({ inventoryMovements = [], students = [], enrollments = [], filters }) => {
          const start = filters.startDate || '0000-00-00';
          const end = filters.endDate || '9999-99-99';
          // Lớp của học viên: ưu tiên enrollment active đầu tiên, fallback className hồ sơ.
          const classOf = (studentId?: string) => {
            if (!studentId) return 'Chưa xếp lớp';
            const active = enrollments.filter(e => e.studentId === studentId && e.isActive);
            if (active.length > 0) return active[0].className;
            const stu = students.find(s => s.id === studentId);
            return stu?.className || 'Chưa xếp lớp';
          };
          const byClass: Record<string, any> = {};
          inventoryMovements
            .filter(m => m.movementType === 'issue_to_student' && (m.totalAmount || 0) > 0)
            .filter(m => m.movementDate >= start && m.movementDate <= end)
            .forEach(m => {
              const cls = classOf(m.studentId);
              if (filters.classId && cls !== filters.classId) return;
              byClass[cls] = byClass[cls] || { className: cls, count: 0, qty: 0, revenue: 0 };
              byClass[cls].count += 1;
              byClass[cls].qty += m.quantity;
              byClass[cls].revenue += m.totalAmount || 0;
            });
          return Object.values(byClass).sort((a: any, b: any) => b.revenue - a.revenue);
        },
      },
      // #C4 — Giao dịch kho theo người thực hiện
      {
        id: 'inv_by_staff',
        implemented: true,
        name: 'Giao dịch kho theo người thực hiện',
        description: 'Tổng hợp số giao dịch kho và doanh thu bán theo người nhập liệu (createdBy). Lọc theo tên người thực hiện.',
        type: 'object',
        filters: ['search', 'dateRange'],
        columns: [
          { key: 'performer', label: 'Người thực hiện', align: 'left', format: 'text' },
          { key: 'count', label: 'Số giao dịch', align: 'right', format: 'number' },
          { key: 'saleCount', label: 'GD bán HV', align: 'right', format: 'number' },
          { key: 'saleRevenue', label: 'Doanh thu bán', align: 'right', format: 'currency' },
        ],
        compute: ({ inventoryMovements = [], filters }) => {
          const start = filters.startDate || '0000-00-00';
          const end = filters.endDate || '9999-99-99';
          const q = (filters.searchQuery || '').toLowerCase().trim();
          const byUser: Record<string, any> = {};
          inventoryMovements
            .filter(m => m.movementDate >= start && m.movementDate <= end)
            .forEach(m => {
              const who = m.createdBy || '(không rõ)';
              if (q && !who.toLowerCase().includes(q)) return;
              byUser[who] = byUser[who] || { performer: who, count: 0, saleCount: 0, saleRevenue: 0 };
              byUser[who].count += 1;
              if (m.movementType === 'issue_to_student' && (m.totalAmount || 0) > 0) {
                byUser[who].saleCount += 1;
                byUser[who].saleRevenue += m.totalAmount || 0;
              }
            });
          return Object.values(byUser).sort((a: any, b: any) => b.count - a.count);
        },
      },
      // #D1 — Nhập hàng theo nhà cung cấp
      {
        id: 'inv_purchase_by_supplier',
        implemented: true,
        name: 'Nhập hàng theo nhà cung cấp',
        description: 'Tổng số lần nhập, số lượng và giá trị nhập kho (purchase_in) gom theo nhà cung cấp trong kỳ.',
        type: 'summary',
        filters: ['dateRange'],
        columns: [
          { key: 'supplierName', label: 'Nhà cung cấp', align: 'left', format: 'text' },
          { key: 'count', label: 'Số lần nhập', align: 'right', format: 'number' },
          { key: 'qty', label: 'SL nhập', align: 'right', format: 'number' },
          { key: 'value', label: 'Giá trị nhập', align: 'right', format: 'currency' },
        ],
        compute: ({ inventoryMovements = [], filters }) => {
          const start = filters.startDate || '0000-00-00';
          const end = filters.endDate || '9999-99-99';
          const bySup: Record<string, any> = {};
          inventoryMovements
            .filter(m => m.movementType === 'purchase_in')
            .filter(m => m.movementDate >= start && m.movementDate <= end)
            .forEach(m => {
              const sup = m.supplierName || '(Không rõ NCC)';
              bySup[sup] = bySup[sup] || { supplierName: sup, count: 0, qty: 0, value: 0 };
              bySup[sup].count += 1;
              bySup[sup].qty += m.quantity;
              bySup[sup].value += m.totalAmount || 0;
            });
          return Object.values(bySup).sort((a: any, b: any) => b.value - a.value);
        },
      },
    ]
  }
];
