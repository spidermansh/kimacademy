import React, { useState, useEffect, useMemo } from 'react';
import { api, formatDate } from '../../shared/utils';
import { StaffMember, TeachingLog } from '../../shared/types';
import { CalendarDays, Plus, Trash2, ClipboardCheck, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import DateInput from './ui/DateInput';

interface Props {
  staff: StaffMember[];
  classes: any[];
}

export default function TeachingAttendance({ staff, classes }: Props) {
  const [logs, setLogs] = useState<TeachingLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Month navigation
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

  // Days in month
  const daysInMonth = useMemo(() => {
    const [y, m] = currentMonth.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  }, [currentMonth]);

  const monthLabel = useMemo(() => {
    const [y, m] = currentMonth.split('-').map(Number);
    return `Tháng ${m}/${y}`;
  }, [currentMonth]);

  // Load logs for month
  useEffect(() => {
    setLoading(true);
    api.getTeachingLogs({ month: currentMonth })
      .then(data => setLogs(data))
      .finally(() => setLoading(false));
  }, [currentMonth]);

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ staffId: '', className: '', date: '', sessions: 1, hoursWorked: 0 });

  // Detail filters
  const [detailStaffFilter, setDetailStaffFilter] = useState('');
  const [detailClassFilter, setDetailClassFilter] = useState('');

  // Unique class names from logs
  const logClassNames = useMemo(() => {
    const names = new Set(logs.map(l => l.className));
    return Array.from(names).sort();
  }, [logs]);

  // Filtered logs for detail section
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (detailStaffFilter && l.staffId !== detailStaffFilter) return false;
      if (detailClassFilter && l.className !== detailClassFilter) return false;
      return true;
    });
  }, [logs, detailStaffFilter, detailClassFilter]);

  // Build grid: staffId -> day -> sessions count (or hours worked for TA)
  const grid = useMemo(() => {
    const m: Record<string, Record<number, { total: number; ids: string[] }>> = {};
    logs.forEach(log => {
      if (!m[log.staffId]) m[log.staffId] = {};
      const day = parseInt(log.date.split('-')[2]);
      if (!m[log.staffId][day]) m[log.staffId][day] = { total: 0, ids: [] };
      
      const s = staff.find(st => st.id === log.staffId);
      const isTA = s?.role === 'teaching_assistant';
      const val = isTA ? (log.hoursWorked || 0) : (log.sessions || 1);
      
      m[log.staffId][day].total += val;
      m[log.staffId][day].ids.push(log.id);
    });
    return m;
  }, [logs, staff]);

  const handleAdd = async () => {
    const selectedStaff = staff.find(s => s.id === addForm.staffId);
    const isTA = selectedStaff?.role === 'teaching_assistant';
    const finalClassName = isTA ? (addForm.className || 'Lớp tự do') : addForm.className;

    if (!addForm.staffId || !addForm.date || !finalClassName) {
      return alert('Vui lòng điền đầy đủ thông tin');
    }

    if (!isTA) {
      // ── Cross-validate: kiểm tra điểm danh lớp + ngày (chỉ cho GV chính) ──
      try {
        const attendanceRecords = await api.getAttendance({
          classId: finalClassName,
          date: addForm.date,
        });
        const hasPresent = attendanceRecords.some((a: any) => a.status === 'present');

        if (attendanceRecords.length === 0) {
          const ok = confirm(
            `⚠️ CẢNH BÁO: Lớp "${finalClassName}" chưa có dữ liệu điểm danh ngày ${addForm.date}.\n\n` +
            `Thêm buổi dạy khi chưa điểm danh sẽ gây không khớp dữ liệu.\n\n` +
            `Khuyến nghị: Điểm danh trước → hệ thống tự tạo chấm công.\n\n` +
            `Bạn vẫn muốn thêm thủ công?`
          );
          if (!ok) return;
        } else if (!hasPresent) {
          const ok = confirm(
            `⚠️ Lớp "${finalClassName}" ngày ${addForm.date}: tất cả HV đều vắng.\n\n` +
            `Theo quy tắc, buổi này không nên tính công GV.\n\n` +
            `Bạn vẫn muốn thêm?`
          );
          if (!ok) return;
        }
      } catch {
        console.warn('Không thể cross-check điểm danh, tiếp tục thêm manual');
      }
    }

    try {
      const result = await api.createTeachingLog({
        staffId: addForm.staffId,
        staffName: selectedStaff?.name || '',
        date: addForm.date,
        className: finalClassName,
        sessions: isTA ? 0 : (addForm.sessions || 1),
        hoursWorked: isTA ? (addForm.hoursWorked || 0) : undefined,
        source: 'manual',
      });
      setLogs(prev => [result, ...prev]);
      setAddForm({ staffId: '', className: '', date: '', sessions: 1, hoursWorked: 0 });
      setShowAddForm(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteDay = async (staffId: string, day: number) => {
    const cell = grid[staffId]?.[day];
    if (!cell) return;
    if (!confirm(`Xóa ${cell.total} buổi dạy ngày ${day}?`)) return;
    for (const id of cell.ids) {
      await api.deleteTeachingLog(id);
    }
    setLogs(prev => prev.filter(l => !cell.ids.includes(l.id)));
  };

  // Quick add: click empty cell
  const handleCellClick = (staffMember: StaffMember, day: number) => {
    const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
    setAddForm({ staffId: staffMember.id, className: '', date: dateStr, sessions: 1, hoursWorked: 0 });
    setShowAddForm(true);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Chấm công GV & Trợ giảng</h2>
            <p className="text-xs text-slate-500">Theo dõi buổi dạy của giáo viên & giờ làm của trợ giảng trong tháng</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-slate-700 min-w-[120px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => { setShowAddForm(true); setAddForm({ staffId: '', className: '', date: '', sessions: 1, hoursWorked: 0 }); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg ml-2">
            <Plus className="w-4 h-4" /> Thêm buổi dạy
          </button>
        </div>
      </div>

      {/* Summary per teacher */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {staff.map(s => {
          const totalSessions = logs.filter(l => l.staffId === s.id).reduce((sum, l) => sum + (l.sessions || 1), 0);
          const totalHours = logs.filter(l => l.staffId === s.id).reduce((sum, l) => sum + (l.hoursWorked || 0), 0);
          const isTA = s.role === 'teaching_assistant';
          return (
            <div key={s.id} className="bg-white rounded-xl p-3 shadow-sm border border-slate-200 hover:border-amber-300 transition-colors">
              <p className="text-sm font-semibold text-slate-800 truncate">{s.name}
                {isTA && <span className="ml-1 text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">TG</span>}
              </p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{isTA ? `${totalHours}h` : totalSessions}</p>
              <p className="text-xs text-slate-500">{isTA ? 'giờ làm' : 'buổi dạy'}</p>
            </div>
          );
        })}
      </div>

      {/* Attendance Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 z-10 bg-slate-50 text-left px-3 py-2 font-semibold text-slate-600 min-w-[140px]">Giáo viên</th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const [y, m] = currentMonth.split('-').map(Number);
                  const dow = new Date(y, m - 1, day).getDay();
                  const isSunday = dow === 0;
                  return (
                    <th key={day} className={`px-1 py-2 text-center font-medium min-w-[28px] ${isSunday ? 'bg-red-50 text-red-400' : 'text-slate-500'}`}>
                      {day}
                    </th>
                  );
                })}
                <th className="px-3 py-2 text-center font-semibold text-amber-600 bg-amber-50 min-w-[50px]">Tổng</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s => {
                const isTA = s.role === 'teaching_assistant';
                const total = logs.filter(l => l.staffId === s.id).reduce((sum, l) => sum + (isTA ? (l.hoursWorked || 0) : (l.sessions || 1)), 0);
                return (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-amber-50/30 group">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-amber-50/30 px-3 py-2 font-medium text-slate-700 whitespace-nowrap">
                      {s.name}
                      <span className={`ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${s.role === 'teacher' ? 'bg-blue-100 text-blue-700' : s.role === 'teaching_assistant' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>
                        {s.role === 'teacher' ? 'GV' : s.role === 'teaching_assistant' ? 'TG' : 'VP'}
                      </span>
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const cell = grid[s.id]?.[day];
                      const [y, m] = currentMonth.split('-').map(Number);
                      const dow = new Date(y, m - 1, day).getDay();
                      const isSunday = dow === 0;
                      return (
                        <td key={day} className={`px-0 py-1 text-center ${isSunday ? 'bg-red-50/50' : ''}`}>
                          {cell ? (
                            <button onClick={() => handleDeleteDay(s.id, day)}
                              className="w-6 h-6 rounded-md bg-amber-500 text-white font-bold text-xs flex items-center justify-center mx-auto hover:bg-red-500 transition-colors"
                              title={`${cell.total}${isTA ? 'h' : ' buổi'} — Click để xóa`}>
                              {cell.total}{isTA ? 'h' : ''}
                            </button>
                          ) : (
                            <button onClick={() => handleCellClick(s, day)}
                              className="w-6 h-6 rounded-md border border-dashed border-slate-200 mx-auto flex items-center justify-center hover:bg-amber-100 hover:border-amber-300 transition-colors opacity-0 group-hover:opacity-100"
                              title={`Thêm buổi dạy ngày ${day}`}>
                              <Plus className="w-3 h-3 text-slate-400" />
                            </button>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-bold text-amber-600 bg-amber-50/50">{total}{isTA ? 'h' : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Logs Detail */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            Chi tiết buổi dạy trong tháng
            {(detailStaffFilter || detailClassFilter) && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                {filteredLogs.length}/{logs.length} bản ghi
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={detailStaffFilter}
              onChange={e => setDetailStaffFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            >
              <option value="">Tất cả GV & TG</option>
              {staff.filter(s => (s.role === 'teacher' || s.role === 'teaching_assistant') && s.status === 'active').map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.role === 'teacher' ? 'Giáo viên' : 'Trợ giảng'})</option>
              ))}
            </select>
            <select
              value={detailClassFilter}
              onChange={e => setDetailClassFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            >
              <option value="">Tất cả lớp</option>
              {logClassNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            {(detailStaffFilter || detailClassFilter) && (
              <button
                onClick={() => { setDetailStaffFilter(''); setDetailClassFilter(''); }}
                className="text-xs text-slate-500 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors"
              >
                Xóa lọc
              </button>
            )}
          </div>
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              {logs.length === 0 ? 'Chưa có dữ liệu chấm công' : 'Không có bản ghi nào khớp bộ lọc'}
            </p>
          ) : (
            filteredLogs.slice(0, 50).map(log => (
              <div key={log.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 text-sm">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-slate-500 min-w-[80px]">{formatDate(log.date)}</span>
                  <span className="font-medium text-slate-700">{log.staffName}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600">{log.className}</span>
                  {log.isSubstitute && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-full font-bold">🔄 Dạy thay{log.originalTeacherName ? ` (thay ${log.originalTeacherName})` : ''}</span>
                  )}
                  {log.source === 'auto' && (
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold">🤖 Tự động</span>
                  )}
                  {log.source === 'manual' && (
                    <span className="text-[10px] bg-orange-100 text-orange-700 border border-orange-300 px-2 py-0.5 rounded-full font-bold" title="Thêm thủ công — có thể chưa có điểm danh">✋ Thủ công</span>
                  )}
                  {!log.source && (
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">— Cũ</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{log.sessions || 1} buổi{(log.hoursWorked || 0) > 0 ? ` (${log.hoursWorked}h)` : ''}</span>
                  <button onClick={async () => {
                    if (confirm('Xóa buổi dạy này?')) {
                      await api.deleteTeachingLog(log.id);
                      setLogs(prev => prev.filter(l => l.id !== log.id));
                    }
                  }} className="p-1 rounded hover:bg-red-100 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowAddForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Thêm buổi dạy</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">Giáo viên / Trợ giảng</label>
                <select value={addForm.staffId} onChange={e => setAddForm({ ...addForm, staffId: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
                  <option value="">Chọn giáo viên / trợ giảng</option>
                  {staff.filter(s => (s.role === 'teacher' || s.role === 'teaching_assistant') && s.status === 'active').map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role === 'teacher' ? 'Giáo viên' : 'Trợ giảng'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Lớp dạy</label>
                {staff.find(s => s.id === addForm.staffId)?.role === 'teaching_assistant' ? (
                  <input type="text" value={addForm.className} onChange={e => setAddForm({ ...addForm, className: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm" placeholder="VD: Lớp tự do, Kèm học sinh yếu (Mặc định: Lớp tự do)" />
                ) : (
                  <select value={addForm.className} onChange={e => setAddForm({ ...addForm, className: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
                    <option value="">Chọn lớp</option>
                    {classes.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Ngày</label>
                  <DateInput value={addForm.date} onChange={v => setAddForm({ ...addForm, date: v })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm flex items-center justify-between" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Số buổi</label>
                  <input type="number" min={1} value={addForm.sessions} onChange={e => setAddForm({ ...addForm, sessions: +e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>
              {staff.find(s => s.id === addForm.staffId)?.role === 'teaching_assistant' && (
                <div>
                  <label className="text-sm font-semibold text-slate-700">Số giờ làm</label>
                  <input type="number" min={0} step={0.5} value={addForm.hoursWorked} onChange={e => setAddForm({ ...addForm, hoursWorked: +e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm" placeholder="VD: 2.5" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Hủy</button>
              <button onClick={handleAdd}
                className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg">
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
