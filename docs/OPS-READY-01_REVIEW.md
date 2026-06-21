# Báo cáo rà soát hệ thống sẵn sàng vận hành thử nghiệm (OPS-READY-01)

Tài liệu này ghi nhận kết quả rà soát toàn bộ hệ thống Kim Academy trước khi bắt đầu giai đoạn vận hành thử nghiệm, phân loại lỗi/sai sót và đề xuất phạm vi sử dụng an toàn.

---

## 1. Danh sách phân hệ đã rà soát

1. **Học viên:**
   - Đã kiểm tra luồng Tạo/sửa học viên, xem chi tiết và cập nhật thông tin.
   - Các trường thông tin cơ bản (SĐT phụ huynh, Zalo, địa chỉ, năm sinh, đơn giá học phí/buổi) đã đầy đủ.
   - Đã xác nhận `studentId` được sử dụng làm khóa ngoại duy nhất liên kết xuyên suốt trong các phân hệ: Điểm danh (`AttendanceRecord`), Giao dịch thu phí (`Transaction`), Xếp lớp (`Enrollment`), và các báo cáo thống kê.
2. **Lớp học:**
   - Luồng Tạo/sửa lớp, gán Giáo viên phụ trách chính (qua `teacherId`), thiết lập sĩ số tối đa, và thay đổi trạng thái hoạt động của lớp học đều ổn định.
3. **Điểm danh:**
   - Trạng thái `present` (Có mặt) và `absent` (Vắng không phép) đều thực hiện trừ 1 buổi học khả dụng và tính chi phí buổi học.
   - Trạng thái `excused` (Vắng có phép) không trừ buổi học khả dụng và không phát sinh chi phí.
   - Logic tính toán số buổi còn lại (`sessionsRemaining`) sau khi điểm danh đã hoạt động chính xác.
4. **Học phí / Công nợ:**
   - Cơ chế tính công nợ lũy kế dựa trên Tổng thực thu offline trừ đi Tổng giá trị buổi học đã sử dụng hoạt động đúng theo kế toán dồn tích.
   - Xác thực dung sai import số dư đầu kỳ (`openingBalanceToleranceSessions`) hoạt động tốt dựa trên tham số hệ thống động.
5. **Giao dịch khác:**
   - Giao dịch phụ thu (Sách, Đồng phục, Lệ phí thi) được phân loại doanh thu riêng biệt, không làm cộng dồn số buổi học khả dụng của học viên.
6. **Báo cáo tài chính (P&L & Cash Flow):**
   - Báo cáo P&L (chi phí dồn tích) hạch toán chi phí nhân sự chính xác bằng lương gộp (`grossSalary`).
   - Báo cáo dòng tiền mặt (`center_finance_summary`) hạch toán lương theo thực chi lương thực nhận (`netSalary`), có bổ sung cảnh báo về dòng tiền lương đầy đủ sẽ được chuẩn hóa ở phase sau.
   - Rà soát toàn bộ các nhãn trong Report Center để tránh hiểu lầm nghiệp vụ kế toán.
7. **Nhân sự & Tính lương:**
   - Cơ chế tính lương cơ bản, tính lương theo buổi dạy dạy thực tế của giáo viên, phụ cấp và các khoản thưởng/khấu trừ tháng hoạt động bình thường.
8. **Tạm ứng lương:**
   - Logic tạm ứng lương không tự tạo operating expense trong `expenses.json` (tránh tính trùng chi phí P&L).
   - Logic carry-over ứng vượt hoạt động an toàn, cảnh báo rõ ràng trên giao diện và yêu cầu kế toán xử lý thu hồi/khấu trừ thủ công.
9. **Tham số hệ thống (System Parameters):**
   - Đã tích hợp cấu hình tham số động cho các ngưỡng cảnh báo, tỷ lệ bảo hiểm và thuế cố định.
   - API `/api/system-parameters*` trả JSON chuẩn xác kể cả lỗi 401/403.
10. **Import Excel & Backup:**
    - Hoạt động dry-run ngăn chặn lỗi blocking trước khi import thật.
    - Cơ chế backup tự động và khôi phục dữ liệu nghiệp vụ/toàn bộ hoạt động ổn định, bảo toàn `users` và `system_parameters.json`.
11. **Dashboard hôm nay:**
    - Hiển thị đầy đủ tổng thu, tổng chi thực tế, số buổi dạy của giáo viên, danh sách học sinh cần nhắc học phí.
12. **Đối soát cuối ngày:**
    - Logic đối soát thu chi thực tế trong ngày và ghi audit log hoạt động đúng nghiệp vụ.
13. **Audit Log:**
    - Nhật ký hệ thống ghi nhận đầy đủ tất cả các thay đổi dữ liệu quan trọng cùng thông tin tài khoản thực hiện.
