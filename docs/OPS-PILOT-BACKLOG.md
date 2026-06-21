# OPS-PILOT-BACKLOG — Backlog chi tiết phục vụ vận hành thử nghiệm

Tài liệu này tổng hợp toàn bộ các phân hệ, chức năng đang chờ viết, làm dở hoặc chưa hoàn thiện trong hệ thống quản lý trung tâm Kim Academy. Toàn bộ các vấn đề được rà soát, phân loại mức độ ưu tiên, đánh giá rủi ro và đề xuất xử lý theo đúng quy định.

---

## Danh sách phân loại mức độ ưu tiên áp dụng:
* **BLOCKER_FOR_PILOT:** Chặn vận hành thử nghiệm, bắt buộc phải xử lý trước.
* **SAFE_FOR_PILOT_WITH_NOTE:** An toàn cho vận hành thử kèm ghi chú hướng dẫn vận hành thủ công.
* **POST_PILOT_PRIORITY:** Ưu tiên thực hiện ngay sau 3-7 ngày vận hành thử nghiệm.
* **DISABLE_OR_HIDE:** Phải tạm ẩn hoặc khóa trên giao diện trong thời gian chạy thử.
* **FUTURE_PHASE:** Để dành cho các phase phát triển sau này, không ảnh hưởng hiện tại.

---

## CHI TIẾT BACKLOG CÁC PHÂN HỆ

### 1. Phân hệ: Tuyển sinh (Admission)

* **Mã task:** ADM-PILOT-01
* **Phân hệ:** Tuyển sinh
* **Vấn đề / phần còn thiếu:** Chưa có chức năng lọc nâng cao (lọc theo nguồn lead, khoảng ngày đăng ký) trên UI quản lý Tuyển sinh chính (mới chỉ có thanh tìm kiếm nhanh).
* **Mức độ ưu tiên:** POST_PILOT_PRIORITY
* **Có chặn vận hành thử không:** Không
* **Rủi ro nếu chưa làm:** Nhân viên tuyển sinh khó lọc danh sách lead dài theo ngày/nguồn.
* **Đề xuất xử lý:** Bổ sung bộ lọc dropdown cho Trạng thái, Nguồn và Khoảng ngày đăng ký trên giao diện Tuyển sinh.
* **Phase đề xuất:** Phase 1 - Ngay sau 3-7 ngày vận hành thử.

---

### 2. Phân hệ: Học viên (Student)

* **Mã task:** STU-PILOT-01
* **Phân hệ:** Học viên
* **Vấn đề / phần còn thiếu:** Chưa có chức năng quản lý bảo lưu học tập và đình chỉ tự động học viên vắng quá số buổi quy định.
* **Mức độ ưu tiên:** SAFE_FOR_PILOT_WITH_NOTE
* **Có chặn vận hành thử không:** Không
* **Rủi ro nếu chưa làm:** Nhân viên phải cập nhật trạng thái học viên thủ công từ Active sang Suspended/Left.
* **Đề xuất xử lý:** Cung cấp ghi chú hướng dẫn: "Nhân viên vận hành chủ động kiểm tra Báo cáo học viên lâu chưa đi học và cập nhật thủ công trạng thái học viên."
* **Phase đề xuất:** Phase 2 - Hậu vận hành thử.

---

### 3. Phân hệ: Lớp học (Class)

* **Mã task:** CLS-PILOT-01
* **Phân hệ:** Lớp học
* **Vấn đề / phần còn thiếu:** Chưa có chức năng xếp thời khóa biểu tự động và cảnh báo trùng phòng học khi tạo/sửa lớp.
* **Mức độ ưu tiên:** SAFE_FOR_PILOT_WITH_NOTE
* **Có chặn vận hành thử không:** Không
* **Rủi ro nếu chưa làm:** Nguy cơ trùng phòng học hoặc trùng giờ dạy của giáo viên nếu xếp thủ công không kỹ.
* **Đề xuất xử lý:** Giáo vụ đối chiếu lịch học của các lớp trên Excel ngoài trước khi nhập vào hệ thống.
* **Phase đề xuất:** FUTURE_PHASE

