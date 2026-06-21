import React, { useState } from 'react';
import { 
  GraduationCap, Users, BookOpen, CalendarDays, Wallet, 
  DollarSign, Receipt, PhoneCall, Briefcase, ClipboardCheck, 
  HandCoins, Calculator, BarChart3, Clock, HelpCircle, 
  Settings as SettingsIcon, LogOut, ChevronLeft, ChevronRight,
  ChevronDown, LayoutDashboard, UserPlus, Package, TrendingUp
} from 'lucide-react';
import { AppSettings } from '../../shared/types';

export type TabId = 
  | 'ban-lam-viec' | 'tuyen-sinh' | 'quan-ly-hoc-vien' | 'quan-ly-lop' | 'diem-danh'
  | 'thu-tien' | 'chi-phi' | 'hoc-phi' | 'nhac-ph' | 'inventory'
  | 'staff-list' | 'cham-cong' | 'ung-luong' | 'bang-luong'
  | 'bc-dashboard' | 'bc-student' | 'bc-class' | 'bc-tuition' | 'bc-finance' | 'bc-staff' | 'bc-audit' | 'bc-leads'
  | 'huong-dan' | 'quan-ly-user' | 'cai-dat' | 'gv-home';

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  color: string;
  adminOnly?: boolean;
  hiddenForTeacher?: boolean;
  teacherOnly?: boolean;
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

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  settings: AppSettings | null;
  currentUser: { username: string; name: string; role: string };
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  onLogout: () => void;
}

