# NEXT STEPS — Kim Academy v3

> Việc tiếp theo, ưu tiên, phạm vi, tiêu chí hoàn thành. Cập nhật: 2026-06-22.

## Ưu tiên & thứ tự
| # | Việc | Loại | Ghi chú |
|---|---|---|---|
| 1 | **Báo cáo kho GĐ C** (4 báo cáo) | Tính năng | Không đổi schema — rủi ro thấp, làm trước. |
| 2 | **Báo cáo kho GĐ D** (theo nhà cung cấp) | Tính năng | CẦN thêm `supplierId` vào movement trước. |
| 3 | **Sửa migration đổi kiểu thành bảo toàn dữ liệu** | Hạ tầng | BẮT BUỘC trước khi deploy prod có dữ liệu thật. |
| 4 | **Chuẩn bị PR `fix/audit` → `main`** | Quy trình | Đính kèm cảnh báo migration (mục 3). |

---

## TASK KẾ TIẾP (gợi ý làm ngay): Báo cáo kho GĐ C

**Phạm vi (chỉ trong phạm vi này):**
- Thêm 4 `ReportDefinition` vào nhóm `grp_inventory` trong `src/shared/business/reports.ts`:
  - **Thẻ kho (Kardex) theo mặt hàng** — type `detail`, filter `invItem` + `dateRange`. Từng dòng nhập/xuất 1 mặt hàng + cột **tồn lũy kế**. (Cần thêm filter `invItem` vào engine + control chọn mặt hàng ở ReportsDashboard — đã có sẵn `invRaw.items`.)
  - **Giao dịch kho chưa hoàn tất** — type `detail`. Liệt kê movement `unpaid` (chưa thu) hoặc `issued=false` (chờ phát).
  - **Bán vật tư theo lớp** — type `object`, filter `class`. Gom theo lớp (qua `relatedStudent` → enrollment/lớp, hoặc `saleBatch`).
  - **Giao dịch kho theo người thực hiện** — type `object`, filter `staff`. Gom theo `createdBy`/`createdById`.
- Nếu cần filter mới (`invItem`): thêm vào union `ReportDefinition.filters` + `ReportParams.filters.itemId` (đã có) + control select trong `ReportsDashboard.tsx` (mẫu giống `invCategory`/`invLocation` đã có).
- Dữ liệu kho ĐÃ được nạp sẵn vào `compute` params (`inventoryItems/Stocks/Movements/Categories`) — chỉ viết compute.

**KHÔNG được làm trong task này:**
- Không đổi `prisma/schema.prisma` (GĐ C không cần schema).
- Không đụng logic sổ cái / kho / ngày / jsonb (chỉ thêm báo cáo = hàm thuần).
- Không refactor các báo cáo hiện có.
- Không gỡ shim FE.

**Tiêu chí hoàn thành:**
- 4 báo cáo hiện trong UI (sidebar "Báo cáo thống kê" → "Kho vật tư"), render đúng cột + lọc.
- Kiểm chứng compute trên dữ liệu demo (sau `npm run seed:demo`) cho ≥1 dòng hợp lý mỗi báo cáo.
- `npx tsc --noEmit` 0 lỗi; `npm test` vẫn 71/71 (hoặc thêm test mới); `npm run build` OK.
- Commit message rõ "feat(reports): inventory GĐ C ...".

---

## TASK SAU ĐÓ: Báo cáo kho GĐ D (theo nhà cung cấp)
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
