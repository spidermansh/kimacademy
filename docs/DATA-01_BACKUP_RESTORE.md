# Hướng dẫn Backup và Khôi phục dữ liệu thủ công (DATA-01G)

Tài liệu này hướng dẫn chi tiết quy trình sao lưu (backup) và khôi phục (restore) cơ sở dữ liệu của Kim Academy khi xảy ra sự cố trong quá trình import dữ liệu.

---

## 1. Cơ chế sao lưu (Backup)

Mỗi lần chạy script import thật (truyền tham số `--confirm` hoặc `--reset-business-data`), hệ thống sẽ **tự động** sao lưu toàn bộ dữ liệu hiện có trước khi thực hiện bất kỳ thao tác thay đổi nào.

- **Vị trí lưu trữ:** Thư mục `data/backups/` trong thư mục gốc dự án.
- **Tên file backup:** `backup_before_import_YYYYMMDD_HHmmss.json` (ví dụ: `backup_before_import_20260617_110000.json`).
- **Nội dung tệp sao lưu:** Chứa bản chụp cấu trúc dữ liệu JSON của toàn bộ 13 collection nghiệp vụ và hệ thống, bao gồm:
  - `students`: Danh sách học viên.
  - `classes`: Danh sách lớp học.
  - `transactions`: Lịch sử giao dịch thu tiền.
  - `attendance`: Lịch sử điểm danh.
  - `enrollments`: Lịch sử xếp lớp/chuyển lớp học viên.
  - `expenses`: Các khoản chi tiêu.
  - `staff`: Danh sách nhân viên và giáo viên.
  - `teachingLogs`: Nhật ký buổi dạy của giáo viên.
  - `advances`: Các khoản tạm ứng lương.
  - `salaries`: Bảng tính lương nhân viên.
  - `dailyCloses`: Lịch sử đối soát cuối ngày.
  - `notifications`: Các thông báo rủi ro/nhắc nhở hệ thống.
  - `auditLogs`: Nhật ký thay đổi hệ thống.
  - `systemParameters`: Cấu hình tham số hệ thống.
  - `admissionLeads`: Dữ liệu nghiệp vụ tuyển sinh (tệp `data/admission_leads.json`).
  - **Lưu ý đặc biệt:** File backup cũng chứa sao lưu của tài khoản người dùng (`users`), giúp bảo toàn thông tin tài khoản đăng nhập khi thực hiện khôi phục.

---

## 2. Hướng dẫn khôi phục dữ liệu thủ công (Restore)

Nếu quá trình import gặp lỗi nghiêm trọng (ví dụ: mất điện giữa chừng, dữ liệu import bị lỗi logic, hoặc trùng lặp sai), hãy thực hiện quy trình khôi phục thủ công như dưới đây:

### Bước 1: Tắt Server ứng dụng
> [!IMPORTANT]
> Bắt buộc phải tắt server ứng dụng (Vite Dev Server hoặc Server Node.js) trước khi khôi phục để tránh xung đột file ghi đè và lỗi khóa dữ liệu (file locking).
> - Gõ lệnh `Ctrl + C` trên terminal đang chạy server dev/prod để dừng tiến trình.

### Bước 2: Chọn tệp tin Backup
- Tìm tệp tin backup gần nhất hoặc tệp tin trước lúc xảy ra lỗi trong thư mục `data/backups/`.
- Mở tệp backup này để đảm bảo file không bị rỗng hoặc lỗi cú pháp (chứa định dạng JSON hợp lệ bắt đầu bằng `{`).

### Bước 3: Lựa chọn chế độ Khôi phục
Hệ thống hỗ trợ 2 chế độ khôi phục dữ liệu tùy thuộc vào nhu cầu:
- **Chế độ 1: Khôi phục dữ liệu nghiệp vụ (Giữ nguyên tham số hiện tại)**
  - Khôi phục tất cả các file dữ liệu nghiệp vụ (học viên, giao dịch, lớp học, điểm danh, nhân viên, lương tháng, chi phí...).
  - **Bỏ qua** không ghi đè file `system_parameters.json` để giữ nguyên các tham số cấu hình hệ thống hiện tại đang chạy.
