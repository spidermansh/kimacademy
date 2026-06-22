# TEST STATUS — Kim Academy v3

> Kết quả kiểm tra THỰC TẾ. Cập nhật: 2026-06-22 (chạy ngay trước khi bàn giao). **Không che giấu lỗi.**

## Tóm tắt
| Kiểm tra | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npx tsc --noEmit` (= `npm run lint`) | ✅ **PASS** (0 lỗi, exit 0) |
| Unit/Integration tests | `npm test` | ✅ **71/71 PASS** (9 test files) |
| Build | `npm run build` | ✅ **PASS** (`dist/server.js` ~356.1kb sau GĐ D) |

→ Toàn bộ xanh. Không có test fail tại thời điểm bàn giao.

> **Migration bảo toàn dữ liệu (`3a1181e`, D12):** sau khi sửa `json_columns`/`date_columns` sang `ALTER ... USING`, đã nghiệm chứng: (1) biểu thức USING test trên giá trị biên `''`/`NULL`/ISO qua transaction rollback; (2) `npx prisma migrate reset` áp lại toàn bộ 11 migration sạch; (3) `npx prisma migrate diff` (live DB ↔ `schema.prisma`) = **No difference**; (4) `tsc`/`npm test` 71/71/`build` đều xanh trên schema mới. **Lưu ý:** `migrate reset` XÓA toàn bộ DB — chỉ chạy trên DB dev/test (đã re-seed sau đó).

## Lệnh test chính xác
```bash
npm test                                   # = vitest run --fileParallelism=false  (CHẠY TUẦN TỰ, BẮT BUỘC vì test dùng DB chung)
npm run test:reports                       # = vitest run tests/unit/reports.test.ts
npx vitest run tests/unit/<file>.test.ts   # chạy 1 file
npx tsc --noEmit                           # typecheck
npm run build                              # build
```

## Đã chạy & kết quả (9 file, 71 test — đều PASS)
| File | Số test | Loại | Cần DB? |
|---|---|---|---|
| `tests/unit/business.test.ts` | 17 | Nghiệp vụ lõi (HV, ghi danh, điểm danh, sổ cái, đổi học phí) | ✅ Có (PostgreSQL) |
| `tests/unit/inventory.test.ts` | 18 | Kho (nhập/xuất, tồn, bán HV, audit) | ✅ Có |
| `tests/unit/ledger.test.ts` | 3 | Đối soát sổ cái (drift, recalc idempotent) | ✅ Có |
| `tests/unit/reports.test.ts` | 12 | Report engine | ✅ Có |
| `tests/unit/encoding.test.ts` | 2 | Chống mojibake + hằng số học phí | ❌ Hàm thuần |
| `tests/unit/parity.test.ts` | 2 | alerts/dashboard parity | ❌ Hàm thuần |
| `tests/unit/phase1.test.ts` | 8 | Hằng số (chuyển số dư) + schema zod | ❌ Hàm thuần |
| `tests/unit/phase2.test.ts` | 8 | Helper ngày UTC + schema zod | ❌ Hàm thuần |
| `tests/unit/placeholder.test.ts` | 1 | placeholder | ❌ Hàm thuần |
| **TỔNG** | **71** | | |

## Test chưa chạy / chưa có
- **Không có test cho luồng "Đã thu – chưa phát" + `/deliver`** của kho (đã kiểm chứng thủ công qua API trong phiên, chưa viết unit test). → Đề xuất bổ sung khi làm tiếp.
- **Không có test riêng cho 12 báo cáo kho** (7 GĐ A+B + 4 GĐ C + 1 GĐ D). Đã kiểm chứng compute thủ công: GĐ C (`inv_kardex`, `inv_incomplete`, `inv_sales_by_class`, `inv_by_staff`) qua kịch bản synthetic phủ mọi nhánh `issued`/`paymentStatus` + map lớp (`989627c`); GĐ D (`inv_purchase_by_supplier`) qua round-trip thực tạo `purchase_in` có `supplierId` → đọc include → map → compute (`8dab25d`). Chưa cố định bằng unit test. → Đề xuất bổ sung (mở rộng `buildReportParams` để nạp shape kho).
- Không có test E2E/UI tự động (UI kiểm tra thủ công qua dev server).

## Lưu ý QUAN TRỌNG về môi trường test
- Test DB (`business/inventory/ledger/reports`) **kết nối PostgreSQL theo `DATABASE_URL`** và **TRUNCATE toàn bộ bảng** (qua `cleanDatabase`) rồi tự seed. → **Chạy `npm test` sẽ XÓA dữ liệu demo** đang có.
- Phải có PostgreSQL chạy + `DATABASE_URL` hợp lệ + đã `npx prisma migrate deploy`/`dev` + `npx prisma generate`. Nếu thiếu DB, các test DB sẽ FAIL (không phải lỗi code).
- Sau khi chạy test, nếu muốn dùng lại UI: **`npm run seed:demo`** để nạp lại dữ liệu + tài khoản demo (admin/password123).
- `vitest` chạy `--fileParallelism=false` (tuần tự) vì các file dùng chung 1 DB.

## Nếu có test FAIL (debug)
- "Can't reach database server" / "ENOTFOUND" → chưa có PostgreSQL hoặc `DATABASE_URL` sai.
- "Expected ISO-8601 DateTime" khi ghi → cột date-only mới chưa thêm vào `DATE_ONLY_FIELDS` (xem DECISIONS D5).
- Lỗi `JSON.parse` trên giá trị object → đang parse cột jsonb (xem DECISIONS D6).
- Lỗi type Prisma sau khi đổi schema → quên `npx prisma generate`.

## Lệnh BẮT BUỘC trước khi báo "hoàn thành" (bất kỳ task nào)
```bash
npx tsc --noEmit && npm test && npm run build
```
Cả 3 phải xanh. **Không báo "ổn" nếu chưa chạy đủ 3 lệnh trên.**
