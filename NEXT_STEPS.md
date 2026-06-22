# NEXT STEPS — Kim Academy v3

> Việc tiếp theo, ưu tiên, phạm vi, tiêu chí hoàn thành. Cập nhật: 2026-06-22.

## Ưu tiên & thứ tự
| # | Việc | Loại | Ghi chú |
|---|---|---|---|
| ~~1~~ | ~~**Báo cáo kho GĐ C** (4 báo cáo)~~ ✅ XONG (`989627c`) | Tính năng | Không đổi schema. Đã nghiệm chứng compute. |
| 2 | **Báo cáo kho GĐ D** (theo nhà cung cấp) | Tính năng | TASK KẾ TIẾP. CẦN thêm `supplierId` vào movement trước. |
| 3 | **Sửa migration đổi kiểu thành bảo toàn dữ liệu** | Hạ tầng | BẮT BUỘC trước khi deploy prod có dữ liệu thật. |
| 4 | **Chuẩn bị PR `fix/audit` → `main`** | Quy trình | Đính kèm cảnh báo migration (mục 3). |

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

## TASK KẾ TIẾP: Báo cáo kho GĐ D (theo nhà cung cấp)
- **Tiền đề:** `InventoryMovement` chưa có `supplierId`. Thêm cột `supplierId String?` (+ index, KHÔNG FK cứng theo nguyên tắc D8 nếu muốn — hoặc FK tới Supplier nếu chấp nhận) + migration.
- Thêm UI chọn nhà cung cấp khi `movementType = purchase_in` trong `InventoryManagement.tsx`.
- Báo cáo "Nhập hàng theo nhà cung cấp" (SL + giá trị nhập theo NCC, filter `dateRange`).
- **Lưu ý:** đây là task có đổi schema → cẩn thận migration; với DB prod sau này cần migration không phá dữ liệu.

---

## TASK HẠ TẦNG (trước khi deploy prod): Migration bảo toàn dữ liệu
- Hiện `prisma/migrations/20260621124340_json_columns` và `20260621132559_date_columns` ở dạng **DROP + tạo lại cột** → mất dữ liệu trên DB có sẵn.
- Khi cần đưa lên prod có dữ liệu thật: viết migration thủ công dùng `ALTER COLUMN ... TYPE jsonb USING col::jsonb` và `TYPE date USING col::date` (hoặc tạo cột tạm → copy → đổi tên).
- **Không** chạy `migrate deploy` các migration đổi kiểu hiện tại lên prod có dữ liệu (xem DECISIONS D12).

---

## ĐỀ XUẤT BƯỚC TIẾP THEO (KHÔNG tự triển khai)
- Sau khi xong GĐ C/D: thêm **PDF/Excel export server-side** cho báo cáo kho (hiện FE đã có nút Excel cho nhật ký).
- Cập nhật `README.md` (đang là template Vite) thành tài liệu dự án thật.
- Cân nhắc cache `tokenVersion` (giảm 1 truy vấn DB/request) nếu cần tối ưu.
- Mở rộng zod cho 100% route còn lại.
> Các đề xuất trên CHỈ ghi nhận — chờ chủ dự án duyệt trước khi làm.
