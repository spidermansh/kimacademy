# Biên bản Nghiệm thu & Checkpoint Kỹ thuật: CFG-01 Core — Lõi Tham số hệ thống

Dự án Kim Academy đã hoàn thành chặng triển khai đầu tiên của phân hệ tham số hệ thống. Tài liệu này ghi nhận kết quả nghiệm thu kỹ thuật và phân tích các điểm an toàn vận hành trước khi chuyển tiếp sang **PAY-03 Policy Core**.

---

## 1. Scope đã hoàn thành (CFG-01 Core)

Chúng tôi đã hoàn thành triển khai toàn bộ các yêu cầu lõi của Giai đoạn 1:
- **Interface & Schema:** Định nghĩa cấu trúc `SystemParameter` trong `src/types.ts` và khởi tạo cơ sở dữ liệu cấu hình tại `data/system_parameters.json`.
- **Cơ chế Versioning:** Triển khai các hàm helper trong `db.ts` (`getSystemParameters`, `getEffectiveParameter`, `updateSystemParameter`, `previewParameterChange`) để quản lý các phiên bản tham số hiệu lực theo thời gian (áp dụng `all_time` hoặc `from_date`).
- **REST APIs:** Tạo các endpoint `GET /api/system-parameters`, `POST /api/system-parameters` và `POST /api/system-parameters/preview` trên Express server.
- **Giao diện Cấu hình (UI Settings):** Thêm tab "Tham số hệ thống" trong màn hình Cài đặt, phân quyền chỉ Admin được sửa đổi, có hiển thị panel Preview tác động (dry-run) và yêu cầu bắt buộc ghi lý do thay đổi.
- **Audit Logs:** Ghi log nhật ký hệ thống đầy đủ các hành động tạo/sửa đổi/chia phiên bản tham số cùng với chi tiết giá trị cũ/mới, khoảng thời gian và lý do.
- **Gỡ bỏ Hard-code:** Chuyển đổi toàn bộ các ngưỡng cảnh báo và dung sai kiểm tra dữ liệu import sang đọc động từ tham số cấu hình.
- **Sửa lỗi API JSON:** Đã khắc phục triệt để lỗi frontend nhận HTML thay vì JSON (lỗi `Unexpected token '<'`). Nguyên nhân là do tiến trình server cũ chạy từ trước đó chưa được reload để cập nhật các API route mới nên request bị rơi vào catch-all fallback và trả về `index.html`. Tiến trình server cũ đã được giải phóng và khởi động lại, đồng thời các route `/api/system-parameters*` được đảm bảo luôn trả về JSON (bao gồm cả các mã lỗi xác thực 401/403).

---

## 2. Các điểm bảo vệ an toàn & Nghiệp vụ đã rà soát

