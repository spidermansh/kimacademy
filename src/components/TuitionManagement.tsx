import React, { useState, useEffect, useMemo } from 'react';
import { api, formatCurrency } from '../utils';
import { TuitionSummary, FeeChangeLog } from '../types';
import { useToast } from './Toast';
import {
  AlertTriangle, CheckCircle2, Wallet, Pencil, X, Save,
  ChevronDown, ChevronUp, History, TrendingUp, CalendarClock,
  BarChart3, Clock, ArrowRight, RefreshCw, ArrowDown
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const WEEKDAY_MAP: Record<string, number> = {
  'Thứ hai': 1, 'Thứ ba': 2, 'Thứ tư': 3, 'Thứ năm': 4,
  'Thứ sáu': 5, 'Thứ bảy': 6, 'Chủ nhật': 0,
  'Thứ 2': 1, 'Thứ 3': 2, 'Thứ 4': 3, 'Thứ 5': 4,
  'Thứ 6': 5, 'Thứ 7': 6, 'Chủ Nhật': 0,
  'T2': 1, 'T3': 2, 'T4': 3, 'T5': 4, 'T6': 5, 'T7': 6, 'CN': 0,
  'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 0,
};

/**
 * Parse class schedule days from schedule string or scheduleDays array.
 * Returns JS day-of-week numbers (0=Sun, 1=Mon,...,6=Sat).
 */
function parseScheduleDays(cls: any): number[] {
  if (!cls) return [];

  // If scheduleDays is already an array
  if (Array.isArray(cls.scheduleDays) && cls.scheduleDays.length > 0) {
    return cls.scheduleDays
      .map((d: string) => WEEKDAY_MAP[d.trim()])
      .filter((n: number | undefined) => n !== undefined);
  }

  // Try to parse from schedule string like "Thứ 2, 4, 6 — 18:00"
  const schedule = cls.schedule || '';
  if (!schedule) return [];

  const dayMatches: number[] = [];
  // Match "Thứ X" patterns
  const thuPattern = /Thứ\s*(\d)/g;
  let match;
  while ((match = thuPattern.exec(schedule)) !== null) {
    const num = parseInt(match[1], 10);
    if (num >= 2 && num <= 7) dayMatches.push(num === 7 ? 0 : num - 1); // Convert to JS day
  }

  // Also check for full weekday names
  for (const [key, val] of Object.entries(WEEKDAY_MAP)) {
    if (schedule.includes(key) && !dayMatches.includes(val)) {
      dayMatches.push(val);
    }
  }

  return dayMatches;
}

/**
 * Predict the date when sessions will run out based on class schedule.
 * Returns null if can't predict.
 */
function predictEndDate(sessionsRemaining: number, scheduleDays: number[]): Date | null {
  if (sessionsRemaining <= 0 || scheduleDays.length === 0) return null;

  let remaining = sessionsRemaining;
  const today = new Date();
  const date = new Date(today);
  date.setHours(0, 0, 0, 0);

  // Max 365 days look-ahead
  for (let i = 0; i < 365 && remaining > 0; i++) {
    date.setDate(date.getDate() + 1);
    if (scheduleDays.includes(date.getDay())) {
      remaining--;
    }
  }

  return remaining === 0 ? date : null;
}

/**
 * Compute the fee applicable for an attendance date, considering prospective fee history.
 * If mode is 'retroactive', all changes use the latest fee. With 'prospective' changes,
 * the fee depends on when the attendance occurred relative to change dates.
 */
function getFeeAtDate(attendanceDate: string, currentFee: number, feeHistory: FeeChangeLog[]): number {
  if (!feeHistory || feeHistory.length === 0) return currentFee;

  // Sort history by date
  const sorted = [...feeHistory].sort((a, b) => a.changedAt.localeCompare(b.changedAt));

  // Find the last retroactive entry — this resets the timeline
  let lastRetroIdx = -1;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].mode === 'retroactive' || !sorted[i].mode) {
      lastRetroIdx = i;
      break;
    }
  }

  // Only consider prospective entries AFTER the last retroactive change
  const prospective = sorted.slice(lastRetroIdx + 1).filter(h => h.mode === 'prospective');
  if (prospective.length === 0) return currentFee;

  // The base fee (before any prospective change) is the oldFee of the first prospective entry
  const baseFee = prospective[0].oldFee;
  const attDate = attendanceDate;

  // Walk through prospective changes to find the applicable fee
  let fee = baseFee;
  for (const entry of prospective) {
    const changeDate = entry.changedAt.slice(0, 10); // YYYY-MM-DD
    if (attDate >= changeDate) {
      fee = entry.newFee;
    }
  }
  return fee;
}

