import React, { useState, useEffect } from 'react';
import { api, formatDate } from '../utils';
import { CalendarDays, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, Save, AlertCircle } from 'lucide-react';

type AttStatus = 'present' | 'absent' | 'excused';

interface AttRow {
  studentId: string;
  studentName: string;
  status: AttStatus;
}

const STATUS_CONFIG: Record<AttStatus, { label: string; color: string; icon: React.ReactNode }> = {
  present: { label: 'Có mặt', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: <CheckCircle2 className="w-4 h-4" /> },
  absent: { label: 'Vắng (trừ buổi)', color: 'bg-red-100 text-red-700 border-red-300', icon: <XCircle className="w-4 h-4" /> },
  excused: { label: 'Vắng có phép', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: <Clock className="w-4 h-4" /> },
};

export default function AttendanceManagement({ students, classes }: { students: any[]; classes: any[] }) {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<AttRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'diem-danh' | 'lich-su'>('diem-danh');

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const studentsInClass = selectedClass
    ? students.filter(s => s.className?.toLowerCase() === selectedClass.name.toLowerCase())
    : [];

  // Load existing attendance when class or date changes
  useEffect(() => {
    if (!selectedClassId || !selectedDate) {
      setRows([]);
      return;
    }
    const init = async () => {
      const existing = await api.getAttendance({ date: selectedDate, classId: selectedClassId });
      const existingMap: Record<string, AttStatus> = {};
      existing.forEach((r: any) => { existingMap[r.studentId] = r.status; });

      setRows(studentsInClass.map(s => ({
        studentId: s.id,
        studentName: s.name,
        status: existingMap[s.id] ?? 'present',
      })));
    };
    init();
  }, [selectedClassId, selectedDate, students, classes]);

  // Load history
  useEffect(() => {
    if (activeTab !== 'lich-su' || !selectedClassId) return;
    setHistoryLoading(true);
    api.getAttendance({ classId: selectedClassId })
      .then(data => {
        // Group by date
        const grouped: Record<string, any[]> = {};
        data.forEach((r: any) => {
          if (!grouped[r.date]) grouped[r.date] = [];
          grouped[r.date].push(r);
        });
        setHistory(Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])));
      })
      .finally(() => setHistoryLoading(false));
  }, [activeTab, selectedClassId]);

  const setStatus = (studentId: string, status: AttStatus) => {
    setRows(prev => prev.map(r => r.studentId === studentId ? { ...r, status } : r));
  };

  const setAllStatus = (status: AttStatus) => {
    setRows(prev => prev.map(r => ({ ...r, status })));
  };

  const handleSave = async () => {
    if (!selectedClassId || !selectedDate) {
      alert('Vui lòng chọn lớp và ngày điểm danh');
      return;
    }
    if (rows.length === 0) {
      alert('Lớp này chưa có học viên nào!');
      return;
    }
    setSaving(true);
    try {
      const records = rows.map(r => ({
        date: selectedDate,
        classId: selectedClassId,
        className: selectedClass?.name || '',
        studentId: r.studentId,
        studentName: r.studentName,
        status: r.status,
      }));
      await api.saveAttendanceBatch(records);
      setSavedMsg('✅ Đã lưu điểm danh thành công!');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err: any) {
      alert('Lỗi lưu điểm danh: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const presentCount = rows.filter(r => r.status === 'present').length;
  const absentCount = rows.filter(r => r.status === 'absent').length;
  const excusedCount = rows.filter(r => r.status === 'excused').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Quản lý Điểm danh</h2>
        <p className="text-sm text-slate-500 mt-1">Điểm danh học viên theo buổi học</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Class Select */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Chọn lớp</label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
            >
              <option value="">-- Chọn lớp học --</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ngày điểm danh</label>
            <div className="flex items-center gap-2">
              <button onClick={() => changeDate(-1)} className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <button onClick={() => changeDate(1)} className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('diem-danh')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'diem-danh' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Điểm danh
            </button>
            <button
              onClick={() => setActiveTab('lich-su')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'lich-su' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Lịch sử
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Sheet */}
      {activeTab === 'diem-danh' && (
        <>
          {!selectedClassId ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">Vui lòng chọn lớp để bắt đầu điểm danh</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <AlertCircle className="w-12 h-12 text-amber-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Lớp <strong>{selectedClass?.name}</strong> chưa có học viên nào</p>
              <p className="text-slate-400 text-sm mt-1">Thêm học viên vào lớp qua module Quản lý Học viên</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Stats bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> {presentCount} có mặt
                  </span>
                  <span className="flex items-center gap-1.5 text-red-600 font-semibold">
                    <XCircle className="w-4 h-4" /> {absentCount} vắng
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
                    <Clock className="w-4 h-4" /> {excusedCount} vắng phép
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Chọn tất cả:</span>
                  {(['present', 'absent', 'excused'] as AttStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setAllStatus(s)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${STATUS_CONFIG[s].color}`}
                    >
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Rows */}
              <div className="divide-y divide-slate-50">
                {rows.map((row, idx) => (
                  <div key={row.studentId} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className="w-8 text-sm font-medium text-slate-400">{idx + 1}</div>
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold shrink-0">
                      {row.studentName.charAt(0)}
                    </div>
                    <div className="flex-1 font-semibold text-slate-800">{row.studentName}</div>
                    {/* Status buttons */}
                    <div className="flex gap-2">
                      {(['present', 'absent', 'excused'] as AttStatus[]).map(s => (
                        <button
                          key={s}
                          onClick={() => setStatus(row.studentId, s)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border-2 transition-all ${
                            row.status === s
                              ? STATUS_CONFIG[s].color + ' shadow-sm scale-105'
                              : 'border-slate-200 text-slate-400 hover:border-slate-300 bg-white'
                          }`}
                        >
                          {STATUS_CONFIG[s].icon}
                          <span className="hidden sm:inline">{STATUS_CONFIG[s].label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Save button */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
                {savedMsg ? (
                  <span className="text-emerald-600 font-semibold text-sm">{savedMsg}</span>
                ) : (
                  <span className="text-xs text-slate-400">Vắng không có phép → trừ 1 buổi | Vắng có phép → không trừ</span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* History Tab */}
      {activeTab === 'lich-su' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {!selectedClassId ? (
            <div className="p-12 text-center text-slate-400">Vui lòng chọn lớp để xem lịch sử</div>
          ) : historyLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center text-slate-400">Chưa có lịch sử điểm danh nào</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map(([date, records]: [string, any[]]) => {
                const present = records.filter(r => r.status === 'present').length;
                const absent = records.filter(r => r.status === 'absent').length;
                const excused = records.filter(r => r.status === 'excused').length;
                return (
                  <div key={date} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-slate-700">
                        {new Date(date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                      <div className="flex gap-3 text-xs font-semibold">
                        <span className="text-emerald-600">{present} có mặt</span>
                        <span className="text-red-500">{absent} vắng</span>
                        {excused > 0 && <span className="text-amber-500">{excused} phép</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {records.map((r: any) => (
                        <span key={r.studentId} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${STATUS_CONFIG[r.status as AttStatus].color}`}>
                          {STATUS_CONFIG[r.status as AttStatus].icon}
                          {r.studentName}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
