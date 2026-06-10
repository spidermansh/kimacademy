export type PaymentMethod = "Chuyển khoản" | "Tiền mặt" | "Khác";
export type StudyType = "Trực tiếp" | "Online";
export type RevenueCategory = "Học phí offline" | "Học phí online" | "Sách" | "Đồng phục" | "Lệ phí thi" | "Thu khác";

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
