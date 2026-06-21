# Đặc tả kỹ thuật nâng cấp toàn hệ thống (SYSTEM-UPGRADE-SPEC)

Tài liệu này đóng vai trò là cẩm nang kỹ thuật (Developer Handbook) mô tả chi tiết kiến trúc, sơ đồ cơ sở dữ liệu quan hệ, thiết kế API, thuật toán tính toán báo cáo và các tiêu chuẩn tự động hóa phục vụ cho việc triển khai nâng cấp toàn diện hệ thống Kim Academy.

---

## 1. Sơ đồ cơ sở dữ liệu quan hệ mới (Database Schema Design)

Dưới đây là đặc tả sơ đồ database quan hệ PostgreSQL sử dụng Prisma ORM làm đại diện. Toàn bộ các bảng (Entity) đều được thiết lập khóa chính (PK), khóa ngoại (FK) và các chỉ mục (Index) tối ưu.

```mermaid
erDiagram
    User ||--|| StaffMember : "liên kết qua staffId"
    StaffMember ||--o{ Class : "phụ trách chính (teacherId)"
    StaffMember ||--o{ TeachingLog : "chấm công dạy"
    StaffMember ||--o{ SalaryAdvance : "tạm ứng lương"
    StaffMember ||--o{ MonthlySalary : "bảng lương tháng"
    Class ||--o{ Student : "xếp lớp"
    Class ||--o{ Enrollment : "lịch sử xếp lớp"
    Class ||--o{ AttendanceRecord : "nhật ký điểm danh"
    Student ||--o{ Enrollment : "lịch sử học"
    Student ||--o{ AttendanceRecord : "nhật ký điểm danh"
    Student ||--o{ Transaction : "đóng phí (studentId)"
    Student ||--|| TuitionLedger : "lưu số dư học phí"
    Student ||--|| AdmissionLead : "chuyển đổi từ lead"
```

### Chi tiết các bảng dữ liệu

#### 1. Bảng `User` (Tài khoản người dùng)
* Lưu trữ thông tin đăng nhập và vai trò phân quyền.
* **Fields:**
  * `id`: VARCHAR(30) [PK]
  * `username`: VARCHAR(50) [Unique, Indexed]
  * `password`: VARCHAR(255) (Băm bằng Bcrypt)
  * `name`: VARCHAR(100)
  * `role`: VARCHAR(30) (Ví dụ: `'admin'`, `'accountant'`, `'receptionist'`, `'teacher'`)
  * `staffId`: VARCHAR(30) [FK -> StaffMember.id, Nullable]
  * `createdAt`: TIMESTAMP [Default: NOW()]
  * `updatedAt`: TIMESTAMP [Default: NOW()]

#### 2. Bảng `StaffMember` (Hồ sơ nhân sự)
* Lưu thông tin nhân sự và cấu hình tính lương/thuế/bảo hiểm.
* **Fields:**
  * `id`: VARCHAR(30) [PK]
  * `name`: VARCHAR(100)
  * `role`: VARCHAR(20) (`'teacher'` | `'office'`)
  * `phone`: VARCHAR(20) [Nullable]
  * `baseSalary`: DECIMAL(12,2) [Default: 0.0] (Lương cứng hàng tháng)
  * `ratePerSession`: DECIMAL(12,2) [Default: 0.0] (Lương mỗi buổi dạy - chỉ GV)
  * `otherMonthlyAllowance`: DECIMAL(12,2) [Default: 0.0] (Phụ cấp cố định)
  * `otherMonthlyAllowanceNote`: TEXT [Nullable]
  * `bankAccount`: VARCHAR(50) [Nullable]
  * `bankName`: VARCHAR(100) [Nullable]
  * `startDate`: DATE (Định dạng `YYYY-MM-DD`)
  * `status`: VARCHAR(20) (`'active'` | `'inactive'`)
  * `notes`: TEXT [Nullable]
  * **Cấu hình Thuế & Bảo hiểm (Mới):**
    * `taxMethod`: VARCHAR(30) [Default: `'fixed_percent'`] (`'fixed_percent'` | `'progressive'` | `'none'` | `'manual_amount'`)
    * `taxMethodValue`: DECIMAL(12,2) [Default: 10.0] (Tỷ lệ phần trăm cố định hoặc số tiền thuế cố định hàng tháng)
    * `dependentsCount`: INT [Default: 0] (Số người phụ thuộc để tính giảm trừ gia cảnh)
    * `applySocialInsurance`: BOOLEAN [Default: false] (Đóng BHXH)
    * `applyHealthInsurance`: BOOLEAN [Default: false] (Đóng BHYT)
    * `applyUnemploymentInsurance`: BOOLEAN [Default: false] (Đóng BHTN)
    * `insuranceBaseSalary`: DECIMAL(12,2) [Nullable] (Mức lương đóng bảo hiểm, nếu trống sẽ lấy baseSalary)
  * `createdAt`: TIMESTAMP [Default: NOW()]
  * `updatedAt`: TIMESTAMP [Default: NOW()]

