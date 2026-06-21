/**
 * import-real-data.ts
 *
 * Import dữ liệu thật từ các file Excel template vào cơ sở dữ liệu Kim Academy V3.
 * 
 * THỨ TỰ IMPORT (tự động tuân theo):
 *   1. Nhân sự (01_NhanSu.xlsx)
 *   2. Lớp học (02_LopHoc.xlsx)
 *   3. Học viên + Phụ huynh + Enrollment (03_HocVien.xlsx)
 *   4. Học phí (04_HocPhi.xlsx)
 *   5. Doanh thu khác (05_DoanhThuKhac.xlsx)
 *   6. Chi phí (06_ChiPhi.xlsx)
 *   7. Điểm danh (07_DiemDanh.xlsx)
 *   8. Tạm ứng (08_TamUng.xlsx)
 *
 * Chạy: npx tsx scripts/import-real-data.ts
 * Thêm --confirm để thực sự ghi vào DB (mặc định chỉ dry-run)
 * Thêm --clear để xóa dữ liệu cũ trước khi import
 */
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import bcryptjs from 'bcryptjs';
import { prisma } from '../src/infrastructure/db/prisma.client';

const DATA_DIR = path.resolve('data-templates');
const isDryRun = !process.argv.includes('--confirm');
const doClear = process.argv.includes('--clear');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function readExcel(fileName: string): any[] {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`   ⏭️  File ${fileName} không tồn tại, bỏ qua.`);
    return [];
  }

  const workbook = XLSX.readFile(filePath);
  // Find first data sheet (skip 'Hướng dẫn')
  const sheetName = workbook.SheetNames.find(n => n !== 'Hướng dẫn') || workbook.SheetNames[0];
  const ws = workbook.Sheets[sheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  // Nhận diện và lọc bỏ dòng ghi chú (Row 2) & dòng dữ liệu ví dụ (Row 3) một cách thông minh
  const dataRows = rawRows.filter(row => {
    // 1. Loại bỏ dòng trống hoàn toàn
    const values = Object.values(row).map(v => String(v).trim());
    const hasValue = values.some(v => v !== '');
    if (!hasValue) return false;

    // 2. Nhận diện dòng ghi chú / dòng mô tả cột
    const isNoteRow = values.some(v => 
      v.includes('Tên đầy đủ của') || 
      v.includes('teacher | teaching_assistant') ||
      v.includes('Tên tiếng Việt đầy đủ') || 
      v.includes('Phải trùng tên') ||
      v.includes('Mô tả lớp học') ||
      v.includes('Mô tả phụ cấp') ||
      v.includes('Kỳ thu học phí') ||
      v.includes('Chi tiết giao dịch') ||
      v.includes('Nội dung chi') ||
      v.includes('Lý do tạm ứng') ||
      v.includes('present | absent') ||
      v.includes('DD/MM/YYYY')
    );
    if (isNoteRow) return false;

    // 3. Nhận diện dòng ví dụ mẫu
    const isExampleRow = values.some(v => 
      v === 'Nguyễn Văn A' || 
      v === 'Starters 1' || 
      v === 'Nguyễn Minh Anh' || 
      v === 'Nguyễn Văn B' ||
      v === 'Thuê mặt bằng T6/2026' ||
      v === 'Mua giáo trình Starters' ||
      v === 'Đóng 20 buổi' ||
      v === 'GV chính lớp Starters'
    );
    if (isExampleRow) return false;

    return true;
  });

  console.log(`   📄 ${fileName}: ${dataRows.length} dòng dữ liệu thực tế`);
  return dataRows;
}

function parseBoolean(val: any): boolean {
  if (typeof val === 'boolean') return val;
  const s = String(val).toLowerCase().trim();
  return s === 'có' || s === 'co' || s === 'yes' || s === 'true' || s === '1';
}

function parseNumber(val: any, defaultVal: number = 0): number {
  if (val === '' || val === null || val === undefined) return defaultVal;
  const n = Number(String(val).replace(/[,.\s]/g, ''));
  return isNaN(n) ? defaultVal : n;
}

function parseDate(val: any): string {
  if (!val) return new Date().toISOString().slice(0, 10);
  // Handle Excel serial date numbers
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(val).trim();
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Try DD/MM/YYYY
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return s;
}

// ─── Import Functions ────────────────────────────────────────────────────────

