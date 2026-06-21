import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { prisma } from '../../src/infrastructure/db/prisma.client';
import { StudentService, ClassService, SessionService, EnrollmentService, AttendanceService, TuitionService, AdmissionService, AuditService } from './services';
import { studentsRouter } from '../../src/api/routes/students';
import { enrollmentsRouter } from '../../src/api/routes/enrollments';

async function cleanDatabase() {
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);
  const tables = [
    'AttendanceRecord',
    'TuitionLedgerEntry',
    'TuitionTransaction',
    'RevenueOther',
    'Enrollment',
    'Session',
    'Class',
    'GuardianContact',
    'Student',
    'AdmissionLead',
    'TeachingLog',
    'AssistantWorkLog',
    'SalaryAdvance',
    'PayrollItem',
    'PayrollPeriod',
    'Expense',
    'DailyClose',
    'AuditLog',
    'SystemParameter',
    'FeatureFlag',
    'ImportBatch',
    'BackupSnapshot',
    'Notification',
    'InventoryStock',
    'InventoryMovement',
    'InventorySaleBatch',
    'InventoryVariant',
    'InventoryItem',
    'InventoryCategory',
    'Supplier',
    'StaffMember',
    'User'
  ];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
}

describe('Kim Academy v2 - Core Domain 15 Business Test Cases', () => {
  let teacherId: string;
  let classId: string;
  let classId2: string;

  beforeAll(async () => {
    await cleanDatabase();
    // Create a dummy staff member as teacher
    const teacher = await prisma.staffMember.create({
      data: {
        code: 'TCH-001',
        name: 'Giáo Viên A',
        role: 'teacher',
        startDate: '2026-06-01',
      },
    });
    teacherId = teacher.id;
  });

  beforeEach(async () => {
    await cleanDatabase();
    // Re-create teacher since database was truncated
    const teacher = await prisma.staffMember.create({
      data: {
        code: 'TCH-002',
        name: 'Giáo Viên A',
        role: 'teacher',
        startDate: '2026-06-01',
      },
    });
    teacherId = teacher.id;

    // Create a class
    const cls = await ClassService.createClass({
      name: 'Lớp Tiếng Anh Starter',
      teacherId,
      defaultFeePerSession: 150000,
      createdBy: 'test-user',
    });
    classId = cls.id;

    // Create a second class
    const cls2 = await ClassService.createClass({
      name: 'Lớp Tiếng Anh Intermediate',
      teacherId,
      defaultFeePerSession: 200000,
      createdBy: 'test-user',
    });
    classId2 = cls2.id;
  });

  // 1. HV học 2 lớp → 2 enrollments active
  it('1. should allow a student to enroll in 2 active classes', async () => {
    const student = await StudentService.createStudent({
      name: 'Nguyễn Văn An',
      vietnameseName: 'Nguyễn Văn An',
      englishName: 'An Nguyen',
      createdBy: 'test-user',
      guardians: [{ phone: '0901234567', isPrimary: true }],
    });

    const enroll1 = await EnrollmentService.enrollStudent({
      studentId: student!.id,
      classId,
      feePerSession: 150000,
      startDate: '2026-06-20',
      createdBy: 'test-user',
    });

    const enroll2 = await EnrollmentService.enrollStudent({
      studentId: student!.id,
      classId: classId2,
      feePerSession: 200000,
      startDate: '2026-06-20',
      createdBy: 'test-user',
    });

    const activeEnrollments = await EnrollmentService.getActiveEnrollmentsByStudent(student!.id);
    expect(activeEnrollments.length).toBe(2);
    expect(activeEnrollments.map(e => e.classId)).toContain(classId);
    expect(activeEnrollments.map(e => e.classId)).toContain(classId2);
  });

  // 2. Không tạo HV trùng tên + SĐT
  it('2. should block student creation with duplicate name and parent phone', async () => {
    await StudentService.createStudent({
      name: 'Nguyễn Văn An',
      vietnameseName: 'Nguyễn Văn An',
      englishName: 'An Nguyen',
      createdBy: 'test-user',
      guardians: [{ phone: '0901234567', isPrimary: true }],
    });

    await expect(
      StudentService.createStudent({
        name: 'Nguyễn Văn An',
        vietnameseName: 'Nguyễn Văn An',
        englishName: 'An Nguyen',
        createdBy: 'test-user',
        guardians: [{ phone: '0901234567', isPrimary: true }],
      })
    ).rejects.toThrow();
  });

  // 3. Trùng tên khác SĐT → không ghi đè
  it('3. should allow student creation with same name but different phone numbers', async () => {
    const s1 = await StudentService.createStudent({
      name: 'Nguyễn Văn An',
      vietnameseName: 'Nguyễn Văn An',
      englishName: 'An Nguyen',
      createdBy: 'test-user',
      guardians: [{ phone: '0901234567', isPrimary: true }],
    });

    const s2 = await StudentService.createStudent({
      name: 'Nguyễn Văn An',
      vietnameseName: 'Nguyễn Văn An',
      englishName: 'An Nguyen 2',
      createdBy: 'test-user',
      guardians: [{ phone: '0907654321', isPrimary: true }],
    });

    expect(s1!.id).not.toBe(s2!.id);
    const students = await StudentService.getStudents({ search: 'Nguyễn Văn An' });
    expect(students.length).toBe(2);
  });

  // 4. Lead convert → không trùng HV
  it('4. should block lead conversion if target student name and phone already exist', async () => {
    const lead = await AdmissionService.createLead({
      studentName: 'Nguyễn Văn An',
      parentPhone: '0901234567',
      registrationDate: '2026-06-20',
      createdBy: 'test-user',
    });

    await StudentService.createStudent({
      name: 'Nguyễn Văn An',
      vietnameseName: 'Nguyễn Văn An',
      englishName: 'An Nguyen',
      createdBy: 'test-user',
      guardians: [{ phone: '0901234567', isPrimary: true }],
    });

    await expect(
      AdmissionService.convertLeadToStudent({
        leadId: lead.id,
        createdBy: 'test-user',
      })
    ).rejects.toThrow();
  });

  // 5. present → deducted = 1, feeApplied > 0
  it('5. should record attendance present with deducted=1 and positive feeApplied', async () => {
    const student = await StudentService.createStudent({
      name: 'Nguyễn Văn An',
      vietnameseName: 'Nguyễn Văn An',
      englishName: 'An Nguyen',
      createdBy: 'test-user',
      guardians: [{ phone: '0901234567', isPrimary: true }],
    });

    const enrollment = await EnrollmentService.enrollStudent({
      studentId: student!.id,
      classId,
      feePerSession: 150000,
      startDate: '2026-06-20',
      createdBy: 'test-user',
    });

    const session = await SessionService.getOrCreateSession({
      classId,
      date: '2026-06-20',
      teacherId,
      createdBy: 'test-user',
    });

    const attendance = await AttendanceService.recordAttendance({
      sessionId: session.id,
      records: [{
        studentId: student!.id,
        enrollmentId: enrollment.id,
        status: 'present',
      }],
      createdBy: 'test-user',
    });

    expect(attendance[0].sessionsDeducted).toBe(1);
    expect(attendance[0].feeApplied).toBe(150000);
  });

  // 6. absent → deducted = 1, feeApplied > 0
  it('6. should record attendance absent with deducted=1 and positive feeApplied', async () => {
    const student = await StudentService.createStudent({
      name: 'Nguyễn Văn An',
      vietnameseName: 'Nguyễn Văn An',
      englishName: 'An Nguyen',
      createdBy: 'test-user',
      guardians: [{ phone: '0901234567', isPrimary: true }],
    });

    const enrollment = await EnrollmentService.enrollStudent({
      studentId: student!.id,
      classId,
      feePerSession: 150000,
      startDate: '2026-06-20',
      createdBy: 'test-user',
    });

    const session = await SessionService.getOrCreateSession({
      classId,
      date: '2026-06-20',
      teacherId,
      createdBy: 'test-user',
    });

    const attendance = await AttendanceService.recordAttendance({
      sessionId: session.id,
      records: [{
        studentId: student!.id,
        enrollmentId: enrollment.id,
        status: 'absent',
      }],
      createdBy: 'test-user',
    });

    expect(attendance[0].sessionsDeducted).toBe(1);
    expect(attendance[0].feeApplied).toBe(150000);
  });

  // 7. excused → deducted = 0, doanh thu = 0
  it('7. should record attendance excused with deducted=0 and zero feeApplied', async () => {
    const student = await StudentService.createStudent({
      name: 'Nguyễn Văn An',
      vietnameseName: 'Nguyễn Văn An',
      englishName: 'An Nguyen',
      createdBy: 'test-user',
      guardians: [{ phone: '0901234567', isPrimary: true }],
    });

    const enrollment = await EnrollmentService.enrollStudent({
      studentId: student!.id,
      classId,
      feePerSession: 150000,
      startDate: '2026-06-20',
      createdBy: 'test-user',
    });

    const session = await SessionService.getOrCreateSession({
      classId,
      date: '2026-06-20',
      teacherId,
      createdBy: 'test-user',
    });

    const attendance = await AttendanceService.recordAttendance({
      sessionId: session.id,
      records: [{
        studentId: student!.id,
        enrollmentId: enrollment.id,
        status: 'excused',
      }],
      createdBy: 'test-user',
    });

    expect(attendance[0].sessionsDeducted).toBe(0);
    expect(attendance[0].feeApplied).toBe(0);
  });

  // 8. Điểm danh tạo/tìm Session
  it('8. should get or create session properly without duplicate creation', async () => {
    const s1 = await SessionService.getOrCreateSession({
      classId,
      date: '2026-06-20',
      teacherId,
      createdBy: 'test-user',
    });

    const s2 = await SessionService.getOrCreateSession({
      classId,
      date: '2026-06-20',
      teacherId,
      createdBy: 'test-user',
    });

    expect(s1.id).toBe(s2.id);
  });

  // 9. Học phí đã thực hiện = sum feeApplied của present/absent
  it('9. should compute correct total spent tuition based on present and absent records', async () => {
    const student = await StudentService.createStudent({
      name: 'Nguyễn Văn An',
      vietnameseName: 'Nguyễn Văn An',
      englishName: 'An Nguyen',
      createdBy: 'test-user',
      guardians: [{ phone: '0901234567', isPrimary: true }],
    });

    const enrollment = await EnrollmentService.enrollStudent({
      studentId: student!.id,
      classId,
      feePerSession: 150000,
      startDate: '2026-06-20',
      createdBy: 'test-user',
    });

    const session1 = await SessionService.getOrCreateSession({
      classId,
      date: '2026-06-20',
      teacherId,
      createdBy: 'test-user',
    });

    await AttendanceService.recordAttendance({
      sessionId: session1.id,
      records: [{
        studentId: student!.id,
        enrollmentId: enrollment.id,
        status: 'present',
      }],
      createdBy: 'test-user',
    });

    const session2 = await SessionService.getOrCreateSession({
      classId,
      date: '2026-06-21',
      teacherId,
      createdBy: 'test-user',
    });

    await AttendanceService.recordAttendance({
      sessionId: session2.id,
      records: [{
        studentId: student!.id,
        enrollmentId: enrollment.id,
        status: 'absent',
      }],
      createdBy: 'test-user',
    });

    const ledger = await prisma.tuitionLedgerEntry.findUnique({
      where: { enrollmentId: enrollment.id },
    });

    expect(ledger?.totalSpent).toBe(300000);
  });

  // 10. Công nợ tổng = paid - spent theo studentId
  it('10. should aggregate student total balance as totalPaid minus totalSpent', async () => {
    const student = await StudentService.createStudent({
      name: 'Nguyễn Văn An',
      vietnameseName: 'Nguyễn Văn An',
      englishName: 'An Nguyen',
      createdBy: 'test-user',
      guardians: [{ phone: '0901234567', isPrimary: true }],
    });

    const enrollment1 = await EnrollmentService.enrollStudent({
      studentId: student!.id,
      classId,
      feePerSession: 150000,
      startDate: '2026-06-20',
      createdBy: 'test-user',
    });

    const enrollment2 = await EnrollmentService.enrollStudent({
      studentId: student!.id,
      classId: classId2,
      feePerSession: 200000,
      startDate: '2026-06-20',
      createdBy: 'test-user',
    });

    // Create payment transactions
    await TuitionService.createTuitionTransaction({
      studentId: student!.id,
      enrollmentId: enrollment1.id,
      amount: 1000000,
      paymentDate: '2026-06-20',
      paymentMethod: 'Tiền mặt',
      createdBy: 'test-user',
    });

    await TuitionService.createTuitionTransaction({
      studentId: student!.id,
      enrollmentId: enrollment2.id,
      amount: 2000000,
      paymentDate: '2026-06-20',
      paymentMethod: 'Chuyển khoản',
      createdBy: 'test-user',
    });

    // Record some attendance
    const session1 = await SessionService.getOrCreateSession({
      classId,
      date: '2026-06-20',
      teacherId,
      createdBy: 'test-user',
    });
    await AttendanceService.recordAttendance({
      sessionId: session1.id,
      records: [{
        studentId: student!.id,
        enrollmentId: enrollment1.id,
        status: 'present',
      }],
      createdBy: 'test-user',
    });

    const session2 = await SessionService.getOrCreateSession({
      classId: classId2,
      date: '2026-06-20',
      teacherId,
      createdBy: 'test-user',
    });
    await AttendanceService.recordAttendance({
      sessionId: session2.id,
      records: [{
        studentId: student!.id,
        enrollmentId: enrollment2.id,
        status: 'present',
      }],
      createdBy: 'test-user',
    });

    const balanceInfo = await TuitionService.getStudentBalance(student!.id);
    expect(balanceInfo.totalPaid).toBe(3000000);
    expect(balanceInfo.totalSpent).toBe(350000);
    expect(balanceInfo.balance).toBe(2650000);
  });

  // 11. Tổng học viên unique
  it('11. should count unique students without duplicates when student is enrolled in multiple classes', async () => {
    const student = await StudentService.createStudent({
      name: 'Nguyễn Văn An',
      vietnameseName: 'Nguyễn Văn An',
      englishName: 'An Nguyen',
      createdBy: 'test-user',
      guardians: [{ phone: '0901234567', isPrimary: true }],
    });

    await EnrollmentService.enrollStudent({
      studentId: student!.id,
      classId,
      feePerSession: 150000,
      startDate: '2026-06-20',
      createdBy: 'test-user',
    });

    await EnrollmentService.enrollStudent({
      studentId: student!.id,
      classId: classId2,
      feePerSession: 200000,
      startDate: '2026-06-20',
      createdBy: 'test-user',
    });

    const allStudents = await StudentService.getStudents();
    const uniqueIds = new Set(allStudents.map(s => s.id));
    expect(uniqueIds.size).toBe(1);
  });

  // 12. Sĩ số lớp = count active enrollments
  it('12. should calculate correct class rosters / student counts', async () => {
    const s1 = await StudentService.createStudent({
      name: 'Nguyễn Văn An',
      vietnameseName: 'Nguyễn Văn An',
      englishName: 'An Nguyen',
      createdBy: 'test-user',
      guardians: [{ phone: '0901234567', isPrimary: true }],
    });

    const s2 = await StudentService.createStudent({
      name: 'Trần Thị Bình',
      vietnameseName: 'Trần Thị Bình',
      englishName: 'Binh Tran',
      createdBy: 'test-user',
      guardians: [{ phone: '0902222222', isPrimary: true }],
    });

    const e1 = await EnrollmentService.enrollStudent({
      studentId: s1!.id,
      classId,
      feePerSession: 150000,
      startDate: '2026-06-20',
      createdBy: 'test-user',
    });

    const e2 = await EnrollmentService.enrollStudent({
      studentId: s2!.id,
      classId,
      feePerSession: 150000,
      startDate: '2026-06-20',
      createdBy: 'test-user',
    });

    let cls = await ClassService.getClassById(classId);
    expect(cls?.studentCount).toBe(2);

    // Withdraw one student
    await EnrollmentService.withdrawStudent(e1.id, '2026-06-21', 'Nghỉ học', 'test-user');
    cls = await ClassService.getClassById(classId);
    expect(cls?.studentCount).toBe(1);
  });

  // 13. Không cho attendance trùng
  it('13. should prevent duplicate attendance recording for same session and student', async () => {
    const student = await StudentService.createStudent({
      name: 'Nguyễn Văn An',
      vietnameseName: 'Nguyễn Văn An',
      englishName: 'An Nguyen',
      createdBy: 'test-user',
      guardians: [{ phone: '0901234567', isPrimary: true }],
    });

    const enrollment = await EnrollmentService.enrollStudent({
      studentId: student!.id,
      classId,
      feePerSession: 150000,
      startDate: '2026-06-20',
      createdBy: 'test-user',
    });

    const session = await SessionService.getOrCreateSession({
      classId,
      date: '2026-06-20',
      teacherId,
      createdBy: 'test-user',
    });

    await AttendanceService.recordAttendance({
      sessionId: session.id,
      records: [{
        studentId: student!.id,
        enrollmentId: enrollment.id,
        status: 'present',
      }],
      createdBy: 'test-user',
    });

    await expect(
      AttendanceService.recordAttendance({
        sessionId: session.id,
        records: [{
          studentId: student!.id,
          enrollmentId: enrollment.id,
          status: 'present',
        }],
        createdBy: 'test-user',
      })
    ).rejects.toThrow();
  });

  // 14. Audit log ghi đủ
  it('14. should write audit logs for actions', async () => {
    const student = await StudentService.createStudent({
      name: 'Nguyễn Văn An',
      vietnameseName: 'Nguyễn Văn An',
      englishName: 'An Nguyen',
      createdBy: 'audit-test-operator',
      guardians: [{ phone: '0901234567', isPrimary: true }],
    });

    const logs = await AuditService.getLogs({ entity: 'Student', entityId: student!.id });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe('CREATE_STUDENT');
    expect(logs[0].user).toBe('audit-test-operator');
  });

  // 15. API lỗi trả JSON
  it('15. should handle errors and return JSON payloads in API routers', async () => {
    // We can simulate an express routing execution
    const mockReq: any = {
      body: {
        // Missing name and phone to trigger 400 bad request error
      },
      headers: {},
    };
    let responseStatus = 0;
    let responseJson: any = null;

    const mockRes: any = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(payload: any) {
        responseJson = payload;
        return this;
      },
    };

    // Find the POST '/' route handler for creating student
    const checkDuplicateRoute = studentsRouter.stack.find(
      layer => layer.route && layer.route.path === '/students/check-duplicate'
    );
    expect(checkDuplicateRoute).toBeDefined();

    // Call the handler
    await checkDuplicateRoute!.route.stack[0].handle(mockReq, mockRes, () => {});
    expect(responseStatus).toBe(400);
    expect(responseJson).toHaveProperty('error');
    expect(typeof responseJson.error).toBe('string');
  });

  // 16. Cập nhật học phí Prospective (Áp dụng từ bây giờ)
  it('16. should apply enrollment fee change prospectively', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

    // Create student
    const student = await StudentService.createStudent({
      name: 'Học Sinh Prospective',
      vietnameseName: 'Học Sinh Prospective',
      englishName: 'Prosp Student',
      createdBy: 'test-user',
      guardians: [{ phone: '0911111111', isPrimary: true }],
    });

    // Enroll in class with fee 100,000
    const enrollment = await EnrollmentService.enrollStudent({
      studentId: student!.id,
      classId,
      feePerSession: 100000,
      startDate: yesterdayStr,
      createdBy: 'test-user',
    });

    // Record a payment of 1,000,000
    await TuitionService.createTuitionTransaction({
      studentId: student!.id,
      enrollmentId: enrollment.id,
      amount: 1000000,
      paymentDate: yesterdayStr,
      paymentMethod: 'Tiền mặt',
      createdBy: 'test-user',
    });

    // Create sessions on different dates
    const sYesterday = await SessionService.getOrCreateSession({
      classId,
      date: yesterdayStr, // yesterday
      teacherId,
      createdBy: 'test-user',
    });
    const sToday = await SessionService.getOrCreateSession({
      classId,
      date: todayStr, // today
      teacherId,
      createdBy: 'test-user',
    });
    const sTomorrow = await SessionService.getOrCreateSession({
      classId,
      date: tomorrowStr, // tomorrow
      teacherId,
      createdBy: 'test-user',
    });

    // Record attendance present for all three
    await AttendanceService.recordAttendance({
      sessionId: sYesterday.id,
      records: [{ studentId: student!.id, enrollmentId: enrollment.id, status: 'present' }],
      createdBy: 'test-user',
    });
    await AttendanceService.recordAttendance({
      sessionId: sToday.id,
      records: [{ studentId: student!.id, enrollmentId: enrollment.id, status: 'present' }],
      createdBy: 'test-user',
    });
    await AttendanceService.recordAttendance({
      sessionId: sTomorrow.id,
      records: [{ studentId: student!.id, enrollmentId: enrollment.id, status: 'present' }],
      createdBy: 'test-user',
    });

    // Verify initial state
    const ledgerBefore = await prisma.tuitionLedgerEntry.findUnique({
      where: { enrollmentId: enrollment.id },
    });
    expect(ledgerBefore?.totalSpent).toBe(300000); // 3 * 100,000
    expect(ledgerBefore?.balance).toBe(700000);
    expect(ledgerBefore?.sessionsRemaining).toBe(7);

    // Call PUT /enrollments/:id/fee route handler for prospective change
    const updateFeeRoute = enrollmentsRouter.stack.find(
      (layer: any) => layer.route && layer.route.path === '/enrollments/:id/fee' && layer.route.methods?.put
    );
    expect(updateFeeRoute).toBeDefined();

    const mockReq: any = {
      params: { id: enrollment.id },
      body: { feePerSession: 150000, feeChangeMode: 'prospective' },
      user: { name: 'Người test' }
    };
    let responseStatus = 200;
    let responseJson: any = null;
    const mockRes: any = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(payload: any) {
        responseJson = payload;
        return this;
      }
    };

    await updateFeeRoute!.route.stack[updateFeeRoute!.route.stack.length - 1].handle(mockReq, mockRes, () => {});
    expect(responseStatus).toBe(200);

    // Assert:
    // 1. Enrollment feePerSession updated to 150,000
    const updatedEnroll = await prisma.enrollment.findUnique({ where: { id: enrollment.id } });
    expect(updatedEnroll?.feePerSession).toBe(150000);
    const history = JSON.parse(updatedEnroll?.feeHistory || '[]');
    expect(history.length).toBe(1);
    expect(history[0].oldFee).toBe(100000);
    expect(history[0].newFee).toBe(150000);
    expect(history[0].mode).toBe('prospective');

    // 2. Attendance feeApplied:
    // Yesterday must keep 100,000
    const attYesterday = await prisma.attendanceRecord.findFirst({
      where: { enrollmentId: enrollment.id, date: yesterdayStr }
    });
    expect(attYesterday?.feeApplied).toBe(100000);

    // Today must be updated to 150,000
    const attToday = await prisma.attendanceRecord.findFirst({
      where: { enrollmentId: enrollment.id, date: todayStr }
    });
    expect(attToday?.feeApplied).toBe(150000);

    // Tomorrow must be updated to 150,000
    const attTomorrow = await prisma.attendanceRecord.findFirst({
      where: { enrollmentId: enrollment.id, date: tomorrowStr }
    });
    expect(attTomorrow?.feeApplied).toBe(150000);

    // 3. Ledger:
    // totalSpent = 100,000 + 150,000 + 150,000 = 400,000
    // balance = 1,000,000 - 400,000 = 600,000
    // sessionsRemaining = 600,000 / 150,000 = 4
    const ledgerAfter = await prisma.tuitionLedgerEntry.findUnique({
      where: { enrollmentId: enrollment.id },
    });
    expect(ledgerAfter?.totalSpent).toBe(400000);
    expect(ledgerAfter?.balance).toBe(600000);
    expect(ledgerAfter?.sessionsRemaining).toBe(4);
  });

  // 17. Cập nhật học phí Retroactive (Áp dụng toàn bộ)
  it('17. should apply enrollment fee change retroactively', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

    // Create student
    const student = await StudentService.createStudent({
      name: 'Học Sinh Retroactive',
      vietnameseName: 'Học Sinh Retroactive',
      englishName: 'Retro Student',
      createdBy: 'test-user',
      guardians: [{ phone: '0922222222', isPrimary: true }],
    });

    // Enroll in class with fee 100,000
    const enrollment = await EnrollmentService.enrollStudent({
      studentId: student!.id,
      classId,
      feePerSession: 100000,
      startDate: yesterdayStr,
      createdBy: 'test-user',
    });

    // Record a payment of 1,000,000
    await TuitionService.createTuitionTransaction({
      studentId: student!.id,
      enrollmentId: enrollment.id,
      amount: 1000000,
      paymentDate: yesterdayStr,
      paymentMethod: 'Tiền mặt',
      createdBy: 'test-user',
    });

    // Create sessions on different dates
    const sYesterday = await SessionService.getOrCreateSession({
      classId,
      date: yesterdayStr, // yesterday
      teacherId,
      createdBy: 'test-user',
    });
    const sToday = await SessionService.getOrCreateSession({
      classId,
      date: todayStr, // today
      teacherId,
      createdBy: 'test-user',
    });

    // Record attendance present
    await AttendanceService.recordAttendance({
      sessionId: sYesterday.id,
      records: [{ studentId: student!.id, enrollmentId: enrollment.id, status: 'present' }],
      createdBy: 'test-user',
    });
    await AttendanceService.recordAttendance({
      sessionId: sToday.id,
      records: [{ studentId: student!.id, enrollmentId: enrollment.id, status: 'present' }],
      createdBy: 'test-user',
    });

    // Call PUT /enrollments/:id/fee route handler for retroactive change
    const updateFeeRoute = enrollmentsRouter.stack.find(
      (layer: any) => layer.route && layer.route.path === '/enrollments/:id/fee' && layer.route.methods?.put
    );
    expect(updateFeeRoute).toBeDefined();

    const mockReq: any = {
      params: { id: enrollment.id },
      body: { feePerSession: 150000, feeChangeMode: 'retroactive' },
      user: { name: 'Người test' }
    };
    let responseStatus = 200;
    let responseJson: any = null;
    const mockRes: any = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(payload: any) {
        responseJson = payload;
        return this;
      }
    };

    await updateFeeRoute!.route.stack[updateFeeRoute!.route.stack.length - 1].handle(mockReq, mockRes, () => {});
    expect(responseStatus).toBe(200);

    // Assert:
    // 1. Enrollment feePerSession updated to 150,000
    const updatedEnroll = await prisma.enrollment.findUnique({ where: { id: enrollment.id } });
    expect(updatedEnroll?.feePerSession).toBe(150000);

    // 2. Attendance feeApplied:
    // Yesterday must be updated to 150,000
    const attYesterday = await prisma.attendanceRecord.findFirst({
      where: { enrollmentId: enrollment.id, date: yesterdayStr }
    });
    expect(attYesterday?.feeApplied).toBe(150000);

    // Today must be updated to 150,000
    const attToday = await prisma.attendanceRecord.findFirst({
      where: { enrollmentId: enrollment.id, date: todayStr }
    });
    expect(attToday?.feeApplied).toBe(150000);

    // 3. Ledger:
    // totalSpent = 150,000 + 150,000 = 300,000
    // balance = 1,000,000 - 300,000 = 700,000
    // sessionsRemaining = 700,000 / 150,000 = 4
    const ledgerAfter = await prisma.tuitionLedgerEntry.findUnique({
      where: { enrollmentId: enrollment.id },
    });
    expect(ledgerAfter?.totalSpent).toBe(300000);
    expect(ledgerAfter?.balance).toBe(700000);
    expect(ledgerAfter?.sessionsRemaining).toBe(4);
  });
});