---

### 4. Phân hệ: Điểm danh (Attendance)

* **Mã task:** ATT-PILOT-01
* **Phân hệ:** Điểm danh
* **Vấn đề / phần còn thiếu:** Chưa khóa điểm danh của các ngày trước khi ngày đó đã thực hiện Đối soát cuối ngày (Daily Close).
* **Mức độ ưu tiên:** POST_PILOT_PRIORITY
* **Có chặn vận hành thử không:** Không
* **Rủi ro nếu chưa làm:** Giáo viên có thể vô tình sửa điểm danh ngày cũ dẫn đến sai lệch doanh thu thực tế học phí đã được đối soát và chốt sổ.
* **Đề xuất xử lý:** Bổ sung logic kiểm tra: nếu ngày điểm danh đã tồn tại bản ghi đối soát ở trạng thái `completed`, không cho phép sửa đổi điểm danh qua API và UI.
* **Phase đề xuất:** Phase 1 - Sau 3-7 ngày chạy thử.

---

### 5. Phân hệ: Học phí / Công nợ (Tuition & Debt)

* **Mã task:** PAY-03 (Chính sách lương/học phí nâng cao theo từng nhân sự - Đã khóa)
* **Phân hệ:** Học phí / Công nợ
* **Vấn đề / phần còn thiếu:** Chính sách lương/chiết khấu đặc thù riêng cho học viên VIP hoặc nhóm gia đình chưa tự động hóa.
* **Mức độ ưu tiên:** SAFE_FOR_PILOT_WITH_NOTE
* **Có chặn vận hành thử không:** Không
* **Rủi ro nếu chưa làm:** Kế toán phải tự tính số tiền giảm trừ học phí bên ngoài trước khi nhập số tiền giao dịch thực tế vào hệ thống.
* **Đề xuất xử lý:** Nhập số tiền thu thực tế sau giảm trừ thủ công. Ghi nhận chi tiết chiết khấu vào trường ghi chú giao dịch.
* **Phase đề xuất:** Phase 2 - Triển khai chính thức.

---

### 6. Phân hệ: Đối soát cuối ngày (Daily Close)

* **Mã task:** REC-PILOT-01
* **Phân hệ:** Đối soát cuối ngày
* **Vấn đề / phần còn thiếu:** Chưa tự động chốt két tiền mặt và so sánh chênh lệch giữa số tồn quỹ thực tế và tồn quỹ sổ sách trực tuyến.
* **Mức độ ưu tiên:** SAFE_FOR_PILOT_WITH_NOTE
* **Có chặn vận hành thử không:** Không
* **Rủi ro nếu chưa làm:** Không phát hiện được việc thất thoát tiền mặt vật lý tại trung tâm tại thời điểm chốt ca.
* **Đề xuất xử lý:** Kế toán đối chiếu tiền mặt thực tế trong két và nhập số dư két vào phần ghi chú đối soát cuối ngày.
* **Phase đề xuất:** Phase 1 - Chạy thử nghiệm.

---

### 7. Phân hệ: Báo cáo / Report Center

* **Mã task:** RPT-PILOT-01
* **Phân hệ:** Báo cáo / Report Center
* **Vấn đề / phần còn thiếu:** 27 báo cáo chưa triển khai trong hệ thống cần được khóa hẳn để tránh gây hiểu nhầm cho người dùng.
* **Mức độ ưu tiên:** DISABLE_OR_HIDE
* **Có chặn vận hành thử không:** Không
* **Rủi ro nếu chưa làm:** Người dùng click vào các báo cáo này có thể tưởng là lỗi hoặc không rõ chức năng.
* **Đề xuất xử lý:** Ẩn các báo cáo chưa triển khai ra khỏi danh mục chọn của UI hoặc khóa click chọn kèm nhãn cảnh báo (Đã xử lý xong ở RPT-OPS-READY-AUDIT).
* **Phase đề xuất:** Đã hoàn thành trong đợt rà soát.

