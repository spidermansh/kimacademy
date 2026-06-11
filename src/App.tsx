import React, { useState, useEffect } from 'react';
import TransactionForm from './components/TransactionForm';
import TransactionTable from './components/TransactionTable';
import DailyReportModal from './components/DailyReportModal';
import ReportsDashboard from './components/ReportsDashboard';
import UserManagement from './components/UserManagement';
import StudentRegisterModal from './components/StudentRegisterModal';
import ClassManagement from './components/ClassManagement';
import AttendanceManagement from './components/AttendanceManagement';
import TuitionManagement from './components/TuitionManagement';
import ParentReminder from './components/ParentReminder';
import StudentManagement from './components/StudentManagement';
import TeacherHome from './components/TeacherHome';
import Settings from './components/Settings';
import NotificationCenter from './components/NotificationCenter';
import StaffManagement from './components/StaffManagement';
import TeachingAttendance from './components/TeachingAttendance';
import SalaryAdvanceManager from './components/SalaryAdvanceManager';
import SalaryDashboard from './components/SalaryDashboard';
import UserGuide from './components/UserGuide';
import ExpenseManagement from './components/ExpenseManagement';
import Login from './components/Login';
import { Transaction, Expense, AppSettings } from './types';
import { api, auth } from './utils';
import { ToastProvider, useToast } from './components/Toast';
import {
  Check, BarChart3, LogOut, Users, BookOpen, CalendarDays,
  Wallet, DollarSign, Menu, X, ChevronLeft, ChevronRight, ChevronDown,
  GraduationCap, Settings as SettingsIcon, PhoneCall,
  Briefcase, ClipboardCheck, HandCoins, Calculator,
  FolderOpen, HelpCircle, Receipt,
} from 'lucide-react';

type TabId = 'thu-tien' | 'chi-phi' | 'quan-ly-hoc-vien' | 'quan-ly-lop' | 'diem-danh' | 'hoc-phi' | 'nhac-ph' | 'quan-ly-user' | 'cai-dat' | 'gv-home' | 'staff-list' | 'cham-cong' | 'ung-luong' | 'bang-luong' | 'huong-dan' | 'bc-dashboard' | 'bc-hoc-vien' | 'bc-lop' | 'bc-tai-chinh' | 'bc-pnl' | 'bc-cong-no' | 'bc-hieu-suat-gv' | 'bc-tuyen-sinh' | 'bc-si-so' | 'bc-dt-lop' | 'bc-chuyen-can' | 'bc-cp-nhan-su';

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  hiddenForTeacher?: boolean;
  teacherOnly?: boolean;
  color?: string;
}

interface NavModule {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  items: NavItem[];
  adminOnly?: boolean;
  hiddenForTeacher?: boolean;
}