- **Chế độ 2: Khôi phục toàn bộ (Full Restore)**
  - Khôi phục tất cả dữ liệu nghiệp vụ và ghi đè file `system_parameters.json` bằng thuộc tính `systemParameters` trong file backup để đồng bộ cấu hình tham số hệ thống cũ.

### Bước 4: Thực hiện Khôi phục dữ liệu

#### Trường hợp 1: Sử dụng Database dạng file JSON cục bộ (Mặc định)
1. Mở thư mục `data/` trong dự án.
2. Đọc nội dung tệp backup `backup_before_import_YYYYMMDD_HHmmss.json`.
3. Thay thế/ghi đè nội dung của từng file tương ứng với các thuộc tính trong file backup:
   - Thuộc tính `students` trong backup $\rightarrow$ Ghi đè vào `data/students.json`
   - Thuộc tính `classes` trong backup $\rightarrow$ Ghi đè vào `data/classes.json`
   - Thuộc tính `transactions` trong backup $\rightarrow$ Ghi đè vào `data/transactions.json`
   - Thuộc tính `attendance` trong backup $\rightarrow$ Ghi đè vào `data/attendance.json`
   - Thuộc tính `enrollments` trong backup $\rightarrow$ Ghi đè vào `data/enrollments.json`
   - Thuộc tính `expenses` trong backup $\rightarrow$ Ghi đè vào `data/expenses.json`
   - Thuộc tính `staff` trong backup $\rightarrow$ Ghi đè vào `data/staff.json`
   - Thuộc tính `teachingLogs` trong backup $\rightarrow$ Ghi đè vào `data/teaching_logs.json`
   - Thuộc tính `advances` trong backup $\rightarrow$ Ghi đè vào `data/salary_advances.json`
   - Thuộc tính `salaries` trong backup $\rightarrow$ Ghi đè vào `data/monthly_salaries.json`
   - Thuộc tính `dailyCloses` trong backup $\rightarrow$ Ghi đè vào `data/daily_closes.json`
   - Thuộc tính `users` trong backup $\rightarrow$ Ghi đè vào `data/users.json` (Bảo đảm giữ lại tài khoản đăng nhập)
   - Thuộc tính `settings` trong backup $\rightarrow$ Ghi đè vào `data/settings.json`
   - Thuộc tính `systemParameters` trong backup $\rightarrow$ Ghi đè vào `data/system_parameters.json` (Để khôi phục cấu hình tham số hệ thống)
   - Thuộc tính `admissionLeads` trong backup $\rightarrow$ Ghi đè vào `data/admission_leads.json` (Khôi phục dữ liệu nghiệp vụ tuyển sinh)

#### Trường hợp 2: Sử dụng Database MongoDB Atlas đám mây
Nếu hệ thống đang cấu hình biến môi trường `MONGODB_URI` chạy trên đám mây:
1. Bạn có thể viết một script khôi phục nhỏ hoặc sử dụng CLI import của dự án để nạp đè tệp JSON sao lưu ngược trở lại database.
2. Hoặc thực hiện thủ công:
   - Dùng các công cụ quản lý cơ sở dữ liệu (ví dụ: MongoDB Compass, Robo 3T).
   - Truy cập database `kim_academy`.
   - Clear (Xóa sạch) dữ liệu trong các collection: `students`, `classes`, `transactions`, `attendance`, `enrollments`, `expenses`, `staff`, `teaching_logs`, `salary_advances`, `monthly_salaries`, `daily_closes`, `users`, `settings`.
   - Import đè mảng dữ liệu tương ứng từ tệp JSON backup vào các collection này.

---

## 3. Cách kiểm tra khôi phục thành công

Sau khi khôi phục xong:
1. Khởi động lại server ứng dụng:
   ```bash
   npm run dev
   ```
2. Mở trình duyệt truy cập `http://localhost:3005`.
3. Đăng nhập bằng tài khoản Admin hiện tại (`admin` / `password123`) $\rightarrow$ Xác nhận tài khoản người dùng đăng nhập bình thường (không bị mất).
4. Vào các menu quản lý lớp học, học viên, tài chính:
   - Xác nhận dữ liệu cũ đã hiển thị đầy đủ và khớp với trạng thái trước phiên import lỗi.
   - Truy cập menu **Báo cáo Thống kê**: Kiểm tra các chỉ số tài chính lũy kế, công nợ học viên khớp chuẩn, không bị lệch số liệu.