/**
 * Compute tuition cost considering fee history (prospective changes).
 * Returns total cost used with per-period fee calculation.
 */
function computeTuitionCost(
  attendance: any[],
  studentId: string,
  currentFee: number,
  feeHistory: FeeChangeLog[]
): number {
  const sorted = [...(feeHistory || [])].sort((a, b) => a.changedAt.localeCompare(b.changedAt));
  // Find last retroactive entry
  let lastRetroIdx = -1;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].mode === 'retroactive' || !sorted[i].mode) {
      lastRetroIdx = i;
      break;
    }
  }
  const prospective = sorted.slice(lastRetroIdx + 1).filter(h => h.mode === 'prospective');
  const hasProspective = prospective.length > 0;

  if (!hasProspective) {
    // Simple: all sessions use current fee
    const sessionsUsed = attendance.filter(a => a.studentId === studentId && a.status !== 'excused').length;
    return sessionsUsed * currentFee;
  }

  // Compute per-attendance cost using fee periods
  let totalCost = 0;
  attendance
    .filter(a => a.studentId === studentId && a.status !== 'excused')
    .forEach(a => {
      totalCost += getFeeAtDate(a.date, currentFee, feeHistory);
    });
  return totalCost;
}

/**
 * Build a timeline of balance events (deposits + deductions) for a student.
 */