const NAV_MODULES: NavModule[] = [
  {
    id: 'tuyen-sinh-module',
    label: 'Tuyển sinh',
    icon: <UserPlus className="w-4 h-4" />,
    color: 'pink',
    hiddenForTeacher: true,
    items: [
      { id: 'tuyen-sinh', label: 'Tuyển sinh', icon: <UserPlus className="w-5 h-5" />, color: 'pink' },
    ],
  },
  {
    id: 'hoc-vu',
    label: 'Quản lý Học vụ',
    icon: <GraduationCap className="w-4 h-4" />,
    color: 'blue',
    items: [
      { id: 'gv-home',          label: 'Trang GV',    icon: <GraduationCap className="w-5 h-5" />, color: 'teal', teacherOnly: true },
      { id: 'quan-ly-hoc-vien', label: 'Học viên',     icon: <Users className="w-5 h-5" />,         color: 'blue', hiddenForTeacher: true },
      { id: 'quan-ly-lop',      label: 'Lớp học',     icon: <BookOpen className="w-5 h-5" />,      color: 'violet', hiddenForTeacher: true },
      { id: 'diem-danh',        label: 'Điểm danh',   icon: <CalendarDays className="w-5 h-5" />,  color: 'amber' },
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
    id: 'kho-vat-tu',
    label: 'Kho vật tư',
    icon: <Package className="w-4 h-4" />,
    color: 'indigo',
    hiddenForTeacher: true,
    items: [
      { id: 'inventory',  label: 'Quản lý kho',  icon: <Package className="w-5 h-5" />,      color: 'indigo' },
    ],
  },
  {
    id: 'nhan-vien',
    label: 'Quản lý Nhân sự',
    icon: <Briefcase className="w-4 h-4" />,
    color: 'orange',
    hiddenForTeacher: true,
    items: [
      { id: 'staff-list', label: 'Nhân viên',    icon: <Briefcase className="w-5 h-5" />,      color: 'orange' },
      { id: 'cham-cong',  label: 'Chấm công GV & TG', icon: <ClipboardCheck className="w-5 h-5" />, color: 'amber' },
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
      { id: 'bc-dashboard', label: 'Tổng quan trung tâm', icon: <BarChart3 className="w-5 h-5" />, color: 'rose' },
      { id: 'bc-student',   label: 'Học viên',            icon: <Users className="w-5 h-5" />,      color: 'blue' },
      { id: 'bc-class',     label: 'Lớp học & điểm danh',  icon: <BookOpen className="w-5 h-5" />,   color: 'violet' },
      { id: 'bc-tuition',   label: 'Học phí & công nợ',    icon: <Wallet className="w-5 h-5" />,     color: 'cyan' },
      { id: 'bc-finance',   label: 'Thu chi & lợi nhuận',  icon: <TrendingUp className="w-5 h-5" from="lucide" /> as any, color: 'emerald' },
      { id: 'bc-staff',     label: 'Nhân sự & giáo viên',  icon: <Briefcase className="w-5 h-5" />,  color: 'orange' },
      { id: 'bc-audit',     label: 'Đối soát & nhật ký',   icon: <Clock className="w-5 h-5" />,      color: 'slate' },
      { id: 'bc-leads',     label: 'Tuyển sinh',          icon: <PhoneCall className="w-5 h-5" />,  color: 'pink' },
    ],
  },
];

const SYSTEM_ITEMS: NavItem[] = [
  { id: 'huong-dan',   label: 'Hướng dẫn',   icon: <HelpCircle className="w-5 h-5" />, color: 'cyan' },
  { id: 'quan-ly-user', label: 'Người dùng', icon: <Users className="w-5 h-5" />,        color: 'slate', adminOnly: true },
  { id: 'cai-dat',      label: 'Cài đặt',    icon: <SettingsIcon className="w-5 h-5" />, color: 'indigo', adminOnly: true },
];

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

export default function Sidebar({
  activeTab,
  onTabChange,
  settings,
  currentUser,
  sidebarCollapsed,
  setSidebarCollapsed,
  onLogout
}: SidebarProps) {
  const isTeacher = currentUser.role === 'teacher' || currentUser.role === 'teaching_assistant';
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  return (
    <aside
      className={`
        flex flex-col h-full
        bg-gradient-to-b from-slate-900 to-slate-950
        border-r border-slate-700/50
        transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'w-[68px]' : 'w-[220px]'}
        shadow-2xl shrink-0
      `}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-700/50 shrink-0 ${sidebarCollapsed ? 'justify-center px-2' : ''}`}>
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
        <div className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          <p className="text-white font-bold text-sm leading-tight whitespace-nowrap">
            {settings?.centerName || 'Kim Academy'}
          </p>
          <p className="text-slate-400 text-[10px] whitespace-nowrap">Quản lý Trung tâm</p>
        </div>
      </div>

      {/* Nav items — Module Groups */}
      <nav className="flex-1 py-3 space-y-1 px-2 overflow-y-auto overflow-x-hidden">
        {/* Bàn làm việc — chỉ hiển thị với non-teachers */}
        {!isTeacher && (
          <div className="mb-3">
            <button
              onClick={() => onTabChange('ban-lam-viec')}
              title={sidebarCollapsed ? 'Bàn làm việc' : undefined}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 group relative cursor-pointer
                ${activeTab === 'ban-lam-viec'
                  ? 'bg-indigo-500/20 text-indigo-300 border-l-2 border-indigo-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }
                ${sidebarCollapsed ? 'justify-center px-2' : ''}
              `}
            >
              <span className={`shrink-0 transition-colors ${activeTab === 'ban-lam-viec' ? 'text-indigo-300' : 'text-indigo-400'}`}>
                <LayoutDashboard className="w-5 h-5" />
              </span>
              <span className={`overflow-hidden transition-all duration-300 whitespace-nowrap ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                Bàn làm việc
              </span>
              {sidebarCollapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-slate-700">
                  Bàn làm việc
                </span>
              )}
            </button>
          </div>
        )}

        {NAV_MODULES.map(mod => {
          // Module visibility
          if (mod.adminOnly && currentUser.role !== 'admin') return null;
          if (mod.hiddenForTeacher && isTeacher) return null;

          const visibleItems = mod.items.filter(item => {
            if (item.adminOnly && currentUser.role !== 'admin') return false;
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
                    transition-colors duration-150 cursor-pointer
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
                        onClick={() => onTabChange(item.id)}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium
                          transition-all duration-150 group relative cursor-pointer
                          ${isActive
                            ? ACTIVE_COLORS[color]
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                          }
                          ${sidebarCollapsed ? 'justify-center px-2' : ''}
                        `}
                      >
                        <span className={`shrink-0 transition-colors ${isActive ? '' : ICON_COLORS[color]}`}>
                          {item.icon}
                        </span>
                        <span className={`overflow-hidden transition-all duration-300 whitespace-nowrap ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
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
        {currentUser.role === 'admin' && (
          <>
            {!sidebarCollapsed && (
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 pb-1.5 pt-3">
                Hệ thống
              </p>
            )}
            {SYSTEM_ITEMS.map(item => {
              const isActive = activeTab === item.id;
              const color = item.color || 'slate';
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-150 group relative cursor-pointer
                    ${isActive
                      ? ACTIVE_COLORS[color]
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    }
                    ${sidebarCollapsed ? 'justify-center px-2' : ''}
                  `}
                >
                  <span className={`shrink-0 transition-colors ${isActive ? '' : ICON_COLORS[color]}`}>
                    {item.icon}
                  </span>
                  <span className={`overflow-hidden transition-all duration-300 whitespace-nowrap ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
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
        <div className={`flex items-center gap-2.5 px-1 ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-indigo-600/30 border border-indigo-500/40 rounded-full flex items-center justify-center shrink-0">
            <span className="text-indigo-300 text-xs font-bold font-sans">
              {currentUser.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>
            <p className="text-white text-xs font-semibold truncate">{currentUser.name}</p>
            <p className="text-slate-400 text-[10px] truncate">
              {currentUser.role === 'admin' ? '👑 Quản trị viên' : currentUser.role === 'teacher' ? '👩‍🏫 Giáo viên' : currentUser.role === 'teaching_assistant' ? '👩‍🏫 Trợ giảng' : '👤 Nhân viên'}
            </p>
          </div>
        </div>

        <div className={`flex gap-1.5 ${sidebarCollapsed ? 'flex-col' : ''}`}>
          <button
            onClick={onLogout}
            title="Đăng xuất"
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'hidden' : ''}`}>Đăng xuất</span>
          </button>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
            className="hidden md:flex items-center justify-center w-8 h-8 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
