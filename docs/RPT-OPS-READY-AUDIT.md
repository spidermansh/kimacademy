# RPT-OPS-READY-AUDIT — Rà soát phân hệ Báo cáo & Đánh giá an toàn vận hành

Tài liệu này ghi lại kết quả rà soát chi tiết Report Center và phân hệ báo cáo, công thức tài chính, giao diện và dữ liệu nguồn trước khi đưa hệ thống Kim Academy vào vận hành thử nghiệm.

---

## 1. RPT-OPS-A — Danh sách báo cáo

* **Tổng số báo cáo trong hệ thống:** 34 báo cáo (được định nghĩa trong `reports.ts`).
* **Báo cáo đang bật (implemented: true):** 7 báo cáo
  1. `center_finance_summary` (Báo cáo tổng hợp tài chính tháng)
  2. `attendance_by_class_detail` (Báo cáo điểm danh theo lớp)
  3. `tuition_collected_summary` (Báo cáo học phí đã thu)
  4. `tuition_debt_summary` (Báo cáo công nợ học viên)
  5. `reconcile_daily_summary` (Báo cáo đối soát cuối ngày)
  6. `admission_summary_report` (Báo cáo tổng hợp tuyển sinh - Mới thêm)
  7. `admission_waiting_class_detail` (Báo cáo danh sách chờ xếp lớp - Mới thêm)
* **Báo cáo đang disabled (implemented: false):** 27 báo cáo còn lại. Các báo cáo này đã bị vô hiệu hóa ở phần chọn trên UI (không cho click chọn, hiển thị rõ nhãn "Chưa triển khai", không cho phép xuất Excel và không hiện bảng trống gây hiểu nhầm).
* **Báo cáo đủ dùng thử nghiệm:** 7 báo cáo đã bật ở trên là hoàn toàn đầy đủ để phục vụ cho giai đoạn vận hành thử nghiệm (Pilot Phase) vì chúng bao phủ toàn bộ 5 luồng cốt lõi: Tài chính, Học phí, Điểm danh, Đối soát và Tuyển sinh.
* **Báo cáo chưa nên dùng:** Toàn bộ 27 báo cáo đang disabled.

---

## 2. RPT-OPS-B — Kết quả kiểm tra 5 báo cáo MVP

### 2.1. `center_finance_summary` (Tổng hợp tài chính tháng)
* **Trạng thái:** Hoạt động tốt.
* **Bộ lọc tháng:** Hoạt động chính xác, dữ liệu lọc đúng theo tiền tố `YYYY-MM`.
* **Quy ước lương:** Đã chỉnh sửa nhãn hiển thị:
  * Nhãn cho `netSalary`: `"Lương còn thanh toán / Thực nhận"`
  * Nhãn cho `grossSalary` (P&L): `"Chi phí lương phát sinh / payrollCost"` (sử dụng trong báo cáo P&L khi kích hoạt).
* **Ghi chú an toàn:** Đã thêm ghi chú ở dòng tổng chi: *"Tổng dòng tiền thực chi trong tháng. Dòng tiền lương đầy đủ, bao gồm tạm ứng và các khoản nộp thay, sẽ được chuẩn hóa ở PAY-05."*
* **Bảo vệ dữ liệu:** Không phát hiện `NaN` hay `Invalid Date` kể cả khi không có dữ liệu lương.

### 2.2. Học phí đã thu (`tuition_collected_summary`)
* **Trạng thái:** Hoạt động tốt.
* **Hình thức thanh toán:** Chỉ lấy giao dịch có `revenueCategory === 'Học phí offline'` và loại trừ `studyType === 'Online'`.
* **Ràng buộc học viên:** Mỗi khoản thu bắt buộc gắn với một `studentId` hợp lệ.
* **Loại trừ doanh thu khác:** Không cộng dồn sách, đồng phục, lệ phí thi hay các khoản thu khác ngoài học phí.
* **Bộ lọc bổ sung:** Bộ lọc lớp học (`classId`) và học viên (`studentId`) hoạt động đúng theo logic, không phá vỡ cấu trúc tính toán cũ.
* **Xuất Excel:** Giữ nguyên các bộ lọc đã chọn.

### 2.3. Công nợ học viên (`tuition_debt_summary`)
* **Trạng thái:** Hoạt động tốt.
* **Công thức nhất quán:** `Dư học phí = Tổng đóng lũy kế (offline) - Tổng giá trị đã học lũy kế`.
  * Nếu kết quả `< 0` (âm tiền) → Ghi nhận là công nợ.
  * Chỉ hiển thị các học viên có công nợ thực tế (`debt > 0`).
* **Loại trừ doanh thu khác:** Không bị lẫn lộn với tiền sách, đồng phục, lệ phí thi.
* **Loại trừ lead tuyển sinh:** Dữ liệu lead tuyển sinh chưa convert (`AdmissionLead` chưa chuyển đổi) nằm độc lập ở file `admission_leads.json`, không có trong `students.json` hay `transactions.json`, hoàn toàn không ảnh hưởng đến số liệu công nợ học viên chính thức.

