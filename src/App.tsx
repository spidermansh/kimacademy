import React, { useState, useEffect } from 'react';
import TransactionForm from './components/TransactionForm';
import TransactionTable from './components/TransactionTable';
import DailyReportModal from './components/DailyReportModal';
import ReportsDashboard from './components/ReportsDashboard';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import { Transaction } from './types';
import { api, auth } from './utils';
import { Check, BarChart3, Database, LogOut, Users } from 'lucide-react';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'nhap-lieu' | 'bao-cao' | 'quan-ly-user'>('nhap-lieu');
  
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

  // Fetch Transactions on Login
  useEffect(() => {
    if (token) {
      setIsDataLoading(true);
      api.getTransactions()
        .then(data => {
          setTransactions(data);
        })
        .catch(err => {
          console.error('Lỗi khi tải dữ liệu giao dịch:', err);
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
    setActiveTab('nhap-lieu'); // Reset tab to main
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (e) {
      console.error('Error logging out from server:', e);
    }
    auth.clearToken();
    setToken(null);
    setUser(null);
    setTransactions([]);
  };

  const handleAddTransaction = async (data: Omit<Transaction, 'id' | 'createdAt' | 'isReconciled' | 'isInvoiced'>) => {
    try {
      const newTransaction = await api.createTransaction(data);
      setTransactions(prev => [newTransaction, ...prev]);
    } catch (err: any) {
      alert('Không thể thêm giao dịch: ' + err.message);
    }
  };

  const handleToggleReconciled = async (id: string, currentStatus: boolean) => {
    try {
      const updated = await api.toggleReconciled(id, !currentStatus);
      setTransactions(prev => prev.map(t => 
        t.id === id ? updated : t
      ));
    } catch (err: any) {
      alert('Không thể đối chiếu giao dịch: ' + err.message);
    }
  };

  const handleToggleInvoiced = async (id: string, currentStatus: boolean) => {
    if (user?.role !== 'admin') {
      alert('Chỉ Kế toán mới có quyền xuất hóa đơn!');
      return;
    }
    try {
      const updated = await api.toggleInvoiced(id, !currentStatus);
      setTransactions(prev => prev.map(t => 
        t.id === id ? updated : t
      ));
    } catch (err: any) {
      alert('Không thể cập nhật hóa đơn: ' + err.message);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (user?.role !== 'admin') {
      alert('Chỉ Kế toán mới có quyền xóa giao dịch!');
      return;
    }
    try {
      await api.deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      alert('Không thể xóa giao dịch: ' + err.message);
    }
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="h-16 bg-indigo-900 text-white flex items-center justify-between px-8 border-b border-indigo-950 shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center">
            <span className="text-indigo-900 font-bold text-xl">KA</span>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight uppercase tracking-wider">
              Kim Academy
            </h1>
            <p className="text-[10px] text-indigo-300 uppercase tracking-widest mt-0.5">
              Hệ thống quản lý học phí
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex bg-indigo-950 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('nhap-lieu')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${activeTab === 'nhap-lieu' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-300 hover:text-white hover:bg-indigo-800'}`}
            >
              <Database className="w-4 h-4" />
              Nhập liệu
            </button>
            {user.role === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('bao-cao')}
                  className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${activeTab === 'bao-cao' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-300 hover:text-white hover:bg-indigo-800'}`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Báo cáo
                </button>
                <button
                  onClick={() => setActiveTab('quan-ly-user')}
                  className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${activeTab === 'quan-ly-user' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-300 hover:text-white hover:bg-indigo-800'}`}
                >
                  <Users className="w-4 h-4" />
                  Quản lý User
                </button>
              </>
            )}
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-[10px] text-indigo-300 uppercase tracking-tighter">
              {user.username === 'admin' ? 'Quản trị viên hệ thống' : user.role === 'admin' ? 'Kế toán trưởng • Admin' : 'Nhân viên tài vụ • Phòng 102'}
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-950 hover:bg-indigo-850 hover:text-red-400 text-indigo-300 border border-indigo-800/60 transition-colors cursor-pointer"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 sm:px-8 py-8 overflow-auto">
        {isDataLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-medium">Đang đồng bộ dữ liệu đám mây...</p>
            </div>
          </div>
        ) : activeTab === 'nhap-lieu' ? (
          <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] xl:grid-cols-[450px_1fr] gap-8 h-full">
            
            {/* Left Column: Form */}
            <div className="flex flex-col gap-6">
              <TransactionForm onSubmit={handleAddTransaction} />
              
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 text-sm text-indigo-800">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-200 text-indigo-900 text-xs text-center border border-indigo-300">ℹ</span>
                  Hướng dẫn quy trình
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 ml-1">
                  <li><span className="font-medium">Nhập liệu:</span> NVVP nhập khoản thu khi có biến động.</li>
                  <li><span className="font-medium">Đối chiếu:</span> Đánh dấu <Check className="w-3 h-3 inline text-emerald-600 mx-0.5" /> sau khi khớp số liệu.</li>
                  <li><span className="font-medium">Báo cáo:</span> Gửi Kế toán trước 21h.</li>
                  <li><span className="font-medium">Xuất HĐ:</span> Kế toán đánh dấu hoàn tất.</li>
                </ol>
              </div>
            </div>

            {/* Right Column: Table */}
            <div className="flex flex-col min-h-[600px] pb-8">
               <TransactionTable 
                 transactions={transactions}
                 onToggleReconciled={handleToggleReconciled}
                 onToggleInvoiced={handleToggleInvoiced}
                 onDeleteTransaction={handleDeleteTransaction}
                 onGenerateReport={() => setShowReportModal(true)}
                 userRole={user.role}
               />
            </div>

          </div>
        ) : activeTab === 'quan-ly-user' ? (
          <div className="h-full">
            <UserManagement currentUserUsername={user.username} />
          </div>
        ) : (
          <div className="h-full">
            <ReportsDashboard transactions={transactions} />
          </div>
        )}
      </main>

      {showReportModal && (
        <DailyReportModal 
          transactions={transactions}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
