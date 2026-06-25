# Import dữ liệu thật KIM ENGLISH → Kim Academy

Pipeline đưa dữ liệu vận hành thật của KIM ENGLISH (2 file Excel) vào app, qua **bước template trung gian** để rà soát trước khi nạp DB.

## Nguồn (chỉ ĐỌC bản sao — không chạm file gốc)
Đặt 3 bản sao trong `data-import/source/`:
- `01_QUAN_LY_HOC_SINH.xlsx` — học sinh, học phí, điểm danh.
- `02_CHAM_CONG.xlsx` — nhân sự, chấm công, chi phí, lương.
- `03_DOI_SOAT_LOP.xlsx` — đối soát tên lớp 2 file (sheet `DOI_SOAT`).

## GĐ1 — Trích xuất → Template (không đụng DB)
```bash
npm run kim:extract
```
- Sinh bộ template đã điền vào `data-templates/` (01_NhanSu … 10_BangLuong).
- Sinh báo cáo đối soát `scripts/kimenglish/out/REPORT.md` **và `REPORT.xlsx`** (4 sheet: Tổng quan · Lớp & GV · Lệch số buổi · Cảnh báo).

**Quy ước chính** (xem `mapping.ts`):
- Khóa HV = `VIỆT-ANH`; gộp HV trùng tên thành 1 Student (nhiều Enrollment).
- **TÌNH TRẠNG (AJ)**: `1`=còn học, `0`=ngưng. `0` có 2 nghĩa: nghỉ thật, HOẶC đổi phí/chuyển lớp (dòng cũ chốt, số dư chuyển sang dòng mới). HV active nếu CÓ enrollment `1`; lớp đại diện ở `03_HocVien` = enrollment đang active; **`03b_GhiDanh`** giữ TẤT CẢ enrollment + trạng thái từng lớp.
- Tên lớp chuẩn = cột LỚP sheet `THU TIỀN HỌC PHÍ OFFLINE`. `GRADE 3.1` → gộp vào `GRADE 4.2` (giữ điểm danh). Lớp `ĐÃ DỪNG` (GLOBAL 5, GRADE 8.9, IELTS F2) → status `completed`.
- GV chủ nhiệm suy từ các sheet TIMESHEET (nhiều buổi nhất, ưu tiên gần đây). Lớp không suy được → `NV-CPC` (Chưa phân công) — sửa tay ở template.
- Học phí: nổ 22 cột tháng → từng giao dịch (ngày = đầu tháng).
- Điểm danh: lưới sheet lớp → `1`=present, `0`=absent, `b/B`=excused, số>1=buổi đôi; cột mở sổ (F đầu không phải ngày: past/PERIOD/"Tính hết…") → 1 bản ghi buổi mang sang.

## GĐ2 — Rà soát template (thủ công)
Mở `data-templates/*.xlsx`, kiểm tra & sửa (đặc biệt: lớp "Chưa phân công", HV không lớp).

## GĐ3 — Import template → Neon (cần DATABASE_URL)
`scripts/kimenglish/import-from-templates.ts` (đang xây) — nạp vào DB, gọi `recalcEnrollmentLedger`. Dry-run mặc định; `--confirm` để ghi.

> File `_*.mjs` là script debug tạm (đã xóa). `out/` và `data-templates/` là kết quả sinh ra, không commit.
