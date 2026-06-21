import React, { useState, useEffect, useMemo } from 'react';
import { api, formatCurrency, formatDate } from '../../shared/utils';
import { StaffMember, SalaryAdvance } from '../../shared/types';
import { HandCoins, Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import DateInput from './ui/DateInput';

interface Props {
  staff: StaffMember[];
}

export default function SalaryAdvanceManager({ staff }: Props) {
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [loading, setLoading] = useState(false);
  const [staffFilter, setStaffFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ staffId: '', amount: 0, date: new Date().toISOString().split('T')[0], reason: '' });

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
    api.getSalaryAdvances({ month: currentMonth })
      .then(data => setAdvances(data))
      .finally(() => setLoading(false));
  }, [currentMonth]);

  const filtered = advances.filter(a => {
    if (staffFilter && a.staffId !== staffFilter) return false;
    return true;
  });

  const totalAdvance = filtered.reduce((sum, a) => sum + a.amount, 0);

  // Per-staff summary
  const perStaffSummary = useMemo(() => {
    const m: Record<string, { name: string; total: number; count: number }> = {};
    advances.forEach(a => {
      if (!m[a.staffId]) m[a.staffId] = { name: a.staffName, total: 0, count: 0 };
      m[a.staffId].total += a.amount;
      m[a.staffId].count++;
    });
    return Object.entries(m).sort((a, b) => b[1].total - a[1].total);
  }, [advances]);

  const handleSave = async () => {
    if (!form.staffId) return alert('Chọn nhân viên');
    if (form.amount <= 0) return alert('Nhập số tiền ứng');
    const staffMember = staff.find(s => s.id === form.staffId);

    // Check advance limit: warn if total advance exceeds estimated salary
    if (staffMember) {
      const existingAdvances = advances.filter(a => a.staffId === form.staffId && a.id !== editingId);
      const existingTotal = existingAdvances.reduce((s, a) => s + a.amount, 0);
      const newTotal = existingTotal + form.amount;
      const estimatedGross = (staffMember.baseSalary || 0); // Minimum — actual may be higher with teaching
      if (estimatedGross > 0 && newTotal > estimatedGross) {
        const ok = confirm(
          `⚠️ Cảnh báo: Tổng ứng tháng này sẽ là ${newTotal.toLocaleString('vi-VN')}đ\n` +
          `Lương cứng: ${estimatedGross.toLocaleString('vi-VN')}đ\n\n` +
          `Phần vượt (${(newTotal - estimatedGross).toLocaleString('vi-VN')}đ) sẽ được trừ dần sang tháng sau.\n\n` +
          `Tiếp tục?`
        );
        if (!ok) return;
      }
    }

    try {
      if (editingId) {
        await api.updateSalaryAdvance(editingId, { ...form, staffName: staffMember?.name || '' });
      } else {
        await api.createSalaryAdvance({ ...form, staffName: staffMember?.name || '' });
      }
      const updated = await api.getSalaryAdvances({ month: currentMonth });
      setAdvances(updated);
      setShowForm(false);
      setEditingId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa khoản ứng lương này?')) return;
    await api.deleteSalaryAdvance(id);
    setAdvances(prev => prev.filter(a => a.id !== id));
  };

  const openEdit = (a: SalaryAdvance) => {
    setEditingId(a.id);
    setForm({ staffId: a.staffId, amount: a.amount, date: a.date, reason: a.reason || '' });
    setShowForm(true);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
            <HandCoins className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Ứng lương</h2>
            <p className="text-xs text-slate-500">Quản lý ứng lương nhân viên theo tháng</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-slate-700 min-w-[120px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ staffId: '', amount: 0, date: new Date().toISOString().split('T')[0], reason: '' }); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg ml-2">
            <Plus className="w-4 h-4" /> Thêm ứng lương
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500">Tổng ứng tháng</p>
          <p className="text-xl font-bold text-yellow-600 mt-1">{formatCurrency(totalAdvance)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500">Số lần ứng</p>
          <p className="text-xl font-bold text-slate-700 mt-1">{filtered.length}</p>
        </div>
        {perStaffSummary.slice(0, 2).map(([id, data]) => (
          <div key={id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <p className="text-xs text-slate-500 truncate">{data.name}</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{formatCurrency(data.total)}</p>
            <p className="text-xs text-slate-400">{data.count} lần ứng</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
        <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm flex-1 max-w-xs">
          <option value="">Tất cả nhân viên</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600">#</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ngày</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Nhân viên</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">Số tiền</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Lý do</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  <HandCoins className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  Chưa có khoản ứng nào trong tháng
                </td>
              </tr>
            ) : (
              filtered.map((a, i) => (
                <tr key={a.id} className="border-b border-slate-100 hover:bg-yellow-50/50 transition-colors">
                  <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(a.date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{a.staffName}</td>
                  <td className="px-4 py-3 text-right font-bold text-yellow-600">{formatCurrency(a.amount)}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{a.reason || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="bg-yellow-50 border-t-2 border-yellow-200">
                <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-700">Tổng cộng:</td>
                <td className="px-4 py-3 text-right font-bold text-yellow-600 text-lg">{formatCurrency(totalAdvance)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Sửa ứng lương' : 'Thêm ứng lương'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">Nhân viên *</label>
                <select value={form.staffId} onChange={e => setForm({ ...form, staffId: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
                  <option value="">Chọn nhân viên</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role === 'teacher' ? 'GV' : s.role === 'teaching_assistant' ? 'TG' : 'VP'})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Số tiền *</label>
                  <input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: +e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm" placeholder="1000000" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Ngày ứng</label>
                  <DateInput value={form.date} onChange={v => setForm({ ...form, date: v })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm flex items-center justify-between" />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Lý do</label>
                <input type="text" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm" placeholder="Ứng lương tháng..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Hủy</button>
              <button onClick={handleSave}
                className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg">
                {editingId ? 'Cập nhật' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
