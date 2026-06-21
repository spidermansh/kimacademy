import React, { useState, useEffect, useMemo } from 'react';
import { api, formatCurrency, formatDate } from '../../shared/utils';
import { TuitionSummary, FeeChangeLog } from '../../shared/types';
import { useToast } from '../components/Toast';
import {
  AlertTriangle, CheckCircle2, Wallet, Pencil, X, Save,
  ChevronDown, ChevronUp, History, TrendingUp, CalendarClock,
  BarChart3, Clock, ArrowRight, RefreshCw, ArrowDown, BookOpen, Search
} from 'lucide-react';
import { computeTuitionSummary, parseFeeHistory, getFeeAtDate, computeTuitionCost } from '../../shared/business/tuition';
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

export default function TuitionManagement({ students, transactions, classes, enrollments = [], refreshAllData }: { students: any[]; transactions: any[]; classes?: any[]; enrollments?: any[]; refreshAllData?: () => Promise<void> }) {
  const toast = useToast();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
  const [editFee, setEditFee] = useState('');
  const [feeChangeMode, setFeeChangeMode] = useState<'retroactive' | 'prospective'>('retroactive');
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localStudents, setLocalStudents] = useState<any[]>(students);
  const [expandedTab, setExpandedTab] = useState<'history' | 'chart' | 'feeLog'>('history');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLocalStudents(students);
  }, [students]);

  useEffect(() => {
    api.getAttendance()
      .then(setAttendance)
      .finally(() => setLoading(false));

    // Đọc query tìm kiếm từ localStorage nếu được chuyển hướng từ Học vụ sang
    const q = localStorage.getItem('tuition_search_query');
    if (q) {
      setSearchQuery(q);
      localStorage.removeItem('tuition_search_query');
    }
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

  // Compute TuitionSummary for each student — supports prospective fee history and multi-class enrollments
  const summaries: (any)[] = localStudents.map(student => {
    const summary = computeTuitionSummary(student, transactions, attendance, enrollments);
    const scheduleDays = classScheduleMap[summary.className] || [];
    const predictedEnd = predictEndDate(summary.sessionsRemaining, scheduleDays);

    return {
      ...summary,
      predictedEnd,
      scheduleDays,
    };
  }).filter(s => s.totalPaidOffline > 0 || s.feePerSession > 0);

  // Sort: warning first
  const sorted = [...summaries].sort((a, b) => a.sessionsRemaining - b.sessionsRemaining);

  // Lọc theo searchQuery
  const filteredSorted = useMemo(() => {
    if (!searchQuery.trim()) return sorted;
    const lower = searchQuery.toLowerCase().trim();
    return sorted.filter(s => 
      s.studentName.toLowerCase().includes(lower) || 
      (s.className && s.className.toLowerCase().includes(lower))
    );
  }, [sorted, searchQuery]);

  const getStatusBadge = (remaining: number, feePerSession: number) => {
    if (feePerSession === 0) return { color: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Chưa cài học phí', icon: null };
    if (remaining <= 0) return { color: 'bg-red-100 text-red-700 border-red-300', label: 'Hết buổi!', icon: <AlertTriangle className="w-3.5 h-3.5" /> };
    if (remaining <= 3) return { color: 'bg-amber-100 text-amber-700 border-amber-300', label: `Còn ${remaining} buổi`, icon: <AlertTriangle className="w-3.5 h-3.5" /> };
    return { color: 'bg-emerald-100 text-emerald-700 border-emerald-300', label: `Còn ${remaining} buổi`, icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
  };

  const openEditFee = (student: any) => {
    const studentEnrolls = enrollments.filter(e => e.studentId === student.id && e.isActive);
    const fallbackEnrolls = studentEnrolls.length > 0 ? studentEnrolls : enrollments.filter(e => e.studentId === student.id);
    
    setEditingStudent({
      ...student,
      enrollments: fallbackEnrolls
    });
    
    const defaultEnroll = fallbackEnrolls[0];
    setSelectedEnrollmentId(defaultEnroll ? defaultEnroll.id : '');
    setEditFee(String(defaultEnroll ? defaultEnroll.feePerSession : student.feePerSession || ''));
    setFeeChangeMode('retroactive');
  };

  // Preview calculation for the modal
  const getEditPreview = () => {
    if (!editingStudent) return null;
    const newFee = Number(editFee) || 0;
    
    const activeEnroll = editingStudent.enrollments?.find((e: any) => e.id === selectedEnrollmentId) 
      || editingStudent.enrollments?.[0];
      
    if (!activeEnroll) return null;
    const oldFee = Number(activeEnroll.feePerSession) || 0;
    if (newFee === oldFee || newFee <= 0) return null;

    const totalPaidOffline = transactions
      .filter(t =>
        t.studentId === editingStudent.id &&
        t.enrollmentId === activeEnroll.id
      )
      .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

    const enrollAttendance = attendance.filter((a: any) => a.enrollmentId === activeEnroll.id);
    const sessionsUsed = enrollAttendance.filter((a: any) => a.status !== 'excused').length;
    const feeHistory: FeeChangeLog[] = parseFeeHistory(activeEnroll.feeHistory);

    // Mode A: Retroactive — recalculate everything with new fee
    const costRetro = sessionsUsed * newFee;
    const remainRetro = totalPaidOffline - costRetro;
    const sessRetro = newFee > 0 ? Math.floor(remainRetro / newFee) : 0;

    // Mode B: Prospective
    const costPastWithHistory = computeTuitionCost(enrollAttendance, editingStudent.id, oldFee, feeHistory);
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
    if (!editingStudent || !selectedEnrollmentId) return;
    const fee = Number(editFee);
    if (isNaN(fee) || fee < 0) {
      toast.warning('Học phí không hợp lệ', 'Vui lòng nhập số học phí ≥ 0');
      return;
    }
    const activeEnroll = editingStudent.enrollments?.find((e: any) => e.id === selectedEnrollmentId);
    const oldFee = Number(activeEnroll ? activeEnroll.feePerSession : editingStudent.feePerSession) || 0;
    if (fee === oldFee) {
      setEditingStudent(null);
      return;
    }
    setSaving(true);
    try {
      await api.updateEnrollmentFee(selectedEnrollmentId, fee, feeChangeMode);
      if (refreshAllData) {
        await refreshAllData();
      }
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

  const getStudentTransactions = (studentId: string) =>
    transactions.filter(t => t.studentId === studentId && t.revenueCategory === 'Học phí offline' && t.studyType !== 'Online')
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
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm học viên hoặc lớp học..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-indigo-600 font-semibold cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

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
                  <th className="text-right px-4 py-3 text-xs font-semibold text-indigo-500 uppercase tracking-wider" title="Doanh thu thực học phí: Học phí tương ứng với các buổi đã dạy xong (present + absent).">DT thực học phí</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-emerald-600 uppercase tracking-wider" title="Học phí chưa thực hiện: tiền học phí đã thu lũy kế nhưng trung tâm chưa dạy hết. Nếu âm là công nợ cần thu.">HP chưa thực hiện</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredSorted.map(s => {
                const badge = getStatusBadge(s.sessionsRemaining, s.feePerSession);
                const isExpanded = expandedId === s.studentId;
                const att = getStudentAttendance(s.studentId);
                const txs = getStudentTransactions(s.studentId);
                const student = localStudents.find(st => st.id === s.studentId);
                
                const studentEnrollments = enrollments.filter(e => e.studentId === s.studentId);
                const feeHistory: (FeeChangeLog & { className?: string })[] = [];
                studentEnrollments.forEach(e => {
                  try {
                    const history = parseFeeHistory(e.feeHistory);
                    history.forEach((h: any) => {
                      feeHistory.push({
                        ...h,
                        className: e.className
                      });
                    });
                  } catch (err) {
                    console.error('Failed to parse enrollment fee history', err);
                  }
                });
                feeHistory.sort((a, b) => a.changedAt.localeCompare(b.changedAt));

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
                                Hết ~{formatDate(s.predictedEnd.toISOString())}
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
                              Đồ thị học phí chưa thực hiện / công nợ
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
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                                        <span className="text-slate-500">{formatDate(t.paymentDate)}</span>
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
                                        <span className="text-slate-500">{formatDate(a.date)}</span>
                                        <span className="text-slate-500">{a.className}</span>
                                        <span className={`font-semibold ${a.status === 'present' ? 'text-emerald-600' : a.status === 'absent' ? 'text-red-500' : 'text-amber-600'}`}>
                                          {a.status === 'present' ? '✅ Có mặt' : a.status === 'absent' ? '❌ Vắng (-1)' : '⏰ Vắng phép'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Enrollment breakdown */}
                              <div>
                                <h4 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
                                  <BookOpen className="w-4 h-4 text-indigo-500" />
                                  Chi tiết học phí theo lớp
                                </h4>
                                {s.enrollmentBreakdown && s.enrollmentBreakdown.length > 0 ? (
                                  <div className="space-y-2">
                                    {s.enrollmentBreakdown.map((b: any) => (
                                      <div key={b.className} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm text-xs space-y-1">
                                        <div className="flex justify-between font-bold text-slate-800">
                                          <span>Lớp: {b.className}</span>
                                          <span className="text-indigo-600">{Number(b.feePerSession).toLocaleString('vi-VN')}đ/buổi</span>
                                        </div>
                                        <div className="flex justify-between text-slate-500">
                                          <span>Đã học:</span>
                                          <span>{b.sessionsUsed} buổi</span>
                                        </div>
                                        <div className="flex justify-between text-slate-500">
                                          <span>Tiền đã dùng:</span>
                                          <span className="font-semibold text-red-600">{Number(b.costUsed).toLocaleString('vi-VN')}đ</span>
                                        </div>
                                      </div>
                                    ))}
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs flex justify-between font-bold text-indigo-900 mt-2">
                                      <span>Số dư học phí còn lại:</span>
                                      <span className={s.moneyRemaining <= 0 ? 'text-red-600' : 'text-emerald-700'}>
                                        {Number(s.moneyRemaining).toLocaleString('vi-VN')}đ
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-slate-400 text-xs italic">Chưa có chi tiết theo lớp</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Tab: Balance Chart (4.2.d) */}
                          {expandedTab === 'chart' && (
                            <div>
                              <h4 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-indigo-500" />
                                Biến động học phí chưa thực hiện / công nợ
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
                                          try { const d = new Date(v); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; }
                                          catch { return v; }
                                        }}
                                      />
                                      <YAxis
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                                      />
                                      <Tooltip
                                        contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        formatter={(value: number) => [`${value.toLocaleString('vi-VN')}đ`, 'HP chưa thực hiện / công nợ']}
                                        labelFormatter={(label: string) => {
                                          try { return formatDate(label); }
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
                                          {formatDate(e.date)}
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
                                  {[...feeHistory].reverse().map((log: any, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-slate-200 text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="text-slate-400">
                                          {new Date(log.changedAt).toLocaleString('vi-VN')}
                                        </span>
                                        <span className="text-slate-500">
                                          bởi <strong className="text-slate-700">{log.changedBy}</strong>
                                        </span>
                                        {studentEnrollments.length > 1 && log.className && (
                                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[10px]">
                                            Lớp {log.className}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="line-through text-red-500 bg-red-50 px-2 py-0.5 rounded">
                                          {log.oldFee.toLocaleString('vi-VN')}đ
                                        </span>
                                        <span className="text-slate-400">→</span>
                                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                                          {log.newFee.toLocaleString('vi-VN')}đ
                                        </span>
                                        <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                          log.mode === 'prospective'
                                            ? 'bg-emerald-100 text-emerald-600'
                                            : 'bg-indigo-100 text-indigo-600'
                                        }`}>
                                          {log.mode === 'prospective' ? 'Từ bây giờ' : 'Toàn bộ'}
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
        const activeEnroll = editingStudent.enrollments?.find((e: any) => e.id === selectedEnrollmentId) 
          || editingStudent.enrollments?.[0];
        const preview = getEditPreview();
        const newFee = Number(editFee) || 0;
        const oldFee = Number(activeEnroll ? activeEnroll.feePerSession : editingStudent.feePerSession) || 0;
        const isChanged = newFee > 0 && newFee !== oldFee;

        const activeEnrollHistory: FeeChangeLog[] = parseFeeHistory(activeEnroll?.feeHistory);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-indigo-900 text-white shrink-0">
                <div>
                  <h3 className="text-base font-bold text-white">Điều chỉnh học phí / buổi</h3>
                  <p className="text-indigo-200 text-xs mt-0.5">
                    {editingStudent.name} • {activeEnroll ? `Lớp ${activeEnroll.className}` : (editingStudent.className || 'Chưa xếp lớp')}
                  </p>
                </div>
                <button onClick={() => setEditingStudent(null)} className="p-2 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer">
                  <X className="w-5 h-5 text-indigo-200" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {/* Select Class (if student has multiple classes) */}
                {editingStudent.enrollments && editingStudent.enrollments.length > 1 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                      Chọn lớp điều chỉnh học phí
                    </label>
                    <select
                      value={selectedEnrollmentId}
                      onChange={e => {
                        const enrollId = e.target.value;
                        setSelectedEnrollmentId(enrollId);
                        const enr = editingStudent.enrollments.find((x: any) => x.id === enrollId);
                        if (enr) {
                          setEditFee(String(enr.feePerSession));
                        }
                      }}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium cursor-pointer"
                    >
                      {editingStudent.enrollments.map((enr: any) => (
                        <option key={enr.id} value={enr.id}>
                          {enr.className} (Hiện tại: {enr.feePerSession.toLocaleString('vi-VN')}đ)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                      className="w-full pl-4 pr-16 py-3 border-2 border-indigo-200 bg-indigo-50 rounded-xl text-lg font-mono text-right font-bold text-indigo-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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
                {activeEnrollHistory.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Lịch sử thay đổi</p>
                    <div className="space-y-1.5 max-h-24 overflow-y-auto">
                      {[...activeEnrollHistory].reverse().slice(0, 5).map((log: FeeChangeLog, i: number) => (
                        <div key={i} className="text-[10px] text-slate-500 flex justify-between items-center">
                          <span className="flex items-center gap-1">
                            {formatDate(log.changedAt)} — {log.changedBy}
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