const staffCodeToId = new Map<string, string>();
const classCodeToId = new Map<string, string>();
const studentCodeToId = new Map<string, string>();
const enrollmentKeys = new Map<string, string>(); // studentId_classId -> enrollmentId

async function importStaff() {
  console.log('\n🔷 1. NHẬP NHÂN SỰ');
  const rows = readExcel('01_NhanSu.xlsx');
  if (rows.length === 0) return;

  let success = 0, errors = 0;
  for (const row of rows) {
    const code = String(row['Mã nhân sự (*)'] || '').trim().toUpperCase();
    const name = String(row['Họ và tên (*)'] || '').trim();
    if (!code) { errors++; console.log(`   ❌ Dòng thiếu mã nhân sự`); continue; }
    if (!name) { errors++; console.log(`   ❌ Dòng thiếu tên nhân sự`); continue; }

    const role = String(row['Vai trò (*)'] || 'teacher').trim().toLowerCase();
    const startDate = parseDate(row['Ngày bắt đầu (*)']);
    const phone = String(row['Số điện thoại'] || '').trim() || null;

    try {
      if (!isDryRun) {
        // Tìm nhân sự đã tồn tại bằng code
        const existing = await prisma.staffMember.findUnique({
          where: { code }
        });

        const staffData = {
          code,
          name,
          role: ['teacher', 'teaching_assistant', 'office'].includes(role) ? role : 'teacher',
          phone,
          baseSalary: parseNumber(row['Lương cơ bản']),
          ratePerSession: parseNumber(row['Đơn giá/buổi dạy']),
          ratePerHour: parseNumber(row['Đơn giá/giờ']),
          otherMonthlyAllowance: parseNumber(row['Phụ cấp khác/tháng']),
          otherMonthlyAllowanceNote: String(row['Ghi chú phụ cấp'] || '').trim() || null,
          bankAccount: String(row['Số tài khoản NH'] || '').trim() || null,
          bankName: String(row['Ngân hàng'] || '').trim() || null,
          startDate,
          status: String(row['Trạng thái'] || 'active').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active',
          taxMethod: ['fixed_percent', 'progressive', 'none'].includes(String(row['Phương pháp thuế'] || '').trim()) ? String(row['Phương pháp thuế']).trim() : 'fixed_percent',
          taxMethodValue: parseNumber(row['Thuế suất (%)'], 10),
          applySocialInsurance: parseBoolean(row['Đóng BHXH']),
          applyHealthInsurance: parseBoolean(row['Đóng BHYT']),
          applyUnemploymentInsurance: parseBoolean(row['Đóng BHTN']),
          notes: String(row['Ghi chú'] || '').trim() || null,
        };

        let staffId = '';
        if (existing) {
          const updated = await prisma.staffMember.update({
            where: { id: existing.id },
            data: staffData
          });
          staffId = updated.id;
        } else {
          const created = await prisma.staffMember.create({
            data: staffData
          });
          staffId = created.id;
        }
        staffCodeToId.set(code.toLowerCase(), staffId);
      }
      success++;
    } catch (err: any) {
      errors++;
      console.log(`   ❌ Lỗi "${name}": ${err.message}`);
    }
  }
  console.log(`   ✅ Thành công: ${success} | ❌ Lỗi: ${errors}`);
}

