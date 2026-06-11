import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Calendar, Clock, BookOpen, Wallet, GraduationCap, 
  MapPin, Mail, Phone, ChevronLeft, ChevronRight, Save, History, CalendarDays
} from 'lucide-react';
import { api } from '../utils';
import { useToast } from './Toast';

interface StudentTimelineProps {
  student: any;
  classes?: any[];
  transactions?: any[];
  onClose: () => void;
  onUpdate: () => void;
}

interface TimelineEvent {
  date: string;
  type: 'payment' | 'attendance' | 'transfer';
  title: string;
  subtitle: string;
  notes?: string;
  rawDate: string;
}

export default function StudentTimeline({
  student,
  classes = [],
  transactions = [],
  onClose,
  onUpdate,
}: StudentTimelineProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'thong-tin' | 'timeline' | 'lich-chuyen-can'>('timeline');
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState(student.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());

  useEffect(() => {
    loadDetails();
  }, [student.id]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const [enrollData, attendanceData] = await Promise.all([
        api.getEnrollments({ studentId: student.id }),
        api.getAttendance({ studentId: student.id }),
      ]);
      setEnrollments(enrollData);
      setAttendance(attendanceData);
    } catch (err: any) {
      toast.error('Lỗi tải lịch sử học viên', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await api.updateStudent(student.id, { notes });
      toast.success('Đã cập nhật ghi chú nội bộ!');
      onUpdate();
    } catch (err: any) {
      toast.error('Lỗi lưu ghi chú', err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  // Compile timeline events
  const paymentEvents = useMemo<TimelineEvent[]>(() => {
    return transactions
      .filter(t => t.studentName?.toLowerCase() === student.name?.toLowerCase())
      .map(t => ({
        date: t.paymentDate,
        type: 'payment' as const,
        title: `Đóng tiền: ${t.revenueCategory || 'Học phí'}`,
        subtitle: `Số tiền: +${Number(t.amount || 0).toLocaleString('vi-VN')}đ · HTH thức: ${t.paymentMethod}`,
        notes: t.notes || (t.senderName ? `Người gửi: ${t.senderName}` : ''),
        rawDate: t.paymentDate + 'T00:00:00',
      }));
  }, [transactions, student.name]);

  const attendanceEvents = useMemo<TimelineEvent[]>(() => {
    return attendance.map(a => ({
      date: a.date,
      type: 'attendance' as const,
      title: `Điểm danh lớp ${a.className}`,
      subtitle: a.status === 'present'
        ? '✅ Có mặt (trừ 1 buổi)'
        : a.status === 'absent'
        ? '❌ Vắng mặt (trừ 1 buổi)'
        : '⏰ Vắng phép (không trừ)',
      rawDate: a.date + 'T00:00:00',
    }));
  }, [attendance]);

  const transferEvents = useMemo<TimelineEvent[]>(() => {
    return enrollments.map(e => ({
      date: e.startDate,
      type: 'transfer' as const,
      title: e.transferNote ? 'Chuyển lớp học' : 'Đăng ký nhập học',
      subtitle: `Lớp: ${e.className} · Học phí: ${Number(e.feePerSession || 0).toLocaleString('vi-VN')}đ/buổi`,
      notes: e.transferNote ? `Lý do: ${e.transferNote}` : (e.endDate ? `Kết thúc giai đoạn: ${e.endDate}` : 'Lớp học hiện tại'),
      rawDate: e.startDate + 'T00:00:00',
    }));
  }, [enrollments]);

  const timelineEvents = useMemo(() => {
    const combined = [...paymentEvents, ...attendanceEvents, ...transferEvents];
    return combined.sort((a, b) => b.rawDate.localeCompare(a.rawDate));
  }, [paymentEvents, attendanceEvents, transferEvents]);

  // Calendar Helpers
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday = 0, Monday = 1

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    // Pad initial empty cells
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [daysInMonth, firstDayIndex]);

  const changeMonth = (offset: number) => {
    setCalendarDate(new Date(year, month + offset, 1));
  };

  const getAttendanceForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendance.find(a => a.date === dateStr);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-indigo-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
              student.gender === 'Nữ' ? 'bg-pink-200 text-pink-900' : 'bg-indigo-200 text-indigo-900'
            }`}>
              {student.name?.charAt(0) || '?'}
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                Hồ sơ chi tiết: {student.name}
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                Lớp hiện tại: {student.className || 'Chưa xếp lớp'} · {student.gender} ({student.birthYear})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5 text-indigo-100" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0">
          {[
            { id: 'timeline', label: 'Timeline học tập', icon: <History className="w-4 h-4" /> },
            { id: 'lich-chuyen-can', label: 'Lịch chuyên cần', icon: <CalendarDays className="w-4 h-4" /> },
            { id: 'thong-tin', label: 'Thông tin & Ghi chú', icon: <GraduationCap className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* TAB 1: TIMELINE */}
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  {timelineEvents.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      Chưa ghi nhận lịch sử hoạt động nào
                    </div>
                  ) : (
                    <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-6">
                      {timelineEvents.map((event, idx) => {
                        const iconBg = 
                          event.type === 'payment' ? 'bg-emerald-100 text-emerald-700' :
                          event.type === 'attendance' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-amber-100 text-amber-700';

                        const icon = 
                          event.type === 'payment' ? <Wallet className="w-3.5 h-3.5" /> :
                          event.type === 'attendance' ? <Calendar className="w-3.5 h-3.5" /> :
                          <BookOpen className="w-3.5 h-3.5" />;

                        return (
                          <div key={idx} className="relative">
                            {/* Dot timeline */}
                            <span className={`absolute -left-[35px] top-0.5 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-white ${iconBg}`}>
                              {icon}
                            </span>
                            
                            {/* Event details */}
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-1">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-slate-800">{event.title}</h4>
                                <span className="text-[10px] font-semibold font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                  {new Date(event.date).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">{event.subtitle}</p>
                              {event.notes && (
                                <p className="text-xs text-slate-400 italic bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 mt-2">
                                  {event.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: MINI CALENDAR */}
              {activeTab === 'lich-chuyen-can' && (
                <div className="space-y-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-md mx-auto">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                      Tháng {month + 1} / {year}
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                      </button>
                      <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>

                  {/* Weekdays */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                      <div key={d} className="py-1">{d}</div>
                    ))}
                  </div>

                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, idx) => {
                      if (day === null) {
                        return <div key={`empty-${idx}`} />;
                      }

                      const att = getAttendanceForDate(day);
                      let dayStyle = 'text-slate-600 hover:bg-slate-100';
                      
                      if (att) {
                        if (att.status === 'present') {
                          dayStyle = 'bg-emerald-500 text-white font-bold shadow-sm shadow-emerald-100';
                        } else if (att.status === 'absent') {
                          dayStyle = 'bg-red-500 text-white font-bold shadow-sm shadow-red-100';
                        } else if (att.status === 'excused') {
                          dayStyle = 'bg-amber-500 text-white font-bold shadow-sm shadow-amber-100';
                        }
                      }

                      return (
                        <div
                          key={`day-${day}`}
                          className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs transition-all ${dayStyle}`}
                          title={att ? `Điểm danh: ${att.status === 'present' ? 'Có mặt' : att.status === 'absent' ? 'Vắng' : 'Phép'}` : undefined}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex justify-center gap-4 pt-4 border-t border-slate-100 text-[10px] font-semibold">
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Có mặt
                    </span>
                    <span className="flex items-center gap-1.5 text-red-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Vắng (-buổi)
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Có phép
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 3: PROFILE INFO & INTERNAL NOTES */}
              {activeTab === 'thong-tin' && (
                <div className="space-y-6">
                  {/* Detailed Info Grid */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hồ sơ thông tin</h4>
                    
                    <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-500">Tên Việt Anh:</span>
                        <span className="font-semibold text-slate-800">{student.vietAnhName || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-500">Ngày nhập học:</span>
                        <span className="font-semibold text-slate-800">
                          {student.enrollDate ? new Date(student.enrollDate).toLocaleDateString('vi-VN') : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-500">Số điện thoại:</span>
                        <span className="font-mono font-semibold text-slate-800">{student.parentPhone || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-500">Email:</span>
                        <span className="font-semibold text-slate-800">{student.parentEmail || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 col-span-2">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-500 shrink-0">Địa chỉ:</span>
                        <span className="font-semibold text-slate-800">{student.address || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Internal Notes Editor */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ghi chú nội bộ</h4>
                      <span className="text-[10px] text-slate-400 font-medium">Chỉ nhân viên trung tâm nhìn thấy</span>
                    </div>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Nhập thông tin theo dõi thêm về học viên... (VD: điểm yếu, sở thích, cam kết học tập...)"
                      rows={4}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {savingNotes ? 'Đang lưu...' : 'Lưu ghi chú'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}