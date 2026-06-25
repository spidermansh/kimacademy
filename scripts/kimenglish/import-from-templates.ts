/**
 * import-from-templates.ts — GĐ3: nạp bộ template (data-templates/) vào DB.
 *
 * Idempotent: xoá sạch dữ liệu nghiệp vụ (giữ Users + SystemParameter) rồi nạp lại.
 * Mặc định DRY-RUN (chỉ đếm, không ghi). Thêm --confirm để ghi thật.
 *   npx tsx scripts/kimenglish/import-from-templates.ts            # dry-run
 *   npx tsx scripts/kimenglish/import-from-templates.ts --confirm  # ghi DB
 *
 * Sổ cái: sau khi nạp, gọi recalcEnrollmentLedger() (nguồn sự thật) cho mọi enrollment.
 */
import XLSX from 'xlsx';
import path from 'path';
import bcryptjs from 'bcryptjs';

// Nạp Prisma ĐỘNG (chỉ khi --confirm) vì prisma.client ném lỗi nếu thiếu DATABASE_URL,
// để dry-run chạy được mà không cần DB.
let prisma: any;
let recalcEnrollmentLedger: (db: any, id: string) => Promise<any>;

const DIR = path.resolve('data-templates');
const isDryRun = !process.argv.includes('--confirm');

function read(file: string): any[] {
  const wb = XLSX.readFile(path.join(DIR, file));
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}
const S = (v: any) => String(v ?? '').trim();
const N = (v: any) => { const n = Number(String(v ?? '').replace(/[,\s]/g, '')); return Number.isFinite(n) ? n : 0; };
// Ngày HỢP LỆ: 'YYYY-MM-DD', tháng 1-12, ngày 1-31, năm 2000-2032 (loại ngày rác như 2025-33-13).
const Dt = (v: any): string | null => {
  const s = S(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const y = +s.slice(0, 4), mo = +s.slice(5, 7), d = +s.slice(8, 10);
  return (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2032) ? s : null;
};
const yesNo = (v: any) => ['có', 'co', 'yes', 'true', '1', 'x'].includes(S(v).toLowerCase());
const chunk = <T>(a: T[], n: number): T[][] => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

const log = (...a: any[]) => console.log(...a);

// ─── Base: Users + SystemParameter ───────────────────────────────────────────
async function ensureBase() {
  const users = [
    { username: 'admin', name: 'Quản trị viên', role: 'admin' },
    { username: 'ketoan', name: 'Kế toán', role: 'admin' },
    { username: 'nvvp', name: 'Nhân viên văn phòng', role: 'staff' },
    { username: 'teacher', name: 'Giáo viên', role: 'teacher' },
  ];
  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { username: u.username } });
    if (!existing) {
      await prisma.user.create({ data: { ...u, password: bcryptjs.hashSync('password123', 10) } });
    }
  }
  const params = [
    { key: 'warning_tuition_threshold', name: 'Cảnh báo nợ học phí (số buổi)', group: 'Học vụ', valueType: 'number', value: '2', unit: 'buổi' },
    { key: 'warning_absence_threshold', name: 'Cảnh báo vắng liên tiếp (số buổi)', group: 'Học vụ', valueType: 'number', value: '3', unit: 'buổi' },
    { key: 'warning_inactive_days', name: 'Cảnh báo vắng không lý do (ngày)', group: 'Học vụ', valueType: 'number', value: '14', unit: 'ngày' },
    { key: 'max_students_per_class', name: 'Sĩ số tối đa mặc định', group: 'Lớp học', valueType: 'number', value: '30', unit: 'học viên' },
    { key: 'tax_fixed_percent', name: 'Thuế TNCN cố định (%)', group: 'Nhân sự', valueType: 'number', value: '10', unit: '%' },
  ];
  const today = new Date().toISOString().slice(0, 10);
  for (const p of params) {
    const ex = await prisma.systemParameter.findUnique({ where: { key: p.key } });
    if (!ex) await prisma.systemParameter.create({ data: { ...p, effectiveFrom: today, createdBy: 'import' } });
  }
}