#### 3. Bảng `Class` (Lớp học)
* **Fields:**
  * `id`: VARCHAR(30) [PK]
  * `name`: VARCHAR(50) [Unique]
  * `type`: VARCHAR(20) [Default: `'offline'`] (`'offline'` | `'online'`)
  * `schedule`: VARCHAR(100) [Nullable] (Ví dụ: "Thứ 2, 4, 6 - 18:00")
  * `teacherId`: VARCHAR(30) [FK -> StaffMember.id, Nullable, Indexed]
  * `room`: VARCHAR(50) [Nullable]
  * `maxStudents`: INT [Nullable]
  * `status`: VARCHAR(20) [Default: `'active'`] (`'active'` | `'suspended'` | `'ended'`)
  * `defaultFee`: DECIMAL(12,2) [Default: 0.0] (Học phí mặc định/buổi)
  * `scheduleDays`: JSON (Mảng các thứ học, ví dụ `["T2", "T4", "T6"]`)
  * `scheduleTime`: VARCHAR(10) [Nullable] (Khung giờ bắt đầu học, ví dụ `"18:00"`)
  * `createdAt`: TIMESTAMP [Default: NOW()]
  * `updatedAt`: TIMESTAMP [Default: NOW()]

#### 4. Bảng `Student` (Hồ sơ học viên)
* **Fields:**
  * `id`: VARCHAR(30) [PK]
  * `name`: VARCHAR(100) (Tên chuẩn hóa để tìm kiếm nhanh)
  * `vietnameseName`: VARCHAR(100)
  * `englishName`: VARCHAR(100)
  * `vietAnhName`: VARCHAR(150)
  * `className`: VARCHAR(50) [Nullable, FK -> Class.name]
  * `gender`: VARCHAR(10) [Nullable]
  * `birthYear`: INT [Nullable]
  * `parentPhone`: VARCHAR(20)
  * `parentZalo`: VARCHAR(20) [Nullable]
  * `parentEmail`: VARCHAR(100) [Nullable]
  * `address`: VARCHAR(255) [Nullable]
  * `feePerSession`: DECIMAL(12,2) (Học phí mỗi ca thực tế của học sinh)
  * `feeHistory`: JSON (Lưu lịch sử thay đổi học phí dưới dạng mảng `FeeChangeLog[]`)
  * `status`: VARCHAR(20) [Default: `'active'`] (`'active'` | `'suspended'` | `'left'`)
  * `enrollDate`: DATE
  * `admissionLeadId`: VARCHAR(30) [FK -> AdmissionLead.id, Nullable]
  * `notes`: TEXT [Nullable]
  * `createdAt`: TIMESTAMP [Default: NOW()]
  * `updatedAt`: TIMESTAMP [Default: NOW()]

