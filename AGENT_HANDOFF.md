# AGENT HANDOFF — Kim Academy v3

> Tài liệu chuyển giao cho agent/người mới tiếp tục dự án **mà không cần lịch sử chat cũ**.
> Cập nhật lần cuối: 2026-06-22. Đọc kèm: [AUDIT_STATE.md](AUDIT_STATE.md), [DECISIONS.md](DECISIONS.md), [NEXT_STEPS.md](NEXT_STEPS.md), [TEST_STATUS.md](TEST_STATUS.md).

## 1. Tên dự án
**Kim Academy v3** (`package.json` name: `kim-academy-v3`, version 3.0.0) — phần mềm quản lý trung tâm giáo dục/ngoại ngữ.

## 2. Mục tiêu tổng thể
Hệ thống quản lý vận hành trung tâm: học viên, lớp học, điểm danh, học phí & sổ cái công nợ, lương nhân sự, kho vật tư (bán giáo trình/đồng phục), tuyển sinh, báo cáo thống kê, đối soát cuối ngày, backup/restore.

**Kiến trúc:**
- Frontend: React 19 + Vite 6 + Tailwind 4 (SPA), thư mục `src/ui`, `src/App.tsx`.
- Backend: Express 4 + Prisma 7 + PostgreSQL, thư mục `src/api` (routes/middleware/services/utils/schemas), entry `src/api/server.ts`.
- Business logic dùng chung FE/BE: `src/shared` (`business/`, `constants.ts`, `json.ts`, `types/`, `utils.ts`).
- Auth: JWT (8h) + bcryptjs. CI: `.github/workflows/ci.yml` (postgres service → `npm ci` → prisma generate → `prisma migrate deploy` → lint → build → test).
- Prod: theo `DEPLOY.md` (Render/Neon...). **Chỉ dùng `prisma migrate deploy` ở prod, không `db push`.**

## 3. Bối cảnh nghiệp vụ hiện tại
Dự án đang trong **đợt rà soát & gia cố nhiều giai đoạn (audit)** trên nhánh `fix/audit`, đã hoàn tất Phase 0→3 + 2 bug fix vận hành + 2 tính năng kho mới. Toàn bộ dữ liệu hiện là **DỮ LIỆU TEST** (chủ dự án xác nhận được phép migrate/reset tự do).

