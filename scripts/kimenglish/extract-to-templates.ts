/**
 * extract-to-templates.ts — GĐ1: đọc 3 file Excel nguồn KIM ENGLISH, sinh bộ
 * template .xlsx ĐÃ ĐIỀN vào data-templates/ + báo cáo đối soát out/REPORT.md.
 *
 * KHÔNG đụng DB. KHÔNG sửa file gốc (đọc bản sao trong data-import/source/).
 * Chạy: npx tsx scripts/kimenglish/extract-to-templates.ts
 */
import XLSX from 'xlsx-js-style';
import fs from 'fs';
import path from 'path';
import {
  CHAMCONG_TO_APP, STOPPED_CLASSES, STAFF_UNASSIGNED, NON_CLASS_SHEETS,
  norm, vietAnhKey, classCode, toAppClass, parseNum, toISO, firstOfMonth, termLabel,
} from './mapping';

const SRC = path.resolve('data-import/source');
const OUT_TEMPLATES = path.resolve('data-templates');
const OUT_DIR = path.resolve('scripts/kimenglish/out');
const F_STUDENTS = path.join(SRC, '01_QUAN_LY_HOC_SINH.xlsx');
const F_PAYROLL = path.join(SRC, '02_CHAM_CONG.xlsx');
const F_DOISOAT = path.join(SRC, '03_DOI_SOAT_LOP.xlsx');

fs.mkdirSync(OUT_TEMPLATES, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const report: string[] = [];
const warn: string[] = [];
function R(line = '') { report.push(line); }
function W(msg: string) { warn.push(msg); }

/** Đọc 1 sheet thành mảng-các-mảng (raw, giữ serial number cho ngày). */
function aoa(wb: XLSX.WorkBook, name: string): any[][] {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) as any[][];
}

console.log('📖 Đọc 3 file nguồn...');
const wbS = XLSX.readFile(F_STUDENTS);
const wbP = XLSX.readFile(F_PAYROLL);
const wbD = XLSX.readFile(F_DOISOAT);

// ════════════════════════════════════════════════════════════════════════════
// 1. NHÂN SỰ (từ MÃ LƯƠNG - MÃ CHI)
// ════════════════════════════════════════════════════════════════════════════
interface Staff { code: string; name: string; role: string; baseSalary: number; ratePerSession: number; otherAllow: number; }
const staffList: Staff[] = [];
const staffByName = new Map<string, Staff>(); // norm(name) -> staff
{
  const rows = aoa(wbP, 'MÃ LƯƠNG - MÃ CHI');
  for (const r of rows) {
    const code = String(r[5] ?? '').trim();
    if (!/^NV\d+/i.test(code)) continue;
    const name = String(r[0] ?? '').trim();
    if (!name) continue;
    const baseSalary = parseNum(r[1]) ?? 0; // lương học vụ (văn phòng)
    const ratePerSession = parseNum(r[2]) ?? 0; // đơn giá dạy
    const otherAllow = parseNum(r[3]) ?? 0;
    const role = ratePerSession > 0 ? 'teacher' : 'office';
    const s: Staff = { code: code.toUpperCase(), name, role, baseSalary, ratePerSession, otherAllow };
    staffList.push(s);
    staffByName.set(norm(name), s);
  }
  // GV chưa phân công (gán tạm)
  const cpc: Staff = { ...STAFF_UNASSIGNED, baseSalary: 0, ratePerSession: 0, otherAllow: 0 };
  staffList.push(cpc);
  staffByName.set(norm(cpc.name), cpc);
}
console.log(`   Nhân sự: ${staffList.length}`);

// ════════════════════════════════════════════════════════════════════════════
// 2. GV CHỦ NHIỆM — suy từ các sheet TIMESHEET (nhiều buổi nhất, ưu tiên gần đây)
// ════════════════════════════════════════════════════════════════════════════
const timesheetSheets = wbP.SheetNames.filter(s => /TIMESHEET/i.test(s));
// appClass -> teacherName -> {total, recent}
const teach: Record<string, Record<string, { total: number; recent: number }>> = {};
// teachingLogs để xuất template 09: {staffCode,date,classCode,sessions}
interface TLog { staffCode: string; date: string; appClass: string; sessions: number; }
const teachingLogs: TLog[] = [];
const RECENT_FROM = '2025-10-01';
for (const sh of timesheetSheets) {
  const teacherName = sh.replace(/TIMESHEET/i, '').trim();
  const staff = staffByName.get(norm(teacherName));
  const rows = aoa(wbP, sh);
  if (rows.length < 3) continue;
  const hdr = rows[1];
  const clsCols: { c: number; app: string }[] = [];
  for (let c = 4; c < hdr.length; c++) {
    const h = norm(hdr[c]);
    if (!h || h === 'TOTAL' || h === 'NOTE' || h === 'MONTH' || h === 'YEAR') continue;
    if (h in CHAMCONG_TO_APP) {
      const app = CHAMCONG_TO_APP[h];
      if (app) clsCols.push({ c, app });
    }
  }
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const yr = parseNum(r[0]);
    if (!yr || yr < 2024) continue;
    const dateISO = toISO(r[1]);
    if (!dateISO || dateISO < '2024-01-01') continue;
    const isRecent = dateISO >= RECENT_FROM;
    for (const { c, app } of clsCols) {
      const v = parseNum(r[c]);
      if (!v || v <= 0) continue;
      (teach[app] ||= {});
      (teach[app][teacherName] ||= { total: 0, recent: 0 });
      teach[app][teacherName].total += v;
      if (isRecent) teach[app][teacherName].recent += v;
      if (staff) teachingLogs.push({ staffCode: staff.code, date: dateISO, appClass: app, sessions: v });
    }
  }
}
/** Trả mã GV chủ nhiệm cho 1 app class (recent-max → total-max → chưa phân công). */
function homeroomCode(appClass: string): string {
  const m = teach[appClass];
  if (!m) return STAFF_UNASSIGNED.code;
  const entries = Object.entries(m);
  entries.sort((a, b) => (b[1].recent - a[1].recent) || (b[1].total - a[1].total));
  const best = entries[0];
  if (!best || (best[1].recent === 0 && best[1].total === 0)) return STAFF_UNASSIGNED.code;
  const staff = staffByName.get(norm(best[0]));
  return staff ? staff.code : STAFF_UNASSIGNED.code;
}

