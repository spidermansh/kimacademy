import React, { useState, useMemo } from 'react';
import { Expense, AppSettings } from '../../shared/types';
import { api, formatCurrency, formatDate } from '../../shared/utils';
import {
  Plus, Edit2, Trash2, DollarSign, TrendingDown, Calendar,
  Filter, Search, RotateCcw, Save, X, AlertTriangle, PieChart,
  ChevronDown, ChevronUp, Receipt
} from 'lucide-react';
import DateInput from './ui/DateInput';

interface Props {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  settings: AppSettings;
  currentUser: { name: string; role: string } | null;
}

const ExpenseManagement: React.FC<Props> = ({ expenses, setExpenses, settings, currentUser }) => {
  // ─── State ──────────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterCategory, setFilterCategory] = useState('');
  const [searchText, setSearchText] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'category'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: '',
    description: '',
    amount: '',
    paymentMethod: 'Tiền mặt',
    isRecurring: false,
    recurringNote: '',
    notes: '',
  });

  const categories = settings.expenseCategories || [
    'Mặt bằng', 'Điện nước', 'Internet', 'Dụng cụ học tập',
    'Marketing/Quảng cáo', 'Bảo trì/Sửa chữa', 'Đối ngoại',
    'Văn phòng phẩm', 'Quỹ hoạt động', 'Chi khác',
  ];

  const paymentMethods = settings.paymentMethods || ['Tiền mặt', 'Chuyển khoản', 'Momo', 'ZaloPay'];

  // ─── Computed Data ──────────────────────────────────────────────────────────
  const filteredExpenses = useMemo(() => {
    let list = [...expenses];

    // Filter by month
    if (filterMonth) {
      list = list.filter(e => e.date?.startsWith(filterMonth));
    }

    // Filter by category
    if (filterCategory) {
      list = list.filter(e => e.category === filterCategory);
    }

    // Search
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(e =>
        e.description?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = a.date.localeCompare(b.date);
      else if (sortField === 'amount') cmp = a.amount - b.amount;
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [expenses, filterMonth, filterCategory, searchText, sortField, sortDir]);

  const monthTotal = useMemo(() =>
    filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  // Previous month total for comparison
  const prevMonthTotal = useMemo(() => {
    if (!filterMonth) return 0;
    const [y, m] = filterMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    return expenses
      .filter(e => e.date?.startsWith(prevKey))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, filterMonth]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount, percent: monthTotal > 0 ? Math.round((amount / monthTotal) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, monthTotal]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      category: '',
      description: '',
      amount: '',
      paymentMethod: 'Tiền mặt',
      isRecurring: false,
      recurringNote: '',
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.description || !formData.amount) {
      alert('Vui lòng điền đầy đủ: Danh mục, Mô tả, Số tiền');
      return;
    }

    const amount = Number(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Số tiền phải lớn hơn 0');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        const updated = await api.updateExpense(editingId, {
          ...formData,
          amount,
          updatedAt: new Date().toISOString(),
        });
        setExpenses(prev => prev.map(ex => ex.id === editingId ? updated : ex));
      } else {
        const created = await api.createExpense({
          ...formData,
          amount,
        });
        setExpenses(prev => [created, ...prev]);
      }
      resetForm();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu khoản chi');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setFormData({
      date: expense.date,
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      paymentMethod: expense.paymentMethod,
      isRecurring: expense.isRecurring || false,
      recurringNote: expense.recurringNote || '',
      notes: expense.notes || '',
    });
    setEditingId(expense.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa khoản chi này?')) return;
    try {
      await api.deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa');
    }
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'desc'
      ? <ChevronDown className="w-3 h-3 text-indigo-500" />
      : <ChevronUp className="w-3 h-3 text-indigo-500" />;
  };

  // Color palette for category chart
  const COLORS = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
  ];

  const monthDiff = monthTotal - prevMonthTotal;
  const monthDiffPct = prevMonthTotal > 0 ? Math.round((monthDiff / prevMonthTotal) * 100) : 0;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Dashboard Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total expenses this month */}
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-80">Tổng chi tháng này</span>
            <DollarSign className="w-8 h-8 opacity-50" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(monthTotal)}</div>
          <div className="text-xs opacity-70 mt-1">{filteredExpenses.length} khoản chi</div>
        </div>

        {/* Comparison with previous month */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-80">So với tháng trước</span>
            <TrendingDown className="w-8 h-8 opacity-50" />
          </div>
          <div className="text-2xl font-bold">
            {monthDiff >= 0 ? '+' : ''}{formatCurrency(monthDiff)}
          </div>
          <div className="text-xs opacity-70 mt-1">
            {prevMonthTotal > 0
              ? `${monthDiffPct >= 0 ? '↑' : '↓'} ${Math.abs(monthDiffPct)}% so với tháng trước`
              : 'Chưa có dữ liệu tháng trước'}
          </div>
        </div>

        {/* Average per expense */}
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-80">Trung bình/khoản chi</span>
            <Receipt className="w-8 h-8 opacity-50" />
          </div>
          <div className="text-2xl font-bold">
            {filteredExpenses.length > 0
              ? formatCurrency(Math.round(monthTotal / filteredExpenses.length))
              : '—'}
          </div>
          <div className="text-xs opacity-70 mt-1">
            {categoryBreakdown.length > 0
              ? `Top: ${categoryBreakdown[0].category} (${categoryBreakdown[0].percent}%)`
              : 'Chưa có dữ liệu'}
          </div>
        </div>
      </div>

      {/* ── Category Breakdown ────────────────────────────────────────────── */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-500" /> Phân bổ chi phí theo danh mục
          </h4>
          <div className="space-y-2">
            {categoryBreakdown.map((item, i) => (
              <div key={item.category} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-sm text-slate-600 w-40 truncate">{item.category}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                  <div
                    className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                    style={{
                      width: `${Math.max(item.percent, 5)}%`,
                      backgroundColor: COLORS[i % COLORS.length],
                    }}
                  >
                    <span className="text-[10px] font-bold text-white">{item.percent}%</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-800 w-28 text-right">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm
            hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Thêm khoản chi
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
          />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mô tả..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-sm w-48"
            />
          </div>
        </div>
      </div>

      {/* ── Add/Edit Form ──────────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white rounded-2xl p-5 border border-indigo-200 shadow-md">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            {editingId ? <Edit2 className="w-4 h-4 text-amber-500" /> : <Plus className="w-4 h-4 text-indigo-500" />}
            {editingId ? 'Sửa khoản chi' : 'Thêm khoản chi mới'}
          </h4>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ngày <span className="text-red-500">*</span></label>
              <DateInput
                value={formData.date}
                onChange={v => setFormData(f => ({ ...f, date: v }))}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm flex items-center justify-between"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Danh mục <span className="text-red-500">*</span></label>
              <select
                value={formData.category}
                onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="">— Chọn danh mục —</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Số tiền (đ) <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={formData.amount}
                onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))}
                placeholder="VD: 5000000"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Mô tả <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="VD: Tiền thuê mặt bằng tháng 6/2026"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Hình thức TT</label>
              <select
                value={formData.paymentMethod}
                onChange={e => setFormData(f => ({ ...f, paymentMethod: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={e => setFormData(f => ({ ...f, isRecurring: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                />
                <span className="text-sm text-slate-600">Chi phí định kỳ</span>
              </label>
              {formData.isRecurring && (
                <input
                  type="text"
                  value={formData.recurringNote}
                  onChange={e => setFormData(f => ({ ...f, recurringNote: e.target.value }))}
                  placeholder="VD: Hàng tháng"
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm flex-1"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ghi chú</label>
              <input
                type="text"
                value={formData.notes}
                onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                placeholder="Ghi chú thêm..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-3 flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm
                  hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {loading ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Thêm khoản chi')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600
                  hover:bg-slate-50 transition flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Hủy
              </button>
              {formData.amount && Number(formData.amount) >= 10000000 && (
                <span className="text-amber-600 text-xs flex items-center gap-1 ml-auto">
                  <AlertTriangle className="w-4 h-4" /> Khoản chi lớn (≥10 triệu)
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ── Expense Table ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('date')}>
                  <div className="flex items-center gap-1">Ngày <SortIcon field="date" /></div>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('category')}>
                  <div className="flex items-center gap-1">Danh mục <SortIcon field="category" /></div>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Mô tả</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                  <div className="flex items-center gap-1 justify-end">Số tiền <SortIcon field="amount" /></div>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">HT thanh toán</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Ghi chú</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    Chưa có khoản chi nào trong tháng này
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(exp => (
                  <tr key={exp.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      <Calendar className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />
                      {formatDate(exp.date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                        {exp.category}
                      </span>
                      {exp.isRecurring && (
                        <span className="ml-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-medium">
                          <RotateCcw className="w-2.5 h-2.5 inline mr-0.5" />{exp.recurringNote || 'Định kỳ'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{exp.description}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600 whitespace-nowrap">
                      -{formatCurrency(exp.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{exp.paymentMethod}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-[120px] truncate">{exp.notes || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(exp)}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 transition"
                          title="Sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {currentUser?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={3} className="px-4 py-3 font-bold text-slate-700">
                    Tổng cộng ({filteredExpenses.length} khoản)
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-600 text-base">
                    -{formatCurrency(monthTotal)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExpenseManagement;
