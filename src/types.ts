export type PaymentMethod = string; // Ví dụ: 'Tiền mặt', 'Chuyển khoản', 'Momo'... (cấu hình động từ Settings)
export type StudyType = "Trực tiếp" | "Online";
export type RevenueCategory = string; // Ví dụ: 'Học phí offline', 'Sách'... (cấu hình động từ Settings)
export type ClassType = "offline" | "online";
export type AttendanceStatus = "present" | "absent" | "excused"; // có mặt / vắng không phép / vắng có phép

// Cấu hình cài đặt trung tâm (lưu trong collection settings)
export interface AppSettings {
  centerName: string;       // Tên trung tâm (hiển thị trên sidebar)
  logoUrl: string;          // URL hoặc base64 logo
  phone: string;            // Số điện thoại
  address: string;          // Địa chỉ
  feeTypes: string[];       // Danh sách loại khoản thu
  paymentMethods: string[]; // Danh sách hình thức thanh toán
}

export interface TransactionEditLog {
  editedBy: string;    // Tên người chỉnh sửa
  editedAt: string;    // Thời gian chỉnh sửa (ISO string)
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface Transaction {
  id: string;
  createdAt: string;
  paymentDate: string;
  studentName: string;
  className: string;
  studyType?: StudyType;
  term: string;
  amount: number;
  paymentMethod: PaymentMethod;
  revenueCategory: RevenueCategory;
  senderName: string; // Tên người chuyển khoản nếu có
  notes: string;
  isReconciled: boolean; // Bước 4: Đối chiếu
  isInvoiced: boolean;   // Bước 6: Kế toán xuất HĐ
  editHistory?: TransactionEditLog[]; // Lịch sử chỉnh sửa
}

export interface FeeChangeLog {
  changedBy: string;      // Tên người thay đổi
  changedAt: string;      // Thời gian (ISO string)
  oldFee: number;         // Học phí cũ
  newFee: number;         // Học phí mới
  mode: 'retroactive' | 'prospective'; // 'retroactive' = áp dụng toàn bộ, 'prospective' = chỉ từ bây giờ
}

export interface Student {
  id: string;
  name: string;
  vietnameseName: string;
  englishName: string;
  vietAnhName: string;
  className: string;
  gender: string;
  birthYear: number;
  parentPhone: string;
  feePerSession: number; // Học phí mỗi buổi học (VD: 87500)
  feeHistory?: FeeChangeLog[]; // Lịch sử thay đổi học phí
  status?: 'active' | 'suspended' | 'left'; // 🟢 Đang học / 🟡 Tạm nghỉ / 🔴 Nghỉ
  enrollDate?: string;                     // Ngày nhập học (YYYY-MM-DD)
  parentEmail?: string;                    // Email phụ huynh
  address?: string;                        // Địa chỉ
  notes?: string;                          // Ghi chú nội bộ
  createdAt: string;
  updatedAt: string;
}

export interface Class {
  id: string;
  name: string;           // "Big 1", "Big 2"
  type: ClassType;        // offline | online
  schedule: string;       // "Thứ 2, 4, 6 — 18:00"
  teacher: string;        // Tên GV (backward compat / display)
  teacherId?: string;     // ID từ StaffMember — liên kết chính
  description: string;
  room?: string;          // Phòng học
  maxStudents?: number;   // Sĩ số tối đa
  status?: 'active' | 'suspended' | 'ended'; // Trạng thái lớp
  defaultFee?: number;    // Học phí mặc định/buổi
  scheduleDays?: string[]; // Thứ học trong tuần
  scheduleTime?: string;   // Khung giờ học
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;           // "2025-06-10"
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  // present → trừ 1 buổi; absent → trừ 1 buổi; excused → không trừ
  sessionsDeducted: number;
  note?: string;          // Ghi chú lý do vắng
  teacherId?: string;     // GV thực tế dạy buổi này
  teacherName?: string;   // Tên GV (display)
  isSubstitute?: boolean; // Buổi có GV dạy thay
  createdAt: string;
}

// Ghi nhận giai đoạn học viên đăng ký lớp (hỗ trợ chuyển lớp)
export interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  className: string;         // Tên lớp
  feePerSession: number;     // HP/buổi riêng của giai đoạn này
  startDate: string;         // Ngày bắt đầu (YYYY-MM-DD)
  endDate?: string;          // Ngày kết thúc (undefined = đang học)
  isActive: boolean;         // Giai đoạn đang hoạt động
  transferNote?: string;     // Lý do chuyển lớp
  createdAt: string;
}