// Module-based navigation structure
const NAV_MODULES: NavModule[] = [
  {
    id: 'danh-muc',
    label: 'Danh mục',
    icon: <FolderOpen className="w-4 h-4" />,
    color: 'indigo',
    hiddenForTeacher: true,
    items: [
      { id: 'quan-ly-hoc-vien', label: 'Học viên',     icon: <Users className="w-5 h-5" />,    color: 'blue' },
      { id: 'quan-ly-lop',      label: 'Lớp học',     icon: <BookOpen className="w-5 h-5" />, color: 'violet' },
      { id: 'staff-list',       label: 'Nhân viên',    icon: <Briefcase className="w-5 h-5" />, color: 'orange' },
    ],
  },
  {
    id: 'tai-chinh',
    label: 'Tài chính',
    icon: <Wallet className="w-4 h-4" />,
    color: 'emerald',
    hiddenForTeacher: true,
    items: [
      { id: 'thu-tien',   label: 'Thu tiền',    icon: <DollarSign className="w-5 h-5" />,   color: 'emerald' },
      { id: 'chi-phi',    label: 'Chi phí',     icon: <Receipt className="w-5 h-5" />,      color: 'red' },
      { id: 'hoc-phi',    label: 'Học phí',     icon: <Wallet className="w-5 h-5" />,       color: 'cyan' },
      { id: 'nhac-ph',    label: 'Nhắc PH',     icon: <PhoneCall className="w-5 h-5" />,    color: 'pink' },
    ],
  },
  {
    id: 'hoc-vu',
    label: 'Quản lý Học vụ',
    icon: <GraduationCap className="w-4 h-4" />,
    color: 'blue',
    items: [
      { id: 'gv-home',    label: 'Trang GV',    icon: <GraduationCap className="w-5 h-5" />, color: 'teal', teacherOnly: true },
      { id: 'diem-danh',  label: 'Điểm danh',   icon: <CalendarDays className="w-5 h-5" />, color: 'amber' },
    ],
  },
  {
    id: 'nhan-vien',
    label: 'Quản lý Nhân viên',
    icon: <Briefcase className="w-4 h-4" />,
    color: 'orange',
    hiddenForTeacher: true,
    items: [
      { id: 'cham-cong',  label: 'Chấm công GV', icon: <ClipboardCheck className="w-5 h-5" />, color: 'amber' },
      { id: 'ung-luong',  label: 'Ứng lương',    icon: <HandCoins className="w-5 h-5" />,      color: 'yellow' },
      { id: 'bang-luong', label: 'Bảng lương',   icon: <Calculator className="w-5 h-5" />,     color: 'lime' },
    ],
  },
  {
    id: 'bao-cao-thong-ke',
    label: 'Báo cáo Thống kê',
    icon: <BarChart3 className="w-4 h-4" />,
    color: 'rose',
    adminOnly: true,
    items: [
      { id: 'bc-dashboard',   label: 'Tổng quan',      icon: <BarChart3 className="w-5 h-5" />,      color: 'rose' },
      { id: 'bc-hoc-vien',    label: 'Theo Học viên', icon: <Users className="w-5 h-5" />,          color: 'blue' },
      { id: 'bc-lop',         label: 'Theo Lớp',       icon: <BookOpen className="w-5 h-5" />,       color: 'violet' },
      { id: 'bc-tai-chinh',   label: 'Tài chính',      icon: <Wallet className="w-5 h-5" />,         color: 'emerald' },
      { id: 'bc-pnl',         label: 'Lợi nhuận',     icon: <BarChart3 className="w-5 h-5" />,      color: 'emerald' },
      { id: 'bc-cong-no',     label: 'Công nợ',       icon: <DollarSign className="w-5 h-5" />,     color: 'amber' },
      { id: 'bc-hieu-suat-gv',label: 'Hiệu suất GV', icon: <GraduationCap className="w-5 h-5" />,  color: 'blue' },
      { id: 'bc-tuyen-sinh',  label: 'Tuyển sinh',    icon: <Users className="w-5 h-5" />,          color: 'cyan' },
      { id: 'bc-si-so',       label: 'Sĩ số lớp',     icon: <BookOpen className="w-5 h-5" />,       color: 'violet' },
      { id: 'bc-dt-lop',      label: 'DT theo lớp',   icon: <DollarSign className="w-5 h-5" />,     color: 'emerald' },
      { id: 'bc-chuyen-can',  label: 'Chuyên cần',    icon: <CalendarDays className="w-5 h-5" />,   color: 'amber' },
      { id: 'bc-cp-nhan-su',  label: 'CP Nhân sự',   icon: <Briefcase className="w-5 h-5" />,      color: 'orange' },
    ],
  },
];

// System items (flat, admin only)
const SYSTEM_ITEMS: NavItem[] = [
  { id: 'huong-dan',   label: 'Hướng dẫn',   icon: <HelpCircle className="w-5 h-5" />, color: 'cyan' },
  { id: 'quan-ly-user', label: 'Người dùng', icon: <Users className="w-5 h-5" />,        color: 'slate', adminOnly: true },
  { id: 'cai-dat',      label: 'Cài đặt',    icon: <SettingsIcon className="w-5 h-5" />, color: 'indigo', adminOnly: true },
];

