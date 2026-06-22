import React, { useState, useEffect } from 'react';
import TransactionForm from './ui/components/TransactionForm';
import TransactionTable from './ui/components/TransactionTable';
import DailyReportModal from './ui/components/DailyReportModal';
import ReportsDashboard from './ui/pages/ReportsDashboard';
import UserManagement from './ui/components/UserManagement';
import StudentRegisterModal from './ui/components/StudentRegisterModal';
import ClassManagement from './ui/pages/ClassManagement';
import AttendanceManagement from './ui/pages/AttendanceManagement';
import TuitionManagement from './ui/pages/TuitionManagement';
import ParentReminder from './ui/components/ParentReminder';
import StudentManagement from './ui/pages/StudentManagement';
import TeacherHome from './ui/components/TeacherHome';
import Settings from './ui/pages/Settings';
import StaffManagement from './ui/pages/StaffManagement';
import TeachingAttendance from './ui/components/TeachingAttendance';
import SalaryAdvanceManager from './ui/components/SalaryAdvanceManager';
import SalaryDashboard from './ui/pages/SalaryDashboard';
import UserGuide from './ui/components/UserGuide';
import ExpenseManagement from './ui/components/ExpenseManagement';
import Login from './ui/components/Login';
import AdmissionManagement from './ui/pages/AdmissionManagement';
import InventoryManagement from './ui/pages/InventoryManagement';
import TodayWorkspace from './ui/pages/TodayWorkspace';
import MainLayout from './ui/layouts/MainLayout';
import { TabId } from './ui/layouts/Sidebar';
import { ToastProvider, useToast } from './ui/components/Toast';
import { populateStudentEnrollment } from './shared/business/enrollment-helpers';
import { api, auth } from './shared/utils';
import { Transaction, Expense, AppSettings, Student, Class, StaffMember, AttendanceRecord, TeachingLog, SalaryAdvance, MonthlySalary, DailyCloseRecord } from './shared/types';
import {
  GraduationCap, Users, BookOpen, CalendarDays, Wallet,
  DollarSign, Receipt, PhoneCall, Briefcase, ClipboardCheck,
  HandCoins, Calculator, BarChart3, Clock, HelpCircle,
  Settings as SettingsIcon, LayoutDashboard, UserPlus, Package,
  TrendingUp
} from 'lucide-react';

