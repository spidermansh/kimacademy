import React, { useState, useEffect } from 'react';
import { api, formatCurrency } from '../utils';
import { StaffMember } from '../types';
import { useToast } from './Toast';
import { Users, Plus, Pencil, Trash2, Search, UserCheck, UserX, X, Briefcase, GraduationCap } from 'lucide-react';

interface Props {
  staff: StaffMember[];
  onStaffUpdated: (staff: StaffMember[]) => void;
}

const EMPTY_FORM: Partial<StaffMember> = {
  name: '',
  role: 'teacher',
  phone: '',
  baseSalary: 0,
  ratePerSession: 0,
  bankAccount: '',
  bankName: '',
  startDate: new Date().toISOString().split('T')[0],
  status: 'active',
  notes: '',
};

export default function StaffManagement({ staff, onStaffUpdated }: Props) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'teacher' | 'office'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<StaffMember>>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const filtered = staff.filter(s => {
    if (roleFilter !== 'all' && s.role !== roleFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.phone.includes(search)) return false;
    return true;
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (s: StaffMember) => {
    setEditingId(s.id);
    setForm({ ...s });
    setShowForm(true);
  };

  // Escape key to close form
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForm) {
        setShowForm(false);
        setEditingId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm]);

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập tên nhân viên');
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        const { id, createdAt, updatedAt, ...updates } = form as any;
        await api.updateStaff(editingId, updates);
      } else {
        await api.createStaff(form);
      }
      const updated = await api.getStaff();
      onStaffUpdated(updated);
      setShowForm(false);
      toast.success(editingId ? 'Đã cập nhật nhân viên!' : 'Đã thêm nhân viên mới!', form.name);
    } catch (err: any) {
      toast.error('Lỗi lưu nhân viên', err.message || 'Lỗi khi lưu');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await toast.confirm({
      title: `Xóa nhân viên "${name}"?`,
      message: 'Hành động này không thể hoàn tác.',
      confirmText: 'Xóa',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteStaff(id);
      onStaffUpdated(staff.filter(s => s.id !== id));
      toast.success('Đã xóa nhân viên!', name);
    } catch (err: any) {
      toast.error('Lỗi xóa nhân viên', err.message);
    }
  };

  const activeTeachers = staff.filter(s => s.role === 'teacher' && s.status === 'active').length;
  const activeOffice = staff.filter(s => s.role === 'office' && s.status === 'active').length;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{staff.length}</p>
              <p className="text-xs text-slate-500">Tổng nhân viên</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{activeTeachers}</p>
              <p className="text-xs text-slate-500">Giáo viên</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-violet-600">{activeOffice}</p>
              <p className="text-xs text-slate-500">Văn phòng</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{activeTeachers + activeOffice}</p>
              <p className="text-xs text-slate-500">Đang làm việc</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm">
            <option value="all">Tất cả chức vụ</option>
            <option value="teacher">Giáo viên</option>
            <option value="office">Văn phòng</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm">
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang làm</option>
            <option value="inactive">Đã nghỉ</option>
          </select>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all whitespace-nowrap">
            <Plus className="w-4 h-4" /> Thêm NV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">#</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Họ tên</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Chức vụ</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">SĐT</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Lương cứng</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Lương/buổi</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Trạng thái</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    Chưa có nhân viên nào
                  </td>
                </tr>
              ) : (
                filtered.map((s, i) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-orange-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        s.role === 'teacher' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'
                      }`}>
                        {s.role === 'teacher' ? <GraduationCap className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                        {s.role === 'teacher' ? 'Giáo viên' : 'Văn phòng'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.phone || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(s.baseSalary)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {s.role === 'teacher' ? formatCurrency(s.ratePerSession) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {s.status === 'active' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        {s.status === 'active' ? 'Đang làm' : 'Đã nghỉ'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500 transition-colors" title="Sửa">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s.id, s.name)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors" title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Sửa nhân viên' : 'Thêm nhân viên mới'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">Họ tên *</label>
                <input type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400" placeholder="Nguyễn Văn A" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Chức vụ *</label>
                  <select value={form.role || 'teacher'} onChange={e => setForm({ ...form, role: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
                    <option value="teacher">Giáo viên</option>
                    <option value="office">Nhân viên VP</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">SĐT</label>
                  <input type="text" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm" placeholder="0912345678" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Lương cứng/tháng</label>
                  <input type="text" 
                    value={form.baseSalary ? new Intl.NumberFormat('en-US').format(form.baseSalary) : ''}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setForm({ ...form, baseSalary: raw ? parseInt(raw, 10) : 0 });
                    }}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-right font-mono" placeholder="5,000,000" />
                </div>
                {(form.role === 'teacher') && (
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Lương/buổi dạy</label>
                    <input type="text"
                      value={form.ratePerSession ? new Intl.NumberFormat('en-US').format(form.ratePerSession) : ''}
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setForm({ ...form, ratePerSession: raw ? parseInt(raw, 10) : 0 });
                      }}
                      className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-right font-mono" placeholder="200,000" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Ngân hàng</label>
                  <input type="text" value={form.bankName || ''} onChange={e => setForm({ ...form, bankName: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm" placeholder="Vietcombank" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Số tài khoản</label>
                  <input type="text" value={form.bankAccount || ''} onChange={e => setForm({ ...form, bankAccount: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Ngày bắt đầu</label>
                  <input type="date" value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Trạng thái</label>
                  <select value={form.status || 'active'} onChange={e => setForm({ ...form, status: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
                    <option value="active">Đang làm việc</option>
                    <option value="inactive">Đã nghỉ</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Ghi chú</label>
                <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Hủy</button>
              <button onClick={handleSave} disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg disabled:opacity-50">
                {loading ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Thêm mới')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
