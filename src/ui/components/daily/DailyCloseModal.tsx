import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckSquare, AlertTriangle, AlertCircle, RefreshCw, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import { Student, Class, Transaction, Expense, AttendanceRecord, DailyCloseRecord, SystemParameter } from '../../../shared/types';
import { api, formatCurrency, formatDateKey, getRecentBusinessDates, formatDate } from '../../../shared/utils';
import { computeDayOverview } from '../../../shared/business/dashboard';
import { BusinessAlert } from '../../../shared/business/alerts';

interface DailyCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: Class[];
  attendance: AttendanceRecord[];
  transactions: Transaction[];
  expenses: Expense[];
  students: Student[];
  alerts: BusinessAlert[];
  dailyCloses: DailyCloseRecord[];
  onSuccess: () => void;
  initialDate?: string;
  systemParameters?: SystemParameter[];
}

export default function DailyCloseModal({
  isOpen,
  onClose,
  classes,
  attendance,
  transactions,
  expenses,
  students,
  alerts,
  dailyCloses,
  onSuccess,
  initialDate,
  systemParameters = []
}: DailyCloseModalProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [warningsLimit, setWarningsLimit] = useState(5);

  // Initialize selectedDate when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(initialDate || formatDateKey(new Date()));
      setNote('');
      setError('');
      setSuccess(false);
      setWarningsLimit(5);
    }
  }, [isOpen, initialDate]);

  // Available dates for selector: last 7 days to allow retrospective reconciliation
  const availableDates = useMemo(() => {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(formatDateKey(d));
    }
    return dates;
  }, []);

  // Check if selected date has already been reconciled
  const existingRecord = useMemo(() => {
    if (!selectedDate) return null;
    return dailyCloses.find(r => r.date === selectedDate) || null;
  }, [dailyCloses, selectedDate]);

  // Compute Day Overview statistics on selectedDate
  const dayOverview = useMemo(() => {
    if (!selectedDate) return null;
    return computeDayOverview(selectedDate, classes, attendance, transactions, expenses, students);
  }, [selectedDate, classes, attendance, transactions, expenses, students]);

  // Today's schedule day calculation for selectedDate
  const dayClassesInfo = useMemo(() => {
    if (!selectedDate) return { scheduled: [], unattended: [] };
    
    const parts = selectedDate.split('-');
    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dayOfWeek = dateObj.getDay();
    const VIET_DAY_MAP: Record<number, string[]> = {
      0: ['cn', 'chủ nhật'],
      1: ['thứ 2', 't2', 'thứ hai'],
      2: ['thứ 3', 't3', 'thứ ba'],
      3: ['thứ 4', 't4', 'thứ tư'],
      4: ['thứ 5', 't5', 'thứ năm'],
      5: ['thứ 6', 't6', 'thứ sáu'],
      6: ['thứ 7', 't7', 'thứ bảy'],
    };
    const todayNames = VIET_DAY_MAP[dayOfWeek] || [];
    
    const scheduled = classes.filter(cls => {
      if (cls.status !== 'active' || cls.type === 'online') return false;
      const days = cls.scheduleDays || [];
      return days.some(d => todayNames.some(tn => d.toLowerCase().includes(tn)));
    });

    const unattended = scheduled.filter(cls => {
      return !attendance.some(a => a.date === selectedDate && (a.classId === cls.id || a.className === cls.name || a.classId === cls.name));
    });

    return { scheduled, unattended };
  }, [classes, attendance, selectedDate]);

  const dayTransactions = useMemo(() => {
    if (!selectedDate) return [];
    return transactions.filter(t => t.paymentDate === selectedDate);
  }, [transactions, selectedDate]);

  const dayExpensesList = useMemo(() => {
    if (!selectedDate) return [];
    return expenses.filter(e => e.date === selectedDate);
  }, [expenses, selectedDate]);

  // 1. Blocking Issues Calculation (Strictly defined)
  const blockingIssues = useMemo(() => {
    const list: { id: string; message: string }[] = [];

    // - Lớp có lịch học nhưng chưa điểm danh
    dayClassesInfo.unattended.forEach(cls => {
      list.push({
        id: `block_att_${cls.id}`,
        message: `Lớp ${cls.name} chưa được điểm danh.`
      });
    });

    // - Giao dịch học phí offline thiếu studentId hợp lệ
    dayTransactions.forEach(t => {
      if (t.revenueCategory === 'Học phí offline') {
        const hasValidStudent = t.studentId && students.some(s => s.id === t.studentId);
        if (!hasValidStudent) {
          const resolvedName = t.studentName || (t.studentId ? (students.find(s => s.id === t.studentId)?.name || '') : '') || 'Không rõ';
          list.push({
            id: `block_tx_std_${t.id}`,
            message: `Giao dịch đóng học phí của "${resolvedName}" (${formatCurrency(t.amount)}) thiếu mã học viên hợp lệ.`
          });
        }
      }
      // - Giao dịch có số tiền <= 0 hoặc dữ liệu không hợp lệ (thiếu ngày hoặc phương thức)
      if (t.amount <= 0 || !t.paymentDate || !t.paymentMethod?.trim()) {
        list.push({
          id: `block_tx_amt_${t.id}`,
          message: `Giao dịch #${t.id} có số tiền <= 0đ hoặc dữ liệu không hợp lệ (thiếu ngày/phương thức).`
        });
      }
    });

    // - Khoản chi thiếu tiền, ngày hoặc mô tả
    dayExpensesList.forEach(e => {
      if (e.amount <= 0 || !e.date || !e.description?.trim()) {
        list.push({
          id: `block_exp_inv_${e.id}`,
          message: `Khoản chi "${e.category}" thiếu thông tin bắt buộc (ngày, mô tả hoặc số tiền).`
        });
      }
    });

    return list;
  }, [dayClassesInfo.unattended, dayTransactions, dayExpensesList, students]);

  // 2. Non-Blocking Warnings Calculation (Follow-up warnings)
  const nonBlockingWarnings = useMemo(() => {
    const list: { id: string; message: string; category: string }[] = [];

    const getParam = (key: string, fallback: any) => {
      if (!systemParameters) return fallback;
      const p = systemParameters.find(x => x.key === key && x.isActive);
      if (!p) return fallback;
      if (p.valueType === 'number' || p.valueType === 'money' || p.valueType === 'percent') return Number(p.value);
      if (p.valueType === 'boolean') return p.value === true || p.value === 'true';
      return p.value;
    };
    const largeExpenseVal = getParam('largeExpenseThreshold', 2000000);

    // - Khoản chi thiếu người duyệt (nhưng đủ tiền, ngày, mô tả)
    dayExpensesList.forEach(e => {
      if (e.description?.trim() && !e.approvedBy?.trim()) {
        list.push({
          id: `warn_exp_app_${e.id}`,
          message: `Khoản chi "${e.description}" chưa được phê duyệt.`,
          category: 'finance'
        });
      }
      // - Khoản chi lớn > largeExpenseThreshold
      if (e.amount > largeExpenseVal) {
        list.push({
          id: `warn_exp_lrg_${e.id}`,
          message: `Khoản chi lớn hơn ${largeExpenseVal.toLocaleString('vi-VN')}đ: ${e.category} (${formatCurrency(e.amount)}).`,
          category: 'finance'
        });
      }
    });

    // - Center-wide warnings (học viên âm tiền, hết buổi, ứng lương vượt...)
    alerts.forEach(a => {
      // Bỏ qua cảnh báo lớp học chưa điểm danh ngày hôm nay vì đã được liệt kê ở blockingIssues
      if (a.id.startsWith('cls_no_att_today_') && a.id.includes(selectedDate)) return;
      list.push({
        id: a.id,
        message: `${a.message} ${a.details ? `— ${a.details}` : ''}`,
        category: a.category
      });
    });

    return list;
  }, [dayExpensesList, alerts, selectedDate, systemParameters]);

  const displayedWarnings = useMemo(() => {
    return nonBlockingWarnings.slice(0, warningsLimit);
  }, [nonBlockingWarnings, warningsLimit]);

  const groupedDisplayedWarnings = useMemo(() => {
    const groups: Record<string, { id: string; message: string; category: string }[]> = {
      'Lớp học': [],
      'Học phí': [],
      'Chi phí': [],
      'Nhân sự': [],
      'Khác': []
    };

    displayedWarnings.forEach(w => {
      let catName = 'Khác';
      if (w.category === 'student') catName = 'Học phí';
      else if (w.category === 'finance') catName = 'Chi phí';
      else if (w.category === 'staff') catName = 'Nhân sự';
      else if (w.category === 'class') catName = 'Lớp học';

      groups[catName].push(w);
    });

    // Remove empty groups to avoid rendering empty headers
    return Object.fromEntries(
      Object.entries(groups).filter(([_, items]) => items.length > 0)
    );
  }, [displayedWarnings]);

  const canClose = blockingIssues.length === 0;

  const handleCloseDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !canClose) return;
    setError('');
    setIsSubmitting(true);

    try {
      const payload = {
        date: selectedDate,
        summary: {
          blockingIssuesCount: blockingIssues.length,
          nonBlockingWarningsCount: nonBlockingWarnings.length
        },
        note
      };

      await api.dailyClose(payload);

      setSuccess(true);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Lỗi gửi yêu cầu đối soát. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const vietDateFormatted = selectedDate ? new Date(selectedDate).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
          <h3 className="text-base font-bold flex items-center gap-2">
            🏁 Đối soát cuối ngày
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {success ? (
            <div className="space-y-6 text-center py-8">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-800 font-bold">Đối soát thành công!</h4>
                <p className="text-sm text-slate-500 leading-relaxed px-4">
                  Hoạt động đối soát ngày <span className="font-extrabold text-slate-700">{vietDateFormatted}</span> đã được ghi nhận vào nhật ký hệ thống.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full max-w-xs py-3 bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md"
              >
                Đóng
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {error && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Date selector */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ngày đối soát:</label>
                  <p className="text-sm font-extrabold text-slate-800">{vietDateFormatted}</p>
                </div>
                <select
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setError('');
                  }}
                  className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  {availableDates.map(d => (
                    <option key={d} value={d}>
                      {d === formatDateKey(new Date()) ? `Hôm nay (${d})` : d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Overwrite warning */}
              {existingRecord && (
                <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                  <div className="space-y-1">
                    <p className="font-extrabold">Ngày này đã được đối soát hoàn tất trước đó!</p>
                    <p className="opacity-90">
                      Được đối soát vào lúc <span className="font-bold">{formatDate(existingRecord.completedAt, true)}</span> bởi <span className="font-bold">{existingRecord.completedBy}</span>.
                    </p>
                    <p className="opacity-90 leading-relaxed font-medium">
                      Bạn có thể đối soát lại. Hệ thống sẽ cập nhật đè bản đối soát cũ và ghi nhận trong nhật ký thay đổi.
                    </p>
                  </div>
                </div>
              )}

              {/* Status Indicator */}
              <div className={`p-4 rounded-2xl border flex items-center gap-3.5 ${
                canClose 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
                  canClose ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {canClose ? '✓' : '⚠️'}
                </div>
                <div>
                  <h4 className="text-sm font-black">
                    Trạng thái: {canClose ? (nonBlockingWarnings.length > 0 ? 'Có thể hoàn tất đối soát - còn cảnh báo' : 'Có thể hoàn tất đối soát') : 'Còn việc bắt buộc cần xử lý'}
                  </h4>
                  <p className="text-xs opacity-80 mt-0.5 leading-relaxed">
                    {canClose 
                      ? (nonBlockingWarnings.length > 0 
                        ? 'Các công việc chặn đối soát đã hoàn tất. Vui lòng lưu ý các cảnh báo hành chính bên dưới trước khi hoàn tất đối soát.'
                        : 'Không phát hiện bất kỳ lỗi hoặc cảnh báo nào. Bạn có thể hoàn tất đối soát ngay.') 
                      : 'Hệ thống phát hiện còn lỗi nghiêm trọng hoặc lớp chưa điểm danh trong ngày cần xử lý trước khi đối soát.'
                    }
                  </p>
                </div>
              </div>

              {/* Financial Summary */}
              {dayOverview && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    Tổng kết tài chính ngày {selectedDate}:
                    <span title="Dữ liệu được tính từ 00:00 đến 23:59 ngày đối soát">
                      <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </span>
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Tiền thực thu</p>
                      <p className="text-sm font-black text-slate-800 font-mono mt-0.5">
                        {dayOverview.totalIncome.toLocaleString('vi-VN')} ₫
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{dayTransactions.length} giao dịch</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Tiền thực chi</p>
                      <p className="text-sm font-black text-slate-800 font-mono mt-0.5">
                        {dayOverview.totalExpense.toLocaleString('vi-VN')} ₫
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{dayExpensesList.length} khoản chi</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 col-span-2 md:col-span-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Chênh lệch quỹ</p>
                      <p className={`text-sm font-black font-mono mt-0.5 ${dayOverview.netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {dayOverview.netCashFlow >= 0 ? '+' : ''}{dayOverview.netCashFlow.toLocaleString('vi-VN')} ₫
                      </p>
                    </div>
                    <div className="bg-indigo-50/40 rounded-2xl p-3 border border-indigo-100 col-span-2 sm:col-span-1">
                      <p className="text-[10px] font-bold text-indigo-500 uppercase">DT thực học phí</p>
                      <p className="text-sm font-black text-indigo-700 font-mono mt-0.5">
                        {dayOverview.earnedTuitionToday.toLocaleString('vi-VN')} ₫
                      </p>
                    </div>
                    <div className="bg-violet-50/40 rounded-2xl p-3 border border-violet-100 col-span-2">
                      <p className="text-[10px] font-bold text-violet-500 uppercase">Tổng doanh thu thực ngày</p>
                      <p className="text-sm font-black text-violet-700 font-mono mt-0.5">
                        {dayOverview.totalEarned.toLocaleString('vi-VN')} ₫
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 1. Group Blocking Issues */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Việc bắt buộc cần xử lý ({blockingIssues.length}):
                </h4>
                {blockingIssues.length === 0 ? (
                  <div className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 py-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Không còn việc bắt buộc. Đã sẵn sàng đối soát!</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blockingIssues.map(issue => (
                      <div key={issue.id} className="flex gap-2 text-xs text-red-700 font-semibold bg-red-50/50 p-2.5 rounded-xl border border-red-100">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{issue.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Group Non-Blocking Warnings */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Cảnh báo cần theo dõi ({nonBlockingWarnings.length}):
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Các cảnh báo này không ngăn hoàn tất đối soát.</p>
                {nonBlockingWarnings.length === 0 ? (
                  <p className="text-xs text-slate-400 font-medium">Không có cảnh báo nào cần theo dõi.</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedDisplayedWarnings).map(([groupName, warnings]) => {
                      const warningsList = warnings as { id: string; message: string; category: string }[];
                      return (
                        <div key={groupName} className="space-y-2">
                          <h5 className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider pl-1">
                            📁 {groupName}
                          </h5>
                          <div className="space-y-1.5">
                            {warningsList.map(warn => (
                              <div key={warn.id} className="flex gap-2 text-xs text-amber-700 font-medium bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                                <span>{warn.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {nonBlockingWarnings.length > warningsLimit && (
                      <div className="pt-1 text-center">
                        <button
                          type="button"
                          onClick={() => setWarningsLimit(prev => prev + 10)}
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Xem thêm (còn {nonBlockingWarnings.length - warningsLimit} cảnh báo)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Ghi chú đối soát */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Ghi chú đối soát</label>
                <textarea
                  placeholder="Nhập ghi chú hoàn tất đối soát..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white resize-none"
                />
              </div>

              {/* Action Button */}
              <button
                type="submit"
                onClick={handleCloseDay}
                disabled={isSubmitting || !canClose}
                className={`w-full py-3 disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-80 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-[0.98] ${
                  !canClose 
                    ? 'bg-slate-200' 
                    : (nonBlockingWarnings.length > 0 ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-800 hover:bg-slate-900')
                }`}
              >
                {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                {!canClose 
                  ? 'Còn việc bắt buộc cần xử lý' 
                  : (nonBlockingWarnings.length > 0 ? 'Hoàn tất đối soát có lưu ý' : 'Hoàn tất đối soát')
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