function buildBalanceTimeline(
  studentName: string,
  feePerSession: number,
  txs: any[],
  attendance: any[],
  studentId: string,
  feeHistory?: FeeChangeLog[]
): { date: string; balance: number; event: string; amount: number }[] {
  const events: { dateObj: Date; date: string; amount: number; event: string }[] = [];

  // Add payment events (deposits)
  txs.forEach(t => {
    events.push({
      dateObj: new Date(t.paymentDate || t.createdAt),
      date: t.paymentDate,
      amount: Number(t.amount) || 0,
      event: `Nạp ${(Number(t.amount) || 0).toLocaleString('vi-VN')}đ`,
    });
  });

  // Add attendance deductions — use per-period fee if history available
  if (feePerSession > 0) {
    attendance
      .filter(a => a.studentId === studentId && a.status !== 'excused')
      .forEach(a => {
        const fee = feeHistory && feeHistory.length > 0
          ? getFeeAtDate(a.date, feePerSession, feeHistory)
          : feePerSession;
        events.push({
          dateObj: new Date(a.date),
          date: a.date,
          amount: -fee,
          event: `Trừ buổi (${a.status === 'present' ? 'Có mặt' : 'Vắng'})`,
        });
      });
  }

  // Sort chronologically
  events.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  // Build running balance
  let balance = 0;
  return events.map(e => {
    balance += e.amount;
    return {
      date: e.date,
      balance,
      event: e.event,
      amount: e.amount,
    };
  });
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function TuitionManagement({ students, transactions, classes }: { students: any[]; transactions: any[]; classes?: any[] }) {
  const toast = useToast();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editFee, setEditFee] = useState('');
  const [feeChangeMode, setFeeChangeMode] = useState<'retroactive' | 'prospective'>('retroactive');
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localStudents, setLocalStudents] = useState<any[]>(students);
  const [expandedTab, setExpandedTab] = useState<'history' | 'chart' | 'feeLog'>('history');

  useEffect(() => {
    setLocalStudents(students);
  }, [students]);

  useEffect(() => {
    api.getAttendance()
      .then(setAttendance)
      .finally(() => setLoading(false));
  }, []);

  // Build a map of class name → schedule days
  const classScheduleMap = useMemo(() => {
    const map: Record<string, number[]> = {};
    (classes || []).forEach(cls => {
      if (cls.name) {
        map[cls.name] = parseScheduleDays(cls);
      }
    });
    return map;
  }, [classes]);

  // Compute TuitionSummary for each student — supports prospective fee history
  const summaries: (TuitionSummary & { predictedEnd: Date | null; scheduleDays: number[] })[] = localStudents.map(student => {
    const totalPaidOffline = transactions
      .filter(t =>
        t.studentName?.toLowerCase() === student.name?.toLowerCase() &&
        t.revenueCategory === 'Học phí offline'
      )
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const feePerSession = Number(student.feePerSession) || 0;
    const feeHistory: FeeChangeLog[] = student.feeHistory || [];

    const totalSessionsUsed = attendance.filter(a =>
      a.studentId === student.id && a.status !== 'excused'
    ).length;

    // Use history-aware cost calculation
    const totalCostUsed = computeTuitionCost(attendance, student.id, feePerSession, feeHistory);
    const moneyRemaining = totalPaidOffline - totalCostUsed;
    // Sessions remaining based on CURRENT fee
    const sessionsRemaining = feePerSession > 0 ? Math.floor(moneyRemaining / feePerSession) : 0;
    const totalSessionsBought = sessionsRemaining + totalSessionsUsed;

    const scheduleDays = classScheduleMap[student.className] || [];
    const predictedEnd = predictEndDate(sessionsRemaining, scheduleDays);

    return {
      studentId: student.id,
      studentName: student.name,
      className: student.className || '',
      feePerSession,
      totalPaidOffline,
      totalCostUsed,
      moneyRemaining,
      totalSessionsBought,
      totalSessionsUsed,
      sessionsRemaining,
      predictedEnd,
      scheduleDays,
    };
  }).filter(s => s.totalPaidOffline > 0 || s.feePerSession > 0);

  // Sort: warning first
  const sorted = [...summaries].sort((a, b) => a.sessionsRemaining - b.sessionsRemaining);

  const getStatusBadge = (remaining: number, feePerSession: number) => {
    if (feePerSession === 0) return { color: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Chưa cài học phí', icon: null };
    if (remaining <= 0) return { color: 'bg-red-100 text-red-700 border-red-300', label: 'Hết buổi!', icon: <AlertTriangle className="w-3.5 h-3.5" /> };
    if (remaining <= 3) return { color: 'bg-amber-100 text-amber-700 border-amber-300', label: `Còn ${remaining} buổi`, icon: <AlertTriangle className="w-3.5 h-3.5" /> };
    return { color: 'bg-emerald-100 text-emerald-700 border-emerald-300', label: `Còn ${remaining} buổi`, icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
  };

  const openEditFee = (student: any) => {
    setEditingStudent(student);
    setEditFee(String(student.feePerSession || ''));
    setFeeChangeMode('retroactive');
  };

  // Preview calculation for the modal
  const getEditPreview = () => {
    if (!editingStudent) return null;
    const newFee = Number(editFee) || 0;
    const oldFee = Number(editingStudent.feePerSession) || 0;
    if (newFee === oldFee || newFee <= 0) return null;

    const totalPaidOffline = transactions
      .filter(t => t.studentName?.toLowerCase() === editingStudent.name?.toLowerCase() && t.revenueCategory === 'Học phí offline')
      .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

    const sessionsUsed = attendance.filter((a: any) => a.studentId === editingStudent.id && a.status !== 'excused').length;
    const feeHistory: FeeChangeLog[] = editingStudent.feeHistory || [];

    // Mode A: Retroactive — recalculate everything with new fee
    const costRetro = sessionsUsed * newFee;
    const remainRetro = totalPaidOffline - costRetro;
    const sessRetro = newFee > 0 ? Math.floor(remainRetro / newFee) : 0;

    // Mode B: Prospective — old sessions keep old fee, only future sessions use new fee
    // Calculate cost of past sessions with old fees (using existing history)
    const costPastWithHistory = computeTuitionCost(attendance, editingStudent.id, oldFee, feeHistory);
    const remainProsp = totalPaidOffline - costPastWithHistory;
    const sessProsp = newFee > 0 ? Math.floor(remainProsp / newFee) : 0;

    return {
      totalPaidOffline,
      sessionsUsed,
      oldFee,
      retroactive: { cost: costRetro, remaining: remainRetro, sessions: sessRetro },
      prospective: { cost: costPastWithHistory, remaining: remainProsp, sessions: sessProsp },
    };
  };

  const handleSaveFee = async () => {
    if (!editingStudent) return;
    const fee = Number(editFee);
    if (isNaN(fee) || fee < 0) {
      toast.warning('Học phí không hợp lệ', 'Vui lòng nhập số học phí ≥ 0');
      return;
    }
    const oldFee = Number(editingStudent.feePerSession) || 0;
    if (fee === oldFee) {
      setEditingStudent(null);
      return;
    }
    setSaving(true);
    try {
      const result = await api.updateStudent(editingStudent.id, {
        feePerSession: fee,
        feeChangeMode: feeChangeMode, // Server will store this in feeHistory
      });
      setLocalStudents(prev => prev.map(s => s.id === editingStudent.id ? { ...s, ...result } : s));
      setEditingStudent(null);
      const modeLabel = feeChangeMode === 'retroactive' ? 'Áp dụng toàn bộ' : 'Áp dụng từ bây giờ';
      toast.success(`Đã cập nhật HP (${modeLabel})`, `${editingStudent.name}: ${oldFee.toLocaleString('vi-VN')}đ → ${fee.toLocaleString('vi-VN')}đ/buổi`);
    } catch (err: any) {
      toast.error('Lỗi cập nhật học phí', err.message);
    } finally {
      setSaving(false);
    }
  };

  const getStudentAttendance = (studentId: string) =>
    attendance.filter(a => a.studentId === studentId).sort((a, b) => b.date.localeCompare(a.date));

  const getStudentTransactions = (studentName: string) =>
    transactions.filter(t => t.studentName?.toLowerCase() === studentName?.toLowerCase() && t.revenueCategory === 'Học phí offline')
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý Học phí</h2>
          <p className="text-sm text-slate-500 mt-1">Theo dõi số buổi, dự đoán hết buổi & đồ thị số dư</p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold">
            {sorted.filter(s => s.sessionsRemaining <= 0 && s.feePerSession > 0).length} hết buổi
          </div>
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 font-semibold">
            {sorted.filter(s => s.sessionsRemaining > 0 && s.sessionsRemaining <= 3 && s.feePerSession > 0).length} sắp hết
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-500 font-medium text-lg">Chưa có dữ liệu học phí</h3>
          <p className="text-slate-400 text-sm mt-2">
            Cần có học viên đã đóng "Học phí offline" và được cài đặt học phí/buổi
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Học viên</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lớp</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">HP/buổi</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã đóng</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Buổi mua</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã học</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-indigo-500 uppercase tracking-wider">Tiền đã học</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-emerald-600 uppercase tracking-wider">Tiền còn lại</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map(s => {
                const badge = getStatusBadge(s.sessionsRemaining, s.feePerSession);
                const isExpanded = expandedId === s.studentId;
                const att = getStudentAttendance(s.studentId);
                const txs = getStudentTransactions(s.studentName);
                const student = localStudents.find(st => st.id === s.studentId);
                const feeHistory: FeeChangeLog[] = student?.feeHistory || [];

                // Build balance timeline for chart (with fee history)
                const balanceData = buildBalanceTimeline(s.studentName, s.feePerSession, txs, attendance, s.studentId, feeHistory);

                return (
                  <React.Fragment key={s.studentId}>
                    <tr className={`hover:bg-slate-50/70 transition-colors ${s.sessionsRemaining <= 0 && s.feePerSession > 0 ? 'bg-red-50/40' : s.sessionsRemaining <= 3 && s.feePerSession > 0 ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {s.studentName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800">{s.studentName}</span>
                            {/* 4.2.a: Prediction badge */}
                            {s.predictedEnd && s.sessionsRemaining > 0 && (
                              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <CalendarClock className="w-3 h-3" />
                                Hết ~{s.predictedEnd.toLocaleDateString('vi-VN')}
                              </div>
                            )}
                            {s.sessionsRemaining <= 0 && s.feePerSession > 0 && (
                              <div className="text-[10px] text-red-600 font-bold mt-0.5">⚠️ Đã hết buổi!</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-500">{s.className || '—'}</td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => openEditFee(student)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 text-indigo-700 font-semibold text-sm transition-all cursor-pointer group"
                          title="Điều chỉnh học phí/buổi"
                        >
                          {s.feePerSession > 0 ? (
                            <span>{s.feePerSession.toLocaleString('vi-VN')}đ</span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Chưa cài</span>
                          )}
                          <Pencil className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                        </button>
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-slate-700">{s.totalPaidOffline.toLocaleString('vi-VN')}đ</td>
                      <td className="px-4 py-4 text-right font-semibold text-indigo-600">{s.totalSessionsBought}</td>
                      <td className="px-4 py-4 text-right text-slate-600">{s.totalSessionsUsed}</td>
                      <td className="px-4 py-4 text-right">
                        {s.feePerSession > 0 ? (
                          <span className="font-semibold text-indigo-700">
                            {s.totalCostUsed.toLocaleString('vi-VN')}đ
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {s.feePerSession > 0 ? (
                          <span className={`font-bold ${
                            s.moneyRemaining <= 0 ? 'text-red-600'
                            : s.moneyRemaining <= s.feePerSession * 3 ? 'text-amber-600'
                            : 'text-emerald-700'
                          }`}>
                            {s.moneyRemaining.toLocaleString('vi-VN')}đ
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => { setExpandedId(isExpanded ? null : s.studentId); setExpandedTab('history'); }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={10} className="px-6 py-4 bg-slate-50/60">
                          {/* Tab switcher */}
                          <div className="flex gap-2 mb-4 border-b border-slate-200 pb-3">
                            <button
                              onClick={() => setExpandedTab('history')}
                              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${expandedTab === 'history' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                              <History className="w-3.5 h-3.5" />
                              Lịch sử
                            </button>
                            <button
                              onClick={() => setExpandedTab('chart')}
                              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${expandedTab === 'chart' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                              Đồ thị số dư
                            </button>
                            {feeHistory.length > 0 && (
                              <button
                                onClick={() => setExpandedTab('feeLog')}
                                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${expandedTab === 'feeLog' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:bg-slate-100'}`}
                              >
                                <Clock className="w-3.5 h-3.5" />
                                Thay đổi HP ({feeHistory.length})
                              </button>
                            )}
                          </div>

                          {/* Tab: History */}
                          {expandedTab === 'history' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Payment history */}
                              <div>
                                <h4 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
                                  <Wallet className="w-4 h-4 text-indigo-500" />
                                  Lịch sử đóng tiền
                                </h4>
                                {txs.length === 0 ? (
                                  <p className="text-slate-400 text-xs italic">Chưa có khoản thu nào</p>
                                ) : (
                                  <div className="space-y-2">
                                    {txs.map(t => (
                                      <div key={t.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200 text-xs">
                                        <span className="text-slate-500">{new Date(t.paymentDate).toLocaleDateString('vi-VN')}</span>
                                        <span className="font-semibold text-emerald-700">+{Number(t.amount).toLocaleString('vi-VN')}đ</span>
                                        <span className="text-indigo-600 font-medium">
                                          +{s.feePerSession > 0 ? Math.floor(Number(t.amount) / s.feePerSession) : '?'} buổi
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Attendance history */}
                              <div>
                                <h4 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
                                  <History className="w-4 h-4 text-indigo-500" />
                                  Lịch sử điểm danh ({att.length} buổi)
                                </h4>
                                {att.length === 0 ? (
                                  <p className="text-slate-400 text-xs italic">Chưa có lịch sử điểm danh</p>
                                ) : (
                                  <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {att.map(a => (
                                      <div key={a.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200 text-xs">
                                        <span className="text-slate-500">{new Date(a.date).toLocaleDateString('vi-VN')}</span>
                                        <span className="text-slate-500">{a.className}</span>
                                        <span className={`font-semibold ${a.status === 'present' ? 'text-emerald-600' : a.status === 'absent' ? 'text-red-500' : 'text-amber-600'}`}>
                                          {a.status === 'present' ? '✅ Có mặt' : a.status === 'absent' ? '❌ Vắng (-1)' : '⏰ Vắng phép'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Tab: Balance Chart (4.2.d) */}
                          {expandedTab === 'chart' && (
                            <div>
                              <h4 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-indigo-500" />
                                Biến động số dư học phí
                              </h4>
                              {balanceData.length === 0 ? (
                                <p className="text-slate-400 text-xs italic">Chưa có dữ liệu biến động</p>
                              ) : (
                                <div className="bg-white rounded-xl border border-slate-200 p-4">
                                  <ResponsiveContainer width="100%" height={240}>
                                    <AreaChart data={balanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id={`balGrad-${s.studentId}`} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                      <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        tickFormatter={(v: string) => {
                                          try { return new Date(v).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }); }
                                          catch { return v; }
                                        }}
                                      />
                                      <YAxis
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                                      />
                                      <Tooltip
                                        contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        formatter={(value: number) => [`${value.toLocaleString('vi-VN')}đ`, 'Số dư']}
                                        labelFormatter={(label: string) => {
                                          try { return new Date(label).toLocaleDateString('vi-VN'); }
                                          catch { return label; }
                                        }}
                                      />
                                      <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                                      <Area
                                        type="monotone"
                                        dataKey="balance"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        fill={`url(#balGrad-${s.studentId})`}
                                      />
                                    </AreaChart>
                                  </ResponsiveContainer>

                                  {/* Event list below chart */}
                                  <div className="mt-3 max-h-32 overflow-y-auto space-y-1">
                                    {balanceData.slice().reverse().map((e, i) => (
                                      <div key={i} className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-slate-50">
                                        <span className="text-slate-400">
                                          {(() => { try { return new Date(e.date).toLocaleDateString('vi-VN'); } catch { return e.date; } })()}
                                        </span>
                                        <span className="text-slate-600">{e.event}</span>
                                        <span className={`font-semibold ${e.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                          {e.amount >= 0 ? '+' : ''}{e.amount.toLocaleString('vi-VN')}đ
                                        </span>
                                        <span className="text-indigo-700 font-bold">{e.balance.toLocaleString('vi-VN')}đ</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Tab: Fee Change Log (4.2.c) */}
                          {expandedTab === 'feeLog' && (
                            <div>
                              <h4 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-indigo-500" />
                                Lịch sử thay đổi học phí
                              </h4>
                              {feeHistory.length === 0 ? (
                                <p className="text-slate-400 text-xs italic">Chưa có thay đổi nào</p>
                              ) : (
                                <div className="space-y-2">
                                  {[...feeHistory].reverse().map((log, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-slate-200 text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="text-slate-400">
                                          {new Date(log.changedAt).toLocaleString('vi-VN')}
                                        </span>
                                        <span className="text-slate-500">
                                          bởi <strong className="text-slate-700">{log.changedBy}</strong>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="line-through text-red-500 bg-red-50 px-2 py-0.5 rounded">
                                          {log.oldFee.toLocaleString('vi-VN')}đ
                                        </span>
                                        <span className="text-slate-400">→</span>
                                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                                          {log.newFee.toLocaleString('vi-VN')}đ
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Students without fee data */}
      {localStudents.filter(s => !summaries.find(sum => sum.studentId === s.id)).length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Học viên chưa có dữ liệu học phí offline
          </p>
          <div className="flex flex-wrap gap-2">
            {localStudents.filter(s => !summaries.find(sum => sum.studentId === s.id)).map(s => (
              <button
                key={s.id}
                onClick={() => openEditFee(s)}
                className="flex items-center gap-1.5 text-xs bg-white border border-slate-300 hover:border-indigo-400 text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-full transition-colors"
              >
                {s.name}
                <Pencil className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Edit Fee Modal — Redesigned with 2 modes */}
      {editingStudent && (() => {
        const preview = getEditPreview();
        const newFee = Number(editFee) || 0;
        const oldFee = Number(editingStudent.feePerSession) || 0;
        const isChanged = newFee > 0 && newFee !== oldFee;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-indigo-900 text-white shrink-0">
                <div>
                  <h3 className="text-base font-bold text-white">Điều chỉnh học phí / buổi</h3>
                  <p className="text-indigo-200 text-xs mt-0.5">
                    {editingStudent.name} • {editingStudent.className || 'Chưa xếp lớp'}
                  </p>
                </div>
                <button onClick={() => setEditingStudent(null)} className="p-2 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer">
                  <X className="w-5 h-5 text-indigo-200" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {/* Current fee display */}
                {oldFee > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <Wallet className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Học phí hiện tại</p>
                      <p className="text-lg font-black text-slate-800">{oldFee.toLocaleString('vi-VN')}đ<span className="text-sm font-normal text-slate-400">/buổi</span></p>
                    </div>
                  </div>
                )}

                {/* New fee input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Học phí mới (VNĐ/buổi) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={editFee}
                      onChange={e => setEditFee(e.target.value)}
                      placeholder="VD: 87500"
                      className="w-full px-4 py-3 border-2 border-indigo-200 bg-indigo-50 rounded-xl text-lg font-mono text-right font-bold text-indigo-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-indigo-400 font-bold pointer-events-none">đ/buổi</span>
                  </div>
                  {newFee > 0 && (
                    <p className="text-xs text-slate-400 mt-1.5">
                      = {newFee.toLocaleString('vi-VN')} đ/buổi
                      {isChanged && oldFee > 0 && (
                        <span className={newFee > oldFee ? 'text-red-500 ml-2' : 'text-emerald-600 ml-2'}>
                          ({newFee > oldFee ? '↑' : '↓'} {Math.abs(((newFee - oldFee) / oldFee) * 100).toFixed(0)}%)
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Mode selection — only show when fee actually changed */}
                {isChanged && preview && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chọn cách áp dụng</p>

                    {/* Mode A: Retroactive */}
                    <button
                      onClick={() => setFeeChangeMode('retroactive')}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        feeChangeMode === 'retroactive'
                          ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                          feeChangeMode === 'retroactive' ? 'border-indigo-600' : 'border-slate-300'
                        }`}>
                          {feeChangeMode === 'retroactive' && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-indigo-600" />
                            <span className="font-bold text-sm text-slate-800">Áp dụng toàn bộ</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Tính lại <strong>tất cả buổi</strong> từ lúc nhập học đến nay bằng mức học phí mới.
                          </p>
                          {/* Preview */}
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                              {preview.sessionsUsed} buổi × {newFee.toLocaleString('vi-VN')}đ = {preview.retroactive.cost.toLocaleString('vi-VN')}đ
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className={`px-2 py-0.5 rounded font-bold font-mono ${
                              preview.retroactive.sessions >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}>
                              Còn {preview.retroactive.sessions} buổi
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Mode B: Prospective */}
                    <button
                      onClick={() => setFeeChangeMode('prospective')}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        feeChangeMode === 'prospective'
                          ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                          feeChangeMode === 'prospective' ? 'border-emerald-600' : 'border-slate-300'
                        }`}>
                          {feeChangeMode === 'prospective' && <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <ArrowDown className="w-4 h-4 text-emerald-600" />
                            <span className="font-bold text-sm text-slate-800">Áp dụng từ bây giờ</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Giữ nguyên học phí cũ cho các buổi đã học. Chỉ <strong>buổi mới</strong> tính theo mức mới.
                          </p>
                          {/* Preview */}
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                              Đã tính: {preview.prospective.cost.toLocaleString('vi-VN')}đ
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className={`px-2 py-0.5 rounded font-bold font-mono ${
                              preview.prospective.sessions >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}>
                              Còn {preview.prospective.sessions} buổi (HP mới)
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {/* Fee history */}
                {editingStudent.feeHistory && editingStudent.feeHistory.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Lịch sử thay đổi</p>
                    <div className="space-y-1.5 max-h-24 overflow-y-auto">
                      {[...editingStudent.feeHistory].reverse().slice(0, 5).map((log: FeeChangeLog, i: number) => (
                        <div key={i} className="text-[10px] text-slate-500 flex justify-between items-center">
                          <span className="flex items-center gap-1">
                            {new Date(log.changedAt).toLocaleDateString('vi-VN')} — {log.changedBy}
                            <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              log.mode === 'prospective'
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-indigo-100 text-indigo-600'
                            }`}>
                              {log.mode === 'prospective' ? 'Từ bây giờ' : 'Toàn bộ'}
                            </span>
                          </span>
                          <span>
                            <span className="text-red-400 line-through">{log.oldFee.toLocaleString('vi-VN')}</span>
                            {' → '}
                            <span className="text-emerald-600 font-bold">{log.newFee.toLocaleString('vi-VN')}đ</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-6 pt-0 shrink-0">
                <button onClick={() => setEditingStudent(null)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer">
                  Hủy
                </button>
                <button
                  onClick={handleSaveFee}
                  disabled={saving || !newFee || newFee === oldFee}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Đang lưu...' : isChanged ? (feeChangeMode === 'retroactive' ? 'Lưu (Toàn bộ)' : 'Lưu (Từ bây giờ)') : 'Lưu'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