#### 5. Bảng `TuitionLedger` (Số dư học phí học viên)
* Bảng lưu trữ số dư dồn tích để tối ưu hiệu năng. Được tự động cập nhật khi phát sinh điểm danh hoặc giao dịch mới.
* **Fields:**
  * `id`: VARCHAR(30) [PK]
  * `studentId`: VARCHAR(30) [Unique, FK -> Student.id, Indexed]
  * `totalPaid`: DECIMAL(15,2) [Default: 0.0] (Tổng số tiền học phí nạp offline lũy kế)
  * `totalSpent`: DECIMAL(15,2) [Default: 0.0] (Tổng giá trị các ca học đã dùng lũy kế)
  * `balance`: DECIMAL(15,2) [Default: 0.0] (Số dư khả dụng hiện tại = `totalPaid` - `totalSpent`)
  * `sessionsRemaining`: INT [Default: 0] (Số ca học còn lại tương ứng = `floor(balance / student.feePerSession)`)
  * `lastUpdatedAt`: TIMESTAMP [Default: NOW()]

#### 6. Bảng `Enrollment` (Giai đoạn xếp lớp/Chuyển lớp)
* **Fields:**
  * `id`: VARCHAR(30) [PK]
  * `studentId`: VARCHAR(30) [FK -> Student.id, Indexed]
  * `className`: VARCHAR(50) [FK -> Class.name]
  * `feePerSession`: DECIMAL(12,2) (Học phí một buổi áp dụng trong giai đoạn này)
  * `startDate`: DATE (Ngày bắt đầu vào lớp)
  * `endDate`: DATE [Nullable] (Ngày rời khỏi lớp)
  * `isActive`: BOOLEAN [Default: true]
  * `transferNote`: TEXT [Nullable]
  * `createdAt`: TIMESTAMP [Default: NOW()]

#### 7. Bảng `AttendanceRecord` (Nhật ký điểm danh)
* **Fields:**
  * `id`: VARCHAR(30) [PK]
  * `date`: DATE [Indexed] (Ngày học)
  * `classId`: VARCHAR(30) [FK -> Class.id, Indexed]
  * `className`: VARCHAR(50)
  * `studentId`: VARCHAR(30) [FK -> Student.id, Indexed]
  * `studentName`: VARCHAR(100)
  * `status`: VARCHAR(20) (`'present'` | `'absent'` | `'excused'`)
  * `sessionsDeducted`: INT (Số ca học khấu trừ: `present`/`absent` = 1, `excused` = 0)
  * `teacherId`: VARCHAR(30) [FK -> StaffMember.id, Nullable] (Giáo viên thực tế đứng lớp)
  * `isSubstitute`: BOOLEAN [Default: false] (Giáo viên dạy thay)
  * `note`: TEXT [Nullable]
  * `createdAt`: TIMESTAMP [Default: NOW()]

#### 8. Bảng `Transaction` (Giao dịch thu chi)
* **Fields:**
  * `id`: VARCHAR(30) [PK]
  * `paymentDate`: DATE [Indexed] (Ngày ghi nhận giao dịch)
  * `amount`: DECIMAL(15,2) (Số tiền giao dịch)
  * `paymentMethod`: VARCHAR(30) (Ví dụ: `'Tiền mặt'`, `'Chuyển khoản'`, `'Momo'`)
  * `revenueCategory`: VARCHAR(50) (Ví dụ: `'Học phí offline'`, `'Sách'`, `'Đồng phục'`)
  * `studentId`: VARCHAR(30) [FK -> Student.id, Nullable, Indexed]
  * `studentName`: VARCHAR(100) [Nullable]
  * `className`: VARCHAR(50) [Nullable]
  * `term`: VARCHAR(50) [Nullable]
  * `senderName`: VARCHAR(100) [Nullable]
  * `notes`: TEXT [Nullable]
  * `isReconciled`: BOOLEAN [Default: false] (Kế toán đã kiểm quỹ thực tế)
  * `isInvoiced`: BOOLEAN [Default: false] (Kế toán đã xuất hóa đơn thuế)
  * `editHistory`: JSON [Nullable] (Lịch sử chỉnh sửa giao dịch `TransactionEditLog[]`)
  * `source`: VARCHAR(50) [Nullable]
  * `importBatchId`: VARCHAR(50) [Nullable]
  * `createdAt`: TIMESTAMP [Default: NOW()]