const TAB_LOOKUP: Record<TabId, { label: string; icon: React.ReactNode; color: string; subtitle: string }> = {
  'ban-lam-viec': {
    label: 'Bàn làm việc',
    icon: <LayoutDashboard className="w-5 h-5" />,
    color: 'indigo',
    subtitle: 'Tổng quan hoạt động và chốt sổ ngày'
  },
  'tuyen-sinh': {
    label: 'Tuyển sinh',
    icon: <UserPlus className="w-5 h-5" />,
    color: 'pink',
    subtitle: 'Quản lý phễu tuyển sinh & lịch hẹn test'
  },
  'quan-ly-hoc-vien': {
    label: 'Quản lý Học viên',
    icon: <Users className="w-5 h-5" />,
    color: 'blue',
    subtitle: 'Danh sách hồ sơ học viên chính thức'
  },
  'quan-ly-lop': {
    label: 'Quản lý Lớp học',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'violet',
    subtitle: 'Quản lý lớp, thời khóa biểu và phân công giáo viên'
  },
  'diem-danh': {
    label: 'Điểm danh',
    icon: <CalendarDays className="w-5 h-5" />,
    color: 'amber',
    subtitle: 'Ghi nhận điểm danh và khấu trừ buổi học'
  },
  'thu-tien': {
    label: 'Thu học phí',
    icon: <DollarSign className="w-5 h-5" />,
    color: 'emerald',
    subtitle: 'Thu học phí, vật tư và lưu giao dịch'
  },
  'chi-phi': {
    label: 'Chi phí vận hành',
    icon: <Receipt className="w-5 h-5" />,
    color: 'red',
    subtitle: 'Quản lý chi phí cơ sở, vận hành trung tâm'
  },
  'hoc-phi': {
    label: 'Sổ học phí',
    icon: <Wallet className="w-5 h-5" />,
    color: 'cyan',
    subtitle: 'Theo dõi công nợ, hạn đóng và số buổi còn lại'
  },
  'nhac-ph': {
    label: 'Nhắc phí phụ huynh',
    icon: <PhoneCall className="w-5 h-5" />,
    color: 'pink',
    subtitle: 'Danh sách học viên sắp hết hạn cần nhắc phí'
  },
  'inventory': {
    label: 'Quản lý kho vật tư',
    icon: <Package className="w-5 h-5" />,
    color: 'indigo',
    subtitle: 'Quản lý vật tư, nhập/xuất kho và bán hàng học viên'
  },
  'staff-list': {
    label: 'Hồ sơ nhân viên',
    icon: <Briefcase className="w-5 h-5" />,
    color: 'orange',
    subtitle: 'Thông tin nhân viên, hợp đồng và cấu hình lương'
  },
  'cham-cong': {
    label: 'Chấm công giảng dạy',
    icon: <ClipboardCheck className="w-5 h-5" />,
    color: 'amber',
    subtitle: 'Xác nhận chấm công đứng lớp của giáo viên'
  },
  'ung-luong': {
    label: 'Tạm ứng lương',
    icon: <HandCoins className="w-5 h-5" />,
    color: 'yellow',
    subtitle: 'Phê duyệt và ghi nhận tạm ứng của nhân viên'
  },
  'bang-luong': {
    label: 'Bảng lương tháng',
    icon: <Calculator className="w-5 h-5" />,
    color: 'lime',
    subtitle: 'Tính lương tự động, xuất phiếu lương'
  },
  'bc-dashboard': {
    label: 'Báo cáo trung tâm',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'rose',
    subtitle: 'Dashboard thống kê hoạt động tổng thể'
  },
  'bc-student': {
    label: 'Báo cáo học viên',
    icon: <Users className="w-5 h-5" />,
    color: 'blue',
    subtitle: 'Phân tích số liệu học viên'
  },
  'bc-class': {
    label: 'Báo cáo lớp học',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'violet',
    subtitle: 'Thống kê sĩ số lớp học & điểm danh'
  },
  'bc-tuition': {
    label: 'Báo cáo học phí',
    icon: <Wallet className="w-5 h-5" />,
    color: 'cyan',
    subtitle: 'Thống kê đóng phí & tổng hợp công nợ'
  },
  'bc-finance': {
    label: 'Báo cáo tài chính',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'emerald',
    subtitle: 'Báo cáo thu chi, quỹ tiền và kết quả kinh doanh P&L'
  },
  'bc-staff': {
    label: 'Báo cáo nhân sự',
    icon: <Briefcase className="w-5 h-5" />,
    color: 'orange',
    subtitle: 'Hiệu suất đứng lớp & chi phí lương nhân viên'
  },
  'bc-audit': {
    label: 'Báo cáo đối soát',
    icon: <Clock className="w-5 h-5" />,
    color: 'slate',
    subtitle: 'Nhật ký chốt ngày & lịch sử thao tác hệ thống'
  },
  'bc-leads': {
    label: 'Báo cáo tuyển sinh',
    icon: <PhoneCall className="w-5 h-5" />,
    color: 'pink',
    subtitle: 'Tỷ lệ chuyển đổi phễu khách hàng'
  },
  'huong-dan': {
    label: 'Hướng dẫn sử dụng',
    icon: <HelpCircle className="w-5 h-5" />,
    color: 'cyan',
    subtitle: 'Tài liệu hướng dẫn vận hành hệ thống'
  },
  'quan-ly-user': {
    label: 'Quản lý người dùng',
    icon: <Users className="w-5 h-5" />,
    color: 'slate',
    subtitle: 'Cấp quyền và quản lý tài khoản truy cập'
  },
  'cai-dat': {
    label: 'Cài đặt hệ thống',
    icon: <SettingsIcon className="w-5 h-5" />,
    color: 'indigo',
    subtitle: 'Thiết lập các tham số hệ thống chung'
  },
  'gv-home': {
    label: 'Cổng thông tin Giáo viên',
    icon: <GraduationCap className="w-5 h-5" />,
    color: 'teal',
    subtitle: 'Bàn làm việc giảng dạy cá nhân'
  }
};