// Flat list for lookup
const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_MODULES.flatMap(m => m.items),
  ...SYSTEM_ITEMS,
];

// Color map cho active state
const ACTIVE_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-500/20 text-emerald-300 border-l-2 border-emerald-400',
  red:     'bg-red-500/20 text-red-300 border-l-2 border-red-400',
  blue:    'bg-blue-500/20 text-blue-300 border-l-2 border-blue-400',
  violet:  'bg-violet-500/20 text-violet-300 border-l-2 border-violet-400',
  amber:   'bg-amber-500/20 text-amber-300 border-l-2 border-amber-400',
  cyan:    'bg-cyan-500/20 text-cyan-300 border-l-2 border-cyan-400',
  rose:    'bg-rose-500/20 text-rose-300 border-l-2 border-rose-400',
  slate:   'bg-slate-500/20 text-slate-300 border-l-2 border-slate-400',
  indigo:  'bg-indigo-500/20 text-indigo-300 border-l-2 border-indigo-400',
  teal:    'bg-teal-500/20 text-teal-300 border-l-2 border-teal-400',
  pink:    'bg-pink-500/20 text-pink-300 border-l-2 border-pink-400',
  orange:  'bg-orange-500/20 text-orange-300 border-l-2 border-orange-400',
  yellow:  'bg-yellow-500/20 text-yellow-300 border-l-2 border-yellow-400',
  lime:    'bg-lime-500/20 text-lime-300 border-l-2 border-lime-400',
};

const ICON_COLORS: Record<string, string> = {
  emerald: 'text-emerald-400',
  red:     'text-red-400',
  blue:    'text-blue-400',
  violet:  'text-violet-400',
  amber:   'text-amber-400',
  cyan:    'text-cyan-400',
  rose:    'text-rose-400',
  slate:   'text-slate-400',
  indigo:  'text-indigo-400',
  teal:    'text-teal-400',
  pink:    'text-pink-400',
  orange:  'text-orange-400',
  yellow:  'text-yellow-400',
  lime:    'text-lime-400',
};