#### 9. Bảng `Expense` (Chi phí vận hành)
* **Fields:**
  * `id`: VARCHAR(30) [PK]
  * `date`: DATE [Indexed] (Ngày chi)
  * `category`: VARCHAR(50) (Ví dụ: `'Mặt bằng'`, `'Điện nước'`, `'Internet'`)
  * `description`: TEXT
  * `amount`: DECIMAL(15,2)
  * `paymentMethod`: VARCHAR(30)
  * `isRecurring`: BOOLEAN [Default: false]
  * `recurringNote`: VARCHAR(100) [Nullable]
  * `approvedBy`: VARCHAR(100) [Nullable]
  * `notes`: TEXT [Nullable]
  * `createdBy`: VARCHAR(50)
  * `createdAt`: TIMESTAMP [Default: NOW()]

#### 10. Bảng `TeachingLog` (Chấm công dạy học)
* **Fields:**
  * `id`: VARCHAR(30) [PK]
  * `staffId`: VARCHAR(30) [FK -> StaffMember.id, Indexed]
  * `staffName`: VARCHAR(100)
  * `date`: DATE [Indexed]
  * `className`: VARCHAR(50)
  * `classId`: VARCHAR(30) [FK -> Class.id]
  * `sessions`: INT [Default: 1]
  * `isSubstitute`: BOOLEAN [Default: false]
  * `originalTeacherId`: VARCHAR(30) [Nullable]
  * `note`: TEXT [Nullable]
  * `createdAt`: TIMESTAMP [Default: NOW()]

#### 11. Bảng `SalaryAdvance` (Tạm ứng lương)
* **Fields:**
  * `id`: VARCHAR(30) [PK]
  * `staffId`: VARCHAR(30) [FK -> StaffMember.id, Indexed]
  * `staffName`: VARCHAR(100)
  * `amount`: DECIMAL(12,2)
  * `date`: DATE [Indexed]
  * `reason`: TEXT [Nullable]
  * `approvedBy`: VARCHAR(100) [Nullable]
  * `createdAt`: TIMESTAMP [Default: NOW()]

#### 12. Bảng `MonthlySalary` (Bảng lương tháng)
* **Fields:**
  * `id`: VARCHAR(30) [PK]
  * `staffId`: VARCHAR(30) [FK -> StaffMember.id, Indexed]
  * `staffName`: VARCHAR(100)
  * `month`: VARCHAR(7) [Indexed] (Định dạng `YYYY-MM`)
  * `role`: VARCHAR(20) (`'teacher'` | `'office'`)
  * `totalSessions`: INT [Default: 0] (Số ca dạy trong tháng)
  * `ratePerSession`: DECIMAL(12,2) [Default: 0.0]
  * `teachingIncome`: DECIMAL(12,2) [Default: 0.0] (Lương dạy học = `totalSessions` * `ratePerSession`)
  * `baseSalary`: DECIMAL(12,2) [Default: 0.0] (Lương cứng tháng)
  * `otherMonthlyAllowance`: DECIMAL(12,2) [Default: 0.0] (Phụ cấp cố định snapshot)
  * `otherMonthlyAllowanceNote`: TEXT [Nullable]
  * `otherSalary`: DECIMAL(12,2) [Default: 0.0] (Lương khác phát sinh)
  * `otherSalaryNote`: TEXT [Nullable]
  * `kpiDeduction`: DECIMAL(12,2) [Default: 0.0] (Khấu trừ KPI)
  * `grossSalary`: DECIMAL(12,2) [Default: 0.0] (Lương gộp)
  * **Trích đóng bảo hiểm (Mới):**
    * `socialInsuranceAmount`: DECIMAL(12,2) [Default: 0.0] (BHXH nhân viên đóng)
    * `healthInsuranceAmount`: DECIMAL(12,2) [Default: 0.0] (BHYT nhân viên đóng)
    * `unemploymentInsuranceAmount`: DECIMAL(12,2) [Default: 0.0] (BHTN nhân viên đóng)
    * `socialInsuranceCompanyAmount`: DECIMAL(12,2) [Default: 0.0] (BHXH công ty chịu)
    * `healthInsuranceCompanyAmount`: DECIMAL(12,2) [Default: 0.0] (BHYT công ty chịu)
    * `unemploymentInsuranceCompanyAmount`: DECIMAL(12,2) [Default: 0.0] (BHTN công ty chịu)
  * **Thuế & khấu trừ khác:**
    * `taxRate`: DECIMAL(5,2) [Default: 0.0] (Tỷ lệ phần trăm thuế suất áp dụng)
    * `taxAmount`: DECIMAL(12,2) [Default: 0.0] (Thuế TNCN thực trích)
    * `totalAdvance`: DECIMAL(12,2) [Default: 0.0] (Tổng tạm ứng trong tháng)
    * `advanceApplied`: DECIMAL(12,2) [Default: 0.0] (Tạm ứng thực khấu trừ)
    * `advanceCarryOver`: DECIMAL(12,2) [Default: 0.0] (Tạm ứng ứng vượt mang sang tháng sau)
  * `netSalary`: DECIMAL(12,2) [Default: 0.0] (Lương thực nhận)
  * `status`: VARCHAR(20) [Default: `'draft'`] (`'draft'` | `'confirmed'` | `'paid'`)
  * `notes`: TEXT [Nullable]
  * `createdAt`: TIMESTAMP [Default: NOW()]