const getGroupIdFromTab = (tab: TabId): string => {
  switch (tab) {
    case 'bc-student': return 'grp_students';
    case 'bc-class': return 'grp_classes';
    case 'bc-tuition': return 'grp_tuition';
    case 'bc-finance': return 'grp_finance';
    case 'bc-staff': return 'grp_staff';
    case 'bc-audit': return 'grp_reconciliation';
    case 'bc-leads': return 'grp_admission';
    default: return 'grp_overview';
  }
};

function AppInner() {
  const toast = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [teachingLogs, setTeachingLogs] = useState<TeachingLog[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [salaries, setSalaries] = useState<MonthlySalary[]>([]);
  const [dailyCloses, setDailyCloses] = useState<DailyCloseRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [systemParameters, setSystemParameters] = useState<any[]>([]);
  const [admissionLeads, setAdmissionLeads] = useState<any[]>([]);

  const [pendingTransaction, setPendingTransaction] = useState<any | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('ban-lam-viec');

  const [user, setUser] = useState<{ username: string; name: string; role: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const refreshAllData = async () => {
    if (!token) return;
    setIsDataLoading(true);
    try {
      const [
        txData, studentData, classData, settingsData, staffData, expenseData,
        attendanceData, enrollmentData, teachingLogData, advanceData, salaryData,
        dailyCloseData, auditLogData, systemParametersData, admissionLeadsData
      ] = await Promise.all([
        api.getTransactions(),
        api.getStudents(),
        api.getClasses(),
        api.getSettings(),
        api.getStaff(),
        api.getExpenses(),
        api.getAttendance(),
        api.getEnrollments(),
        api.getTeachingLogs(),
        api.getSalaryAdvances(),
        api.getMonthlySalaries(),
        api.getDailyCloses(),
        api.getAuditLogs(),
        api.getSystemParameters(),
        api.getAdmissionLeads().catch(() => [])
      ]);
      setTransactions(txData);
      setClasses(classData);
      setSettings(settingsData);
      setStaff(staffData);
      setExpenses(expenseData);
      setAttendance(attendanceData);
      setEnrollments(enrollmentData);
      
      const populated = studentData.map((s: any) => populateStudentEnrollment(s, enrollmentData));
      setStudents(populated);
      setTeachingLogs(teachingLogData);
      setAdvances(advanceData);
      setSalaries(salaryData);
      setDailyCloses(dailyCloseData || []);
      setAuditLogs(auditLogData || []);
      setSystemParameters(systemParametersData || []);
      setAdmissionLeads(admissionLeadsData || []);
    } catch (err) {
      console.error('Lỗi khi làm mới dữ liệu:', err);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = auth.getToken();
    const savedUser = auth.getUser();
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
      setActiveTab((savedUser.role === 'teacher' || savedUser.role === 'teaching_assistant') ? 'gv-home' : 'ban-lam-viec');
    }
    setIsAuthLoading(false);
  }, []);

  useEffect(() => {
    if (token) {
      refreshAllData();
    }
  }, [token]);

  const handleLoginSuccess = (newToken: string, newUser: { username: string; name: string; role: string }) => {
    auth.setToken(newToken);
    auth.setUser(newUser);
    setToken(newToken);
    setUser(newUser);
    setActiveTab((newUser.role === 'teacher' || newUser.role === 'teaching_assistant') ? 'gv-home' : 'ban-lam-viec');
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
    setExpenses([]);
    setAttendance([]);
    setEnrollments([]);
    setTeachingLogs([]);
    setAdvances([]);
    setSalaries([]);
    setDailyCloses([]);
    setSystemParameters([]);
    setAdmissionLeads([]);
  };

  const submitTransaction = async (data: any) => {
    try {
      await api.createTransaction(data);
      // Lấy lại danh sách đã format (kèm tên học viên + lớp) thay vì chèn bản ghi
      // thô từ POST — tránh dòng mới bị trống tên/lớp cho tới khi refresh.
      const [txData, studentData] = await Promise.all([
        api.getTransactions(),
        api.getStudents(),
      ]);
      setTransactions(txData);
      setStudents(studentData.map((s: any) => populateStudentEnrollment(s, enrollments)));

      if (data.revenueCategory === 'Học phí offline') {
        const student = studentData.find((s: any) => s.id === data.studentId);
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
    const exists = data.studentId ? students.some(s => s.id === data.studentId) : false;

    if (!exists) {
      toast.error(
        'Học viên chưa có trong hệ thống',
        `"${data.studentName}" chưa được đăng ký. Vui lòng thêm ở tab Học viên trước.`
      );
      return;
    }

    const duplicate = transactions.find(t =>
      t.paymentDate === (data as any).paymentDate &&
      t.studentId === data.studentId &&
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
      
      if (updates.studentName || updates.className) {
        const studentData = await api.getStudents();
        setStudents(studentData.map((s: any) => populateStudentEnrollment(s, enrollments)));
      }
      toast.success('Đã cập nhật giao dịch!');
      return updated;
    } catch (err: any) {
      toast.error('Không thể cập nhật giao dịch', err.message);
      throw err;
    }
  };

  const handleTabChange = (id: TabId) => {
    setActiveTab(id);
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

  const activeNavItem = TAB_LOOKUP[activeTab] || {
    label: 'Kim Academy',
    icon: <GraduationCap className="w-5 h-5" />,
    color: 'indigo',
    subtitle: 'Hệ thống Quản lý Trung tâm'
  };

  const isTeacher = user.role === 'teacher' || user.role === 'teaching_assistant';

  return (
    <MainLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      settings={settings}
      currentUser={user}
      students={students}
      classes={classes}
      transactions={transactions}
      activeIcon={activeNavItem.icon}
      activeColor={activeNavItem.color}
      activeTitle={activeTab.startsWith('bc-') ? 'Báo cáo Thống kê' : activeNavItem.label}
      activeSubtitle={activeTab.startsWith('bc-') ? `Báo cáo Thống kê / ${activeNavItem.label}` : activeNavItem.subtitle}
      onLogout={handleLogout}
    >
      {isDataLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-slate-200 rounded-2xl" />
            <div className="h-24 bg-slate-200 rounded-2xl" />
            <div className="h-24 bg-slate-200 rounded-2xl" />
          </div>
          <div className="h-64 bg-slate-200 rounded-2xl" />
          <div className="h-48 bg-slate-200 rounded-2xl" />
        </div>
      ) : activeTab === 'ban-lam-viec' ? (
        <TodayWorkspace
          students={students}
          classes={classes}
          transactions={transactions}
          expenses={expenses}
          staff={staff}
          attendance={attendance}
          enrollments={enrollments}
          teachingLogs={teachingLogs}
          advances={advances}
          salaries={salaries}
          settings={settings}
          currentUser={user}
          onNavigate={(tab) => handleTabChange(tab as TabId)}
          onAddStudentClick={() => handleTabChange('quan-ly-hoc-vien')}
          refreshAllData={refreshAllData}
          dailyCloses={dailyCloses}
          systemParameters={systemParameters}
          admissionLeads={admissionLeads}
        />
      ) : activeTab === 'tuyen-sinh' ? (
        <AdmissionManagement />
      ) : activeTab === 'quan-ly-hoc-vien' ? (
        <StudentManagement
          classes={isTeacher ? classes.filter(c => c.teacher?.toLowerCase().trim() === user.name.toLowerCase().trim()) : classes}
          transactions={transactions}
          onStudentsUpdated={(updated) => setStudents(updated)}
          onNavigate={handleTabChange}
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
      ) : activeTab === 'thu-tien' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] xl:grid-cols-[460px_1fr] gap-6 h-full">
          <div className="flex flex-col gap-5">
            <TransactionForm
              onSubmit={handleAddTransaction}
              students={students}
              classes={classes}
              feeTypes={(settings?.feeTypes || []).filter(ft => ft !== 'Sách' && ft !== 'Đồng phục')}
              paymentMethods={settings?.paymentMethods || []}
            />
          </div>
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
              feeTypes={(settings?.feeTypes || []).filter(ft => ft !== 'Sách' && ft !== 'Đồng phục')}
              paymentMethods={settings?.paymentMethods || []}
              settings={settings}
            />
          </div>
        </div>
      ) : activeTab === 'chi-phi' ? (
        <ExpenseManagement
          expenses={expenses}
          setExpenses={setExpenses}
          settings={settings}
          currentUser={user}
        />
      ) : activeTab === 'hoc-phi' ? (
        <TuitionManagement students={students} transactions={transactions} classes={classes} enrollments={enrollments} refreshAllData={refreshAllData} />
      ) : activeTab === 'nhac-ph' ? (
        <ParentReminder students={students} transactions={transactions} classes={classes} enrollments={enrollments} />
      ) : activeTab === 'inventory' ? (
        <InventoryManagement />
      ) : activeTab === 'staff-list' ? (
        <StaffManagement staff={staff} onStaffUpdated={setStaff} />
      ) : activeTab === 'cham-cong' ? (
        <TeachingAttendance
          staff={staff.filter(s => (s.role === 'teacher' || s.role === 'teaching_assistant') && s.status === 'active')}
          classes={classes}
        />
      ) : activeTab === 'ung-luong' ? (
        <SalaryAdvanceManager staff={staff.filter(s => s.status === 'active')} />
      ) : activeTab === 'bang-luong' ? (
        <SalaryDashboard staff={staff} classes={classes} settings={settings} />
      ) : activeTab === 'huong-dan' ? (
        <UserGuide onNavigate={(tab) => handleTabChange(tab as TabId)} />
      ) : activeTab === 'quan-ly-user' ? (
        <UserManagement currentUserUsername={user.username} />
      ) : activeTab === 'cai-dat' ? (
        <Settings onSettingsUpdated={(updated) => setSettings(updated)} />
      ) : activeTab === 'gv-home' ? (
        <TeacherHome
          teacherName={user.name}
          classes={classes}
          students={students}
          onNavigate={(tab) => handleTabChange(tab as TabId)}
        />
      ) : activeTab === 'bc-dashboard' || activeTab.startsWith('bc-') ? (
        <ReportsDashboard
          selectedGroupId={getGroupIdFromTab(activeTab)}
          onGroupIdChange={(newGroupId) => {
            const tabMap: Record<string, TabId> = {
              'grp_overview': 'bc-dashboard',
              'grp_students': 'bc-student',
              'grp_classes': 'bc-class',
              'grp_tuition': 'bc-tuition',
              'grp_finance': 'bc-finance',
              'grp_staff': 'bc-staff',
              'grp_reconciliation': 'bc-audit',
              'grp_admission': 'bc-leads',
            };
            if (tabMap[newGroupId]) {
              handleTabChange(tabMap[newGroupId]);
            }
          }}
          transactions={transactions}
          students={students}
          classes={classes}
          expenses={expenses}
          staff={staff}
          attendance={attendance}
          advances={advances}
          salaries={salaries}
          dailyCloses={dailyCloses}
          auditLogs={auditLogs}
          teachingLogs={teachingLogs}
          systemParameters={systemParameters}
          admissionLeads={admissionLeads}
          enrollments={enrollments}
        />
      ) : null}

      {/* Modals */}
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
    </MainLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
