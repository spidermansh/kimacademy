# NEXT STEPS — Kim Academy v3

> Việc tiếp theo, ưu tiên, phạm vi, tiêu chí hoàn thành. Cập nhật: 2026-06-22.

## Ưu tiên & thứ tự
| # | Việc | Loại | Ghi chú |
|---|---|---|---|
| ~~1~~ | ~~**Báo cáo kho GĐ C** (4 báo cáo)~~ ✅ XONG (`989627c`) | Tính năng | Không đổi schema. Đã nghiệm chứng compute. |
| ~~2~~ | ~~**Báo cáo kho GĐ D** (theo nhà cung cấp)~~ ✅ XONG (`8dab25d`) | Tính năng | `supplierId` + migration thuần bổ sung. Báo cáo kho hoàn tất. |
| ~~3~~ | ~~**Sửa migration đổi kiểu thành bảo toàn dữ liệu**~~ ✅ XONG (`3a1181e`) | Hạ tầng | `ALTER ... USING`; nghiệm chứng reset + diff = No difference. |
| 4 | **Chuẩn bị PR `fix/audit` → `main`** | Quy trình | Migration nay đã an toàn (không còn cảnh báo phá dữ liệu). |
| 5 | **Rà soát phân hệ báo cáo (P1 ✅ / P2 ✅ / P3)** | Chất lượng | P1 (`ac09b0a`) + P2 (`e7ef5b1`) xong. P3 chờ duyệt — xem mục "RÀ SOÁT PHÂN HỆ BÁO CÁO" bên dưới. |

---

## ✅ ĐÃ XONG: Báo cáo kho GĐ C (commit `989627c`)

4 `ReportDefinition` đã thêm vào nhóm `grp_inventory` trong `src/shared/business/reports.ts` (compute thuần, không đổi schema):
- **`inv_kardex` — Thẻ kho (Kardex) theo mặt hàng** (`detail`, filter `invItem` + `dateRange`): từng dòng nhập/xuất + tồn lũy kế; dùng lại `delta()` của `inv_in_out_balance` (issued=false không trừ kho — D9).
- **`inv_incomplete` — Giao dịch kho chưa hoàn tất** (`detail`, `dateRange`): bán HV `unpaid` hoặc `issued=false`.
- **`inv_sales_by_class` — Bán vật tư theo lớp** (`object`, `class` + `dateRange`): gom theo lớp active của HV qua `enrollments`.
- **`inv_by_staff` — Giao dịch kho theo người thực hiện** (`object`, `search` + `dateRange`): gom theo `createdBy`.
  - **Lưu ý lệch so với gợi ý cũ:** dùng filter `search` (không phải `staff`) vì `movement.createdBy` là **tên tài khoản User** (`req.user.name`), KHÔNG phải `StaffMember.id` → dropdown staff không khớp.
- Filter mới `invItem` đã thêm: union `ReportDefinition.filters` + control select 'Mặt hàng' trong `ReportsDashboard.tsx` (mẫu giống `invCategory`/`invLocation`).
- Nghiệm chứng: `tsc` 0 lỗi · `npm test` 71/71 · `build` OK · compute đúng trên kịch bản phủ mọi nhánh issued/paymentStatus + map lớp.

> Còn thiếu (đề xuất, không bắt buộc): unit test cố định cho 4 báo cáo GĐ C trong `tests/unit/reports.test.ts` (cần mở rộng `buildReportParams` để nạp shape kho).

---

## ✅ ĐÃ XONG: Báo cáo kho GĐ D (commit `8dab25d`)
- **Schema:** `InventoryMovement.supplierId String?` + **FK cứng** tới `Supplier` (`ON DELETE SET NULL` — giữ bản ghi nhập khi NCC bị xóa) + index; back-relation `Supplier.movements`. Chọn FK (không phải id mềm D8) vì nhất quán với các quan hệ khác trên `InventoryMovement` (relatedStudent/Staff đều FK).
- **Migration `add_supplier_to_inventory_movement`:** THUẦN BỔ SUNG (`ADD COLUMN`/`INDEX`/`FK`, không DROP) → an toàn cả trên DB có dữ liệu (KHÁC nhóm migration đổi kiểu json/date).
- **Route:** `inventory.ts` nhận `supplierId` khi `purchase_in` (zod passthrough), lưu + GET include `supplier`; `reports.ts` route map `supplierName` server-side.
- **Báo cáo `inv_purchase_by_supplier`** (`summary`, `dateRange`): gom SL + giá trị nhập theo NCC.
- **UI:** select 'Nhà cung cấp' trong form nhập kho `InventoryManagement.tsx`.
- Nghiệm chứng: `tsc` 0 lỗi · `npm test` 71/71 · `build` OK · round-trip thực (tạo `purchase_in` có supplierId → đọc include → map → compute) đúng số liệu.

> Còn thiếu (đề xuất, không bắt buộc): unit test cố định cho báo cáo kho GĐ C/D.

---