async function importClasses() {
  console.log('\n🔷 2. NHẬP LỚP HỌC');
  const rows = readExcel('02_LopHoc.xlsx');
  if (rows.length === 0) return;

  // Pre-load staff if not dry-run
  if (!isDryRun) {
    const allStaff = await prisma.staffMember.findMany();
    allStaff.forEach(s => staffCodeToId.set(s.code.toLowerCase(), s.id));
  }

  let success = 0, errors = 0;
  for (const row of rows) {
    const code = String(row['Mã lớp học (*)'] || '').trim().toUpperCase();
    const name = String(row['Tên lớp (*)'] || '').trim();
    const teacherCode = String(row['Mã giáo viên (*)'] || '').trim().toUpperCase();
    if (!code) { errors++; console.log(`   ❌ Dòng thiếu mã lớp`); continue; }
    if (!name) { errors++; console.log(`   ❌ Dòng thiếu tên lớp`); continue; }
    if (!teacherCode) { errors++; console.log(`   ❌ Lớp "${name}" thiếu mã giáo viên`); continue; }

    const teacherId = staffCodeToId.get(teacherCode.toLowerCase());
    if (!teacherId && !isDryRun) {
      errors++;
      console.log(`   ❌ Lớp "${name}": Không tìm thấy GV có mã "${teacherCode}" trong DB`);
      continue;
    }

    const scheduleDaysStr = String(row['Lịch học'] || '').trim();
    const scheduleDays = scheduleDaysStr
      ? JSON.stringify(scheduleDaysStr.split(',').map(s => s.trim()).filter(Boolean))
      : '[]';

    try {
      if (!isDryRun) {
        const existing = await prisma.class.findUnique({
          where: { code }
        });

        const classData = {
          code,
          name,
          type: String(row['Loại lớp'] || 'offline').trim().toLowerCase() === 'online' ? 'online' : 'offline',
          teacherId: teacherId || '',
          room: String(row['Phòng học'] || '').trim() || null,
          maxStudents: parseNumber(row['Sĩ số tối đa'], 15),
          defaultFeePerSession: parseNumber(row['Học phí/buổi (VNĐ) (*)']),
          scheduleDays,
          scheduleTime: String(row['Giờ học'] || '').trim() || null,
          description: String(row['Mô tả'] || '').trim() || null,
          status: String(row['Trạng thái'] || 'active').trim().toLowerCase(),
        };

        let classId = '';
        if (existing) {
          const updated = await prisma.class.update({
            where: { id: existing.id },
            data: classData
          });
          classId = updated.id;
        } else {
          const created = await prisma.class.create({
            data: classData
          });
          classId = created.id;
        }
        classCodeToId.set(code.toLowerCase(), classId);
      }
      success++;
    } catch (err: any) {
      errors++;
      console.log(`   ❌ Lỗi lớp "${name}": ${err.message}`);
    }
  }
  console.log(`   ✅ Thành công: ${success} | ❌ Lỗi: ${errors}`);
}

