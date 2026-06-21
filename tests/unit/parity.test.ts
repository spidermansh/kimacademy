import { describe, it, expect } from 'vitest';
import { computeAlerts } from '../../src/shared/business/alerts';
import { computeDayOverview } from '../../src/shared/business/dashboard';

describe('Kim Academy v2 - Parity Recovery Services Test Suite', () => {
  it('should compute warnings correctly in computeAlerts', () => {
    // 1. Setup mock states
    const mockStudents = [
      { id: 'std-1', name: 'Nguyễn Văn An', status: 'active', parentPhone: '0901234567' },
      { id: 'std-2', name: 'Trần Thị Bình', status: 'active', parentPhone: '0907654321' }
    ];

    const mockClasses = [
      { id: 'cls-1', name: 'Lớp Tiếng Anh Starter', teacherId: 'stf-1', status: 'active', type: 'offline', scheduleDays: '["Thứ 2", "Thứ 4", "Thứ 7"]' }
    ];

    const mockEnrollments = [
      { id: 'enr-1', studentId: 'std-1', classId: 'cls-1', feePerSession: 150000, isActive: true, balance: -300000, sessionsRemaining: -2 }
    ];

    // Ledger shows negative remaining sessions and balance (critical warning)
    const mockLedgers = [
      { id: 'ldg-1', studentId: 'std-1', enrollmentId: 'enr-1', totalPaid: 1500000, totalSpent: 1800000, balance: -300000, sessionsRemaining: -2 }
    ];

    const todayStr = new Date().toISOString().slice(0, 10);

    const mockAttendance = [
      { id: 'att-1', studentId: 'std-1', classId: 'cls-1', enrollmentId: 'enr-1', date: todayStr, status: 'present', sessionsDeducted: 1, feeApplied: 150000 }
    ];

    const mockTransactions = [
      { id: 'tx-1', studentId: 'std-1', amount: 1500000, paymentDate: todayStr, isReconciled: false }
    ];

    const mockLeads = [
      { id: 'led-1', studentName: 'Vũ Quốc Minh', parentPhone: '0903334455', status: 'test_scheduled', testScheduleDate: todayStr }
    ];

    const alerts = computeAlerts({
      students: mockStudents,
      classes: mockClasses,
      enrollments: mockEnrollments,
      sessions: [],
      attendance: mockAttendance,
      transactions: mockTransactions,
      revenueOthers: [],
      ledgers: mockLedgers,
      leads: mockLeads,
      systemParameters: []
    });

    // Verify negative tuition alert
    const negAlert = alerts.find(a => a.id.startsWith('std-neg-'));
    expect(negAlert).toBeDefined();
    expect(negAlert?.level).toBe('critical');
    expect(negAlert?.message).toContain('học phí âm hoặc nợ phí');

    // Verify unreconciled transaction alert
    const txAlert = alerts.find(a => a.id.startsWith('tx-unreconciled-'));
    expect(txAlert).toBeDefined();
    expect(txAlert?.level).toBe('medium');

    // Verify lead test today alert
    const leadAlert = alerts.find(a => a.id.startsWith('lead_test_today_'));
    expect(leadAlert).toBeDefined();
    expect(leadAlert?.level).toBe('high');
  });

  it('should compute correct daily stats in computeDayOverview', () => {
    const todayStr = '2026-06-20';
    const mockClasses = [
      { id: 'cls-1', name: 'Lớp Tiếng Anh Starter', teacherId: 'stf-1', status: 'active', type: 'offline', scheduleDays: '["Thứ 2", "Thứ 7"]' } // 2026-06-20 is Saturday (Thứ 7)
    ];

    const mockAttendance = [
      { id: 'att-1', studentId: 'std-1', classId: 'cls-1', enrollmentId: 'enr-1', date: todayStr, status: 'present', sessionsDeducted: 1, feeApplied: 150000 },
      { id: 'att-2', studentId: 'std-2', classId: 'cls-1', enrollmentId: 'enr-2', date: todayStr, status: 'absent', sessionsDeducted: 1, feeApplied: 150000 }
    ];

    const mockTransactions = [
      { id: 'tx-1', studentId: 'std-1', amount: 1500000, paymentDate: todayStr }
    ];

    const mockRevenueOthers = [
      { id: 'rev-1', category: 'Sách', amount: 120000, paymentDate: todayStr }
    ];

    const mockExpenses = [
      { id: 'exp-1', date: todayStr, amount: 200000 }
    ];

    const stats = computeDayOverview({
      targetDateStr: todayStr,
      classes: mockClasses,
      enrollments: [],
      sessions: [],
      attendance: mockAttendance,
      transactions: mockTransactions,
      revenueOthers: mockRevenueOthers,
      expenses: mockExpenses
    });

    expect(stats.totalIncome).toBe(1500000 + 120000);
    expect(stats.totalExpense).toBe(200000);
    expect(stats.netCashFlow).toBe(1620000 - 200000);
    
    // Earned tuition = 150,000 * 1 (present) + 150,000 * 1 (absent) = 300,000
    expect(stats.earnedTuitionToday).toBe(300000);
    expect(stats.otherRevenueToday).toBe(120000);
    expect(stats.totalEarned).toBe(420000);
  });
});