---

### 8. Phân hệ: Nhân sự / Lương / Tạm ứng (Payroll & Advances)

* **Mã task:** PAY-04 + PAY-05 (Chính sách thuế, bảo hiểm nâng cao & chuẩn hóa dòng tiền lương)
* **Phân hệ:** Nhân sự / Lương / Tạm ứng
* **Vấn đề / phần còn thiếu:** Cơ chế tự động tính thuế TNCN lũy tiến, bảo hiểm xã hội bắt buộc và quản lý tự động khấu trừ tạm ứng âm vào bảng lương tháng.
* **Mức độ ưu tiên:** SAFE_FOR_PILOT_WITH_NOTE
* **Có chặn vận hành thử không:** Không
* **Rủi ro nếu chưa làm:** Bảng lương tự động tính ra có thể chưa trừ bảo hiểm hay thuế lũy tiến chính xác theo luật lao động.
* **Đề xuất xử lý:** Kế toán điều chỉnh bảng lương (nhập tay ghi đè các cột giảm trừ phụ cấp, thuế, tạm ứng) trong giao diện Bảng Lương trước khi bấm Duyệt.
* **Phase đề xuất:** Phase 2 - Hậu vận hành thử.

---

### 9. Phân hệ: Tham số hệ thống (System Parameters)

* **Mã task:** CFG-PILOT-01
* **Phân hệ:** Tham số hệ thống
* **Vấn đề / phần còn thiếu:** Thiếu giao diện phân quyền chỉnh sửa tham số (hiện tại bất kỳ Admin nào cũng sửa được mà không cần phê duyệt chéo).
* **Mức độ ưu tiên:** SAFE_FOR_PILOT_WITH_NOTE
* **Có chặn vận hành thử không:** Không
* **Rủi ro nếu chưa làm:** Người dùng có quyền Admin có thể chỉnh sửa tùy tiện tham số hệ thống mà không qua kiểm duyệt.
* **Đề xuất xử lý:** Hạn chế quyền tài khoản đăng nhập Admin trong giai đoạn chạy thử (chỉ giao tài khoản `admin` cho Quản lý Trung tâm).
* **Phase đề xuất:** FUTURE_PHASE

---

### 10. Phân hệ: Import / Backup / Restore (Data Ops)

* **Mã task:** DATA-PILOT-01
* **Phân hệ:** Import / Backup / Restore
* **Vấn đề / phần còn thiếu:** Chưa tự động backup định kỳ hàng ngày (hiện tại chỉ có tạo backup thủ công qua nút bấm của Admin).
* **Mức độ ưu tiên:** POST_PILOT_PRIORITY
* **Có chặn vận hành thử không:** Không
* **Rủi ro nếu chưa làm:** Rủi ro mất mát dữ liệu trong ngày nếu máy chủ gặp sự cố mà admin quên bấm nút backup tay.
* **Đề xuất xử lý:** Kế toán/Admin chủ động tải file backup cuối mỗi ngày làm việc sau khi đã hoàn thành đối soát cuối ngày.
* **Phase đề xuất:** Phase 1 - Triển khai script backup tự động qua cron job.

---

### 11. Phân hệ: Phân quyền / User (ACL)

* **Mã task:** ACL-PILOT-01
* **Phân hệ:** Phân quyền / User
* **Vấn đề / phần còn thiếu:** Chưa phân rã chi tiết quyền năng động (Role-based Access Control) mà đang phân quyền cứng theo 3 nhóm: admin, staff, teacher.
* **Mức độ ưu tiên:** SAFE_FOR_PILOT_WITH_NOTE
* **Có chặn vận hành thử không:** Không
* **Rủi ro nếu chưa làm:** Nhân viên văn phòng (staff) có một số quyền hạn cố định chưa thể điều chỉnh linh hoạt.
* **Đề xuất xử lý:** Sử dụng phân hệ tài khoản mặc định và giám sát hành động qua Audit Log.
* **Phase đề xuất:** FUTURE_PHASE