// ─── Clear domain (preserve Users + SystemParameter + FeatureFlag) ───────────
async function clearDomain() {
  await prisma.inventoryMovement.deleteMany({});
  await prisma.inventoryStock.deleteMany({});
  await prisma.inventoryVariant.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.inventoryCategory.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.inventoryLocation.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.dailyClose.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.payrollItem.deleteMany({});
  await prisma.payrollPeriod.deleteMany({});
  await prisma.salaryAdvance.deleteMany({});
  await prisma.assistantWorkLog.deleteMany({});
  await prisma.teachingLog.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.tuitionLedgerEntry.deleteMany({});
  await prisma.tuitionTransaction.deleteMany({});
  await prisma.revenueOther.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.guardianContact.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.staffMember.deleteMany({});
}

async function main() {
  log('╔══════════════════════════════════════════════════════╗');
  log('║  📥 IMPORT TEMPLATE → DB  (Kim Academy v3)            ║');
  log('╚══════════════════════════════════════════════════════╝');
  log(isDryRun ? '⚠️  DRY-RUN: chỉ đếm, KHÔNG ghi DB. Thêm --confirm để nạp thật.\n' : '🔥 GHI THẬT vào DB.\n');

  // Đọc template
  const tStaff = read('01_NhanSu.xlsx');
  const tClass = read('02_LopHoc.xlsx');
  const tStudent = read('03_HocVien.xlsx');
  const tEnroll = read('03b_GhiDanh.xlsx');
  const tTuition = read('04_HocPhi.xlsx');
  const tRevenue = read('05_DoanhThuKhac.xlsx');
  const tExpense = read('06_ChiPhi.xlsx');
  const tAtt = read('07_DiemDanh.xlsx');
  const tAdvance = read('08_TamUng.xlsx');
  const tTeachLog = read('09_ChamCong.xlsx');
  const tPayroll = read('10_BangLuong.xlsx');
  log('📄 Đã đọc template:',
    `NS ${tStaff.length} · Lớp ${tClass.length} · HV ${tStudent.length} · Ghi danh ${tEnroll.length} · Học phí ${tTuition.length} · DT khác ${tRevenue.length} · Chi ${tExpense.length} · Điểm danh ${tAtt.length} · Tạm ứng ${tAdvance.length} · Chấm công ${tTeachLog.length} · Lương ${tPayroll.length}`);

  if (isDryRun) {
    log('\n📋 Dry-run OK — số liệu trên sẽ được nạp khi chạy với --confirm (cần DATABASE_URL).');
    return;
  }

  // Nạp Prisma + ledger động (cần DATABASE_URL)
  ({ prisma } = await import('../../src/infrastructure/db/prisma.client'));
  ({ recalcEnrollmentLedger } = await import('../../src/api/services/ledger'));

  log('\n🧹 Chuẩn bị (base users + xoá dữ liệu cũ)...');
  await ensureBase();
  await clearDomain();

  // 1. Staff
  log('🔷 Nhân sự...');
  const staffId = new Map<string, string>();
  for (const r of tStaff) {
    const code = S(r['Mã nhân sự (*)']).toUpperCase();
    if (!code) continue;
    const role = S(r['Vai trò (*)']).toLowerCase();
    const c = await prisma.staffMember.create({
      data: {
        code, name: S(r['Họ và tên (*)']),
        role: ['teacher', 'teaching_assistant', 'office'].includes(role) ? role : 'teacher',
        phone: S(r['Số điện thoại']) || null,
        baseSalary: N(r['Lương cơ bản']), ratePerSession: N(r['Đơn giá/buổi dạy']),
        ratePerHour: N(r['Đơn giá/giờ']), otherMonthlyAllowance: N(r['Phụ cấp khác/tháng']),
        startDate: Dt(r['Ngày bắt đầu (*)']) || '2024-06-01',
        status: S(r['Trạng thái']).toLowerCase() === 'inactive' ? 'inactive' : 'active',
        taxMethod: 'fixed_percent', taxMethodValue: N(r['Thuế suất (%)']) || 10,
      },
    });
    staffId.set(code, c.id);
  }

  // 2. Class
  log('🔷 Lớp học...');
  const classId = new Map<string, string>();
  const classTeacher = new Map<string, string>();
  const classFee = new Map<string, number>();
  for (const r of tClass) {
    const code = S(r['Mã lớp học (*)']).toUpperCase();
    const tCode = S(r['Mã giáo viên (*)']).toUpperCase();
    const tid = staffId.get(tCode);
    if (!code || !tid) { log(`   ⚠️ Bỏ lớp "${code}" (thiếu GV ${tCode})`); continue; }
    const fee = N(r['Học phí/buổi (VNĐ) (*)']);
    const c = await prisma.class.create({
      data: {
        code, name: S(r['Tên lớp (*)']), type: S(r['Loại lớp']).toLowerCase() === 'online' ? 'online' : 'offline',
        teacherId: tid, maxStudents: N(r['Sĩ số tối đa']) || 30, defaultFeePerSession: fee,
        scheduleDays: '[]', status: S(r['Trạng thái']) || 'active',
      },
    });
    classId.set(code, c.id); classTeacher.set(code, tid); classFee.set(code, fee);
  }

  // 3. Student + Guardian
  log('🔷 Học viên + phụ huynh...');
  const studentId = new Map<string, string>();
  for (const r of tStudent) {
    const code = S(r['Mã học viên (*)']).toUpperCase();
    if (!code) continue;
    const viet = S(r['Họ tên tiếng Việt (*)']);
    const c = await prisma.student.create({
      data: {
        code, name: viet, vietnameseName: viet, englishName: S(r['Tên tiếng Anh']) || viet,
        gender: S(r['Giới tính']) || null, birthDate: Dt(r['Ngày sinh']), enrollDate: Dt(r['Ngày nhập học']),
        status: S(r['Trạng thái']) || 'active', createdBy: 'import',
      },
    });
    studentId.set(code, c.id);
    const phone = S(r['SĐT phụ huynh (*)']);
    if (phone) {
      await prisma.guardianContact.create({
        data: {
          studentId: c.id, name: S(r['Tên phụ huynh']) || null, phone,
          zalo: S(r['Zalo phụ huynh']) || null, email: S(r['Email phụ huynh']) || null,
          address: S(r['Địa chỉ']) || null, isPrimary: true, relationship: 'parent',
        },
      });
    }
  }

  // 4. Enrollment (+ ledger rỗng) — từ 03b_GhiDanh
  log('🔷 Ghi danh...');
  const enrollId = new Map<string, string>(); // studentId|classId -> enrollmentId
  const enrollFee = new Map<string, number>(); // enrollmentId -> phí của ghi danh đó
  for (const r of tEnroll) {
    const sCode = S(r['Mã học viên (*)']).toUpperCase();
    const cCode = S(r['Mã lớp học (*)']).toUpperCase();
    const sid = studentId.get(sCode), cid = classId.get(cCode);
    if (!sid || !cid) continue;
    // Dùng phí ghi trong template kể cả khi = 0 (lớp miễn phí); chỉ fallback phí lớp khi BỎ TRỐNG.
    const feeCell = S(r['Học phí/buổi']);
    const fee = feeCell !== '' ? N(feeCell) : (classFee.get(cCode) || 0);
    const e = await prisma.enrollment.create({
      data: {
        studentId: sid, classId: cid, feePerSession: fee,
        startDate: Dt(r['Ngày bắt đầu']) || '2024-06-01', endDate: Dt(r['Ngày kết thúc']),
        isActive: S(r['Trạng thái']).toLowerCase() !== 'left', feeHistory: '[]', createdBy: 'import',
      },
    });
    enrollId.set(`${sid}|${cid}`, e.id);
    enrollFee.set(e.id, fee);
    await prisma.tuitionLedgerEntry.create({
      data: { studentId: sid, enrollmentId: e.id, totalPaid: 0, totalSpent: 0, balance: 0, sessionsRemaining: 0 },
    });
  }

  // 5. TuitionTransaction
  log('🔷 Giao dịch học phí...');
  const txData = tTuition.map(r => {
    const sid = studentId.get(S(r['Mã học viên (*)']).toUpperCase());
    const cid = classId.get(S(r['Mã lớp học (*)']).toUpperCase());
    if (!sid) return null;
    const eid = cid ? enrollId.get(`${sid}|${cid}`) : null;
    return {
      studentId: sid, enrollmentId: eid || null, amount: N(r['Số tiền (*)']),
      paymentDate: Dt(r['Ngày đóng (*)']) || '2024-06-01', paymentMethod: S(r['Phương thức TT']) || 'Chuyển khoản',
      term: S(r['Kỳ thu']) || null, isReconciled: yesNo(r['Đã đối soát']), source: 'import', createdBy: 'import',
    };
  }).filter(Boolean) as any[];
  for (const b of chunk(txData, 2000)) await prisma.tuitionTransaction.createMany({ data: b });

  // 6. Session + AttendanceRecord
  log('🔷 Buổi học + điểm danh...');
  const sessKeys = new Set<string>();
  for (const r of tAtt) { const c = classId.get(S(r['Mã lớp học (*)']).toUpperCase()); const d = Dt(r['Ngày (*)']); if (c && d) sessKeys.add(`${c}|${d}`); }
  const classIdToTeacher = new Map<string, string>(); // classId -> teacherId
  for (const [code, cid] of classId) classIdToTeacher.set(cid, classTeacher.get(code)!);
  const sessData = [...sessKeys].map(k => { const [cid, date] = k.split('|'); return { classId: cid, date, teacherId: classIdToTeacher.get(cid)!, status: 'completed', createdBy: 'import' }; });
  for (const b of chunk(sessData, 2000)) await prisma.session.createMany({ data: b });
  const sessions = await prisma.session.findMany({ select: { id: true, classId: true, date: true } });
  const sessId = new Map<string, string>();
  for (const s of sessions) sessId.set(`${s.classId}|${typeof s.date === 'string' ? s.date : (s.date as any).toISOString().slice(0, 10)}`, s.id);

  const attData = tAtt.map(r => {
    const sid = studentId.get(S(r['Mã học viên (*)']).toUpperCase());
    const cid = classId.get(S(r['Mã lớp học (*)']).toUpperCase());
    const date = Dt(r['Ngày (*)']);
    if (!sid || !cid || !date) return null;
    const eid = enrollId.get(`${sid}|${cid}`);
    const ssid = sessId.get(`${cid}|${date}`);
    if (!eid || !ssid) return null;
    const status = S(r['Trạng thái (*)']) || 'present';
    const deducted = N(r['Số buổi trừ']);
    return {
      sessionId: ssid, studentId: sid, classId: cid, enrollmentId: eid, date, status,
      // feeApplied = phí của CHÍNH ghi danh đó (đúng cả HV phí riêng & lớp miễn phí=0).
      sessionsDeducted: deducted, feeApplied: deducted > 0 ? (enrollFee.get(eid) ?? 0) : 0,
      note: S(r['Ghi chú']) || null, source: 'import', createdBy: 'import',
    };
  }).filter(Boolean) as any[];
  for (const b of chunk(attData, 3000)) await prisma.attendanceRecord.createMany({ data: b });

  // 7. RevenueOther
  log('🔷 Doanh thu khác...');
  const revData = tRevenue.map(r => {
    const sid = studentId.get(S(r['Mã học viên']).toUpperCase());
    return {
      category: S(r['Danh mục (*)']), amount: N(r['Số tiền (*)']), paymentDate: Dt(r['Ngày thu (*)']) || '2024-06-01',
      paymentMethod: S(r['Phương thức TT']) || 'Tiền mặt', studentId: sid || null, description: S(r['Mô tả']) || null, createdBy: 'import',
    };
  });
  for (const b of chunk(revData, 2000)) await prisma.revenueOther.createMany({ data: b });

  // 8. Expense
  log('🔷 Chi phí...');
  const expData = tExpense.map(r => ({
    date: Dt(r['Ngày chi (*)']) || '2024-06-01', category: S(r['Danh mục (*)']), description: S(r['Mô tả (*)']) || S(r['Danh mục (*)']),
    amount: N(r['Số tiền (*)']), paymentMethod: S(r['Phương thức TT']) || 'Tiền mặt', isRecurring: yesNo(r['Chi định kỳ']), createdBy: 'import',
  }));
  for (const b of chunk(expData, 2000)) await prisma.expense.createMany({ data: b });

  // 9. TeachingLog
  log('🔷 Chấm công giảng dạy...');
  const tlData = tTeachLog.map(r => {
    const sid = staffId.get(S(r['Mã nhân sự (*)']).toUpperCase());
    const cid = classId.get(S(r['Mã lớp học (*)']).toUpperCase());
    if (!sid || !cid) return null;
    return { staffId: sid, date: Dt(r['Ngày (*)']) || '2024-06-01', classId: cid, sessions: N(r['Số buổi (*)']) || 1, source: 'import' };
  }).filter(Boolean) as any[];
  for (const b of chunk(tlData, 3000)) await prisma.teachingLog.createMany({ data: b });

  // 10. SalaryAdvance
  log('🔷 Tạm ứng...');
  for (const r of tAdvance) {
    const sid = staffId.get(S(r['Mã nhân sự (*)']).toUpperCase());
    if (!sid) continue;
    await prisma.salaryAdvance.create({ data: { staffId: sid, amount: N(r['Số tiền (*)']), date: Dt(r['Ngày (*)']) || '2024-06-01', reason: S(r['Lý do']) || null, approvedBy: 'import' } });
  }

  // 11. Payroll
  log('🔷 Bảng lương...');
  const periodId = new Map<string, string>();
  for (const r of tPayroll) {
    const m = S(r['Tháng (*)']), y = S(r['Năm (*)']);
    const key = `${y}-${m.padStart(2, '0')}`;
    if (!periodId.has(key)) {
      const p = await prisma.payrollPeriod.create({
        data: { month: key, startDate: `${key}-01`, endDate: `${key}-28`, status: 'paid', createdBy: 'import' },
      });
      periodId.set(key, p.id);
    }
    const sid = staffId.get(S(r['Mã nhân sự (*)']).toUpperCase());
    if (!sid) continue;
    await prisma.payrollItem.create({
      data: {
        payrollPeriodId: periodId.get(key)!, staffId: sid, role: 'teacher',
        baseSalary: N(r['Lương cơ bản']), totalSessions: N(r['Tổng buổi dạy']), teachingIncome: N(r['Tiền lương dạy']),
        otherIncome: N(r['Thu nhập khác']), grossSalary: N(r['Tổng thu nhập (gross)']),
        taxAmount: N(r['Thuế TNCN']), totalAdvance: N(r['Đã tạm ứng']), netSalary: N(r['Thực nhận (net)']), status: 'paid',
      },
    });
  }

  // 12. Tính lại sổ cái (nguồn sự thật)
  log('🔷 Tính lại sổ cái cho từng enrollment...');
  let done = 0;
  for (const eid of enrollId.values()) { await recalcEnrollmentLedger(prisma, eid); if (++done % 100 === 0) log(`   ...${done}/${enrollId.size}`); }

  log(`\n✅ HOÀN TẤT. Nhân sự ${staffId.size} · Lớp ${classId.size} · HV ${studentId.size} · Ghi danh ${enrollId.size} · Điểm danh ${attData.length} · Buổi học ${sessions.length}.`);
  log('   Đăng nhập app: admin / password123');
}

main()
  .catch(err => { console.error('❌ Lỗi:', err); process.exit(1); })
  .finally(async () => { if (prisma) await prisma.$disconnect(); });