### A. Bảo vệ dữ liệu cấu hình khi Reset/Import (CFG-01-SAFETY-CHECK)
- **Reset nghiệp vụ an toàn:** Cờ `--reset-business-data` trong script import chỉ làm sạch dữ liệu giao dịch nghiệp vụ phát sinh (gồm học viên, lớp học, giao dịch, điểm danh, xếp lớp, nhân viên, nhật ký dạy, tạm ứng, lương tháng, chi phí, thông báo, nhật ký hệ thống). Tuyệt đối **không xóa** tài khoản người dùng (`users`) và cấu hình tham số hệ thống (`system_parameters.json`).
- **Tích hợp Backup/Restore:**
  - Quy trình tự động backup trước khi import đã được cập nhật để ghi nhận đầy đủ thuộc tính `systemParameters` lấy từ `getSystemParameters()`.
  - Quy trình restore (khôi phục) trong `db.ts` đã được tích hợp đầy đủ 16 collections (bao gồm cả `system_parameters`, `staff`, `monthly_salaries`, `expenses`,...).
  - Hàm restore trả về thông điệp phản hồi rõ ràng cho người dùng biết có khôi phục cấu hình tham số hệ thống hay không:
    - *Có tham số:* "Khôi phục dữ liệu thành công! Đã khôi phục cấu hình tham số hệ thống (X bản ghi)."
    - *Không có tham số (tệp sao lưu cũ):* "Khôi phục dữ liệu thành công! Không tìm thấy cấu hình tham số hệ thống trong tệp sao lưu, giữ nguyên tham số hiện tại."
  - Đã cập nhật hướng dẫn khôi phục thủ công trong tài liệu [docs/DATA-01_BACKUP_RESTORE.md](file:///c:/Users/Home/.gemini/antigravity-ide/scratch/QLTrungtam/docs/DATA-01_BACKUP_RESTORE.md) chi tiết theo các thay đổi này.

### B. Chuẩn hóa thuật ngữ và Báo cáo (PAY-05A-PLAN)
- **Hạch toán chi phí lương P&L (`payrollCost`):** Được tính toán và thể hiện dựa trên **`grossSalary`** (lương gộp trước thuế và tạm ứng), đảm bảo phản ánh chuẩn xác chi phí nhân sự theo kế toán dồn tích (Accrual basis).
- **Lương thực nhận / Còn thanh toán (`salaryNetPayable`):** Được tính dựa trên `netSalary` (sau khi khấu trừ thuế và tạm ứng). Hệ thống đã sửa nhãn tại báo cáo tổng quan `center_finance_summary` từ "Chi phí trả lương nhân sự" thành **"Còn thanh toán / Thực nhận"** để tránh nhầm lẫn với chi phí dồn tích.
- **Hạn chế báo cáo dòng tiền lương:** Bổ sung ghi chú cảnh báo trực quan tại báo cáo tài chính tổng quan: *(Dòng tiền lương chi tiết sẽ được chuẩn hóa ở PAY-05)* để người quản trị biết số liệu dòng tiền lương thực tế (bao gồm thuế giữ hộ và tạm ứng đã phát) sẽ được hoàn thiện đầy đủ ở chặng tiếp theo.

### C. Logic Tạm ứng chưa thu hồi (Advance Carry Over)
- **Cơ chế hiện tại:**
  - Tạm ứng lương chỉ ghi nhận vào `salary_advances.json` dưới dạng các khoản chi ứng thực tế phát sinh trong tháng. Hoàn toàn **không tự động tạo operating expense** trong `expenses.json` và không phát sinh trùng lặp.
  - Logic tính lương (`calculateMonthlySalary` ở `db.ts` và inline edit ở `SalaryDashboard.tsx`) thực hiện trừ lương khả dụng tối đa bằng số đã ứng trong tháng. Phần ứng vượt (`advanceCarryOver`) được tính toán và hiển thị rõ ràng trên giao diện dưới dạng cảnh báo dấu chấm than kèm tooltip: `⚠️ +[số tiền] (Ứng vượt: Xđ → tháng sau)`.
  - **Khấu trừ kỳ sau:** Hiện tại hệ thống **không tự động trừ** số dư ứng vượt của tháng trước vào bảng lương tháng sau. Mọi hoạt động khấu trừ lũy kế hoặc ghi nhận thu hồi phải do kế toán thao tác thủ công (bằng cách tạo bản ghi ứng âm hoặc thu hồi thực tế), đảm bảo tính minh bạch, không phát sinh giao dịch ảo hoặc tự động trừ âm thầm mà không có giải trình trên UI.

---

## 3. Các kiểm thử đã thực hiện thành công (YÊU CẦU 5)

Hệ thống đã kiểm chứng thành công các lệnh kiểm thử sau:
1. **Linter:** `npm run lint` hoàn thành biên dịch không lỗi TypeScript.
2. **Build:** `npm run build` tạo bundle Client và Server thành công.
3. **Dry-run Tuition Balance Import:** `npm run import:data -- --type tuition_balances --file data-templates/sample-import/tuition_error.xlsx --dry-run` chạy thành công, tự động cảnh báo lệch dung sai số dư ban đầu dựa trên tham số `openingBalanceToleranceSessions` động.
4. **Dry-run Reset & Import:** `npm run import:data -- --type staff --file data-templates/sample-import/staff.xlsx --reset-business-data --dry-run` chạy thử chế độ reset dữ liệu nghiệp vụ hoàn tất thành công mà không gây ảnh hưởng đến dữ liệu thực trong tệp JSON.

---

## 4. Rủi ro còn lại & Hướng đi tiếp theo

- **Rủi ro còn lại:** Dòng tiền chi thực tế liên quan lương trên báo cáo dòng tiền mặt (`center_finance_summary`) hiện tại chưa tổng hợp các dòng tiền tạm ứng thực tế (nằm ngoài `expenses.json`) và dòng chi nộp thuế TNCN, bảo hiểm hộ nhân viên.
- **Giải pháp:** Tách hoàn toàn nghiệp vụ tối ưu dòng tiền lương sang task **PAY-05 (Chuẩn hóa kế toán lương & dòng tiền)** ở các sprint sau.
- **Tính sẵn sàng:** Đủ điều kiện kỹ thuật và nghiệp vụ an toàn để chuyển sang thiết kế chính sách lương linh hoạt tại **PAY-03 Policy Core**.
