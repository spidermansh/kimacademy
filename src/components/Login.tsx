import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string, user: { username: string; name: string; role: string }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');

  // Fetch logo from settings (public endpoint, no auth needed)
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data?.logoUrl) setLogoUrl(data.logoUrl);
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Đăng nhập không thành công');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Không thể kết nối đến máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (userType: 'staff' | 'accountant' | 'admin') => {
    setError('');
    const user = userType === 'staff' ? 'nvvp' : userType === 'accountant' ? 'ketoan' : 'admin';
    setUsername(user);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-radial from-slate-900 via-indigo-950 to-slate-950 px-4 py-12 relative overflow-hidden font-sans">
      
      {/* Dynamic Background Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none delay-1000"></div>
      
      {/* Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000000d_1px,transparent_1px),linear-gradient(to_bottom,#0000000d_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        
        {/* Logo / Header */}
        <div className="text-center mb-8">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Kim Academy Logo"
              className="w-20 h-20 object-contain mx-auto mb-4 rounded-2xl shadow-xl shadow-indigo-900/40 border border-indigo-100/20 bg-white p-1"
            />
          ) : (
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white text-indigo-950 rounded-2xl shadow-xl shadow-indigo-900/40 mb-4 border border-indigo-100/20">
              <span className="font-extrabold text-3xl tracking-tighter">KA</span>
            </div>
          )}
          <h1 className="text-2xl font-black text-white uppercase tracking-wider">
            Kim Academy
          </h1>
          <p className="text-xs text-indigo-300 uppercase tracking-widest mt-1">
            Hệ thống Quản lý Trung tâm
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 relative">
          
          <h2 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Đăng nhập hệ thống
          </h2>

          {error && (
            <div className="mb-6 flex items-center gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-900/50 text-red-200 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tên đăng nhập</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="VD: ketoan, nvvp"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none outline-none text-slate-200 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Mật khẩu</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none outline-none text-slate-200 text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-bold py-2.5 px-4 rounded-lg shadow-lg shadow-indigo-900/30 transition-all text-sm group"
            >
              {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
              {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
            </button>
          </form>

          {/* Quick Login Section */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
              Dành cho Người kiểm thử (Quick Login)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('staff')}
                className="flex flex-col items-center justify-center p-2.5 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800/60 rounded-xl transition-all cursor-pointer group"
              >
                <span className="text-[11px] font-bold text-slate-300 group-hover:text-indigo-400">Nhân viên VP</span>
                <span className="text-[9px] text-slate-500 mt-1">nvvp</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('accountant')}
                className="flex flex-col items-center justify-center p-2.5 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800/60 rounded-xl transition-all cursor-pointer group"
              >
                <span className="text-[11px] font-bold text-slate-300 group-hover:text-indigo-400">Kế toán</span>
                <span className="text-[9px] text-slate-500 mt-1">ketoan</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="flex flex-col items-center justify-center p-2.5 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800/60 rounded-xl transition-all cursor-pointer group"
              >
                <span className="text-[11px] font-bold text-slate-300 group-hover:text-indigo-400">Admin</span>
                <span className="text-[9px] text-slate-500 mt-1">admin</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer — Credit & Version */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-slate-500 text-[10px]">
            Phát triển bởi: <span className="text-slate-400">Bùi Trần Sơn Hải</span> & <span className="text-slate-400">Antigravity</span>
          </p>
          <p className="text-slate-600 text-[10px]">
            Ver: 1.1 · Kim Academy © 2026
          </p>
        </div>
        
      </div>
    </div>
  );
}
