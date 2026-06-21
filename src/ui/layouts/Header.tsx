import React from 'react';
import { Menu, GraduationCap, X, Wallet } from 'lucide-react';
import { Student, Class, Transaction, AppSettings } from '../../shared/types';
import NotificationCenter from '../components/NotificationCenter';

interface HeaderProps {
  title: string;
  subtitle: string;
  activeIcon: React.ReactNode;
  activeColor: string;
  students: Student[];
  classes: Class[];
  transactions: Transaction[];
  settings: AppSettings | null;
  currentUser: { username: string; name: string; role: string };
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  onTabChange: (tabId: any) => void;
}

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

export default function Header({
  title,
  subtitle,
  activeIcon,
  activeColor,
  students,
  classes,
  transactions,
  settings,
  currentUser,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  onTabChange
}: HeaderProps) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  const activeStudentsCount = students.filter(
    s => s.status === 'active' || (!s.status && s.className)
  ).length;

  const currentMonthTxCount = transactions.filter(
    t => t.paymentDate && t.paymentDate.startsWith(currentMonth)
  ).length;

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-4 sm:px-6 shadow-sm shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Page title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`text-slate-400 shrink-0 ${ICON_COLORS[activeColor] || 'text-indigo-500'}`}>
          {activeIcon}
        </span>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-slate-800 leading-tight truncate">
            {title}
          </h1>
          <p className="text-[10px] text-slate-400 hidden sm:block truncate">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Stats chips + notification bell */}
      <div className="hidden lg:flex items-center gap-2 ml-auto">
        <span className="text-[11px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-semibold">
          {activeStudentsCount} học viên đang học
        </span>
        <span className="text-[11px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-semibold">
          {classes.length} lớp học
        </span>
        <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">
          {currentMonthTxCount} giao dịch tháng này
        </span>
        <NotificationCenter onNavigate={(tab) => onTabChange(tab)} />
      </div>

      {/* Mobile/Tablet notification bell */}
      <div className="ml-auto lg:hidden flex items-center gap-2">
        <NotificationCenter onNavigate={(tab) => onTabChange(tab)} />
        <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 md:hidden">
          <span className="text-indigo-700 text-xs font-bold font-sans">
            {currentUser.name.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}
