import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  AlertTriangle, CheckCircle2, Info, ArrowRight, Plus, 
  DollarSign, Users, BookOpen, Receipt, RefreshCw, 
  CalendarClock, ShieldAlert, AlertOctagon, HelpCircle, 
  CheckSquare, TrendingUp, Wallet, ArrowUpRight, UserCheck,
  MessageSquare, X, UserPlus, BarChart3, Settings as SettingsIcon,
  Pencil, GripVertical
} from 'lucide-react';
import { Student, Class, Transaction, Expense, StaffMember, AttendanceRecord, TeachingLog, SalaryAdvance, MonthlySalary, AppSettings, DailyCloseRecord, SystemParameter } from '../../shared/types';
import { api, formatCurrency, formatDateKey, getRecentBusinessDates } from '../../shared/utils';
import { computeAlerts, BusinessAlert } from '../../shared/business/alerts';
import { computeTodayOverview, computeMonthOverview } from '../../shared/business/dashboard';
import { computeTuitionSummary } from '../../shared/business/tuition';

import QuickPaymentModal from '../components/daily/QuickPaymentModal';
import QuickAttendanceModal from '../components/daily/QuickAttendanceModal';
import ParentReminderModal from '../components/daily/ParentReminderModal';
import DailyCloseModal from '../components/daily/DailyCloseModal';
import QuickStudentModal from '../components/daily/QuickStudentModal';
import QuickExpenseModal from '../components/daily/QuickExpenseModal';
import QuickAdmissionModal from '../components/daily/QuickAdmissionModal';

interface TodayWorkspaceProps {
  students: Student[];
  classes: Class[];
  transactions: Transaction[];
  expenses: Expense[];
  staff: StaffMember[];
  attendance: AttendanceRecord[];
  enrollments?: any[];
  teachingLogs: TeachingLog[];
  advances: SalaryAdvance[];
  salaries: MonthlySalary[];
  settings?: AppSettings | null;
  currentUser: { username: string; name: string; role: string };
  onNavigate: (tabId: string) => void;
  onAddStudentClick?: () => void;
  refreshAllData?: () => void;
  dailyCloses: DailyCloseRecord[];
  systemParameters?: SystemParameter[];
  admissionLeads?: any[];
}

// ─── Configure Quick Actions Modal ───
interface ConfigureQuickActionsModalProps {
  allActions: {
    id: string;
    label: string;
    icon: React.ReactNode;
    bgClass: string;
    iconColorClass: string;
    adminOnly?: boolean;
  }[];
  enabledActions: string[];
  isAdmin: boolean;
  onSave: (ids: string[]) => void;
  onClose: () => void;
}