async function importStudents() {
  console.log('\n🔷 3. NHẬP HỌC VIÊN + PHỤ HUYNH + ĐĂNG KÝ LỚP');
  const rows = readExcel('03_HocVien.xlsx');
  if (rows.length === 0) return;

  // Pre-load classes if not dry-run
  if (!isDryRun) {
    const allClasses = await prisma.class.findMany();
    allClasses.forEach(c => classCodeToId.set(c.code.toLowerCase(), c.id));
  }

  let success = 0, errors = 0;
  for (const row of rows) {
    const code = String(row['Mã học viên (*)'] || '').trim().toUpperCase();
    const vietnameseName = String(row['Họ tên tiếng Việt (*)'] || '').trim();
    const parentPhone = String(row['SĐT phụ huynh (*)'] || '').trim();
    if (!code) { errors++; console.log(`   ❌ Dòng thiếu mã học viên`); continue; }
    if (!vietnameseName) { errors++; console.log(`   ❌ Dòng thiếu tên học viên`); continue; }
    if (!parentPhone) { errors++; console.log(`   ❌ HV "${vietnameseName}" thiếu SĐT phụ huynh`); continue; }

    const englishName = String(row['Tên tiếng Anh'] || '').trim() || vietnameseName;
    const classCode = String(row['Mã lớp học'] || '').trim().toUpperCase();
    const classId = classCode ? classCodeToId.get(classCode.toLowerCase()) : null;
    const statusRaw = String(row['Trạng thái'] || 'active').trim().toLowerCase();
    const status = ['active', 'waiting_class', 'suspended', 'left', 'trial'].includes(statusRaw) ? statusRaw : 'active';

    try {
      if (!isDryRun) {
        // Tìm học viên đã tồn tại bằng code
        const existingStudent = await prisma.student.findUnique({
          where: { code },
          include: {
            guardianContacts: true
          }
        });

        const studentData = {
          code,
          name: vietnameseName,
          vietnameseName,
          englishName,
          gender: String(row['Giới tính'] || '').trim() || null,
          birthDate: row['Ngày sinh'] ? parseDate(row['Ngày sinh']) : null,
          enrollDate: row['Ngày nhập học'] ? parseDate(row['Ngày nhập học']) : null,
          status,
          notes: String(row['Ghi chú'] || '').trim() || null,
        };

        let studentId = '';
        if (existingStudent) {
          // Update học viên
          const updated = await prisma.student.update({
            where: { id: existingStudent.id },
            data: {
              ...studentData,
              updatedBy: 'import'
            }
          });
          studentId = updated.id;

          // Update phụ huynh liên hệ chính
          const primaryContact = existingStudent.guardianContacts.find(c => c.phone === parentPhone);
          if (primaryContact) {
            await prisma.guardianContact.update({
              where: { id: primaryContact.id },
              data: {
                name: String(row['Tên phụ huynh'] || '').trim() || null,
                zalo: String(row['Zalo phụ huynh'] || '').trim() || null,
                email: String(row['Email phụ huynh'] || '').trim() || null,
                address: String(row['Địa chỉ'] || '').trim() || null,
              }
            });
          }
        } else {
          // Tạo mới học viên
          const created = await prisma.student.create({
            data: {
              ...studentData,
              createdBy: 'import'
            }
          });
          studentId = created.id;

          // Tạo phụ huynh
          await prisma.guardianContact.create({
            data: {
              studentId: created.id,
              name: String(row['Tên phụ huynh'] || '').trim() || null,
              phone: parentPhone,
              zalo: String(row['Zalo phụ huynh'] || '').trim() || null,
              email: String(row['Email phụ huynh'] || '').trim() || null,
              address: String(row['Địa chỉ'] || '').trim() || null,
              isPrimary: true,
              relationship: 'parent',
            }
          });
        }
        studentCodeToId.set(code.toLowerCase(), studentId);

        // Đăng ký lớp (Enrollment) nếu được chọn lớp
        if (classId) {
          const cls = await prisma.class.findUnique({ where: { id: classId } });
          const feeStr = String(row['Học phí riêng/buổi'] || '').trim();
          const fee = feeStr ? parseNumber(feeStr) : (cls?.defaultFeePerSession || 0);
          const startDate = row['Ngày nhập học'] ? parseDate(row['Ngày nhập học']) : new Date().toISOString().slice(0, 10);
          const isActive = status === 'active' || status === 'trial';

          // Tìm xem đã đăng ký lớp này chưa
          const existingEnrollment = await prisma.enrollment.findFirst({
            where: { studentId, classId }
          });

          let enrollmentId = '';
          if (existingEnrollment) {
            // Update enrollment cũ
            const updatedEnroll = await prisma.enrollment.update({
              where: { id: existingEnrollment.id },
              data: {
                feePerSession: fee,
                startDate,
                isActive,
              }
            });
            enrollmentId = updatedEnroll.id;
          } else {
            // Tạo enrollment mới
            const createdEnroll = await prisma.enrollment.create({
              data: {
                studentId,
                classId,
                feePerSession: fee,
                startDate,
                isActive,
                feeHistory: '[]',
                createdBy: 'import',
              }
            });
            enrollmentId = createdEnroll.id;

            // Tạo sổ cái học phí mới
            await prisma.tuitionLedgerEntry.create({
              data: {
                studentId,
                enrollmentId,
                totalPaid: 0,
                totalSpent: 0,
                balance: 0,
                sessionsRemaining: 0,
              }
            });
          }

          enrollmentKeys.set(`${studentId}_${classId}`, enrollmentId);
        }
      }
      success++;
    } catch (err: any) {
      errors++;
      console.log(`   ❌ Lỗi HV "${vietnameseName}": ${err.message}`);
    }
  }
  console.log(`   ✅ Thành công: ${success} | ❌ Lỗi: ${errors}`);
}

