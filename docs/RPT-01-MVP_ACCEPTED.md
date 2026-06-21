# Checkpoint Nghiệm thu Phân hệ Báo cáo RPT-01-MVP

Tài liệu này ghi nhận việc nghiệm thu và hoàn thiện Phân hệ Báo cáo (RPT-01-MVP) của trung tâm học tập Kim Academy.

- **Ngày nghiệm thu:** 17/06/2026
- **Trạng thái:** ĐÃ NGHIỆM THU RPT-01-MVP

---

## 1. Danh sách 5 báo cáo ưu tiên đã triển khai và kiểm thử thành công

1. **`center_finance_summary` (Báo cáo tổng hợp tài chính tháng)**
   - **Chỉ tiêu bao gồm:** Thực thu học phí/thu khác, chi phí vận hành, lương giáo viên/nhân sự, tổng chi thực tế, lợi nhuận dòng tiền và lợi nhuận thực tế.
   - **Ghi chú:** Có kèm ghi chú công thức nghiệp vụ tài chính.
   
2. **`tuition_collected_summary` (Báo cáo học phí đã thu)**
   - **Tính năng:** Lọc theo tháng, lớp học, học viên và hình thức thanh toán.
   - **Ràng buộc:** Chỉ tính toán dựa trên các giao dịch `Học phí offline` có `studentId` hợp lệ. Loại bỏ hoàn toàn việc ghép bằng `studentName`.

3. **`tuition_debt_summary` / `student_debt_detail` (Báo cáo công nợ học viên)**
   - **Tính năng:** Hiển thị công nợ/buổi học còn lại của học viên.
   - **Ràng buộc:** Tính toán strict theo `studentId`. Hỗ trợ hiển thị đúng học viên âm tiền (nợ học phí) hoặc hết số buổi.

4. **`attendance_by_class_detail` (Báo cáo điểm danh theo lớp)**
   - **Tính năng:** Thống kê chuyên cần của học viên theo lớp (Tổng số buổi, Có mặt, Vắng có phép, Vắng không phép, Tỷ lệ chuyên cần).
   - **Nghiệp vụ:** Buổi học `excused` (vắng có phép) không tính vào doanh thu thực học phí. Buổi học `present` và `absent` (vắng không phép) có tính doanh thu thực học phí.

5. **`reconcile_daily_summary` (Báo cáo đối soát cuối ngày)**
   - **Tính năng:** Thống kê các ca chốt đối soát cuối ngày (Trạng thái, Người thực hiện, Tổng thu, Tổng chi, Chênh lệch quỹ, Doanh thu thực học phí, Số lỗi chặn blocking, Số cảnh báo rủi ro).

---

## 2. Danh sách các file chính đã sửa đổi/tạo mới

- [reports.ts](file:///c:/Users/Home/.gemini/antigravity-ide/scratch/QLTrungtam/src/business/reports.ts): Khai báo registry trung tâm, định nghĩa cột, bộ lọc động và logic tính toán của 5 báo cáo chính. 37 báo cáo còn lại được cấu hình cờ `implemented: false`.
- [ReportsDashboard.tsx](file:///c:/Users/Home/.gemini/antigravity-ide/scratch/QLTrungtam/src/components/ReportsDashboard.tsx): Xây dựng giao diện Report Center theo cấu trúc CMIS (Cột trái chọn nhóm, thanh tab trên chọn loại, cột giữa chọn báo cáo, cột phải chọn bộ lọc, vùng dưới hiện bảng dữ liệu và nút xuất Excel). Khắc phục triệt để lỗi nén chiều cao giao diện (squeezed to 0px).
- [App.tsx](file:///c:/Users/Home/.gemini/antigravity-ide/scratch/QLTrungtam/src/App.tsx): Tinh gọn sidebar, gộp 12 tab báo cáo cũ thành 1 tab duy nhất: **"Báo cáo Thống kê"**.

---

## 3. Kết quả các lệnh kiểm tra

- **Seed Demo Data:** Lệnh `npm run seed:demo -- --confirm` hoạt động bình thường, tạo dữ liệu mẫu sạch và phong phú.
- **Lint Check:** Lệnh `npm run lint` (`tsc --noEmit`) pass hoàn toàn không có lỗi cú pháp hoặc kiểu dữ liệu.
- **Build Production:** Lệnh `npm run build` pass thành công, xuất bundle tối ưu hóa và server chạy bình thường.

---

## 4. Ghi chú & Định hướng tiếp theo

- **Giới hạn phạm vi:** Không triển khai thêm 37 báo cáo phụ trợ ngoài MVP ở thời điểm này để giữ hệ thống tinh gọn, tối ưu. Các báo cáo chưa triển khai được gray-out và khóa click trên giao diện.
- **Bước tiếp theo:** Chuyển sang phase **DATA-01** để xây dựng quy trình import Excel an toàn, chuẩn bị nạp dữ liệu thật của trung tâm.