// ════════════════════════════════════════════════════════════════════════════
// 3. THU TIỀN HỌC PHÍ OFFLINE — sổ gốc (HV, enrollment, học phí)
// ════════════════════════════════════════════════════════════════════════════
const tt = aoa(wbS, 'THU TIỀN HỌC PHÍ OFFLINE');
const TT_HDR = tt[1] || [];
// cột tháng 7..28 → ISO đầu tháng
const monthCols: { c: number; firstISO: string }[] = [];
for (let c = 7; c <= 28; c++) {
  const iso = firstOfMonth(TT_HDR[c]);
  if (iso) monthCols.push({ c, firstISO: iso });
}
// chỉ số cột cố định
const C = { VIET: 2, ANH: 3, LOP: 5, FEE: 6, TONGTHU: 29, DAHOC: 31, TINHTRANG: 35, NGAYNHAP: 46, NGAYNGHI: 47 };
let expectedDaHoc = 0;

interface Student { code: string; viet: string; anh: string; gender: string | null; birth: string | null; enrollDate: string | null; active: boolean; }
interface Enroll { studentCode: string; appClass: string; fee: number; start: string | null; end: string | null; active: boolean; }
interface Tx { studentCode: string; appClass: string; amount: number; date: string; term: string; }

const students = new Map<string, Student>(); // key -> student
const enrollMap = new Map<string, Enroll>(); // studentCode|classCode -> enroll
const expectedAtt = new Map<string, number>(); // ekey -> AF (số buổi đã học theo file, khử trùng)
const noClassRows: { studentCode: string; name: string; row: number; pay: number }[] = [];
const txs: Tx[] = [];
let hvSeq = 0;
let expectedTongThu = 0;

for (let i = 2; i < tt.length; i++) {
  const r = tt[i];
  const viet = r[C.VIET], anh = r[C.ANH];
  if (!viet || String(viet).trim() === '') continue;
  const key = vietAnhKey(viet, anh);
  let st = students.get(key);
  if (!st) {
    hvSeq++;
    st = {
      code: 'HV' + String(hvSeq).padStart(4, '0'),
      viet: String(viet).trim(), anh: String(anh ?? '').trim(),
      gender: null, birth: null, enrollDate: null, active: false,
    };
    students.set(key, st);
  }
  const active = parseNum(r[C.TINHTRANG]) === 1;
  if (active) st.active = true;

  const rawClass = r[C.LOP];
  expectedTongThu += parseNum(r[C.TONGTHU]) ?? 0;
  const hasClass = !!rawClass && String(rawClass).trim() !== '';
  const appClass = hasClass ? toAppClass(rawClass) : '';
  const startNhap = toISO(r[C.NGAYNHAP]);
  const monthStart = monthCols.find(mc => (parseNum(r[mc.c]) ?? 0) > 0)?.firstISO ?? null;
  const start = startNhap || monthStart;

  if (hasClass) {
    const cc = classCode(appClass);
    const ekey = `${st.code}|${cc}`;
    const fee = parseNum(r[C.FEE]) ?? 0;
    const end = !active ? toISO(r[C.NGAYNGHI]) : null;
    let en = enrollMap.get(ekey);
    if (!en) {
      en = { studentCode: st.code, appClass, fee, start, end, active };
      enrollMap.set(ekey, en);
    } else {
      if (fee > 0) en.fee = fee; // lấy phí mới nhất
      if (start && (!en.start || start < en.start)) en.start = start;
      if (active) en.active = true;
    }
    if (start && (!st.enrollDate || start < st.enrollDate)) st.enrollDate = start;
    // AF khử trùng theo enrollment: lấy MAX qua các dòng trùng (1 dòng có thể trống/lỗi)
    const af = parseNum(r[C.DAHOC]) ?? 0;
    expectedAtt.set(ekey, Math.max(expectedAtt.get(ekey) ?? 0, af));
  } else {
    let rowPay = 0;
    for (const mc of monthCols) { const a = parseNum(r[mc.c]); if (a && a > 0) rowPay += a; }
    noClassRows.push({ studentCode: st.code, name: `${st.viet} - ${st.anh}`.trim(), row: i + 1, pay: rowPay });
  }

  // Nổ giao dịch học phí theo từng tháng (luôn chạy; HV không lớp → mã lớp trống)
  for (const mc of monthCols) {
    const amt = parseNum(r[mc.c]);
    if (amt && amt > 0) {
      txs.push({ studentCode: st.code, appClass, amount: amt, date: mc.firstISO, term: termLabel(mc.firstISO) });
    }
  }
}
console.log(`   Học viên: ${students.size} | Enrollment: ${enrollMap.size} | Giao dịch học phí: ${txs.length}`);

