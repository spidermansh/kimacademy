import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Student, Expense } from '../types';
import { api, formatCurrency, formatDate } from '../utils';
import {
  Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, PieChart, Pie, LineChart, Line, Legend,
} from 'recharts';
import * as XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Download, Search, User, CreditCard, Calendar, CheckCircle,
  LayoutDashboard, BarChart2, BookOpen, Users, TrendingUp,
  Wallet, AlertTriangle, CalendarDays, ArrowUpRight, ArrowDownRight,
  DollarSign, Clock, CheckCircle2, XCircle, FileText, Target, Pencil, Save,
  Briefcase, GraduationCap, PieChart as PieChartIcon, Activity,
} from 'lucide-react';

type ReportTabKey = 'dashboard' | 'hoc-vien' | 'lop' | 'tai-chinh' | 'pnl' | 'cong-no' | 'hieu-suat-gv' | 'tuyen-sinh' | 'si-so' | 'dt-lop' | 'chuyen-can' | 'cp-nhan-su';

interface Props {
  transactions: Transaction[];
  students: Student[];
  expenses?: Expense[];
  initialTab?: ReportTabKey;
}

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl text-xs">
        {label && <p className="font-bold text-slate-600 mb-1">{label}</p>}
        {payload.map((p: any, i: number) => (
          <p key={i} className="font-semibold" style={{ color: p.color || p.fill }}>
            {p.name}: {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function StatCard({ label, value, sub, color = 'indigo', icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode
}) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    violet: 'bg-violet-50 border-violet-200 text-violet-900',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-900',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color] || colors.indigo} shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-2">{label}</p>
          <p className="text-2xl font-black">{value}</p>
          {sub && <p className="text-xs mt-1.5 opacity-60 font-medium">{sub}</p>}
        </div>
        {icon && <div className="opacity-20 mt-1">{icon}</div>}
      </div>
    </div>
  );
}

export default function ReportsDashboard({ transactions, students = [], expenses = [], initialTab }: Props) {
  const [activeTab, setActiveTab] = useState<ReportTabKey>(initialTab || 'dashboard');

  // Sync with sidebar navigation
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // ── Staff/Salary Data ──────────────────────────────────────────────────────
  const [staffData, setStaffData] = useState<any[]>([]);
  const [salaryData, setSalaryData] = useState<any[]>([]);
  const [classesData, setClassesData] = useState<any[]>([]);
  const [teachingLogs, setTeachingLogs] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.getStaff(),
      api.getClasses(),
    ]).then(([st, cl]) => {
      setStaffData(st);
      setClassesData(cl);
    }).catch(() => {});
  }, []);

  // Fetch salary data for P&L and HR cost reports — 6 months
  const [allSalaryData, setAllSalaryData] = useState<any[]>([]);
  useEffect(() => {
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const currentMonthKey = months[months.length - 1];
    Promise.all([
      ...months.map(m => api.getMonthlySalaries({ month: m })),
      api.getTeachingLogs({ month: currentMonthKey }),
    ]).then(results => {
      const tl = results.pop();
      const allSal = results.flat();
      setAllSalaryData(allSal);
      // Current month salary for CP Nhân sự tab
      setSalaryData(allSal.filter((s: any) => s.month === currentMonthKey));
      setTeachingLogs(tl);
    }).catch(() => {});
  }, []);

  // ── Revenue Target ─────────────────────────────────────────────────────────
  const [revenueTarget, setRevenueTarget] = useState(() => {
    try { return Number(localStorage.getItem('kim_revenue_target')) || 0; } catch { return 0; }
  });
  const [editingTarget, setEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState('');

  const saveRevenueTarget = (val: number) => {
    setRevenueTarget(val);
    localStorage.setItem('kim_revenue_target', String(val));
    setEditingTarget(false);
  };

  // ── Attendance (for student report) ─────────────────────────────────────────
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  useEffect(() => {
    api.getAttendance().then(setAllAttendance).catch(() => {});
  }, []);

  // ── Overview state ───────────────────────────────────────────────────────────
  const [reportType, setReportType] = useState<'day' | 'month' | 'range'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // ── Student report state ─────────────────────────────────────────────────────
  const [selectedStudentName, setSelectedStudentName] = useState('');
  // Dashboard "show more" toggle
  const [showAllRecentTx, setShowAllRecentTx] = useState(false);
  // Chuyên cần class filter
  const [attendanceClassFilter, setAttendanceClassFilter] = useState('');

  // ── Filtered transactions (general) ─────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (reportType === 'day')   return t.paymentDate === selectedDate;
      if (reportType === 'month') return t.paymentDate.startsWith(selectedMonth);
      return t.paymentDate >= startDate && t.paymentDate <= endDate;
    });
  }, [transactions, reportType, selectedDate, selectedMonth, startDate, endDate]);

  const totalRevenue = filteredTransactions.reduce((s, t) => s + t.amount, 0);

  const byCategory = useMemo(() => {
    const m: Record<string, number> = {};
    filteredTransactions.forEach(t => { m[t.revenueCategory] = (m[t.revenueCategory] || 0) + t.amount; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Monthly revenue trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      months.push(d.toISOString().slice(0, 7));
    }
    return months.map(m => ({
      month: m.slice(5) + '/' + m.slice(0, 4),
      revenue: transactions.filter(t => t.paymentDate.startsWith(m)).reduce((s, t) => s + t.amount, 0),
    }));
  }, [transactions]);

  // ── Dashboard KPIs ───────────────────────────────────────────────────────────
  const currentMonth = new Date().toISOString().slice(0, 7);
  const prevMonth    = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();

  const revenueThisMonth = transactions.filter(t => t.paymentDate.startsWith(currentMonth)).reduce((s, t) => s + t.amount, 0);
  const revenueLastMonth = transactions.filter(t => t.paymentDate.startsWith(prevMonth)).reduce((s, t) => s + t.amount, 0);
  const revenueGrowth = revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100).toFixed(1) : '—';

  const totalStudents   = students.length;
  const activeStudents  = students.filter(s => s.status === 'active' || (!s.status && s.className)).length;

  // Students near session end (≤ 2 buổi còn)
  const nearEndStudents = useMemo(() => {
    return students.filter(s => {
      const fee = Number(s.feePerSession) || 0;
      if (fee === 0) return false;
      const paid = transactions
        .filter(t => t.studentName?.toLowerCase() === s.name?.toLowerCase() && t.revenueCategory === 'Học phí offline')
        .reduce((sum, t) => sum + t.amount, 0);
      const bought = Math.floor(paid / fee);
      const used = allAttendance.filter(a =>
        (a.studentId === s.id || a.studentName?.toLowerCase() === s.name?.toLowerCase()) && a.status === 'present'
      ).length;
      return bought - used <= 2 && bought > 0;
    });
  }, [students, transactions, allAttendance]);

  // ── Student report ────────────────────────────────────────────────────────────
  const studentProfile = useMemo(() =>
    students.find(s => s.name.toLowerCase() === selectedStudentName.toLowerCase().trim()),
  [students, selectedStudentName]);

  const studentTransactions = useMemo(() =>
    transactions
      .filter(t => t.studentName.toLowerCase() === selectedStudentName.toLowerCase().trim())
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)),
  [transactions, selectedStudentName]);

  const studentAttendance = useMemo(() =>
    allAttendance
      .filter(a =>
        a.studentId === studentProfile?.id ||
        a.studentName?.toLowerCase() === selectedStudentName.toLowerCase().trim()
      )
      .sort((a, b) => b.date.localeCompare(a.date)),
  [allAttendance, studentProfile, selectedStudentName]);

  const studentTotalPaid    = studentTransactions.reduce((s, t) => s + t.amount, 0);
  const studentOfflinePaid  = studentTransactions.filter(t => t.revenueCategory === 'Học phí offline').reduce((s, t) => s + t.amount, 0);
  const feePerSession       = Number(studentProfile?.feePerSession) || 0;
  const sessionsBought      = feePerSession > 0 ? Math.floor(studentOfflinePaid / feePerSession) : 0;
  const sessionsUsed        = studentAttendance.filter(a => a.status !== 'excused').length;
  const sessionsRemaining   = sessionsBought - sessionsUsed;
  const moneyRemaining      = sessionsRemaining * feePerSession;

  // ── Class report ──────────────────────────────────────────────────────────────
  const classReport = useMemo(() => {
    const map: Record<string, { revenue: number; count: number; studentNames: Set<string> }> = {};
    transactions.forEach(t => {
      const cls = t.className || 'Không rõ lớp';
      if (!map[cls]) map[cls] = { revenue: 0, count: 0, studentNames: new Set() };
      map[cls].revenue += t.amount;
      map[cls].count++;
      if (t.studentName) map[cls].studentNames.add(t.studentName);
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, revenue: d.revenue, transactions: d.count, students: d.studentNames.size }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [transactions]);

  // ── Financial report ──────────────────────────────────────────────────────────
  const paymentMethodBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    transactions.forEach(t => { m[t.paymentMethod] = (m[t.paymentMethod] || 0) + t.amount; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const monthlyByCategory = useMemo(() => {
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      months.push(d.toISOString().slice(0, 7));
    }
    const cats = [...new Set(transactions.map(t => t.revenueCategory))].slice(0, 4);
    return months.map(m => {
      const row: any = { month: m.slice(5) + '/' + m.slice(2, 4) };
      cats.forEach(c => {
        row[c] = transactions.filter(t => t.paymentDate.startsWith(m) && t.revenueCategory === c).reduce((s, t) => s + t.amount, 0);
      });
      return row;
    });
  }, [transactions]);

  const allCategories = [...new Set(transactions.map(t => t.revenueCategory))].slice(0, 4);

  // ── Excel exports ─────────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const data = filteredTransactions.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate)).map((t, i) => ({
      'STT': i + 1, 'NGÀY THU': t.paymentDate, 'NỘI DUNG': t.revenueCategory,
      'HỌC VIÊN': t.studentName, 'LỚP': t.className || '', 'SỐ TIỀN': t.amount,
      'HÌNH THỨC': t.paymentMethod, 'GHI CHÚ': t.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const headerStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4F46E5' } }, alignment: { horizontal: 'center' } };
    for (let k in ws) { if (k[0] === '!') continue; if (k.replace(/[A-Z]/g, '') === '1') ws[k].s = headerStyle; if (!k.replace(/[A-Z]/g, '').startsWith('1') && k.startsWith('F')) ws[k].z = '#,##0'; }
    ws['!cols'] = [{wch:5},{wch:14},{wch:22},{wch:22},{wch:14},{wch:15},{wch:15},{wch:30}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BaoCaoThu');
    XLSX.writeFile(wb, `BaoCaoThu_${reportType === 'month' ? selectedMonth : selectedDate}.xlsx`);
  };

  // ── PDF Export ─────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Kim Academy', pageWidth / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('BAO CAO DOANH THU THANG', pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    const monthLabel = reportType === 'month' ? selectedMonth : reportType === 'day' ? selectedDate : `${startDate} - ${endDate}`;
    doc.text(`Ky: ${monthLabel}`, pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text(`Ngay xuat: ${new Date().toLocaleDateString('vi-VN')}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Summary box
    doc.setDrawColor(79, 70, 229);
    doc.setFillColor(238, 242, 255);
    doc.roundedRect(14, y, pageWidth - 28, 28, 3, 3, 'FD');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    const summaryCol = (pageWidth - 28) / 4;
    doc.text('Tong doanh thu', 20, y + 8);
    doc.setFontSize(12);
    doc.text(formatCurrency(totalRevenue), 20, y + 16);
    doc.setFontSize(9);
    doc.text('So giao dich', 20 + summaryCol, y + 8);
    doc.setFontSize(12);
    doc.text(String(filteredTransactions.length), 20 + summaryCol, y + 16);
    doc.setFontSize(9);
    doc.text('Tien mat', 20 + summaryCol * 2, y + 8);
    doc.setFontSize(12);
    const cashTotal = filteredTransactions.filter(t => t.paymentMethod === 'Tiền mặt').reduce((s, t) => s + t.amount, 0);
    doc.text(formatCurrency(cashTotal), 20 + summaryCol * 2, y + 16);
    doc.setFontSize(9);
    doc.text('Chuyen khoan', 20 + summaryCol * 3, y + 8);
    doc.setFontSize(12);
    doc.text(formatCurrency(totalRevenue - cashTotal), 20 + summaryCol * 3, y + 16);
    y += 35;

    doc.setTextColor(0, 0, 0);

    // Revenue by category
    if (byCategory.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Phan bo theo loai khoan thu', 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Loai khoan thu', 'So tien', 'Ty le']],
        body: byCategory.map(c => [
          c.name,
          formatCurrency(c.value),
          totalRevenue > 0 ? ((c.value / totalRevenue) * 100).toFixed(1) + '%' : '0%',
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // Transaction list
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Chi tiet giao dich', 14, y);
    y += 4;
    const txData = filteredTransactions
      .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))
      .map((t, i) => [
        String(i + 1),
        t.paymentDate,
        t.studentName,
        t.className || '',
        t.revenueCategory,
        formatCurrency(t.amount),
        t.paymentMethod,
      ]);
    autoTable(doc, {
      startY: y,
      head: [['STT', 'Ngay', 'Hoc vien', 'Lop', 'Noi dung', 'So tien', 'Hinh thuc']],
      body: txData,
      styles: { fontSize: 7, cellPadding: 2.5 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 20 },
        5: { halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
      foot: [['', '', '', '', 'TONG', formatCurrency(totalRevenue), '']],
      footStyles: { fillColor: [238, 242, 255], textColor: [79, 70, 229], fontStyle: 'bold' },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`Kim Academy - Bao cao doanh thu | Trang ${i}/${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
    }

    doc.save(`BaoCaoDoanhThu_${monthLabel.replace(/\//g, '-')}.pdf`);
  };

  const handleExportStudentExcel = () => {
    if (!studentTransactions.length) return;
    const data = studentTransactions.map((t, i) => ({
      'STT': i + 1, 'NGÀY ĐÓNG': t.paymentDate, 'KỲ HỌC': t.term,
      'NỘI DUNG': t.revenueCategory, 'SỐ TIỀN': t.amount, 'HÌNH THỨC': t.paymentMethod,
      'ĐỐI CHIẾU': t.isReconciled ? 'Đã khớp' : 'Chờ', 'HÓA ĐƠN': t.isInvoiced ? 'Đã xuất' : 'Chưa',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LichSuDong');
    XLSX.writeFile(wb, `BaoCao_${(studentProfile?.vietnameseName || selectedStudentName).replace(/\s/g, '_')}.xlsx`);
  };

  const TAB_GROUPS = [
    { label: 'Tổng quan', tabs: [
      { key: 'dashboard',  label: '📊 Dashboard',        icon: <LayoutDashboard className="w-4 h-4" /> },
    ]},
    { label: 'Tài chính', tabs: [
      { key: 'tai-chinh',  label: '💰 Doanh thu',        icon: <TrendingUp className="w-4 h-4" /> },
      { key: 'pnl',        label: '📈 P&L',              icon: <TrendingUp className="w-4 h-4" /> },
      { key: 'cong-no',    label: '⚠️ Công nợ',          icon: <AlertTriangle className="w-4 h-4" /> },
      { key: 'dt-lop',     label: '💵 DT/Lớp',           icon: <DollarSign className="w-4 h-4" /> },
      { key: 'cp-nhan-su', label: '👔 CP Nhân sự',       icon: <Briefcase className="w-4 h-4" /> },
    ]},
    { label: 'Học vụ', tabs: [
      { key: 'hoc-vien',   label: '👤 Học viên',         icon: <Users className="w-4 h-4" /> },
      { key: 'lop',        label: '🏫 Lớp',              icon: <BookOpen className="w-4 h-4" /> },
      { key: 'hieu-suat-gv',label:'🎓 Hiệu suất GV',    icon: <GraduationCap className="w-4 h-4" /> },
      { key: 'chuyen-can', label: '📅 Chuyên cần',       icon: <CalendarDays className="w-4 h-4" /> },
      { key: 'si-so',      label: '📋 Sĩ số',            icon: <BookOpen className="w-4 h-4" /> },
      { key: 'tuyen-sinh', label: '📥 Tuyển sinh',       icon: <ArrowUpRight className="w-4 h-4" /> },
    ]},
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Báo cáo & Thống kê</h2>
          <p className="text-sm text-slate-500 mt-1">Tổng hợp dữ liệu trung tâm Kim Academy</p>
        </div>
      </div>

      {/* Tab nav — grouped */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm space-y-1">
        {TAB_GROUPS.map((group, gi) => (
          <div key={gi} className="flex items-center gap-1 flex-wrap">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest w-16 shrink-0 text-right pr-2">{group.label}</span>
            <div className="h-4 w-px bg-slate-200" />
            {group.tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* ══ DASHBOARD ══════════════════════════════════════════════════════════ */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Doanh thu tháng này"
              value={formatCurrency(revenueThisMonth)}
              sub={revenueLastMonth > 0 ? `Tháng trước: ${formatCurrency(revenueLastMonth)}` : ''}
              color="indigo"
              icon={<DollarSign className="w-12 h-12" />}
            />
            <StatCard
              label="Tăng trưởng doanh thu"
              value={typeof revenueGrowth === 'string' ? revenueGrowth : `${revenueGrowth}%`}
              sub={revenueGrowth !== '—' && Number(revenueGrowth) >= 0 ? '📈 Tăng so tháng trước' : '📉 Giảm so tháng trước'}
              color={Number(revenueGrowth) >= 0 ? 'emerald' : 'red'}
              icon={<TrendingUp className="w-12 h-12" />}
            />
            <StatCard
              label="Tổng học viên"
              value={totalStudents}
              sub={`${activeStudents} học viên đang học`}
              color="violet"
              icon={<Users className="w-12 h-12" />}
            />
            <StatCard
              label="Sắp hết buổi (≤ 2)"
              value={nearEndStudents.length}
              sub={nearEndStudents.length > 0 ? 'Cần nhắc đóng tiền!' : 'Không có'}
              color={nearEndStudents.length > 0 ? 'amber' : 'emerald'}
              icon={<AlertTriangle className="w-12 h-12" />}
            />
          </div>

          {/* Revenue Target Progress + Month Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Revenue Target */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> Mục tiêu doanh thu tháng
                </h3>
                {!editingTarget ? (
                  <button
                    onClick={() => { setEditingTarget(true); setTempTarget(String(revenueTarget || '')); }}
                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 cursor-pointer transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    {revenueTarget > 0 ? 'Sửa' : 'Đặt mục tiêu'}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      placeholder="VD: 50000000"
                      value={tempTarget}
                      onChange={e => setTempTarget(e.target.value)}
                      className="w-32 px-2 py-1 border border-indigo-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && saveRevenueTarget(Number(tempTarget))}
                    />
                    <button
                      onClick={() => saveRevenueTarget(Number(tempTarget))}
                      className="p-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
                    >
                      <Save className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {revenueTarget > 0 ? (() => {
                const progress = Math.min((revenueThisMonth / revenueTarget) * 100, 100);
                const remaining = Math.max(revenueTarget - revenueThisMonth, 0);
                const isAchieved = revenueThisMonth >= revenueTarget;
                return (
                  <div>
                    <div className="flex items-end justify-between mb-2">
                      <div>
                        <p className="text-2xl font-black text-slate-800">{formatCurrency(revenueThisMonth)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">/ {formatCurrency(revenueTarget)}</p>
                      </div>
                      <span className={`text-lg font-black ${isAchieved ? 'text-emerald-600' : progress >= 70 ? 'text-amber-600' : 'text-red-500'}`}>
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          isAchieved ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                          progress >= 70 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                          'bg-gradient-to-r from-rose-400 to-rose-600'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className={`text-xs mt-2 font-semibold ${isAchieved ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {isAchieved ? '🎉 Đã đạt mục tiêu!' : `Còn thiếu ${formatCurrency(remaining)}`}
                    </p>
                  </div>
                );
              })() : (
                <div className="text-center py-6 text-slate-300">
                  <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium">Chưa đặt mục tiêu doanh thu</p>
                  <p className="text-[10px] mt-1">Bấm "Đặt mục tiêu" để bắt đầu</p>
                </div>
              )}
            </div>

            {/* Month Comparison */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" /> So sánh tháng này vs tháng trước
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-indigo-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Tháng này</p>
                  <p className="text-lg font-black text-indigo-900 mt-1">{formatCurrency(revenueThisMonth)}</p>
                  <p className="text-[10px] text-indigo-400">{transactions.filter(t => t.paymentDate.startsWith(currentMonth)).length} GD</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tháng trước</p>
                  <p className="text-lg font-black text-slate-700 mt-1">{formatCurrency(revenueLastMonth)}</p>
                  <p className="text-[10px] text-slate-400">{transactions.filter(t => t.paymentDate.startsWith(prevMonth)).length} GD</p>
                </div>
              </div>
              {revenueLastMonth > 0 ? (() => {
                const diff = revenueThisMonth - revenueLastMonth;
                const pct = ((diff / revenueLastMonth) * 100);
                const isUp = diff >= 0;
                return (
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${isUp ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isUp ? 'bg-emerald-100' : 'bg-red-100'}`}>
                      {isUp ? <ArrowUpRight className="w-5 h-5 text-emerald-600" /> : <ArrowDownRight className="w-5 h-5 text-red-600" />}
                    </div>
                    <div>
                      <p className={`font-black text-sm ${isUp ? 'text-emerald-700' : 'text-red-700'}`}>
                        {isUp ? '+' : ''}{pct.toFixed(1)}%
                      </p>
                      <p className={`text-[10px] ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isUp ? 'Tăng' : 'Giảm'} {formatCurrency(Math.abs(diff))} so với tháng trước
                      </p>
                    </div>
                  </div>
                );
              })() : (
                <p className="text-xs text-slate-400 text-center py-2">Chưa có dữ liệu tháng trước để so sánh</p>
              )}
            </div>
          </div>

          {/* Revenue trend + Category pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">📈 Doanh thu 6 tháng gần nhất</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => (v / 1000000).toFixed(1) + 'M'} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4, fill: '#4f46e5' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">🏫 Doanh thu theo lớp (top 5)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={classReport.slice(0, 5)} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Doanh thu" radius={[0, 6, 6, 0]} barSize={20}>
                    {classReport.slice(0, 5).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Near-end students alert */}
          {nearEndStudents.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Học viên sắp hết buổi — cần nhắc đóng tiền
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {nearEndStudents.map(s => {
                  const fee = Number(s.feePerSession) || 0;
                  const paid = transactions.filter(t => t.studentName?.toLowerCase() === s.name?.toLowerCase() && t.revenueCategory === 'Học phí offline').reduce((sum, t) => sum + t.amount, 0);
                  const bought = fee > 0 ? Math.floor(paid / fee) : 0;
                  const used = allAttendance.filter(a => (a.studentId === s.id || a.studentName?.toLowerCase() === s.name?.toLowerCase()) && a.status !== 'excused').length;
                  const remaining = bought - used;
                  return (
                    <div key={s.id} className="bg-white border border-amber-200 rounded-xl px-3 py-2.5">
                      <div className="font-semibold text-slate-800 text-xs">{s.name}</div>
                      <div className="text-[10px] text-slate-400">{s.className}</div>
                      <div className={`text-xs font-bold mt-1 ${remaining <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {remaining <= 0 ? '🔴 Hết buổi!' : `🟡 Còn ${remaining} buổi`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent transactions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">🕐 10 giao dịch gần nhất</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {(() => {
                const sorted = [...transactions].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
                const shown = showAllRecentTx ? sorted.slice(0, 30) : sorted.slice(0, 10);
                return shown.map(t => (
                <div key={t.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50">
                  <div className="text-xs text-slate-400 font-mono w-20 shrink-0">{formatDate(t.paymentDate)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{t.studentName}</div>
                    <div className="text-xs text-slate-400">{t.revenueCategory} · {t.className || '—'}</div>
                  </div>
                  <div className="text-sm font-bold text-emerald-700 shrink-0">+{formatCurrency(t.amount)}</div>
                </div>
              ))})()}
            </div>
            {transactions.length > 10 && (
              <button
                onClick={() => setShowAllRecentTx(!showAllRecentTx)}
                className="w-full py-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors border-t border-slate-100"
              >
                {showAllRecentTx ? 'Thu gọn ▲' : `Xem thêm (${transactions.length} giao dịch) ▼`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══ BÁO CÁO HỌC VIÊN ══════════════════════════════════════════════════ */}
      {activeTab === 'hoc-vien' && (
        <div className="space-y-5">
          {/* Search & Filter */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, tên tiếng Anh, SĐT phụ huynh..."
                  value={selectedStudentName}
                  onChange={e => setSelectedStudentName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              {studentTransactions.length > 0 && (
                <button
                  onClick={handleExportStudentExcel}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Download className="w-4 h-4" /> Xuất Excel học viên
                </button>
              )}
            </div>

            {/* Quick student list — sortable & filterable */}
            {(() => {
              const searchLower = selectedStudentName.toLowerCase().trim();
              const matchedStudents = students.filter(s => {
                if (!searchLower) return true;
                return (
                  s.name?.toLowerCase().includes(searchLower) ||
                  s.englishName?.toLowerCase().includes(searchLower) ||
                  s.vietAnhName?.toLowerCase().includes(searchLower) ||
                  s.vietnameseName?.toLowerCase().includes(searchLower) ||
                  s.parentPhone?.includes(searchLower) ||
                  s.className?.toLowerCase().includes(searchLower)
                );
              });

              // Group by class
              const classGroups: Record<string, typeof matchedStudents> = {};
              matchedStudents.forEach(s => {
                const cls = s.className || 'Chưa xếp lớp';
                if (!classGroups[cls]) classGroups[cls] = [];
                classGroups[cls].push(s);
              });
              // Sort within each class by name
              Object.values(classGroups).forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name, 'vi')));

              const isExactMatch = students.some(s => s.name.toLowerCase() === searchLower);

              // Only show list when NOT an exact match already selected
              if (isExactMatch && searchLower) return null;

              return (
                <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {matchedStudents.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Không tìm thấy học viên</p>
                  ) : (
                    Object.entries(classGroups).sort((a, b) => a[0].localeCompare(b[0], 'vi')).map(([cls, studs]) => (
                      <div key={cls}>
                        <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0">
                          📚 {cls} ({studs.length})
                        </div>
                        {studs.map(s => (
                          <button
                            key={s.id}
                            onClick={() => setSelectedStudentName(s.name)}
                            className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors flex items-center gap-3 text-sm"
                          >
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0">
                              {s.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800 truncate">{s.name}</span>
                                {s.englishName && (
                                  <span className="text-xs text-slate-400 truncate">({s.englishName})</span>
                                )}
                                {s.status === 'suspended' && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">Tạm nghỉ</span>}
                                {s.status === 'left' && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">Đã nghỉ</span>}
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">
                                {s.parentPhone || 'Chưa có SĐT'} · {s.className || 'Chưa xếp lớp'}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              );
            })()}
          </div>

          {!selectedStudentName.trim() ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">Chọn học viên để xem báo cáo chi tiết</p>
              <p className="text-xs text-slate-300 mt-2">Tìm kiếm theo tên, tên tiếng Anh, SĐT phụ huynh hoặc lớp</p>
            </div>
          ) : !studentTransactions.length && !studentAttendance.length ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Không tìm thấy dữ liệu cho "{selectedStudentName}"</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Profile + Finance cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Profile */}
                <div className="lg:col-span-2 bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                    <User className="w-48 h-48" />
                  </div>
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 text-2xl font-black">
                      {(studentProfile?.name || selectedStudentName).charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-black">{studentProfile?.vietAnhName || studentProfile?.name || selectedStudentName}</h3>
                        {studentProfile?.status === 'active' && <span className="text-[9px] bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">🟢 Đang học</span>}
                        {studentProfile?.status === 'suspended' && <span className="text-[9px] bg-amber-500/30 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">🟡 Tạm nghỉ</span>}
                        {studentProfile?.status === 'left' && <span className="text-[9px] bg-red-500/30 text-red-300 border border-red-400/30 px-2 py-0.5 rounded-full font-bold">🔴 Đã nghỉ</span>}
                      </div>
                      {studentProfile?.name && (
                        <p className="text-indigo-300 text-xs mt-0.5">Họ và tên: {studentProfile.name}</p>
                      )}
                      {studentProfile?.englishName && (
                        <p className="text-indigo-300 text-xs">Tên tiếng Anh: {studentProfile.englishName}</p>
                      )}
                      <span className="inline-block mt-1.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border border-indigo-400/30">
                        {studentProfile?.className || studentTransactions[0]?.className || 'Chưa có lớp'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10 text-xs relative z-10">
                    <div>
                      <p className="text-indigo-300 text-[10px] uppercase tracking-wider mb-1">Giới tính</p>
                      <p className="font-semibold">{studentProfile?.gender || '—'}</p>
                    </div>
                    <div>
                      <p className="text-indigo-300 text-[10px] uppercase tracking-wider mb-1">Năm sinh</p>
                      <p className="font-semibold">{studentProfile?.birthYear || '—'}</p>
                    </div>
                    <div>
                      <p className="text-indigo-300 text-[10px] uppercase tracking-wider mb-1">SĐT Phụ huynh</p>
                      <p className="font-semibold font-mono">{studentProfile?.parentPhone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-indigo-300 text-[10px] uppercase tracking-wider mb-1">Ngày nhập học</p>
                      <p className="font-semibold">{studentProfile?.enrollDate ? formatDate(studentProfile.enrollDate) : '—'}</p>
                    </div>
                  </div>
                  {/* Row 2 - extra info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs relative z-10">
                    <div>
                      <p className="text-indigo-300 text-[10px] uppercase tracking-wider mb-1">Email PH</p>
                      <p className="font-semibold truncate">{studentProfile?.parentEmail || '—'}</p>
                    </div>
                    <div>
                      <p className="text-indigo-300 text-[10px] uppercase tracking-wider mb-1">Học phí/buổi</p>
                      <p className="font-semibold text-emerald-300">{studentProfile?.feePerSession ? formatCurrency(studentProfile.feePerSession) : '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-indigo-300 text-[10px] uppercase tracking-wider mb-1">Ghi chú</p>
                      <p className="font-semibold truncate">{studentProfile?.notes || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Finance summary */}
                <div className="space-y-3">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">Tổng tiền đã đóng</p>
                    <p className="text-2xl font-black text-indigo-900">{formatCurrency(studentTotalPaid)}</p>
                    <p className="text-xs text-indigo-600 mt-1">{studentTransactions.length} khoản thu</p>
                  </div>
                  {feePerSession > 0 && (
                    <>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Tiền học phí offline</p>
                        <p className="text-xl font-black text-emerald-900">{formatCurrency(studentOfflinePaid)}</p>
                        <p className="text-xs text-emerald-600 mt-1">{sessionsBought} buổi đã mua · đã học {sessionsUsed} buổi</p>
                      </div>
                      <div className={`border rounded-2xl p-4 shadow-sm ${sessionsRemaining <= 0 ? 'bg-red-50 border-red-200' : sessionsRemaining <= 2 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-500">Tiền / Buổi còn lại</p>
                        <p className={`text-xl font-black ${sessionsRemaining <= 0 ? 'text-red-700' : sessionsRemaining <= 2 ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {formatCurrency(Math.max(0, moneyRemaining))}
                        </p>
                        <p className="text-xs mt-1 font-semibold">
                          {sessionsRemaining <= 0 ? '🔴 Hết buổi!' : sessionsRemaining <= 2 ? `🟡 Còn ${sessionsRemaining} buổi` : `🟢 Còn ${sessionsRemaining} buổi`}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Attendance summary */}
              {studentAttendance.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" /> Lịch sử điểm danh ({studentAttendance.length} buổi)
                    </h4>
                    <div className="flex gap-3 text-xs">
                      <span className="text-emerald-600 font-bold">{studentAttendance.filter(a => a.status === 'present').length} có mặt</span>
                      <span className="text-red-500 font-bold">{studentAttendance.filter(a => a.status === 'absent').length} vắng</span>
                      <span className="text-amber-500 font-bold">{studentAttendance.filter(a => a.status === 'excused').length} phép</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 px-5 py-4 max-h-48 overflow-y-auto">
                    {studentAttendance.map((a, i) => (
                      <span key={i} className={`text-[11px] px-2.5 py-1 rounded-xl border font-semibold flex items-center gap-1 ${
                        a.status === 'present' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : a.status === 'absent' ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                      }`}>
                        {a.status === 'present' ? <CheckCircle2 className="w-3 h-3" /> : a.status === 'absent' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {new Date(a.date + 'T00:00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                        {a.className && <span className="opacity-60">·{a.className}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment history table */}
              {studentTransactions.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" /> Lịch sử đóng tiền
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="text-left px-5 py-3 font-semibold text-slate-500 w-10">STT</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-500">Ngày đóng</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-500">Kỳ học</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-500">Nội dung</th>
                          <th className="text-right px-4 py-3 font-semibold text-slate-500">Số tiền</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-500">Hình thức</th>
                          <th className="text-center px-4 py-3 font-semibold text-slate-500">Đối chiếu</th>
                          <th className="text-center px-4 py-3 font-semibold text-slate-500">Hóa đơn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {studentTransactions.map((t, idx) => (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="px-4 py-3 font-mono text-slate-600">{formatDate(t.paymentDate)}</td>
                            <td className="px-4 py-3 text-slate-600">{t.term}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.revenueCategory.includes('offline') ? 'bg-indigo-50 text-indigo-700' : t.revenueCategory.includes('online') ? 'bg-cyan-50 text-cyan-700' : 'bg-amber-50 text-amber-700'}`}>
                                {t.revenueCategory}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCurrency(t.amount)}</td>
                            <td className="px-4 py-3 text-slate-500">{t.paymentMethod}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-[10px] font-bold ${t.isReconciled ? 'text-emerald-600' : 'text-slate-300'}`}>
                                {t.isReconciled ? '✅ Đã khớp' : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-[10px] font-bold ${t.isInvoiced ? 'text-indigo-600' : 'text-slate-300'}`}>
                                {t.isInvoiced ? '✅ Đã xuất' : '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 border-t-2 border-slate-200">
                          <td colSpan={4} className="px-5 py-3 font-bold text-slate-600 text-xs">TỔNG CỘNG</td>
                          <td className="px-4 py-3 text-right font-black text-indigo-700">{formatCurrency(studentTotalPaid)}</td>
                          <td colSpan={3} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ BÁO CÁO LỚP ═══════════════════════════════════════════════════════ */}
      {activeTab === 'lop' && (
        <div className="space-y-5">
          {/* Class KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Tổng số lớp" value={classReport.length} color="indigo" icon={<BookOpen className="w-12 h-12" />} />
            <StatCard label="Tổng học viên" value={totalStudents} color="violet" icon={<Users className="w-12 h-12" />} />
            <StatCard label="Tổng doanh thu" value={formatCurrency(transactions.reduce((s, t) => s + t.amount, 0))} color="emerald" icon={<DollarSign className="w-12 h-12" />} />
            <StatCard label="Doanh thu / Lớp TB" value={classReport.length > 0 ? formatCurrency(transactions.reduce((s, t) => s + t.amount, 0) / classReport.length) : '—'} color="cyan" icon={<BarChart2 className="w-12 h-12" />} />
          </div>

          {/* Class revenue chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Doanh thu theo lớp</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={classReport} margin={{ left: 10, right: 30, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => (v / 1000000).toFixed(1) + 'M'} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Doanh thu" radius={[6, 6, 0, 0]} barSize={36}>
                  {classReport.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Class detail table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chi tiết theo lớp</h4>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Lớp</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Doanh thu</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Giao dịch</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Học viên đóng tiền</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Học viên trong lớp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {classReport.map((cls, i) => {
                  const studentsInThisClass = students.filter(s => s.className?.toLowerCase() === cls.name.toLowerCase()).length;
                  return (
                    <tr key={cls.name} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="font-semibold text-slate-800">{cls.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-indigo-700">{formatCurrency(cls.revenue)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{cls.transactions}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{cls.students}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="bg-indigo-50 text-indigo-700 font-bold text-xs px-2.5 py-1 rounded-full">{studentsInThisClass}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-5 py-3 font-bold text-xs text-slate-600">TỔNG</td>
                  <td className="px-4 py-3 text-right font-black text-indigo-700">{formatCurrency(classReport.reduce((s, c) => s + c.revenue, 0))}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-600">{classReport.reduce((s, c) => s + c.transactions, 0)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Attendance report per class */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Báo cáo chuyên cần theo lớp
              </h4>
            </div>
            {(() => {
              const classNames = [...new Set(students.map(s => s.className).filter(Boolean))];
              if (classNames.length === 0) return <div className="p-8 text-center text-slate-300 text-sm">Không có dữ liệu lớp</div>;
              return (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-5 py-3 font-semibold text-slate-500">Lớp</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-500">Học viên</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-500">Tổng điểm danh</th>
                      <th className="text-right px-4 py-3 font-semibold text-emerald-600">Có mặt</th>
                      <th className="text-right px-4 py-3 font-semibold text-red-500">Vắng</th>
                      <th className="text-right px-4 py-3 font-semibold text-amber-500">Phép</th>
                      <th className="text-right px-4 py-3 font-semibold text-indigo-600">Tỷ lệ chuyên cần</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {classNames.map(cls => {
                      const classStudents = students.filter(s => s.className === cls);
                      const classAttendance = allAttendance.filter(a => a.className === cls);
                      const present = classAttendance.filter(a => a.status === 'present').length;
                      const absent = classAttendance.filter(a => a.status === 'absent').length;
                      const excused = classAttendance.filter(a => a.status === 'excused').length;
                      const total = classAttendance.length;
                      const rate = total > 0 ? ((present / total) * 100) : 0;
                      return (
                        <tr key={cls} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-semibold text-slate-800">{cls}</td>
                          <td className="px-4 py-3 text-right text-slate-500">{classStudents.length}</td>
                          <td className="px-4 py-3 text-right text-slate-500">{total}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-bold">{present}</td>
                          <td className="px-4 py-3 text-right text-red-500 font-bold">{absent}</td>
                          <td className="px-4 py-3 text-right text-amber-500 font-bold">{excused}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div className={`h-full rounded-full ${rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${rate}%` }} />
                              </div>
                              <span className={`font-black text-xs ${rate >= 80 ? 'text-emerald-600' : rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                {rate.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      )}

      {/* ══ BÁO CÁO TÀI CHÍNH ════════════════════════════════════════════════ */}
      {activeTab === 'tai-chinh' && (
        <div className="space-y-5">
          {/* Filter */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              {(['day', 'month', 'range'] as const).map(t => (
                <button key={t} onClick={() => setReportType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${reportType === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {t === 'day' ? 'Theo ngày' : t === 'month' ? 'Theo tháng' : 'Tùy chọn'}
                </button>
              ))}
            </div>
            {reportType === 'day'   && <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />}
            {reportType === 'month' && <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />}
            {reportType === 'range' && (
              <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                <span className="text-slate-400">—</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            )}
            <button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold ml-auto">
              <Download className="w-4 h-4" /> Xuất Excel
            </button>
            <button onClick={handleExportPDF} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-semibold">
              <FileText className="w-4 h-4" /> Xuất PDF
            </button>
          </div>

          {/* Financial KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Tổng doanh thu" value={formatCurrency(totalRevenue)} sub={`${filteredTransactions.length} giao dịch`} color="indigo" icon={<DollarSign className="w-12 h-12" />} />
            <StatCard label="Tiền mặt" value={formatCurrency(filteredTransactions.filter(t => t.paymentMethod === 'Tiền mặt').reduce((s, t) => s + t.amount, 0))} color="emerald" icon={<Wallet className="w-12 h-12" />} />
            <StatCard label="Chuyển khoản" value={formatCurrency(filteredTransactions.filter(t => t.paymentMethod !== 'Tiền mặt').reduce((s, t) => s + t.amount, 0))} color="cyan" icon={<CreditCard className="w-12 h-12" />} />
            <StatCard label="Chưa xuất HĐ" value={filteredTransactions.filter(t => !t.isInvoiced).length} sub="khoản thu" color={filteredTransactions.filter(t => !t.isInvoiced).length > 0 ? 'amber' : 'emerald'} icon={<AlertTriangle className="w-12 h-12" />} />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* By category bar chart */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">📊 Phân bổ doanh thu theo loại</h3>
              {byCategory.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-300 text-sm">Không có dữ liệu</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byCategory} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Doanh thu" radius={[0, 6, 6, 0]} barSize={22}>
                      {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Payment method pie */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">💳 Hình thức thanh toán</h3>
              {paymentMethodBreakdown.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-300 text-sm">Không có dữ liệu</div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={180}>
                    <PieChart>
                      <Pie data={paymentMethodBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                        {paymentMethodBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {paymentMethodBreakdown.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-slate-600 font-medium">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-800">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Multi-category trend */}
          {allCategories.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">📈 Xu hướng doanh thu 6 tháng (theo loại)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => (v / 1000000).toFixed(1) + 'M'} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {allCategories.map((cat, i) => (
                    <Line key={cat} type="monotone" dataKey={cat} name={cat} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Transactions table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chi tiết khoản thu ({filteredTransactions.length})</h4>
            </div>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-semibold text-slate-500">Ngày</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500">Học viên</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500">Lớp</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500">Nội dung</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-500">Số tiền</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500">Hình thức</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTransactions.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)).map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-slate-500">{formatDate(t.paymentDate)}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{t.studentName}</td>
                      <td className="px-4 py-2.5 text-slate-500">{t.className || '—'}</td>
                      <td className="px-4 py-2.5"><span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded">{t.revenueCategory}</span></td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800">{formatCurrency(t.amount)}</td>
                      <td className="px-4 py-2.5 text-slate-500">{t.paymentMethod}</td>
                    </tr>
                  ))}
                </tbody>
                {filteredTransactions.length > 0 && (
                  <tfoot className="sticky bottom-0">
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td colSpan={4} className="px-4 py-3 font-bold text-slate-600">TỔNG CỘNG</td>
                      <td className="px-4 py-3 text-right font-black text-indigo-700">{formatCurrency(totalRevenue)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ NEW REPORTS ══════════ */}

      {/* P&L Report */}
      {activeTab === 'pnl' && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Báo cáo Lợi nhuận (P&L)
          </h3>
          {(() => {
            const now = new Date();
            const monthlyData = Array.from({ length: 6 }, (_, i) => {
              const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              const revenue = transactions
                .filter(t => t.paymentDate.startsWith(key))
                .reduce((sum, t) => sum + t.amount, 0);
              const salaryCost = allSalaryData
                .filter(s => s.month === key)
                .reduce((sum, s) => sum + (s.grossSalary || 0), 0);
              const otherExpenses = expenses
                .filter(e => e.date?.startsWith(key))
                .reduce((sum, e) => sum + e.amount, 0);
              const totalCost = salaryCost + otherExpenses;
              const profit = revenue - totalCost;
              const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
              return {
                month: `T${d.getMonth() + 1}/${d.getFullYear()}`,
                revenue,
                salaryCost,
                otherExpenses,
                totalCost,
                profit,
                margin,
              };
            });
            const currentProfit = monthlyData[monthlyData.length - 1]?.profit || 0;
            const currentRevenue = monthlyData[monthlyData.length - 1]?.revenue || 0;
            const currentSalaryCost = monthlyData[monthlyData.length - 1]?.salaryCost || 0;
            const currentOtherExp = monthlyData[monthlyData.length - 1]?.otherExpenses || 0;
            const currentTotalCost = currentSalaryCost + currentOtherExp;

            return (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatCard label="Doanh thu tháng" value={formatCurrency(currentRevenue)} color="emerald" icon={<DollarSign className="w-8 h-8" />} />
                  <StatCard label="Chi phí lương" value={formatCurrency(currentSalaryCost)} color="red" icon={<Users className="w-8 h-8" />} />
                  <StatCard label="Chi phí khác" value={formatCurrency(currentOtherExp)} sub={`${currentTotalCost > 0 ? Math.round((currentOtherExp / currentTotalCost) * 100) : 0}% tổng chi`} color="amber" icon={<Wallet className="w-8 h-8" />} />
                  <StatCard label="Lợi nhuận" value={formatCurrency(currentProfit)} color={currentProfit >= 0 ? 'emerald' : 'red'} icon={<TrendingUp className="w-8 h-8" />} />
                  <StatCard
                    label="Biên lợi nhuận"
                    value={currentRevenue > 0 ? `${Math.round((currentProfit / currentRevenue) * 100)}%` : '—'}
                    sub={currentRevenue > 0 ? (currentProfit / currentRevenue >= 0.4 ? '✅ Tốt (≥40%)' : currentProfit / currentRevenue >= 0.2 ? '⚠️ Trung bình' : '🔴 Thấp') : ''}
                    color={currentRevenue > 0 && currentProfit / currentRevenue >= 0.4 ? 'emerald' : currentRevenue > 0 && currentProfit / currentRevenue >= 0.2 ? 'amber' : 'red'}
                    icon={<Activity className="w-8 h-8" />}
                  />
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="revenue" name="Doanh thu" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="salaryCost" name="Chi phí lương" stackId="cost" fill="#ef4444" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="otherExpenses" name="Chi phí khác" stackId="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" name="Lợi nhuận" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Công nợ học viên */}
      {activeTab === 'cong-no' && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> Công nợ Học viên
          </h3>
          {(() => {
            const studentsWithDebt = students
              .filter(s => (s.status === 'active' || !s.status) && (s.feePerSession || 0) > 0)
              .map(s => {
                const fee = Number(s.feePerSession) || 0;
                const paidOffline = transactions
                  .filter(t => t.studentName?.toLowerCase() === s.name?.toLowerCase() && t.revenueCategory === 'Học phí offline')
                  .reduce((sum, t) => sum + t.amount, 0);
                const sessionsUsed = allAttendance.filter(a =>
                  (a.studentId === s.id || a.studentName?.toLowerCase() === s.name?.toLowerCase()) && a.status === 'present'
                ).length;
                const expectedPayment = sessionsUsed * fee;
                const debt = expectedPayment - paidOffline;
                return { ...s, paid: paidOffline, sessionsUsed, expectedPayment, debt };
              })
              .filter(s => s.debt > 0)
              .sort((a, b) => b.debt - a.debt);

            const totalDebt = studentsWithDebt.reduce((sum, s) => sum + s.debt, 0);

            return (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <StatCard label="Tổng công nợ" value={formatCurrency(totalDebt)} color="red" icon={<AlertTriangle className="w-8 h-8" />} />
                  <StatCard label="HV chưa đóng đủ" value={studentsWithDebt.length} color="amber" icon={<Users className="w-8 h-8" />} />
                  <StatCard label="HV đã đóng đủ" value={students.length - studentsWithDebt.length} color="emerald" icon={<CheckCircle className="w-8 h-8" />} />
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="text-left px-4 py-3 font-semibold">#</th>
                        <th className="text-left px-4 py-3 font-semibold">Học viên</th>
                        <th className="text-left px-4 py-3 font-semibold">Lớp</th>
                        <th className="text-right px-4 py-3 font-semibold">Buổi học</th>
                        <th className="text-right px-4 py-3 font-semibold">Cần đóng</th>
                        <th className="text-right px-4 py-3 font-semibold">Đã đóng</th>
                        <th className="text-right px-4 py-3 font-semibold text-red-600">Còn thiếu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsWithDebt.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-8 text-slate-400">🎉 Không có công nợ — tất cả HV đã đóng đủ!</td></tr>
                      ) : studentsWithDebt.map((s, i) => (
                        <tr key={s.id || i} className="border-b border-slate-100 hover:bg-amber-50/50">
                          <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium">{s.name}</td>
                          <td className="px-4 py-2.5 text-slate-500">{s.className || '—'}</td>
                          <td className="px-4 py-2.5 text-right text-slate-500">{(s as any).sessionsUsed} buổi × {formatCurrency(s.feePerSession || 0)}</td>
                          <td className="px-4 py-2.5 text-right">{formatCurrency((s as any).expectedPayment)}</td>
                          <td className="px-4 py-2.5 text-right text-green-600">{formatCurrency(s.paid)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-red-600">{formatCurrency(s.debt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Hiệu suất GV */}
      {activeTab === 'hieu-suat-gv' && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-500" /> Hiệu suất Giáo viên
          </h3>
          {(() => {
            const teachers = staffData.filter(s => s.role === 'teacher' && s.status === 'active');
            const teacherStats = teachers.map(t => {
              const sessions = teachingLogs.filter(l => l.staffId === t.id).reduce((sum: number, l: any) => sum + (l.sessions || 1), 0);
              const salary = salaryData.find(s => s.staffId === t.id);
              const costPerSession = sessions > 0 ? Math.round((salary?.grossSalary || 0) / sessions) : 0;
              // Classes taught
              const classNames = [...new Set(teachingLogs.filter(l => l.staffId === t.id).map(l => l.className))];
              return { ...t, sessions, costPerSession, classNames, salary: salary?.grossSalary || 0 };
            }).sort((a, b) => b.sessions - a.sessions);

            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {teacherStats.map(t => (
                    <div key={t.id} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-blue-300 transition-colors">
                      <p className="font-semibold text-slate-800 truncate">{t.name}</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{t.sessions} <span className="text-sm font-medium text-slate-400">buổi</span></p>
                      <p className="text-xs text-slate-500">{t.classNames.length} lớp • {formatCurrency(t.costPerSession)}/buổi</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={teacherStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="sessions" name="Buổi dạy" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Tuyển sinh */}
      {activeTab === 'tuyen-sinh' && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-emerald-500" /> Tuyển sinh & Retention
          </h3>
          {(() => {
            const now = new Date();
            const monthlyEnroll = Array.from({ length: 6 }, (_, i) => {
              const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              const newStudents = students.filter(s => s.enrollDate?.startsWith(key) || s.createdAt?.startsWith(key)).length;
              const leftStudents = students.filter(s => s.status === 'left' && s.updatedAt?.startsWith(key)).length;
              return { month: `T${d.getMonth() + 1}`, new: newStudents, left: leftStudents, net: newStudents - leftStudents };
            });
            const totalActive = students.filter(s => s.status === 'active' || !s.status).length;
            const totalInactive = students.filter(s => s.status === 'left').length;

            return (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <StatCard label="Đang học" value={totalActive} color="emerald" icon={<Users className="w-8 h-8" />} />
                  <StatCard label="Đã nghỉ" value={totalInactive} color="red" icon={<XCircle className="w-8 h-8" />} />
                  <StatCard label="Tỷ lệ giữ chân" value={totalActive > 0 ? `${Math.round(totalActive / (totalActive + totalInactive) * 100)}%` : '—'} color="cyan" icon={<Target className="w-8 h-8" />} />
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200">
                  {monthlyEnroll.every(m => m.new === 0 && m.left === 0) ? (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">Chưa có dữ liệu tuyển sinh</p>
                      <p className="text-xs text-slate-300 mt-1">Thêm ngày nhập học (enrollDate) cho học viên để hiện biểu đồ</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={monthlyEnroll}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="new" name="HV mới" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="left" name="HV nghỉ" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Sĩ số lớp */}
      {activeTab === 'si-so' && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-violet-500" /> Sĩ số Lớp học
          </h3>
          {(() => {
            const classStats = classesData.filter(c => c.status === 'active').map(c => {
              const enrolled = students.filter(s =>
                s.className === c.name || enrollments.some((e: any) => e.classId === c.id && e.studentId === s.id)
              ).length;
              const maxCapacity = c.maxStudents || c.capacity || 30;
              const fillRate = Math.round((enrolled / maxCapacity) * 100);
              return { ...c, enrolled, maxCapacity, fillRate };
            }).sort((a, b) => b.fillRate - a.fillRate);

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classStats.map(c => (
                  <div key={c.id} className="bg-white rounded-2xl p-4 border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-slate-800">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.teacher || '—'}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        c.fillRate >= 90 ? 'bg-red-100 text-red-700' :
                        c.fillRate >= 70 ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>{c.fillRate}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${
                        c.fillRate >= 90 ? 'bg-red-500' : c.fillRate >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} style={{ width: `${Math.min(c.fillRate, 100)}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{c.enrolled}/{c.maxCapacity} học viên</p>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Doanh thu theo lớp/GV */}
      {activeTab === 'dt-lop' && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" /> Doanh thu theo Lớp/GV
          </h3>
          {(() => {
            const classRevenue = classesData.filter(c => c.status === 'active').map(c => {
              const revenue = transactions
                .filter(t => t.className === c.name)
                .reduce((sum, t) => sum + t.amount, 0);
              // Find teacher by teacherId first, fallback to name
              const teacher = staffData.find(s => s.id === c.teacherId) || staffData.find(s => s.name === c.teacher);
              const teacherSalary = teacher ? salaryData.find(s => s.staffId === teacher.id) : null;
              // Split salary proportionally by sessions taught in this class
              let cost = 0;
              if (teacherSalary && teacher) {
                const teacherTotalSessions = teachingLogs
                  .filter(l => l.staffId === teacher.id)
                  .reduce((sum, l) => sum + (l.sessions || 1), 0);
                const classSessions = teachingLogs
                  .filter(l => l.staffId === teacher.id && l.className === c.name)
                  .reduce((sum, l) => sum + (l.sessions || 1), 0);
                cost = teacherTotalSessions > 0
                  ? Math.round((teacherSalary.grossSalary || 0) * (classSessions / teacherTotalSessions))
                  : 0;
              }
              const margin = revenue - cost;
              return { name: c.name, teacher: teacher?.name || c.teacher || '—', revenue, cost, margin };
            }).sort((a, b) => b.margin - a.margin);

            return (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="text-left px-4 py-3">#</th>
                        <th className="text-left px-4 py-3">Lớp</th>
                        <th className="text-left px-4 py-3">GV</th>
                        <th className="text-right px-4 py-3 text-emerald-600">Doanh thu</th>
                        <th className="text-right px-4 py-3 text-red-600">Chi phí GV</th>
                        <th className="text-right px-4 py-3 font-bold">Biên lợi nhuận</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classRevenue.map((c, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium">{c.name}</td>
                          <td className="px-4 py-2.5 text-slate-500">{c.teacher}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-600 font-medium">{formatCurrency(c.revenue)}</td>
                          <td className="px-4 py-2.5 text-right text-red-500">{formatCurrency(c.cost)}</td>
                          <td className={`px-4 py-2.5 text-right font-bold ${c.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(c.margin)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={classRevenue.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="revenue" name="Doanh thu" fill="#10b981" />
                      <Bar dataKey="cost" name="Chi phí" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Chuyên cần tổng hợp */}
      {activeTab === 'chuyen-can' && (() => {
        const allClassNames = [...new Set(classesData.filter(c => c.status === 'active').map(c => c.name))];
        return (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-amber-500" /> Chuyên cần Tổng hợp
            </h3>
            <select
              value={attendanceClassFilter}
              onChange={e => setAttendanceClassFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-w-[180px]"
            >
              <option value="">Tất cả lớp</option>
              {allClassNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {(() => {
            const filtered = attendanceClassFilter
              ? allAttendance.filter(a => a.className === attendanceClassFilter)
              : allAttendance;
            const totalRecords = filtered.length;
            const presentCount = filtered.filter(a => a.status === 'present').length;
            const absentCount = filtered.filter(a => a.status === 'absent').length;
            const lateCount = filtered.filter(a => a.status === 'late').length;
            const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

            // Per-class attendance
            const classAttendance = classesData.filter(c => c.status === 'active' && (!attendanceClassFilter || c.name === attendanceClassFilter)).map(c => {
              const records = allAttendance.filter(a => a.className === c.name);
              const present = records.filter(r => r.status === 'present').length;
              const rate = records.length > 0 ? Math.round((present / records.length) * 100) : 0;
              return { name: c.name, total: records.length, present, rate };
            }).sort((a, b) => a.rate - b.rate);

            // Most absent students
            const studentAbsences: Record<string, number> = {};
            filtered.filter(a => a.status === 'absent').forEach(a => {
              studentAbsences[a.studentName] = (studentAbsences[a.studentName] || 0) + 1;
            });
            const topAbsent = Object.entries(studentAbsences).sort((a, b) => b[1] - a[1]).slice(0, 10);

            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Tỷ lệ đi học" value={`${attendanceRate}%`} color="emerald" icon={<CheckCircle2 className="w-8 h-8" />} />
                  <StatCard label="Có mặt" value={presentCount} color="emerald" />
                  <StatCard label="Vắng" value={absentCount} color="red" />
                  <StatCard label="Đi trễ" value={lateCount} color="amber" />
                </div>
                {classAttendance.length > 0 && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200">
                    <h4 className="text-sm font-semibold mb-3">Tỷ lệ chuyên cần theo lớp</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={classAttendance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="rate" name="% Đi học" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {topAbsent.length > 0 && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200">
                    <h4 className="text-sm font-semibold mb-3 text-red-600">Top HV vắng nhiều nhất</h4>
                    <div className="space-y-1.5">
                      {topAbsent.map(([name, count], i) => (
                        <div key={name} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-red-50">
                          <span className="text-sm"><span className="text-slate-400 mr-2">{i + 1}.</span>{name}</span>
                          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{count} buổi vắng</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
        ); })()}

      {/* Chi phí nhân sự */}
      {activeTab === 'cp-nhan-su' && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-violet-500" /> Chi phí Nhân sự
          </h3>
          {(() => {
            const now = new Date();
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const monthRevenue = transactions
              .filter(t => t.paymentDate.startsWith(currentMonthKey))
              .reduce((sum, t) => sum + t.amount, 0);
            const totalSalary = salaryData.reduce((sum, s) => sum + (s.grossSalary || 0), 0);
            const ratio = monthRevenue > 0 ? Math.round((totalSalary / monthRevenue) * 100) : 0;

            const roleMap: Record<string, string> = { teacher: 'Giáo viên', office: 'Văn phòng', management: 'Quản lý', assistant: 'Trợ giảng' };
            const roleCostMap: Record<string, number> = {};
            salaryData.forEach(s => {
              const roleName = roleMap[s.role] || s.role || 'Khác';
              roleCostMap[roleName] = (roleCostMap[roleName] || 0) + (s.grossSalary || 0);
            });
            const perRoleCost = Object.entries(roleCostMap)
              .map(([name, value]) => ({ name, value }))
              .filter(r => r.value > 0)
              .sort((a, b) => b.value - a.value);

            return (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <StatCard label="Quỹ lương tháng" value={formatCurrency(totalSalary)} color="violet" icon={<Wallet className="w-8 h-8" />} />
                  <StatCard label="Doanh thu tháng" value={formatCurrency(monthRevenue)} color="emerald" icon={<DollarSign className="w-8 h-8" />} />
                  <StatCard label="Tỷ lệ CP nhân sự" value={`${ratio}%`} color={ratio > 60 ? 'red' : ratio > 40 ? 'amber' : 'emerald'}
                    sub={ratio > 60 ? '⚠️ Cao! Nên < 60%' : ratio > 40 ? 'Bình thường' : '✅ Tốt'}
                    icon={<PieChartIcon className="w-8 h-8" />} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200">
                    <h4 className="text-sm font-semibold mb-3">Phân bổ chi phí</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={perRoleCost} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                          {perRoleCost.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white rounded-2xl p-5 border border-slate-200">
                    <h4 className="text-sm font-semibold mb-3">Chi tiết theo nhân viên</h4>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                      {[...salaryData].sort((a, b) => b.grossSalary - a.grossSalary).map((s, i) => (
                        <div key={s.id || i} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-violet-50">
                          <span className="text-sm">
                            <span className="text-slate-400 mr-2">{i + 1}.</span>
                            {s.staffName}
                            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded ${s.role === 'teacher' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>
                              {s.role === 'teacher' ? 'GV' : 'VP'}
                            </span>
                          </span>
                          <span className="text-sm font-bold text-violet-600">{formatCurrency(s.grossSalary)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
