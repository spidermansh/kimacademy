import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, AlertTriangle, AlertCircle, UserCheck, RefreshCw } from 'lucide-react';
import { Student, Class, AttendanceRecord } from '../../../shared/types';
import { api, formatDate } from '../../../shared/utils';

interface QuickAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: Class[];
  students: Student[];
  attendance: AttendanceRecord[];
  initialClassId?: string | null;
  onSuccess: () => void;
}

export default function QuickAttendanceModal({
  isOpen,
  onClose,
  classes,
  students,
  attendance,
  initialClassId,
  onSuccess
}: QuickAttendanceModalProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [statusMap, setStatusMap] = useState<Record<string, 'present' | 'absent' | 'excused'>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  // Today's YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filter classes scheduled for today
  const todayClasses = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const VIET_DAY_MAP: Record<number, string[]> = {
      0: ['cn', 'chủ nhật'],
      1: ['thứ 2', 't2', 'thứ hai'],
      2: ['thứ 3', 't3', 'thứ ba'],
      3: ['thứ 4', 't4', 'thứ tư'],
      4: ['thứ 5', 't5', 'thứ năm'],
      5: ['thứ 6', 't6', 'thứ sáu'],
      6: ['thứ 7', 't7', 'thứ bảy'],
    };
    const todayNames = VIET_DAY_MAP[dayOfWeek] || [];
    
    return classes.filter(cls => {
      if (cls.status !== 'active' || cls.type === 'online') return false;
      const days = cls.scheduleDays || [];
      return days.some(d => todayNames.some(tn => d.toLowerCase().includes(tn)));
    });
  }, [classes]);

  // Set initial class selected
  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccess(false);
      setConfirmOverwrite(false);
      
      if (initialClassId) {
        setSelectedClassId(initialClassId);
      } else if (todayClasses.length > 0) {
        setSelectedClassId(todayClasses[0].id);
      } else {
        setSelectedClassId('');
      }
    }
  }, [isOpen, initialClassId, todayClasses]);

  // Get active class details
  const selectedClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId) || null;
  }, [selectedClassId, classes]);

  // Get students enrolled in selected class
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(s => s.className === selectedClass.name && s.status === 'active');
  }, [selectedClass, students]);

  // Initialize status maps when selected class changes
  useEffect(() => {
    if (selectedClassId && classStudents.length > 0) {
      // Check if they already have attendance records for today
      const existingAtt = attendance.filter(a => a.classId === selectedClassId && a.date === todayStr);
      
      const newStatus: Record<string, 'present' | 'absent' | 'excused'> = {};
      const newNotes: Record<string, string> = {};

      classStudents.forEach(s => {
        const found = existingAtt.find(a => a.studentId === s.id);
        if (found) {
          newStatus[s.id] = found.status;
          newNotes[s.id] = found.note || '';
        } else {
          newStatus[s.id] = 'present'; // Mặc định là present
          newNotes[s.id] = '';
        }
      });

      setStatusMap(newStatus);
      setNotesMap(newNotes);
    } else {
      setStatusMap({});
      setNotesMap({});
    }
  }, [selectedClassId, classStudents, attendance, todayStr]);

  // Check if class already attended today
  const isAlreadyAttended = useMemo(() => {
    if (!selectedClassId) return false;
    return attendance.some(a => a.classId === selectedClassId && a.date === todayStr);
  }, [selectedClassId, attendance, todayStr]);

  const handleMarkAllPresent = () => {
    const updated: Record<string, 'present' | 'absent' | 'excused'> = {};
    classStudents.forEach(s => {
      updated[s.id] = 'present';
    });
    setStatusMap(updated);
  };

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'excused') => {
    setStatusMap(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setNotesMap(prev => ({
      ...prev,
      [studentId]: note
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    setError('');
    setIsSubmitting(true);

    if (classStudents.length === 0) {
      setError('Lớp học không có học viên hoạt động để điểm danh.');
      setIsSubmitting(false);
      return;
    }

    try {
      const records = classStudents.map(s => ({
        date: todayStr,
        classId: selectedClass.id,
        className: selectedClass.name,
        studentId: s.id,
        studentName: s.name,
        status: statusMap[s.id] || 'present',
        note: notesMap[s.id] || ''
      }));

      await api.saveAttendanceBatch(records, {
        teacherId: selectedClass.teacherId,
        teacherName: selectedClass.teacher,
        classId: selectedClass.id,
        source: 'quick' as any // Gửi source = quick để server log audit log phù hợp
      });

      setSuccess(true);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Lỗi lưu điểm danh. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-700 to-orange-700 text-white">
          <h3 className="text-base font-bold flex items-center gap-2">
            📋 Điểm danh nhanh hôm nay ({formatDate(new Date().toISOString())})
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-amber-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {success ? (
            <div className="space-y-6 text-center py-8">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Check className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-800 font-bold">Lưu điểm danh thành công!</h4>
                <p className="text-sm text-slate-500">
                  Dữ liệu điểm danh của lớp <span className="font-bold text-slate-800">{selectedClass?.name}</span> ngày {formatDate(new Date().toISOString())} đã được cập nhật thành công.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full max-w-xs py-3 bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md"
              >
                Đóng
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Class Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Chọn lớp dạy hôm nay</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                >
                  {todayClasses.length === 0 ? (
                    <option value="">-- Hôm nay không có lịch lớp học offline nào --</option>
                  ) : (
                    todayClasses.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.scheduleTime || 'N/A'}) - GV: {cls.teacher || 'Chưa phân công'}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Overwrite Warning */}
              {isAlreadyAttended && (
                <div className="flex gap-2.5 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-semibold">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-bold">⚠️ Lớp học này đã điểm danh hôm nay!</p>
                    <p className="text-slate-600 mt-0.5 leading-relaxed font-normal">
                      Nếu lưu lại, hệ thống sẽ cập nhật (ghi đè) danh sách cũ, tự động điều chỉnh doanh thu thực học phí và không nhân đôi số buổi đã học.
                    </p>
                  </div>
                </div>
              )}

              {/* Student Attendance List */}
              {selectedClass && classStudents.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Danh sách học viên ({classStudents.length})
                    </h4>
                    <button
                      type="button"
                      onClick={handleMarkAllPresent}
                      className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer select-none bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1 rounded-lg"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Tất cả có mặt
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {classStudents.map(s => {
                      const status = statusMap[s.id] || 'present';
                      return (
                        <div key={s.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 text-sm">{s.name}</span>
                            {s.englishName && (
                              <span className="text-xs text-slate-400 font-medium ml-1.5">({s.englishName})</span>
                            )}
                            <p className="text-[10px] text-slate-400">ID: {s.id}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Notes Input */}
                            <input
                              type="text"
                              placeholder="Ghi chú (vắng có phép...)"
                              value={notesMap[s.id] || ''}
                              onChange={(e) => handleNoteChange(s.id, e.target.value)}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 w-36 sm:w-40"
                            />

                            {/* Buttons */}
                            <div className="flex bg-slate-200/80 p-0.5 rounded-lg border border-slate-200 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(s.id, 'present')}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                                  status === 'present'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                Có mặt
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(s.id, 'absent')}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                                  status === 'absent'
                                    ? 'bg-red-500 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                Vắng
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(s.id, 'excused')}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                                  status === 'excused'
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                Vắng phép
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : selectedClass ? (
                <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold">Lớp học này không có học viên hoạt động nào đăng ký.</p>
                </div>
              ) : null}

              {/* Live Summary Bar */}
              {selectedClass && classStudents.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold">
                  <span className="text-slate-500">Tổng kết:</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    ✅ {classStudents.filter(s => statusMap[s.id] === 'present').length} có mặt
                  </span>
                  <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                    ❌ {classStudents.filter(s => statusMap[s.id] === 'absent').length} vắng
                  </span>
                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                    📨 {classStudents.filter(s => statusMap[s.id] === 'excused').length} vắng phép
                  </span>
                </div>
              )}

              {/* Submit Button */}
              {selectedClass && classStudents.length > 0 && (
                isAlreadyAttended && !confirmOverwrite ? (
                  <button
                    type="button"
                    onClick={() => setConfirmOverwrite(true)}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Ghi đè điểm danh cũ — Nhấn để xác nhận
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {isAlreadyAttended ? 'Xác nhận ghi đè điểm danh' : 'Lưu điểm danh ngày hôm nay'}
                  </button>
                )
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