async function importTuition() {
  console.log('\n🔷 4. NHẬP HỌC PHÍ');
  const rows = readExcel('04_HocPhi.xlsx');
  if (rows.length === 0) return;

  // Pre-load if needed
  if (!isDryRun) {
    const allStudents = await prisma.student.findMany();
    allStudents.forEach(s => studentCodeToId.set(s.code.toLowerCase(), s.id));
    const allClasses = await prisma.class.findMany();
    allClasses.forEach(c => classCodeToId.set(c.code.toLowerCase(), c.id));
    const allEnrollments = await prisma.enrollment.findMany();
    allEnrollments.forEach(e => enrollmentKeys.set(`${e.studentId}_${e.classId}`, e.id));
  }

  let success = 0, errors = 0;
  for (const row of rows) {
    const studentCode = String(row['Mã học viên (*)'] || '').trim().toUpperCase();
    const classCode = String(row['Mã lớp học (*)'] || '').trim().toUpperCase();
    const amount = parseNumber(row['Số tiền (*)']);
    const paymentDate = parseDate(row['Ngày đóng (*)']);

    if (!studentCode || !classCode || !amount) {
      errors++;
      console.log(`   ❌ Dòng thiếu dữ liệu bắt buộc: Học viên "${studentCode}" / Lớp "${classCode}" / Số tiền ${amount}`);
      continue;
    }

    const studentId = studentCodeToId.get(studentCode.toLowerCase());
    const classId = classCodeToId.get(classCode.toLowerCase());

    if (!studentId && !isDryRun) { errors++; console.log(`   ❌ Không tìm thấy HV có mã "${studentCode}"`); continue; }
    if (!classId && !isDryRun) { errors++; console.log(`   ❌ Không tìm thấy lớp có mã "${classCode}"`); continue; }

    const enrollmentId = (studentId && classId) ? enrollmentKeys.get(`${studentId}_${classId}`) : null;

    try {
      if (!isDryRun) {
        await prisma.tuitionTransaction.create({
          data: {
            studentId: studentId!,
            enrollmentId: enrollmentId || null,
            amount,
            paymentDate,
            paymentMethod: String(row['Phương thức TT'] || 'Tiền mặt').trim(),
            term: String(row['Kỳ thu'] || '').trim() || null,
            notes: String(row['Ghi chú'] || '').trim() || null,
            isReconciled: parseBoolean(row['Đã đối soát']),
            source: 'import',
            createdBy: 'import',
          }
        });

        // Update tuition ledger
        if (enrollmentId) {
          const ledger = await prisma.tuitionLedgerEntry.findUnique({ where: { enrollmentId } });
          if (ledger) {
            const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
            const newPaid = ledger.totalPaid + amount;
            const newBalance = newPaid - ledger.totalSpent;
            const fee = enrollment?.feePerSession || 0;
            const newSessions = fee > 0 ? Math.floor(newBalance / fee) : 0;
            await prisma.tuitionLedgerEntry.update({
              where: { enrollmentId },
              data: { totalPaid: newPaid, balance: newBalance, sessionsRemaining: newSessions, lastUpdatedAt: new Date() }
            });
          }
        }
      }
      success++;
    } catch (err: any) {
      errors++;
      console.log(`   ❌ Lỗi HP "${studentCode}": ${err.message}`);
    }
  }
  console.log(`   ✅ Thành công: ${success} | ❌ Lỗi: ${errors}`);
}

async function importRevenueOther() {
  console.log('\n🔷 5. NHẬP DOANH THU KHÁC');
  const rows = readExcel('05_DoanhThuKhac.xlsx');
  if (rows.length === 0) return;

  let success = 0, errors = 0;
  for (const row of rows) {
    const category = String(row['Danh mục (*)'] || '').trim();
    const amount = parseNumber(row['Số tiền (*)']);
    const paymentDate = parseDate(row['Ngày thu (*)']);
    if (!category || !amount) { errors++; continue; }

    const studentCode = String(row['Mã học viên'] || '').trim().toUpperCase();
    const studentId = studentCode ? studentCodeToId.get(studentCode.toLowerCase()) : null;

    try {
      if (!isDryRun) {
        await prisma.revenueOther.create({
          data: {
            category,
            amount,
            paymentDate,
            paymentMethod: String(row['Phương thức TT'] || 'Tiền mặt').trim(),
            studentId: studentId || null,
            description: String(row['Mô tả'] || '').trim() || null,
            createdBy: 'import',
          }
        });
      }
      success++;
    } catch (err: any) {
      errors++;
      console.log(`   ❌ Lỗi DT khác: ${err.message}`);
    }
  }
  console.log(`   ✅ Thành công: ${success} | ❌ Lỗi: ${errors}`);
}

