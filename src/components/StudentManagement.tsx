import React, { useState, useEffect } from 'react';
import { api } from '../utils';
import ClassTransferModal from './ClassTransferModal';
import {
  Users, Plus, Pencil, Trash2, X, Save, Search,
  Phone, Calendar, BookOpen, UserCircle, GraduationCap, Wallet, ArrowRight
} from 'lucide-react';

interface StudentFormData {
  name: string;
  vietnameseName: string;
  englishName: string;
  className: string;
  gender: string;
  birthYear: number;
  parentPhone: string;
  feePerSession: string;
}

const EMPTY_FORM: StudentFormData = {
  name: '',
  vietnameseName: '',
  englishName: '',
  className: '',
  gender: 'Nam',
  birthYear: new Date().getFullYear() - 10,
  parentPhone: '',
  feePerSession: '',
};

const extractVietnameseName = (name: string): string => {
  const clean = name.trim();
  if (!clean) return '';
  const parts = clean.split(/\s+/);
  if (parts.length <= 2) return clean;
  return parts.slice(-2).join(' ');
};

export default function StudentManagement({
  classes = [],
  transactions = [],
  onStudentsUpdated,
}: {
  classes?: { id: string; name: string; type: string }[];
  transactions?: any[];
  onStudentsUpdated?: (students: any[]) => void;
}) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [form, setForm] = useState<StudentFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [isVietNameManual, setIsVietNameManual] = useState(false);
  const [transferStudent, setTransferStudent] = useState<any | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await api.getStudents();
      setStudents(data);
      onStudentsUpdated?.(data);
    } catch (err: any) {
      alert('Lỗi tải danh sách học viên: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-compute vietAnhName
  const vietAnhName = (() => {
    const vn = form.vietnameseName.trim();
    const en = form.englishName.trim();
    return en ? `${vn} - ${en}` : vn;
  })();

  // Auto-update vietnameseName when fullName changes (unless manually set)
  const handleNameChange = (val: string) => {
    setForm(f => ({ ...f, name: val }));
    if (!isVietNameManual) {
      setForm(f => ({ ...f, name: val, vietnameseName: extractVietnameseName(val) }));
    }
  };

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setForm(f => ({ ...f, feePerSession: raw ? new Intl.NumberFormat('en-US').format(parseInt(raw, 10)) : '' }));
  };

  const openAdd = () => {
    setEditingStudent(null);
    setForm(EMPTY_FORM);
    setIsVietNameManual(false);
    setShowForm(true);
  };

  const openEdit = (student: any) => {
    setEditingStudent(student);
    setIsVietNameManual(true);
    setForm({
      name: student.name || '',
      vietnameseName: student.vietnameseName || extractVietnameseName(student.name || ''),
      englishName: student.englishName || '',
      className: student.className || '',
      gender: student.gender || 'Nam',
      birthYear: student.birthYear || new Date().getFullYear() - 10,
      parentPhone: student.parentPhone || '',
      feePerSession: student.feePerSession
        ? new Intl.NumberFormat('en-US').format(student.feePerSession)
        : '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('Vui lòng nhập họ và tên học viên!');
      return;
    }
    setSaving(true);
    try {
      const feeNumeric = parseInt(form.feePerSession.replace(/\D/g, '') || '0', 10);
      const payload = {
        name: form.name.trim(),
        vietnameseName: form.vietnameseName.trim(),
        englishName: form.englishName.trim(),
        vietAnhName: vietAnhName.trim(),
        className: form.className.trim(),
        gender: form.gender,
        birthYear: Number(form.birthYear),
        parentPhone: form.parentPhone.trim(),
        feePerSession: feeNumeric,
      };

      if (editingStudent) {
        await api.updateStudent(editingStudent.id, payload);
      } else {
        await api.createStudent(payload);
      }

      await loadStudents();
      setShowForm(false);
      setEditingStudent(null);
    } catch (err: any) {
      alert('Lỗi lưu học viên: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student: any) => {
    if (!confirm(`Xóa học viên "${student.name}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await api.deleteStudent(student.id);
      const updated = students.filter(s => s.id !== student.id);
      setStudents(updated);
      onStudentsUpdated?.(updated);
    } catch (err: any) {
      alert('Lỗi xóa học viên: ' + err.message);
    }
  };

  // Filter
  const filtered = students.filter(s => {
    const matchName = !searchText || s.name?.toLowerCase().includes(searchText.toLowerCase());
    const matchClass = !filterClass || s.className === filterClass;
    return matchName && matchClass;
  });

  // Unique classes from students
  const studentClasses = [...new Set(students.map(s => s.className).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý Học viên</h2>
          <p className="text-sm text-slate-500 mt-1">{students.length} học viên trong hệ thống</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm học viên
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên học viên..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={filterClass}
          onChange={e => setFilterClass(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
        >
          <option value="">Tất cả lớp</option>
          {studentClasses.map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-500 font-medium text-lg">
            {searchText || filterClass ? 'Không tìm thấy học viên phù hợp' : 'Chưa có học viên nào'}
          </h3>
          {!searchText && !filterClass && (
            <p className="text-slate-400 text-sm mt-2">Nhấn "Thêm học viên" để tạo hồ sơ đầu tiên</p>
          )}
        </div>
      )}

      {/* Student Table */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Họ và tên</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tên Việt Anh</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lớp</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Giới tính</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Năm sinh</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">SĐT phụ huynh</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">HP/buổi</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((student, idx) => (
                <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 text-slate-400 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${student.gender === 'Nữ' ? 'bg-pink-100 text-pink-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {student.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{student.name}</div>
                        {student.englishName && (
                          <div className="text-xs text-slate-400">{student.englishName}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 font-medium">
                    {student.vietAnhName || student.vietnameseName || '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    {student.className ? (
                      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-100">
                        <BookOpen className="w-3 h-3" />
                        {student.className}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">{student.gender || '—'}</td>
                  <td className="px-4 py-3.5 text-slate-500">{student.birthYear || '—'}</td>
                  <td className="px-4 py-3.5 text-slate-500 font-mono text-xs">{student.parentPhone || '—'}</td>
                  <td className="px-4 py-3.5 text-right">
                    {student.feePerSession > 0 ? (
                      <span className="font-semibold text-emerald-700">
                        {Number(student.feePerSession).toLocaleString('vi-VN')}đ
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs italic">Chưa cài</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setTransferStudent(student)}
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                        title="Chuyển lớp"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(student)}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(student)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-indigo-900 rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingStudent ? 'Chỉnh sửa hồ sơ học viên' : 'Thêm học viên mới'}
                </h3>
                <p className="text-indigo-300 text-xs mt-0.5">
                  {editingStudent ? `Đang chỉnh sửa: ${editingStudent.name}` : 'Điền đầy đủ thông tin học viên'}
                </p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-indigo-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-indigo-200" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Họ và tên */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="VD: Bùi Trần Sơn Hải"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Tên tiếng Việt */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Tên tiếng Việt <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.vietnameseName}
                    onChange={e => {
                      setForm(f => ({ ...f, vietnameseName: e.target.value }));
                      setIsVietNameManual(true);
                    }}
                    placeholder="VD: Sơn Hải"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Tên tiếng Anh */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Tên tiếng Anh
                  </label>
                  <input
                    type="text"
                    value={form.englishName}
                    onChange={e => setForm(f => ({ ...f, englishName: e.target.value }))}
                    placeholder="VD: Jack"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Tên Việt Anh */}
                <div className="col-span-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Tên Việt Anh (tự động)</p>
                  <p className="text-sm font-black text-indigo-900">{vietAnhName || 'Chưa xác định'}</p>
                </div>

                {/* Lớp học */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Lớp học</label>
                  {classes.length > 0 ? (
                    <select
                      value={form.className}
                      onChange={e => setForm(f => ({ ...f, className: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="">-- Chọn lớp --</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.name}>
                          {cls.name} ({cls.type === 'offline' ? 'Offline' : 'Online'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={form.className}
                      onChange={e => setForm(f => ({ ...f, className: e.target.value }))}
                      placeholder="VD: IELTS 7.0"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  )}
                </div>

                {/* Giới tính */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Giới tính</label>
                  <div className="flex gap-2">
                    {['Nam', 'Nữ', 'Khác'].map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, gender: g }))}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                          form.gender === g
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Năm sinh */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Năm sinh</label>
                  <input
                    type="number"
                    value={form.birthYear}
                    onChange={e => setForm(f => ({ ...f, birthYear: Number(e.target.value) }))}
                    min="1980"
                    max={new Date().getFullYear()}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* SĐT phụ huynh */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">SĐT / Zalo phụ huynh</label>
                  <input
                    type="text"
                    value={form.parentPhone}
                    onChange={e => setForm(f => ({ ...f, parentPhone: e.target.value }))}
                    placeholder="0912345678"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Học phí / buổi */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-indigo-500 mb-1.5 uppercase tracking-wider">
                    Học phí mỗi buổi học (VNĐ)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.feePerSession}
                      onChange={handleFeeChange}
                      placeholder="VD: 87,500"
                      className="w-full px-4 py-2.5 border-2 border-indigo-200 bg-indigo-50 rounded-xl text-sm font-mono text-right font-semibold text-indigo-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-indigo-400 font-medium pointer-events-none">đ/buổi</span>
                  </div>
                  {form.feePerSession && (
                    <p className="text-xs text-indigo-500 mt-1 text-right">
                      = {parseInt(form.feePerSession.replace(/\D/g, '') || '0', 10).toLocaleString('vi-VN')} đ mỗi buổi
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : editingStudent ? 'Cập nhật' : 'Lưu học viên'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Class Transfer Modal */}
      {transferStudent && (
        <ClassTransferModal
          student={transferStudent}
          transactions={transactions}
          classes={classes}
          onConfirm={(updatedStudent) => {
            setStudents(prev => prev.map(s => s.id === updatedStudent?.id ? { ...s, ...updatedStudent } : s));
            loadStudents();
            setTransferStudent(null);
          }}
          onClose={() => setTransferStudent(null)}
        />
      )}
    </div>
  );
}
