import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../utils';
import { useToast } from './Toast';
import ClassTransferModal from './ClassTransferModal';
import ImportModal from './ImportModal';
import StudentTimeline from './StudentTimeline';
import * as XLSX from 'xlsx-js-style';
import {
  Users, Plus, Pencil, Trash2, X, Save, Search,
  Phone, Calendar, BookOpen, UserCircle, GraduationCap, Wallet, ArrowRight,
  FileSpreadsheet, Download, History
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
  status: 'active' | 'suspended' | 'left';
  enrollDate: string;
  parentEmail: string;
  address: string;
  notes: string;
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
  status: 'active',
  enrollDate: new Date().toISOString().slice(0, 10),
  parentEmail: '',
  address: '',
  notes: '',
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
  classes?: any[];
  transactions?: any[];
  onStudentsUpdated?: (students: any[]) => void;
}) {
  const toast = useToast();
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBirthYear, setFilterBirthYear] = useState('');
  const [filterTuition, setFilterTuition] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [form, setForm] = useState<StudentFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [isVietNameManual, setIsVietNameManual] = useState(false);
  const [transferStudent, setTransferStudent] = useState<any | null>(null);
  const [selectedStudentTimeline, setSelectedStudentTimeline] = useState<any | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const birthYears = useMemo(() => {
    return [...new Set(students.map((s: any) => Number(s.birthYear)).filter(Boolean))].sort((a: number, b: number) => b - a);
  }, [students]);

  const sessionsRemainingMap = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    students.forEach(student => {
      const fee = Number(student.feePerSession) || 0;
      const totalPaid = transactions
        .filter(t =>
          // Primary: match by studentId (reliable)
          (t.studentId && t.studentId === student.id) ||
          // Fallback: match by name for legacy transactions without studentId
          (!t.studentId && t.studentName?.toLowerCase() === student.name?.toLowerCase())
        )
        .filter(t => t.revenueCategory === 'Học phí offline' || t.revenueCategory === 'Học phí online')
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const bought = fee > 0 ? Math.floor(totalPaid / fee) : 0;
      const used = attendance.filter(a =>
        (a.studentId === student.id || a.studentName?.toLowerCase() === student.name?.toLowerCase()) &&
        a.status !== 'excused'
      ).length;
      map[student.id] = bought - used;
    });
    return map;
  }, [students, transactions, attendance]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForm) {
        setShowForm(false);
        setEditingStudent(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm]);

  const loadStudents = async (): Promise<any[]> => {
    try {
      setLoading(true);
      const data = await api.getStudents();
      setStudents(data);
      onStudentsUpdated?.(data);

      const att = await api.getAttendance();
      setAttendance(att);
      return data;
    } catch (err: any) {
      toast.error('Lỗi tải danh sách học viên', err.message);
      return [];
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
      status: student.status || 'active',
      enrollDate: student.enrollDate || student.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      parentEmail: student.parentEmail || '',
      address: student.address || '',
      notes: student.notes || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập họ và tên học viên!');
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
        status: form.status,
        enrollDate: form.enrollDate,
        parentEmail: form.parentEmail.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
      };

      if (editingStudent) {
        await api.updateStudent(editingStudent.id, payload);
      } else {
        await api.createStudent(payload);
      }

      await loadStudents();
      setShowForm(false);
      setEditingStudent(null);
      toast.success(editingStudent ? 'Đã cập nhật học viên!' : 'Đã thêm học viên mới!', form.name.trim());
    } catch (err: any) {
      toast.error('Lỗi lưu học viên', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student: any) => {
    const ok = await toast.confirm({
      title: `Xóa học viên "${student.name}"?`,
      message: 'Hành động này không thể hoàn tác.',
      confirmText: 'Xóa',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteStudent(student.id);
      const updated = students.filter(s => s.id !== student.id);
      setStudents(updated);
      onStudentsUpdated?.(updated);
      toast.success('Đã xóa học viên!', student.name);
    } catch (err: any) {
      toast.error('Lỗi xóa học viên', err.message);
    }
  };

  const handleStatusChange = async (studentId: string, newStatus: 'active' | 'suspended' | 'left', studentName: string) => {
    try {
      await api.updateStudent(studentId, { status: newStatus });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: newStatus } : s));
      toast.success('Đã cập nhật trạng thái!', `${studentName} -> ${newStatus === 'active' ? 'Đang học' : newStatus === 'suspended' ? 'Tạm nghỉ' : 'Đã nghỉ'}`);
    } catch (err: any) {
      toast.error('Lỗi cập nhật trạng thái', err.message);
    }
  };

  const handleExportExcel = () => {
    try {
      if (filtered.length === 0) {
        toast.warning('Không có dữ liệu', 'Không có học viên nào để xuất Excel.');
        return;
      }

      const dataToExport = filtered.map((s, idx) => ({
        'STT': idx + 1,
        'Họ và tên': s.name || '',
        'Tên tiếng Việt': s.vietnameseName || '',
        'Tên tiếng Anh': s.englishName || '',
        'Tên Việt Anh': s.vietAnhName || '',
        'Lớp học': s.className || '',
        'Giới tính': s.gender || '',
        'Năm sinh': s.birthYear || '',
        'SĐT phụ huynh': s.parentPhone || '',
        'Email phụ huynh': s.parentEmail || '',
        'Học phí/buổi (VNĐ)': s.feePerSession || 0,
        'Số buổi còn lại': sessionsRemainingMap[s.id] ?? 0,
        'Trạng thái': s.status === 'active' ? 'Đang học' : s.status === 'suspended' ? 'Tạm nghỉ' : 'Đã nghỉ',
        'Ngày nhập học': s.enrollDate || '',
        'Địa chỉ': s.address || '',
        'Ghi chú': s.notes || '',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);

      // Auto-fit column widths
      const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
        wch: Math.max(key.length + 4, 15)
      }));
      ws['!cols'] = colWidths;

      // Stylize headers (Indigo background, white bold text)
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:O1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
        if (ws[cellRef]) {
          ws[cellRef].s = {
            fill: { fgColor: { rgb: '4F46E5' } },
            font: { color: { rgb: 'FFFFFF' }, bold: true, size: 10 },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Danh sách Học viên');
      XLSX.writeFile(wb, 'Danh_Sach_Hoc_Vien_Kim_Academy.xlsx');
      toast.success('Xuất file Excel thành công!');
    } catch (err: any) {
      toast.error('Lỗi xuất file Excel', err.message);
    }
  };

  // Filter
  const filtered = students.filter(s => {
    const searchLower = searchText.toLowerCase().trim();
    const matchSearch = !searchLower || 
      s.name?.toLowerCase().includes(searchLower) ||
      s.englishName?.toLowerCase().includes(searchLower) ||
      s.vietnameseName?.toLowerCase().includes(searchLower) ||
      s.className?.toLowerCase().includes(searchLower) ||
      s.parentPhone?.includes(searchLower);

    const matchClass = !filterClass || s.className === filterClass;
    const matchStatus = !filterStatus || (s.status || 'active') === filterStatus;
    const matchBirthYear = !filterBirthYear || String(s.birthYear) === filterBirthYear;

    let matchTuition = true;
    if (filterTuition) {
      const rem = sessionsRemainingMap[s.id] ?? 0;
      if (filterTuition === 'debt') matchTuition = rem <= 0;
      else if (filterTuition === 'warning') matchTuition = rem > 0 && rem <= 2;
      else if (filterTuition === 'good') matchTuition = rem > 2;
    }

    return matchSearch && matchClass && matchStatus && matchBirthYear && matchTuition;
  });

  // Unique classes from students
  const studentClasses = [...new Set(students.map(s => s.className).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý Học viên</h2>
          <p className="text-sm text-slate-500 mt-1">{students.length} học viên trong hệ thống</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4.5 h-4.5 text-indigo-600" />
            Nhập Excel
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4.5 h-4.5 text-indigo-600" />
            Xuất Excel
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            Thêm học viên
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, lớp..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <select
          value={filterClass}
          onChange={e => setFilterClass(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer"
        >
          <option value="">Tất cả lớp</option>
          {studentClasses.map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">🟢 Đang học</option>
          <option value="suspended">🟡 Tạm nghỉ</option>
          <option value="left">🔴 Đã nghỉ</option>
        </select>
        <select
          value={filterBirthYear}
          onChange={e => setFilterBirthYear(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer"
        >
          <option value="">Tất cả năm sinh</option>
          {birthYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <select
          value={filterTuition}
          onChange={e => setFilterTuition(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer"
        >
          <option value="">Tất cả học phí</option>
          <option value="debt">🔴 Hết buổi (≤ 0)</option>
          <option value="warning">🟡 Sắp hết (1-2)</option>
          <option value="good">🟢 Còn nhiều (&gt; 2)</option>
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
            {searchText || filterClass || filterStatus ? 'Không tìm thấy học viên phù hợp' : 'Chưa có học viên nào'}
          </h3>
          {!searchText && !filterClass && !filterStatus && (
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Liên hệ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Còn lại</th>
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
                        <div 
                          className="font-semibold text-slate-800 hover:text-indigo-600 hover:underline cursor-pointer"
                          onClick={() => setSelectedStudentTimeline(student)}
                          title="Xem lịch sử / Timeline"
                        >
                          {student.name}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          {student.englishName && <span>{student.englishName}</span>}
                          {student.englishName && <span className="text-slate-300">•</span>}
                          <span className="font-medium">{student.gender || 'Nam'} ({student.birthYear || '—'})</span>
                        </div>
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
                  <td className="px-4 py-3.5 text-slate-500">
                    <div className="space-y-0.5">
                      <div className="font-mono text-xs text-slate-700 font-semibold">{student.parentPhone || '—'}</div>
                      {student.parentEmail && (
                        <div className="text-xs text-slate-400 truncate max-w-[150px]" title={student.parentEmail}>
                          {student.parentEmail}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      value={student.status || 'active'}
                      onChange={(e) => handleStatusChange(student.id, e.target.value as any, student.name)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border cursor-pointer outline-none transition-colors ${(student.status || 'active') === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : (student.status || 'active') === 'suspended'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                    >
                      <option value="active" className="bg-white text-emerald-700">🟢 Đang học</option>
                      <option value="suspended" className="bg-white text-amber-700">🟡 Tạm nghỉ</option>
                      <option value="left" className="bg-white text-rose-700">🔴 Đã nghỉ</option>
                    </select>
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium">
                    {student.className ? (
                      (() => {
                        const rem = sessionsRemainingMap[student.id] ?? 0;
                        return (
                          <span className={`inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-full text-xs ${
                            rem <= 0 ? 'bg-red-50 text-red-700 border border-red-200'
                            : rem <= 2 ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {rem} buổi
                          </span>
                        );
                      })()
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold">
                    {student.feePerSession > 0 ? (
                      <span className="text-emerald-700">
                        {Number(student.feePerSession).toLocaleString('vi-VN')}đ
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs italic font-normal">Chưa cài</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setSelectedStudentTimeline(student)}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                        title="Xem lịch sử / Timeline"
                      >
                        <History className="w-4 h-4 text-slate-500 hover:text-indigo-600" />
                      </button>
                      <button
                        onClick={() => setTransferStudent(student)}
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                        title="Chuyển lớp"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(student)}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(student)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
          >
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
                      onChange={e => {
                        const selectedClassName = e.target.value;
                        setForm(f => {
                          const targetClass = classes.find(cls => cls.name === selectedClassName);
                          const updatedFee = targetClass?.defaultFee 
                            ? new Intl.NumberFormat('en-US').format(targetClass.defaultFee) 
                            : f.feePerSession;
                          return {
                            ...f,
                            className: selectedClassName,
                            feePerSession: updatedFee
                          };
                        });
                      }}
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

                {/* Trạng thái */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Trạng thái</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                  >
                    <option value="active">🟢 Đang học</option>
                    <option value="suspended">🟡 Tạm nghỉ</option>
                    <option value="left">🔴 Đã nghỉ</option>
                  </select>
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
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${form.gender === g
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

                {/* Email phụ huynh */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Email phụ huynh</label>
                  <input
                    type="email"
                    value={form.parentEmail}
                    onChange={e => setForm(f => ({ ...f, parentEmail: e.target.value }))}
                    placeholder="phuhuynh@email.com"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Ngày nhập học */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Ngày nhập học</label>
                  <input
                    type="date"
                    value={form.enrollDate}
                    onChange={e => setForm(f => ({ ...f, enrollDate: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Học phí / buổi */}
                <div>
                  <label className="block text-xs font-semibold text-indigo-500 mb-1.5 uppercase tracking-wider">
                    Học phí / buổi (VNĐ)
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
                    <p className="text-[10px] text-indigo-500 mt-1 text-right">
                      = {parseInt(form.feePerSession.replace(/\D/g, '') || '0', 10).toLocaleString('vi-VN')} đ/buổi
                    </p>
                  )}
                </div>

                {/* Địa chỉ */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Địa chỉ thường trú</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Ghi chú nội bộ */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Ghi chú nội bộ</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Thông tin thêm (VD: cựu học sinh trung tâm, có quà tặng đầu năm...)"
                    rows={2}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                  />
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
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : editingStudent ? 'Cập nhật' : 'Lưu học viên'}
              </button>
            </div>
          </form>
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

      {/* Excel Import Modal */}
      {showImportModal && (
        <ImportModal
          classes={classes}
          onConfirm={() => {
            loadStudents();
            setShowImportModal(false);
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {/* Student Timeline Drawer/Modal */}
      {selectedStudentTimeline && (
        <StudentTimeline
          student={selectedStudentTimeline}
          classes={classes}
          transactions={transactions}
          onClose={() => setSelectedStudentTimeline(null)}
          onUpdate={async () => {
            const updatedList = await loadStudents();
            if (updatedList) {
              const updated = updatedList.find((s: any) => s.id === selectedStudentTimeline.id);
              if (updated) setSelectedStudentTimeline(updated);
            }
          }}
        />
      )}
    </div>
  );
}
