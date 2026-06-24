import { describe, it, expect } from 'vitest';
import { toDateStr, parseDate, monthRange, dayRange } from '../../src/api/utils/dates';
import {
  createUserSchema,
  createInventoryMovementSchema,
  dailyCloseSchema,
  createStaffSchema,
  createSalaryAdvanceSchema,
} from '../../src/api/schemas';

describe('Phase 2 - date helpers (UTC, no off-by-one)', () => {
  it('toDateStr giữ đúng ngày UTC', () => {
    expect(toDateStr(new Date('2026-06-15T00:00:00.000Z'))).toBe('2026-06-15');
    expect(toDateStr('2026-06-15')).toBe('2026-06-15');
    expect(toDateStr(null)).toBeNull();
  });

  it('parseDate ép YYYY-MM-DD về UTC midnight', () => {
    const d = parseDate('2026-06-15');
    expect(d?.toISOString()).toBe('2026-06-15T00:00:00.000Z');
    expect(parseDate('')).toBeNull();
  });

  it('monthRange bao đúng [đầu tháng, đầu tháng sau)', () => {
    const r = monthRange('2026-06');
    expect(r.gte.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(r.lt.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });

  it('dayRange bao đúng một ngày', () => {
    const r = dayRange('2026-06-15');
    expect(r.gte.toISOString()).toBe('2026-06-15T00:00:00.000Z');
    expect(r.lt.toISOString()).toBe('2026-06-16T00:00:00.000Z');
  });
});

describe('Phase 2 - validation schemas', () => {
  it('createUserSchema yêu cầu đủ trường', () => {
    expect(createUserSchema.safeParse({ username: 'a', password: 'b', name: 'c', role: 'admin' }).success).toBe(true);
    expect(createUserSchema.safeParse({ username: 'a', password: 'b' }).success).toBe(false);
  });

  it('createInventoryMovementSchema từ chối số lượng 0, ép kiểu', () => {
    const ok = createInventoryMovementSchema.safeParse({ movementType: 'purchase_in', itemId: 'i1', quantity: '5', movementDate: '2026-06-01' });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.quantity).toBe(5);
    expect(createInventoryMovementSchema.safeParse({ movementType: 'purchase_in', itemId: 'i1', quantity: 0, movementDate: '2026-06-01' }).success).toBe(false);
  });

  it('dailyCloseSchema chấp nhận summary object hoặc string', () => {
    expect(dailyCloseSchema.safeParse({ date: '2026-06-01', summary: { cash: 1 } }).success).toBe(true);
    expect(dailyCloseSchema.safeParse({ date: '2026-06-01', summary: '{"cash":1}' }).success).toBe(true);
    expect(dailyCloseSchema.safeParse({ date: 'bad-date', summary: {} }).success).toBe(false);
  });

  it('createStaffSchema và salary-advance chặn thiếu trường / số tiền không dương', () => {
    expect(createStaffSchema.safeParse({ name: 'GV', role: 'teacher' }).success).toBe(true);
    expect(createStaffSchema.safeParse({ name: 'GV' }).success).toBe(false);
    expect(createSalaryAdvanceSchema.safeParse({ staffId: 's1', amount: -1, date: '2026-06-01' }).success).toBe(false);
  });
});
