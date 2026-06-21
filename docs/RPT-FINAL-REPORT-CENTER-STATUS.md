# RPT-FINAL-REPORT-CENTER-STATUS — Trạng thái chi tiết của các Báo cáo

Tài liệu này liệt kê chi tiết trạng thái của toàn bộ 46 báo cáo trong hệ thống Kim Academy phục vụ giai đoạn chạy thử nghiệm (Pilot). Các báo cáo chưa sẵn sàng đã được tạm ẩn hoặc khóa (disabled) trên giao diện để đảm bảo an toàn vận hành, tránh gây hiểu nhầm.

---

## 1. TÓM TẮT TRẠNG THÁI BÁO CÁO

* **Tổng số báo cáo:** 46
* **Báo cáo Hoạt động (Active):** 11
* **Báo cáo Bị khóa/Ẩn (Disabled/Hidden):** 35

---

## 2. CHI TIẾT TRẠNG THÁI TỪNG BÁO CÁO

| Mã báo cáo | Tên báo cáo | Nhóm | Trạng thái trước | Trạng thái sau | Lý do khóa/ẩn | Phase đề xuất | Hiển thị trên UI | Export được không |
| :--- | :--- | :--- | :---: | :---: | :--- | :---: | :---: | :---: |
| **center_finance_summary** | Tổng hợp tài chính tháng | Tổng quan | Active | **Active** | Báo cáo MVP phục vụ Pilot | Pilot | Có | Có |
| **student_active_summary** | Danh sách học viên đang học | Học viên | Active | **Active** | Báo cáo MVP phục vụ Pilot | Pilot | Có | Có |
| **student_waiting_class_detail** | Danh sách học viên chờ xếp lớp | Học viên | Disabled | **Active** | Báo cáo Tuyển sinh/Học viên chờ lớp mới triển khai | Pilot | Có | Có |
| **class_list_summary** | Danh sách lớp học | Lớp học | Active | **Active** | Báo cáo MVP phục vụ Pilot | Pilot | Có | Có |
| **class_waiting_open_detail** | Danh sách lớp chờ mở | Lớp học | Disabled | **Active** | Báo cáo lớp chưa khai giảng/chờ mở mới triển khai | Pilot | Có | Có |
| **tuition_collected_summary** | Học phí đã thu | Học phí | Active | **Active** | Báo cáo MVP phục vụ Pilot | Pilot | Có | Có |
| **tuition_debt_summary** | Công nợ học viên | Học phí | Active | **Active** | Báo cáo MVP phục vụ Pilot | Pilot | Có | Có |
| **attendance_by_class_detail** | Điểm danh theo lớp | Lớp học | Active | **Active** | Báo cáo MVP phục vụ Pilot | Pilot | Có | Có |
| **reconcile_daily_summary** | Đối soát cuối ngày | Đối soát | Active | **Active** | Báo cáo MVP phục vụ Pilot | Pilot | Có | Có |
| **admission_summary_report** | Tuyển sinh tổng hợp | Tuyển sinh | Active | **Active** | Báo cáo MVP phục vụ Pilot | Pilot | Có | Có |
| **admission_waiting_class_detail** | Tuyển sinh chờ xếp lớp | Tuyển sinh | Active | **Active** | Báo cáo MVP phục vụ Pilot | Pilot | Có | Có |
| **center_active_summary** | Tổng hợp hoạt động tháng | Tổng quan | Disabled | **Disabled** | Tránh trùng lặp chỉ số chưa chuẩn hóa | Phase 1 | Có (Khóa) | Không |
| **center_student_class_detail** | Tổng hợp học viên/lớp học | Tổng quan | Disabled | **Disabled** | Quy mô sĩ số chưa tối ưu | Phase 1 | Có (Khóa) | Không |
| **center_tuition_unearned_detail** | Tổng hợp công nợ/học phí chưa thực hiện | Tổng quan | Disabled | **Disabled** | Chưa chuẩn hóa công thức P&L liên kết | Phase 2 | Có (Khóa) | Không |
| **student_new_detail** | Học viên mới | Học viên | Disabled | **Disabled** | Sẽ làm sau giai đoạn chạy thử | Phase 1 | Có (Khóa) | Không |
| **student_left_detail** | Học viên nghỉ học | Học viên | Disabled | **Disabled** | Chưa đồng bộ quy trình Left hẳn | Phase 1 | Có (Khóa) | Không |
| **student_near_end_detail** | Học viên sắp hết buổi | Học viên | Disabled | **Disabled** | Cần điều chỉnh tham số ngưỡng linh hoạt | Phase 1 | Có (Khóa) | Không |
| **student_end_detail** | Học viên hết buổi | Học viên | Disabled | **Disabled** | Sẽ làm sau giai đoạn chạy thử | Phase 1 | Có (Khóa) | Không |
| **student_debt_detail** | Học viên âm học phí | Học viên | Disabled | **Disabled** | Trùng lặp một phần với Báo cáo Công nợ | Phase 1 | Có (Khóa) | Không |
| **student_absent_frequent** | Học viên vắng nhiều | Học viên | Disabled | **Disabled** | Thuật toán chuỗi ngày vắng cần tối ưu | Phase 1 | Có (Khóa) | Không |
| **student_no_attendance** | Học viên lâu chưa đi học | Học viên | Disabled | **Disabled** | Tránh cảnh báo giả khi chưa chạy thật | Phase 1 | Có (Khóa) | Không |
| **attendance_by_date_detail** | Điểm danh theo ngày | Lớp học | Disabled | **Disabled** | Lượng bản ghi lớn, cần phân trang | Phase 2 | Có (Khóa) | Không |
| **attendance_rate_detail** | Chuyên cần học viên | Lớp học | Disabled | **Disabled** | Sẽ làm sau giai đoạn chạy thử | Phase 2 | Có (Khóa) | Không |
| **attendance_sessions_used** | Số buổi đã học | Lớp học | Disabled | **Disabled** | Trùng lặp một phần với Báo cáo Số buổi còn lại | Phase 2 | Có (Khóa) | Không |
| **class_unattended_detail** | Lớp chưa điểm danh | Lớp học | Disabled | **Disabled** | Cần liên kết lịch học động | Phase 2 | Có (Khóa) | Không |
| **tuition_unearned_summary** | Học phí chưa thực hiện | Học phí | Disabled | **Disabled** | Sẽ làm sau giai đoạn chạy thử | Phase 2 | Có (Khóa) | Không |
| **tuition_payment_history** | Lịch sử đóng học phí | Học phí | Disabled | **Disabled** | Sẽ làm sau giai đoạn chạy thử | Phase 1 | Có (Khóa) | Không |
| **tuition_sessions_remaining** | Số buổi còn lại | Học phí | Disabled | **Disabled** | Sẽ làm sau giai đoạn chạy thử | Phase 1 | Có (Khóa) | Không |
| **tuition_by_class** | Học phí theo lớp | Học phí | Disabled | **Disabled** | Cần chuẩn hóa dồn tích | Phase 2 | Có (Khóa) | Không |
| **tuition_by_student** | Học phí theo học viên | Học phí | Disabled | **Disabled** | Sẽ làm sau giai đoạn chạy thử | Phase 1 | Có (Khóa) | Không |
| **pnl_monthly_summary** | Báo cáo lợi nhuận thực tế (P&L) | Thu chi | Disabled | **Disabled** | Chưa triển khai thuế & lương nâng cao (PAY-04/05) | Phase 2 | Có (Khóa) | Không |
| **cash_income_detail** | Tiền đã thu | Thu chi | Disabled | **Disabled** | Trùng lặp một phần với Học phí đã thu | Phase 1 | Có (Khóa) | Không |
| **earned_tuition_detail** | Doanh thu thực học phí | Thu chi | Disabled | **Disabled** | Cần đối chiếu kỹ lưỡng kế toán | Phase 2 | Có (Khóa) | Không |
| **other_income_detail** | Doanh thu khác | Thu chi | Disabled | **Disabled** | Sẽ làm sau giai đoạn chạy thử | Phase 1 | Có (Khóa) | Không |
| **operating_expenses_detail** | Chi phí | Thu chi | Disabled | **Disabled** | Sẽ làm sau giai đoạn chạy thử | Phase 1 | Có (Khóa) | Không |
| **profit_earned_object** | Lợi nhuận thực | Thu chi | Disabled | **Disabled** | Chưa đủ an toàn do thiếu thuế TNCN lũy tiến | Phase 2 | Có (Khóa) | Không |
| **profit_cash_object** | Lợi nhuận theo tiền thu | Thu chi | Disabled | **Disabled** | Sẽ làm sau giai đoạn chạy thử | Phase 2 | Có (Khóa) | Không |
| **staff_salary_summary** | Lương nhân viên & giáo viên | Nhân sự | Disabled | **Disabled** | Đợi triển khai chính sách lương riêng (PAY-03) | Phase 2 | Có (Khóa) | Không |
| **teacher_attendance_detail** | Chấm công giáo viên | Nhân sự | Disabled | **Disabled** | Sẽ làm sau giai đoạn chạy thử | Phase 1 | Có (Khóa) | Không |
| **salary_advance_detail** | Tạm ứng lương | Nhân sự | Disabled | **Disabled** | Sẽ làm sau giai đoạn chạy thử | Phase 1 | Có (Khóa) | Không |
| **staff_missing_teaching_log** | Thiếu TeachingLog | Nhân sự | Disabled | **Disabled** | Tránh cảnh báo giả khi chưa chạy thật | Phase 1 | Có (Khóa) | Không |
| **staff_missing_rate** | Giáo viên thiếu đơn giá | Nhân sự | Disabled | **Disabled** | Sẽ làm sau giai đoạn chạy thử | Phase 1 | Có (Khóa) | Không |
| **reconcile_pending_detail** | Ngày chưa đối soát | Đối soát | Disabled | **Disabled** | Cần tự động quét lịch học động | Phase 1 | Có (Khóa) | Không |
| **audit_logs_detail** | Audit log thao tác | Đối soát | Disabled | **Disabled** | Chỉ dùng cho Admin kiểm tra nội bộ qua DB | Phase 2 | Có (Khóa) | Không |
| **reconcile_error_transactions** | Giao dịch lỗi dữ liệu | Đối soát | Disabled | **Disabled** | Sẽ làm sau giai đoạn chạy thử | Phase 2 | Có (Khóa) | Không |
| **reconcile_warning_expenses** | Khoản chi cần kiểm tra | Đối soát | Disabled | **Disabled** | Sẽ làm sau giai đoạn chạy thử | Phase 2 | Có (Khóa) | Không |

---

## 3. CƠ CHẾ KHÓA AN TOÀN TRÊN UI

* **Không chọn được:** Các radio button chọn báo cáo bị disabled hoàn toàn trên giao diện. Bấm vào nút/nhãn không thay đổi báo cáo hoạt động.
* **Không chạy compute:** Đã bổ sung kiểm tra `if (!activeReport.implemented)` vào hook `useMemo` tính toán dữ liệu, tránh gọi hàm compute của báo cáo chưa sẵn sàng.
* **Không export:** Nút "Xuất Excel" bị disable hoàn toàn nếu báo cáo chưa được triển khai hoặc không có dữ liệu.
* **Không hiển thị bảng rỗng:** Giao diện hiển thị panel thông báo rõ ràng: *"Báo cáo không dùng trong giai đoạn chạy thử. Sẽ triển khai sau."* kèm biểu tượng cảnh báo an toàn thay vì bảng rỗng gây hiểu nhầm.