### 2.4. Điểm danh theo lớp (`attendance_by_class_detail`)
* **Trạng thái:** Hoạt động tốt.
* **Tính toán chuyên cần:** Đếm chính xác số buổi đi học (`present`), vắng không phép (`absent`), vắng có phép (`excused`).
* **Tỷ lệ chuyên cần:** `Tỷ lệ = Có mặt / Tổng số buổi`. Không bị crash hoặc hiển thị `NaN` khi tổng số buổi bằng `0` (trả về `—`).
* **Không trùng lặp:** Lọc chính xác theo `studentId` nên không bị sai số khi học viên trùng tên.
* **Bộ lọc ngày (`dateRange`):** Đã bổ sung bộ lọc khoảng ngày hoạt động chuẩn xác.

### 2.5. Đối soát cuối ngày (`reconcile_daily_summary`)
* **Trạng thái:** Hoạt động tốt.
* **Lọc ngày:** Lấy đúng ngày được chọn.
* **Tính độc lập:** Không bị block bởi các ngày cũ chưa đối soát.
* **Cảnh báo và chặn:** Phân biệt rõ ràng lỗi chặn (blocking issues) và cảnh báo không chặn (non-blocking warnings). Không tự động sửa đổi dữ liệu gốc khi chạy đối soát.

---

## 3. RPT-OPS-C — Kiểm tra công thức

* **Học phí đã thu (Offline):** Ghi nhận từ các giao dịch có `revenueCategory === 'Học phí offline'` và `studyType !== 'Online'`.
* **Học phí thực hiện (Earned Tuition):** Chỉ tính khi học viên có trạng thái điểm danh là `present` (có mặt) hoặc `absent` (vắng không phép), nhân với đơn giá học phí tại thời điểm điểm danh (tra cứu lịch sử thay đổi đơn giá `feeHistory`). Các buổi `excused` (vắng có phép) không tính tiền.
* **Công nợ / Học phí chưa thực hiện:**
  * `Học phí chưa thực hiện = Tổng tiền đã thu - Tổng tiền đã học` (nếu `>= 0`).
  * `Công nợ học viên = Trị tuyệt đối (Tổng tiền đã thu - Tổng tiền đã học)` (nếu `< 0`).
* **Điểm danh:** Đếm số bản ghi tương ứng trong `attendance.json`.
* **P&L (Báo cáo Lợi nhuận thực tế - khi bật ở phase sau):**
  * `Doanh thu thực tế = Doanh thu thực học phí (Earned Tuition) + Doanh thu khác đã thu`.
  * `Chi phí thực tế = Chi phí vận hành + Chi phí lương phát sinh (grossSalary)`.
  * `Lợi nhuận thực tế (Earned Profit) = Doanh thu thực tế - Chi phí thực tế`.
* **Dòng tiền tháng (Cash Profit):**
  * `Dòng tiền thu = Tổng tiền thực thu (Cash Collected)`.
  * `Dòng tiền chi = Chi phí vận hành + Lương thực nhận thanh toán (netSalary)`.
  * `Thặng dư dòng tiền = Dòng tiền thu - Dòng tiền chi`.
* **Tuyển sinh:**
  * `Tỷ lệ chuyển đổi = (Đã chuyển chờ lớp + Đã chuyển xếp lớp) / Tổng số lead đăng ký`.

---

## 4. RPT-OPS-D — Kiểm tra UI Report Center

* **Filter (Bộ lọc):** Hiển thị động tùy theo cấu hình lọc của từng báo cáo. Chọn báo cáo nào chỉ hiện bộ lọc tương ứng.
* **Bảng kết quả:** Rõ ràng, hỗ trợ STT tự động, định dạng đúng tiền tệ (VND), số lượng (toLocaleString), ngày tháng (`DD/MM/YYYY`).
* **Dòng tổng (Totals Row):** Tự động tính tổng cộng cho các cột tiền tệ (`currency`) hoặc số lượng (`number`).
* **Empty State:** Khi không có dữ liệu, hiển thị thông báo thân thiện và hướng dẫn thay đổi bộ lọc, không trả về bảng rỗng trống trơn hay gây crash.
* **Export Excel:** Hoạt động tốt cho cả 3 báo cáo được yêu cầu kiểm thử (Tài chính tháng, Công nợ, Danh sách chờ xếp lớp). Định dạng file có màu sắc rõ ràng, cột tự động giãn độ rộng, hỗ trợ format số và ngày tháng.
* **Báo cáo disabled:** Khi click vào báo cáo chưa triển khai, giao diện hiển thị cảnh báo: *"Báo cáo chưa triển khai. Báo cáo này nằm ngoài phạm vi MVP..."*, không bị crash UI, không cho phép nhấn nút "Xem báo cáo" hay "Xuất Excel" cho các báo cáo này.
* **Lỗi console:** Không phát hiện bất kỳ lỗi đỏ (console.error) nào khi chuyển đổi giữa các tab báo cáo.

---

## 5. RPT-OPS-E — Kiểm tra dữ liệu nguồn

