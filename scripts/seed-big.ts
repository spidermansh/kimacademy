/**
 * Seed 300 học viên, 15 lớp, 12 nhân sự, khoản chi, xuất nhập kho
 * Chạy: npx tsx scripts/seed-big.ts
 */
import { prisma } from '../src/infrastructure/db/prisma.client';
import bcryptjs from 'bcryptjs';

// ── Data pools ──────────────────────────────────────────────────────────────
const LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const MIDDLE_NAMES_M = ['Văn', 'Đức', 'Minh', 'Gia', 'Hữu', 'Quang', 'Thành', 'Thanh', 'Hoàng', 'Tuấn'];
const MIDDLE_NAMES_F = ['Thị', 'Ngọc', 'Phương', 'Thanh', 'Thùy', 'Bảo', 'Kim', 'Huỳnh', 'Khánh', 'Diễm'];
const FIRST_NAMES_M = ['An', 'Bình', 'Cường', 'Dũng', 'Đạt', 'Huy', 'Khang', 'Long', 'Minh', 'Nam', 'Phúc', 'Quân', 'Sơn', 'Tùng', 'Vinh', 'Khôi', 'Bảo', 'Thiện', 'Kiên', 'Trí'];
const FIRST_NAMES_F = ['Anh', 'Châu', 'Dung', 'Giang', 'Hà', 'Khánh', 'Linh', 'Mai', 'Ngọc', 'Phương', 'Quỳnh', 'Thảo', 'Trang', 'Uyên', 'Vy', 'Hương', 'Nhi', 'Yến', 'Hạnh', 'Trâm'];

const TEACHER_NAMES = [
  'Cô Nguyễn Thị Kim', 'Thầy Trần Văn Minh', 'Cô Lê Thị Hoa',
  'Thầy Phạm Đức Anh', 'Cô Hoàng Thanh Hà', 'Thầy Vũ Quang Trung',
  'Cô Đặng Thùy Linh', 'Thầy Bùi Minh Tuấn', 'Cô Phan Ngọc Mai',
  'Thầy Ngô Hoàng Long', 'Cô Dương Phương Thảo', 'Thầy Hồ Sỹ Quân'
];

const CLASS_NAMES = [
  'Starters A1', 'Starters A2', 'Starters B1',
  'Movers A1', 'Movers A2', 'Movers B1',
  'Flyers A1', 'Flyers A2',
  'KET Prep', 'PET Prep',
  'IELTS Foundation', 'IELTS 5.0-6.0',
  'Phonics 1', 'Phonics 2',
  'Summer Camp 2026'
];

