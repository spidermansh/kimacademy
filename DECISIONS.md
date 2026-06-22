# DECISIONS — Kim Academy v3

> Các quyết định nghiệp vụ & kỹ thuật đã chốt. Mỗi mục: **Quyết định / Lý do / File liên quan / Cấm làm sai**. Cập nhật: 2026-06-22.

---

## D1. Sổ cái học phí là MỘT NGUỒN SỰ THẬT
- **Quyết định:** Mọi thao tác ảnh hưởng tiền/buổi học (tạo/xóa giao dịch học phí, điểm danh, đổi học phí, chuyển lớp) phải gọi `recalcEnrollmentLedger(tx, enrollmentId)` để TÍNH LẠI sổ cái từ dữ liệu gốc.
- **Công thức (bất biến):** `totalPaid` = tổng `TuitionTransaction.amount` theo `enrollmentId`; `totalSpent` = tổng `feeApplied × sessionsDeducted` của attendance theo `enrollmentId`; `balance = totalPaid − totalSpent`; `sessionsRemaining = floor(balance / feePerSession)` (fee>0).
- **Lý do:** Trước audit có 2 đường cập nhật (finance cộng dồn vs attendance tính lại) gây trôi số. Hợp nhất giúp idempotent + có đối soát.
- **File:** `src/api/services/ledger.ts`; gọi tại `finance.ts`, `attendance.ts`, `enrollments.ts`; endpoint `src/api/routes/ledger.ts`; cron `src/api/jobs/ledger-reconcile.job.ts`.
- **Cấm:** Viết lại công thức sổ cái nội tuyến trong route; cập nhật `totalPaid/totalSpent/balance` thủ công thay vì gọi recalc.

## D2. Phân loại "Học phí offline" qua hằng số dùng chung
- **Quyết định:** Dùng `isTuitionRevenue(category)` và `REVENUE_CATEGORY_TUITION_OFFLINE` thay vì viết literal chuỗi.
- **Lý do:** Literal `'Học phí offline'` từng bị mojibake ở `finance.ts` → mọi khoản thu học phí bị phân loại nhầm thành RevenueOther + KHÔNG cập nhật sổ cái (bug nghiêm trọng Phase 0).
- **File:** `src/shared/constants.ts`; dùng ở `finance.ts`, `shared/business/tuition.ts`, FE.
- **Cấm:** So sánh trực tiếp với chuỗi `'Học phí offline'` ở bất kỳ đâu.

## D3. "Chuyển số dư" KHÔNG phải doanh thu
- **Quyết định:** Giao dịch `paymentMethod === 'Chuyển số dư'` (hằng `PAYMENT_METHOD_BALANCE_TRANSFER`) là bút toán nội bộ khi chuyển lớp — luôn loại khỏi mọi phép tính DOANH THU bằng `isInternalTransfer()`.
- **Lý do:** Đây là chuyển công nợ giữa 2 enrollment (đối ứng ±balance), không phải tiền thu mới.
- **File:** `src/shared/constants.ts`; loại ở `shared/business/reports.ts`, `tuition.ts`, `TransactionTable.tsx`.
- **Cấm:** Cộng các giao dịch "Chuyển số dư" vào tổng doanh thu/tổng thu.

## D4. Chuyển lớp mang theo CẢ công nợ âm
- **Quyết định:** Khi chuyển lớp, carry-over số dư cả khi `balance !== 0` (kể cả âm = đang nợ), không chỉ dương.
- **Lý do:** Trước đó chỉ carry số dư dương → công nợ của HV bị bỏ lại trên enrollment đã đóng (mất dấu).
- **File:** `src/api/routes/enrollments.ts` (POST `/enrollments/transfer`).
- **Cấm:** Bỏ qua số dư âm khi chuyển lớp.

## D5. Cột ngày = `DateTime @db.Date`, API contract = chuỗi `YYYY-MM-DD`
- **Quyết định:** DB lưu ngày kiểu `DateTime @db.Date` (date-only) / `DateTime` (timestamp như `completedAt`). Một **Prisma query extension** tự động: đọc Date của cột date-only → chuỗi `YYYY-MM-DD`; ghi/lọc chuỗi `YYYY-MM-DD` → Date. Nhờ đó FE + shared business + test giữ nguyên hợp đồng chuỗi.
- **Lý do:** Tránh viết lại toàn bộ FE/logic (vốn so sánh chuỗi) khi đổi kiểu cột.
- **File:** `src/infrastructure/db/prisma.client.ts` (biến `DATE_ONLY_FIELDS` + `normalizeDateInput/Output`); helper `src/api/utils/dates.ts` (`monthRange/dayRange/parseDate/toDateStr`).
- **Cấm:**
  - Thêm cột date-only mới mà **quên thêm tên cột vào `DATE_ONLY_FIELDS`** (sẽ lỗi "Expected ISO-8601 DateTime" khi ghi chuỗi — đúng bug `convertedAt` đã sửa).
  - Dùng filter `{ startsWith: month }` trên cột ngày — phải dùng `monthRange()/dayRange()`.
  - Ghi chuỗi `YYYY-MM-DD` vào cột timestamp thường (không `@db.Date`) — cột timestamp cần ISO đầy đủ.

