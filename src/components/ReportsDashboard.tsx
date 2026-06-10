import React, { useState, useMemo } from 'react';
import { Transaction, Student, RevenueCategory } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx-js-style';
import { Download, Search, User, CreditCard, Calendar, CheckCircle, FileSpreadsheet } from 'lucide-react';

interface ReportsDashboardProps {
  transactions: Transaction[];
  students: Student[];
}

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsDashboard({ transactions, students = [] }: ReportsDashboardProps) {
  const [dashboardTab, setDashboardTab] = useState<'tong-quan' | 'hoc-vien'>('tong-quan');

  // --- General Overview State ---
  const [reportType, setReportType] = useState<'day' | 'month' | 'range'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // --- Student Report State ---
  const [selectedStudentName, setSelectedStudentName] = useState('');

  // --- General Overview Memoized Data ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (reportType === 'day') {
        return t.paymentDate === selectedDate;
      } else if (reportType === 'month') {
        return t.paymentDate.startsWith(selectedMonth);
      } else {
        return t.paymentDate >= startDate && t.paymentDate <= endDate;
      }
    });
  }, [transactions, reportType, selectedDate, selectedMonth, startDate, endDate]);

  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  const dataByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      map[t.revenueCategory] = (map[t.revenueCategory] || 0) + t.amount;
    });
    return Object.keys(map).map(key => ({
      name: key,
      value: map[key]
    })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // --- Student Report Memoized Data ---
  const studentProfile = useMemo(() => {
    if (!selectedStudentName.trim()) return null;
    return students.find(s => s.name.toLowerCase() === selectedStudentName.toLowerCase().trim());
  }, [students, selectedStudentName]);

  const studentTransactions = useMemo(() => {
    if (!selectedStudentName.trim()) return [];
    return transactions
      .filter(t => t.studentName.toLowerCase() === selectedStudentName.toLowerCase().trim())
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  }, [transactions, selectedStudentName]);

  const studentTotalPaid = useMemo(() => {
    return studentTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [studentTransactions]);

  // --- Excel Exports ---
  const handleExportExcel = () => {
    const dataToExport = filteredTransactions.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((t, index) => ({
      'STT': index + 1,
      'NGÀY THU': t.paymentDate,
      'NỘI DUNG THU': t.revenueCategory,
      'TÊN HỌC VIÊN': t.studentName,
      'LỚP': t.className || '',
      'SỐ TIỀN': t.amount,
      'HÌNH THỨC THU': t.paymentMethod,
      'GHI CHÚ': t.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4F46E5" } }, // Indigo-600
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    const rowStyle = {
      alignment: { vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "D1D5DB" } },
        bottom: { style: "thin", color: { rgb: "D1D5DB" } },
        left: { style: "thin", color: { rgb: "D1D5DB" } },
        right: { style: "thin", color: { rgb: "D1D5DB" } }
      }
    };

    for (let i in worksheet) {
      if (i[0] === '!') continue;
      
      const isHeader = i.replace(/[A-Z]/g, '') === '1';
      worksheet[i].s = isHeader ? headerStyle : rowStyle;
      
      if (!isHeader && i.startsWith('F')) {
        worksheet[i].z = '#,##0';
      }
    }
    
    const wscols = [
      {wch: 5},  // STT
      {wch: 15}, // NGÀY THU
      {wch: 20}, // NỘI DUNG THU
      {wch: 25}, // TÊN HỌC VIÊN
      {wch: 15}, // LỚP
      {wch: 15}, // SỐ TIỀN
      {wch: 20}, // HÌNH THỨC THU
      {wch: 30}  // GHI CHÚ
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BaoCaoThu');
    
    const fileName = reportType === 'day' ? `BaoCaoThu_${selectedDate}.xlsx` 
                   : reportType === 'month' ? `BaoCaoThu_${selectedMonth}.xlsx`
                   : `BaoCaoThu_${startDate}_den_${endDate}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
  };

  const handleExportStudentExcel = () => {
    if (studentTransactions.length === 0) return;

    // Build personal metadata block at the top
    const profile = studentProfile || {
      name: selectedStudentName,
      vietnameseName: selectedStudentName,
      englishName: '',
      vietAnhName: selectedStudentName,
      className: studentTransactions[0]?.className || '',
      gender: 'Chưa cập nhật',
      birthYear: 0,
      parentPhone: 'Chưa cập nhật'
    };

    const dataToExport = studentTransactions.map((t, index) => ({
      'STT': index + 1,
      'NGÀY ĐÓNG': t.paymentDate,
      'KỲ HỌC / THÁNG': t.term,
      'NỘI DUNG THU': t.revenueCategory,
      'SỐ TIỀN': t.amount,
      'HÌNH THỨC': t.paymentMethod,
      'ĐỐI CHIẾU': t.isReconciled ? 'Đã đối chiếu' : 'Chưa đối chiếu',
      'HÓA ĐƠN': t.isInvoiced ? 'Đã xuất HĐ' : 'Chưa xuất HĐ',
      'GHI CHÚ': t.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Styling
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4F46E5" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } }
      }
    };

    const rowStyle = {
      alignment: { vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "E5E7EB" } },
        bottom: { style: "thin", color: { rgb: "E5E7EB" } }
      }
    };

    for (let i in worksheet) {
      if (i[0] === '!') continue;
      const isHeader = i.replace(/[A-Z]/g, '') === '1';
      worksheet[i].s = isHeader ? headerStyle : rowStyle;
      if (!isHeader && i.startsWith('E')) {
        worksheet[i].z = '#,##0';
      }
    }

    worksheet['!cols'] = [
      {wch: 5},  // STT
      {wch: 15}, // NGÀY ĐÓNG
      {wch: 18}, // KỲ HỌC
      {wch: 20}, // NỘI DUNG
      {wch: 15}, // SỐ TIỀN
      {wch: 15}, // HÌNH THỨC
      {wch: 15}, // ĐỐI CHIẾU
      {wch: 15}, // HÓA ĐƠN
      {wch: 30}  // GHI CHÚ
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'LichSuDongTien');
    XLSX.writeFile(workbook, `BaoCao_HocVien_${profile.vietnameseName || profile.name}.xlsx`);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-md rounded">
          <p className="text-xs font-bold text-slate-700">{payload[0].name}</p>
          <p className="text-sm font-semibold text-indigo-700">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full min-h-[600px]">
      
      {/* Header and Tab Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2 tracking-wider">
             <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path></svg>
             Báo cáo thống kê
          </h2>
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setDashboardTab('tong-quan')}
              className={`px-3 py-1 text-[11px] font-bold rounded transition-colors whitespace-nowrap cursor-pointer ${dashboardTab === 'tong-quan' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Tổng quan doanh thu
            </button>
            <button
              onClick={() => setDashboardTab('hoc-vien')}
              className={`px-3 py-1 text-[11px] font-bold rounded transition-colors whitespace-nowrap cursor-pointer ${dashboardTab === 'hoc-vien' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Báo cáo theo học viên
            </button>
          </div>
        </div>

        {/* Dynamic Controls based on Tab */}
        {dashboardTab === 'tong-quan' ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
              <button
                onClick={() => setReportType('day')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap cursor-pointer ${reportType === 'day' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Theo ngày
              </button>
              <button
                onClick={() => setReportType('month')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap cursor-pointer ${reportType === 'month' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Theo tháng
              </button>
              <button
                onClick={() => setReportType('range')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap cursor-pointer ${reportType === 'range' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Tùy chọn
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {reportType === 'day' ? (
                 <input
                   type="date"
                   value={selectedDate}
                   onChange={(e) => setSelectedDate(e.target.value)}
                   className="px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm bg-white"
                 />
              ) : reportType === 'month' ? (
                 <input
                   type="month"
                   value={selectedMonth}
                   onChange={(e) => setSelectedMonth(e.target.value)}
                   className="px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm bg-white"
                 />
              ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm w-[130px] bg-white"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm w-[130px] bg-white"
                    />
                  </div>
              )}
            </div>
            
            <button 
              onClick={handleExportExcel}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-sm font-bold shadow-sm transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </button>
          </div>
        ) : (
          /* Student Tab Controls */
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                list="report-students-datalist"
                placeholder="Tìm tên học viên..."
                value={selectedStudentName}
                onChange={(e) => setSelectedStudentName(e.target.value)}
                className="w-full sm:w-[260px] pl-9 pr-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm bg-white font-medium"
              />
              <datalist id="report-students-datalist">
                {students.map(s => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
            
            {studentTransactions.length > 0 && (
              <button 
                onClick={handleExportStudentExcel}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-sm font-bold shadow-sm transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Xuất Excel học viên
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Tab Contents */}
      {dashboardTab === 'tong-quan' ? (
        /* ================= TỔNG QUAN DOANH THU ================= */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-5 flex flex-col justify-center shadow-sm">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2">Tổng doanh thu</span>
              <span className="text-3xl font-black text-indigo-900">{formatCurrency(totalRevenue)}</span>
              <span className="text-xs font-semibold text-indigo-700 mt-2">{filteredTransactions.length} giao dịch</span>
            </div>
            
            <div className="col-span-1 md:col-span-3 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
               <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Phân bổ doanh thu</h3>
               {dataByCategory.length > 0 ? (
                 <div className="h-[250px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={dataByCategory} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                       <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                       <XAxis type="number" hide />
                       <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                       <Tooltip content={<CustomTooltip />} />
                       <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                         {dataByCategory.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                       </Bar>
                     </BarChart>
                   </ResponsiveContainer>
                 </div>
               ) : (
                 <div className="h-[250px] flex items-center justify-center text-sm text-slate-400 italic">
                   Không có dữ liệu trong khoảng thời gian này
                 </div>
               )}
            </div>
          </div>

          <div>
             <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Chi tiết khoản thu</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
               {dataByCategory.map((item, index) => (
                 <div key={item.name} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                   <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                     <span className="text-xs font-bold text-slate-700">{item.name}</span>
                   </div>
                   <span className="text-sm font-black text-indigo-900">{formatCurrency(item.value)}</span>
                 </div>
               ))}
             </div>
          </div>
        </div>
      ) : (
        /* ================= BÁO CÁO HỌC VIÊN ================= */
        <div className="flex-1 flex flex-col justify-start">
          {!selectedStudentName.trim() ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 italic">
              <Search className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm">Vui lòng nhập và chọn tên học viên ở góc phải để xem báo cáo.</p>
            </div>
          ) : studentTransactions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 italic">
              <User className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm">Không tìm thấy lịch sử đóng tiền nào của học viên "{selectedStudentName}".</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Profile Card and Finance Card Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Profile Details Card */}
                <div className="lg:col-span-2 bg-gradient-to-r from-indigo-950 to-slate-900 text-white rounded-xl p-6 shadow-md border border-indigo-950 relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-6 translate-x-6">
                    <User className="w-48 h-48 text-white" />
                  </div>
                  
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center border border-white/20 shrink-0">
                      <User className="w-6 h-6 text-indigo-300" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-black tracking-wide">
                        {studentProfile?.vietAnhName || studentProfile?.name || selectedStudentName}
                      </h3>
                      {studentProfile?.name && studentProfile.name.toLowerCase() !== (studentProfile.vietAnhName || '').toLowerCase() && (
                        <p className="text-xs text-indigo-200 font-medium">Họ và tên: {studentProfile.name}</p>
                      )}
                      <span className="inline-block bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border border-indigo-400/30">
                        Học viên lớp: {studentProfile?.className || studentTransactions[0]?.className || 'Chưa cập nhật'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 mt-6 pt-5 border-t border-white/10 text-xs relative z-10">
                    <div>
                      <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-wider mb-0.5">Giới tính</p>
                      <p className="font-semibold text-slate-100">{studentProfile?.gender || 'Chưa cập nhật'}</p>
                    </div>
                    <div>
                      <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-wider mb-0.5">Năm sinh</p>
                      <p className="font-semibold text-slate-100">{studentProfile?.birthYear || 'Chưa cập nhật'}</p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-wider mb-0.5">SĐT Phụ huynh</p>
                      <p className="font-semibold text-slate-100 font-mono">{studentProfile?.parentPhone || 'Chưa cập nhật'}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Total Paid Card */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 shadow-sm flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute right-3 top-3 opacity-20">
                    <CreditCard className="w-12 h-12 text-indigo-600" />
                  </div>
                  <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mb-1">Tổng tiền đã đóng</span>
                  <span className="text-3xl font-black text-indigo-900">{formatCurrency(studentTotalPaid)}</span>
                  <span className="text-xs font-semibold text-indigo-700 mt-2 block border-t border-indigo-150 pt-2">
                    Tổng cộng: {studentTransactions.length} hóa đơn/khoản thu
                  </span>
                </div>

              </div>

              {/* Transactions Table for selected student */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
                  <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Lịch sử đóng các khoản thu
                  </h4>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/60 text-slate-500 font-bold border-b border-slate-200">
                        <th className="px-5 py-3 text-center w-[60px]">STT</th>
                        <th className="px-5 py-3 w-[120px]">Ngày đóng</th>
                        <th className="px-5 py-3 w-[130px]">Học kỳ / Tháng</th>
                        <th className="px-5 py-3">Nội dung thu</th>
                        <th className="px-5 py-3 text-right w-[140px]">Số tiền</th>
                        <th className="px-5 py-3 w-[120px]">Hình thức</th>
                        <th className="px-5 py-3 text-center w-[120px]">Đối chiếu</th>
                        <th className="px-5 py-3 text-center w-[120px]">Hóa đơn</th>
                        <th className="px-5 py-3 max-w-[200px] truncate">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {studentTransactions.map((t, idx) => (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="px-5 py-3 text-slate-600 font-mono">{formatDate(t.paymentDate)}</td>
                          <td className="px-5 py-3 text-slate-600 font-semibold">{t.term}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.revenueCategory.includes('Học phí') ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                              t.revenueCategory === 'Sách' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {t.revenueCategory}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-slate-900 font-mono">{formatCurrency(t.amount)}</td>
                          <td className="px-5 py-3 text-slate-600">{t.paymentMethod}</td>
                          <td className="px-5 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold ${t.isReconciled ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {t.isReconciled ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5 fill-emerald-100" />
                                  Đã khớp
                                </>
                              ) : (
                                'Chờ đối chiếu'
                              )}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold ${t.isInvoiced ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                              {t.isInvoiced ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5 fill-indigo-100" />
                                  Đã xuất HĐ
                                </>
                              ) : (
                                'Chưa xuất'
                              )}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-500 max-w-[200px] truncate" title={t.notes}>
                            {t.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
}
