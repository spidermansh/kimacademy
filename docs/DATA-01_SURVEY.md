# Khảo sát cấu trúc Database & Thiết kế import dữ liệu (DATA-01B & DATA-01C)

Tài liệu này tổng hợp kết quả rà soát cấu trúc cơ sở dữ liệu hiện tại, các trường bắt buộc/tùy chọn của từng bảng (entity), các ràng buộc liên kết và rủi ro nếu nhập sai dữ liệu.

---

## 1. Kết quả khảo sát cấu trúc dữ liệu hiện tại (DATA-01B)

### 1.1. Nhân sự (Staff) - Collection `staff` / File `staff.json`
- **Khóa chính (PK):** `id` (string)
- **Các trường bắt buộc:**
  - `name`: Họ tên (string)
  - `role`: Vai trò (`'teacher'` hoặc `'office'`)
  - `baseSalary`: Lương cứng (number, defaults to 0)
  - `ratePerSession`: Đơn giá/buổi dạy (number, defaults to 0)
  - `startDate`: Ngày bắt đầu làm việc (string, định dạng `YYYY-MM-DD`)
  - `status`: Trạng thái (`'active'` hoặc `'inactive'`)
- **Trường có thể bỏ trống:** `phone`, `bankAccount`, `bankName`, `notes`, `linkedUserId`.
- **Vai trò nghiệp vụ:** Đơn giá `ratePerSession` được dùng để tính toán lương giáo viên hàng tháng dựa trên số buổi dạy thực tế trong bảng điểm danh.

### 1.2. Lớp học (Class) - Collection `classes` / File `classes.json`
- **Khóa chính (PK):** `id` (string)
- **Các trường bắt buộc:**
  - `name`: Tên lớp học (string)
  - `type`: Loại lớp (`'offline'` hoặc `'online'`, mặc định `'offline'`)
  - `defaultFee`: Học phí mặc định/buổi (number, default 0)
  - `status`: Trạng thái (`'active'` | `'suspended'` | `'ended'`)
- **Trường có thể bỏ trống:** `schedule` (chuỗi text lịch học), `teacherId` (khóa ngoại liên kết Staff), `teacher` (tên giáo viên), `room`, `maxStudents`, `scheduleDays`, `scheduleTime`.
- **Vai trò nghiệp vụ:** `defaultFee` là cơ sở để thiết lập học phí mặc định cho học viên khi xếp vào lớp này.

### 1.3. Học viên (Student) - Collection `students` / File `students.json`
- **Khóa chính (PK):** `id` (string)
- **Các trường bắt buộc:**
  - `name`: Họ tên (string)
  - `vietnameseName`: Tên tiếng Việt (string)
  - `englishName`: Tên tiếng Anh (string)
  - `vietAnhName`: Tên ghép Việt Anh (string)
  - `parentPhone`: Số điện thoại phụ huynh (string)
  - `feePerSession`: Học phí mỗi buổi học của học viên (number)
  - `status`: Trạng thái (`'active'` | `'suspended'` | `'left'`)
  - `enrollDate`: Ngày nhập học (string, `YYYY-MM-DD`)
- **Trường có thể bỏ trống:** `className` (tên lớp đang học), `gender`, `birthYear`, `parentEmail`, `address`, `notes`, `feeHistory`.
- **Vai trò nghiệp vụ:** `feePerSession` được dùng trực tiếp để tính chi phí thực tế cho mỗi buổi điểm danh (`present`/`absent`) của học viên.

### 1.4. Giao dịch (Transaction) - Collection `transactions` / File `transactions.json`
- **Khóa chính (PK):** `id` (string)
- **Các trường bắt buộc:**
  - `paymentDate`: Ngày thanh toán (string, `YYYY-MM-DD`)
  - `amount`: Số tiền (number)
  - `paymentMethod`: Hình thức thanh toán (string)
  - `revenueCategory`: Loại khoản thu (string)
  - `isReconciled`: Đã đối soát chưa (boolean, mặc định `false`)
  - `isInvoiced`: Đã xuất hóa đơn chưa (boolean, mặc định `false`)
- **Trường có thể bỏ trống:** `studentId` (khóa ngoại liên kết Học viên), `studentName` (tên học viên), `className` (tên lớp), `studyType` (`'Trực tiếp'` | `'Online'`), `term`, `senderName`, `notes`, `source`, `importBatchId`.
- **Vai trò nghiệp vụ:** Giao dịch có `revenueCategory` bằng `Học phí offline` và có `studentId` hợp lệ được dùng để tính tổng số tiền học phí học viên đã đóng (`totalPaidOffline`), từ đó tính ra số dư học phí còn lại của học viên.

