import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../utils';
import {
  GraduationCap, CalendarDays, Users, CheckCircle2, XCircle,
  Clock, BookOpen, ArrowRight, CheckCheck, AlertTriangle,
} from 'lucide-react';

interface TeacherHomeProps {
  teacherName: string;
  classes: any[];
  students: any[];
  onNavigate: (tab: string) => void;
}

// Vietnamese day names matching ClassManagement DAYS_OF_WEEK format
const DAY_NAMES_VN = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export default function TeacherHome({ teacherName, classes, students, onNavigate }: TeacherHomeProps) {
  const [allAttendance, setAllAttendance] = useState<any[]>([]);

  useEffect(() => {
    api.getAttendance().then(setAllAttendance).catch(() => {});
  }, []);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayDayVN = DAY_NAMES_VN[today.getDay()];

  // Classes assigned to this teacher
  const myClasses = useMemo(() =>
    classes.filter(c => c.teacher?.toLowerCase().trim() === teacherName.toLowerCase().trim()),
  [classes, teacherName]);

  // Today's classes (match scheduleDays)
  const todayClasses = useMemo(() =>
    myClasses.filter(c => {
      if (!c.scheduleDays || c.scheduleDays.length === 0) return false;
      return c.scheduleDays.some((d: string) => d.toLowerCase().trim() === todayDayVN.toLowerCase());
    }),
  [myClasses, todayDayVN]);

  // Students in my classes
  const myStudents = useMemo(() =>
    students.filter(s => myClasses.some(c => c.name === s.className)),
  [students, myClasses]);

  // Attendance already taken today for my classes
  const todayAttendance = useMemo(() =>
    allAttendance.filter(a => a.date === todayStr && myClasses.some(c => c.name === a.className)),
  [allAttendance, todayStr, myClasses]);

  const classesWithAttendance = todayClasses.filter(c =>
    todayAttendance.some(a => a.className === c.name)
  );

  // Quick stats
  const totalPresent = todayAttendance.filter(a => a.status === 'present').length;
  const totalAbsent = todayAttendance.filter(a => a.status === 'absent').length;
  const totalExcused = todayAttendance.filter(a => a.status === 'excused').length;

  const greeting = today.getHours() < 12 ? 'Chào buổi sáng' : today.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-4 bottom-0 opacity-10 pointer-events-none">
          <GraduationCap className="w-40 h-40" />
        </div>
        <div className="relative z-10">
          <p className="text-teal-300 text-xs font-bold uppercase tracking-wider mb-1">
            {greeting}, {teacherName}! 👋
          </p>
          <h2 className="text-2xl font-black">Trang Giáo viên</h2>
          <p className="text-teal-200/70 text-sm mt-1">
            {today.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="bg-white/10 rounded-xl px-4 py-2 border border-white/20">
              <p className="text-[10px] text-teal-300 uppercase tracking-wider font-bold">Lớp dạy</p>
              <p className="text-xl font-black">{myClasses.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 border border-white/20">
              <p className="text-[10px] text-teal-300 uppercase tracking-wider font-bold">Học viên</p>
              <p className="text-xl font-black">{myStudents.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 border border-white/20">
              <p className="text-[10px] text-teal-300 uppercase tracking-wider font-bold">Lớp hôm nay</p>
              <p className="text-xl font-black">{todayClasses.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 border border-white/20">
              <p className="text-[10px] text-teal-300 uppercase tracking-wider font-bold">Đã điểm danh</p>
              <p className="text-xl font-black">{classesWithAttendance.length}/{todayClasses.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's schedule */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" /> Lịch dạy hôm nay — {todayDayVN}
          </h3>
          <button
            onClick={() => onNavigate('diem-danh')}
            className="flex items-center gap-1 text-xs font-bold text-indigo-500 hover:text-indigo-700 cursor-pointer transition-colors"
          >
            Điểm danh chi tiết <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {todayClasses.length === 0 ? (
          <div className="p-10 text-center text-slate-300">
            <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Hôm nay không có lớp</p>
            <p className="text-[10px] mt-1">Nghỉ ngơi nha! 🎉</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {todayClasses.map(cls => {
              const classStudents = students.filter(s => s.className === cls.name);
              const classAttToday = todayAttendance.filter(a => a.className === cls.name);
              const isAttendanceDone = classAttToday.length > 0;
              const present = classAttToday.filter(a => a.status === 'present').length;
              const absent = classAttToday.filter(a => a.status === 'absent').length;
              const excused = classAttToday.filter(a => a.status === 'excused').length;

              return (
                <div key={cls.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  {/* Time + Class */}
                  <div className="w-16 shrink-0 text-center">
                    <p className="text-sm font-black text-indigo-700">{cls.scheduleTime || cls.schedule || '--'}</p>
                  </div>

                  <div className="w-1 h-10 rounded-full bg-gradient-to-b from-teal-400 to-teal-600 shrink-0" />

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm">{cls.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {classStudents.length} HV
                      </span>
                      {cls.room && <span>· Phòng {cls.room}</span>}
                    </div>
                  </div>

                  {/* Attendance status */}
                  <div className="shrink-0 text-right">
                    {isAttendanceDone ? (
                      <div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCheck className="w-3 h-3" /> Đã điểm danh
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                          <span className="text-emerald-600 font-bold">✅ {present}</span>
                          <span className="text-red-500 font-bold">❌ {absent}</span>
                          <span className="text-amber-500 font-bold">📝 {excused}</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => onNavigate('diem-danh')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
                      >
                        <AlertTriangle className="w-3 h-3" /> Chưa điểm danh
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attendance summary today */}
      {todayAttendance.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-black text-emerald-800">{totalPresent}</p>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Có mặt</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-black text-red-800">{totalAbsent}</p>
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Vắng</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
            <Clock className="w-6 h-6 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-black text-amber-800">{totalExcused}</p>
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Có phép</p>
          </div>
        </div>
      )}

      {/* All my classes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Tất cả lớp của tôi ({myClasses.length})
          </h3>
        </div>
        {myClasses.length === 0 ? (
          <div className="p-10 text-center text-slate-300">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Chưa được gán lớp nào</p>
            <p className="text-[10px] mt-1">Liên hệ quản trị viên để được gán lớp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {myClasses.map(cls => {
              const classStudents = students.filter(s => s.className === cls.name);
              const schedule = (cls.scheduleDays || []).join(', ');
              return (
                <div key={cls.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-teal-300 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-slate-800 text-sm">{cls.name}</h4>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                      {classStudents.length} HV
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-500">
                    {cls.room && <p>📍 Phòng {cls.room}</p>}
                    {schedule && <p>📅 {schedule}</p>}
                    {cls.scheduleTime && <p>🕐 {cls.scheduleTime}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