---

## 2. API System Upgrade Specification

### A. Authentication & Session
* **POST `/api/auth/login`**:
  * Đọc `username` và `password` từ request body.
  * Truy vấn bảng `User` dựa trên `username`. Nếu không tìm thấy hoặc mật khẩu đã băm không trùng khớp (so sánh bằng `bcrypt.compare`), trả lỗi `401 Unauthorized` dưới dạng JSON.
  * Sinh mã JWT chứa payload: `{ username, role, name, staffId }` có thời hạn 8 giờ.
  * Trả về JWT token và thông tin user cho client.
* **GET `/api/auth/me`**:
  * Xác thực qua Middleware kiểm tra JWT token. Trả thông tin user được giải mã.

### B. Dynamic Tax Configuration & Compute Engine
* **GET `/api/payroll/calculate`**:
  * Input: query param `month` (định dạng `YYYY-MM`).
  * Thực hiện tính toán bảng lương nháp:
    1. Lấy toàn bộ `StaffMember` đang hoạt động (`status = 'active'`).
    2. Đếm số `TeachingLog` phát sinh của từng nhân sự trong `month` để tính `totalSessions` và `teachingIncome`.
    3. Lấy tổng `SalaryAdvance` trong tháng của nhân sự.
    4. Áp dụng công thức tính BHXH bắt buộc của nhân viên (nếu được cấu hình bật đóng bảo hiểm):
       * Mức lương đóng bảo hiểm $Wage_{ins} = Staff.insuranceBaseSalary \text{ hoặc } Staff.baseSalary$.
       * BHXH = $Wage_{ins} \times 8\%$, BHYT = $Wage_{ins} \times 1.5\%$, BHTN = $Wage_{ins} \times 1\%$. Các tỷ lệ này được lấy động từ `SystemParameter`.
       * Khấu trừ trần bảo hiểm tối đa theo lương cơ sở hoặc tối thiểu vùng.
    5. Tính Lương gộp $Gross = baseSalary + teachingIncome + otherMonthlyAllowance + otherSalary - kpiDeduction$.
    6. Tính toán Thuế TNCN dựa theo `taxMethod` cấu hình của nhân sự:
       * **`none`**: Thuế = 0.
       * **`fixed_percent`**: Thuế = $Gross \times taxMethodValue\%$.
       * **`manual_amount`**: Thuế = $taxMethodValue$.
       * **`progressive`**: Tính theo biểu lũy tiến. Thu nhập tính thuế $Net_{tax} = Gross - 11.000.000 - (4.400.000 \times dependentsCount) - BH\_bắt\_buộc$. Nếu $Net_{tax} \le 0$, thuế = 0. Nguyền tắc, áp dụng biểu thuế 7 bậc để tính thuế lũy tiến từng phần.
    7. Tính toán khấu trừ Tạm ứng:
       * Số tiền tạm ứng tối đa được khấu trừ là Lương khả dụng $Available = Gross - Thuế - BH\_nhân\_viên$.
       * Nếu tổng ứng $Advance_{total} \le Available$, thì $Advance_{applied} = Advance_{total}$ và $Advance_{carryOver} = 0$.
       * Nếu tổng ứng $Advance_{total} > Available$, thì $Advance_{applied} = Available$ và $Advance_{carryOver} = Advance_{total} - Available$.
    8. Tính lương thực nhận $NetSalary = Available - Advance_{applied}$.
    9. Lưu trữ bản ghi nháp vào bảng `MonthlySalary`.