const ROOMS = ['P101', 'P102', 'P103', 'P201', 'P202', 'P203', 'P301', 'P302'];
const EXPENSE_CATS = ['Tiền thuê mặt bằng', 'Điện nước', 'Mua sắm thiết bị', 'Văn phòng phẩm', 'Marketing', 'Bảo trì sửa chữa', 'Khác'];
const PAYMENT_METHODS = ['Tiền mặt', 'Chuyển khoản', 'VNPay'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDate(year: number, monthMin: number, monthMax: number): string {
  const m = randInt(monthMin, monthMax);
  const d = randInt(1, 28);
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function phone() { return `09${randInt(10000000, 99999999)}`; }

async function main() {
  console.log('🧹 Cleaning database...');
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);
  const tables = [
    'AttendanceRecord', 'TuitionLedgerEntry', 'TuitionTransaction', 'RevenueOther',
    'Enrollment', 'Session', 'Class', 'GuardianContact', 'Student', 'AdmissionLead',
    'TeachingLog', 'AssistantWorkLog', 'SalaryAdvance', 'PayrollItem', 'PayrollPeriod',
    'Expense', 'DailyClose', 'AuditLog', 'SystemParameter', 'FeatureFlag',
    'ImportBatch', 'BackupSnapshot', 'Notification',
    'InventoryStock', 'InventoryMovement', 'InventoryVariant', 'InventoryItem',
    'InventoryCategory', 'InventoryLocation', 'Supplier', 'StaffMember', 'User'
  ];
  for (const t of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE;`);
  }
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
  console.log('   ✅ Database cleaned');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. USER ADMIN
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n👤 Tạo user admin...');
  await prisma.user.create({
    data: { username: 'admin', password: bcryptjs.hashSync('admin123', 10), name: 'Quản trị viên', role: 'admin' }
  });
  await prisma.user.create({
    data: { username: 'staff1', password: bcryptjs.hashSync('staff123', 10), name: 'Nhân viên 1', role: 'staff' }
  });
  console.log('   ✅ 2 users (admin/admin123, staff1/staff123)');

  // ══════════════════════════════════════════════════════════════════════════
  // 2. NHÂN SỰ (12 người)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n👨‍🏫 Tạo 12 nhân sự...');
  const staffMembers: any[] = [];
  const roles = ['teacher', 'teacher', 'teacher', 'teacher', 'teacher', 'teacher',
                 'teacher', 'teacher', 'teaching_assistant', 'teaching_assistant', 'office', 'office'];

  for (let i = 0; i < 12; i++) {
    const isTeacher = roles[i] === 'teacher';
    const isTA = roles[i] === 'teaching_assistant';
    const cleanName = TEACHER_NAMES[i].normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const staff = await prisma.staffMember.create({
      data: {
        code: `STAFF-${cleanName}-${i + 1}`,
        name: TEACHER_NAMES[i],
        role: roles[i],
        phone: phone(),
        baseSalary: isTeacher ? randInt(4, 7) * 1000000 : (isTA ? randInt(2, 4) * 1000000 : randInt(5, 8) * 1000000),
        ratePerSession: isTeacher ? randInt(250, 400) * 1000 : 0,
        ratePerHour: isTA ? randInt(40, 70) * 1000 : 0,
        otherMonthlyAllowance: randInt(0, 3) * 500000,
        otherMonthlyAllowanceNote: i % 3 === 0 ? 'Phụ cấp xăng xe' : undefined,
        bankAccount: `${randInt(1000000000, 9999999999)}`,
        bankName: pick(['Vietcombank', 'Techcombank', 'BIDV', 'MB Bank', 'ACB']),
        startDate: randDate(randInt(2022, 2025), 1, 12),
        status: i < 10 ? 'active' : (i === 10 ? 'on_leave' : 'inactive'),
        taxMethod: 'fixed_percent',
        taxMethodValue: 10,
        dependentsCount: randInt(0, 2),
      }
    });
    staffMembers.push(staff);
  }
  console.log(`   ✅ ${staffMembers.length} nhân sự (8 GV, 2 TG, 2 VP)`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. LỚP HỌC (15 lớp)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n📚 Tạo 15 lớp học...');
  const classes: any[] = [];
  const scheduleSets = [
    { days: '["Thứ 2","Thứ 4","Thứ 6"]', time: '08:00-09:30' },
    { days: '["Thứ 2","Thứ 4","Thứ 6"]', time: '09:30-11:00' },
    { days: '["Thứ 2","Thứ 4","Thứ 6"]', time: '14:00-15:30' },
    { days: '["Thứ 3","Thứ 5","Thứ 7"]', time: '08:00-09:30' },
    { days: '["Thứ 3","Thứ 5","Thứ 7"]', time: '09:30-11:00' },
    { days: '["Thứ 3","Thứ 5","Thứ 7"]', time: '14:00-15:30' },
    { days: '["Thứ 2","Thứ 4"]', time: '15:30-17:00' },
    { days: '["Thứ 3","Thứ 5"]', time: '15:30-17:00' },
    { days: '["Thứ 7","Chủ nhật"]', time: '08:00-10:00' },
    { days: '["Thứ 7","Chủ nhật"]', time: '10:00-12:00' },
  ];
  const fees = [120000, 150000, 150000, 180000, 180000, 200000, 200000, 220000, 250000, 280000, 300000, 350000, 150000, 150000, 200000];

  for (let i = 0; i < 15; i++) {
    const sched = scheduleSets[i % scheduleSets.length];
    // Assign teacher (rotate among the 8 teachers)
    const teacherIdx = i % 8;
    const cleanClassName = CLASS_NAMES[i].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cls = await prisma.class.create({
      data: {
        code: `CLASS-${cleanClassName}-${i + 1}`,
        name: CLASS_NAMES[i],
        type: 'offline',
        teacherId: staffMembers[teacherIdx].id,
        room: ROOMS[i % ROOMS.length],
        maxStudents: pick([10, 12, 15, 18, 20]),
        status: i < 13 ? 'active' : (i === 13 ? 'active' : 'inactive'),
        defaultFeePerSession: fees[i],
        scheduleDays: sched.days,
        scheduleTime: sched.time,
        description: `Lớp ${CLASS_NAMES[i]} — Trình độ ${i < 3 ? 'cơ bản' : i < 6 ? 'trung cấp' : i < 10 ? 'nâng cao' : 'đặc biệt'}`,
      }
    });
    classes.push(cls);
  }
  console.log(`   ✅ ${classes.length} lớp học`);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. HỌC VIÊN (300 học viên) + Guardians + Enrollments + Ledgers
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n🎓 Tạo 300 học viên...');
  const students: any[] = [];
  const enrollments: any[] = [];

  for (let i = 0; i < 300; i++) {
    const isFemale = Math.random() > 0.5;
    const lastName = pick(LAST_NAMES);
    const middleName = pick(isFemale ? MIDDLE_NAMES_F : MIDDLE_NAMES_M);
    const firstName = pick(isFemale ? FIRST_NAMES_F : FIRST_NAMES_M);
    const fullName = `${lastName} ${middleName} ${firstName}`;
    const yearOfBirth = randInt(2012, 2020);
    const enrollYear = randInt(2024, 2026);
    const enrollMonth = enrollYear === 2026 ? randInt(1, 6) : randInt(1, 12);

    // Determine student status
    let status = 'active';
    if (i >= 270 && i < 285) status = 'waiting_class';
    else if (i >= 285 && i < 295) status = 'trial';
    else if (i >= 295) status = 'left';

    const cleanStudentName = fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const student = await prisma.student.create({
      data: {
        code: `HV-${cleanStudentName}-${i + 1}`,
        name: fullName,
        vietnameseName: fullName,
        englishName: firstName,
        gender: isFemale ? 'female' : 'male',
        birthDate: `${yearOfBirth}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
        status,
        enrollDate: `${enrollYear}-${String(enrollMonth).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
        createdBy: 'seed',
      }
    });
    students.push(student);

    // Guardian (1-2 per student)
    const guardianCount = Math.random() > 0.7 ? 2 : 1;
    for (let g = 0; g < guardianCount; g++) {
      await prisma.guardianContact.create({
        data: {
          studentId: student.id,
          name: g === 0 ? `${pick(isFemale ? ['Mẹ', 'Ba'] : ['Ba', 'Mẹ'])} ${firstName}` : `Ông/Bà ${lastName}`,
          phone: phone(),
          isPrimary: g === 0,
          relationship: g === 0 ? 'parent' : 'grandparent',
          zalo: Math.random() > 0.5 ? phone() : undefined,
        }
      });
    }

    // Enrollment (active students → 1-2 classes)
    if (status === 'active' || status === 'trial') {
      const numClasses = Math.random() > 0.75 ? 2 : 1;
      const usedClassIds = new Set<string>();

      for (let c = 0; c < numClasses; c++) {
        let cls: any;
        do {
          cls = classes[randInt(0, 12)]; // Only active classes (0-12)
        } while (usedClassIds.has(cls.id));
        usedClassIds.add(cls.id);

        const enrollment = await prisma.enrollment.create({
          data: {
            studentId: student.id,
            classId: cls.id,
            feePerSession: cls.defaultFeePerSession,
            startDate: student.enrollDate,
            isActive: true,
            feeHistory: '[]',
            createdBy: 'seed',
          }
        });
        enrollments.push(enrollment);

        // Tuition ledger
        const paid = status === 'trial' ? 0 : randInt(5, 30) * cls.defaultFeePerSession;
        const spent = status === 'trial' ? 0 : randInt(0, Math.min(20, Math.floor(paid / cls.defaultFeePerSession))) * cls.defaultFeePerSession;
        const balance = paid - spent;
        const sessionsRemaining = cls.defaultFeePerSession > 0 ? Math.floor(balance / cls.defaultFeePerSession) : 0;

        await prisma.tuitionLedgerEntry.create({
          data: {
            studentId: student.id,
            enrollmentId: enrollment.id,
            totalPaid: paid,
            totalSpent: spent,
            balance,
            sessionsRemaining,
          }
        });

        // Create tuition transaction for paid amount
        if (paid > 0) {
          await prisma.tuitionTransaction.create({
            data: {
              studentId: student.id,
              enrollmentId: enrollment.id,
              amount: paid,
              paymentDate: student.enrollDate,
              paymentMethod: pick(PAYMENT_METHODS),
              term: `Kỳ ${enrollMonth < 7 ? 'HK1' : 'HK2'}/${enrollYear}`,
              createdBy: 'seed',
              isReconciled: Math.random() > 0.3,
            }
          });
        }
      }
    }

    // Progress log
    if ((i + 1) % 50 === 0) {
      console.log(`   ... ${i + 1}/300 học viên`);
    }
  }
  console.log(`   ✅ ${students.length} học viên, ${enrollments.length} enrollments`);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. ĐIỂM DANH (tạo sessions + attendance cho 30 ngày gần nhất)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n📋 Tạo điểm danh (30 ngày gần nhất)...');
  let totalAttendance = 0;
  const today = new Date();

  for (let dayOffset = 30; dayOffset >= 1; dayOffset--) {
    const d = new Date(today);
    d.setDate(d.getDate() - dayOffset);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon...

    // Chỉ tạo cho 3-4 lớp ngẫu nhiên mỗi ngày (để không quá nặng)
    const numClassesPerDay = randInt(3, 5);
    const dayClasses = classes.slice(0, 13).sort(() => Math.random() - 0.5).slice(0, numClassesPerDay);

    for (const cls of dayClasses) {
      const teacherIdx = classes.indexOf(cls) % 8;
      const session = await prisma.session.create({
        data: {
          classId: cls.id,
          date: dateStr,
          teacherId: staffMembers[teacherIdx].id,
          status: 'completed',
          createdBy: 'seed',
        }
      });

      // Find students enrolled in this class
      const classEnrollments = enrollments.filter(e => e.classId === cls.id);
      const sampleSize = Math.min(classEnrollments.length, randInt(5, 15));
      const sampledEnrollments = classEnrollments.sort(() => Math.random() - 0.5).slice(0, sampleSize);

      for (const enr of sampledEnrollments) {
        const statusRoll = Math.random();
        const attStatus = statusRoll < 0.75 ? 'present' : (statusRoll < 0.9 ? 'absent' : 'excused');
        const deducted = attStatus === 'excused' ? 0 : 1;
        const feeApplied = attStatus === 'excused' ? 0 : enr.feePerSession;

        await prisma.attendanceRecord.create({
          data: {
            sessionId: session.id,
            studentId: enr.studentId,
            classId: cls.id,
            enrollmentId: enr.id,
            date: dateStr,
            status: attStatus,
            sessionsDeducted: deducted,
            feeApplied,
            createdBy: 'seed',
          }
        });
        totalAttendance++;
      }

      // Teaching log
      await prisma.teachingLog.create({
        data: {
          staffId: staffMembers[teacherIdx].id,
          date: dateStr,
          classId: cls.id,
          sessionId: session.id,
          sessions: 1,
          source: 'auto',
        }
      });
    }
  }
  console.log(`   ✅ ${totalAttendance} bản điểm danh`);

  // ══════════════════════════════════════════════════════════════════════════
  // 6. KHOẢN CHI (20 khoản chi)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n💰 Tạo 20 khoản chi...');
  const expenseData = [
    { cat: 'Tiền thuê mặt bằng', desc: 'Tiền thuê tháng 1/2026', amount: 15000000, month: 1 },
    { cat: 'Tiền thuê mặt bằng', desc: 'Tiền thuê tháng 2/2026', amount: 15000000, month: 2 },
    { cat: 'Tiền thuê mặt bằng', desc: 'Tiền thuê tháng 3/2026', amount: 15000000, month: 3 },
    { cat: 'Tiền thuê mặt bằng', desc: 'Tiền thuê tháng 4/2026', amount: 15000000, month: 4 },
    { cat: 'Tiền thuê mặt bằng', desc: 'Tiền thuê tháng 5/2026', amount: 15000000, month: 5 },
    { cat: 'Tiền thuê mặt bằng', desc: 'Tiền thuê tháng 6/2026', amount: 15000000, month: 6 },
    { cat: 'Điện nước', desc: 'Tiền điện tháng 3', amount: 3200000, month: 3 },
    { cat: 'Điện nước', desc: 'Tiền điện tháng 4', amount: 2800000, month: 4 },
    { cat: 'Điện nước', desc: 'Tiền điện tháng 5', amount: 3500000, month: 5 },
    { cat: 'Điện nước', desc: 'Tiền nước Q2/2026', amount: 1500000, month: 4 },
    { cat: 'Mua sắm thiết bị', desc: 'Mua bảng trắng phòng P201', amount: 2500000, month: 2 },
    { cat: 'Mua sắm thiết bị', desc: 'Mua máy chiếu mới', amount: 12000000, month: 3 },
    { cat: 'Mua sắm thiết bị', desc: 'Mua 3 bộ loa bluetooth', amount: 4500000, month: 5 },
    { cat: 'Văn phòng phẩm', desc: 'Mực in, giấy A4, bút', amount: 850000, month: 3 },
    { cat: 'Văn phòng phẩm', desc: 'Mua sticker, certificate frames', amount: 1200000, month: 4 },
    { cat: 'Marketing', desc: 'Chạy Facebook Ads tháng 4', amount: 5000000, month: 4 },
    { cat: 'Marketing', desc: 'In tờ rơi quảng cáo hè', amount: 3000000, month: 5 },
    { cat: 'Marketing', desc: 'Thuê KOL review trung tâm', amount: 8000000, month: 6 },
    { cat: 'Bảo trì sửa chữa', desc: 'Sửa máy lạnh phòng P102', amount: 1800000, month: 5 },
    { cat: 'Khác', desc: 'Liên hoan tổng kết HK1', amount: 4500000, month: 6 },
  ];

  for (const exp of expenseData) {
    await prisma.expense.create({
      data: {
        date: `2026-${String(exp.month).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
        category: exp.cat,
        description: exp.desc,
        amount: exp.amount,
        paymentMethod: exp.cat === 'Tiền thuê mặt bằng' ? 'Chuyển khoản' : pick(PAYMENT_METHODS),
        isRecurring: exp.cat === 'Tiền thuê mặt bằng',
        recurringNote: exp.cat === 'Tiền thuê mặt bằng' ? 'Hàng tháng' : undefined,
        approvedBy: 'admin',
        createdBy: 'admin',
      }
    });
  }
  console.log(`   ✅ ${expenseData.length} khoản chi`);

  // ══════════════════════════════════════════════════════════════════════════
  // 7. KHO & VẬT TƯ
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n📦 Tạo danh mục kho & vật tư...');

  // Categories
  const catBook = await prisma.inventoryCategory.create({ data: { name: 'Sách giáo trình', code: 'BOOK', description: 'Sách và tài liệu học', createdBy: 'admin' } });
  const catUniform = await prisma.inventoryCategory.create({ data: { name: 'Đồng phục', code: 'UNI', description: 'Áo, nón, ba lô...', createdBy: 'admin' } });
  const catSupply = await prisma.inventoryCategory.create({ data: { name: 'Văn phòng phẩm', code: 'VPP', description: 'Bút, vở, sticker...', createdBy: 'admin' } });

  // Location
  const locMain = await prisma.inventoryLocation.create({ data: { name: 'Kho chính', description: 'Kho trung tâm tầng 1' } });

  // Items
  const items: any[] = [];
  const itemData = [
    { catId: catBook.id, code: 'BOOK-STR-01', name: 'Sách Starters Level 1', unit: 'cuốn', type: 'sellable', sale: 120000, cost: 80000, min: 10 },
    { catId: catBook.id, code: 'BOOK-MOV-01', name: 'Sách Movers Level 1', unit: 'cuốn', type: 'sellable', sale: 150000, cost: 95000, min: 8 },
    { catId: catBook.id, code: 'BOOK-FLY-01', name: 'Sách Flyers Level 1', unit: 'cuốn', type: 'sellable', sale: 180000, cost: 110000, min: 5 },
    { catId: catBook.id, code: 'BOOK-IELTS', name: 'Giáo trình IELTS Foundation', unit: 'cuốn', type: 'sellable', sale: 250000, cost: 160000, min: 5 },
    { catId: catUniform.id, code: 'UNI-TSHIRT', name: 'Áo đồng phục Kim Academy', unit: 'cái', type: 'sellable', sale: 150000, cost: 85000, min: 20 },
    { catId: catUniform.id, code: 'UNI-CAP', name: 'Nón Kim Academy', unit: 'cái', type: 'sellable', sale: 80000, cost: 45000, min: 15 },
    { catId: catUniform.id, code: 'UNI-BAG', name: 'Balo Kim Academy', unit: 'cái', type: 'sellable', sale: 200000, cost: 120000, min: 10 },
    { catId: catSupply.id, code: 'VPP-PEN', name: 'Bút chì 2B (hộp 12)', unit: 'hộp', type: 'consumable', sale: 0, cost: 35000, min: 5 },
    { catId: catSupply.id, code: 'VPP-ERASER', name: 'Tẩy (hộp 20)', unit: 'hộp', type: 'consumable', sale: 0, cost: 25000, min: 3 },
    { catId: catSupply.id, code: 'VPP-STICKER', name: 'Sticker khen thưởng (tập)', unit: 'tập', type: 'consumable', sale: 0, cost: 15000, min: 10 },
  ];

  for (const d of itemData) {
    const item = await prisma.inventoryItem.create({
      data: {
        categoryId: d.catId,
        code: d.code,
        name: d.name,
        unit: d.unit,
        itemType: d.type,
        defaultSalePrice: d.sale,
        defaultCostPrice: d.cost,
        minStockLevel: d.min,
        createdBy: 'admin',
      }
    });
    items.push({ ...item, ...d });
  }

  // Variants for uniform (sizes)
  const tshirtItem = items.find(i => i.code === 'UNI-TSHIRT')!;
  const sizes = ['S (4-6 tuổi)', 'M (7-9 tuổi)', 'L (10-12 tuổi)', 'XL (13+ tuổi)'];
  const variants: any[] = [];
  for (const size of sizes) {
    const v = await prisma.inventoryVariant.create({
      data: {
        itemId: tshirtItem.id,
        sku: `${tshirtItem.code}-${size.split(' ')[0]}`,
        name: `Áo size ${size}`,
        attributes: JSON.stringify({ size }),
      }
    });
    variants.push(v);
  }

  // Supplier
  await prisma.supplier.create({ data: { name: 'NXB Đại học Quốc gia', phone: '02838123456', address: '227 Nguyễn Văn Cừ, Q.5, TP.HCM' } });
  await prisma.supplier.create({ data: { name: 'Công ty TNHH May mặc Tuấn Anh', phone: '02839876543', address: 'KCN Tân Bình, TP.HCM' } });

  // Movements — purchase in (nhập kho)
  console.log('   📥 Tạo phiếu nhập kho...');
  for (const item of items) {
    const qty = randInt(20, 100);
    await prisma.inventoryMovement.create({
      data: {
        movementType: 'purchase_in',
        itemId: item.id,
        toLocationId: locMain.id,
        quantity: qty,
        unitCost: item.cost,
        totalAmount: qty * item.cost,
        movementDate: randDate(2026, 1, 3),
        note: `Nhập kho đầu kỳ: ${item.name}`,
        createdBy: 'admin',
      }
    });

    // Update stock
    await prisma.inventoryStock.create({
      data: {
        itemId: item.id,
        locationId: locMain.id,
        quantityOnHand: qty,
        averageCost: item.cost,
      }
    });
  }

  // Movements — issue to student (xuất bán cho HV)
  console.log('   📤 Tạo phiếu xuất kho...');
  const sellableItems = items.filter(i => i.type === 'sellable');
  for (let i = 0; i < 25; i++) {
    const item = pick(sellableItems);
    const student = students[randInt(0, 269)]; // Only active students
    const qty = randInt(1, 3);

    await prisma.inventoryMovement.create({
      data: {
        movementType: 'issue_to_student',
        itemId: item.id,
        fromLocationId: locMain.id,
        quantity: qty,
        unitSalePrice: item.sale,
        totalAmount: qty * item.sale,
        relatedStudentId: student.id,
        movementDate: randDate(2026, 3, 6),
        note: `Bán ${item.name} cho HV ${student.name}`,
        createdBy: 'admin',
      }
    });

    // Update stock (decrease)
    await prisma.inventoryStock.updateMany({
      where: { itemId: item.id, locationId: locMain.id },
      data: { quantityOnHand: { decrement: qty } },
    });
  }

  // Movements — internal use (văn phòng phẩm)
  const consumableItems = items.filter(i => i.type === 'consumable');
  for (let i = 0; i < 8; i++) {
    const item = pick(consumableItems);
    const qty = randInt(1, 3);

    await prisma.inventoryMovement.create({
      data: {
        movementType: 'internal_use',
        itemId: item.id,
        fromLocationId: locMain.id,
        quantity: qty,
        unitCost: item.cost,
        totalAmount: qty * item.cost,
        movementDate: randDate(2026, 3, 6),
        note: `Sử dụng nội bộ: ${item.name}`,
        createdBy: 'admin',
      }
    });

    await prisma.inventoryStock.updateMany({
      where: { itemId: item.id, locationId: locMain.id },
      data: { quantityOnHand: { decrement: qty } },
    });
  }
  console.log(`   ✅ ${items.length} mặt hàng, ${variants.length} biến thể, 43 phiếu xuất/nhập`);

  // ══════════════════════════════════════════════════════════════════════════
  // 8. TUYỂN SINH (10 leads)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n📝 Tạo 10 leads tuyển sinh...');
  const newLeadStatuses = [
    'test_scheduled',
    'test_scheduled',
    'test_scheduled',
    'tested',
    'tested',
    'accepted_waiting_class',
    'converted_waiting_class',
    'converted_assigned_class',
    'rejected',
    'test_scheduled'
  ];

  for (let i = 0; i < 10; i++) {
    const regDate = randDate(2026, 5, 6);
    const status = newLeadStatuses[i];
    
    // Tạo lịch hẹn test: cùng ngày đăng ký hoặc 1 ngày sau
    const regDateObj = new Date(regDate);
    regDateObj.setDate(regDateObj.getDate() + 1);
    const testSchedDate = regDateObj.toISOString().slice(0, 10);

    const leadData: any = {
      studentName: `${pick(LAST_NAMES)} ${pick(MIDDLE_NAMES_F)} ${pick(FIRST_NAMES_F)}`,
      parentPhone: phone(),
      parentName: `Phụ huynh #${i + 1}`,
      source: pick(['Facebook', 'Zalo', 'Giới thiệu', 'Website', 'Trực tiếp']),
      registrationDate: regDate,
      status,
      learningNeed: pick(['Học nền tảng', 'Thi Cambridge', 'Giao tiếp', 'Luyện IELTS']),
      createdBy: 'admin',
      testScheduleDate: testSchedDate,
      testScheduleTime: '18:00',
      testAssignee: pick(TEACHER_NAMES),
      testScheduleNote: 'Hẹn test đầu vào',
    };

    if (status === 'tested') {
      leadData.testDate = testSchedDate;
      leadData.testType = 'Offline';
      leadData.testScore = randInt(5, 10);
      leadData.suggestedLevel = 'Movers A1';
      leadData.testNote = 'Làm bài khá';
    } else if (status === 'accepted_waiting_class') {
      leadData.testDate = testSchedDate;
      leadData.testType = 'Offline';
      leadData.testScore = randInt(7, 10);
      leadData.suggestedLevel = 'Flyers A1';
    } else if (status === 'converted_waiting_class') {
      leadData.testDate = testSchedDate;
      leadData.testType = 'Offline';
      leadData.testScore = randInt(7, 10);
      leadData.suggestedLevel = 'Flyers A1';
      leadData.convertedStudentId = students[i].id;
      leadData.convertedAt = testSchedDate;
      leadData.convertedBy = 'admin';
    } else if (status === 'converted_assigned_class') {
      leadData.testDate = testSchedDate;
      leadData.testType = 'Offline';
      leadData.testScore = randInt(8, 10);
      leadData.suggestedLevel = 'Starters A1';
      leadData.convertedStudentId = students[i].id;
      leadData.assignedClassId = classes[0].id;
      leadData.convertedAt = testSchedDate;
      leadData.convertedBy = 'admin';
    } else if (status === 'rejected') {
      leadData.testDate = testSchedDate;
      leadData.testType = 'Offline';
      leadData.testScore = randInt(1, 4);
      leadData.rejectionReason = 'Học sinh quá yếu hoặc không đồng ý lịch học';
    }

    await prisma.admissionLead.create({
      data: leadData
    });
  }
  console.log('   ✅ 10 leads tuyển sinh');

  // ══════════════════════════════════════════════════════════════════════════
  // TỔNG KẾT
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════');
  console.log('✨ SEED HOÀN TẤT!');
  console.log('══════════════════════════════════════════');
  console.log(`   👤 Users:          2`);
  console.log(`   👨‍🏫 Nhân sự:        ${staffMembers.length}`);
  console.log(`   📚 Lớp học:        ${classes.length}`);
  console.log(`   🎓 Học viên:       ${students.length}`);
  console.log(`   📋 Enrollments:    ${enrollments.length}`);
  console.log(`   ✅ Điểm danh:      ${totalAttendance}`);
  console.log(`   💰 Khoản chi:      ${expenseData.length}`);
  console.log(`   📦 Mặt hàng kho:   ${items.length}`);
  console.log(`   📝 Leads tuyển sinh: 10`);
  console.log('──────────────────────────────────────────');
  console.log('   🔑 Đăng nhập: admin / admin123');
  console.log('══════════════════════════════════════════');
}

main()
  .catch(e => { console.error('❌ Lỗi seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
