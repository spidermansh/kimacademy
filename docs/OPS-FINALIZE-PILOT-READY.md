# OPS-FINALIZE-PILOT-READY — Tài liệu Vận hành Thử nghiệm Hệ thống

Tài liệu này đóng vai trò là hướng dẫn chính thức và chốt điều kiện sẵn sàng cho giai đoạn vận hành thử nghiệm (Pilot) hệ thống quản lý trung tâm Kim Academy.

---

## 1. PHÂN HỆ ĐỦ DÙNG (READY FOR PILOT)

Các phân hệ và quy trình nghiệp vụ đã được kiểm tra, chuẩn hóa và sẵn sàng chạy thử nghiệm thực tế:

1. **Tuyển sinh (Admission):**
   * Quản lý thông tin lead, cập nhật trạng thái tuyển sinh theo vòng đời: Mới đăng ký -> Hẹn test -> Đã test -> Nhận chờ lớp / Từ chối -> Chuyển đổi thành học viên chính thức.
   * Cơ chế cảnh báo trùng lead (cùng Tên học viên & SĐT Phụ huynh) khi chuyển đổi thành học viên.
   * Tự động tạo bản ghi Nhập học (Enrollment) khi phân lớp học viên thành công.

2. **Học viên & Lớp học (Student & Class):**
   * Quản lý hồ sơ học viên đang hoạt động, cập nhật trạng thái hoạt động của học viên.
   * Quản lý thông tin lớp học, giáo viên phụ trách, sĩ số và khung giờ học.
   * Quy trình rút học viên khỏi lớp hoặc chuyển lớp học được ghi nhận lịch sử.

3. **Học phí & Công nợ (Tuition & Debt):**
   * Ghi nhận giao dịch đóng học phí offline thực tế từ học viên.
   * Tính toán dồn tích tự động: Số buổi đã mua, số buổi đã học (Present + Absent), số buổi còn lại, số tiền dư/nợ dựa trên đơn giá lớp học.

4. **Điểm danh & Chấm công giáo viên (Attendance & TeachingLog):**
   * Ghi nhận điểm danh từng buổi: Có mặt (Present), Vắng không phép (Absent - có trừ buổi), Vắng có phép (Excused - không trừ buổi).
   * Tự động tạo chấm công (TeachingLog) cho giáo viên chính/dạy thay ngay khi lưu điểm danh có ít nhất 1 học sinh đi học.

5. **Đối soát cuối ngày (Daily Close):**
   * Chốt số liệu doanh thu thực thu (cash) và doanh thu thực học dồn tích (earned) mỗi ngày.
   * Ghi nhật ký đối soát phục vụ chốt két cuối ngày của kế toán.

6. **Report Center (11 báo cáo MVP):**
   * Tổng hợp tài chính tháng, học phí đã thu, công nợ học viên.
   * Điểm danh theo lớp, đối soát cuối ngày, tuyển sinh tổng hợp, danh sách học viên đang học/chờ lớp, danh sách lớp đang học/chờ mở.

---

## 2. PHÂN HỆ BỊ KHÓA/ẨN (LOCKED/HIDDEN)

Để bảo đảm an toàn dòng tiền và không gây sai lệch số liệu kế toán, 35 báo cáo chưa sẵn sàng và các nghiệp vụ nâng cao đã bị khóa/ẩn:

* **35 Báo cáo chưa sẵn sàng:** Đã bị disabled hoàn toàn trên giao diện, không cho phép chọn, không chạy tính toán (compute) ngầm và không hiển thị bảng rỗng hoặc cho phép xuất Excel.
* **Chính sách Thuế & Bảo hiểm (TAX-01/PAY-04/PAY-05):** Không tự động áp dụng biểu thuế lũy tiến hay bảo hiểm nâng cao phức tạp. Kế toán sẽ điều chỉnh giảm trừ thủ công trước khi duyệt lương.
* **Tự động hóa nâng cao (PAY-03):** Lương đặc thù của từng nhân sự tạm thời áp dụng theo mức cứng và đơn giá buổi dạy cấu hình trên Staff Profile, các chính sách nâng cao hơn được đưa vào backlog.

---

## 3. RỦI RO CÒN LẠI (REMAINING RISKS)

1. **Sửa đổi điểm danh quá khứ:**
   * *Rủi ro:* Giáo viên có thể vô tình sửa điểm danh của ngày cũ đã được chốt đối soát ngày, dẫn đến sai lệch số dư học phí và P&L lũy kế.
   * *Giải pháp giảm thiểu:* Kế toán chạy đối soát bù và yêu cầu giáo viên không tự ý thay đổi điểm danh cũ.

2. **Tạm ứng lương vượt hạn mức (Advance Carry-over):**
   * *Rủi ro:* Nếu nhân sự tạm ứng vượt quá lương thực nhận trong tháng, phần dư cần kết chuyển thủ công sang tháng sau.
   * *Giải pháp giảm thiểu:* Bảng lương có ghi chú cảnh báo khi số tiền tạm ứng vượt quá lương khả dụng để kế toán kiểm tra thủ công.

---

## 4. HƯỚNG DẪN CHẠY THỬ 3-7 NGÀY (PILOT GUIDE)

* **Bước 1: Chọn lớp chạy thử:** Chọn 2-3 lớp học mới khai giảng để chạy thử quy trình đầy đủ trên hệ thống.
* **Bước 2: Lễ tân/Tư vấn nhập lead:** Thực hiện nhập thông tin lead mới, lên lịch test và chuyển đổi thành học viên khi trúng tuyển.
* **Bước 3: Giáo viên điểm danh:** Yêu cầu giáo viên điểm danh trực tiếp trên phần mềm ngay sau ca học để hệ thống tự động chấm công dạy.
* **Bước 4: Kế toán đối soát:** Cuối mỗi ngày, kế toán kiểm tra tiền thực thu và bấm chốt Đối soát cuối ngày.
* **Bước 5: Xuất báo cáo:** Chốt tuần, xuất các báo cáo active (Tài chính, Công nợ, Tuyển sinh) gửi ban quản lý.

---

## 5. TIÊU CHÍ DỪNG PILOT & NGHIỆM THU

### Tiêu chí dừng khẩn cấp (Emergency Stop Criteria)
Hệ thống phải tạm dừng chạy thử và rollback nếu phát hiện:
1. Dữ liệu học viên bị mất mát hoặc xáo trộn (sai lệch số tiền nợ/dư học phí của học viên thật).
2. Phát sinh lỗi hệ thống nghiêm trọng (HTTP 500 liên tục hoặc hỏng tệp tin cơ sở dữ liệu JSON).
3. API lỗi trả về mã HTML thay vì cấu trúc JSON chuẩn gây treo client.

### Tiêu chí nghiệm thu (Acceptance Criteria)
Nghiệm thu chuyển sang giai đoạn vận hành chính thức sau 3-7 ngày nếu:
1. Giáo viên điểm danh 100% các ca học chạy thử thành công, số buổi trừ học viên chính xác.
2. Kế toán thực hiện đối soát cuối ngày khớp hoàn toàn với dòng tiền thực tế tại quầy.
3. Không phát sinh bất kỳ lỗi Blocker hoặc High nào trong Report Center và phân hệ Tuyển sinh.
4. Trạng thái của 35 báo cáo bị khóa hoạt động chính xác (không chọn được, không compute, không export).
5. Quy trình backup dữ liệu cuối ngày được thực hiện thủ công trơn tru.