14. **UI/UX:**
    - Giao diện trực quan, hỗ trợ tiếng Việt đầy đủ cho nhân viên không biết kỹ thuật. Không sử dụng các hàm pop-up mặc định của trình duyệt (`alert`, `confirm`, `prompt`).
15. **Phân quyền:**
    - Phân quyền cụ thể giữa quyền Admin (toàn quyền, sửa cấu hình/tham số) và Nhân viên thường (chỉ xem hoặc thao tác nghiệp vụ cơ bản).

---

## 2. Các công thức/logic đã kiểm tra

* **Công thức số dư học phí:**
  $$moneyRemaining = totalPaidOffline - totalCostUsed$$
* **Công thức số buổi còn lại:**
  $$sessionsRemaining = \lfloor \frac{moneyRemaining}{feePerSession} \rfloor$$
* **Công thức lương gộp:**
  $$grossSalary = baseSalary + (totalSessions \times ratePerSession) + otherSalary - kpiDeduction$$
* **Logic kiểm soát ứng vượt carry-over:**
  $$advanceCarryOver = totalAdvance - advanceApplied$$

---

## 3. Danh sách lỗi phát hiện & Phân loại ưu tiên

| Mã lỗi | Phân hệ | Mô tả chi tiết | Phân loại | Đề xuất hướng xử lý |
| :--- | :--- | :--- | :--- | :--- |
| **ERR-01** | Tuyển sinh | Chưa có phân hệ Tuyển sinh để ghi nhận học viên tiềm năng và kết quả kiểm tra đầu vào trước khi chuyển thành học viên chính thức. | **BLOCKER** | Triển khai phân hệ Tuyển sinh tối thiểu trong task này (ADM-01). |
| **ERR-02** | Lương nhân sự | Chính sách lương động theo thời gian (`PAY-03`) và tính toán thuế/bảo hiểm tự động nâng cao (`PAY-04/TAX-01`) chưa được hoàn thiện. | **MEDIUM** | Khóa các nút cấu hình nâng cao chưa chạy; ghi chú rõ ràng trên UI để kế toán sử dụng nhập tay hoặc thuế suất cố định 10%. |
| **ERR-03** | Điểm danh | Nguy cơ thao tác nhầm đổi trạng thái điểm danh của các ngày cũ trong quá khứ dẫn đến lệch công nợ học viên dồn tích. | **OPERATIONAL_NOTE** | Đào tạo nhân sự chỉ điểm danh đúng ngày hiện tại; khóa quyền sửa điểm danh tháng trước nếu đã đối soát. |
| **ERR-04** | Nhắc đóng phí | Tooltip và cảnh báo tạm ứng ứng vượt hiển thị dòng chữ mang tính tự động carry-over nhưng thực tế đòi hỏi kế toán đối soát thủ công. | **HIGH** | Sửa đổi text tooltip thành: "Dư ứng chưa thu hồi kỳ trước: Xđ. Cần kế toán kiểm tra thủ công." |

---

## 4. Phân loại mức độ sẵn sàng vận hành của các phân hệ

### A. Phân hệ đủ dùng để chạy thử ngay
* **Tuyển sinh (sau khi code ADM-01):** Quy trình lead $\rightarrow$ hẹn test $\rightarrow$ cập nhật kết quả $\rightarrow$ chuyển học viên.
* **Quản lý học viên & Lớp học:** Các thao tác lưu trữ thông tin, thay đổi trạng thái và xếp lớp.
* **Thu học phí & Đối soát quỹ:** Ghi nhận thực thu phí offline, phân loại doanh thu và đối soát quỹ cuối ngày.
* **Điểm danh & Chấm công:** Điểm danh học viên theo buổi học thực tế và tự động chấm công giáo viên chủ nhiệm.

### B. Phân hệ chỉ nên dùng hạn chế
* **Tính lương & Tạm ứng:** Kế toán có thể tính lương cơ bản và buổi dạy dạy thực tế, nhưng đối với bảo hiểm và thuế TNCN phức tạp, kế toán cần tự tính toán bên ngoài và sử dụng trường "Khấu trừ khác" / "Lương khác phát sinh" để điền thủ công vào bảng lương.
* **Thay đổi học phí hồi tố:** Việc thay đổi học phí hồi tố diện rộng có thể gây biến động lớn đến công nợ học sinh, chỉ nên dùng khi thực sự cần thiết và có sự giám sát của Admin.

### C. Phân hệ chưa nên dùng chính thức
* **Thuế lũy tiến tự động và bảo hiểm tự động:** Do chưa tích hợp biểu thuế lũy tiến và các chính sách đóng góp của doanh nghiệp đầy đủ (`PAY-04`, `TAX-01`).

---

## 5. Kết quả kiểm tra bổ sung - Phân hệ Báo cáo (RPT-OPS-READY-AUDIT)