async function importExpenses() {
  console.log('\n🔷 6. NHẬP CHI PHÍ VẬN HÀNH');
  const rows = readExcel('06_ChiPhi.xlsx');
  if (rows.length === 0) return;

  let success = 0, errors = 0;
  for (const row of rows) {
    const date = parseDate(row['Ngày chi (*)']);
    const category = String(row['Danh mục (*)'] || '').trim();
    const description = String(row['Mô tả (*)'] || '').trim();
    const amount = parseNumber(row['Số tiền (*)']);
    if (!category || !description || !amount) { errors++; continue; }

    try {
      if (!isDryRun) {
        await prisma.expense.create({
          data: {
            date,
            category,
            description,
            amount,
            paymentMethod: String(row['Phương thức TT'] || 'Tiền mặt').trim(),
            isRecurring: parseBoolean(row['Chi định kỳ']),
            recurringNote: String(row['Ghi chú định kỳ'] || '').trim() || null,
            notes: String(row['Ghi chú'] || '').trim() || null,
            createdBy: 'import',
          }
        });
      }
      success++;
    } catch (err: any) {
      errors++;
      console.log(`   ❌ Lỗi chi phí: ${err.message}`);
    }
  }
  console.log(`   ✅ Thành công: ${success} | ❌ Lỗi: ${errors}`);
}

async function importAttendance() {
  console.log('\n🔷 7. NHẬP ĐIỂM DANH');
  const rows = readExcel('07_DiemDanh.xlsx');
  if (rows.length === 0) return;

  // Pre-load
  if (!isDryRun) {
    const allStudents = await prisma.student.findMany();
    allStudents.forEach(s => studentCodeToId.set(s.code.toLowerCase(), s.id));
    const allClasses = await prisma.class.findMany();
    allClasses.forEach(c => classCodeToId.set(c.code.toLowerCase(), c.id));
    const allEnrollments = await prisma.enrollment.findMany();
    allEnrollments.forEach(e => enrollmentKeys.set(`${e.studentId}_${e.classId}`, e.id));
  }

  // Track sessions to avoid duplicates
  const sessionCache = new Map<string, string>(); // classId_date -> sessionId

  let success = 0, errors = 0;
  for (const row of rows) {
    const studentCode = String(row['Mã học viên (*)'] || '').trim().toUpperCase();
    const classCode = String(row['Mã lớp học (*)'] || '').trim().toUpperCase();
    const date = parseDate(row['Ngày (*)']);
    const statusRaw = String(row['Trạng thái (*)'] || '').trim().toLowerCase();
    const status = ['present', 'absent', 'excused'].includes(statusRaw) ? statusRaw : 'present';

    if (!studentCode || !classCode || !date) { errors++; continue; }

    const studentId = studentCodeToId.get(studentCode.toLowerCase());
    const classId = classCodeToId.get(classCode.toLowerCase());
    if (!studentId || !classId) {
      if (!isDryRun) {
        errors++;
        console.log(`   ❌ Không tìm thấy HV có mã "${studentCode}" hoặc lớp có mã "${classCode}"`);
      }
      continue;
    }

    const enrollmentId = enrollmentKeys.get(`${studentId}_${classId}`);
    if (!enrollmentId && !isDryRun) { errors++; console.log(`   ❌ HV có mã "${studentCode}" chưa đăng ký lớp có mã "${classCode}"`); continue; }

    try {
      if (!isDryRun) {
        // Find or create session
        const sessionKey = `${classId}_${date}`;
        let sessionId = sessionCache.get(sessionKey);
        if (!sessionId) {
          const cls = await prisma.class.findUnique({ where: { id: classId } });
          const session = await prisma.session.create({
            data: {
              classId,
              date,
              teacherId: cls!.teacherId,
              status: 'completed',
              createdBy: 'import',
            }
          });
          sessionId = session.id;
          sessionCache.set(sessionKey, sessionId);
        }

        const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId! } });
        const feePerSession = enrollment?.feePerSession || 0;
        const sessionsDeducted = status === 'excused' ? 0 : 1;
        const feeApplied = status === 'excused' ? 0 : feePerSession;

        await prisma.attendanceRecord.create({
          data: {
            sessionId,
            studentId,
            classId,
            enrollmentId: enrollmentId!,
            date,
            status,
            sessionsDeducted,
            feeApplied,
            note: String(row['Ghi chú'] || '').trim() || null,
            source: 'import',
            createdBy: 'import',
          }
        });

        // Update ledger
        if (sessionsDeducted > 0 && enrollmentId) {
          const ledger = await prisma.tuitionLedgerEntry.findUnique({ where: { enrollmentId } });
          if (ledger) {
            const newSpent = ledger.totalSpent + feeApplied;
            const newBalance = ledger.totalPaid - newSpent;
            const newSessions = feePerSession > 0 ? Math.floor(newBalance / feePerSession) : 0;
            await prisma.tuitionLedgerEntry.update({
              where: { enrollmentId },
              data: { totalSpent: newSpent, balance: newBalance, sessionsRemaining: newSessions, lastUpdatedAt: new Date() }
            });
          }
        }
      }
      success++;
    } catch (err: any) {
      errors++;
      console.log(`   ❌ Lỗi ĐD "${studentCode}" ${date}: ${err.message}`);
    }
  }
  console.log(`   ✅ Thành công: ${success} | ❌ Lỗi: ${errors}`);
}

