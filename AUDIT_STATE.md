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

## Phase đang làm
- (Không có phase code nào đang dở — working tree sạch.) Đang ở bước **bàn giao tài liệu**.

## Phase chưa làm
- **Báo cáo kho GĐ C**: Thẻ kho (Kardex) theo mặt hàng · GD chưa hoàn tất · Theo lớp · Theo người thực hiện.
- **Báo cáo kho GĐ D**: thêm `supplierId` vào `InventoryMovement` (purchase_in) + UI chọn NCC → báo cáo theo nhà cung cấp.
- **Data-model migration cho PRODUCTION**: viết lại migration đổi kiểu (json/date) thành bảo toàn dữ liệu (hiện đang DROP+recreate — chỉ an toàn với DB rỗng/test).
- **Merge `fix/audit` → `main`** (PR).

## Bảng trạng thái từng nhóm
| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| Schema / Database | 🟢 Ổn (test) / 🟠 prod | jsonb + DateTime + tokenVersion + createdById + AuditLog.userId + inventory.issued. 10 migration. ⚠️ migration đổi kiểu DESTRUCTIVE trên prod có dữ liệu. |
| Ledger (sổ cái) | 🟢 Tốt | 1 nguồn sự thật `recalcEnrollmentLedger`; có endpoint + cron đối soát; test `ledger.test.ts` pass. |
| Inventory (kho) | 🟢 Tốt | Chặn tồn âm, giá vốn BQ, trạng thái issued (đã thu–chưa phát), `/deliver`, filter+Excel. `inventory.test.ts` (18) pass. |
| Reports (báo cáo) | 🟡 Một phần | Nhóm kho GĐ A+B (7 báo cáo) xong; GĐ C/D chưa. Tính client-side. `reports.test.ts` (12) pass. |
| Services / Business | 🟢 Tốt | ledger, dates, json, constants, validate, audit, reports engine. |
| UI (frontend) | 🟢 Tốt | Reports, Inventory, Sidebar, App cập nhật; HMR. Hợp đồng ngày = chuỗi giữ nguyên. |
| Tests | 🟢 71/71 pass | 9 file (xem TEST_STATUS.md). DB tests cần PostgreSQL + truncate. |
| Deployment | 🟠 Cần lưu ý | `DEPLOY.md` có hướng dẫn. CI chạy lint+build+test+migrate deploy. ⚠️ migration đổi kiểu cần xử lý trước khi lên prod có dữ liệu. |

## Rủi ro còn lại
1. **Migration đổi kiểu DROP+recreate** → mất dữ liệu nếu deploy lên prod có dữ liệu thật (rủi ro cao nhất).
2. Báo cáo kho chưa đầy đủ (thiếu Kardex, theo NCC, theo lớp/người thực hiện).
3. `authenticateToken` +1 truy vấn DB/request (perf — chấp nhận được).
4. zod chưa phủ 100% route.
5. README chưa cập nhật (low).