---

## 3. Thuật toán chi tiết cho 35 báo cáo bị khóa (Report Center Spec)

Dưới đây là đặc tả thuật toán cụ thể để hiện thực hóa các báo cáo quan trọng nhất đang bị khóa trong Report Center:

### A. Nhóm Báo cáo Tài chính & Doanh thu
1. **pnl_monthly_summary (Báo cáo Lợi nhuận thực tế P&L dồn tích)**
   * *Mục tiêu:* Phản ánh kết quả kinh doanh dồn tích thực tế của trung tâm trong tháng.
   * *Thuật toán:*
     * Doanh thu thực học $Earned_{tuition} = \sum$ (buổi điểm danh status `present` hoặc `absent` của các lớp học sinh offline trong tháng $\times$ đơn giá học phí của học sinh đó tại ngày điểm danh).
     * Doanh thu khác $Revenue_{other} = \sum$ (giao dịch thu có `revenueCategory` $\neq$ `'Học phí offline'` phát sinh trong tháng).
     * Tổng Doanh thu dồn tích $Rev_{total} = Earned_{tuition} + Revenue_{other}$.
     * Chi phí vận hành $Exp_{operating} = \sum$ (các khoản chi trong bảng `Expense` phát sinh trong tháng).
     * Chi phí lương nhân sự $Exp_{salary} = \sum$ (Lương gộp `grossSalary` + các khoản bảo hiểm doanh nghiệp chịu `socialInsuranceCompanyAmount` + `healthInsuranceCompanyAmount` + `unemploymentInsuranceCompanyAmount` trong bảng `MonthlySalary` của tháng đó).
     * Lợi nhuận dồn tích $Profit_{accrual} = Rev_{total} - (Exp_{operating} + Exp_{salary})$.
   * *Columns:* `Chỉ tiêu tài chính`, `Số tiền (đ)`, `Tỷ lệ / Doanh thu`.

2. **tuition_unearned_summary (Báo cáo học phí chưa thực hiện lũy kế)**
   * *Mục tiêu:* Thống kê số tiền trung tâm đang giữ của phụ huynh nhưng chưa dạy học sinh (nợ dịch vụ).
   * *Thuật toán:*
     * Với mỗi học sinh có trạng thái khác `'left'`:
       * Lấy tổng số tiền nạp học phí offline lũy kế từ trước đến cuối tháng lọc: $Paid_{cum}$.
       * Lấy tổng giá trị các ca học đã dùng (Present + Absent) lũy kế tính đến cuối tháng lọc: $Cost_{cum}$.
       * Số tiền học phí chưa thực hiện của học sinh đó $Unearned_{student} = Paid_{cum} - Cost_{cum}$.
     * Tổng hợp toàn trung tâm = $\sum Unearned_{student}$ của tất cả học sinh.
   * *Columns:* `Tên học viên`, `Lớp học`, `Học phí/buổi`, `Tổng nạp lũy kế`, `Tổng thực học lũy kế`, `Học phí chưa thực hiện (đ)`.

