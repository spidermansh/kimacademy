import type { Prisma, PrismaClient } from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

export interface ExpectedLedger {
  totalPaid: number;
  totalSpent: number;
  balance: number;
  sessionsRemaining: number;
}

/**
 * Tính lại giá trị sổ cái của một enrollment TỪ DỮ LIỆU GỐC (giao dịch + điểm
 * danh), không ghi DB. Đây là nguồn sự thật duy nhất cho mọi phép tính sổ cái —
 * dùng chung cho finance/attendance/enrollments và cho việc đối soát.
 *
 * - totalPaid  = tổng TuitionTransaction.amount theo enrollment (gồm cả khoản
 *                chuyển số dư âm/dương).
 * - totalSpent = tổng feeApplied * sessionsDeducted của các bản ghi điểm danh.
 */
export async function computeExpectedLedger(
  db: DbClient,
  enrollmentId: string
): Promise<ExpectedLedger | null> {
  const enroll = await db.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!enroll) return null;

  const [txAgg, attendance] = await Promise.all([
    db.tuitionTransaction.aggregate({
      where: { enrollmentId },
      _sum: { amount: true },
    }),
    db.attendanceRecord.findMany({
      where: { enrollmentId },
      select: { feeApplied: true, sessionsDeducted: true },
    }),
  ]);

  const totalPaid = txAgg._sum.amount || 0;
  const totalSpent = attendance.reduce(
    (sum, a) => sum + a.feeApplied * a.sessionsDeducted,
    0
  );
  const balance = totalPaid - totalSpent;
  const fee = enroll.feePerSession;
  const sessionsRemaining = fee > 0 ? Math.floor(balance / fee) : 0;

  return { totalPaid, totalSpent, balance, sessionsRemaining };
}

/**
 * Tính lại và GHI sổ cái của một enrollment từ dữ liệu gốc. Idempotent — gọi bao
 * nhiêu lần cũng ra cùng kết quả. Trả về bản ghi đã cập nhật, hoặc null nếu
 * enrollment/ledger không tồn tại.
 */
export async function recalcEnrollmentLedger(
  tx: DbClient,
  enrollmentId: string
) {
  const expected = await computeExpectedLedger(tx, enrollmentId);
  if (!expected) return null;

  const ledger = await tx.tuitionLedgerEntry.findUnique({ where: { enrollmentId } });
  if (!ledger) return null;

  return tx.tuitionLedgerEntry.update({
    where: { enrollmentId },
    data: { ...expected, lastUpdatedAt: new Date() },
  });
}

/** Ngưỡng lệch tiền (đồng) coi là đáng kể khi đối soát — bỏ qua nhiễu số thực. */
export const LEDGER_DRIFT_THRESHOLD = 1;

export interface LedgerDrift {
  enrollmentId: string;
  studentId: string;
  stored: ExpectedLedger;
  expected: ExpectedLedger;
}

/**
 * Quét toàn bộ sổ cái, so sánh giá trị đã lưu với giá trị tính lại từ gốc.
 * Chỉ đọc — không sửa. Trả về danh sách các enrollment bị lệch.
 */
export async function findLedgerDrift(db: DbClient): Promise<LedgerDrift[]> {
  const ledgers = await db.tuitionLedgerEntry.findMany();
  const drifts: LedgerDrift[] = [];

  for (const ledger of ledgers) {
    const expected = await computeExpectedLedger(db, ledger.enrollmentId);
    if (!expected) continue;

    const off =
      Math.abs(expected.totalPaid - ledger.totalPaid) > LEDGER_DRIFT_THRESHOLD ||
      Math.abs(expected.totalSpent - ledger.totalSpent) > LEDGER_DRIFT_THRESHOLD ||
      Math.abs(expected.balance - ledger.balance) > LEDGER_DRIFT_THRESHOLD ||
      expected.sessionsRemaining !== ledger.sessionsRemaining;

    if (off) {
      drifts.push({
        enrollmentId: ledger.enrollmentId,
        studentId: ledger.studentId,
        stored: {
          totalPaid: ledger.totalPaid,
          totalSpent: ledger.totalSpent,
          balance: ledger.balance,
          sessionsRemaining: ledger.sessionsRemaining,
        },
        expected,
      });
    }
  }

  return drifts;
}