## D6. Cột JSON dùng `Json` (jsonb), KHÔNG parse/stringify
- **Quyết định:** Các cột trước đây là JSON-trong-String giờ là `Json` (jsonb). Đọc/ghi giá trị JS trực tiếp; khi cần ép kiểu dùng `src/shared/json.ts` (`toArray/toObject/toJsonString/coerceJson`) hoặc `parseFeeHistory`.
- **Lý do:** jsonb có ràng buộc + query được; bỏ `JSON.parse` dễ vỡ.
- **File:** `prisma/schema.prisma` (scheduleDays/salaryHistory/feeHistory/...); `src/shared/json.ts`.
- **Cấm:** `JSON.parse`/`JSON.stringify` trên các cột jsonb; ghi chuỗi `'[]'` thay cho mảng `[]`.

## D7. JWT thu hồi được qua `tokenVersion`
- **Quyết định:** JWT mang claim `tv = User.tokenVersion`. `authenticateToken` so `tv` với DB. Logout và đổi mật khẩu **tăng `tokenVersion`** → vô hiệu mọi token cũ. `/auth/refresh` cấp token mới.
- **Lý do:** Trước đó logout là no-op, token sống 8h không hủy được.
- **File:** `src/api/middleware/auth.ts`, `src/api/routes/auth.ts`, `src/api/routes/users.ts`.
- **Cấm:** Bỏ kiểm tra `tokenVersion` trong middleware; quên tăng tokenVersion khi đổi mật khẩu.

## D8. `AuditLog.userId` & `createdById` là cột index, KHÔNG FK cứng
- **Quyết định:** Lưu `userId`/`createdById` (nullable, có index) song song tên hiển thị `user`/`createdBy`. KHÔNG đặt quan hệ FK cứng tới User.
- **Lý do:** Bản ghi lịch sử/audit cần GIỮ id kể cả khi user bị xóa; FK cứng sẽ chặn xóa hoặc null mất dấu.
- **File:** `prisma/schema.prisma` (AuditLog, 17 model có createdBy); `src/api/utils/audit.ts` (`writeAudit`).
- **Cấm:** Thêm `@relation` FK cho `AuditLog.userId`/`createdById`.

## D9. Kho — trạng thái "Đã thu tiền – chưa phát" (`issued=false`)
- **Quyết định:** `InventoryMovement.issued` (mặc định `true`). Bán cho học viên có 3 chế độ:
  - `paid + issued=true` (Thu tiền ngay): trừ kho ngay + ghi doanh thu.
  - `unpaid + issued=true` (Đã phát – chưa thu): trừ kho ngay, không doanh thu (thu sau qua `/collect-payment`).
  - `paid + issued=false` (**Đã thu – chưa phát**): **KHÔNG trừ kho, KHÔNG kiểm tra tồn lúc tạo**, ghi doanh thu ngay. Trừ kho + kiểm tra tồn khi gọi `POST /inventory/movements/:id/deliver`.
- **Lý do:** Tách "thu tiền" khỏi "phát hàng" — cho phép thu trước khi có hàng (hết tồn).
- **File:** `src/api/routes/inventory.ts` (create + endpoint `/deliver`); `src/ui/pages/InventoryManagement.tsx`.
- **Cấm:** Trừ kho cho movement `issued=false`; chặn tạo "đã thu–chưa phát" vì hết tồn (chỉ chặn lúc `/deliver`).

## D10. KHÔNG gỡ shim FE load-bearing trong response lương
- **Quyết định:** Giữ các trường alias `otherSalary`, `otherSalaryNote`, `teacherId`, `teacherName` trong response payroll (đã chú thích "FE contract"). Chỉ đã gỡ alias `tax` (xác minh FE không dùng).
- **Lý do:** `SalaryDashboard.tsx` ĐỌC + GỬI LẠI `otherSalary/otherSalaryNote`; `teacherId/teacherName` dùng rộng.
- **File:** `src/api/routes/payroll.ts`.
- **Cấm:** Gỡ các alias đang được FE dùng mà chưa kiểm tra + migrate FE.

## D11. Báo cáo tính CLIENT-SIDE
- **Quyết định:** `ReportsDashboard.tsx` nạp dữ liệu (qua props + tự gọi api cho kho) rồi gọi `report.compute(params)` ngay trên trình duyệt. Backend `/reports/run` có cùng logic (dùng cho test/server-side) nhưng UI không gọi.
- **Lý do:** Kiến trúc sẵn có; compute là hàm thuần dễ test.
- **File:** `src/shared/business/reports.ts` (REPORT_GROUPS + compute), `src/ui/pages/ReportsDashboard.tsx`, `src/api/routes/reports.ts`.
- **Cấm:** Đặt dữ liệu nặng/bí mật vào compute mà không cân nhắc (chạy ở client). Thêm báo cáo dùng dữ liệu mới phải nạp dữ liệu đó vào params ở CẢ FE (ReportsDashboard) lẫn route nếu cần server-side.

## D12. Migration đổi kiểu hiện tại là DROP+recreate (chỉ an toàn DB rỗng)
- **Quyết định (tạm):** Migration `json_columns`, `date_columns` sinh tự động ở dạng DROP cột + tạo lại (vì chạy trên bảng test rỗng).
- **Lý do:** Tiện cho môi trường dev/test (dữ liệu test).
- **Cấm:** Chạy `prisma migrate deploy` lên DB PRODUCTION có dữ liệu thật với các migration này — **sẽ mất dữ liệu**. Phải thay bằng migration `ALTER ... USING ...::date/::jsonb` trước (xem NEXT_STEPS).
