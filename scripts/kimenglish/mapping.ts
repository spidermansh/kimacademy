/**
 * mapping.ts — Hằng số & helper dùng chung cho pipeline import KIM ENGLISH.
 *
 * Nguồn quy ước:
 *  - Tên lớp CHUẨN = cột LỚP ở sheet "THU TIỀN HỌC PHÍ OFFLINE".
 *  - DOI_SOAT (file đối soát) = cầu nối tên lớp chấm-công ↔ QL học sinh + trạng thái.
 *  - Quy tắc gộp lớp do chủ dự án chốt.
 */

// ─── Quy tắc lớp (chốt với chủ dự án) ────────────────────────────────────────

/** Lớp ở sheet học sinh được GỘP sang lớp khác (giữ nguyên điểm danh). */
export const CLASS_MERGE: Record<string, string> = {
  'GRADE 3.1': 'GRADE 4.2', // dồn chung vào GRADE 4.2 (cột C DOI_SOAT)
};

/** Lớp ĐÃ DỪNG (cột C DOI_SOAT) → Class.status = 'completed'. */
export const STOPPED_CLASSES = new Set<string>(['GLOBAL 5', 'GRADE 8.9', 'IELTS F2']);

/**
 * Dịch tên lớp bên CHẤM CÔNG (timesheet/bảng lương) → tên lớp CHUẨN của app.
 * Lấy từ DOI_SOAT (A=chấm công, B=QL học sinh) + quy tắc gộp.
 * Lớp chỉ có bên chấm công (không có app) → undefined (bỏ qua khi tạo log/lương).
 */
export const CHAMCONG_TO_APP: Record<string, string | undefined> = {
  'BIG 1': 'BIG 1', 'BIG 2': 'BIG 2', 'BIG 4': 'BIG 4', 'BIG 5': 'BIG 5',
  'BIG 6': 'BIG 6', 'BIG 7': 'BIG 7', 'BIG 8': 'BIG 8', 'BIG 9': 'BIG 9',
  'BIG 10': 'BIG 10', 'BIG 11': 'BIG 11', 'BIG 12': 'BIG 12',
  'GLOBAL A': 'GLOBAL A', 'GLOBAL 5': 'GLOBAL 5',
  'GLOBAL 3.4': undefined, // chỉ có bên chấm công, đã dừng → bỏ
  'GRADE 3.1': 'GRADE 4.2', // gộp
  'GRADE 3.4': undefined, // đã dừng, không có app
  'GRADE 4.1': 'GRADE 4.1', 'GRADE 4.2': 'GRADE 4.2', 'GRADE 5': 'GRADE 5',
  'GRADE 6': 'GRADE 6', 'GRADE 7': 'GRADE 7',
  'GRADE 8': 'GRADE 8.9', 'GRADE 9': 'GRADE 8.9', // gộp 8+9 → 8.9
  'KINDY 2': 'KINDY 2', 'KINDY 3': 'KINDY 3', 'KINDY 4': 'KINDY 4', 'KINDY 5': 'KINDY 5',
};

/** Mã nhân sự "Chưa phân công" (gán tạm cho lớp chưa suy được GV). */
export const STAFF_UNASSIGNED = { code: 'NV-CPC', name: 'Chưa phân công', role: 'teacher' };

/** Các sheet KHÔNG phải lớp trong file học sinh. */
export const NON_CLASS_SHEETS = new Set<string>([
  'Dashboard', 'BÁO CÁO CHUNG', 'TRA CỨU THÔNG TIN HỌC SINH',
  'CÁC VẤN ĐỀ CẦN NGHIÊN CỨU XỬ LÝ', 'THU TIỀN HỌC PHÍ OFFLINE', 'THỜI KHOÁ BIỂU',
  'DANH SÁCH LỚP', 'QUẢN LÝ NHẬP HỌC', 'KO ĐƯỢC VÀO', 'THÔNG TIN HỌC VIÊN', 'THU KHÁC',
]);

// ─── Chuẩn hóa & khóa ────────────────────────────────────────────────────────

/** Chuẩn hóa chuỗi để so khớp (gộp khoảng trắng, bỏ đầu/cuối, in hoa). */
export function norm(s: unknown): string {
  return String(s ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
}

/**
 * Khóa định danh học viên VIỆT-ANH = "TÊN VIỆT - TÊN ANH" (đã chuẩn hóa).
 * Chuẩn hóa CẢ chuỗi ghép để khớp với cột "VIỆT - ANH" của sheet lớp
 * (HV không có tên tiếng Anh → "GIA BẢO -" không dư khoảng trắng).
 */
export function vietAnhKey(viet: unknown, anh: unknown): string {
  return norm(`${norm(viet)} - ${norm(anh)}`);
}

/** Sinh mã lớp từ tên: "GRADE 4.2" → "GRADE42", "GLOBAL 4.5" → "GLOBAL45". */
export function classCode(appClassName: string): string {
  return norm(appClassName).replace(/[^A-Z0-9]/g, '');
}

/** Áp quy tắc gộp lớp: trả tên lớp CHUẨN của app cho 1 tên lớp ở file học sinh. */
export function toAppClass(rawClassName: unknown): string {
  const n = norm(rawClassName);
  return CLASS_MERGE[n] ?? n;
}

// ─── Parse số / ngày ─────────────────────────────────────────────────────────

/** Parse số tiền/đếm: chấp nhận number, chuỗi có dấu phẩy/chấm; lỗi → null. */
export function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (s === '' || s === '-') return null;
  const n = Number(s.replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30); // bù lỗi năm nhuận 1900 của Excel

function fmtUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Tạo ISO sau khi VALIDATE (tháng 1-12, ngày 1-31, năm 2000-2032). Loại ngày rác
 * (vd tháng 33, năm 1899/2035 từ header typo). Trả null nếu không hợp lệ. */
function mkISO(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2032) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Đổi giá trị ô (serial number / Date / chuỗi dd/mm/yyyy | yyyy-mm-dd) → 'YYYY-MM-DD' | null. */
export function toISO(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) { const d = new Date(EXCEL_EPOCH_UTC + dateToSerial(v) * 86400000); return mkISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); }
  if (typeof v === 'number') {
    if (v < 1 || v > 90000) return null; // không phải serial ngày hợp lệ
    const d = new Date(EXCEL_EPOCH_UTC + Math.round(v) * 86400000);
    return mkISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const s = String(v).trim().replace(/[.\s]+$/, ''); // cắt dấu chấm/space thừa cuối ("3/9/2025." )
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return mkISO(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,5})$/);
  if (m) { let yr = Number(m[3]); if (yr < 100) yr += 2000; return mkISO(yr, +m[2], +m[1]); } // "02025"→2025
  m = s.match(/^(\d{1,2})[/.-](\d{2})(\d{4})$/); // "7/092024" = 7/09/2024 (tháng+năm viết dính)
  if (m) return mkISO(+m[3], +m[2], +m[1]);
  return null;
}

function dateToSerial(d: Date): number {
  return Math.round((d.getTime() - EXCEL_EPOCH_UTC) / 86400000);
}

/** Ngày đầu tháng 'YYYY-MM-01' từ một giá trị ngày bất kỳ; null nếu không parse được. */
export function firstOfMonth(v: unknown): string | null {
  const iso = toISO(v);
  if (!iso) return null;
  return iso.slice(0, 7) + '-01';
}

/** Nhãn kỳ "Tháng M/YYYY" từ ISO. */
export function termLabel(iso: string): string {
  const [y, m] = iso.split('-');
  return `Tháng ${Number(m)}/${y}`;
}