function ConfigureQuickActionsModal({
  allActions,
  enabledActions,
  isAdmin,
  onSave,
  onClose,
}: ConfigureQuickActionsModalProps) {
  const [draft, setDraft] = useState<string[]>([...enabledActions]);

  const toggle = (id: string) => {
    setDraft(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const visibleActions = allActions.filter(a => !a.adminOnly || isAdmin);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-800 to-slate-800 text-white">
          <h3 className="text-sm font-bold flex items-center gap-2">
            ⚡ Tùy chỉnh Thao tác Nhanh
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-1 flex-1">
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Chọn các tác vụ bạn muốn hiển thị trên mục Thao tác nhanh. Cấu hình được lưu riêng cho trình duyệt của bạn.
          </p>
          {visibleActions.map(action => {
            const checked = draft.includes(action.id);
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => toggle(action.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all cursor-pointer text-left ${
                  checked
                    ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                    : 'bg-white border-slate-100 hover:bg-slate-50'
                }`}
              >
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                  checked
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'bg-white border-slate-300'
                }`}>
                  {checked && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Icon */}
                <span className={`${action.iconColorClass} shrink-0`}>{action.icon}</span>

                {/* Label */}
                <span className="text-sm font-bold text-slate-700 flex-1">{action.label}</span>

                {/* Admin badge */}
                {action.adminOnly && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
                    Admin
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-3">
          <span className="text-[10px] text-slate-400 font-medium">
            {draft.length} tác vụ được chọn
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={() => onSave(draft)}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
            >
              Lưu thiết lập
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const formatCompactValue = (val: number) => {
  if (Math.abs(val) >= 1000000) {
    const formatted = (val / 1000000).toLocaleString('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return `${formatted} triệu`;
  }
  return val.toLocaleString('vi-VN') + ' ₫';
};

export default function TodayWorkspace({
  students,
  classes,
  transactions,
  expenses,
  staff,
  attendance,
  enrollments = [],
  teachingLogs,
  advances,
  salaries,
  settings = null,
  currentUser,
  onNavigate,
  onAddStudentClick,
  refreshAllData,
  dailyCloses = [],
  systemParameters = [],
  admissionLeads = []
}: TodayWorkspaceProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [levelFilter, setLevelFilter] = useState<'all' | 'critical_high' | 'critical' | 'high' | 'medium' | 'low'>('critical_high');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'student' | 'class' | 'finance' | 'staff'>('all');
  const [displayLimit, setDisplayLimit] = useState(10);
  const [showDetailFinance, setShowDetailFinance] = useState(false);
  const [showQuickPaymentModal, setShowQuickPaymentModal] = useState(false);
  const [showQuickAttendanceModal, setShowQuickAttendanceModal] = useState(false);
  const [showParentReminderModal, setShowParentReminderModal] = useState(false);
  const [showDailyCloseModal, setShowDailyCloseModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(undefined);
  const [showPastReconcileModal, setShowPastReconcileModal] = useState(false);
  const [pendingReconcileDates, setPendingReconcileDates] = useState<string[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showQuickStudentModal, setShowQuickStudentModal] = useState(false);
  const [showQuickExpenseModal, setShowQuickExpenseModal] = useState(false);
  const [showQuickAdmissionModal, setShowQuickAdmissionModal] = useState(false);

  // ─── Quick Actions Configuration ───
  const STORAGE_KEY = 'kim_quick_actions';
  const DEFAULT_ACTIONS = ['payment', 'attendance', 'reminder', 'student', 'expense'];

  const [enabledActions, setEnabledActions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return DEFAULT_ACTIONS;
  });

  const isAdmin = currentUser.role === 'admin';

  type QuickActionDef = {
    id: string;
    label: string;
    icon: React.ReactNode;
    bgClass: string;
    hoverBgClass: string;
    borderClass: string;
    textClass: string;
    iconColorClass: string;
    adminOnly?: boolean;
    onClick: () => void;
  };

  const allQuickActions: QuickActionDef[] = useMemo(() => [
    {
      id: 'payment',
      label: 'Thu tiền nhanh',
      icon: <DollarSign className="w-5 h-5" />,
      bgClass: 'bg-emerald-50', hoverBgClass: 'hover:bg-emerald-100',
      borderClass: 'border-emerald-100', textClass: 'text-emerald-800',
      iconColorClass: 'text-emerald-600',
      onClick: () => setShowQuickPaymentModal(true),
    },
    {
      id: 'attendance',
      label: 'Điểm danh nhanh',
      icon: <UserCheck className="w-5 h-5" />,
      bgClass: 'bg-amber-50', hoverBgClass: 'hover:bg-amber-100',
      borderClass: 'border-amber-100', textClass: 'text-amber-800',
      iconColorClass: 'text-amber-600',
      onClick: () => openQuickAttendance(null),
    },
    {
      id: 'reminder',
      label: 'Nhắc phụ huynh',
      icon: <MessageSquare className="w-5 h-5" />,
      bgClass: 'bg-indigo-50', hoverBgClass: 'hover:bg-indigo-100',
      borderClass: 'border-indigo-100', textClass: 'text-indigo-800',
      iconColorClass: 'text-indigo-600',
      onClick: () => setShowParentReminderModal(true),
    },
    {
      id: 'student',
      label: 'Thêm học viên',
      icon: <Users className="w-5 h-5" />,
      bgClass: 'bg-blue-50', hoverBgClass: 'hover:bg-blue-100',
      borderClass: 'border-blue-100', textClass: 'text-blue-800',
      iconColorClass: 'text-blue-600',
      onClick: () => setShowQuickStudentModal(true),
    },
    {
      id: 'expense',
      label: 'Thêm khoản chi',
      icon: <Receipt className="w-5 h-5" />,
      bgClass: 'bg-red-50', hoverBgClass: 'hover:bg-red-100',
      borderClass: 'border-red-100', textClass: 'text-red-800',
      iconColorClass: 'text-red-600',
      onClick: () => setShowQuickExpenseModal(true),
    },
    {
      id: 'admission',
      label: 'Tuyển sinh',
      icon: <UserPlus className="w-5 h-5" />,
      bgClass: 'bg-pink-50', hoverBgClass: 'hover:bg-pink-100',
      borderClass: 'border-pink-100', textClass: 'text-pink-800',
      iconColorClass: 'text-pink-600',
      onClick: () => setShowQuickAdmissionModal(true),
    },
    {
      id: 'reports',
      label: 'Xem báo cáo',
      icon: <BarChart3 className="w-5 h-5" />,
      bgClass: 'bg-rose-50', hoverBgClass: 'hover:bg-rose-100',
      borderClass: 'border-rose-100', textClass: 'text-rose-800',
      iconColorClass: 'text-rose-600',
      adminOnly: true,
      onClick: () => onNavigate('bao-cao'),
    },
    {
      id: 'settings',
      label: 'Cài đặt hệ thống',
      icon: <SettingsIcon className="w-5 h-5" />,
      bgClass: 'bg-slate-100', hoverBgClass: 'hover:bg-slate-200',
      borderClass: 'border-slate-200', textClass: 'text-slate-700',
      iconColorClass: 'text-slate-500',
      adminOnly: true,
      onClick: () => onNavigate('cai-dat'),
    },
  ], [onAddStudentClick, onNavigate]);

  // Active quick actions: filter by enabled + admin permission
  const activeQuickActions = useMemo(() => {
    return allQuickActions.filter(a => {
      if (!enabledActions.includes(a.id)) return false;
      if (a.adminOnly && !isAdmin) return false;
      return true;
    });
  }, [allQuickActions, enabledActions, isAdmin]);

  const saveEnabledActions = useCallback((ids: string[]) => {
    setEnabledActions(ids);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  }, []);

  const todayCloseRecord = useMemo(() => {
    const todayStr = formatDateKey(new Date());
    return dailyCloses.find(r => r.date === todayStr);
  }, [dailyCloses]);

  const openQuickAttendance = (classId: string | null = null) => {
    setSelectedClassId(classId);
    setShowQuickAttendanceModal(true);
  };

  useEffect(() => {
    setDisplayLimit(10);
  }, [levelFilter, categoryFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (refreshAllData) {
      await refreshAllData();
    }
    setRefreshing(false);
  };

  // Tính toán Cảnh báo
  const alerts = useMemo(() => {
    return computeAlerts(
      students,
      classes,
      transactions,
      attendance,
      staff,
      teachingLogs,
      advances,
      salaries,
      expenses,
      systemParameters,
      admissionLeads,
      enrollments
    );
  }, [students, classes, transactions, attendance, staff, teachingLogs, advances, salaries, expenses, systemParameters, admissionLeads, enrollments]);

  // Nhóm cảnh báo theo mức độ
  const criticalAlerts = useMemo(() => alerts.filter(a => a.level === 'critical'), [alerts]);
  const highAlerts = useMemo(() => alerts.filter(a => a.level === 'high'), [alerts]);
  const mediumAlerts = useMemo(() => alerts.filter(a => a.level === 'medium'), [alerts]);
  const lowAlerts = useMemo(() => alerts.filter(a => a.level === 'low'), [alerts]);

  const LEVEL_PRIORITY: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  const filteredAndSortedAlerts = useMemo(() => {
    let list = alerts;
    if (levelFilter === 'critical_high') {
      list = list.filter(a => a.level === 'critical' || a.level === 'high');
    } else if (levelFilter !== 'all') {
      list = list.filter(a => a.level === levelFilter);
    }

    if (categoryFilter !== 'all') {
      list = list.filter(a => a.category === categoryFilter);
    }

    return [...list].sort((a, b) => {
      const pA = LEVEL_PRIORITY[a.level] || 0;
      const pB = LEVEL_PRIORITY[b.level] || 0;
      return pB - pA;
    });
  }, [alerts, levelFilter, categoryFilter]);

  const displayedAlerts = useMemo(() => {
    return filteredAndSortedAlerts.slice(0, displayLimit);
  }, [filteredAndSortedAlerts, displayLimit]);

  // Tính toán Thống kê
  const todayOverview = useMemo(() => {
    return computeTodayOverview(classes, attendance, transactions, expenses, students);
  }, [classes, attendance, transactions, expenses, students]);

  const monthOverview = useMemo(() => {
    return computeMonthOverview(students, transactions, attendance, expenses, salaries, classes);
  }, [students, transactions, attendance, expenses, salaries, classes]);

  // Xây dựng danh sách việc cần làm hôm nay (To-Do List)
  const todoTasks = useMemo(() => {
    const list: { id: string; title: string; desc: string; actionText: string; action: () => void; urgency: 'high' | 'medium' | 'low' }[] = [];

    // 1. Lớp chưa điểm danh hôm nay
    classes.forEach(cls => {
      if (cls.status !== 'active' || cls.type === 'online') return;
      const days = cls.scheduleDays || [];
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const dayOfWeek = today.getDay();
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
      const hasToday = days.some(d => todayNames.some(tn => d.toLowerCase().includes(tn)));

      if (hasToday) {
        const attendedToday = attendance.some(a => a.date === todayStr && (a.classId === cls.id || a.className === cls.name || a.classId === cls.name));
        if (!attendedToday) {
          list.push({
            id: `todo_att_${cls.id}`,
            title: `Điểm danh lớp ${cls.name}`,
            desc: `Lịch học: ${cls.scheduleTime || 'Trong ngày'} hôm nay. Chưa được điểm danh.`,
            actionText: 'Điểm danh ngay',
            action: () => openQuickAttendance(cls.id),
            urgency: 'high'
          });
        }
      }
    });

    // 2. Giao dịch chưa đối chiếu
    const unreconciledCount = transactions.filter(t => !t.isReconciled).length;
    if (unreconciledCount > 0) {
      list.push({
        id: 'todo_reconcile',
        title: `Đối chiếu quỹ tài chính`,
        desc: `Có ${unreconciledCount} giao dịch thu tiền mới phát sinh chưa đối chiếu tài khoản ngân hàng/quỹ.`,
        actionText: 'Đối chiếu ngay',
        action: () => onNavigate('thu-tien'),
        urgency: 'medium'
      });
    }

    // 3. Học viên hết buổi / âm tiền
    let outOfSessionsCount = 0;
    let negativeBalanceCount = 0;
    students.forEach(s => {
      if (s.status === 'left') return;
      const summary = computeTuitionSummary(s, transactions, attendance, enrollments);
      if (summary.feePerSession <= 0) return;
      if (summary.moneyRemaining < 0) {
        negativeBalanceCount++;
      } else if (summary.sessionsRemaining === 0) {
        outOfSessionsCount++;
      }
    });

    if (negativeBalanceCount > 0) {
      list.push({
        id: 'todo_neg_balance',
        title: `${negativeBalanceCount} học viên âm học phí`,
        desc: 'Học viên đã học vượt số tiền đã đóng. Cần liên hệ nhắc phụ huynh thanh toán nợ học phí.',
        actionText: 'Xem công nợ',
        action: () => onNavigate('hoc-phi'),
        urgency: 'high'
      });
    }

    if (outOfSessionsCount > 0) {
      list.push({
        id: 'todo_out_sessions',
        title: `${outOfSessionsCount} học viên hết buổi học`,
        desc: 'Đã hoàn thành số buổi học của khóa. Cần nhắc phụ huynh đóng phí khóa tiếp theo.',
        actionText: 'Xem học phí',
        action: () => onNavigate('hoc-phi'),
        urgency: 'medium'
      });
    }

    // 4. Khoản chi lớn hoặc thiếu thông tin duyệt chi
    const pendingExpensesCount = expenses.filter(e => e.amount > 2000000 || !e.approvedBy || !e.description).length;
    if (pendingExpensesCount > 0) {
      list.push({
        id: 'todo_expenses',
        title: `${pendingExpensesCount} khoản chi cần duyệt/kiểm tra`,
        desc: 'Phát sinh khoản chi lớn hoặc thiếu thông tin kiểm soát người duyệt, mô tả chi tiết.',
        actionText: 'Kiểm tra chi phí',
        action: () => onNavigate('chi-phi'),
        urgency: 'medium'
      });
    }

    // 5. Bảng lương/ứng lương bất thường (Lương paid nhưng chấm công/ứng đã bị tính lại)
    const payrollAlerts = salaries.filter(sal => {
      if (sal.status !== 'paid') return false;
      const logs = teachingLogs.filter(l => l.staffId === sal.staffId && l.date.startsWith(sal.month));
      const sessions = logs.reduce((sum, l) => sum + (l.sessions || 1), 0);
      const advs = advances.filter(a => a.staffId === sal.staffId && a.date.startsWith(sal.month));
      const advSum = advs.reduce((sum, a) => sum + a.amount, 0);
      return sessions !== sal.totalSessions || advSum !== sal.totalAdvance;
    }).length;

    if (payrollAlerts > 0) {
      list.push({
        id: 'todo_payroll_recalc',
        title: `Đối soát ${payrollAlerts} bảng lương đã chi trả`,
        desc: 'Dữ liệu chấm công hoặc tạm ứng đã thay đổi sau khi bảng lương đã được thanh toán.',
        actionText: 'Kiểm tra bảng lương',
        action: () => onNavigate('bang-luong'),
        urgency: 'high'
      });
    }

    // 7. Học viên tuyển sinh có lịch hẹn test hôm nay
    (admissionLeads || []).forEach(lead => {
      if (lead.status !== 'test_scheduled' || !lead.testScheduleDate) return;
      const todayStr = new Date().toISOString().slice(0, 10);
      if (lead.testScheduleDate === todayStr) {
        list.push({
          id: `todo_lead_test_${lead.id}`,
          title: `Đánh giá đầu vào học viên tuyển sinh: ${lead.studentName}`,
          desc: `Lịch hẹn test vào lúc ${lead.testScheduleTime || 'chưa gán giờ'} hôm nay. Phụ trách: ${lead.testAssignee || 'Chưa gán'}.`,
          actionText: 'Xem tuyển sinh',
          action: () => onNavigate('tuyen-sinh'),
          urgency: 'high'
        });
      }
    });

    // 6. Quét 7 ngày gần đây để tìm ngày chưa đối soát có hoạt động nghiệp vụ
    const unreconciledPastDates: string[] = [];
    const todayStr = formatDateKey(new Date());
    const recentDates = getRecentBusinessDates(7);
    recentDates.forEach(dateStr => {
      if (dateStr === todayStr) return;

      const isReconciled = dailyCloses.some(r => r.date === dateStr);
      if (isReconciled) return;

      // Kiểm tra xem ngày đó có hoạt động nghiệp vụ hay không:
      const parts = dateStr.split('-');
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
      const dayNames = VIET_DAY_MAP[dayOfWeek] || [];
      const hasClassScheduled = classes.some(cls => {
        if (cls.status !== 'active' || cls.type === 'online') return false;
        const days = cls.scheduleDays || [];
        return days.some(d => dayNames.some(tn => d.toLowerCase().includes(tn)));
      });

      const hasAttendance = attendance.some(a => a.date === dateStr);
      const hasTransaction = transactions.some(t => t.paymentDate === dateStr && t.revenueCategory !== 'Học phí online' && t.studyType !== 'Online');
      const hasExpense = expenses.some(e => e.date === dateStr);
      const hasEarnedTuition = attendance.some(a => a.date === dateStr && (a.status === 'present' || a.status === 'absent'));

      if (hasClassScheduled || hasAttendance || hasTransaction || hasExpense || hasEarnedTuition) {
        unreconciledPastDates.push(dateStr);
      }
    });

    if (unreconciledPastDates.length > 2) {
      list.push({
        id: `todo_reconcile_past_summary`,
        title: `Có ${unreconciledPastDates.length} ngày chưa đối soát`,
        desc: `Một số ngày gần đây có phát sinh nghiệp vụ nhưng chưa hoàn tất đối soát.`,
        actionText: 'Xem ngày chưa đối soát',
        action: () => {
          setPendingReconcileDates(unreconciledPastDates);
          setShowPastReconcileModal(true);
        },
        urgency: 'medium'
      });
    } else {
      unreconciledPastDates.forEach(dateStr => {
        list.push({
          id: `todo_reconcile_past_${dateStr}`,
          title: `Ngày ${dateStr} chưa đối soát`,
          desc: `Ngày ${dateStr} có hoạt động nghiệp vụ nhưng chưa hoàn tất đối soát cuối ngày.`,
          actionText: 'Đối soát bù',
          action: () => {
            setModalInitialDate(dateStr);
            setShowDailyCloseModal(true);
          },
          urgency: 'medium'
        });
      });
    }

    return list;
  }, [classes, attendance, transactions, students, expenses, salaries, teachingLogs, advances, onNavigate, openQuickAttendance, dailyCloses, admissionLeads]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-indigo-950/20 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="space-y-1 relative z-10">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Chào buổi sáng, {currentUser.name}! ☀️
          </h2>
          <p className="text-indigo-200 text-xs sm:text-sm font-medium">
            Hôm nay là {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 active:scale-95 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Cập nhật dữ liệu
          </button>
        </div>
      </div>

      {/* ─── STATS GRID ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tổng quan hôm nay */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
              Tổng quan ngày hôm nay
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full">LIVE</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lịch học</p>
              <p className="text-lg font-black text-slate-800 mt-1">{todayOverview.classesScheduled} lớp</p>
              <p className="text-[9px] text-slate-400 mt-0.5">
                {todayOverview.classesAttended} đã dạy / {todayOverview.classesUnattended} chưa
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sĩ số học viên</p>
              <p className="text-lg font-black text-slate-800 mt-1">
                {todayOverview.studentsPresent + todayOverview.studentsAbsent} học viên
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5">
                <span className="text-emerald-600 font-bold">{todayOverview.studentsPresent} có mặt</span> / <span className="text-red-500 font-bold">{todayOverview.studentsAbsent} vắng</span>
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 cursor-help" title="Tiền thu hôm nay: tiền thực thu được trong ngày. Doanh thu thực học phí hôm nay: học phí của các buổi đã dạy hôm nay. Doanh thu khác hôm nay: Lệ phí thi/Thu khác/Bán hàng kho thu hôm nay. Tổng doanh thu thực hôm nay: Doanh thu thực học phí hôm nay + Doanh thu khác hôm nay.">
                Tài chính hôm nay
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </p>
              <div className="mt-1.5 space-y-1 text-[11px] sm:text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Tiền thu:</span>
                  <span className="font-extrabold text-emerald-600 font-mono" title={formatCurrency(todayOverview.totalIncome)}>
                    {formatCompactValue(todayOverview.totalIncome)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">DT thực HP:</span>
                  <span className="font-extrabold text-indigo-600 font-mono" title={formatCurrency(todayOverview.earnedTuitionToday)}>
                    {formatCompactValue(todayOverview.earnedTuitionToday)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-slate-700 font-bold">Tổng DT thực:</span>
                  <span className="font-extrabold text-violet-700 font-mono" title={formatCurrency(todayOverview.totalEarned)}>
                    {formatCompactValue(todayOverview.totalEarned)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tổng quan tháng này */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Tổng quan tháng này ({new Date().toLocaleDateString('vi-VN', { month: 'long' })})
            </h3>
            <button
              onClick={() => setShowDetailFinance(!showDetailFinance)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer outline-none select-none flex items-center gap-0.5"
            >
              {showDetailFinance ? 'Ẩn chi tiết ▴' : 'Xem chi tiết ▾'}
            </button>
          </div>

          {/* Hàng 1: Các chỉ số quản trị chính */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-indigo-50/40 rounded-2xl p-3 border border-indigo-100/60">
              <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1 cursor-help" title="Doanh thu thực học phí: chỉ tính học phí các buổi đã dạy xong, gồm present và absent, không tính excused, không bao gồm Lệ phí thi/Thu khác/Bán hàng kho.">
                Doanh thu thực học phí
                <Info className="w-3 h-3 text-indigo-400 shrink-0" />
              </p>
              <p className="text-sm sm:text-base font-black text-indigo-700 mt-1 font-mono truncate" title={formatCurrency(monthOverview.tuitionEarned)}>
                {formatCompactValue(monthOverview.tuitionEarned)}
              </p>
            </div>

            <div className="bg-cyan-50/40 rounded-2xl p-3 border border-cyan-100/60">
              <p className="text-[9px] font-bold text-cyan-500 uppercase tracking-wider flex items-center gap-1 cursor-help" title="Tổng doanh thu thực: Doanh thu thực học phí + Doanh thu khác đã ghi nhận.">
                Tổng doanh thu thực
                <Info className="w-3 h-3 text-cyan-400 shrink-0" />
              </p>
              <p className="text-sm sm:text-base font-black text-cyan-700 mt-1 font-mono truncate" title={formatCurrency(monthOverview.earnedRevenue)}>
                {formatCompactValue(monthOverview.earnedRevenue)}
              </p>
            </div>

            <div className="bg-violet-50/40 rounded-2xl p-3 border border-violet-100/60">
              <p className="text-[9px] font-bold text-violet-500 uppercase tracking-wider flex items-center gap-1 cursor-help" title="Học phí chưa thực hiện: học phí đã thu lũy kế nhưng trung tâm chưa dạy hết.">
                Học phí chưa thực hiện
                <Info className="w-3 h-3 text-violet-400 shrink-0" />
              </p>
              <p className="text-sm sm:text-base font-black text-violet-700 mt-1 font-mono truncate" title={formatCurrency(monthOverview.tuitionUnearned)}>
                {formatCompactValue(monthOverview.tuitionUnearned)}
              </p>
            </div>

            <div className={`rounded-2xl p-3 border ${monthOverview.profit >= 0 ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'}`}>
              <p className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-help" style={{ color: monthOverview.profit >= 0 ? '#047857' : '#b91c1c' }} title="Lợi nhuận theo tổng doanh thu thực: tổng doanh thu thực - chi phí - lương.">
                Lợi nhuận thực
                <Info className="w-3 h-3 opacity-70 shrink-0" />
              </p>
              <p className={`text-sm sm:text-base font-black mt-1 font-mono truncate ${monthOverview.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`} title={formatCurrency(monthOverview.profit)}>
                {formatCompactValue(monthOverview.profit)}
              </p>
            </div>
          </div>

          {/* Hàng 2: Chỉ số tham khảo phụ (chỉ hiển thị khi expanded) */}
          {showDetailFinance && (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-dashed border-slate-200">
              <div className="bg-slate-50/50 rounded-xl p-2.5 border border-slate-200/60">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 cursor-help" title="Doanh thu đã thu (Tiền mặt + Chuyển khoản): tiền phụ huynh đã đóng trong kỳ.">
                  Tiền đã thu
                  <Info className="w-3 h-3 text-slate-400 shrink-0" />
                </p>
                <p className="text-xs font-bold text-slate-700 mt-0.5 font-mono truncate" title={formatCurrency(monthOverview.revenue)}>
                  {formatCompactValue(monthOverview.revenue)}
                </p>
              </div>

              <div className="bg-amber-50/40 rounded-xl p-2.5 border border-amber-100/60">
                <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1 cursor-help" title="Doanh thu khác: các khoản Lệ phí thi, Thu khác, Bán hàng kho (từ phân hệ Kho), ghi nhận ngay khi thu.">
                  Doanh thu khác
                  <Info className="w-3 h-3 text-amber-400 shrink-0" />
                </p>
                <p className="text-xs font-bold text-amber-700 mt-0.5 font-mono truncate" title={formatCurrency(monthOverview.otherRevenue)}>
                  {formatCompactValue(monthOverview.otherRevenue)}
                </p>
              </div>

              <div className="bg-slate-50/50 rounded-xl p-2.5 border border-slate-200/60">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 cursor-help" title="Bao gồm chi phí vận hành và lương/nhân sự tháng này">
                  Chi phí & Lương
                  <Info className="w-3 h-3 text-slate-400 shrink-0" />
                </p>
                <p className="text-xs font-bold text-slate-700 mt-0.5 font-mono truncate" title={`Chi: ${monthOverview.operatingExpense.toLocaleString()}đ | Lương: ${monthOverview.payroll.toLocaleString()}đ`}>
                  {formatCompactValue(monthOverview.operatingExpense + monthOverview.payroll)}
                </p>
              </div>

              <div className="bg-slate-50/50 rounded-xl p-2.5 border border-slate-200/60">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 cursor-help" title="Lợi nhuận theo tiền thu sau chi phí lương phát sinh: tiền thu - chi phí - lương phát sinh.">
                  LN theo tiền thu
                  <Info className="w-3 h-3 text-slate-400 shrink-0" />
                </p>
                <p className={`text-xs font-bold mt-0.5 font-mono truncate ${monthOverview.cashProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} title={formatCurrency(monthOverview.cashProfit)}>
                  {formatCompactValue(monthOverview.cashProfit)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── MAIN CONTENT COLUMNS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: VIỆC CẦN LÀM & CẢNH BÁO */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: Việc cần làm */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-600" />
                Việc cần làm hôm nay ({todoTasks.length})
              </h3>
            </div>
            {todoTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold">Tất cả việc hôm nay đã được xử lý xong!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {todoTasks.map(task => (
                  <div key={task.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${task.urgency === 'high' ? 'bg-red-500' : task.urgency === 'medium' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                        <h4 className="font-bold text-slate-800 text-sm">{task.title}</h4>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{task.desc}</p>
                    </div>
                    <button
                      onClick={task.action}
                      className="inline-flex items-center gap-1 px-4 py-2 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 text-indigo-700 font-bold text-xs rounded-xl transition-all shrink-0 cursor-pointer self-start sm:self-auto"
                    >
                      {task.actionText}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Cảnh báo rủi ro */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                Cảnh báo rủi ro ({alerts.length})
              </h3>
              {alerts.length > 0 && (
                <div className="flex gap-1.5 text-[10px]">
                  <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold">
                    {criticalAlerts.length} Nghiêm trọng
                  </span>
                  <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                    {highAlerts.length} Cao
                  </span>
                </div>
              )}
            </div>

            {/* Filter controls */}
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-100 space-y-3">
              {/* Level Filter */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                <span className="text-xs font-bold text-slate-500 min-w-[75px] sm:pt-1">Mức độ:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setLevelFilter('critical_high')}
                    className={`px-3 py-1 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                      levelFilter === 'critical_high'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Nghiêm trọng & Cao (Mặc định)
                  </button>
                  <button
                    onClick={() => setLevelFilter('all')}
                    className={`px-3 py-1 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                      levelFilter === 'all'
                        ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Tất cả ({alerts.length})
                  </button>
                  <button
                    onClick={() => setLevelFilter('critical')}
                    className={`px-3 py-1 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                      levelFilter === 'critical'
                        ? 'bg-red-100 text-red-700 border-red-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🚨 Nghiêm trọng ({criticalAlerts.length})
                  </button>
                  <button
                    onClick={() => setLevelFilter('high')}
                    className={`px-3 py-1 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                      levelFilter === 'high'
                        ? 'bg-orange-100 text-orange-700 border-orange-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ⚠️ Cao ({highAlerts.length})
                  </button>
                  <button
                    onClick={() => setLevelFilter('medium')}
                    className={`px-3 py-1 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                      levelFilter === 'medium'
                        ? 'bg-amber-100 text-amber-700 border-amber-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    💡 Vừa ({mediumAlerts.length})
                  </button>
                  <button
                    onClick={() => setLevelFilter('low')}
                    className={`px-3 py-1 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                      levelFilter === 'low'
                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ℹ️ Thấp ({lowAlerts.length})
                  </button>
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                <span className="text-xs font-bold text-slate-500 min-w-[75px] sm:pt-1">Nhóm:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: '📂 Tất cả' },
                    { id: 'student', label: '👤 Học viên' },
                    { id: 'class', label: '🏫 Lớp học' },
                    { id: 'finance', label: '💰 Tài chính' },
                    { id: 'staff', label: '👥 Nhân sự' },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id as any)}
                      className={`px-3 py-1 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                        categoryFilter === cat.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cat.label} ({cat.id === 'all' ? alerts.length : alerts.filter(a => a.category === cat.id).length})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredAndSortedAlerts.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold">Không tìm thấy cảnh báo phù hợp với bộ lọc.</p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {displayedAlerts.map(alert => {
                  let containerClass = '';
                  let iconClass = '';
                  let levelBadge = '';
                  let levelBadgeClass = '';
                  let iconEmoji = '';
                  
                  if (alert.level === 'critical') {
                    containerClass = 'bg-red-50/70 border-red-200 hover:bg-red-100/50 text-red-900';
                    iconClass = 'bg-red-100 text-red-700 border border-red-200';
                    levelBadge = 'Nghiêm trọng';
                    levelBadgeClass = 'bg-red-100 text-red-800 border-red-200';
                    iconEmoji = '🚨';
                  } else if (alert.level === 'high') {
                    containerClass = 'bg-orange-50/70 border-orange-200 hover:bg-orange-100/50 text-orange-950';
                    iconClass = 'bg-orange-100 text-orange-700 border border-orange-200';
                    levelBadge = 'Mức độ Cao';
                    levelBadgeClass = 'bg-orange-100 text-orange-800 border-orange-200';
                    iconEmoji = '⚠️';
                  } else if (alert.level === 'medium') {
                    containerClass = 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/50 text-amber-950';
                    iconClass = 'bg-amber-100 text-amber-800 border border-amber-200';
                    levelBadge = 'Mức độ Vừa';
                    levelBadgeClass = 'bg-amber-100 text-amber-900 border-amber-200';
                    iconEmoji = '💡';
                  } else {
                    containerClass = 'bg-slate-50 border-slate-200 hover:bg-slate-100/50 text-slate-800';
                    iconClass = 'bg-slate-200 text-slate-600 border border-slate-300';
                    levelBadge = 'Thấp / Lưu ý';
                    levelBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                    iconEmoji = 'ℹ️';
                  }

                  const categoryLabels: Record<string, string> = {
                    student: 'Học viên',
                    class: 'Lớp học',
                    finance: 'Tài chính',
                    staff: 'Nhân sự'
                  };
                  const categoryLabel = categoryLabels[alert.category] || alert.category;

                  return (
                    <div key={alert.id} className={`border rounded-2xl p-4 flex gap-3.5 transition-colors ${containerClass}`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold ${iconClass}`}>
                        {iconEmoji}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${levelBadgeClass}`}>
                            {levelBadge}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/60 text-slate-700 border border-slate-200">
                            {categoryLabel}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-950 leading-snug">{alert.message}</p>
                        {alert.details && <p className="text-xs text-slate-700 leading-relaxed">{alert.details}</p>}
                      </div>
                      {alert.link && (
                        <button
                          onClick={() => onNavigate(alert.link!)}
                          className="self-center p-2 hover:bg-black/5 rounded-xl text-slate-700 transition-colors cursor-pointer shrink-0"
                          title="Xử lý ngay"
                        >
                          <ArrowUpRight className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {filteredAndSortedAlerts.length > displayLimit && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setDisplayLimit(prev => prev + 10)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer active:scale-95"
                    >
                      Xem thêm (còn {filteredAndSortedAlerts.length - displayLimit} cảnh báo)
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: THAO TÁC NHANH & QUY TRÌNH HÀNG NGÀY */}
        <div className="space-y-6">
          
          {/* Thao tác nhanh — Configurable */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Thao tác nhanh
              </h3>
              <button
                onClick={() => setShowConfigModal(true)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                title="Tùy chỉnh thao tác nhanh"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>

            {activeQuickActions.length === 0 ? (
              <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <GripVertical className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold">Chưa chọn tác vụ nhanh nào.</p>
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  Nhấn để tùy chỉnh
                </button>
              </div>
            ) : (
              <div className={`grid gap-2.5 ${
                activeQuickActions.length <= 2 ? 'grid-cols-2' :
                activeQuickActions.length <= 4 ? 'grid-cols-2' :
                activeQuickActions.length <= 6 ? 'grid-cols-3' : 'grid-cols-4'
              }`}>
                {activeQuickActions.map(action => (
                  <button
                    key={action.id}
                    onClick={action.onClick}
                    className={`flex flex-col items-center justify-center p-3 ${action.bgClass} ${action.hoverBgClass} border ${action.borderClass} ${action.textClass} rounded-2xl text-center transition-all cursor-pointer group active:scale-95`}
                  >
                    <span className={`${action.iconColorClass} mb-1.5 group-hover:scale-110 transition-transform`}>
                      {action.icon}
                    </span>
                    <span className="text-[11px] font-bold leading-tight">{action.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Đối soát cuối ngày */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-indigo-600" />
              Đối soát cuối ngày
            </h3>
            
            {todayCloseRecord ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Hôm nay đã hoàn tất đối soát</span>
                </div>
                <p className="opacity-90">
                  Hoàn tất vào lúc <span className="font-bold">{new Date(todayCloseRecord.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span> bởi <span className="font-bold">{todayCloseRecord.completedBy}</span>.
                </p>
                <p className="opacity-90 text-[10px] leading-relaxed font-medium text-slate-500">
                  Bạn vẫn có thể mở lại để kiểm tra hoặc cập nhật nếu cần.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-amber-50/60 border border-amber-200 text-amber-800 rounded-2xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Hôm nay chưa hoàn tất đối soát cuối ngày.</span>
              </div>
            )}

            <p className="text-xs text-slate-500 leading-relaxed">
              Rà soát các lớp điểm danh, các khoản thu chi và xác nhận doanh thu học phí thực tế của ngày làm việc.
            </p>
            <button
              onClick={() => {
                setModalInitialDate(undefined);
                setShowDailyCloseModal(true);
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md text-center active:scale-95"
            >
              {todayCloseRecord ? 'Mở đối soát cuối ngày' : 'Thực hiện đối soát cuối ngày'}
            </button>
          </div>

          {/* Quy trình làm việc hàng ngày */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-slate-600" />
              Quy trình hôm nay
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
                  1
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Kiểm tra cảnh báo</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Xem các rủi ro học viên hết buổi hoặc âm phí ở danh sách bên cạnh.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
                  2
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Điểm danh lớp học</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Tiến hành điểm danh cho tất cả các lớp có lịch học dạy trong ngày.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
                  3
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Nhập thu chi phát sinh</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Ghi nhận các giao dịch đóng học phí của học viên hoặc các khoản chi tiêu vận hành.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
                  4
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Đối soát cuối ngày</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Rà soát tổng số tiền thu được, các lớp chưa điểm danh để hoàn tất đối soát cuối ngày.</p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ─── Configure Quick Actions Modal ─── */}
      {showConfigModal && (
        <ConfigureQuickActionsModal
          allActions={allQuickActions}
          enabledActions={enabledActions}
          isAdmin={isAdmin}
          onSave={(ids) => { saveEnabledActions(ids); setShowConfigModal(false); }}
          onClose={() => setShowConfigModal(false)}
        />
      )}

      {/* Modals */}
      <QuickPaymentModal
        isOpen={showQuickPaymentModal}
        onClose={() => setShowQuickPaymentModal(false)}
        students={students}
        transactions={transactions}
        attendance={attendance}
        settings={settings}
        onSuccess={handleRefresh}
      />

      <QuickAttendanceModal
        isOpen={showQuickAttendanceModal}
        onClose={() => setShowQuickAttendanceModal(false)}
        classes={classes}
        students={students}
        attendance={attendance}
        initialClassId={selectedClassId}
        onSuccess={handleRefresh}
      />

      <ParentReminderModal
        isOpen={showParentReminderModal}
        onClose={() => setShowParentReminderModal(false)}
        students={students}
        transactions={transactions}
        attendance={attendance}
        settings={settings}
        onSuccess={handleRefresh}
      />

      <QuickStudentModal
        isOpen={showQuickStudentModal}
        onClose={() => setShowQuickStudentModal(false)}
        classes={classes}
        settings={settings}
        onSuccess={handleRefresh}
      />

      <QuickExpenseModal
        isOpen={showQuickExpenseModal}
        onClose={() => setShowQuickExpenseModal(false)}
        settings={settings || null}
        currentUser={currentUser}
        onSuccess={handleRefresh}
      />

      <QuickAdmissionModal
        isOpen={showQuickAdmissionModal}
        onClose={() => setShowQuickAdmissionModal(false)}
        admissionLeads={admissionLeads}
        currentUser={currentUser}
        onSuccess={handleRefresh}
      />

      <DailyCloseModal
        isOpen={showDailyCloseModal}
        onClose={() => setShowDailyCloseModal(false)}
        classes={classes}
        attendance={attendance}
        transactions={transactions}
        expenses={expenses}
        students={students}
        alerts={alerts}
        dailyCloses={dailyCloses}
        initialDate={modalInitialDate}
        onSuccess={handleRefresh}
        systemParameters={systemParameters}
      />

      {/* Modal danh sách ngày chưa đối soát */}
      {showPastReconcileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                ⏳ Danh sách ngày chưa đối soát
              </h3>
              <button
                onClick={() => setShowPastReconcileModal(false)}
                className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Các ngày dưới đây có phát sinh nghiệp vụ học vụ hoặc tài chính nhưng chưa được đối soát cuối ngày:
              </p>
              <div className="space-y-2.5">
                {pendingReconcileDates.map(dateStr => (
                  <div key={dateStr} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/60 rounded-2xl hover:bg-slate-100/30 transition-colors">
                    <span className="text-xs font-extrabold text-slate-700">{dateStr}</span>
                    <button
                      onClick={() => {
                        setModalInitialDate(dateStr);
                        setShowPastReconcileModal(false);
                        setShowDailyCloseModal(true);
                      }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Đối soát bù
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowPastReconcileModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