---

### 12. Phân hệ: UI / UX (User Interface)

* **Mã task:** UI-PILOT-01
* **Phân hệ:** UI / UX
* **Vấn đề / phần còn thiếu:** Giao diện chưa tối ưu hoàn toàn cho thiết bị di động màn hình nhỏ (chủ yếu tối ưu tốt trên Tablet và Desktop).
* **Mức độ ưu tiên:** SAFE_FOR_PILOT_WITH_NOTE
* **Có chặn vận hành thử không:** Không
* **Rủi ro nếu chưa làm:** Giáo viên và nhân viên khó thao tác nhanh trên điện thoại cá nhân.
* **Đề xuất xử lý:** Khuyến nghị nhân viên và giáo viên sử dụng máy tính bảng hoặc máy tính xách tay để làm việc với hệ thống.
* **Phase đề xuất:** Phase 2.

---

### 13. Phân hệ: Daily Operation Flow (Quy trình vận hành ca)

* **Mã task:** OPS-PILOT-01
* **Phân hệ:** Daily Operation Flow
* **Vấn đề / phần còn thiếu:** Chưa có màn hình check-in/check-out ca trực trực quan cho nhân viên lễ tân trực tiếp tại quầy.
* **Mức độ ưu tiên:** SAFE_FOR_PILOT_WITH_NOTE
* **Có chặn vận hành thử không:** Không
* **Rủi ro nếu chưa làm:** Khó chấm công giờ làm thực tế của nhân viên văn phòng.
* **Đề xuất xử lý:** Theo dõi giờ làm việc của nhân viên văn phòng bằng bảng chấm công Excel bên ngoài.
* **Phase đề xuất:** FUTURE_PHASE

---

### 14. Phân hệ: Dữ liệu thật / DATA-02 (Data Migration)

* **Mã task:** DATA-02
* **Phân hệ:** Dữ liệu thật / DATA-02
* **Vấn đề / phần còn thiếu:** Chưa nhập dữ liệu lịch sử và hồ sơ thật của học sinh từ các tệp Excel quản lý cũ.
* **Mức độ ưu tiên:** SAFE_FOR_PILOT_WITH_NOTE
* **Có chặn vận hành thử không:** Không
* **Rủi ro nếu chưa làm:** Hệ thống chưa có số liệu lịch sử học tập.
* **Đề xuất xử lý:** Chỉ chạy thử nghiệm (Pilot) với các lớp học mới hoặc lớp chọn lọc nhập mẫu. Không nạp dữ liệu lịch sử quá lớn khi chưa ổn định.
* **Phase đề xuất:** Phase 1 - Chạy thử nghiệm có kiểm soát.

---

### 15. Phân hệ: Báo cáo chưa hoàn thiện (Disabled Reports)

* **Mã task:** RPT-PILOT-02
* **Phân hệ:** Báo cáo chưa hoàn thiện
* **Vấn đề / phần còn thiếu:** Các báo cáo phức tạp như P&L chi tiết, bảng tổng hợp lương nâng cao chưa liên kết động với công thức thực chi.
* **Mức độ ưu tiên:** FUTURE_PHASE
* **Có chặn vận hành thử không:** Không
* **Rủi ro nếu chưa làm:** Số liệu tài chính tổng quan P&L chỉ hiển thị dòng tiền thực tế và lương thực nhận (netSalary) mà chưa có chi phí trích trước lương chính xác.
* **Đề xuất xử lý:** Đọc kỹ ghi chú công thức tài chính và đối chiếu số liệu báo cáo dòng tiền thực tế.
* **Phase đề xuất:** Future Phase (khi triển khai PAY-05).
