export type PaymentMethod = "Chuyển khoản" | "Tiền mặt" | "Khác";
export type StudyType = "Trực tiếp" | "Online";
export type RevenueCategory = "Học phí offline" | "Học phí online" | "Sách" | "Đồng phục" | "Lệ phí thi" | "Thu khác";
export type ClassType = "offline" | "online";
export type AttendanceStatus = "present" | "absent" | "excused"; // có mặt / vắng không phép / vắng có phép

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
  createdAt: string;
  updatedAt: string;
}

export interface Class {
  id: string;
  name: string;           // "Big 1", "Big 2"
  type: ClassType;        // offline | online
  schedule: string;       // "Thứ 2, 4, 6 — 18:00"
  teacher: string;
  description: string;
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
