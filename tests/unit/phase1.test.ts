import { describe, it, expect } from 'vitest';
import {
  isInternalTransfer,
  isTuitionRevenue,
  PAYMENT_METHOD_BALANCE_TRANSFER,
  REVENUE_CATEGORY_TUITION_OFFLINE,
} from '../../src/shared/constants';
import {
  createTransactionSchema,
  createExpenseSchema,
  createEnrollmentSchema,
} from '../../src/api/schemas';

describe('Phase 1 - shared constants', () => {
  it('nhận diện giao dịch chuyển số dư nội bộ', () => {
    expect(isInternalTransfer(PAYMENT_METHOD_BALANCE_TRANSFER)).toBe(true);
    expect(isInternalTransfer('Tiền mặt')).toBe(false);
    expect(isInternalTransfer(undefined)).toBe(false);
  });

  it('nhận diện học phí offline', () => {
    expect(isTuitionRevenue(REVENUE_CATEGORY_TUITION_OFFLINE)).toBe(true);
    expect(isTuitionRevenue('Sách')).toBe(false);
  });

  it('loại chuyển số dư khỏi tổng thu', () => {
    const txs = [
      { amount: 1_000_000, paymentMethod: 'Tiền mặt' },
      { amount: 500_000, paymentMethod: PAYMENT_METHOD_BALANCE_TRANSFER },
      { amount: -500_000, paymentMethod: PAYMENT_METHOD_BALANCE_TRANSFER },
    ];
    const total = txs
      .filter((t) => !isInternalTransfer(t.paymentMethod))
      .reduce((s, t) => s + t.amount, 0);
    expect(total).toBe(1_000_000);
  });
});

describe('Phase 1 - input validation schemas', () => {
  it('chấp nhận giao dịch hợp lệ và ép kiểu amount', () => {
    const r = createTransactionSchema.safeParse({
      amount: '150000',
      paymentDate: '2026-06-21',
      paymentMethod: 'Tiền mặt',
      revenueCategory: REVENUE_CATEGORY_TUITION_OFFLINE,
      studentId: 'std-1',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.amount).toBe(150000);
  });

  it('từ chối giao dịch thiếu/sai số tiền hoặc sai định dạng ngày', () => {
    expect(createTransactionSchema.safeParse({ paymentDate: '2026-06-21', paymentMethod: 'Tiền mặt' }).success).toBe(false);
    expect(createTransactionSchema.safeParse({ amount: 0, paymentDate: '2026-06-21', paymentMethod: 'Tiền mặt' }).success).toBe(false);
    expect(createTransactionSchema.safeParse({ amount: 1000, paymentDate: '21/06/2026', paymentMethod: 'Tiền mặt' }).success).toBe(false);
  });

  it('từ chối chi phí thiếu mô tả', () => {
    expect(createExpenseSchema.safeParse({ amount: 1000, date: '2026-06-21', paymentMethod: 'Tiền mặt' }).success).toBe(false);
  });

  it('cho phép đăng ký lớp với học phí = 0 (suất học bổng)', () => {
    const r = createEnrollmentSchema.safeParse({ studentId: 's1', classId: 'c1', feePerSession: 0 });
    expect(r.success).toBe(true);
  });

  it('từ chối đăng ký lớp thiếu lớp học', () => {
    expect(createEnrollmentSchema.safeParse({ studentId: 's1', feePerSession: 100000 }).success).toBe(false);
  });
});
