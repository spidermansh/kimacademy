import React, { useState, useEffect } from 'react';
import { Class } from '../types';
import { api } from '../utils';
import { Plus, Pencil, Trash2, BookOpen, Monitor, Users, X, Save, ChevronDown } from 'lucide-react';

interface ClassFormData {
  name: string;
  type: 'offline' | 'online';
  schedule: string;
  teacher: string;
  description: string;
}

const EMPTY_FORM: ClassFormData = {
  name: '',
  type: 'offline',
  schedule: '',
  teacher: '',
  description: '',
};

export default function ClassManagement({ students }: { students: any[] }) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [form, setForm] = useState<ClassFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const data = await api.getClasses();
      setClasses(data);
    } catch (err: any) {
      alert('Lỗi tải danh sách lớp: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingClass(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (cls: Class) => {
    setEditingClass(cls);
    setForm({
      name: cls.name,
      type: cls.type,
      schedule: cls.schedule,
      teacher: cls.teacher,
      description: cls.description,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('Vui lòng nhập tên lớp!');
      return;
    }
    setSaving(true);
    try {
      if (editingClass) {
        const updated = await api.updateClass(editingClass.id, form);
        setClasses(prev => prev.map(c => c.id === editingClass.id ? updated : c));
      } else {
        const created = await api.createClass(form);
        setClasses(prev => [...prev, created]);
      }
      setShowForm(false);
      setEditingClass(null);
    } catch (err: any) {
      alert('Lỗi lưu lớp: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cls: Class) => {
    if (!confirm(`Xóa lớp "${cls.name}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await api.deleteClass(cls.id);
      setClasses(prev => prev.filter(c => c.id !== cls.id));
    } catch (err: any) {
      alert('Lỗi xóa lớp: ' + err.message);
    }
  };

  const getStudentsInClass = (className: string) =>
    students.filter(s => s.className?.toLowerCase() === className.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý Lớp học</h2>
          <p className="text-sm text-slate-500 mt-1">{classes.length} lớp đang hoạt động</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm lớp mới
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && classes.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-500 font-medium text-lg">Chưa có lớp học nào</h3>
          <p className="text-slate-400 text-sm mt-2">Nhấn "Thêm lớp mới" để tạo lớp đầu tiên</p>
        </div>
      )}

      {/* Class Grid */}
      {!loading && classes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {classes.map(cls => {
            const enrolled = getStudentsInClass(cls.name);
            const isExpanded = expandedClass === cls.id;
            return (
              <div key={cls.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Card Header */}
                <div className={`p-5 ${cls.type === 'offline' ? 'bg-gradient-to-r from-indigo-600 to-indigo-500' : 'bg-gradient-to-r from-emerald-600 to-emerald-500'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-white font-bold text-lg leading-tight">{cls.name}</h3>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold mt-1 px-2 py-0.5 rounded-full ${cls.type === 'offline' ? 'bg-indigo-700/60 text-indigo-100' : 'bg-emerald-700/60 text-emerald-100'}`}>
                        {cls.type === 'offline' ? <BookOpen className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                        {cls.type === 'offline' ? 'Offline' : 'Online'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(cls)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(cls)} className="p-1.5 rounded-lg bg-white/20 hover:bg-red-500 text-white transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-3">
                  {cls.schedule && (
                    <div className="text-sm text-slate-600">
                      <span className="font-medium text-slate-500">Lịch học:</span> {cls.schedule}
                    </div>
                  )}
                  {cls.teacher && (
                    <div className="text-sm text-slate-600">
                      <span className="font-medium text-slate-500">Giáo viên:</span> {cls.teacher}
                    </div>
                  )}
                  {cls.description && (
                    <div className="text-sm text-slate-500 italic">{cls.description}</div>
                  )}

                  {/* Students count */}
                  <button
                    onClick={() => setExpandedClass(isExpanded ? null : cls.id)}
                    className="w-full flex items-center justify-between pt-3 border-t border-slate-100 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {enrolled.length} học viên
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="space-y-1.5 pt-1">
                      {enrolled.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-2">Chưa có học viên nào</p>
                      ) : (
                        enrolled.map(s => (
                          <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg text-sm">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                              {s.name.charAt(0)}
                            </div>
                            <span className="text-slate-700 font-medium">{s.name}</span>
                            {s.feePerSession > 0 && (
                              <span className="ml-auto text-xs text-slate-400">
                                {s.feePerSession.toLocaleString('vi-VN')}đ/buổi
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">
                {editingClass ? 'Chỉnh sửa lớp học' : 'Thêm lớp học mới'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tên lớp *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="VD: Big 1, Big 2, Junior..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Loại hình</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setForm(f => ({ ...f, type: 'offline' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${form.type === 'offline' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                  >
                    <BookOpen className="w-4 h-4" /> Offline
                  </button>
                  <button
                    onClick={() => setForm(f => ({ ...f, type: 'online' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${form.type === 'online' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-emerald-300'}`}
                  >
                    <Monitor className="w-4 h-4" /> Online
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lịch học</label>
                <input
                  type="text"
                  value={form.schedule}
                  onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
                  placeholder="VD: Thứ 2, 4, 6 — 17:30-19:00"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Giáo viên phụ trách</label>
                <input
                  type="text"
                  value={form.teacher}
                  onChange={e => setForm(f => ({ ...f, teacher: e.target.value }))}
                  placeholder="Tên giáo viên"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ghi chú về lớp học..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : 'Lưu lớp học'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
