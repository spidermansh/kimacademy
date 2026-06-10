import React, { useState, useMemo } from 'react';
import { Transaction, RevenueCategory } from '../types';
import { formatCurrency } from '../utils';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx-js-style';
import { Download } from 'lucide-react';

interface ReportsDashboardProps {
  transactions: Transaction[];
}

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsDashboard({ transactions }: ReportsDashboardProps) {
  const [reportType, setReportType] = useState<'day' | 'month' | 'range'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

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
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-[11px] font-bold text-slate-800 uppercase flex items-center gap-2 tracking-wide">
             <svg className="w-3 h-3 text-indigo-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path></svg>
             Báo cáo thống kê
          </h2>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="flex bg-slate-100 p-1 rounded-lg self-start md:self-auto">
            <button
              onClick={() => setReportType('day')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${reportType === 'day' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Theo ngày
            </button>
            <button
              onClick={() => setReportType('month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${reportType === 'month' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Theo tháng
            </button>
            <button
              onClick={() => setReportType('range')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${reportType === 'range' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Tùy chọn
            </button>
          </div>
          
          <div className="flex items-center gap-2 self-start md:self-auto">
            {reportType === 'day' ? (
               <input
                 type="date"
                 value={selectedDate}
                 onChange={(e) => setSelectedDate(e.target.value)}
                 className="px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
               />
            ) : reportType === 'month' ? (
               <input
                 type="month"
                 value={selectedMonth}
                 onChange={(e) => setSelectedMonth(e.target.value)}
                 className="px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
               />
            ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm w-[130px]"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm w-[130px]"
                  />
                </div>
            )}
          </div>
          
          <button 
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-sm font-bold shadow-sm transition-colors whitespace-nowrap self-start md:self-auto ml-auto md:ml-0"
          >
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-5 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2">Tổng doanh thu</span>
          <span className="text-3xl font-black text-indigo-900">{formatCurrency(totalRevenue)}</span>
          <span className="text-xs font-medium text-indigo-700 mt-2">{filteredTransactions.length} giao dịch</span>
        </div>
        <div className="col-span-1 md:col-span-3 bg-white border border-slate-200 rounded-lg p-5">
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
             <div key={item.name} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
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
  );
}