## ✅ ĐÃ XONG — HẠ TẦNG: Migration bảo toàn dữ liệu (commit `3a1181e`)
- `20260621124340_json_columns` và `20260621132559_date_columns` đã đổi từ DROP+recreate sang `ALTER COLUMN ... SET DATA TYPE ... USING ...` → **giữ nguyên dữ liệu** khi `migrate deploy` lên DB có sẵn. Chi tiết kỹ thuật & quy ước USING: xem **DECISIONS D12**.
- Nghiệm chứng: test biểu thức USING trên giá trị biên (rollback); `migrate reset` áp lại toàn bộ sạch; `migrate diff` (live DB ↔ schema.prisma) = **No difference**; `tsc`/`npm test` 71/71/`build` xanh.
- `migrate deploy` các migration này lên prod có dữ liệu nay **AN TOÀN** (không còn phá dữ liệu).

---

## TASK KẾ TIẾP — QUY TRÌNH: Chuẩn bị PR `fix/audit` → `main`
- Toàn bộ audit Phase 0–3 + 2 fix + kho (issued/deliver) + báo cáo kho GĐ A→D + fix migration bảo toàn dữ liệu đã xong; working tree sạch (chờ push).
- Mở PR `fix/audit` → `main`; mô tả tóm tắt các nhóm thay đổi. Migration nay an toàn nên **không còn cảnh báo phá dữ liệu** bắt buộc, nhưng nên ghi chú: chạy `prisma migrate deploy` (KHÔNG `db push`) khi deploy.
- Chưa push `fix/audit` lên `origin` — cần xác nhận của chủ dự án trước khi push/mở PR.

---

## RÀ SOÁT PHÂN HỆ BÁO CÁO (9 nhóm / 59 báo cáo)

> Rà soát toàn bộ engine báo cáo (`src/shared/business/reports.ts`) + giao diện (`ReportsDashboard.tsx`) + xuất Excel. Tất cả hàm thuần client-side (D11), không đổi schema.

**✅ P1 — Sửa lỗi cho kết quả sai (XONG, commit `ac09b0a`):**
1. Tài chính (`pnl_monthly_summary`, `profit_earned_object`, `profit_cash_object`) truyền `enrollments` → P&L khớp số với "Tài chính tháng" (Tổng quan).
2. `student_absent_frequent`: chỉ tính vắng KHÔNG phép liên tục (bỏ `excused`).
3. `student_waiting_class_detail`: loại HV `left`/`suspended`, không dựa `className` rỗng.
4. Cờ cột `noTotal` → dòng TỔNG CỘNG (web + Excel) bỏ qua cột %/lũy kế (rateValue, runningPaid/Remaining, Tồn lũy kế Kardex).

**✅ P2 — Nhất quán & chuẩn hoá (XONG, commit `e7ef5b1`):**
5. Cơ sở lương: GHI CHÚ rõ P&L=gross (accrual) vs Tổng quan=net (cash) — khác biệt đúng bản chất, không đổi số. *(Còn để ngỏ cho chủ dự án: có muốn center_finance_summary "earned profit" dùng gross thay net không — quyết định kế toán.)*
6. Đã thay literal phân loại bằng hằng số `isTuitionRevenue`/`isInternalTransfer`/`isOnlineTuition`/`isOnlineStudy` (thêm `REVENUE_CATEGORY_TUITION_ONLINE`/`STUDY_TYPE_ONLINE` vào constants.ts).
7. `tuition_payment_history` đã loại "Chuyển số dư".
8. Export Excel: đã ghi bộ lọc kho (Mặt hàng/Nhóm/Kho) vào sheet Thông tin; "Người xuất" theo `auth.getUser()`.

**⏳ P3 — Trùng lặp / thiếu / giao diện (chờ duyệt):**
9. Gộp HV "sắp hết buổi" + "hết buổi"; xử lý trùng "chờ xếp lớp" (HV vs Tuyển sinh).
10. Thêm BC Học viên: "Sinh nhật học viên", "Học viên học thử (trial)".
11. Giao diện: số lượng BC trên mỗi tab + spinner tải dữ liệu kho; (tuỳ chọn) bỏ 1 nút Excel, sửa ghi chú tài chính theo cờ.

**Cần xác minh:** `audit_logs_detail` đọc `l.details` — đối chiếu shape thật của AuditLog (lưu `oldValue/newValue` jsonb), kẻo cột "Chi tiết" luôn ra "—".

---

## ĐỀ XUẤT BƯỚC TIẾP THEO (KHÔNG tự triển khai)
- Báo cáo kho GĐ A→D đã xong → có thể thêm **PDF/Excel export server-side** cho báo cáo kho (hiện FE đã có nút Excel cho nhật ký).
- Cập nhật `README.md` (đang là template Vite) thành tài liệu dự án thật.
- Cân nhắc cache `tokenVersion` (giảm 1 truy vấn DB/request) nếu cần tối ưu.
- Mở rộng zod cho 100% route còn lại.
> Các đề xuất trên CHỈ ghi nhận — chờ chủ dự án duyệt trước khi làm.