3. **earned_tuition_detail (Báo cáo doanh thu thực học phí chi tiết)**
   * *Mục tiêu:* Liệt kê doanh thu thực tế học phí phân bổ theo ngày học.
   * *Thuật toán:*
     * Lọc toàn bộ `AttendanceRecord` trong tháng có trạng thái `present` hoặc `absent`.
     * Với mỗi bản ghi, lấy `studentId` để tra cứu đơn giá học phí tương ứng vào ngày điểm danh: $Fee_{session}$.
     * Doanh thu ca học = $sessionsDeducted \times Fee_{session}$.
     * Nhóm dữ liệu theo ngày hoặc theo lớp học để lập báo cáo tổng hợp.
   * *Columns:* `Ngày học`, `Tên lớp`, `Học viên`, `Trạng thái điểm danh`, `Doanh thu thực nhận (đ)`.

### B. Nhóm Báo cáo Học viên & Chuyên cần
4. **student_absent_frequent (Báo cáo học viên vắng nhiều)**
   * *Mục tiêu:* Phát hiện học sinh nghỉ học nhiều để trung tâm liên hệ chăm sóc.
   * *Thuật toán:*
     * Lọc toàn bộ `AttendanceRecord` trong tháng của các học sinh có trạng thái active.
     * Đếm số buổi vắng không phép ($Abs_{unexcused}$) và vắng có phép ($Abs_{excused}$).
     * Tính Tỷ lệ vắng = $\frac{Abs_{unexcused} + Abs_{excused}}{\text{Tổng số buổi điểm danh}} \times 100\%$.
     * Lọc ra những học sinh có tổng số buổi vắng $\ge$ `frequentAbsenceThreshold` (mặc định 2 buổi) hoặc Tỷ lệ vắng $\ge 30\%$.
   * *Columns:* `Tên học viên`, `Lớp học`, `Số buổi đi học`, `Số buổi vắng`, `Tỷ lệ vắng`, `Liên hệ phụ huynh`.

5. **student_near_end_detail (Học viên sắp hết buổi học)**
   * *Mục tiêu:* Nhắc đóng học phí kịp thời.
   * *Thuật toán:*
     * Lấy danh sách số dư khả dụng hiện thời của từng học viên từ bảng `TuitionLedger`.
     * Lọc ra các học viên đang học (`status = 'active'`) có số buổi học còn lại `sessionsRemaining` nằm trong khoảng: $1 \le sessionsRemaining \le \text{lowRemainingSessionsThreshold}$ (mặc định 2 buổi).
   * *Columns:* `Tên học viên`, `Lớp học`, `Học phí/buổi`, `Số dư tiền còn lại (đ)`, `Số buổi còn lại (buổi)`.

6. **student_no_attendance (Học viên lâu chưa đi học)**
   * *Mục tiêu:* Phát hiện học sinh tự ý bỏ học hoặc quên xếp lịch.
   * *Thuật toán:*
     * Lấy toàn bộ học viên `status = 'active'`.
     * Tìm ngày điểm danh gần nhất của từng học viên trong bảng `AttendanceRecord`: $Date_{last}$.
     * Nếu học viên không có điểm danh nào trong vòng `longAbsenceDaysThreshold` (mặc định 14 ngày) tính đến ngày hiện tại, đưa học viên vào báo cáo.
   * *Columns:* `Tên học viên`, `Lớp học`, `Ngày học cuối cùng`, `Số ngày không đi học`, `Số điện thoại phụ huynh`.

---

## 4. Đặc tả cơ chế chạy nền & Lập lịch sao lưu (Cron Jobs & Automations)

Cơ chế chạy nền được quản lý bởi một scheduler chạy liên tục trong tiến trình backend Node.js (sử dụng thư viện `node-cron`).

### Tác vụ nền lập lịch (Cron Table)

