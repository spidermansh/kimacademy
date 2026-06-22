# AUDIT STATE — Kim Academy v3

> Trạng thái rà soát & gia cố trên nhánh `fix/audit`. Cập nhật: 2026-06-22.

## Giai đoạn audit hiện tại
**Phase 0–3 ĐÃ XONG.** Đang ở giai đoạn **mở rộng tính năng theo yêu cầu chủ dự án** (kho vật tư) + chuẩn bị bàn giao. Phase tiếp theo (báo cáo kho GĐ C/D) CHƯA bắt đầu.

## Phase đã hoàn thành
| Phase | Commit | Tóm tắt |
|---|---|---|
| 0 | `be2ec62` | Sửa mojibake 4 file route; sửa bug so sánh `'Học phí offline'` hỏng → mọi khoản thu học phí bị phân loại nhầm + không cập nhật sổ cái; sửa double-send `ERR_HTTP_HEADERS_SENT`. Thêm test chống mojibake. |
| 1 | `41beb32` | helmet, rate-limit `/login`, async bcrypt, JSON limit 5mb, PG pool config, graceful shutdown, `/health` check DB, error handler không lộ lỗi, `/restore` validate version+bảng lạ. Nghiệp vụ: chuyển lớp mang công nợ âm, loại "Chuyển số dư" khỏi doanh thu, `endDate` cuối tháng đúng, cho phép học phí=0. zod 3 route tiền. |
| 2a | `911e8c1` | `src/api/services/ledger.ts` (sổ cái 1 nguồn sự thật) + `GET/POST /api/ledger/reconcile` + cron đối soát. Gỡ ~90 dòng tính sổ cái nội tuyến ở finance/attendance/enrollments. |
| 2b | `226fe42` | Cột JSON-String → `Json` (jsonb): scheduleDays, salaryHistory, feeHistory, editHistory, enabledForRoles, attributes, summary, errorLog, AuditLog old/newValue. `src/shared/json.ts`. |
| 2c | `4cd8cfc` | 28 cột ngày String → `DateTime @db.Date`; **lớp ngày trong suốt** qua Prisma query extension (input `YYYY-MM-DD`→Date, output Date→`YYYY-MM-DD`). `src/api/utils/dates.ts`. |
| 2d+e | `f5fbad9` | zod `validateBody` toàn route mutation; `AuditLog.userId` + `writeAudit()`. |
| 3a | `b3bbbe3` | JWT thu hồi được: `User.tokenVersion`; logout thu hồi thật; `/auth/refresh`; đổi mật khẩu tăng tokenVersion; bcrypt async. |
| 3b | `fd124b7` | zod cho PUT: enrollment fee / expense / salary-advance. |
| 3c | `7d16dae` | `createdById` (nullable) trên 17 model = `req.user.userId`; gỡ shim `tax` đã chết; giữ + chú thích shim FE load-bearing. |
| Fix | `4e49875` | `convertedAt` → `@db.Date` + thêm vào `DATE_ONLY_FIELDS` (bug convert lead). |
| Fix | `86dc636` | Giao dịch hiện tên HV/lớp ngay (FE refetch; BE resolve lớp theo enrollment của giao dịch, không chỉ active). |
| Feat | `d14bb6b` | Kho: `InventoryMovement.issued/deliveredAt`; trạng thái "Đã thu – chưa phát"; endpoint `/deliver`; filter + Excel cho nhật ký. |
| Feat | `f64ff41` | Báo cáo kho: nhóm `grp_inventory` 7 báo cáo (GĐ A hạ tầng + B cốt lõi). |
| Feat | `989627c` | Báo cáo kho GĐ C: 4 báo cáo (Kardex theo mặt hàng, GD chưa hoàn tất, bán theo lớp, theo người thực hiện) + filter `invItem`. Compute thuần, không đổi schema. |
| Feat | `8dab25d` | Báo cáo kho GĐ D: `InventoryMovement.supplierId` (+FK Supplier, migration THUẦN BỔ SUNG) + báo cáo "Nhập hàng theo nhà cung cấp" + select NCC ở form nhập kho. |
| Fix | `3a1181e` | Migration `json_columns`/`date_columns` đổi DROP+recreate → `ALTER ... USING` (bảo toàn dữ liệu). Nghiệm chứng reset + diff = No difference. D12 resolved. |
| Fix | `ac09b0a` | Rà soát báo cáo P1: Tài chính P&L truyền `enrollments`; "vắng nhiều" bỏ excused; "chờ xếp lớp" loại HV nghỉ; cờ cột `noTotal` (bỏ tổng %/lũy kế). |
| Refactor | `e7ef5b1` | Rà soát báo cáo P2: literal phân loại → hằng số (D2/D3); `tuition_payment_history` loại "Chuyển số dư"; ghi chú lương gross/net; Export Excel ghi bộ lọc kho + người xuất. |
| Feat | `438e67f` | UI: component `SearchableSelect` (ô chọn HV có tìm kiếm) thay 2 select phẳng (Kho bán đơn lẻ, Báo cáo lọc HV). Giữ nguyên TransactionTable (datalist) + QuickPaymentModal (đã có search). |
| Feat | `8141b99` | Kho: bán hàng loạt hỗ trợ "Đã thu – chưa phát" (`issued=false`) — đồng bộ bán đơn lẻ (D9); không trừ kho lúc tạo, trừ khi `/deliver`. |
| Feat | `29aa300` | Rà soát báo cáo P3+P3-bis: gộp sắp/hết buổi; thêm Sinh nhật + Học thử; phân biệt 2 BC "chờ xếp lớp"; tab đếm số + spinner kho. Tách "Tài chính tháng" → Dòng tiền (net) + Doanh thu thực (gross, D13); thêm earned theo lớp/ngày. 72 test. |