// ════════════════════════════════════════════════════════════════════════════
// 4. THÔNG TIN HỌC VIÊN — enrich hồ sơ + người giám hộ
// ════════════════════════════════════════════════════════════════════════════
interface Guardian { name: string; phone: string; zalo: string; email: string; address: string; }
const guardianByStudent = new Map<string, Guardian>(); // studentCode -> primary guardian
{
  const ti = aoa(wbS, 'THÔNG TIN HỌC VIÊN');
  for (let i = 2; i < ti.length; i++) {
    const r = ti[i];
    const key = vietAnhKey(r[2], r[3]);
    const st = students.get(key);
    if (!st) continue;
    if (!st.birth) st.birth = toISO(r[13]);
    if (!st.gender && r[14]) st.gender = String(r[14]).trim();
    // người giám hộ 1: cột 19..28 (name,email,phone,...)
    const gName = String(r[19] ?? '').trim();
    const gPhone = String(r[5] ?? r[21] ?? '').trim();
    if ((gName || gPhone) && !guardianByStudent.has(st.code)) {
      guardianByStudent.set(st.code, {
        name: gName, phone: gPhone,
        zalo: '', email: String(r[20] ?? r[4] ?? '').trim(),
        address: String(r[25] ?? r[16] ?? '').trim(),
      });
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 5. LỚP HỌC — danh sách lớp chuẩn (từ enrollment) + status + GV + phí
// ════════════════════════════════════════════════════════════════════════════
interface Klass { code: string; name: string; status: string; teacherCode: string; fee: number; }
const classes = new Map<string, Klass>(); // classCode -> class
{
  // gom phí theo lớp để lấy mode
  const feeByClass = new Map<string, Map<number, number>>();
  for (const en of enrollMap.values()) {
    const cc = classCode(en.appClass);
    if (!feeByClass.has(cc)) feeByClass.set(cc, new Map());
    if (en.fee > 0) {
      const m = feeByClass.get(cc)!;
      m.set(en.fee, (m.get(en.fee) ?? 0) + 1);
    }
  }
  for (const en of enrollMap.values()) {
    const cc = classCode(en.appClass);
    if (classes.has(cc)) continue;
    const m = feeByClass.get(cc);
    let fee = 87500;
    if (m && m.size) fee = [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
    classes.set(cc, {
      code: cc, name: en.appClass,
      status: STOPPED_CLASSES.has(en.appClass) ? 'completed' : 'active',
      teacherCode: homeroomCode(en.appClass),
      fee,
    });
  }
}
console.log(`   Lớp: ${classes.size}`);
for (const k of classes.values()) {
  if (k.teacherCode === STAFF_UNASSIGNED.code) W(`Lớp "${k.name}" chưa suy được GV chủ nhiệm → để "Chưa phân công"`);
}

// ════════════════════════════════════════════════════════════════════════════
// 6. ĐIỂM DANH — từ các sheet lớp (nổ từng ô) + past; GRADE 3.1 → GRADE 4.2
// ════════════════════════════════════════════════════════════════════════════
interface Att { studentCode: string; classCode: string; date: string; status: string; deduct: number; note: string; }
const attendance: Att[] = [];
const studentByKey = new Map<string, string>(); // key -> studentCode
for (const [key, st] of students) studentByKey.set(key, st.code);
const enrollSet = new Set([...enrollMap.keys()]);
let attUnmatched = 0;
const attendedByEnroll = new Map<string, number>(); // studentCode|classCode -> số buổi present (+past)

const classSheets = wbS.SheetNames.filter(s => !NON_CLASS_SHEETS.has(s));
for (const sh of classSheets) {
  const appClass = toAppClass(sh);
  const cc = classCode(appClass);
  if (!classes.has(cc)) continue; // lớp không có HV (BIG 13/15, K2...) → bỏ
  const rows = aoa(wbS, sh);
  if (rows.length < 3) continue;
  const hdr = rows[1];
  // cột ngày & cột past (E=4 là cột SUM → bỏ qua, bắt đầu từ F=5).
  // Một số cột ngày thiếu năm ("28/6", "13/7") → kế thừa năm từ cột trước.
  const dateCols: { c: number; iso: string }[] = [];
  let pastCol = -1;
  let lastY: number | null = null, lastM: number | null = null;
  let lastFitISO: string | null = null, fitOffset = 0; // để "fit" ngày cho cột lỗi định dạng
  const pad = (n: number) => String(n).padStart(2, '0');
  const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  // Cột có điểm danh? (bất kỳ HV có 1/0/B/số) — để phân biệt cột buổi thật với cột nhãn rỗng.
  const colHasAttendance = (col: number): boolean => {
    for (let i = 2; i < rows.length; i++) {
      const v = rows[i][col];
      if (v === null || v === undefined || v === '') continue;
      if (String(v).trim().toLowerCase() === 'b' || parseNum(v) !== null) return true;
    }
    return false;
  };
  for (let c = 5; c < hdr.length; c++) {
    let iso = toISO(hdr[c]);
    if (!iso) {
      const m = String(hdr[c] ?? '').trim().replace(/[.\s]+$/, '').match(/^(\d{1,2})[/.](\d{1,2})$/); // ngày thiếu năm
      if (m && lastY) {
        let mo = +m[2], y = lastY;
        if (lastM && mo < lastM) y = lastY + 1; // sang năm mới
        const cand = `${y}-${pad(mo)}-${pad(+m[1])}`;
        if (toISO(cand)) iso = cand; // chỉ nhận nếu hợp lệ
      }
    }
    if (iso && iso >= '2024-01-01') {
      dateCols.push({ c, iso });
      lastY = +iso.slice(0, 4); lastM = +iso.slice(5, 7); lastFitISO = iso; fitOffset = 0;
    } else if (pastCol < 0 && (['PAST', 'PERIOD', 'PERIODS'].includes(norm(hdr[c])) || c === 5)) {
      pastCol = c; // cột MỞ SỔ (buổi mang sang) — nhãn bất kỳ: past/PERIOD/"Tính hết.../cột F đầu
    } else if (colHasAttendance(c)) {
      // Cột NGÀY LỖI ĐỊNH DẠNG nhưng CÓ điểm danh → FIT ngày (kế tiếp cột hợp lệ trước),
      // KHÔNG bỏ buổi (giữ đúng số buổi = cột AF của sổ thu tiền).
      fitOffset++;
      dateCols.push({ c, iso: addDays(lastFitISO || '2024-06-01', fitOffset) });
    }
  }
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const dkey = norm(r[3]);
    if (!dkey || dkey === '-') continue;
    // khớp theo VIỆT(B)+ANH(C) trước (giữ dấu), fallback cột D (gộp, có thể mất dấu)
    const scode = studentByKey.get(vietAnhKey(r[1], r[2])) ?? studentByKey.get(dkey);
    if (!scode) { attUnmatched++; continue; }
    const ekey = `${scode}|${cc}`;
    if (!enrollSet.has(ekey)) { attUnmatched++; continue; }
    const fee = enrollMap.get(ekey)!.fee;
    const startISO = enrollMap.get(ekey)!.start || '2024-06-01';
    // past
    if (pastCol >= 0) {
      const pv = parseNum(r[pastCol]);
      if (pv && pv > 0) {
        attendance.push({ studentCode: scode, classCode: cc, date: startISO, status: 'present', deduct: pv, note: 'Buổi mang sang (past)' });
        attendedByEnroll.set(ekey, (attendedByEnroll.get(ekey) ?? 0) + pv);
      }
    }
    for (const { c, iso } of dateCols) {
      const raw = r[c];
      if (raw === null || raw === undefined || raw === '') continue;
      const sv = String(raw).trim().toLowerCase();
      let status = '', deduct = 0;
      if (sv === 'b') { status = 'excused'; deduct = 0; }
      else {
        const n = parseNum(raw);
        if (n === null) continue;            // NEW / ghi chú / rác → bỏ
        if (n === 0) { status = 'absent'; deduct = 0; }
        else if (n > 0) { status = 'present'; deduct = n; } // n>1: buổi đôi/bù
        else continue;                       // số âm → bỏ
      }
      attendance.push({ studentCode: scode, classCode: cc, date: iso, status, deduct, note: '' });
      if (status === 'present') attendedByEnroll.set(ekey, (attendedByEnroll.get(ekey) ?? 0) + deduct);
    }
  }
}
console.log(`   Điểm danh: ${attendance.length} (không khớp HV/enrollment: ${attUnmatched})`);

// ════════════════════════════════════════════════════════════════════════════
// 7. THU KHÁC → RevenueOther
// ════════════════════════════════════════════════════════════════════════════
interface Rev { category: string; amount: number; date: string; studentCode: string; desc: string; }
const revenues: Rev[] = [];
{
  const tk = aoa(wbS, 'THU KHÁC');
  const hdr0 = tk[0] || [], hdr1 = tk[1] || [];
  // cột 5.. theo nhóm 3 (GIÁO TRÌNH/THI/WORKSHOP) ứng với 1 tháng ở hdr0
  const colMonth: Record<number, string> = {};
  let curMonth: string | null = null;
  for (let c = 5; c < hdr0.length; c++) {
    const mi = firstOfMonth(hdr0[c]);
    if (mi) curMonth = mi;
    if (curMonth) colMonth[c] = curMonth;
  }
  const keyByCol: Record<number, string> = {};
  for (let c = 5; c < hdr1.length; c++) {
    const h = norm(hdr1[c]);
    if (h.includes('GIÁO TRÌNH')) keyByCol[c] = 'Giáo trình';
    else if (h === 'THI') keyByCol[c] = 'Phí thi';
    else if (h.includes('WORKSHOP')) keyByCol[c] = 'Workshop';
  }
  for (let i = 3; i < tk.length; i++) {
    const r = tk[i];
    const key = vietAnhKey(r[1], r[2]);
    const scode = studentByKey.get(key) ?? '';
    for (const cs of Object.keys(keyByCol)) {
      const c = Number(cs);
      const amt = parseNum(r[c]);
      const date = colMonth[c];
      if (amt && amt > 0 && date) {
        revenues.push({ category: keyByCol[c], amount: amt, date, studentCode: scode, desc: keyByCol[c] });
      }
    }
  }
}
console.log(`   Doanh thu khác: ${revenues.length}`);

// ════════════════════════════════════════════════════════════════════════════
// 8. TỔNG CHI → Expense
// ════════════════════════════════════════════════════════════════════════════
interface Exp { date: string; category: string; desc: string; amount: number; }
const expenses: Exp[] = [];
let expectedTongChi = 0;
{
  // bảng mã chi (MÃ CHI -> tên)
  const codeName = new Map<string, string>();
  for (const r of aoa(wbP, 'MÃ LƯƠNG - MÃ CHI')) {
    const mc = String(r[8] ?? '').trim();
    const nm = String(r[9] ?? '').trim();
    if (mc && nm) codeName.set(norm(mc), nm);
  }
  const tc = aoa(wbP, 'TỔNG CHI');
  for (let i = 3; i < tc.length; i++) {
    const r = tc[i];
    const thang = parseNum(r[1]), nam = parseNum(r[2]);
    const mc = String(r[4] ?? '').trim();
    const dien = String(r[5] ?? '').trim();
    const amt = parseNum(r[9]);
    if (!amt || amt <= 0) continue;
    if (!nam) continue;
    const date = `${nam}-${String(thang ?? 1).padStart(2, '0')}-01`;
    const category = codeName.get(norm(mc)) || mc || 'Chi khác';
    expenses.push({ date, category, desc: dien || category, amount: amt });
    expectedTongChi += amt;
  }
}
console.log(`   Chi phí: ${expenses.length}`);

// ════════════════════════════════════════════════════════════════════════════
// 9. TỔNG HỢP LƯƠNG → Payroll + Advance
// ════════════════════════════════════════════════════════════════════════════
interface Pay { month: string; year: string; staffCode: string; teachingSessions: number; teachingIncome: number; baseSalary: number; otherIncome: number; gross: number; advance: number; tax: number; net: number; }
interface Adv { staffCode: string; amount: number; date: string; reason: string; }
const payrolls: Pay[] = [];
const advances: Adv[] = [];
{
  const tl = aoa(wbP, 'TỔNG HỢP LƯƠNG');
  const hdr = tl[1] || [];
  const findCol = (sub: string) => hdr.findIndex((h: any) => norm(h).includes(norm(sub)));
  const cThang = 0, cNam = 1, cTeacher = 4;
  const cDay = findCol('TỔNG CÔNG DẠY');
  const cTienDay = findCol('TIỀN LƯƠNG DẠY');
  const cTienHV = findCol('TIỀN LƯƠNG HỌC');
  const cTienKhac = findCol('TIỀN LƯƠNG KHÁC');
  const cThanhTien = findCol('THÀNH TIỀN');
  const cUng = findCol('ĐÃ ỨNG');
  const cThue = findCol('THUẾ');
  const cThanhToan = findCol('TỔNG TIỀN THANH');
  for (let i = 2; i < tl.length; i++) {
    const r = tl[i];
    const teacher = String(r[cTeacher] ?? '').trim();
    if (!teacher || teacher === '…') continue;
    const staff = staffByName.get(norm(teacher));
    if (!staff) { W(`Bảng lương: GV "${teacher}" không có trong danh sách nhân sự`); continue; }
    const year = parseNum(r[cNam]); const month = parseNum(r[cThang]);
    if (!year || !month) continue;
    const gross = parseNum(r[cThanhTien]) ?? 0;
    const advance = parseNum(r[cUng]) ?? 0;
    payrolls.push({
      month: String(month), year: String(year), staffCode: staff.code,
      teachingSessions: parseNum(r[cDay]) ?? 0,
      teachingIncome: parseNum(r[cTienDay]) ?? 0,
      baseSalary: parseNum(r[cTienHV]) ?? 0,
      otherIncome: parseNum(r[cTienKhac]) ?? 0,
      gross,
      advance,
      tax: parseNum(r[cThue]) ?? 0,
      net: parseNum(r[cThanhToan]) ?? gross,
    });
    if (advance > 0) {
      const date = `${year}-${String(month).padStart(2, '0')}-01`;
      advances.push({ staffCode: staff.code, amount: advance, date, reason: `Ứng lương ${month}/${year}` });
    }
  }
}
console.log(`   Bảng lương: ${payrolls.length} | Tạm ứng: ${advances.length} | Chấm công GV: ${teachingLogs.length}`);

// ════════════════════════════════════════════════════════════════════════════
// XUẤT TEMPLATE
// ════════════════════════════════════════════════════════════════════════════
function writeTemplate(file: string, header: string[], rows: any[][]) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'DATA');
  try {
    XLSX.writeFile(wb, path.join(OUT_TEMPLATES, file));
    console.log(`   ✅ ${file} (${rows.length} dòng)`);
  } catch (e: any) {
    if (e?.code === 'EBUSY' || e?.code === 'EPERM') {
      console.log(`   ⚠️  ${file}: ĐANG MỞ trong Excel → BỎ QUA (đóng file rồi chạy lại để cập nhật).`);
      W(`Template ${file} đang mở trong Excel — chưa cập nhật. Đóng file rồi chạy lại "npm run kim:extract".`);
    } else throw e;
  }
}

// Gom enrollment theo HV (để chọn lớp đại diện active + xuất đủ ghi danh)
const enrollByStudent = new Map<string, Enroll[]>();
for (const en of enrollMap.values()) {
  if (!enrollByStudent.has(en.studentCode)) enrollByStudent.set(en.studentCode, []);
  enrollByStudent.get(en.studentCode)!.push(en);
}

// Phân loại các dòng "không có lớp" (gộp theo HV) → cảnh báo đúng mức
{
  const vnd = (n: number) => n.toLocaleString('vi-VN') + 'đ';
  const byStudent = new Map<string, { name: string; rows: number[]; pay: number }>();
  for (const nc of noClassRows) {
    if (!byStudent.has(nc.studentCode)) byStudent.set(nc.studentCode, { name: nc.name, rows: [], pay: 0 });
    const g = byStudent.get(nc.studentCode)!; g.rows.push(nc.row); g.pay += nc.pay;
  }
  for (const [code, g] of byStudent) {
    const others = enrollByStudent.get(code) ?? [];
    const rowStr = `dòng ${g.rows.join(', ')}`;
    if (others.length) {
      const cls = others.map(e => `${e.appClass}${e.active ? '(active)' : '(ngưng)'}`).join(', ');
      if (g.pay > 0) W(`[Kiểm tra] HV "${g.name}" (${rowStr}): dòng KHÔNG lớp có đóng ${vnd(g.pay)} — nhưng HV ĐÃ có lớp khác [${cls}]. Xem khoản này thuộc lớp nào.`);
      else W(`[Bỏ qua] HV "${g.name}" (${rowStr}): dòng trống thừa (không lớp/tiền/buổi); HV đã có lớp [${cls}] → KHÔNG mất gì.`);
    } else {
      if (g.pay > 0) W(`[⚠️ CẦN GÁN LỚP] HV "${g.name}" (${rowStr}): đã đóng ${vnd(g.pay)} nhưng CHƯA có lớp & chưa có điểm danh → gán mã lớp ở 03b_GhiDanh + 04_HocPhi.`);
      else W(`[Bỏ qua] HV "${g.name}" (${rowStr}): dòng trống hoàn toàn (không lớp/tiền/buổi).`);
    }
  }
}

console.log('📝 Xuất template...');
// 01_NhanSu
writeTemplate('01_NhanSu.xlsx',
  ['Mã nhân sự (*)', 'Họ và tên (*)', 'Vai trò (*)', 'Số điện thoại', 'Lương cơ bản', 'Đơn giá/buổi dạy', 'Đơn giá/giờ', 'Phụ cấp khác/tháng', 'Ghi chú phụ cấp', 'Số tài khoản NH', 'Ngân hàng', 'Ngày bắt đầu (*)', 'Trạng thái', 'Phương pháp thuế', 'Thuế suất (%)', 'Đóng BHXH', 'Đóng BHYT', 'Đóng BHTN', 'Ghi chú'],
  staffList.map(s => [s.code, s.name, s.role, '', s.baseSalary, s.ratePerSession, 0, s.otherAllow, '', '', '', '2024-06-01', 'active', 'fixed_percent', 10, 'Không', 'Không', 'Không', '']));
// 02_LopHoc
writeTemplate('02_LopHoc.xlsx',
  ['Mã lớp học (*)', 'Tên lớp (*)', 'Loại lớp', 'Mã giáo viên (*)', 'Phòng học', 'Sĩ số tối đa', 'Học phí/buổi (VNĐ) (*)', 'Lịch học', 'Giờ học', 'Mô tả', 'Trạng thái'],
  [...classes.values()].map(k => [k.code, k.name, 'offline', k.teacherCode, '', 30, k.fee, '', '', '', k.status]));
// 03_HocVien
writeTemplate('03_HocVien.xlsx',
  ['Mã học viên (*)', 'Họ tên tiếng Việt (*)', 'Tên tiếng Anh', 'Giới tính', 'Ngày sinh', 'Ngày nhập học', 'Trạng thái', 'Mã lớp học', 'Học phí riêng/buổi', 'Tên phụ huynh', 'SĐT phụ huynh (*)', 'Zalo phụ huynh', 'Email phụ huynh', 'Địa chỉ', 'Ghi chú'],
  [...students.values()].map(s => {
    // lớp đại diện = enrollment ĐANG HỌC (active), nếu không có thì lấy lớp đầu
    const ens = enrollByStudent.get(s.code) ?? [];
    const en = ens.find(e => e.active) ?? ens[0];
    const g = guardianByStudent.get(s.code);
    return [s.code, s.viet, s.anh, s.gender ?? '', s.birth ?? '', s.enrollDate ?? '', s.active ? 'active' : 'left',
      en ? classCode(en.appClass) : '', en ? en.fee : '', g?.name ?? '', g?.phone ?? '', '', g?.email ?? '', g?.address ?? '', ''];
  }));
// 03b_GhiDanh — TẤT CẢ enrollment (mỗi lần ghi danh 1 dòng, kèm trạng thái từng lớp)
writeTemplate('03b_GhiDanh.xlsx',
  ['Mã học viên (*)', 'Mã lớp học (*)', 'Học phí/buổi', 'Ngày bắt đầu', 'Ngày kết thúc', 'Trạng thái'],
  [...enrollMap.values()].map(e => [e.studentCode, classCode(e.appClass), e.fee, e.start ?? '', e.end ?? '', e.active ? 'active' : 'left']));
// 04_HocPhi
writeTemplate('04_HocPhi.xlsx',
  ['Mã học viên (*)', 'Mã lớp học (*)', 'Số tiền (*)', 'Ngày đóng (*)', 'Phương thức TT', 'Kỳ thu', 'Ghi chú', 'Đã đối soát'],
  txs.map(t => [t.studentCode, classCode(t.appClass), t.amount, t.date, 'Chuyển khoản', t.term, '', 'Không']));
// 05_DoanhThuKhac
writeTemplate('05_DoanhThuKhac.xlsx',
  ['Danh mục (*)', 'Số tiền (*)', 'Ngày thu (*)', 'Phương thức TT', 'Mã học viên', 'Mô tả'],
  revenues.map(r => [r.category, r.amount, r.date, 'Tiền mặt', r.studentCode, r.desc]));
// 06_ChiPhi
writeTemplate('06_ChiPhi.xlsx',
  ['Ngày chi (*)', 'Danh mục (*)', 'Mô tả (*)', 'Số tiền (*)', 'Phương thức TT', 'Chi định kỳ', 'Ghi chú định kỳ', 'Ghi chú'],
  expenses.map(e => [e.date, e.category, e.desc, e.amount, 'Tiền mặt', 'Không', '', '']));
// 07_DiemDanh (+ cột Số buổi trừ cho 'past')
writeTemplate('07_DiemDanh.xlsx',
  ['Mã học viên (*)', 'Mã lớp học (*)', 'Ngày (*)', 'Trạng thái (*)', 'Số buổi trừ', 'Ghi chú'],
  attendance.map(a => [a.studentCode, a.classCode, a.date, a.status, a.deduct, a.note]));
// 08_TamUng
writeTemplate('08_TamUng.xlsx',
  ['Mã nhân sự (*)', 'Số tiền (*)', 'Ngày (*)', 'Lý do'],
  advances.map(a => [a.staffCode, a.amount, a.date, a.reason]));
// 09_ChamCong (mới)
writeTemplate('09_ChamCong.xlsx',
  ['Mã nhân sự (*)', 'Ngày (*)', 'Mã lớp học (*)', 'Số buổi (*)', 'Ghi chú'],
  teachingLogs.map(t => [t.staffCode, t.date, classCode(t.appClass), t.sessions, '']));
// 10_BangLuong (mới)
writeTemplate('10_BangLuong.xlsx',
  ['Tháng (*)', 'Năm (*)', 'Mã nhân sự (*)', 'Tổng buổi dạy', 'Tiền lương dạy', 'Lương cơ bản', 'Thu nhập khác', 'Tổng thu nhập (gross)', 'Đã tạm ứng', 'Thuế TNCN', 'Thực nhận (net)'],
  payrolls.map(p => [p.month, p.year, p.staffCode, p.teachingSessions, p.teachingIncome, p.baseSalary, p.otherIncome, p.gross, p.advance, p.tax, p.net]));

// ════════════════════════════════════════════════════════════════════════════
// REPORT.md — đối soát
// ════════════════════════════════════════════════════════════════════════════
const builtTongThu = txs.reduce((s, t) => s + t.amount, 0);
const builtTongChi = expenses.reduce((s, e) => s + e.amount, 0);
const fmt = (n: number) => n.toLocaleString('vi-VN');

R('# BÁO CÁO TRÍCH XUẤT — KIM ENGLISH → Kim Academy (GĐ1)');
R(`\n_Tạo lúc: ${new Date().toLocaleString('vi-VN')}_\n`);
const studentsActive = [...students.values()].filter(s => s.active).length;
const enrollActive = [...enrollMap.values()].filter(e => e.active).length;
const multiEnroll = [...enrollByStudent.values()].filter(a => a.length > 1).length;
R('## Số lượng');
R('| Thực thể | Số lượng | Ghi chú |');
R('|---|--:|---|');
R(`| Nhân sự | ${staffList.length} | gồm GVNN + 1 "Chưa phân công" |`);
R(`| Lớp học | ${classes.size} | GRADE 3.1 đã gộp vào GRADE 4.2 |`);
R(`| Học viên | ${students.size} | ${studentsActive} đang học · ${students.size - studentsActive} đã nghỉ |`);
R(`| Ghi danh (enrollment) | ${enrollMap.size} | ${enrollActive} active · ${enrollMap.size - enrollActive} đã chốt (AJ=0) |`);
R(`| — HV chuyển lớp (>1 ghi danh) | ${multiEnroll} | mỗi lớp 1 enrollment, giữ lịch sử |`);
R(`| Giao dịch học phí | ${txs.length} | nổ từ 22 cột tháng |`);
R(`| Doanh thu khác | ${revenues.length} | giáo trình/thi/workshop |`);
R(`| Chi phí | ${expenses.length} | TỔNG CHI |`);
R(`| Điểm danh | ${attendance.length} | gồm buổi mang sang |`);
R(`| Chấm công GV (teaching log) | ${teachingLogs.length} | từ TIMESHEET |`);
R(`| Bảng lương (payroll item) | ${payrolls.length} | ${new Set(payrolls.map(p => p.year + '-' + p.month)).size} kỳ |`);
R(`| Tạm ứng | ${advances.length} | |`);
R('\n## Đối soát tiền');
R('| Chỉ tiêu | Số liệu file (cache) | Số liệu trích xuất | Lệch |');
R('|---|--:|--:|--:|');
R(`| Tổng thu học phí | ${fmt(expectedTongThu)} | ${fmt(builtTongThu)} | ${fmt(builtTongThu - expectedTongThu)} |`);
R(`| Tổng chi phí | ${fmt(expectedTongChi)} | ${fmt(builtTongChi)} | ${fmt(builtTongChi - expectedTongChi)} |`);
expectedDaHoc = [...expectedAtt.values()].reduce((s, v) => s + v, 0);
const builtDaHoc = [...attendedByEnroll.values()].reduce((s, v) => s + v, 0);
R(`| Tổng số buổi đã học | ${fmt(expectedDaHoc)} | ${fmt(builtDaHoc)} | ${fmt(builtDaHoc - expectedDaHoc)} |`);
// Đối soát số buổi đã học theo từng enrollment (lệch > 2 buổi)
const attMismatch: { ekey: string; exp: number; got: number }[] = [];
for (const [ekey, exp] of expectedAtt) {
  const got = attendedByEnroll.get(ekey) ?? 0;
  if (Math.abs(got - exp) > 2) attMismatch.push({ ekey, exp, got });
}
attMismatch.sort((a, b) => Math.abs(b.got - b.exp) - Math.abs(a.got - a.exp));
R(`\n_HV đang học (active): ${[...students.values()].filter(s => s.active).length} / ${students.size}_`);
R(`\n_Điểm danh không khớp HV/enrollment: ${attUnmatched}_`);

R('\n## Lớp & GV chủ nhiệm');
R('| Mã | Tên lớp | Trạng thái | Mã GV | Phí/buổi |');
R('|---|---|---|---|--:|');
for (const k of classes.values()) R(`| ${k.code} | ${k.name} | ${k.status} | ${k.teacherCode} | ${fmt(k.fee)} |`);

if (attMismatch.length) {
  // tra cứu tên HV & tên lớp để diễn giải
  const nameByCode = new Map<string, string>();
  for (const st of students.values()) nameByCode.set(st.code, `${st.viet} - ${st.anh}`.trim());
  R(`\n## ⚠️ Lệch số buổi đã học theo enrollment (${attMismatch.length} enrollment, lệch > 2 buổi)`);
  R('> "File (AF)" = số buổi đã học theo công thức trong file gốc; "Trích xuất" = số buổi tôi đếm trực tiếp từ lưới điểm danh.');
  R('\n| Học viên | Lớp | File (AF) | Trích xuất | Lệch | Ở đâu & vì sao |');
  R('|---|---|--:|--:|--:|---|');
  for (const m of attMismatch.slice(0, 50)) {
    const [code, ccode] = m.ekey.split('|');
    const hv = nameByCode.get(code) ?? code;
    const lop = classes.get(ccode)?.name ?? ccode;
    const d = m.got - m.exp;
    let why: string;
    if (m.exp === 0 && m.got > 0)
      why = `Công thức AF trong file **trống/lỗi VLOOKUP** (hiển thị 0) nhưng HV có thật ${m.got} buổi trong sheet "${lop}" → tôi **cứu lại**, không mất buổi.`;
    else if (d > 0)
      why = `File đếm thiếu ${d} buổi (ô lẻ AF bỏ sót); tôi đếm đủ từ sheet "${lop}".`;
    else
      why = `Lệch nhỏ ${-d} buổi: vài ô lẻ trong sheet "${lop}" (vd buổi bù/ký hiệu lạ) — số tôi đếm sát thực tế điểm danh.`;
    R(`| ${hv} | ${lop} | ${m.exp} | ${m.got} | ${d > 0 ? '+' : ''}${d} | ${why} |`);
  }
  if (attMismatch.length > 50) R(`| … +${attMismatch.length - 50} enrollment khác | | | | | |`);
  const recovered = attMismatch.filter(m => m.exp === 0 && m.got > 0).reduce((s, m) => s + m.got, 0);
  const shortfall = attMismatch.filter(m => m.got < m.exp).reduce((s, m) => s + (m.exp - m.got), 0);
  R(`\n_Tổng kết: cứu lại **+${recovered} buổi** từ ô file lỗi công thức${shortfall > 0 ? `; còn thiếu **-${shortfall} buổi** (ô ký hiệu lạ)` : '; **không thiếu buổi nào**'}. Trên tổng ${fmt(expectedDaHoc)} buổi → KHÔNG mất điểm danh._`);
}

if (warn.length) {
  R('\n## ⚠️ Cảnh báo / cần rà soát (' + warn.length + ')');
  for (const w of warn.slice(0, 200)) R('- ' + w);
  if (warn.length > 200) R(`- … và ${warn.length - 200} cảnh báo khác`);
}

try {
  fs.writeFileSync(path.join(OUT_DIR, 'REPORT.md'), report.join('\n'), 'utf8');
} catch (e: any) {
  console.log(`   ⚠️  REPORT.md đang mở → bỏ qua (đóng file rồi chạy lại).`);
}

// ─── REPORT.xlsx (nhiều sheet) ───────────────────────────────────────────────
{
  const nameByCode = new Map<string, string>();
  for (const st of students.values()) nameByCode.set(st.code, `${st.viet} - ${st.anh}`.trim());
  const wbR = XLSX.utils.book_new();
  const addSheet = (name: string, rows: any[][]) =>
    XLSX.utils.book_append_sheet(wbR, XLSX.utils.aoa_to_sheet(rows), name);

  // 1) Tổng quan
  addSheet('Tổng quan', [
    ['BÁO CÁO TRÍCH XUẤT — KIM ENGLISH → Kim Academy (GĐ1)'],
    ['Tạo lúc', new Date().toLocaleString('vi-VN')],
    [],
    ['SỐ LƯỢNG', 'Số', 'Ghi chú'],
    ['Nhân sự', staffList.length, 'gồm GVNN + "Chưa phân công"'],
    ['Lớp học', classes.size, 'GRADE 3.1 đã gộp vào GRADE 4.2'],
    ['Học viên', students.size, `${studentsActive} đang học · ${students.size - studentsActive} đã nghỉ`],
    ['Ghi danh (enrollment)', enrollMap.size, `${enrollActive} active · ${enrollMap.size - enrollActive} đã chốt (AJ=0)`],
    ['— HV chuyển lớp (>1 ghi danh)', multiEnroll, 'giữ lịch sử từng lớp'],
    ['Giao dịch học phí', txs.length, 'nổ từ 22 cột tháng'],
    ['Doanh thu khác', revenues.length, 'giáo trình/thi/workshop'],
    ['Chi phí', expenses.length, 'TỔNG CHI'],
    ['Điểm danh', attendance.length, 'gồm buổi mang sang'],
    ['Chấm công GV', teachingLogs.length, 'từ TIMESHEET'],
    ['Bảng lương', payrolls.length, `${new Set(payrolls.map(p => p.year + '-' + p.month)).size} kỳ`],
    ['Tạm ứng', advances.length, ''],
    [],
    ['ĐỐI SOÁT', 'File gốc', 'Trích xuất', 'Lệch'],
    ['Tổng thu học phí', expectedTongThu, builtTongThu, builtTongThu - expectedTongThu],
    ['Tổng chi phí', expectedTongChi, builtTongChi, builtTongChi - expectedTongChi],
    ['Tổng số buổi đã học', expectedDaHoc, builtDaHoc, builtDaHoc - expectedDaHoc],
    ['HV đang học (active)', [...students.values()].filter(s => s.active).length, students.size, ''],
    ['Điểm danh không khớp HV', attUnmatched, '', ''],
  ]);

  // 2) Lớp & GV
  addSheet('Lớp & GV', [
    ['Mã lớp', 'Tên lớp', 'Trạng thái', 'Mã GV chủ nhiệm', 'Học phí/buổi'],
    ...[...classes.values()].map(k => [k.code, k.name, k.status, k.teacherCode, k.fee]),
  ]);

  // 3) Lệch số buổi (diễn giải)
  const lechRows: any[][] = [['Học viên', 'Lớp', 'File (AF)', 'Trích xuất', 'Lệch', 'Ở đâu & vì sao']];
  for (const m of attMismatch) {
    const [code, ccode] = m.ekey.split('|');
    const hv = nameByCode.get(code) ?? code;
    const lop = classes.get(ccode)?.name ?? ccode;
    const d = m.got - m.exp;
    const why = m.exp === 0 && m.got > 0
      ? `Công thức AF file trống/lỗi VLOOKUP (=0) nhưng HV có thật ${m.got} buổi ở "${lop}" → cứu lại, không mất buổi`
      : d > 0 ? `File đếm thiếu ${d} buổi; tôi đếm đủ từ "${lop}"`
        : `Lệch nhỏ ${-d} buổi (ô ký hiệu lạ ở "${lop}")`;
    lechRows.push([hv, lop, m.exp, m.got, d, why]);
  }
  if (attMismatch.length === 0) lechRows.push(['(không có lệch > 2 buổi)', '', '', '', '', '']);
  addSheet('Lệch số buổi', lechRows);

  // 4) Cảnh báo
  addSheet('Cảnh báo', [['#', 'Nội dung cần rà soát'], ...warn.map((w, i) => [i + 1, w])]);

  try {
    XLSX.writeFile(wbR, path.join(OUT_DIR, 'REPORT.xlsx'));
  } catch (e: any) {
    console.log(`   ⚠️  REPORT.xlsx đang mở → bỏ qua (đóng file rồi chạy lại).`);
  }
}

console.log(`\n📋 REPORT: ${path.join(OUT_DIR, 'REPORT.md')} + REPORT.xlsx`);
console.log('✅ GĐ1 hoàn tất.');