| Tên tác vụ | Chu kỳ chạy (Cron Expression) | Mô tả chi tiết hành động | Rủi ro & Xử lý lỗi |
| :--- | :---: | :--- | :--- |
| **Auto-Close Check** | `30 23 * * *` (23:30 mỗi đêm) | 1. Quét danh sách các lớp hoạt động có lịch dạy trong ngày.<br>2. Kiểm tra xem có bản ghi điểm danh nào trong ngày hay chưa.<br>3. Nếu thiếu, tạo cảnh báo hệ thống (Alert) mức độ **High** gán cho Admin. | *Rủi ro:* Server bị tắt đột ngột.<br>*Xử lý:* Tự động chạy quét bù (Catch-up) ngay khi server khởi động lại. |
| **Daily Database Backup** | `59 23 * * *` (23:59 mỗi đêm) | 1. Thực hiện dump cơ sở dữ liệu PostgreSQL (`pg_dump`).<br>2. Nén file backup thành định dạng `.tar.gz`.<br>3. Tải file lên Google Cloud Storage hoặc AWS S3.<br>4. Xóa file backup cũ hơn 30 ngày trên cloud storage để tiết kiệm dung lượng. | *Rủi ro:* Lỗi kết nối mạng lên cloud storage.<br>*Xử lý:* Gửi email cảnh báo khẩn cấp cho Admin hệ thống. |
| **Student Status Sync** | `0 1 * * *` (01:00 mỗi đêm) | 1. Quét học sinh `active` không có điểm danh trong 14 ngày qua.<br>2. Tự động chuyển trạng thái học sinh thành `suspended` trên database.<br>3. Ghi Audit Log lưu vết: *"Hệ thống tự động chuyển học viên sang Tạm nghỉ do không đi học 14 ngày."* | *Rủi ro:* Học sinh nghỉ hè có phép bị chuyển nhầm.<br>*Xử lý:* Chỉ tự động chuyển nếu không có ghi chú phép xin nghỉ đặc thù từ admin. |

---

## 5. Quy chuẩn thiết kế giao diện Premium (UI/UX Specification)

Giao diện nâng cấp sẽ áp dụng các công nghệ CSS hiện đại để mang lại cảm giác sang trọng và mượt mà:

### A. Màu sắc & Hệ Typography chủ đạo
* **Typography:** Sử dụng phông chữ **Outfit** (hoặc **Inter**) cho tiêu đề và nội dung để có giao diện hiện đại, chuyên nghiệp.
* **Màu nền Dark Mode:** `#0B0F19` (Midnight Dark) kết hợp màu xám viền `#1E293B` (Slate).
* **Màu thương hiệu:** 
  * Accent Violet: `#6366F1` (Indigo)
  * Accent Emerald (Tài chính dương): `#10B981` (Emerald)
  * Accent Rose (Chi phí/Cảnh báo): `#F43F5E` (Rose)

### B. Lớp hiệu ứng Glassmorphism CSS
Toàn bộ sidebar, bảng điều khiển và popup nổi sẽ được bọc bởi lớp CSS đặc tả hiệu ứng kính mờ cao cấp:
```css
.premium-glass-card {
  background: rgba(30, 41, 59, 0.45);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.premium-glass-card:hover {
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 12px 40px 0 rgba(99, 102, 241, 0.15);
  transform: translateY(-2px);
}
```

### C. Quy chuẩn Responsive Grid trên thiết bị di động
* Sử dụng CSS Grid động để tự động chia cột dựa trên kích thước màn hình:
  ```css
  .responsive-dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }
  ```
* Trên màn hình di động nhỏ hơn `640px` (Điện thoại của giáo viên):
  * Ẩn thanh sidebar bên trái thành nút trượt Menu (Slide-out menu).
  * Các bảng dữ liệu (như danh sách điểm danh) chuyển sang dạng danh sách thẻ (List Cards) cuộn dọc, mỗi thẻ đại diện cho một học viên với nút điểm danh chọn nhanh `Có mặt / Vắng` kích thước lớn để thao tác một chạm dễ dàng bằng ngón tay cái.