## Phase đang làm
- (Không có phase code nào đang dở — working tree sạch.) Đang ở bước **bàn giao tài liệu**.

## Phase chưa làm
- **Merge `fix/audit` → `main`** (PR) — việc còn lại duy nhất.

## Bảng trạng thái từng nhóm
| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| Schema / Database | 🟢 Tốt | jsonb + DateTime + tokenVersion + createdById + AuditLog.userId + inventory.issued + inventory.supplierId (FK). 11 migration. ✅ migration đổi kiểu json/date nay bảo toàn dữ liệu (`ALTER ... USING`, D12) — an toàn deploy prod có dữ liệu. |
| Ledger (sổ cái) | 🟢 Tốt | 1 nguồn sự thật `recalcEnrollmentLedger`; có endpoint + cron đối soát; test `ledger.test.ts` pass. |
| Inventory (kho) | 🟢 Tốt | Chặn tồn âm, giá vốn BQ, trạng thái issued (đã thu–chưa phát), `/deliver`, filter+Excel. `inventory.test.ts` (18) pass. |
| Reports (báo cáo) | 🟢 Tốt | Nhóm kho GĐ A+B+C+D (12 báo cáo) xong. Tính client-side. `reports.test.ts` (12) pass; báo cáo kho GĐ C/D nghiệm chứng compute + round-trip (chưa có unit test riêng). |
| Services / Business | 🟢 Tốt | ledger, dates, json, constants, validate, audit, reports engine. |
| UI (frontend) | 🟢 Tốt | Reports, Inventory, Sidebar, App cập nhật; HMR. Hợp đồng ngày = chuỗi giữ nguyên. |
| Tests | 🟢 72/72 pass | 9 file (xem TEST_STATUS.md). DB tests cần PostgreSQL + truncate. |
| Deployment | 🟢 Tốt | `DEPLOY.md` có hướng dẫn. CI chạy lint+build+test+migrate deploy. ✅ migration đổi kiểu json/date đã bảo toàn dữ liệu — `migrate deploy` an toàn cả khi prod có dữ liệu. |

## Rủi ro còn lại
1. ~~**Migration đổi kiểu DROP+recreate** → mất dữ liệu~~ ✅ ĐÃ SỬA (`3a1181e`, D12): nay `ALTER ... USING` bảo toàn dữ liệu, an toàn deploy prod.
2. ~~Báo cáo kho chưa đầy đủ~~ ✅ Đã xong GĐ A→D (12 báo cáo). Còn đề xuất (không bắt buộc): unit test cố định cho báo cáo kho.
3. `authenticateToken` +1 truy vấn DB/request (perf — chấp nhận được).
4. zod chưa phủ 100% route.
5. README chưa cập nhật (low).