## 4. Trạng thái branch hiện tại
- Nhánh: **`fix/audit`** (đã push lên `origin`: https://github.com/spidermansh/kimacademy.git).
- Working tree: **sạch** (mọi thay đổi đã commit).
- Nhánh đi trước `main` toàn bộ công việc audit (chưa merge — xem NEXT_STEPS để chuẩn bị PR).
- Git user (local repo): spidermansh / sonhaidc08@gmail.com.

## 5. Đã hoàn thành trong phiên hiện tại (theo commit, mới → cũ)
| Commit | Nội dung |
|---|---|
| `8141b99` | **Kho: bán hàng loạt hỗ trợ "Đã thu – chưa phát"** (`issued=false`) — đồng bộ với bán đơn lẻ (D9): không trừ kho lúc tạo, trừ khi `/deliver`. |
| `29aa300` | **Rà soát báo cáo — P3 + P3-bis**: gộp "sắp/hết buổi"; thêm Sinh nhật + Học thử; phân biệt 2 báo cáo "chờ xếp lớp"; tab đếm số + spinner kho. **Tách "Tài chính tháng" → Dòng tiền (net) + Doanh thu thực (gross, D13)**; thêm earned theo lớp/ngày. |
| `e7ef5b1` | **Rà soát báo cáo — P2** (chuẩn hoá): literal phân loại → hằng số (D2/D3, thêm online/studyType); `tuition_payment_history` loại "Chuyển số dư"; ghi chú lương gross/net; Export Excel ghi bộ lọc kho + "Người xuất" theo người đăng nhập. |
| `ac09b0a` | **Rà soát báo cáo — P1** (sửa lỗi): Tài chính P&L truyền `enrollments` (khớp số Tổng quan); "vắng nhiều" bỏ vắng có phép; "chờ xếp lớp" loại HV đã nghỉ; thêm cờ cột `noTotal` (bỏ tổng cột %/lũy kế, web+Excel). |
| `3a1181e` | **Fix migration bảo toàn dữ liệu (D12)**: `json_columns` + `date_columns` đổi từ DROP+recreate → `ALTER ... USING` (giữ dữ liệu khi deploy prod). |
| `8dab25d` | **Báo cáo kho — GĐ D**: `InventoryMovement.supplierId` (+FK Supplier, migration thuần bổ sung) + báo cáo "Nhập hàng theo nhà cung cấp" + select NCC ở form nhập kho. |
| `989627c` | **Báo cáo kho — GĐ C** (4 báo cáo): Thẻ kho Kardex theo mặt hàng · GD chưa hoàn tất · Bán theo lớp · Theo người thực hiện. Thêm control filter `invItem`. |
| `f64ff41` | **Báo cáo kho vật tư** (nhóm `grp_inventory`, 7 báo cáo) — GĐ A (hạ tầng) + B (báo cáo cốt lõi) |
| `d14bb6b` | **Kho: trạng thái "Đã thu – chưa phát" (nợ hàng)** + filter/Excel cho Nhật ký xuất nhập |
| `86dc636` | Fix: dòng giao dịch thiếu tên HV/lớp sau khi thu tiền (FE refetch + resolve lớp theo enrollment GD) |
| `4e49875` | Fix: `convertedAt` ghi date-only làm lỗi convert lead (thêm vào lớp ngày trong suốt) |
| `7d16dae` | Phase 3c: thêm `createdById` (truy vết userId, 17 model) + gỡ shim `tax` đã chết |
| `fd124b7` | Phase 3b: zod cho route PUT (update) |
| `b3bbbe3` | Phase 3a: JWT thu hồi được (`User.tokenVersion`) + `/auth/refresh` |
| `f5fbad9` | Phase 2d+e: zod toàn route mutation + `AuditLog.userId` |
| `4cd8cfc` | Phase 2c: cột ngày String → `DateTime @db.Date` + lớp ngày trong suốt (Prisma query extension) |
| `226fe42` | Phase 2b: cột JSON-String → `Json` (jsonb) |
| `911e8c1` | Phase 2a: hợp nhất sổ cái 1 nguồn sự thật + endpoint/cron đối soát |
| `41beb32` | Phase 1: bảo mật (helmet, rate-limit, async bcrypt, pool, graceful shutdown, /restore guard) + sửa nghiệp vụ tiền + zod 3 route |
| `be2ec62` | Phase 0: sửa mojibake + bug phân loại học phí + double-send |
| `e2be306` | (WIP checkpoint baseline — gồm phần kho nhập dở trước khi audit) |

## 6. Đang làm dở / chưa xong
- **Báo cáo kho — GĐ C** (✅ XONG, commit `989627c`): 4 báo cáo Kardex/GD chưa hoàn tất/bán theo lớp/theo người thực hiện.
- **Báo cáo kho — GĐ D** (✅ XONG, commit `8dab25d`): `InventoryMovement.supplierId` + báo cáo "Nhập hàng theo nhà cung cấp". Nhóm `grp_inventory` nay có **12 báo cáo**. Báo cáo kho coi như hoàn tất.
- **Chưa merge `fix/audit` → `main`** (chờ quyết định; xem cảnh báo migration ở mục 10).
- Không có code dở dang chưa commit (working tree sạch).

## 7. File quan trọng đã sửa/ thêm trong đợt audit
- `prisma/schema.prisma` — Json columns, DateTime @db.Date, `User.tokenVersion`, `*.createdById`, `AuditLog.userId`, `InventoryMovement.issued/deliveredAt`, `InventoryMovement.supplierId` (FK Supplier, GĐ D). 11 migration (xem AUDIT_STATE).
- `src/infrastructure/db/prisma.client.ts` — **Prisma query extension lớp ngày trong suốt** (DATE_ONLY_FIELDS) + pool config + graceful disconnect.
- `src/shared/constants.ts` — `REVENUE_CATEGORY_TUITION_OFFLINE`, `isTuitionRevenue`, `PAYMENT_METHOD_BALANCE_TRANSFER`, `isInternalTransfer`.
- `src/shared/json.ts` — helper coercion jsonb (`toArray/toObject/toJsonString/coerceJson`).
- `src/api/services/ledger.ts` — **nguồn sự thật sổ cái** (`recalcEnrollmentLedger`, `findLedgerDrift`).
- `src/api/utils/dates.ts` — `toDateStr/toIso/parseDate/monthRange/dayRange`.
- `src/api/utils/validate.ts` + `src/api/schemas/index.ts` — zod `validateBody` + schema.
- `src/api/utils/audit.ts` — `writeAudit(client, req, data)`.
- `src/api/jobs/ledger-reconcile.job.ts` — cron đối soát sổ cái hằng ngày.
- `src/api/routes/*.ts` — finance, attendance, enrollments, payroll, inventory, ledger (mới), auth, users, admissions, settings, reports.
- `src/api/middleware/auth.ts` — kiểm tra `tokenVersion` (async).
- `src/shared/business/reports.ts` — engine + nhóm `grp_inventory` (12 báo cáo: 7 GĐ A+B, 4 GĐ C, 1 GĐ D theo NCC). Filter `invItem` mới; `InventoryMovementRow.supplierId/supplierName`.
- `src/ui/pages/ReportsDashboard.tsx`, `InventoryManagement.tsx`, `src/ui/layouts/Sidebar.tsx`, `src/App.tsx`.
- `scripts/fix-mojibake.mjs`, `scripts/migrate-date-columns.mjs`, `scripts/truncate-all.ts` — script một lần (tham khảo).

## 8. Ràng buộc nghiệp vụ TUYỆT ĐỐI KHÔNG ĐƯỢC PHÁ
Xem chi tiết + lý do trong [DECISIONS.md](DECISIONS.md). Tóm tắt:
1. **Sổ cái = một nguồn sự thật**: mọi thay đổi giao dịch/điểm danh PHẢI gọi `recalcEnrollmentLedger(tx, enrollmentId)`. KHÔNG viết lại công thức sổ cái nội tuyến.
2. **Phân loại học phí**: dùng `isTuitionRevenue()` / hằng số dùng chung, KHÔNG viết literal `'Học phí offline'` (đã từng gây mojibake + sai phân loại).
3. **"Chuyển số dư" KHÔNG phải doanh thu**: luôn loại bằng `isInternalTransfer()`.
4. **Ngày = `YYYY-MM-DD` ở API**: cột là `@db.Date`; lớp extension tự đổi. **Thêm cột date-only mới PHẢI thêm tên vào `DATE_ONLY_FIELDS`** trong `prisma.client.ts`.
5. **Cột jsonb KHÔNG `JSON.parse/stringify`** — dùng helper `src/shared/json.ts`.
6. **Kho "đã thu – chưa phát" (`issued=false`)**: KHÔNG trừ kho lúc tạo; chỉ trừ + kiểm tra tồn khi gọi `/deliver`.
7. **KHÔNG gỡ shim FE** (`otherSalary`, `otherSalaryNote`, `teacherId`, `teacherName` trong response lương) — SalaryDashboard đang dùng.
8. **Audit/createdBy id**: cột nullable có index, KHÔNG đặt FK cứng (giữ id lịch sử).

## 9. Quyết định kỹ thuật đã chốt
Xem [DECISIONS.md](DECISIONS.md). Nổi bật: lớp ngày trong suốt qua Prisma extension; sổ cái tập trung; jsonb thay JSON-string; JWT thu hồi qua tokenVersion; báo cáo tính **client-side** (FE nạp data rồi gọi `compute`).

## 10. Lỗi / technical debt còn tồn tại
- ✅ **(ĐÃ SỬA `3a1181e`)** Migration đổi kiểu (`json_columns`, `date_columns`) nay dùng `ALTER COLUMN ... SET DATA TYPE ... USING ...` — **bảo toàn dữ liệu** khi `migrate deploy` lên prod có dữ liệu. Đã nghiệm chứng: `migrate reset` áp lại sạch + `migrate diff` = No difference + test 71/71. Xem DECISIONS D12.
- Báo cáo kho GĐ C/D chưa làm.
- zod chưa phủ 100% route (đã phủ các route mutation chính + PUT quan trọng).
- `authenticateToken` thực hiện 1 truy vấn DB mỗi request (chấp nhận được ở quy mô này).
- Backend `/reports/run` đã nạp dữ liệu kho nhưng **UI dùng compute client-side**; endpoint server-side cần restart backend để áp dụng (không ảnh hưởng UI).
- README.md vẫn là template Vite mặc định (không phản ánh dự án) — không bắt buộc sửa.

## 11. Cách chạy dev / build / test
```bash
npm install                 # cài deps
npx prisma generate         # sinh Prisma client (sau khi đổi schema)
npx prisma migrate dev      # áp dụng migration (DB dev)
npm run seed:demo           # nạp dữ liệu demo + tài khoản (xem mục 12)

npm run dev                 # FE (Vite :3025) + BE (Express :3021) — đổi cổng bằng PORT/VITE_DEV_PORT
npm run build               # vite build + bundle server.ts -> dist/server.js
npm test                    # = vitest run --fileParallelism=false  (CẦN PostgreSQL; tests TRUNCATE DB)
npm run lint                # = tsc --noEmit  (typecheck)
```
- Cần `DATABASE_URL` (PostgreSQL) trong `.env`. Biến: `DATABASE_URL`, `JWT_SECRET` (bắt buộc ở prod), `CORS_ORIGIN` (bắt buộc ở prod), tùy chọn `JSON_BODY_LIMIT/LOGIN_RATE_LIMIT/DB_POOL_*/LEDGER_CRON`.
- Phiên này dev server chạy cổng phụ **BE 3041 / FE 3045** (để không đụng server cũ): `PORT=3041 VITE_DEV_PORT=3045 FRONTEND_PORT=3045 API_PROXY_TARGET=http://localhost:3041 CORS_ORIGIN=http://localhost:3045 npm run dev`.

## 12. Tài khoản demo (sau `npm run seed:demo`)
Tất cả mật khẩu `password123`: **`admin`** (admin), `ketoan` (admin), `nvvp` (staff), `teacher` (teacher).

## 13. Lệnh kiểm tra BẮT BUỘC trước khi báo hoàn thành
```bash
npx tsc --noEmit      # phải 0 lỗi
npm test              # phải 71/71 pass (hoặc số cao hơn nếu thêm test)
npm run build         # phải build OK
```
> Lưu ý: `npm test` reset DB → chạy `npm run seed:demo` lại nếu cần dùng UI sau test.

## 14. Hướng dẫn ngắn cho agent mới
1. Đọc theo thứ tự: **AGENT_HANDOFF.md → DECISIONS.md → AUDIT_STATE.md → NEXT_STEPS.md → TEST_STATUS.md**.
2. Nắm 8 ràng buộc ở mục 8 TRƯỚC khi sửa bất cứ thứ gì liên quan tiền/kho/ngày/jsonb.
3. Việc tiếp theo gợi ý: xem **NEXT_STEPS.md** (báo cáo kho GĐ C/D, hoặc chuẩn bị PR merge).
4. Luôn chạy bộ lệnh mục 13 trước khi commit/báo xong. Không che giấu lỗi test.