### 1.5. Điểm danh (AttendanceRecord) - Collection `attendance` / File `attendance.json`
- **Khóa chính (PK):** `id` (string)
- **Các trường bắt buộc:**
  - `date`: Ngày học (string, `YYYY-MM-DD`)
  - `classId`: ID lớp học (string)
  - `className`: Tên lớp học (string)
  - `studentId`: ID học viên (string)
  - `studentName`: Tên học viên (string)
  - `status`: Trạng thái điểm danh (`'present'` | `'absent'` | `'excused'`)
  - `sessionsDeducted`: Số buổi khấu trừ (number, `present`/`absent` = 1, `excused` = 0)
- **Trường có thể bỏ trống:** `note`, `teacherId`, `teacherName`, `isSubstitute`, `source`, `importBatchId`.
- **Vai trò nghiệp vụ:** Trạng thái `present` và `absent` khấu trừ buổi học và trực tiếp nhân với `feePerSession` để tính chi phí học phí đã sử dụng của học viên. Trạng thái `excused` không trừ buổi, không phát sinh chi phí.

### 1.6. Chi phí (Expense) - Collection `expenses` / File `expenses.json`
- **Khóa chính (PK):** `id` (string)
- **Các trường bắt buộc:**
  - `date`: Ngày phát sinh chi phí (string, `YYYY-MM-DD`)
  - `category`: Danh mục chi (string)
  - `amount`: Số tiền (number)
  - `paymentMethod`: Hình thức thanh toán (string)
  - `createdBy`: Người nhập (string)
- **Trường có thể bỏ trống:** `description`, `isRecurring`, `recurringNote`, `approvedBy`, `notes`.
- **Vai trò nghiệp vụ:** Được dùng để tính chi phí vận hành trong báo cáo tài chính tháng.

---

## 2. Các ràng buộc liên kết quan trọng giữa các Entity
- **Học viên $\rightarrow$ Lớp học:** Trường `className` của Học viên phải tương ứng với tên lớp học trong danh mục Lớp học.
- **Lớp học $\rightarrow$ Nhân sự:** Trường `teacherId` của Lớp học phải tương ứng với một bản ghi giáo viên có trong danh mục Nhân sự (`role = 'teacher'`).
- **Giao dịch $\rightarrow$ Học viên:** Đối với giao dịch `Học phí offline`, trường `studentId` phải trùng khớp với mã học viên đã tồn tại. Tên học viên và lớp học sẽ được resolve tự động từ ID học viên.
- **Điểm danh $\rightarrow$ Học viên & Lớp học:** Trường `studentId` và `classId` phải tồn tại trong danh mục tương ứng. Học viên điểm danh bắt buộc phải nằm trong danh sách học viên của lớp học đó.

---

## 3. Rủi ro nếu nhập sai dữ liệu khi Import
1. **Sai lệch `studentId`:** Nếu import giao dịch/điểm danh bằng tên học viên thay vì `studentId` hoặc sử dụng ID sai, công thức học phí lũy kế sẽ tính sai hoàn toàn, dẫn đến học viên bị âm tiền ảo hoặc báo nợ sai.
2. **Sai định dạng ngày tháng:** Định dạng ngày không chuẩn (ví dụ `MM/DD/YYYY` thay vì `YYYY-MM-DD` hoặc `DD/MM/YYYY`) sẽ phá vỡ bộ lọc ngày tháng và làm các báo cáo tài chính tháng/điểm danh vắng mặt lấy sai khoảng thời gian.
3. **Mất an toàn dữ liệu do trùng lặp:** Nếu tự động ghi đè hoặc tự động khớp trùng lặp sai (ví dụ trùng tên nhưng thực chất là 2 học viên khác nhau), dữ liệu cũ sẽ bị ghi đè gây mất mát dữ liệu nghiêm trọng.
4. **Sai lệch chênh lệch số dư đầu kỳ:** Nếu số buổi còn lại nhập trong file Excel không khớp với số tiền đã đóng và số buổi đã học quy đổi thực tế, bảng tính học phí sẽ bị lệch số liệu ngay sau ca học đầu tiên.

---

## 4. Danh sách các nhóm dữ liệu cần import & Thứ tự import (DATA-01C)
Trình tự import bắt buộc để đảm bảo toàn vẹn dữ liệu:
1. **Nhân sự / giáo viên (Staff)**
2. **Lớp học (Classes)**
3. **Học viên (Students)**
4. **Số dư học phí ban đầu (Tuition Balances)**
5. **Giao dịch thu tiền phát sinh (Transactions)**
6. **Điểm danh thật (Attendance)**
7. **Chi phí (Expenses)**