// Tổng hợp học phí cho từng học viên (computed)
export interface TuitionSummary {
  studentId: string;
  studentName: string;
  className: string;           // lớp hiện tại
  feePerSession: number;
  totalPaidOffline: number;    // Tổng tiền đóng học phí offline
  totalCostUsed: number;       // Tiền đã dùng (tính theo từng giai đoạn)
  moneyRemaining: number;      // Tiền còn lại
  totalSessionsBought: number; // Tổng buổi đã mua (tương đương tiền đóng)
  totalSessionsUsed: number;   // Buổi đã học (present + absent) TOÀN giai đoạn
  sessionsRemaining: number;   // Buổi còn lại tính theo lớp hiện tại
  enrollments?: Enrollment[];  // Lịch sử các giai đoạn học
}

// Sprint 4.3 — Notification Center
export type NotificationType = 'fee_warning' | 'attendance' | 'system' | 'reminder' | 'todo';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;              // Emoji icon
  isRead: boolean;
  createdAt: string;          // ISO string
  link?: string;              // Tab to navigate to
  studentId?: string;         // Related student
  studentName?: string;       // Related student name
  priority?: 'low' | 'medium' | 'high';
}

// ─── Staff Management Module ──────────────────────────────────────────────────

export interface StaffMember {
  id: string;
  name: string;
  role: 'teacher' | 'office';      // Giáo viên | Nhân viên Văn phòng
  phone: string;
  linkedUserId?: string;            // Liên kết tài khoản user (nếu có)
  baseSalary: number;               // Lương cứng/tháng (học vụ cho GV, cơ bản cho VP)
  ratePerSession: number;           // Lương/buổi dạy (chỉ GV, VP = 0)
  bankAccount?: string;             // Số tài khoản ngân hàng
  bankName?: string;                // Tên ngân hàng
  startDate: string;                // Ngày bắt đầu làm việc
  status: 'active' | 'inactive';    // Đang làm | Đã nghỉ
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeachingLog {
  id: string;
  staffId: string;
  staffName: string;
  date: string;                     // YYYY-MM-DD
  className: string;                // Tên lớp đã dạy
  classId?: string;                 // Liên kết Class.id
  sessions: number;                 // Số buổi (thường = 1)
  isSubstitute?: boolean;           // true = dạy thay
  originalTeacherId?: string;       // ID GV chính bị thay
  originalTeacherName?: string;     // Tên GV chính
  source?: 'manual' | 'auto';       // 'auto' = tạo từ điểm danh
  note?: string;
  createdAt: string;
}

export interface SalaryAdvance {
  id: string;
  staffId: string;
  staffName: string;
  amount: number;
  date: string;                     // YYYY-MM-DD
  reason?: string;
  approvedBy?: string;              // Người duyệt
  createdAt: string;
}

export type SalaryStatus = 'draft' | 'confirmed' | 'paid';

export interface MonthlySalary {
  id: string;
  staffId: string;
  staffName: string;
  month: string;                    // YYYY-MM
  role: 'teacher' | 'office';
  // GV fields:
  totalSessions: number;            // Tổng buổi dạy trong tháng
  ratePerSession: number;           // Đơn giá/buổi
  teachingIncome: number;           // = totalSessions × ratePerSession
  // Common fields:
  baseSalary: number;               // Lương cứng (học vụ / cơ bản)
  otherIncome: number;              // Thu nhập khác
  kpiDeduction: number;             // Trừ KPI (chủ yếu VP)
  grossSalary: number;              // Thành tiền
  taxRate: number;                  // Thuế suất (mặc định 10%)
  taxAmount: number;                // Thuế TNCN = taxRate × grossSalary
  totalAdvance: number;             // Tổng ứng trong tháng
  advanceApplied?: number;          // Số tiền ứng thực trừ (≤ lương khả dụng)
  advanceCarryOver?: number;        // Ứng vượt → carry-over sang tháng sau
  netSalary: number;                // = grossSalary - taxAmount - advanceApplied (≥ 0)
  status: SalaryStatus;
  notes?: string;
  createdAt: string;
}

