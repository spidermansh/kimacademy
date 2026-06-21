import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../../src/infrastructure/db/prisma.client';
import {
  computeExpectedLedger,
  recalcEnrollmentLedger,
  findLedgerDrift,
} from '../../src/api/services/ledger';

async function cleanDatabase() {
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);
  for (const table of [
    'AttendanceRecord', 'TuitionLedgerEntry', 'TuitionTransaction', 'Enrollment',
    'Session', 'Class', 'Student', 'StaffMember', 'AuditLog',
  ]) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
}

describe('Ledger reconciliation service', () => {
  let enrollmentId: string;
  let studentId: string;

  beforeAll(async () => {
    await cleanDatabase();

    const teacher = await prisma.staffMember.create({
      data: { code: 'TCH-L1', name: 'GV Ledger', role: 'teacher', startDate: '2026-01-01' },
    });
    const cls = await prisma.class.create({
      data: { code: 'CLS-L1', name: 'Lớp Ledger', teacherId: teacher.id, defaultFeePerSession: 100000 },
    });
    const student = await prisma.student.create({
      data: { name: 'HV Ledger', vietnameseName: 'HV Ledger', englishName: 'Ledger', createdBy: 'test' },
    });
    studentId = student.id;
    const enrollment = await prisma.enrollment.create({
      data: { studentId: student.id, classId: cls.id, feePerSession: 100000, startDate: '2026-01-01', createdBy: 'test' },
    });
    enrollmentId = enrollment.id;
    const session = await prisma.session.create({
      data: { classId: cls.id, date: '2026-06-01', teacherId: teacher.id, createdBy: 'test' },
    });

    // Đã thu: 500.000 + 300.000 = 800.000
    await prisma.tuitionTransaction.createMany({
      data: [
        { studentId: student.id, enrollmentId: enrollment.id, amount: 500000, paymentDate: '2026-06-01', paymentMethod: 'Tiền mặt', createdBy: 'test' },
        { studentId: student.id, enrollmentId: enrollment.id, amount: 300000, paymentDate: '2026-06-02', paymentMethod: 'Tiền mặt', createdBy: 'test' },
      ],
    });
    // Đã học: 3 buổi present (trừ phí) + 1 excused (không trừ) = 300.000
    await prisma.attendanceRecord.createMany({
      data: [1, 2, 3].map((i) => ({
        sessionId: session.id, studentId: student.id, classId: cls.id, enrollmentId: enrollment.id,
        date: `2026-06-0${i}`, status: 'present', sessionsDeducted: 1, feeApplied: 100000, createdBy: 'test',
      })).concat([{
        sessionId: session.id, studentId: student.id, classId: cls.id, enrollmentId: enrollment.id,
        date: '2026-06-04', status: 'excused', sessionsDeducted: 0, feeApplied: 0, createdBy: 'test',
      }]),
    });
  });

  it('computeExpectedLedger tính đúng từ dữ liệu gốc', async () => {
    const expected = await computeExpectedLedger(prisma, enrollmentId);
    expect(expected).not.toBeNull();
    expect(expected!.totalPaid).toBe(800000);
    expect(expected!.totalSpent).toBe(300000);
    expect(expected!.balance).toBe(500000);
    expect(expected!.sessionsRemaining).toBe(5); // floor(500000 / 100000)
  });

  it('findLedgerDrift phát hiện sổ cái lệch, recalc sửa được', async () => {
    // Tạo sổ cái với giá trị SAI (totalPaid = 0).
    await prisma.tuitionLedgerEntry.create({
      data: { studentId, enrollmentId, totalPaid: 0, totalSpent: 0, balance: 0, sessionsRemaining: 0 },
    });

    const driftsBefore = await findLedgerDrift(prisma);
    expect(driftsBefore.some((d) => d.enrollmentId === enrollmentId)).toBe(true);

    await recalcEnrollmentLedger(prisma, enrollmentId);

    const fixed = await prisma.tuitionLedgerEntry.findUnique({ where: { enrollmentId } });
    expect(fixed!.totalPaid).toBe(800000);
    expect(fixed!.balance).toBe(500000);
    expect(fixed!.sessionsRemaining).toBe(5);

    const driftsAfter = await findLedgerDrift(prisma);
    expect(driftsAfter.some((d) => d.enrollmentId === enrollmentId)).toBe(false);
  });

  it('recalcEnrollmentLedger idempotent (gọi nhiều lần ra cùng kết quả)', async () => {
    const a = await recalcEnrollmentLedger(prisma, enrollmentId);
    const b = await recalcEnrollmentLedger(prisma, enrollmentId);
    expect(a!.totalPaid).toBe(b!.totalPaid);
    expect(a!.totalSpent).toBe(b!.totalSpent);
    expect(a!.balance).toBe(b!.balance);
    expect(a!.sessionsRemaining).toBe(b!.sessionsRemaining);
  });
});
