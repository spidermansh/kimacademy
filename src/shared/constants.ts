// Hằng số nghiệp vụ dùng chung cho cả frontend và backend.
// Tránh việc lặp lại chuỗi tiếng Việt rải rác (nguồn gốc của lỗi mojibake/sai
// phân loại học phí trước đây). Mọi nơi cần so sánh phân loại doanh thu PHẢI
// import từ đây thay vì viết literal.

/** Danh mục doanh thu là học phí offline — khoản thu này cập nhật sổ cái học phí. */
export const REVENUE_CATEGORY_TUITION_OFFLINE = 'Học phí offline';

/** Kiểm tra một khoản thu có phải học phí offline hay không. */
export function isTuitionRevenue(category: string | undefined | null): boolean {
  return category === REVENUE_CATEGORY_TUITION_OFFLINE;
}

/**
 * Phương thức của giao dịch chuyển số dư nội bộ khi học viên chuyển lớp.
 * Đây KHÔNG phải doanh thu thực — phải loại khỏi mọi phép tính tổng thu.
 */
export const PAYMENT_METHOD_BALANCE_TRANSFER = 'Chuyển số dư';

/** Giao dịch chuyển số dư nội bộ (không tính vào doanh thu). */
export function isInternalTransfer(paymentMethod: string | undefined | null): boolean {
  return paymentMethod === PAYMENT_METHOD_BALANCE_TRANSFER;
}

/** Danh mục doanh thu học phí online — loại khỏi các báo cáo/đối soát offline. */
export const REVENUE_CATEGORY_TUITION_ONLINE = 'Học phí online';

/** Kiểm tra một khoản thu có phải học phí online hay không. */
export function isOnlineTuition(category: string | undefined | null): boolean {
  return category === REVENUE_CATEGORY_TUITION_ONLINE;
}

/** Giá trị trường studyType cho hình thức học online. */
export const STUDY_TYPE_ONLINE = 'Online';

/** Kiểm tra giao dịch/buổi học thuộc hình thức online (theo studyType). */
export function isOnlineStudy(studyType: string | undefined | null): boolean {
  return studyType === STUDY_TYPE_ONLINE;
}