function AppInner() {
  const toast = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pendingTransaction, setPendingTransaction] = useState<any | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('thu-tien');

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('kim_sidebar_modules');
      return saved ? JSON.parse(saved) : { 'hoc-vien': true, 'nhan-vien': true };
    } catch { return { 'hoc-vien': true, 'nhan-vien': true }; }
  });

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = { ...prev, [moduleId]: !prev[moduleId] };
      localStorage.setItem('kim_sidebar_modules', JSON.stringify(next));
      return next;
    });
  };

  // Auth state
  const [user, setUser] = useState<{ username: string; name: string; role: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Initialize Auth
  useEffect(() => {
    const savedToken = auth.getToken();
    const savedUser = auth.getUser();
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
    }
    setIsAuthLoading(false);
  }, []);

  // Fetch all data on Login
  useEffect(() => {
    if (token) {
      setIsDataLoading(true);
      Promise.all([
        api.getTransactions(),
        api.getStudents(),
        api.getClasses(),
        api.getSettings(),
        api.getStaff(),
        api.getExpenses(),
      ])
        .then(([txData, studentData, classData, settingsData, staffData, expenseData]) => {
          setTransactions(txData);
          setStudents(studentData);
          setClasses(classData);
          setSettings(settingsData);
          setStaff(staffData);
          setExpenses(expenseData);
        })
        .catch(err => {
          console.error('Lỗi khi tải dữ liệu:', err);
          handleLogout();
        })
        .finally(() => {
          setIsDataLoading(false);
        });
    }
  }, [token]);

  const handleLoginSuccess = (newToken: string, newUser: { username: string; name: string; role: string }) => {
    auth.setToken(newToken);
    auth.setUser(newUser);
    setToken(newToken);
    setUser(newUser);
    setActiveTab(newUser.role === 'teacher' ? 'gv-home' : 'thu-tien');
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (e) {
      console.error('Error logging out from server:', e);
    }
    auth.clearToken();
    setToken(null);
    setUser(null);
    setTransactions([]);
    setStudents([]);
    setClasses([]);
    setSettings(null);
    setStaff([]);
  };

  const submitTransaction = async (data: any) => {
    try {
      const newTransaction = await api.createTransaction(data);
      setTransactions(prev => [newTransaction, ...prev]);
      const studentData = await api.getStudents();
      setStudents(studentData);

      // Show informative toast for tuition payments
      if (data.revenueCategory === 'Học phí offline' || data.revenueCategory === 'Học phí online') {
        const student = studentData.find((s: any) => s.id === data.studentId || s.name?.toLowerCase() === data.studentName?.toLowerCase());
        const fee = Number(student?.feePerSession) || 0;
        if (fee > 0) {
          const sessionsBought = Math.floor(data.amount / fee);
          toast.success(
            'Đã lưu khoản thu!',
            `${data.studentName} — Mua ${sessionsBought} buổi (${data.amount.toLocaleString('vi-VN')}đ ÷ ${fee.toLocaleString('vi-VN')}đ/buổi)`
          );
        } else {
          toast.success('Đã lưu khoản thu!', `${data.studentName} — ${data.revenueCategory}`);
        }
      } else {
        toast.success('Đã lưu khoản thu!', `${data.studentName} — ${data.revenueCategory}`);
      }
    } catch (err: any) {
      toast.error('Không thể thêm giao dịch', err.message);
    }
  };

  const handleAddTransaction = async (data: Omit<Transaction, 'id' | 'createdAt' | 'isReconciled' | 'isInvoiced'>) => {
    const normalizedName = data.studentName.trim().toLowerCase();
    const exists = students.some(s => s.name.toLowerCase() === normalizedName);

    if (!exists) {
      toast.error(
        'Học viên chưa có trong hệ thống',
        `"${data.studentName}" chưa được đăng ký. Vui lòng thêm ở tab Học viên trước.`
      );
      return;
    }

    // Check trùng transaction: cùng HV + cùng ngày + cùng số tiền + cùng loại
    const duplicate = transactions.find(t =>
      t.paymentDate === (data as any).paymentDate &&
      t.studentName?.toLowerCase() === normalizedName &&
      t.amount === (data as any).amount &&
      t.revenueCategory === (data as any).revenueCategory
    );
    if (duplicate) {
      const ok = await toast.confirm({
        title: '⚠️ Có vẻ trùng khoản thu!',
        message: `Đã có khoản thu "${(data as any).revenueCategory}" — ${(data as any).amount?.toLocaleString('vi-VN')}đ cho HV "${data.studentName}" ngày ${(data as any).paymentDate}.\n\nBạn vẫn muốn lưu thêm?`,
        confirmText: 'Vẫn lưu',
        danger: false,
      });
      if (!ok) return;
    }

    await submitTransaction(data);
  };

  const handleSaveNewStudent = async (studentData: any) => {
    try {
      await api.createStudent(studentData);
      toast.success('Đã thêm học viên mới!', studentData.name);

      if (pendingTransaction) {
        const updatedTx = {
          ...pendingTransaction,
          studentName: studentData.name,
          className: studentData.className
        };
        await submitTransaction(updatedTx);
      }

      setShowStudentModal(false);
      setPendingTransaction(null);
    } catch (err: any) {
      toast.error('Không thể lưu thông tin học viên', err.message);
    }
  };

  const handleToggleReconciled = async (id: string, currentStatus: boolean) => {
    try {
      const updated = await api.toggleReconciled(id, !currentStatus);
      setTransactions(prev => prev.map(t => t.id === id ? updated : t));
      toast.success(!currentStatus ? 'Đã đối chiếu!' : 'Đã bỏ đối chiếu');
    } catch (err: any) {
      toast.error('Không thể đối chiếu giao dịch', err.message);
    }
  };

  const handleToggleInvoiced = async (id: string, currentStatus: boolean) => {
    if (user?.role !== 'admin') {
      toast.warning('Không có quyền', 'Chỉ Kế toán mới có quyền xuất hóa đơn!');
      return;
    }
    try {
      const updated = await api.toggleInvoiced(id, !currentStatus);
      setTransactions(prev => prev.map(t => t.id === id ? updated : t));
      toast.success(!currentStatus ? 'Đã xuất hóa đơn!' : 'Đã bỏ hóa đơn');
    } catch (err: any) {
      toast.error('Không thể cập nhật hóa đơn', err.message);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (user?.role !== 'admin') {
      toast.warning('Không có quyền', 'Chỉ Kế toán mới có quyền xóa giao dịch!');
      return;
    }
    const ok = await toast.confirm({
      title: 'Xóa giao dịch này?',
      message: 'Hành động này không thể hoàn tác.',
      confirmText: 'Xóa',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast.success('Đã xóa giao dịch!');
    } catch (err: any) {
      toast.error('Không thể xóa giao dịch', err.message);
    }
  };

  const handleUpdateTransaction = async (id: string, updates: any) => {
    if (user?.role !== 'admin') {
      toast.warning('Không có quyền', 'Chỉ Quản trị viên mới có quyền sửa giao dịch!');
      return;
    }
    try {
      const updated = await api.updateTransaction(id, updates);
      setTransactions(prev => prev.map(t => t.id === id ? updated : t));
      
      // Nếu thay đổi studentName hoặc className, cần tải lại danh sách học viên để đảm bảo tính toán đồng bộ
      if (updates.studentName || updates.className) {
        const studentData = await api.getStudents();
        setStudents(studentData);
      }
      toast.success('Đã cập nhật giao dịch!');
      return updated;
    } catch (err: any) {
      toast.error('Không thể cập nhật giao dịch', err.message);
      throw err;
    }
  };


  // ── Tab label for page title ────────────────────────────────────────────────
  const activeNavItem = ALL_NAV_ITEMS.find(n => n.id === activeTab);

  // ── Tab navigation handler (also closes mobile sidebar) ────────────────────
  const handleTabChange = (id: TabId) => {
    setActiveTab(id);
    setMobileSidebarOpen(false);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm tracking-wider uppercase text-slate-400">Đang khởi tạo hệ thống...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const isTeacher = user.role === 'teacher';

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex overflow-hidden" style={{ height: '100dvh' }}>

      {/* ── Mobile overlay ─────────────────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ══ SIDEBAR ════════════════════════════════════════════════════════════ */}
      <aside
        className={`
          fixed md:relative z-50 md:z-auto
          flex flex-col h-full
          bg-gradient-to-b from-slate-900 to-slate-950
          border-r border-slate-700/50
          transition-all duration-300 ease-in-out
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${sidebarCollapsed ? 'md:w-[68px]' : 'md:w-[220px]'}
          w-[220px]
          shadow-2xl
        `}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-700/50 shrink-0 ${sidebarCollapsed ? 'md:justify-center md:px-2' : ''}`}>
          {settings?.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="w-9 h-9 rounded-xl object-contain bg-white/10 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-900/50">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
          )}
          <div className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'md:w-0 md:opacity-0' : 'w-auto opacity-100'}`}>
            <p className="text-white font-bold text-sm leading-tight whitespace-nowrap">
              {settings?.centerName || 'Kim Academy'}
            </p>
            <p className="text-slate-400 text-[10px] whitespace-nowrap">Quản lý Trung tâm</p>
          </div>
        </div>

        {/* Nav items — Module Groups */}
        <nav className="flex-1 py-3 space-y-1 px-2 overflow-y-auto overflow-x-hidden">
          {NAV_MODULES.map(mod => {
            // Module visibility
            if (mod.adminOnly && user.role !== 'admin') return null;
            if (mod.hiddenForTeacher && isTeacher) return null;

            const visibleItems = mod.items.filter(item => {
              if (item.adminOnly && user.role !== 'admin') return false;
              if (item.hiddenForTeacher && isTeacher) return false;
              if (item.teacherOnly && !isTeacher) return false;
              return true;
            });
            if (visibleItems.length === 0) return null;

            const isExpanded = expandedModules[mod.id] !== false;
            const hasActiveChild = visibleItems.some(item => activeTab === item.id);

            return (
              <div key={mod.id} className="mb-1">
                {/* Module header */}
                {!sidebarCollapsed ? (
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider
                      transition-colors duration-150
                      ${hasActiveChild ? `text-${mod.color}-400` : 'text-slate-500 hover:text-slate-300'}
                    `}
                  >
                    <span className="flex items-center gap-2">
                      <span className={hasActiveChild ? `text-${mod.color}-400` : 'text-slate-600'}>{mod.icon}</span>
                      {mod.label}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                  </button>
                ) : (
                  <div className="w-full flex justify-center py-1.5">
                    <div className={`w-6 h-0.5 rounded-full ${hasActiveChild ? `bg-${mod.color}-400` : 'bg-slate-700'}`} />
                  </div>
                )}

                {/* Module items */}
                {(isExpanded || sidebarCollapsed) && (
                  <div className={`space-y-0.5 ${sidebarCollapsed ? '' : 'ml-1'}`}>
                    {visibleItems.map(item => {
                      const isActive = activeTab === item.id;
                      const color = item.color || 'slate';
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleTabChange(item.id)}
                          title={sidebarCollapsed ? item.label : undefined}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium
                            transition-all duration-150 group relative
                            ${isActive
                              ? ACTIVE_COLORS[color]
                              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                            }
                            ${sidebarCollapsed ? 'md:justify-center md:px-2' : ''}
                          `}
                        >
                          <span className={`shrink-0 transition-colors ${isActive ? '' : ICON_COLORS[color]}`}>
                            {item.icon}
                          </span>
                          <span className={`overflow-hidden transition-all duration-300 whitespace-nowrap ${sidebarCollapsed ? 'md:w-0 md:opacity-0' : 'w-auto opacity-100'}`}>
                            {item.label}
                          </span>
                          {sidebarCollapsed && (
                            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-slate-700">
                              {item.label}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* System section — admin only */}
          {user.role === 'admin' && (
            <>
              {!sidebarCollapsed && (
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 pb-1.5 pt-3">
                  Hệ thống
                </p>
              )}
              {SYSTEM_ITEMS.filter(item => {
                if (item.adminOnly && user.role !== 'admin') return false;
                return true;
              }).map(item => {
                const isActive = activeTab === item.id;
                const color = item.color || 'slate';
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                      transition-all duration-150 group relative
                      ${isActive
                        ? ACTIVE_COLORS[color]
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      }
                      ${sidebarCollapsed ? 'md:justify-center md:px-2' : ''}
                    `}
                  >
                    <span className={`shrink-0 transition-colors ${isActive ? '' : ICON_COLORS[color]}`}>
                      {item.icon}
                    </span>
                    <span className={`overflow-hidden transition-all duration-300 whitespace-nowrap ${sidebarCollapsed ? 'md:w-0 md:opacity-0' : 'w-auto opacity-100'}`}>
                      {item.label}
                    </span>
                    {sidebarCollapsed && (
                      <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-slate-700">
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {/* User info + controls */}
        <div className="border-t border-slate-700/50 p-3 space-y-2 shrink-0">
          {/* User card */}
          <div className={`flex items-center gap-2.5 px-1 ${sidebarCollapsed ? 'md:justify-center' : ''}`}>
            <div className="w-8 h-8 bg-indigo-600/30 border border-indigo-500/40 rounded-full flex items-center justify-center shrink-0">
              <span className="text-indigo-300 text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'md:w-0 md:opacity-0' : 'opacity-100'}`}>
              <p className="text-white text-xs font-semibold truncate">{user.name}</p>
              <p className="text-slate-400 text-[10px] truncate">
                {user.role === 'admin' ? '👑 Quản trị viên' : user.role === 'teacher' ? '👩‍🏫 Giáo viên' : '👤 Nhân viên'}
              </p>
            </div>
          </div>

          {/* Logout + Collapse buttons */}
          <div className={`flex gap-1.5 ${sidebarCollapsed ? 'md:flex-col' : ''}`}>
            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Đăng xuất</span>
            </button>

            {/* Collapse toggle — desktop only */}
            <button
              onClick={() => setSidebarCollapsed(v => !v)}
              title={sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
              className="hidden md:flex items-center justify-center w-8 h-8 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Version & Credit */}
          {!sidebarCollapsed && (
            <div className="px-3 pb-2 pt-1">
              <p className="text-[9px] text-slate-600 text-center leading-relaxed">
                Phát triển bởi: <span className="text-slate-400">Bùi Trần Sơn Hải</span> & <span className="text-slate-400">Antigravity</span>
              </p>
              <p className="text-[9px] text-slate-600 text-center">Ver: 1.1</p>
            </div>
          )}
        </div>
      </aside>

      {/* ══ MAIN AREA ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-4 sm:px-6 shadow-sm shrink-0">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileSidebarOpen(v => !v)}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Page title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`text-slate-400 ${ICON_COLORS[activeNavItem?.color || 'slate']}`}>
              {activeNavItem?.icon}
            </span>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-tight">{activeNavItem?.label}</h1>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                {settings?.centerName || 'Kim Academy'} · Hệ thống Quản lý
              </p>
            </div>
          </div>

          {/* Notification bell + stats chips */}
          <div className="hidden lg:flex items-center gap-2 ml-auto">
            <span className="text-[11px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">
              {students.filter(s => s.className).length} học viên
            </span>
            <span className="text-[11px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">
              {classes.length} lớp
            </span>
            <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
              {transactions.filter(t => {
                const m = new Date().toISOString().slice(0, 7);
                return t.paymentDate.startsWith(m);
              }).length} giao dịch tháng này
            </span>
            <NotificationCenter onNavigate={(tab) => handleTabChange(tab as TabId)} />
          </div>

          {/* Mobile: bell + user avatar */}
          <div className="ml-auto md:hidden flex items-center gap-2">
            <NotificationCenter onNavigate={(tab) => handleTabChange(tab as TabId)} />
            <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-indigo-700 text-xs font-bold">{user.name.charAt(0)}</span>
            </div>
          </div>

          {/* Tablet: just bell icon */}
          <div className="hidden md:flex lg:hidden items-center gap-2 ml-auto">
            <NotificationCenter onNavigate={(tab) => handleTabChange(tab as TabId)} />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {isDataLoading ? (
            /* Loading skeleton */
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-24 bg-slate-200 rounded-2xl" />
                <div className="h-24 bg-slate-200 rounded-2xl" />
                <div className="h-24 bg-slate-200 rounded-2xl" />
              </div>
              <div className="h-64 bg-slate-200 rounded-2xl" />
              <div className="h-48 bg-slate-200 rounded-2xl" />
            </div>

          ) : activeTab === 'thu-tien' ? (
            <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] xl:grid-cols-[460px_1fr] gap-6 h-full">
              {/* Left: Form */}
              <div className="flex flex-col gap-5">
                <TransactionForm
                  onSubmit={handleAddTransaction}
                  students={students}
                  classes={classes}
                  feeTypes={settings?.feeTypes}
                  paymentMethods={settings?.paymentMethods}
                />
              </div>

              {/* Right: Table */}
              <div className="flex flex-col min-h-[500px]">
                <TransactionTable
                  transactions={transactions}
                  onToggleReconciled={handleToggleReconciled}
                  onToggleInvoiced={handleToggleInvoiced}
                  onDeleteTransaction={handleDeleteTransaction}
                  onUpdateTransaction={handleUpdateTransaction}
                  onGenerateReport={() => setShowReportModal(true)}
                  userRole={user.role}
                  students={students}
                  classes={classes}
                  feeTypes={settings?.feeTypes}
                  paymentMethods={settings?.paymentMethods}
                  settings={settings}
                />
              </div>
            </div>

          ) : activeTab === 'quan-ly-hoc-vien' ? (
            <StudentManagement
              classes={isTeacher ? classes.filter(c => c.teacher?.toLowerCase().trim() === user.name.toLowerCase().trim()) : classes}
              transactions={transactions}
              onStudentsUpdated={(updated) => setStudents(updated)}
            />

          ) : activeTab === 'quan-ly-lop' ? (
            <ClassManagement
              students={students}
              transactions={transactions}
              onClassesUpdated={(updated) => setClasses(updated)}
              userRole={user.role}
              userName={user.name}
            />

          ) : activeTab === 'diem-danh' ? (
            <AttendanceManagement
              students={students}
              classes={isTeacher ? classes.filter(c => c.teacher?.toLowerCase().trim() === user.name.toLowerCase().trim()) : classes}
              transactions={transactions}
            />

          ) : activeTab === 'hoc-phi' ? (
            <TuitionManagement students={students} transactions={transactions} classes={classes} />

          ) : activeTab === 'nhac-ph' ? (
            <ParentReminder students={students} transactions={transactions} classes={classes} />

          ) : activeTab === 'bao-cao' || activeTab.startsWith('bc-') ? (
            <ReportsDashboard
              transactions={transactions}
              students={students}
              expenses={expenses}
              initialTab={activeTab === 'bao-cao' ? 'dashboard' : activeTab.replace('bc-', '') as any}
            />

          ) : activeTab === 'quan-ly-user' ? (
            <UserManagement currentUserUsername={user.username} />

          ) : activeTab === 'cai-dat' ? (
            <Settings onSettingsUpdated={(updated) => setSettings(updated)} />

          ) : activeTab === 'gv-home' ? (
            <TeacherHome
              teacherName={user.name}
              classes={classes}
              students={students}
              onNavigate={(tab) => setActiveTab(tab as TabId)}
            />

          ) : activeTab === 'staff-list' ? (
            <StaffManagement
              staff={staff}
              onStaffUpdated={setStaff}
            />

          ) : activeTab === 'cham-cong' ? (
            <TeachingAttendance
              staff={staff.filter(s => s.role === 'teacher' && s.status === 'active')}
              classes={classes}
            />

          ) : activeTab === 'ung-luong' ? (
            <SalaryAdvanceManager
              staff={staff.filter(s => s.status === 'active')}
            />

          ) : activeTab === 'bang-luong' ? (
            <SalaryDashboard
              staff={staff}
              classes={classes}
              settings={settings}
            />

          ) : activeTab === 'chi-phi' ? (
            <ExpenseManagement
              expenses={expenses}
              setExpenses={setExpenses}
              settings={settings}
              currentUser={user}
            />

          ) : activeTab === 'huong-dan' ? (
            <UserGuide onNavigate={(tab) => setActiveTab(tab as TabId)} />

          ) : null}
        </main>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showReportModal && (
        <DailyReportModal
          transactions={transactions}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showStudentModal && pendingTransaction && (
        <StudentRegisterModal
          studentName={pendingTransaction.studentName}
          className={pendingTransaction.className}
          classes={classes}
          onSave={handleSaveNewStudent}
          onClose={async () => {
            const ok = await toast.confirm({
              title: 'Bỏ qua thông tin học viên?',
              message: 'Khoản thu vẫn sẽ được lưu mà không có hồ sơ học viên chi tiết.',
              confirmText: 'Tiếp tục lưu',
              cancelText: 'Quay lại',
            });
            if (ok) submitTransaction(pendingTransaction);
            setShowStudentModal(false);
            setPendingTransaction(null);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
