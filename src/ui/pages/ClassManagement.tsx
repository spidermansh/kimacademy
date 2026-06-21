import React, { useState, useEffect } from 'react';
import { Class, StaffMember } from '../../shared/types';
import { api } from '../../shared/utils';
import { useToast } from '../components/Toast';
import { 
  Plus, Pencil, Trash2, BookOpen, Monitor, Users, X, Save, ChevronDown,
  MapPin, Wallet, TrendingUp, Clock, AlertTriangle, Activity
} from 'lucide-react';

interface ClassFormData {
  code: string;
  name: string;
  type: 'offline' | 'online';
  schedule: string;
  teacher: string;
  teacherId: string;
  description: string;
  room: string;
  maxStudents: number;
  status: 'active' | 'suspended' | 'ended';
  defaultFee: string;
  scheduleDays: string[];
  scheduleTime: string;
}

const EMPTY_FORM: ClassFormData = {
  code: '',
  name: '',
  type: 'offline',
  schedule: '',
  teacher: '',
  teacherId: '',
  description: '',
  room: '',
  maxStudents: 15,
  status: 'active',
  defaultFee: '',
  scheduleDays: [],
  scheduleTime: '',
};

const DAYS_OF_WEEK = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

export default function ClassManagement({ 
  students,
  transactions = [],
  onClassesUpdated,
  userRole,
  userName,
}: { 
  students: any[];
  transactions?: any[];
  onClassesUpdated?: (classes: any[]) => void;
  userRole?: string;
  userName?: string;
}) {
  const toast = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [form, setForm] = useState<ClassFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [teacherStaff, setTeacherStaff] = useState<StaffMember[]>([]);
  const [renameReason, setRenameReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [classHistoryMap, setClassHistoryMap] = useState<Record<string, any[]>>({});

  useEffect(() => {
    api.getStaff().then((data: StaffMember[]) => {
      setTeacherStaff(data.filter(s => (s.role === 'teacher' || s.role === 'teaching_assistant') && s.status === 'active'));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadClassesAndAttendance();
    loadEnrollments();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForm) {
        setShowForm(false);
        setEditingClass(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm]);

  const loadClassesAndAttendance = async () => {
    try {
      setLoading(true);
      const [classData, attData] = await Promise.all([
        api.getClasses(),
        api.getAttendance(),
      ]);
      setClasses(classData);
      setAttendance(attData);
      onClassesUpdated?.(classData);
    } catch (err: any) {
      toast.error('Lỗi tải dữ liệu', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadEnrollments = async () => {
    try {
      const data = await api.getEnrollments();
      setEnrollments(data);
    } catch (err: any) {
      console.error('Lỗi tải danh sách ghi danh:', err.message);
    }
  };

  const openAdd = () => {
    setEditingClass(null);
    setForm(EMPTY_FORM);
    setRenameReason('');
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setShowForm(true);
  };

  const openEdit = (cls: Class) => {
    setEditingClass(cls);
    setForm({
      code: cls.code || '',
      name: cls.name,
      type: cls.type,
      schedule: cls.schedule || '',
      teacher: cls.teacher || '',
      teacherId: cls.teacherId || '',
      description: cls.description || '',
      room: cls.room || '',
      maxStudents: cls.maxStudents || 15,
      status: cls.status || 'active',
      defaultFee: cls.defaultFee ? new Intl.NumberFormat('en-US').format(cls.defaultFee) : '',
      scheduleDays: cls.scheduleDays || [],
      scheduleTime: cls.scheduleTime || '',
    });
    setRenameReason('');
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setShowForm(true);
  };

  const toggleDay = (day: string) => {
    setForm(f => {
      const days = f.scheduleDays.includes(day)
        ? f.scheduleDays.filter(d => d !== day)
        : [...f.scheduleDays, day];
      return { ...f, scheduleDays: days };
    });
  };

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setForm(f => ({ ...f, defaultFee: raw ? new Intl.NumberFormat('en-US').format(parseInt(raw, 10)) : '' }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập tên lớp!');
      return;
    }
    const isRenamed = editingClass && form.name.trim() !== editingClass.name.trim();
    if (isRenamed && !renameReason.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập lý do đổi tên lớp!');
      return;
    }
    setSaving(true);
    try {
      const feeNumeric = parseInt(form.defaultFee.replace(/\D/g, '') || '0', 10);
      const computedSchedule = form.scheduleDays.length > 0 && form.scheduleTime
        ? `${form.scheduleDays.join(', ')} — ${form.scheduleTime}`
        : form.schedule || '';

      const payload = {
        code: form.code.trim() || undefined,
        name: form.name.trim(),
        type: form.type,
        schedule: computedSchedule,
        teacher: form.teacher.trim(),
        teacherId: form.teacherId || undefined,
        description: form.description.trim(),
        room: form.room.trim(),
        maxStudents: Number(form.maxStudents),
        status: form.status,
        defaultFee: feeNumeric,
        scheduleDays: form.scheduleDays,
        scheduleTime: form.scheduleTime.trim(),
        renameReason: isRenamed ? renameReason.trim() : undefined,
        effectiveDate: isRenamed ? effectiveDate : undefined,
      };

      if (editingClass) {
        const updated = await api.updateClass(editingClass.id, payload);
        const nextClasses = classes.map(c => c.id === editingClass.id ? updated : c);
        setClasses(nextClasses);
        onClassesUpdated?.(nextClasses);
        if (isRenamed) {
          const hist = await api.getClassHistory(editingClass.id);
          setClassHistoryMap(prev => ({ ...prev, [editingClass.id]: hist }));
        }
      } else {
        const created = await api.createClass(payload);
        const nextClasses = [...classes, created];
        setClasses(nextClasses);
        onClassesUpdated?.(nextClasses);
      }
      setShowForm(false);
      setEditingClass(null);
      toast.success(editingClass ? 'Đã cập nhật lớp học!' : 'Đã tạo lớp học mới!', form.name.trim());
    } catch (err: any) {
      toast.error('Lỗi lưu lớp', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cls: Class) => {
    const ok = await toast.confirm({
      title: `Xóa lớp "${cls.name}"?`,
      message: 'Hành động này không thể hoàn tác.',
      confirmText: 'Xóa',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteClass(cls.id);
      const nextClasses = classes.filter(c => c.id !== cls.id);
      setClasses(nextClasses);
      onClassesUpdated?.(nextClasses);
      toast.success('Đã xóa lớp!', cls.name);
    } catch (err: any) {
      toast.error('Lỗi xóa lớp', err.message);
    }
  };

  const handleToggleExpand = async (classId: string) => {
    if (expandedClass === classId) {
      setExpandedClass(null);
    } else {
      setExpandedClass(classId);
      if (!classHistoryMap[classId]) {
        try {
          const hist = await api.getClassHistory(classId);
          setClassHistoryMap(prev => ({ ...prev, [classId]: hist }));
        } catch (err) {
          console.error('Lỗi tải lịch sử tên lớp:', err);
        }
      }
    }
  };

  const getStudentsInClass = (className: string) =>
    students.filter(s => enrollments.some(e => e.studentId === s.id && e.className.toLowerCase() === className.toLowerCase() && e.isActive));

  const isTeacherRole = userRole === 'teacher' || userRole === 'teaching_assistant';
  const displayClasses = isTeacherRole
    ? classes.filter(c => c.teacher?.toLowerCase().trim() === userName?.toLowerCase().trim())
    : classes;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý Lớp học</h2>
          <p className="text-sm text-slate-500 mt-1">{classes.length} lớp học trong hệ thống</p>
        </div>
        {!isTeacherRole && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Thêm lớp mới
          </button>
        )}
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
      {!loading && displayClasses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {displayClasses.map(cls => {
            const enrolled = getStudentsInClass(cls.name);
            const isExpanded = expandedClass === cls.id;
            
            // Sĩ số và capacity
            const max = cls.maxStudents || 0;
            const isFull = max > 0 && enrolled.length >= max;
            const percentage = max > 0 ? Math.min(100, Math.round((enrolled.length / max) * 100)) : 0;

            // Chuyên cần
            const classAtt = attendance.filter(a => a.className?.toLowerCase() === cls.name?.toLowerCase());
            const totalAtt = classAtt.length;
            const presentAtt = classAtt.filter(a => a.status === 'present').length;
            const attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : null;

            // Doanh thu tháng hiện tại
            const currentMonth = new Date().toISOString().slice(0, 7);
            const monthlyRevenue = transactions
              .filter(t => 
                t.className?.toLowerCase() === cls.name?.toLowerCase() && 
                t.paymentDate?.startsWith(currentMonth) &&
                t.revenueCategory === 'Học phí offline' &&
                t.studyType !== 'Online'
              )
              .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

            // Badge trạng thái
            const statusLabel = 
              cls.status === 'suspended' ? 'Tạm dừng' :
              cls.status === 'ended' ? 'Kết thúc' : 'Hoạt động';
            
            const statusColor = 
              cls.status === 'suspended' ? 'bg-amber-500/20 text-amber-200 border-amber-500/30' :
              cls.status === 'ended' ? 'bg-rose-500/20 text-rose-200 border-rose-500/30' : 
              'bg-emerald-500/20 text-emerald-200 border-emerald-500/30';

            return (
              <div key={cls.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  {/* Card Header */}
                  <div className="p-5 relative bg-gradient-to-r from-indigo-700 to-indigo-600">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-white font-bold text-lg leading-tight flex flex-col">
                          <span>{cls.name}</span>
                          <span className="text-indigo-200 text-xs font-mono mt-0.5">{cls.code}</span>
                        </h3>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-800/60 text-indigo-100 border border-indigo-500/30">
                            <BookOpen className="w-2.5 h-2.5" />
                            Offline
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                      {!isTeacherRole && (
                        <div className="flex gap-1.5">
                          <button onClick={() => openEdit(cls)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(cls)} className="p-1.5 rounded-lg bg-white/20 hover:bg-rose-600 text-white transition-colors cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    {/* Schedule */}
                    {cls.schedule && (
                      <div className="flex items-start gap-2 text-xs text-slate-600">
                        <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-500">Lịch học:</span>
                          <p className="text-slate-800 font-medium mt-0.5">{cls.schedule}</p>
                        </div>
                      </div>
                    )}

                    {/* Room & Teacher */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {cls.room && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-800 font-medium">Phòng: {cls.room}</span>
                        </div>
                      )}
                      {cls.teacher && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-800 font-medium">GV: {cls.teacher}</span>
                        </div>
                      )}
                    </div>

                    {/* Default fee */}
                    {cls.defaultFee ? (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                        <Wallet className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-500">Học phí:</span>
                        <span className="text-slate-800 font-bold">{cls.defaultFee.toLocaleString('vi-VN')}đ/buổi</span>
                      </div>
                    ) : null}

                    {/* Stats section */}
                    <div className="border-t border-slate-100 pt-3 space-y-2.5">
                      {/* Enrolled / Max Students Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-500">
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Sĩ số:</span>
                          <span className={`flex items-center gap-1 ${isFull ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                            {enrolled.length} / {max > 0 ? max : '—'} học viên 
                            {max > 0 && ` (${percentage}%)`}
                            {isFull && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                          </span>
                        </div>
                        {max > 0 && (
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                isFull ? 'bg-rose-500 animate-pulse' : percentage > 80 ? 'bg-amber-500' : 'bg-indigo-500'
                              }`} 
                              style={{ width: `${percentage}%` }} 
                            />
                          </div>
                        )}
                      </div>

                      {/* Attendance rate */}
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Chuyên cần:</span>
                        {attendanceRate !== null ? (
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                            attendanceRate >= 85 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            attendanceRate >= 70 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {attendanceRate}%
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-normal">Chưa có dữ liệu</span>
                        )}
                      </div>

                      {/* Monthly Revenue */}
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Doanh thu tháng {new Date().getMonth() + 1}:</span>
                        <span className="text-emerald-700 font-bold font-mono">
                          {monthlyRevenue.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {cls.description && (
                      <div className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {cls.description}
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-5">
                  {/* Students list expand button */}
                  <button
                    onClick={() => handleToggleExpand(cls.id)}
                    className="w-full flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Chi tiết & Học viên ({enrolled.length})
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="space-y-4 pt-3">
                      {/* Danh sách học viên */}
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Danh sách học viên ({enrolled.length})</h4>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {enrolled.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-2">Chưa có học viên nào</p>
                          ) : (
                            enrolled.map(s => (
                              <div key={s.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-xs transition-colors">
                                <div className="w-5.5 h-5.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                                  {s.name.charAt(0)}
                                </div>
                                <span className="text-slate-700 font-semibold truncate max-w-[150px]">{s.name}</span>
                                {s.feePerSession > 0 && (
                                  <span className="ml-auto text-[10px] font-mono text-slate-400 font-bold">
                                    {s.feePerSession.toLocaleString('vi-VN')}đ/b
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Lịch sử đổi tên */}
                      {classHistoryMap[cls.id] && classHistoryMap[cls.id].length > 0 && (
                        <div className="space-y-1.5 border-t border-slate-100 pt-3">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lịch sử đổi tên lớp</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {classHistoryMap[cls.id].map((h: any) => (
                              <div key={h.id} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[11px] space-y-1">
                                <div className="flex justify-between font-bold text-slate-700">
                                  <span>{h.oldName} → {h.newName}</span>
                                  <span className="text-slate-400 font-mono">{new Date(h.changedAt).toLocaleDateString('vi-VN')}</span>
                                </div>
                                <p className="text-slate-500 italic">Lý do: {h.reason || 'Không ghi nhận'}</p>
                                <p className="text-[10px] text-slate-400">Người thực hiện: {h.changedBy}</p>
                              </div>
                            ))}
                          </div>
                        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-slate-100 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-indigo-900 text-white shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingClass ? 'Chỉnh sửa cấu hình lớp học' : 'Thêm lớp học mới'}
                </h3>
                <p className="text-indigo-200 text-xs mt-0.5">
                  Điền các thông tin lớp học, phòng học, định mức học phí và lịch học
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => { setShowForm(false); setEditingClass(null); }} 
                className="p-2 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-indigo-200" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Mã lớp học */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Mã lớp học {!editingClass && <span className="text-slate-400 font-normal italic">(Tự sinh)</span>}
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="VD: LH-IELTS-01"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Tên lớp */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Tên lớp học <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="VD: IELTS 7.0, Big 1..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Lý do & Ngày hiệu lực khi đổi tên lớp */}
                {editingClass && form.name.trim() !== editingClass.name.trim() && (
                  <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Yêu cầu ghi nhận lý do đổi tên lớp
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Lý do đổi tên <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={renameReason}
                          onChange={e => setRenameReason(e.target.value)}
                          placeholder="VD: Thay đổi định hướng chương trình..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Ngày hiệu lực <span className="text-red-500">*</span></label>
                        <input
                          type="date"
                          value={effectiveDate}
                          onChange={e => setEffectiveDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Loại hình */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Loại hình học</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-bold border-indigo-600 bg-indigo-50 text-indigo-700 opacity-80"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> Offline (Trực tiếp)
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium italic">
                    * Ứng dụng này chỉ hỗ trợ lớp học trực tiếp (Offline).
                  </p>
                </div>

                {/* Trạng thái lớp */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Trạng thái lớp</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium cursor-pointer"
                  >
                    <option value="active">🟢 Đang hoạt động</option>
                    <option value="suspended">🟡 Tạm dừng hoạt động</option>
                    <option value="ended">🔴 Đã kết thúc lớp</option>
                  </select>
                </div>

                {/* Phòng học */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Phòng học</label>
                  <input
                    type="text"
                    value={form.room}
                    onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
                    placeholder="VD: Phòng 102, Lab A..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Sĩ số tối đa */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Sĩ số tối đa</label>
                  <input
                    type="number"
                    value={form.maxStudents || ''}
                    onChange={e => setForm(f => ({ ...f, maxStudents: parseInt(e.target.value, 10) || 0 }))}
                    placeholder="VD: 15, 20"
                    min="1"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Giáo viên phụ trách */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Giáo viên phụ trách</label>
                  <select
                    value={form.teacherId}
                    onChange={e => {
                      const staffMember = teacherStaff.find(s => s.id === e.target.value);
                      setForm(f => ({ ...f, teacherId: e.target.value, teacher: staffMember?.name || e.target.value }));
                    }}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="">-- Chọn giáo viên --</option>
                    {teacherStaff.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {form.teacher && !teacherStaff.some(t => t.name === form.teacher) && !form.teacherId && (
                    <p className="text-[10px] text-amber-600 mt-1">⚠️ GV "{form.teacher}" chưa có trong danh sách Nhân viên</p>
                  )}
                </div>

                {/* Học phí mặc định */}
                <div>
                  <label className="block text-xs font-semibold text-indigo-600 mb-1.5 uppercase tracking-wider">Học phí mặc định/buổi (VNĐ)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.defaultFee}
                      onChange={handleFeeChange}
                      placeholder="VD: 100,000"
                      className="w-full pl-4 pr-16 py-2.5 border-2 border-indigo-200 bg-indigo-50 rounded-xl text-sm font-mono text-right font-bold text-indigo-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-indigo-400 font-bold pointer-events-none">đ/buổi</span>
                  </div>
                </div>

                {/* Chọn Lịch học (Days of Week) */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Chọn các thứ học trong tuần
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_OF_WEEK.map(day => {
                      const selected = form.scheduleDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${
                            selected 
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Khung giờ học */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Khung giờ dạy</label>
                  <input
                    type="text"
                    value={form.scheduleTime}
                    onChange={e => setForm(f => ({ ...f, scheduleTime: e.target.value }))}
                    placeholder="VD: 18:00 - 19:30, 08:30 - 10:00..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Xem trước lịch học gộp */}
                {(form.scheduleDays.length > 0 || form.scheduleTime) && (
                  <div className="col-span-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">
                      Lịch học hiển thị (Tự động gộp)
                    </p>
                    <p className="text-xs font-black text-indigo-900">
                      {form.scheduleDays.join(', ')} {form.scheduleTime && `— ${form.scheduleTime}`}
                    </p>
                  </div>
                )}

                {/* Nhập tự do (nếu lịch học quá phức tạp) */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Hoặc nhập lịch học tự do (nếu không theo lịch tuần cố định)
                  </label>
                  <input
                    type="text"
                    value={form.schedule}
                    onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
                    placeholder="VD: Học tối 2, 4 hoặc theo thỏa thuận..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl text-xs text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Mô tả */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Mô tả lớp học</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Ghi chú chi tiết về lớp học..."
                    rows={2}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 pt-0 shrink-0">
              <button 
                type="button" 
                onClick={() => { setShowForm(false); setEditingClass(null); }} 
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : editingClass ? 'Cập nhật' : 'Lưu lớp học'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