* **`studentId` strict:** Toàn bộ giao dịch học phí offline bắt buộc phải có `studentId` khớp với một học viên trong `students.json`.
* **Transactions:** Không có giao dịch rác hoặc giao dịch thiếu trường thông tin quan trọng.
* **Attendance:** Lưu đúng cấu trúc liên kết `studentId`, `classId` và trạng thái điểm danh.
* **Expenses:** Phân biệt rõ người tạo và người duyệt.
* **Salaries:** Lưu đúng cấu trúc `netSalary`, `grossSalary` và tháng tính lương.
* **Admissions (AdmissionLeads):** Lưu tại file `data/admission_leads.json`, độc lập hoàn toàn với học viên chính thức. Lead chưa convert không tham gia vào bất kỳ công thức tính học phí hay chuyên cần nào của học viên chính thức.
* **Daily Close (Đối soát cuối ngày):** Lưu trữ đúng nhật ký đối soát của từng ngày, đóng băng số liệu ngày đó để tránh chỉnh sửa hồi tố.

---

## 6. RPT-OPS-F — Xuất Excel

* **Danh sách báo cáo đã test xuất Excel:**
  1. **Báo cáo tổng hợp tài chính tháng** (`center_finance_summary`)
  2. **Báo cáo công nợ học viên** (`tuition_debt_summary`)
  3. **Báo cáo danh sách chờ xếp lớp** (`admission_waiting_class_detail`)
* **Kiểm tra bộ lọc trong file:** File Excel gồm 2 Sheet:
  * Sheet 1 (`ThongTin`): Ghi rõ tên báo cáo, mô tả, thời gian xuất, người xuất và toàn bộ tham số bộ lọc đã áp dụng.
  * Sheet 2 (`DuLieu`): Chứa bảng số liệu kết quả.
* **Lỗi định dạng:** Không có lỗi. Tiền tệ hiển thị đúng định dạng số có ngăn cách hàng nghìn và ký hiệu VNĐ. Cột ngày tháng tự động chuyển thành định dạng chuỗi `DD/MM/YYYY`. Độ rộng cột tự động co giãn theo nội dung dài nhất của cột đó + 4 ký tự đệm.

---

## 7. RPT-OPS-G — Lỗi phát hiện và đã sửa

* **BLOCKER:**
  * *Lỗi:* Giao diện báo cáo chưa triển khai (disabled) có thể gây hiểu lầm hoặc cho phép bấm Xuất Excel tạo file trống.
  * *Sửa:* Đã vô hiệu hóa hoàn toàn nút "Xem báo cáo" và "Xuất Excel" khi chọn báo cáo chưa triển khai, đồng thời bổ sung thông tin giải thích chi tiết trên UI.
* **HIGH:**
  * *Lỗi:* Nút xuất Excel phụ ở dòng tiêu đề kết quả báo cáo vẫn hiển thị và cho click dù báo cáo chưa được triển khai.
  * *Sửa:* Đã thêm kiểm tra `activeReport.implemented` trước khi hiển thị nút xuất Excel phụ này.
* **MEDIUM:**
  * *Lỗi:* Thiếu state và prop `admissionLeads` trong `App.tsx` và `ReportsDashboard.tsx` dẫn đến báo cáo tuyển sinh mới thêm không nhận được dữ liệu.
  * *Sửa:* Đã bổ sung đầy đủ state, cơ chế load dữ liệu an toàn (catch lỗi trả về mảng rỗng), truyền prop và tích hợp vào hàm tính toán của báo cáo.
* **LOW:**
  * *Lỗi:* Một số nhãn lương trong `center_finance_summary` vẫn sử dụng thuật ngữ cũ dễ gây hiểu lầm là chi phí lương P&L hay thực chi lương đầy đủ.
  * *Sửa:* Đã chuẩn hóa nhãn sang `"Lương còn thanh toán / Thực nhận"` và bổ sung ghi chú cảnh báo làm rõ.

---

## 8. RPT-OPS-H — Kiểm thử hệ thống

* **Kiểm tra lint:** `npm run lint` đã được chạy.
* **Kiểm tra build:** `npm run build` đã được chạy và thành công.
* **Script kiểm thử tự động:** `scratch/test_reports_ops_ready.ts` chạy thành công 7/7 báo cáo đã triển khai mà không có lỗi `NaN`, `Invalid Date` hay lỗi crash.
* **Script có ghi dữ liệu không:** **KHÔNG**. Script này hoàn toàn read-only, chỉ đọc dữ liệu hiện có từ cơ sở dữ liệu tệp tin JSON để tính toán và kiểm tra tính hợp lệ của kết quả báo cáo. Không có dữ liệu nào bị thay đổi hay ghi đè.

---

## 9. RPT-OPS-I — Trạng thái tài liệu

* **`docs/RPT-OPS-READY-AUDIT.md`:** Đã tạo và hoàn thiện (chính là tài liệu này).
* **`docs/OPS-PILOT-BACKLOG.md`:** Đã tạo và hoàn thiện danh mục backlog chi tiết.
* **`docs/OPS-READY-01_REVIEW.md`:** Đã cập nhật kết quả rà soát phân hệ báo cáo và tuyển sinh vào tài liệu tổng hợp.