Đã thực hiện rà soát và đánh giá an toàn cho toàn bộ phân hệ Báo cáo (Report Center):
* **Báo cáo MVP và Báo cáo Tuyển sinh:** Đã triển khai và xác minh thành công 7 báo cáo cốt lõi (Tài chính tháng, Điểm danh theo lớp, Học phí đã thu, Công nợ học viên, Đối soát cuối ngày, Tổng hợp tuyển sinh, Danh sách chờ xếp lớp).
* **An toàn dữ liệu & Lỗi giao diện:** Không phát hiện lỗi `NaN`, `Invalid Date`, hay `undefined`. Giao diện các báo cáo chưa triển khai đã được khóa an toàn, ngăn chặn click và xuất Excel rỗng gây hiểu nhầm.
* **Test script:** Tạo và chạy thành công script `scratch/test_reports_ops_ready.ts` kiểm thử toàn bộ báo cáo ở chế độ read-only, đảm bảo an toàn tuyệt đối cho dữ liệu hiện có.
* **Backlog vận hành thử (Pilot Backlog):** Đã phân loại và lập danh sách chi tiết các công việc còn lại tại `docs/OPS-PILOT-BACKLOG.md` theo các cấp độ ưu tiên từ chặn vận hành (`BLOCKER_FOR_PILOT`) đến các phase tương lai (`FUTURE_PHASE`).

---

## 6. Checklist vận hành thử nghiệm 3-7 ngày

- [x] **Ngày 1:** Nhập danh sách giáo viên, lớp học thực tế và cấu hình tham số hệ thống ban đầu (Admin thực hiện) - *Đã sẵn sàng*.
- [x] **Ngày 2:** Tạo các lead tuyển sinh chạy thử, thực hiện hẹn test đầu vào và nhập điểm số đánh giá - *Đã sẵn sàng*.
- [x] **Ngày 3:** Chuyển đổi lead trúng tuyển thành học viên chính thức (thử cả trường hợp xếp lớp ngay và chờ xếp lớp). Nhập số dư học phí đầu kỳ cho học sinh cũ - *Đã sẵn sàng*.
- [x] **Ngày 4:** Thực hiện điểm danh lớp học hàng ngày, kiểm tra xem công chấm công giáo viên có tự động tạo ra hay không - *Đã sẵn sàng*.
- [x] **Ngày 5:** Thao tác thu học phí, xuất hóa đơn nháp, nhập các khoản chi phí vận hành phát sinh thực tế - *Đã sẵn sàng*.
- [x] **Ngày 6:** Thực hiện tạm ứng lương cho nhân viên và chạy thử bảng tính lương nháp cuối tháng - *Đã sẵn sàng*.
- [x] **Ngày 7:** Tiến hành đối soát quỹ tiền mặt cuối ngày, xuất báo cáo tài chính tháng P&L và Báo cáo dòng tiền để đối chiếu số liệu - *Đã sẵn sàng*.
- [x] **Rà soát & Đánh giá phân hệ báo cáo:** Thực hiện audit chi tiết Report Center (`RPT-OPS-READY-AUDIT.md`) và lập backlog (`OPS-PILOT-BACKLOG.md`) - *Đã hoàn thành*.

---

## 7. Kết luận cuối cùng về vận hành thử nghiệm (OPS-FINALIZE-PILOT-READY)

Sau đợt hoàn thiện hệ thống, tạo dữ liệu thử nghiệm và chạy tích hợp kiểm thử tự động, hệ thống Kim Academy đã đạt đầy đủ điều kiện để đi vào vận hành thử nghiệm (Pilot Ready) trong thời gian 3–7 ngày:
* **Hệ thống API an toàn:** Các endpoint API đã trả về JSON chuẩn ngay cả đối với lỗi unhandled `/api/*` (khắc phục lỗi HTML fallback).
* **Report Center an toàn:** 11 báo cáo phục vụ chạy thử hoạt động ổn định và chính xác. 35 báo cáo chưa sẵn sàng đã được tạm ẩn/khóa trên giao diện kèm nhãn cảnh báo rõ ràng.
* **Test script quy trình nghiệp vụ:** Chạy thành công chuỗi lệnh kiểm thử tự động (`create_pilot_test_data.ts` -> `test_pilot_full_flow.ts` -> `test_reports_ops_ready.ts` -> `cleanup_pilot_test_data.ts` -> `verify_pilot_cleanup.ts`), hoàn thành kiểm thử quy trình dồn tích học phí, điểm danh, công nợ, đối soát và P&L.
* **Bảo toàn dữ liệu gốc:** Cơ chế backup và khôi phục dữ liệu đã dọn dẹp sạch sẽ 100% các dữ liệu có tiền tố `TEST_PILOT_` và `TEST_RPT_`, bảo toàn tệp tin cấu hình (`users.json`, `system_parameters.json`).
* **Lỗi phát hiện:** Không còn lỗi thuộc nhóm **BLOCKER** hoặc **HIGH**. Các rủi ro còn lại đã được lập backlog vận hành rõ ràng.

