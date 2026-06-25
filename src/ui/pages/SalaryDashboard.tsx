import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api, formatCurrency } from '../../shared/utils';
import { StaffMember, MonthlySalary, AppSettings } from '../../shared/types';
import { useToast } from '../components/Toast';
import {
  Calculator, ChevronLeft, ChevronRight, RefreshCw, CheckCircle, Banknote,
  FileText, Printer, Download, X, Eye, DollarSign, TrendingUp, Users,
} from 'lucide-react';

interface Props {
  staff: StaffMember[];
  classes: any[];
  settings: AppSettings | null;
}

type StatusFilter = 'all' | 'draft' | 'confirmed' | 'paid';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Nháp', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  confirmed: { label: 'Xác nhận', color: 'text-blue-700', bg: 'bg-blue-100' },
  paid: { label: 'Đã trả', color: 'text-green-700', bg: 'bg-green-100' },
};

export default function SalaryDashboard({ staff, classes, settings }: Props) {
  const toast = useToast();
  const [salaries, setSalaries] = useState<MonthlySalary[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedSlip, setSelectedSlip] = useState<MonthlySalary | null>(null);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    otherSalary: number;
    otherSalaryNote: string;
    kpiDeduction: number;
    notes: string;
  }>({ otherSalary: 0, otherSalaryNote: '', kpiDeduction: 0, notes: '' });
  const printRef = useRef<HTMLDivElement>(null);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const prevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = useMemo(() => {
    const [y, m] = currentMonth.split('-').map(Number);
    return `Tháng ${m}/${y}`;
  }, [currentMonth]);

  useEffect(() => {
    setLoading(true);
    api.getMonthlySalaries({ month: currentMonth })
      .then(data => setSalaries(data))
      .finally(() => setLoading(false));
  }, [currentMonth]);

  const handleCalculate = async () => {
    // Check if any salaries already finalized
    const paidCount = salaries.filter(s => s.status === 'paid').length;
    const confirmedCount = salaries.filter(s => s.status === 'confirmed').length;

    if (paidCount > 0) {
      const ok = confirm(
        `⚠️ CẢNH BÁO: Tháng ${monthLabel} có ${paidCount} phiếu lương ĐÃ TRẢ.\n\n` +
        `Tính lại sẽ GHI ĐÈ dữ liệu đã trả. Bạn chắc chắn muốn tiếp tục?\n\n` +
        `(Khuyến nghị: Không tính lại tháng đã hoàn tất)`
      );
      if (!ok) return;
    } else if (confirmedCount > 0) {
      if (!confirm(`Tháng ${monthLabel} có ${confirmedCount} phiếu đã xác nhận. Tính lại?`)) return;
    } else {
      if (!confirm(`Tính lương tháng ${monthLabel} cho tất cả nhân viên?`)) return;
    }

    setCalculating(true);
    try {
      const result = await api.calculateMonthlySalaries(currentMonth);
      setSalaries(result);
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    }
    setCalculating(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const updated = await api.updateMonthlySalaryStatus(id, newStatus);
      setSalaries(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    }
  };

  const handleSaveEdit = async (salary: MonthlySalary) => {
    try {
      const effectiveAllowance = salary.otherMonthlyAllowance ?? 0;
      const otherSal = editValues.otherSalary;
      const updated = {
        ...salary,
        otherIncome: otherSal, // Sync otherIncome for backward compatibility
        otherSalary: otherSal,
        otherSalaryNote: editValues.otherSalaryNote,
        kpiDeduction: editValues.kpiDeduction,
        notes: editValues.notes,
      };
      // Recalculate with carry-over
      const grossSalary = Math.max(updated.teachingIncome + updated.baseSalary + effectiveAllowance + otherSal - updated.kpiDeduction, 0);
      updated.grossSalary = grossSalary;
      updated.taxAmount = Math.round(grossSalary * (updated.taxRate / 100));

      const socialIns = (salary as any).socialInsuranceAmount || 0;
      const healthIns = (salary as any).healthInsuranceAmount || 0;
      const unemploymentIns = (salary as any).unemploymentInsuranceAmount || 0;

      const payableAmount = grossSalary - updated.taxAmount - socialIns - healthIns - unemploymentIns;
      const advanceApplied = Math.min(updated.totalAdvance, Math.max(payableAmount, 0));
      const advanceCarryOver = updated.totalAdvance - advanceApplied;
      updated.advanceApplied = advanceApplied;
      updated.advanceCarryOver = advanceCarryOver;
      updated.netSalary = Math.max(payableAmount - advanceApplied, 0);

      const res = await api.updateMonthlySalary(salary.id, updated);
      const formatted = {
        ...salary,
        ...res,
        otherSalary: res.otherIncome,
        otherSalaryNote: res.notes,
        tax: res.taxAmount,
      };
      setSalaries(prev => prev.map(s => s.id === salary.id ? formatted : s));
      setEditingRow(null);
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    }
  };

  const filtered = salaries.filter(s => statusFilter === 'all' || s.status === statusFilter);

  // Summary
  const totalGross = filtered.reduce((sum, s) => sum + s.grossSalary, 0);
  const totalTax = filtered.reduce((sum, s) => sum + s.taxAmount, 0);
  const totalAdvance = filtered.reduce((sum, s) => sum + s.totalAdvance, 0);
  const totalNet = filtered.reduce((sum, s) => sum + s.netSalary, 0);

  // Print salary slip
  const printSlip = () => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu lương - ${selectedSlip?.staffName}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; color: #333; }
          .slip { max-width: 600px; margin: 0 auto; border: 2px solid #ddd; border-radius: 12px; padding: 24px; }
          .header { text-align: center; border-bottom: 2px dashed #ddd; padding-bottom: 16px; margin-bottom: 16px; }
          .header h1 { font-size: 20px; color: #1e293b; margin: 4px 0; }
          .header p { font-size: 12px; color: #64748b; margin: 2px 0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
          .info-grid div { font-size: 13px; }
          .info-grid .label { color: #64748b; }
          .info-grid .value { font-weight: 600; text-align: right; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
          th, td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
          th { text-align: left; color: #64748b; font-weight: 600; background: #f8fafc; }
          td.amount { text-align: right; font-weight: 600; }
          .total-row { background: #f0fdf4; font-weight: 700; font-size: 15px; }
          .total-row td { border-top: 2px solid #16a34a; color: #16a34a; }
          .deduct { color: #dc2626; }
          .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 24px; padding-top: 12px; border-top: 1px dashed #e2e8f0; }
          .sign-area { display: flex; justify-content: space-around; margin-top: 40px; }
          .sign-area div { text-align: center; min-width: 120px; }
          .sign-area p { font-size: 13px; margin-bottom: 60px; font-weight: 600; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>${el.innerHTML}</body>
      </html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-100 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-lime-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Bảng lương</h2>
            <p className="text-xs text-slate-500">Quản lý lương nhân viên theo tháng</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-slate-700 min-w-[120px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={handleCalculate} disabled={calculating}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-lime-500 to-green-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg ml-2 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
            {calculating ? 'Đang tính...' : 'Tính lương'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
          <DollarSign className="w-6 h-6 opacity-50" />
          <p className="text-2xl font-bold mt-2">{formatCurrency(totalGross)}</p>
          <p className="text-xs opacity-80">Tổng thành tiền</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 text-white shadow-lg">
          <TrendingUp className="w-6 h-6 opacity-50" />
          <p className="text-2xl font-bold mt-2">{formatCurrency(totalTax)}</p>
          <p className="text-xs opacity-80">Thuế TNCN (10%)</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4 text-white shadow-lg">
          <Banknote className="w-6 h-6 opacity-50" />
          <p className="text-2xl font-bold mt-2">{formatCurrency(totalAdvance)}</p>
          <p className="text-xs opacity-80">Tổng ứng trước</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg">
          <Users className="w-6 h-6 opacity-50" />
          <p className="text-2xl font-bold mt-2">{formatCurrency(totalNet)}</p>
          <p className="text-xs opacity-80">Tổng thực nhận</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
        {(['all', 'draft', 'confirmed', 'paid'] as StatusFilter[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'
            }`}>
            {s === 'all' ? 'Tất cả' : STATUS_LABELS[s].label}
            <span className="ml-1.5 text-xs opacity-70">({s === 'all' ? salaries.length : salaries.filter(sl => sl.status === s).length})</span>
          </button>
        ))}
      </div>

      {/* Salary Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-3 font-semibold text-slate-600">#</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-600">Nhân viên</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-600">CV</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-600">Buổi dạy</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-600">Lương dạy</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-600">Lương cứng</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-600">Lương khác MĐ</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-600">Lương khác tháng này</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-600">Trừ KPI</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-600 bg-blue-50">Tổng lương</th>
                <th className="text-right px-3 py-3 font-semibold text-red-600">Thuế TNCN</th>
                <th className="text-right px-3 py-3 font-semibold text-red-600">Khấu trừ BH</th>
                <th className="text-right px-3 py-3 font-semibold text-amber-600">Đã ứng</th>
                <th className="text-right px-3 py-3 font-semibold text-green-600 bg-green-50">Còn thanh toán / Thực nhận</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-600">TT</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-600">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={16} className="text-center py-12 text-slate-400">
                    <Calculator className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    {salaries.length === 0 ? 'Chưa tính lương. Bấm "Tính lương" để bắt đầu.' : 'Không có bảng lương phù hợp bộ lọc.'}
                  </td>
                </tr>
              ) : (
                filtered.map((s, i) => {
                  const isEditing = editingRow === s.id;
                  const status = STATUS_LABELS[s.status] || STATUS_LABELS.draft;
                  return (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-lime-50/30 transition-colors">
                      <td className="px-3 py-2.5 text-slate-400">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{s.staffName}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${s.role === 'teacher' ? 'bg-blue-100 text-blue-700' : s.role === 'teaching_assistant' ? 'bg-teal-100 text-teal-700' : 'bg-violet-100 text-violet-700'}`}>
                          {s.role === 'teacher' ? 'GV' : s.role === 'teaching_assistant' ? 'TG' : 'VP'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700">{s.role === 'teacher' ? `${s.totalSessions} buổi × ${formatCurrency(s.ratePerSession)}` : s.role === 'teaching_assistant' ? `${(s as any).totalHours || 0}h × ${formatCurrency((s as any).ratePerHour || 0)}` : '—'}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-800">{s.role === 'teacher' ? formatCurrency(s.teachingIncome) : s.role === 'teaching_assistant' ? formatCurrency((s as any).hourlyIncome || 0) : '—'}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(s.baseSalary)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-500" title={s.otherMonthlyAllowanceNote}>
                        {formatCurrency(s.otherMonthlyAllowance || 0)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700">
                        {isEditing ? (
                          <div className="flex flex-col gap-1 items-end">
                            <input type="number" value={editValues.otherSalary} onChange={e => setEditValues({ ...editValues, otherSalary: +e.target.value })}
                              className="w-24 px-2 py-1 border rounded text-right text-xs" />
                            <input type="text" value={editValues.otherSalaryNote} onChange={e => setEditValues({ ...editValues, otherSalaryNote: e.target.value })}
                              className="w-24 px-2 py-1 border rounded text-[10px]" placeholder="Ghi chú..." />
                          </div>
                        ) : (
                          <div>
                            <div>{formatCurrency(s.otherSalary ?? s.otherIncome ?? 0)}</div>
                            {s.otherSalaryNote && <div className="text-[10px] text-slate-400 italic leading-tight">{s.otherSalaryNote}</div>}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-red-500">
                        {isEditing ? (
                          <input type="number" value={editValues.kpiDeduction} onChange={e => setEditValues({ ...editValues, kpiDeduction: +e.target.value })}
                            className="w-24 px-2 py-1 border rounded text-right text-xs" />
                        ) : s.kpiDeduction > 0 ? `-${formatCurrency(s.kpiDeduction)}` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-blue-600 bg-blue-50/50">{formatCurrency(s.grossSalary)}</td>
                      <td className="px-3 py-2.5 text-right text-red-500">-{formatCurrency(s.taxAmount)}</td>
                      <td className="px-3 py-2.5 text-right text-red-500" title={`BHXH: ${formatCurrency((s as any).socialInsuranceAmount || 0)} | BHYT: ${formatCurrency((s as any).healthInsuranceAmount || 0)} | BHTN: ${formatCurrency((s as any).unemploymentInsuranceAmount || 0)}`}>
                        {((s as any).socialInsuranceAmount || 0) + ((s as any).healthInsuranceAmount || 0) + ((s as any).unemploymentInsuranceAmount || 0) > 0 ? (
                          `-${formatCurrency(((s as any).socialInsuranceAmount || 0) + ((s as any).healthInsuranceAmount || 0) + ((s as any).unemploymentInsuranceAmount || 0))}`
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-amber-600">
                        {s.totalAdvance > 0 ? (
                          <div>
                            <span>-{formatCurrency(s.advanceApplied ?? s.totalAdvance)}</span>
                            {(s.advanceCarryOver ?? 0) > 0 && (
                              <div className="text-[10px] text-red-500 font-bold" title={`Ứng vượt: ${formatCurrency(s.advanceCarryOver!)}đ → tháng sau`}>
                                ⚠️ +{formatCurrency(s.advanceCarryOver!)}
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-green-600 bg-green-50/50 text-base">{formatCurrency(s.netSalary)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>{status.label}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <button onClick={() => handleSaveEdit(s)} className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600">Lưu</button>
                              <button onClick={() => setEditingRow(null)} className="text-xs px-2 py-1 bg-slate-200 rounded hover:bg-slate-300">Hủy</button>
                            </>
                          ) : (
                            <>
                              {s.status === 'draft' && (
                                <>
                                  <button onClick={() => {
                                    setEditingRow(s.id);
                                    setEditValues({
                                      otherSalary: s.otherSalary ?? s.otherIncome ?? 0,
                                      otherSalaryNote: s.otherSalaryNote || '',
                                      kpiDeduction: s.kpiDeduction,
                                      notes: s.notes || ''
                                    });
                                  }}
                                    className="p-1 rounded hover:bg-blue-100 text-blue-500" title="Sửa lương khác/KPI">
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleStatusChange(s.id, 'confirmed')}
                                    className="p-1 rounded hover:bg-blue-100 text-blue-500" title="Xác nhận">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              {s.status === 'confirmed' && (
                                <button onClick={() => handleStatusChange(s.id, 'paid')}
                                  className="p-1 rounded hover:bg-green-100 text-green-500" title="Đánh dấu đã trả">
                                  <Banknote className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={() => setSelectedSlip(s)}
                                className="p-1 rounded hover:bg-slate-100 text-slate-500" title="Xem phiếu lương">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-sm">
                  <td colSpan={9} className="px-3 py-3 text-right text-slate-700">TỔNG CỘNG:</td>
                  <td className="px-3 py-3 text-right text-blue-600 bg-blue-50/50">{formatCurrency(totalGross)}</td>
                  <td className="px-3 py-3 text-right text-red-500">-{formatCurrency(totalTax)}</td>
                  <td className="px-3 py-3 text-right text-red-500">
                    -{formatCurrency(filtered.reduce((sum, s) => sum + (((s as any).socialInsuranceAmount || 0) + ((s as any).healthInsuranceAmount || 0) + ((s as any).unemploymentInsuranceAmount || 0)), 0))}
                  </td>
                  <td className="px-3 py-3 text-right text-amber-600">-{formatCurrency(totalAdvance)}</td>
                  <td className="px-3 py-3 text-right text-green-600 bg-green-50/50 text-base">{formatCurrency(totalNet)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Salary Slip Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedSlip(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">📄 Phiếu lương - {selectedSlip.staffName}</h3>
              <div className="flex items-center gap-2">
                <button onClick={printSlip} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                  <Printer className="w-4 h-4" /> In phiếu
                </button>
                <button onClick={() => setSelectedSlip(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div ref={printRef} className="p-6">
              <div className="slip">
                <div className="header">
                  <h1 style={{ fontSize: '20px', color: '#1e293b', margin: '4px 0' }}>{settings?.centerName || 'Kim Academy'}</h1>
                  {settings?.address && <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0' }}>{settings.address}</p>}
                  {settings?.phone && <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0' }}>SĐT: {settings.phone}</p>}
                  <h2 style={{ fontSize: '18px', color: '#0ea5e9', margin: '12px 0 4px' }}>PHIẾU LƯƠNG</h2>
                  <p style={{ fontSize: '14px', color: '#64748b' }}>{monthLabel}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Nhân viên: </span>
                    <strong>{selectedSlip.staffName}</strong>
                  </div>
                  <div style={{ fontSize: '13px', textAlign: 'right' }}>
                    <span style={{ color: '#64748b' }}>Chức vụ: </span>
                    <strong>{selectedSlip.role === 'teacher' ? 'Giáo viên' : selectedSlip.role === 'teaching_assistant' ? 'Trợ giảng' : 'Nhân viên VP'}</strong>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '12px 0', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontWeight: 600, background: '#f8fafc' }}>Khoản mục</th>
                      <th style={{ padding: '8px 12px', borderBottom: '2px solid #e2e8f0', textAlign: 'right', color: '#64748b', fontWeight: 600, background: '#f8fafc' }}>Số tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSlip.role === 'teacher' && (
                      <tr>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Lương dạy ({selectedSlip.totalSessions} buổi × {formatCurrency(selectedSlip.ratePerSession)})</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(selectedSlip.teachingIncome)}</td>
                      </tr>
                    )}
                    {selectedSlip.role === 'teaching_assistant' && (
                      <tr>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Lương theo giờ ({(selectedSlip as any).totalHours || 0}h × {formatCurrency((selectedSlip as any).ratePerHour || 0)})</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency((selectedSlip as any).hourlyIncome || 0)}</td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>{selectedSlip.role === 'teacher' ? 'Lương học vụ' : selectedSlip.role === 'teaching_assistant' ? 'Lương cứng' : 'Lương cơ bản'}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(selectedSlip.baseSalary)}</td>
                    </tr>
                    {(selectedSlip.otherMonthlyAllowance ?? 0) > 0 && (
                      <tr>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
                          Lương khác mặc định
                          {selectedSlip.otherMonthlyAllowanceNote && <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>({selectedSlip.otherMonthlyAllowanceNote})</div>}
                        </td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(selectedSlip.otherMonthlyAllowance || 0)}</td>
                      </tr>
                    )}
                    {(selectedSlip.otherSalary ?? selectedSlip.otherIncome ?? 0) > 0 && (
                      <tr>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
                          Lương khác tháng này
                          {selectedSlip.otherSalaryNote && <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>({selectedSlip.otherSalaryNote})</div>}
                        </td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(selectedSlip.otherSalary ?? selectedSlip.otherIncome ?? 0)}</td>
                      </tr>
                    )}
                    {selectedSlip.kpiDeduction > 0 && (
                      <tr>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#dc2626' }}>Trừ KPI</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>-{formatCurrency(selectedSlip.kpiDeduction)}</td>
                      </tr>
                    )}
                    <tr style={{ background: '#eff6ff', fontWeight: 700 }}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>= Thành tiền</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#2563eb' }}>{formatCurrency(selectedSlip.grossSalary)}</td>
                    </tr>
                    {selectedSlip.taxAmount > 0 && (
                      <tr>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#dc2626' }}>
                          Thuế TNCN ({selectedSlip.taxRate}%)
                        </td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>
                          -{formatCurrency(selectedSlip.taxAmount)}
                        </td>
                      </tr>
                    )}
                    {((selectedSlip as any).socialInsuranceAmount || 0) > 0 && (
                      <tr>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#dc2626' }}>Khấu trừ BHXH (8%)</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>-{formatCurrency((selectedSlip as any).socialInsuranceAmount || 0)}</td>
                      </tr>
                    )}
                    {((selectedSlip as any).healthInsuranceAmount || 0) > 0 && (
                      <tr>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#dc2626' }}>Khấu trừ BHYT (1.5%)</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>-{formatCurrency((selectedSlip as any).healthInsuranceAmount || 0)}</td>
                      </tr>
                    )}
                    {((selectedSlip as any).unemploymentInsuranceAmount || 0) > 0 && (
                      <tr>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#dc2626' }}>Khấu trừ BHTN (1%)</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>-{formatCurrency((selectedSlip as any).unemploymentInsuranceAmount || 0)}</td>
                      </tr>
                    )}
                    {selectedSlip.totalAdvance > 0 && (
                      <tr>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#d97706' }}>Trừ ứng lương</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600, color: '#d97706' }}>-{formatCurrency(selectedSlip.totalAdvance)}</td>
                      </tr>
                    )}
                    <tr style={{ background: '#f0fdf4', fontWeight: 700, fontSize: '15px' }}>
                      <td style={{ padding: '12px', borderTop: '2px solid #16a34a', color: '#16a34a' }}>💰 THỰC NHẬN</td>
                      <td style={{ padding: '12px', borderTop: '2px solid #16a34a', textAlign: 'right', color: '#16a34a', fontSize: '18px' }}>{formatCurrency(selectedSlip.netSalary)}</td>
                    </tr>
                  </tbody>
                </table>

                {selectedSlip.notes && (
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Ghi chú: {selectedSlip.notes}</p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '40px' }}>
                  <div style={{ textAlign: 'center', minWidth: '120px' }}>
                    <p style={{ fontSize: '13px', marginBottom: '60px', fontWeight: 600 }}>Người nhận</p>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>(Ký, ghi rõ họ tên)</p>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '120px' }}>
                    <p style={{ fontSize: '13px', marginBottom: '60px', fontWeight: 600 }}>Người lập</p>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>(Ký, ghi rõ họ tên)</p>
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '24px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>
                  Phiếu lương được tạo bởi {settings?.centerName || 'Kim Academy'} Management System
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