async function importAdvances() {
  console.log('\n🔷 8. NHẬP TẠM ỨNG LƯƠNG');
  const rows = readExcel('08_TamUng.xlsx');
  if (rows.length === 0) return;

  // Pre-load staff
  if (!isDryRun) {
    const allStaff = await prisma.staffMember.findMany();
    allStaff.forEach(s => staffCodeToId.set(s.code.toLowerCase(), s.id));
  }

  let success = 0, errors = 0;
  for (const row of rows) {
    const staffCode = String(row['Mã nhân sự (*)'] || '').trim().toUpperCase();
    const amount = parseNumber(row['Số tiền (*)']);
    const date = parseDate(row['Ngày (*)']);
    if (!staffCode || !amount) { errors++; continue; }

    const staffId = staffCodeToId.get(staffCode.toLowerCase());
    if (!staffId && !isDryRun) { errors++; console.log(`   ❌ Không tìm thấy NV có mã "${staffCode}"`); continue; }

    try {
      if (!isDryRun) {
        await prisma.salaryAdvance.create({
          data: {
            staffId: staffId!,
            amount,
            date,
            reason: String(row['Lý do'] || '').trim() || null,
            approvedBy: 'import',
          }
        });
      }
      success++;
    } catch (err: any) {
      errors++;
      console.log(`   ❌ Lỗi tạm ứng "${staffCode}": ${err.message}`);
    }
  }
  console.log(`   ✅ Thành công: ${success} | ❌ Lỗi: ${errors}`);
}

// ─── Clear old data ──────────────────────────────────────────────────────────
async function clearData() {
  console.log('\n🗑️  Đang xóa dữ liệu cũ...');
  // Preserve users and system parameters
  await prisma.inventoryMovement.deleteMany({});
  await prisma.inventoryStock.deleteMany({});
  await prisma.inventoryVariant.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.inventoryCategory.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.inventoryLocation.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.dailyClose.deleteMany({});
  await prisma.importBatch.deleteMany({});
  await prisma.backupSnapshot.deleteMany({});
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
  console.log('   ✅ Đã xóa xong dữ liệu cũ (giữ lại Users + SystemParameters).');
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   📥 IMPORT DỮ LIỆU THẬT - KIM ACADEMY V3             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  if (isDryRun) {
    console.log('');
    console.log('⚠️  CHẾ ĐỘ DRY-RUN: Chỉ kiểm tra file, KHÔNG ghi vào DB.');
    console.log('   Thêm --confirm để thực sự import.');
    console.log('   Thêm --clear --confirm để xóa dữ liệu cũ trước khi import.');
  } else {
    console.log('');
    console.log('🔥 CHẾ ĐỘ THỰC THI: Dữ liệu sẽ được ghi vào cơ sở dữ liệu!');
    if (doClear) {
      await clearData();
    }
  }

  await importStaff();
  await importClasses();
  await importStudents();
  await importTuition();
  await importRevenueOther();
  await importExpenses();
  await importAttendance();
  await importAdvances();

  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  if (isDryRun) {
    console.log('📋 KẾT QUẢ DRY-RUN: Đã kiểm tra xong các file template.');
    console.log('   Nếu không có lỗi, chạy lại với --confirm để import thật:');
    console.log('   npx tsx scripts/import-real-data.ts --confirm');
    console.log('   Hoặc xóa dữ liệu cũ và import:');
    console.log('   npx tsx scripts/import-real-data.ts --clear --confirm');
  } else {
    console.log('🎉 IMPORT HOÀN TẤT! Đăng nhập vào ứng dụng để kiểm tra.');
  }
  console.log('════════════════════════════════════════════════════════════');
}

main()
  .catch(err => {
    console.error('❌ Lỗi hệ thống:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
