import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api, formatDate } from '../utils';
import { StaffMember } from '../types';
import { useToast } from './Toast';
import * as XLSX from 'xlsx-js-style';
import {
  CalendarDays, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight,
  Save, AlertCircle, AlertTriangle, BookOpen, Pencil, X, Eye, Search,
  RefreshCw, Users, BarChart2, FileSpreadsheet, Download, Info
} from 'lucide-react';

type AttStatus = 'present' | 'absent' | 'excused';

interface AttRow {
  studentId: string;
  studentName: string;
  status: AttStatus;
  note: string;
}

const STATUS_CONFIG: Record<AttStatus, { label: string; shortLabel: string; color: string; bg: string; icon: React.ReactNode }> = {
  present: {
    label: 'Có mặt',
    shortLabel: '✅',
    color: 'text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100',
    bg: 'bg-emerald-50/40',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  },
  absent: {
    label: 'Vắng',
    shortLabel: '❌',
    color: 'text-red-700 border-red-300 bg-red-50 hover:bg-red-100',
    bg: 'bg-red-50/30',
    icon: <XCircle className="w-4 h-4 text-red-600" />,
  },
  excused: {
    label: 'Phép',
    shortLabel: '⏰',
    color: 'text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100',
    bg: 'bg-amber-50/30',
    icon: <Clock className="w-4 h-4 text-amber-600" />,
  },
};

const WEEKDAY_VN = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

function getWeekdayVN(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return WEEKDAY_VN[d.getDay()];
}

function formatDateVN(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${WEEKDAY_VN[d.getDay()]} (ngày ${dd}/${mm}/${yyyy})`;
}

function getWeekRange(dateStr: string): [string, string] {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 is Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return [
    monday.toISOString().slice(0, 10),
    sunday.toISOString().slice(0, 10)
  ];
}

function formatSimpleDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

function isClassScheduledOnDate(cls: any, dateStr: string): boolean {
  if (!cls || !cls.scheduleDays || cls.scheduleDays.length === 0) return false;
  const d = new Date(dateStr + 'T00:00:00');
  const dayIndex = d.getDay();
  
  const weekdayFull = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const weekdayShort = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  
  const targetFull = weekdayFull[dayIndex].toLowerCase();
  const targetShort = weekdayShort[dayIndex].toLowerCase();
  
  return cls.scheduleDays.some((sd: string) => {
    const sdLower = sd.toLowerCase().trim();
    return sdLower === targetFull || sdLower === targetShort || sdLower.includes(targetShort) || sdLower.includes(targetFull);
  });
}

// Normalize a class entry
interface ClassOption {
  id: string;
  name: string;
  type: string;
  source: 'db' | 'student';
}

export default function AttendanceManagement({ students, classes, transactions }: { students: any[]; classes: any[]; transactions: any[] }) {
  const toast = useToast();
  
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [selectedDate, setSelectedDate]           = useState<string>(new Date().toISOString().slice(0, 10));
  const [rows, setRows]                           = useState<AttRow[]>([]);
  const [saving, setSaving]                       = useState(false);
  const [savedMsg, setSavedMsg]                   = useState('');
  
  const [activeTab, setActiveTab]                 = useState<'diem-danh' | 'lich-thang' | 'ra-soat' | 'lich-su'>('diem-danh');
  
  // Class attendance history states
  const [classAttendance, setClassAttendance]     = useState<any[]>([]);
  const [historyLoading, setHistoryLoading]       = useState(false);
  const [allAttendance, setAllAttendance]         = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance]     = useState<any[]>([]);
  
  // Calendar states
  const [calendarMonth, setCalendarMonth]         = useState<number>(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear]           = useState<number>(new Date().getFullYear());
  
  // Audit filter states
  const [auditSearch, setAuditSearch]             = useState('');
  const [auditTimeRangeType, setAuditTimeRangeType] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [auditWeekDate, setAuditWeekDate]           = useState<string>(new Date().toISOString().slice(0, 10));
  const [auditMonthStr, setAuditMonthStr]           = useState<string>(new Date().toISOString().slice(0, 7));
  const [auditCustomStart, setAuditCustomStart]     = useState<string>('');
  const [auditCustomEnd, setAuditCustomEnd]         = useState<string>('');

  // ── Teacher / Substitute state ─────────────────────────────────────────────
  const [staffList, setStaffList]                   = useState<StaffMember[]>([]);
  const [selectedTeacherId, setSelectedTeacherId]   = useState<string>('');
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>('');
  const [defaultTeacherId, setDefaultTeacherId]     = useState<string>('');
  const [defaultTeacherName, setDefaultTeacherName] = useState<string>('');
  const [isSubstitute, setIsSubstitute]             = useState(false);

  // Load staff list (teachers only)
  useEffect(() => {
    api.getStaff().then((data: StaffMember[]) => {
      setStaffList(data.filter(s => s.role === 'teacher' && s.status === 'active'));
    }).catch(() => {});
  }, []);

  // When class changes → set default teacher
  useEffect(() => {
    if (!selectedClassName) {
      setDefaultTeacherId('');
      setDefaultTeacherName('');
      setSelectedTeacherId('');
      setSelectedTeacherName('');
      setIsSubstitute(false);
      return;
    }
    const cls = (classes || []).find(c => c.name === selectedClassName);
    if (cls) {
      // Try to find staff by teacherId or by name match
      const staffById = cls.teacherId ? staffList.find(s => s.id === cls.teacherId) : null;
      const staffByName = !staffById && cls.teacher ? staffList.find(s => s.name === cls.teacher) : null;
      const matched = staffById || staffByName;
      if (matched) {
        setDefaultTeacherId(matched.id);
        setDefaultTeacherName(matched.name);
        setSelectedTeacherId(matched.id);
        setSelectedTeacherName(matched.name);
      } else {
        setDefaultTeacherId('');
        setDefaultTeacherName(cls.teacher || '');
        setSelectedTeacherId('');
        setSelectedTeacherName(cls.teacher || '');
      }
      setIsSubstitute(false);
    }
  }, [selectedClassName, classes, staffList]);

  // When teacher selection changes → detect substitute
  const handleTeacherChange = (teacherId: string) => {
    const staff = staffList.find(s => s.id === teacherId);
    if (staff) {
      setSelectedTeacherId(staff.id);
      setSelectedTeacherName(staff.name);
      setIsSubstitute(defaultTeacherId !== '' && staff.id !== defaultTeacherId);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  // ─── Build unified class list ─────────────────────────────────────────────
  const classOptions = useMemo<ClassOption[]>(() => {
    return (classes || [])
      .filter(c => c.name)
      .map(c => ({
        id: c.name,
        name: c.name,
        type: c.type || 'offline',
        source: 'db' as const,
      }));
  }, [classes]);

  // ─── Load history helper ──────────────────────────────────────────────────
  const loadAttendanceHistory = useCallback(async () => {
    if (!selectedClassName) {
      setClassAttendance([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const data = await api.getAttendance({ classId: selectedClassName });
      setClassAttendance(data);
    } catch (err) {
      console.error('Lỗi tải lịch sử điểm danh lớp:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedClassName]);

  // Load all attendance records to calculate remaining tuition sessions
  const loadAllAttendance = useCallback(async () => {
    try {
      const data = await api.getAttendance();
      setAllAttendance(data);
    } catch (err) {
      console.error('Lỗi tải toàn bộ điểm danh:', err);
    }
  }, []);

  // Check today's attendance sheets for warning banner
  const checkTodayAttendance = useCallback(async () => {
    try {
      const data = await api.getAttendance({ date: todayStr });
      setTodayAttendance(data);
    } catch (err) {
      console.error('Lỗi tải điểm danh hôm nay:', err);
    }
  }, [todayStr]);

  useEffect(() => {
    loadAttendanceHistory();
    loadAllAttendance();
    checkTodayAttendance();
  }, [loadAttendanceHistory, loadAllAttendance, checkTodayAttendance]);

  // ── Auto-select first class scheduled for today ───────────────────────────
  useEffect(() => {
    if (selectedClassName || classOptions.length === 0) return; // Already selected or no classes
    const todayClass = classOptions.find(opt => {
      const fullClass = classes.find(c => c.name === opt.name);
      if (!fullClass || fullClass.status === 'suspended' || fullClass.status === 'ended') return false;
      return isClassScheduledOnDate(fullClass, todayStr);
    });
    if (todayClass) {
      setSelectedClassName(todayClass.name);
    }
  }, [classOptions, classes, todayStr]); // Only run once on mount

  // ─── Students in selected class ──────────────────────────────────────────
  // Display only active students when checking today's or future dates.
  // For historical sheets, we display active students PLUS any student who was actually marked.
  const studentsInClass = useMemo(() => {
    if (!selectedClassName) return [];
    
    // Get all students matching this class name
    const matchingStudents = (students || []).filter(
      s => s.className?.trim().toLowerCase() === selectedClassName.toLowerCase()
    );

    // Is the selectedDate in the past and does it have recorded attendance?
    const hasRecordsForDate = classAttendance.some(r => r.date === selectedDate);

    if (hasRecordsForDate) {
      const studentIdsRecorded = new Set(
        classAttendance.filter(r => r.date === selectedDate).map(r => r.studentId)
      );
      // Return students currently in class OR students who were marked on that date
      return (students || []).filter(
        s => (s.className?.trim().toLowerCase() === selectedClassName.toLowerCase() && (s.status !== 'suspended' && s.status !== 'left')) || studentIdsRecorded.has(s.id)
      );
    } else {
      // Just return active students
      return matchingStudents.filter(s => s.status === undefined || s.status === 'active');
    }
  }, [selectedClassName, selectedDate, classAttendance, students]);

  // ─── Load existing attendance for date ────────────────────────────────────
  useEffect(() => {
    if (!selectedClassName || !selectedDate) {
      setRows([]);
      return;
    }
    const forDate = classAttendance.filter((r: any) => r.date === selectedDate);
    const existingMap: Record<string, { status: AttStatus; note: string }> = {};
    forDate.forEach((r: any) => {
      existingMap[r.studentId] = { status: r.status, note: r.note || '' };
    });

    setRows(studentsInClass.map(s => ({
      studentId: s.id,
      studentName: s.name,
      status: (existingMap[s.id]?.status) ?? 'present',
      note: (existingMap[s.id]?.note) ?? '',
    })));
  }, [selectedClassName, selectedDate, studentsInClass, classAttendance]);

  // ─── Today's Unattended Classes Warning ───────────────────────────────────
  const unattendedClasses = useMemo(() => {
    return classOptions.filter(clsOption => {
      const fullClass = classes.find(c => c.name === clsOption.name);
      if (!fullClass || fullClass.status === 'suspended' || fullClass.status === 'ended') return false;
      
      const isScheduledToday = isClassScheduledOnDate(fullClass, todayStr);
      if (!isScheduledToday) return false;
      
      const hasAttendanceToday = todayAttendance.some(r => r.classId === clsOption.name);
      return !hasAttendanceToday;
    });
  }, [classOptions, classes, todayAttendance, todayStr]);

  // ─── Consecutive Absences (>= 3 sessions) ───────────────────────────────
  const consecutiveAbsences = useMemo(() => {
    if (!selectedClassName || classAttendance.length === 0) return {};
    
    // Group attendance by date
    const dateGroups: Record<string, any[]> = {};
    classAttendance.forEach(r => {
      if (!dateGroups[r.date]) dateGroups[r.date] = [];
      dateGroups[r.date].push(r);
    });
    
    // Sort dates descending (newest first)
    const sortedDates = Object.keys(dateGroups).sort((a, b) => b.localeCompare(a));
    
    const absenceCounts: Record<string, number> = {};
    
    studentsInClass.forEach(student => {
      let consecutiveCount = 0;
      for (const d of sortedDates) {
        const record = dateGroups[d].find(r => r.studentId === student.id);
        if (record) {
          if (record.status === 'absent' || record.status === 'excused') {
            consecutiveCount++;
          } else if (record.status === 'present') {
            break; // Stop at first present
          }
        }
      }
      if (consecutiveCount >= 3) {
        absenceCounts[student.id] = consecutiveCount;
      }
    });
    
    return absenceCounts;
  }, [selectedClassName, classAttendance, studentsInClass]);

  // ── Already Attended Warning ─────────────────────────────────────────────
  const hasExistingAttendance = useMemo(() => {
    if (!selectedClassName || !selectedDate) return false;
    return classAttendance.some((r: any) => r.date === selectedDate);
  }, [selectedClassName, selectedDate, classAttendance]);

  // ─── Personal Attendance Rates ───────────────────────────────────────────
  const attendanceRates = useMemo(() => {
    if (!selectedClassName || classAttendance.length === 0) return {};
    
    const counts: Record<string, { present: number; total: number }> = {};
    classAttendance.forEach(r => {
      if (!counts[r.studentId]) {
        counts[r.studentId] = { present: 0, total: 0 };
      }
      counts[r.studentId].total++;
      if (r.status === 'present') {
        counts[r.studentId].present++;
      }
    });
    
    const rates: Record<string, number> = {};
    Object.entries(counts).forEach(([studentId, data]) => {
      rates[studentId] = data.total > 0 ? Math.round((data.present / data.total) * 100) : 100;
    });
    
    return rates;
  }, [selectedClassName, classAttendance]);

  // ─── Class Average Attendance Rate ───────────────────────────────────────
  const classAverageAttendance = useMemo(() => {
    if (classAttendance.length === 0) return 0;
    const totalRecords = classAttendance.length;
    const presentRecords = classAttendance.filter(r => r.status === 'present').length;
    return Math.round((presentRecords / totalRecords) * 100);
  }, [classAttendance]);

  // ─── Sessions Remaining Map ──────────────────────────────────────────────
  const sessionsRemainingMap = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach(student => {
      const totalPaid = transactions
        .filter(t => t.studentName?.toLowerCase() === student.name?.toLowerCase() && t.revenueCategory === 'Học phí offline')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      const fee = Number(student.feePerSession) || 0;
      const totalBought = fee > 0 ? Math.floor(totalPaid / fee) : 0;
      
      const totalUsed = allAttendance.filter(a => a.studentId === student.id && a.status !== 'excused').length;
      map[student.id] = totalBought - totalUsed;
    });
    return map;
  }, [students, transactions, allAttendance]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const setStatus = (studentId: string, status: AttStatus) =>
    setRows(prev => prev.map(r => r.studentId === studentId ? { ...r, status } : r));

  const setRowNote = (studentId: string, note: string) =>
    setRows(prev => prev.map(r => r.studentId === studentId ? { ...r, note } : r));

  const setAllStatus = (status: AttStatus) =>
    setRows(prev => prev.map(r => ({ ...r, status })));

  const handleSave = async () => {
    if (!selectedClassName || !selectedDate) {
      toast.warning('Thiếu thông tin', 'Vui lòng chọn lớp và ngày điểm danh.');
      return;
    }
    if (rows.length === 0) {
      toast.warning('Không có học viên', 'Lớp này chưa có học viên nào!');
      return;
    }

    // Sprint 4.2.b: Warn about students with 0 or negative sessions remaining
    const outOfSessionStudents = rows.filter(r => {
      const remaining = sessionsRemainingMap[r.studentId] ?? 0;
      const student = students.find(s => s.id === r.studentId);
      const fee = student ? Number(student.feePerSession) || 0 : 0;
      return fee > 0 && remaining <= 0 && r.status !== 'excused';
    });

    if (outOfSessionStudents.length > 0) {
      const names = outOfSessionStudents.map(s => s.studentName).join(', ');
      toast.warning(
        `⚠️ ${outOfSessionStudents.length} học viên hết buổi!`,
        `${names} — Vui lòng nhắc đóng thêm học phí. Điểm danh vẫn được lưu.`
      );
    }

    setSaving(true);
    try {
      const records = rows.map(r => ({
        date: selectedDate,
        classId: selectedClassName,
        className: selectedClassName,
        studentId: r.studentId,
        studentName: r.studentName,
        status: r.status,
        note: r.note,
      }));

      // Pass teacher info for auto TeachingLog creation
      const selectedClass = (classes || []).find(c => c.name === selectedClassName);
      await api.saveAttendanceBatch(records, {
        teacherId: selectedTeacherId || undefined,
        teacherName: selectedTeacherName || undefined,
        isSubstitute,
        originalTeacherId: isSubstitute ? defaultTeacherId : undefined,
        originalTeacherName: isSubstitute ? defaultTeacherName : undefined,
        classId: selectedClass?.id || undefined,
      });

      setSavedMsg(`✅ Đã lưu điểm danh${isSubstitute ? ` (GV dạy thay: ${selectedTeacherName})` : ''} thành công!`);
      setTimeout(() => setSavedMsg(''), 4000);
      toast.success('Thành công', `Đã lưu điểm danh${isSubstitute ? ` — Chấm công cho ${selectedTeacherName} (dạy thay)` : selectedTeacherName ? ` — Chấm công cho ${selectedTeacherName}` : ''}.`);
      
      // Reload lists
      loadAttendanceHistory();
      loadAllAttendance();
      checkTodayAttendance();
    } catch (err: any) {
      toast.error('Lỗi lưu điểm danh', err.message);
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
  const absentCount  = rows.filter(r => r.status === 'absent').length;
  const excusedCount = rows.filter(r => r.status === 'excused').length;

  // ─── Calendar Grid (Monthly) ──────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const totalDays = new Date(calendarYear, calendarMonth, 0).getDate();
    const firstDayIndex = new Date(`${calendarYear}-${String(calendarMonth).padStart(2, '0')}-01T00:00:00`).getDay();
    const prefixEmpty = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // skip Monday start
    
    const days: any[] = [];
    for (let i = 0; i < prefixEmpty; i++) {
      days.push({ type: 'empty' });
    }
    
    const fullClass = classes.find(c => c.name === selectedClassName);

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isScheduled = isClassScheduledOnDate(fullClass, dateStr);
      const dayRecords = classAttendance.filter(r => r.date === dateStr);
      const isChecked = dayRecords.length > 0;
      
      let attendanceRate = 0;
      let presentCount = 0;
      let totalCount = 0;
      
      if (isChecked) {
        presentCount = dayRecords.filter(r => r.status === 'present').length;
        totalCount = dayRecords.length;
        attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
      }
      
      days.push({
        type: 'day',
        day,
        dateStr,
        isScheduled,
        isChecked,
        presentCount,
        totalCount,
        attendanceRate,
        isToday: dateStr === todayStr
      });
    }
    
    return days;
  }, [calendarMonth, calendarYear, selectedClassName, classAttendance, classes, todayStr]);

  const changeCalendarMonth = (offset: number) => {
    let newMonth = calendarMonth + offset;
    let newYear = calendarYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setCalendarMonth(newMonth);
    setCalendarYear(newYear);
  };

  // ─── Audit Dates ──────────────────────────────────────────────────────────
  const auditDates = useMemo(() => {
    const allDates: string[] = [...new Set<string>(classAttendance.map((r: any) => r.date as string))].sort((a: string, b: string) => a.localeCompare(b));
    
    let filtered = allDates;
    if (auditTimeRangeType === 'week') {
      if (auditWeekDate) {
        const [start, end] = getWeekRange(auditWeekDate);
        filtered = allDates.filter(d => d >= start && d <= end);
      }
    } else if (auditTimeRangeType === 'month') {
      if (auditMonthStr) {
        filtered = allDates.filter(d => d.startsWith(auditMonthStr));
      }
    } else if (auditTimeRangeType === 'custom') {
      const start = auditCustomStart;
      const end = auditCustomEnd;
      filtered = allDates.filter(d => {
        const afterStart = !start || d >= start;
        const beforeEnd = !end || d <= end;
        return afterStart && beforeEnd;
      });
    }
    return filtered;
  }, [classAttendance, auditTimeRangeType, auditWeekDate, auditMonthStr, auditCustomStart, auditCustomEnd]);

  const auditMap = useMemo(() => {
    const map: Record<string, Record<string, { status: string; note: string }>> = {};
    classAttendance.forEach(r => {
      if (!map[r.studentId]) map[r.studentId] = {};
      map[r.studentId][r.date] = { status: r.status, note: r.note || '' };
    });
    return map;
  }, [classAttendance]);

  const filteredAuditStudents = useMemo(() => {
    if (!auditSearch.trim()) return studentsInClass;
    const sLower = auditSearch.toLowerCase().trim();
    return studentsInClass.filter(s =>
      s.name?.toLowerCase().includes(sLower) ||
      s.englishName?.toLowerCase().includes(sLower) ||
      s.vietnameseName?.toLowerCase().includes(sLower)
    );
  }, [studentsInClass, auditSearch]);

  // ─── Monthly Excel Export ──────────────────────────────────────────────────
  const handleExportExcelMonthly = useCallback(() => {
    try {
      if (!selectedClassName) {
        toast.warning('Chưa chọn lớp', 'Vui lòng chọn lớp học trước khi xuất Excel.');
        return;
      }
      
      const monthStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}`;
      const monthDates: string[] = [...new Set<string>(classAttendance.map((r: any) => r.date as string))]
        .filter((d: string) => d.startsWith(monthStr))
        .sort((a: string, b: string) => a.localeCompare(b));

      if (monthDates.length === 0) {
        toast.warning('Không có dữ liệu', `Lớp ${selectedClassName} chưa có lịch sử điểm danh nào trong tháng ${calendarMonth}/${calendarYear}`);
        return;
      }

      const headers = ['STT', 'Họ và tên', ...monthDates.map((d: string) => formatSimpleDate(d)), 'Có mặt', 'Vắng (trừ buổi)', 'Vắng phép', 'Tỷ lệ %'];

      const rowsData = studentsInClass.map((student, idx) => {
        const sMap = auditMap[student.id] || {};
        let presentN = 0;
        let absentN = 0;
        let excusedN = 0;
        
        const dateCells = monthDates.map(d => {
          const rec = sMap[d];
          if (!rec) return '';
          if (rec.status === 'present') {
            presentN++;
            return 'Có mặt';
          }
          if (rec.status === 'absent') {
            absentN++;
            return rec.note ? `Vắng (${rec.note})` : 'Vắng';
          }
          if (rec.status === 'excused') {
            excusedN++;
            return rec.note ? `Phép (${rec.note})` : 'Phép';
          }
          return '';
        });
        
        const totalChecked = presentN + absentN + excusedN;
        const rate = totalChecked > 0 ? Math.round((presentN / totalChecked) * 100) : 100;
        
        return [
          idx + 1,
          student.name,
          ...dateCells,
          presentN,
          absentN,
          excusedN,
          `${rate}%`
        ];
      });

      const title = `BẢNG ĐIỂM DANH LỚP: ${selectedClassName.toUpperCase()}`;
      const subtitle = `Tháng ${calendarMonth}/${calendarYear}`;

      const aoaData = [
        [title],
        [subtitle],
        [],
        headers,
        ...rowsData
      ];

      const ws = XLSX.utils.aoa_to_sheet(aoaData);
      const totalCols = headers.length;
      
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } }
      ];

      const colWidths = Array(totalCols).fill(null).map((_, c) => {
        if (c === 0) return { wch: 6 };
        if (c === 1) return { wch: 20 };
        if (c >= 2 && c < totalCols - 4) return { wch: 10 };
        return { wch: 15 };
      });
      ws['!cols'] = colWidths;

      // Style A1 and A2
      const titleRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
      if (ws[titleRef]) {
        ws[titleRef].s = {
          font: { bold: true, size: 14, color: { rgb: '4F46E5' } },
          alignment: { horizontal: 'center' }
        };
      }
      const subRef = XLSX.utils.encode_cell({ r: 1, c: 0 });
      if (ws[subRef]) {
        ws[subRef].s = {
          font: { italic: true, size: 10, color: { rgb: '475569' } },
          alignment: { horizontal: 'center' }
        };
      }

      // Row headers
      for (let c = 0; c < totalCols; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: 3, c });
        if (ws[cellRef]) {
          ws[cellRef].s = {
            fill: { fgColor: { rgb: '4F46E5' } },
            font: { color: { rgb: 'FFFFFF' }, bold: true, size: 10 },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: 'E2E8F0' } },
              bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
              left: { style: 'thin', color: { rgb: 'E2E8F0' } },
              right: { style: 'thin', color: { rgb: 'E2E8F0' } }
            }
          };
        }
      }

      // Cells
      for (let r = 4; r < aoaData.length; r++) {
        for (let c = 0; c < totalCols; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (!ws[cellRef]) continue;

          const style: any = {
            font: { size: 9 },
            alignment: { vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: 'F1F5F9' } },
              bottom: { style: 'thin', color: { rgb: 'F1F5F9' } },
              left: { style: 'thin', color: { rgb: 'F1F5F9' } },
              right: { style: 'thin', color: { rgb: 'F1F5F9' } }
            }
          };

          const cellVal = ws[cellRef].v;

          if (c === 0) {
            style.alignment.horizontal = 'center';
          } else if (c === 1) {
            style.alignment.horizontal = 'left';
            style.font.bold = true;
          } else if (c >= 2 && c < totalCols - 4) {
            style.alignment.horizontal = 'center';
            if (typeof cellVal === 'string') {
              if (cellVal.startsWith('Có mặt')) {
                style.fill = { fgColor: { rgb: 'D1FAE5' } };
                style.font.color = { rgb: '065F46' };
              } else if (cellVal.startsWith('Vắng')) {
                style.fill = { fgColor: { rgb: 'FEE2E2' } };
                style.font.color = { rgb: '991B1B' };
              } else if (cellVal.startsWith('Phép')) {
                style.fill = { fgColor: { rgb: 'FEF3C7' } };
                style.font.color = { rgb: '92400E' };
              }
            }
          } else {
            style.alignment.horizontal = 'center';
            if (c === totalCols - 1) {
              style.font.bold = true;
              style.font.color = { rgb: '4F46E5' };
            }
          }

          ws[cellRef].s = style;
        }
      }

      const wb = XLSX.utils.book_new();
      const sheetName = `Thang_${calendarMonth}-${calendarYear}`.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      const fileName = `Diemdanh_${selectedClassName.replace(/\s+/g, '_')}_Thang_${calendarMonth}-${calendarYear}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('Xuất file Excel tháng thành công!', fileName);
    } catch (err: any) {
      toast.error('Lỗi xuất file Excel tháng', err.message);
    }
  }, [selectedClassName, studentsInClass, classAttendance, calendarMonth, calendarYear, auditMap, toast]);

  // ─── Audit Excel Export (with filter) ──────────────────────────────────────
  const getAuditExportFilename = () => {
    const classNameClean = selectedClassName.replace(/\s+/g, '_');
    if (auditTimeRangeType === 'week') {
      return `Diemdanh_Rasoat_${classNameClean}_Tuan_${auditWeekDate.replace(/\//g, '-')}.xlsx`;
    }
    if (auditTimeRangeType === 'month') {
      return `Diemdanh_Rasoat_${classNameClean}_Thang_${auditMonthStr.replace(/\//g, '-')}.xlsx`;
    }
    if (auditTimeRangeType === 'custom') {
      const startPart = auditCustomStart ? `Tu_${auditCustomStart}` : 'Dau';
      const endPart = auditCustomEnd ? `Den_${auditCustomEnd}` : 'Cuoi';
      return `Diemdanh_Rasoat_${classNameClean}_${startPart}_${endPart}.xlsx`;
    }
    return `Diemdanh_Rasoat_${classNameClean}_TatCa.xlsx`;
  };

  const handleExportExcelAudit = useCallback(() => {
    try {
      if (!selectedClassName) {
        toast.warning('Chưa chọn lớp', 'Vui lòng chọn lớp học trước khi xuất Excel.');
        return;
      }
      if (filteredAuditStudents.length === 0) {
        toast.warning('Không có học viên', 'Không có dữ liệu học viên để xuất Excel.');
        return;
      }
      if (auditDates.length === 0) {
        toast.warning('Không có buổi học', 'Không có lịch sử điểm danh nào trong khoảng thời gian đã chọn.');
        return;
      }

      const headers = ['STT', 'Họ và tên', ...auditDates.map(d => formatSimpleDate(d)), 'Có mặt', 'Vắng (trừ buổi)', 'Vắng phép', 'Tỷ lệ %'];

      const rowsData = filteredAuditStudents.map((student, idx) => {
        const sMap = auditMap[student.id] || {};
        let presentN = 0;
        let absentN = 0;
        let excusedN = 0;
        
        const dateCells = auditDates.map(d => {
          const rec = sMap[d];
          if (!rec) return '';
          if (rec.status === 'present') {
            presentN++;
            return 'Có mặt';
          }
          if (rec.status === 'absent') {
            absentN++;
            return rec.note ? `Vắng (${rec.note})` : 'Vắng';
          }
          if (rec.status === 'excused') {
            excusedN++;
            return rec.note ? `Phép (${rec.note})` : 'Phép';
          }
          return '';
        });
        
        const totalChecked = presentN + absentN + excusedN;
        const rate = totalChecked > 0 ? Math.round((presentN / totalChecked) * 100) : 100;
        
        return [
          idx + 1,
          student.name,
          ...dateCells,
          presentN,
          absentN,
          excusedN,
          `${rate}%`
        ];
      });

      const title = `BẢNG RÀ SOÁT ĐIỂM DANH LỚP: ${selectedClassName.toUpperCase()}`;
      
      let periodStr = 'Tất cả lịch sử';
      if (auditTimeRangeType === 'week') {
        const [start, end] = getWeekRange(auditWeekDate);
        periodStr = `Tuần: ${formatDate(start)} - ${formatDate(end)}`;
      } else if (auditTimeRangeType === 'month') {
        periodStr = `Tháng: ${auditMonthStr}`;
      } else if (auditTimeRangeType === 'custom') {
        periodStr = `Từ ngày: ${auditCustomStart ? formatDate(auditCustomStart) : 'đầu'} đến ngày: ${auditCustomEnd ? formatDate(auditCustomEnd) : 'nay'}`;
      }

      const aoaData = [
        [title],
        [`Thời gian: ${periodStr}`],
        [],
        headers,
        ...rowsData
      ];

      const ws = XLSX.utils.aoa_to_sheet(aoaData);
      const totalCols = headers.length;
      
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } }
      ];

      const colWidths = Array(totalCols).fill(null).map((_, c) => {
        if (c === 0) return { wch: 6 };
        if (c === 1) return { wch: 20 };
        if (c >= 2 && c < totalCols - 4) return { wch: 10 };
        return { wch: 15 };
      });
      ws['!cols'] = colWidths;

      // Style A1 and A2
      const titleRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
      if (ws[titleRef]) {
        ws[titleRef].s = {
          font: { bold: true, size: 14, color: { rgb: '4F46E5' } },
          alignment: { horizontal: 'center' }
        };
      }
      const subRef = XLSX.utils.encode_cell({ r: 1, c: 0 });
      if (ws[subRef]) {
        ws[subRef].s = {
          font: { italic: true, size: 10, color: { rgb: '475569' } },
          alignment: { horizontal: 'center' }
        };
      }

      // Headers row
      for (let c = 0; c < totalCols; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: 3, c });
        if (ws[cellRef]) {
          ws[cellRef].s = {
            fill: { fgColor: { rgb: '4F46E5' } },
            font: { color: { rgb: 'FFFFFF' }, bold: true, size: 10 },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: 'E2E8F0' } },
              bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
              left: { style: 'thin', color: { rgb: 'E2E8F0' } },
              right: { style: 'thin', color: { rgb: 'E2E8F0' } }
            }
          };
        }
      }

      // Data Rows
      for (let r = 4; r < aoaData.length; r++) {
        for (let c = 0; c < totalCols; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (!ws[cellRef]) continue;

          const style: any = {
            font: { size: 9 },
            alignment: { vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: 'F1F5F9' } },
              bottom: { style: 'thin', color: { rgb: 'F1F5F9' } },
              left: { style: 'thin', color: { rgb: 'F1F5F9' } },
              right: { style: 'thin', color: { rgb: 'F1F5F9' } }
            }
          };

          const cellVal = ws[cellRef].v;

          if (c === 0) {
            style.alignment.horizontal = 'center';
          } else if (c === 1) {
            style.alignment.horizontal = 'left';
            style.font.bold = true;
          } else if (c >= 2 && c < totalCols - 4) {
            style.alignment.horizontal = 'center';
            if (typeof cellVal === 'string') {
              if (cellVal.startsWith('Có mặt')) {
                style.fill = { fgColor: { rgb: 'D1FAE5' } };
                style.font.color = { rgb: '065F46' };
              } else if (cellVal.startsWith('Vắng')) {
                style.fill = { fgColor: { rgb: 'FEE2E2' } };
                style.font.color = { rgb: '991B1B' };
              } else if (cellVal.startsWith('Phép')) {
                style.fill = { fgColor: { rgb: 'FEF3C7' } };
                style.font.color = { rgb: '92400E' };
              }
            }
          } else {
            style.alignment.horizontal = 'center';
            if (c === totalCols - 1) {
              style.font.bold = true;
              style.font.color = { rgb: '4F46E5' };
            }
          }

          ws[cellRef].s = style;
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rà soát điểm danh');
      
      const fileName = getAuditExportFilename();
      XLSX.writeFile(wb, fileName);
      toast.success('Xuất file Excel thành công!', fileName);
    } catch (err: any) {
      toast.error('Lỗi xuất file Excel', err.message);
    }
  }, [selectedClassName, filteredAuditStudents, auditDates, auditMap, auditTimeRangeType, auditWeekDate, auditMonthStr, auditCustomStart, auditCustomEnd, toast]);

  return (
    <div className="space-y-6">
      {/* Warnings & Alerts section */}
      {unattendedClasses.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <h4 className="font-bold text-red-800 text-sm">Cảnh báo điểm danh hôm nay</h4>
              <p className="text-xs text-red-600 mt-0.5">
                Các lớp sau có lịch học hôm nay nhưng chưa được điểm danh:{' '}
                <strong>{unattendedClasses.map(c => c.name).join(', ')}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedClassName(unattendedClasses[0].name);
              setSelectedDate(todayStr);
              setActiveTab('diem-danh');
            }}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shrink-0 transition-colors shadow-sm"
          >
            Điểm danh ngay
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý Điểm danh</h2>
          <p className="text-sm text-slate-500 mt-1">
            {selectedClassName ? `Lớp ${selectedClassName} — Chuyên cần trung bình: ` : 'Chọn lớp học để bắt đầu theo dõi chuyên cần'}
            {selectedClassName && (
              <span className={`font-bold ${classAverageAttendance >= 90 ? 'text-emerald-600' : classAverageAttendance >= 75 ? 'text-amber-500' : 'text-red-500'}`}>
                {classAverageAttendance}%
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Controls Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Class Selector */}
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Chọn lớp</label>
            {classOptions.length === 0 ? (
              <div className="w-full px-4 py-2.5 border-2 border-amber-300 bg-amber-50 rounded-xl text-sm text-amber-700 font-medium">
                ⚠️ Chưa có lớp nào — hãy thêm lớp ở tab "Lớp học"
              </div>
            ) : (
              <select
                value={selectedClassName}
                onChange={e => setSelectedClassName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white cursor-pointer"
              >
                <option value="">-- Chọn lớp học --</option>
                {classOptions.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.name}{c.type === 'online' ? ' (Online)' : ' (Offline)'}
                    {c.source === 'student' ? ' *' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tab Selector Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('diem-danh')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'diem-danh' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <CalendarDays className="w-3.5 h-3.5 inline mr-1" /> Điểm danh
            </button>
            <button
              onClick={() => setActiveTab('lich-thang')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'lich-thang' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <BookOpen className="w-3.5 h-3.5 inline mr-1" /> Lịch tháng
            </button>
            <button
              onClick={() => setActiveTab('ra-soat')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'ra-soat' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <BarChart2 className="w-3.5 h-3.5 inline mr-1" /> Rà soát & Excel
            </button>
            <button
              onClick={() => setActiveTab('lich-su')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'lich-su' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <RefreshCw className="w-3.5 h-3.5 inline mr-1" /> Lịch sử
            </button>
          </div>
        </div>
      </div>

      {/* ─── TAB Content ─── */}
      {!selectedClassName ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Vui lòng chọn lớp để xem thông tin điểm danh</p>
        </div>
      ) : (
        <div>
          {/* 1. Daily Attendance Tab */}
          {activeTab === 'diem-danh' && (
            <div className="space-y-4">
              {/* Date selection controller */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeDate(-1)}
                    className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    onClick={() => changeDate(1)}
                    className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
                <div className="text-sm font-bold text-slate-700 bg-white px-4 py-2 border border-slate-200 rounded-xl">
                  {formatDateVN(selectedDate)}
                </div>
              </div>

              {/* Teacher selector — GV dạy hôm nay */}
              {selectedClassName && staffList.length > 0 && (
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">👩‍🏫 GV phụ trách:</span>
                      <span className="text-sm font-bold text-slate-800">{defaultTeacherName || 'Chưa gán'}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">📌 GV dạy hôm nay:</span>
                      <select
                        value={selectedTeacherId}
                        onChange={e => handleTeacherChange(e.target.value)}
                        className={`flex-1 px-3 py-2 border rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isSubstitute ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-200'
                        }`}
                      >
                        <option value="">-- Chọn GV --</option>
                        {staffList.map(s => (
                          <option key={s.id} value={s.id}>{s.name}{s.id === defaultTeacherId ? ' (chủ nhiệm)' : ''}</option>
                        ))}
                      </select>
                    </div>
                    {isSubstitute && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-full animate-pulse">
                        🔄 Dạy thay
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ⚠️ Already Attended Warning */}
              {hasExistingAttendance && rows.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-amber-800">
                        ⚠️ Lớp {selectedClassName} đã được điểm danh ngày {formatSimpleDate(selectedDate)}
                      </p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        Dữ liệu bên dưới là bản ghi đã lưu. Nếu cần chỉnh sửa, vui lòng qua tab <strong>"Lịch sử"</strong> để sửa.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('lich-su')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors whitespace-nowrap shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Xem Lịch sử
                    </button>
                  </div>
                </div>
              )}

              {rows.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                  <AlertCircle className="w-12 h-12 text-amber-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">
                    Lớp <strong>{selectedClassName}</strong> không hoạt động hoặc chưa có học viên nào vào ngày {formatDate(selectedDate)}
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Quick Select all status bar */}
                  <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 gap-3">
                    <div className="flex gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                        <CheckCircle2 className="w-4 h-4" /> {presentCount} Có mặt
                      </span>
                      <span className="flex items-center gap-1.5 text-red-600 font-bold">
                        <XCircle className="w-4 h-4" /> {absentCount} Vắng
                      </span>
                      <span className="flex items-center gap-1.5 text-amber-600 font-bold">
                        <Clock className="w-4 h-4" /> {excusedCount} Phép
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-semibold">Chọn tất cả:</span>
                      {(['present', 'absent', 'excused'] as AttStatus[]).map(s => (
                        <button
                          key={s}
                          onClick={() => setAllStatus(s)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${STATUS_CONFIG[s].color}`}
                        >
                          {STATUS_CONFIG[s].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Student Attendance rows */}
                  <div className="divide-y divide-slate-100">
                    {rows.map((row, idx) => {
                      const sessionsRemaining = sessionsRemainingMap[row.studentId] ?? 0;
                      const student = students.find(s => s.id === row.studentId);
                      const feePerSession = student ? Number(student.feePerSession) || 0 : 0;
                      const hasWarning = consecutiveAbsences[row.studentId] >= 3;
                      const attRate = attendanceRates[row.studentId] ?? 100;

                      return (
                        <div key={row.studentId} className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/40 transition-colors">
                          <div className="flex items-center gap-3 min-w-[280px]">
                            <div className="w-7 text-xs font-bold text-slate-400">{idx + 1}</div>
                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0">
                              {row.studentName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 flex items-center gap-2">
                                {row.studentName}
                                {student?.status === 'suspended' && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700 border border-amber-300">🟡 Tạm nghỉ</span>
                                )}
                                {student?.status === 'left' && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700 border border-red-300">🔴 Đã nghỉ</span>
                                )}
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${attRate >= 90 ? 'bg-emerald-50 text-emerald-700' : attRate >= 75 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                                  {attRate}%
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-1 text-[11px]">
                                {feePerSession === 0 ? (
                                  <span className="text-slate-400 font-medium">⚠️ Chưa cài học phí</span>
                                ) : sessionsRemaining <= 0 ? (
                                  <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded font-black border border-red-200">🔴 Hết buổi (Còn {sessionsRemaining})</span>
                                ) : sessionsRemaining <= 2 ? (
                                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold border border-amber-200">🟡 Sắp hết (Còn {sessionsRemaining})</span>
                                ) : (
                                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">🟢 Còn {sessionsRemaining} buổi</span>
                                )}

                                {hasWarning && (
                                  <span className="text-red-700 bg-red-100 border border-red-300 font-bold px-2 py-0.5 rounded animate-pulse">
                                    ⚠️ Vắng {consecutiveAbsences[row.studentId]} buổi liên tiếp
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action controller (Status toggle + Note inputs) */}
                          <div className="flex flex-wrap items-center gap-3 flex-1 justify-end">
                            {/* Note field - visible when not present */}
                            {row.status !== 'present' && (
                              <input
                                type="text"
                                value={row.note}
                                onChange={e => setRowNote(row.studentId, e.target.value)}
                                placeholder="Lý do vắng (ốm, phép, nghỉ mát...)"
                                className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-[240px]"
                              />
                            )}

                            {/* Status Buttons */}
                            <div className="flex gap-1.5">
                              {(['present', 'absent', 'excused'] as AttStatus[]).map(s => (
                                <button
                                  key={s}
                                  onClick={() => setStatus(row.studentId, s)}
                                  className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl border-2 transition-all ${
                                    row.status === s
                                      ? STATUS_CONFIG[s].color + ' border-transparent shadow-sm scale-105'
                                      : 'border-slate-200 text-slate-400 hover:border-slate-300 bg-white'
                                  }`}
                                >
                                  {STATUS_CONFIG[s].icon}
                                  <span>{STATUS_CONFIG[s].label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Save Footer Bar */}
                  <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/70">
                    {savedMsg ? (
                      <span className="text-emerald-600 font-bold text-sm">{savedMsg}</span>
                    ) : (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" /> Vắng không phép/Có mặt → trừ 1 buổi | Vắng có phép → không trừ
                      </span>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Monthly Calendar Tab */}
          {activeTab === 'lich-thang' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => changeCalendarMonth(-1)}
                    className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="text-base font-bold text-slate-800">
                    Tháng {calendarMonth} / {calendarYear}
                  </span>
                  <button
                    onClick={() => changeCalendarMonth(1)}
                    className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleExportExcelMonthly}
                    className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-indigo-600" /> Xuất Excel tháng này
                  </button>
                </div>
              </div>

              {/* Calendar grid */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  <div>Thứ 2</div>
                  <div>Thứ 3</div>
                  <div>Thứ 4</div>
                  <div>Thứ 5</div>
                  <div>Thứ 6</div>
                  <div>Thứ 7</div>
                  <div className="text-red-500">Chủ nhật</div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, idx) => {
                    if (day.type === 'empty') {
                      return <div key={`empty-${idx}`} className="h-24 bg-slate-50/40 rounded-xl border border-slate-100" />;
                    }

                    // Determine day coloring
                    let dayStyle = 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50';
                    if (day.isChecked) {
                      // Attendance taken -> Green
                      dayStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/70';
                    } else if (day.isScheduled) {
                      // Scheduled but not taken
                      const isPastOrToday = day.dateStr <= todayStr;
                      if (isPastOrToday) {
                        dayStyle = 'bg-red-50 text-red-800 border-red-300 border-2 hover:bg-red-100/70 animate-pulse';
                      } else {
                        dayStyle = 'bg-indigo-50/50 text-indigo-700 border-indigo-200 border border-dashed hover:bg-indigo-50';
                      }
                    }

                    return (
                      <button
                        key={`day-${day.day}`}
                        onClick={() => {
                          setSelectedDate(day.dateStr);
                          setActiveTab('diem-danh');
                        }}
                        className={`h-24 p-2 rounded-xl border text-left flex flex-col justify-between transition-all select-none cursor-pointer ${dayStyle}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${day.isToday ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center' : ''}`}>
                            {day.day}
                          </span>
                          {day.isChecked && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          {!day.isChecked && day.isScheduled && day.dateStr <= todayStr && (
                            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                          )}
                        </div>

                        {/* Calendar stats/labels */}
                        <div>
                          {day.isChecked && (
                            <div className="text-[10px] font-bold text-emerald-700">
                              Có mặt: {day.presentCount}/{day.totalCount} ({day.attendanceRate}%)
                            </div>
                          )}
                          {!day.isChecked && day.isScheduled && (
                            <div className="text-[10px] font-semibold text-slate-500">
                              {day.dateStr <= todayStr ? 'Chưa điểm danh!' : 'Có lịch học'}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 3. Review & Filter Matrix & Export Tab */}
          {activeTab === 'ra-soat' && (
            <div className="space-y-4">
              {/* Range Filters Panel */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-indigo-600" />
                  Bộ lọc khoảng thời gian rà soát
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  {/* Select Range Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Xem theo</label>
                    <select
                      value={auditTimeRangeType}
                      onChange={e => setAuditTimeRangeType(e.target.value as any)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-600 outline-none bg-white cursor-pointer"
                    >
                      <option value="all">Tất cả lịch sử</option>
                      <option value="week">Theo tuần</option>
                      <option value="month">Theo tháng</option>
                      <option value="custom">Từ ngày... đến ngày...</option>
                    </select>
                  </div>

                  {/* Week Date Picker */}
                  {auditTimeRangeType === 'week' && (
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Chọn tuần (Chọn ngày bất kỳ trong tuần)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="date"
                          value={auditWeekDate}
                          onChange={e => setAuditWeekDate(e.target.value)}
                          className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 outline-none"
                        />
                        <span className="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-2 rounded-xl">
                          {(() => {
                            const [start, end] = getWeekRange(auditWeekDate);
                            return `Tuần: ${formatDate(start)} - ${formatDate(end)}`;
                          })()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Month Picker */}
                  {auditTimeRangeType === 'month' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Chọn tháng</label>
                      <input
                        type="month"
                        value={auditMonthStr}
                        onChange={e => setAuditMonthStr(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 outline-none"
                      />
                    </div>
                  )}

                  {/* Custom Range Picker */}
                  {auditTimeRangeType === 'custom' && (
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Từ ngày</label>
                        <input
                          type="date"
                          value={auditCustomStart}
                          onChange={e => setAuditCustomStart(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Đến ngày</label>
                        <input
                          type="date"
                          value={auditCustomEnd}
                          onChange={e => setAuditCustomEnd(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Text search & Export action buttons */}
                  <div className="flex gap-2 w-full lg:col-span-1">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm học viên..."
                        value={auditSearch}
                        onChange={e => setAuditSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-600 outline-none"
                      />
                    </div>
                    <button
                      onClick={handleExportExcelAudit}
                      className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0 shadow-sm"
                    >
                      <Download className="w-4 h-4" /> Xuất Excel
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary stats cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                  <div className="text-2xl font-black text-indigo-600">{auditDates.length}</div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Buổi đã học</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                  <div className="text-2xl font-black text-slate-700">{studentsInClass.length}</div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Học viên lớp</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                  <div className={`text-2xl font-black ${classAverageAttendance >= 90 ? 'text-emerald-600' : classAverageAttendance >= 75 ? 'text-amber-500' : 'text-red-500'}`}>
                    {classAverageAttendance}%
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Tỉ lệ có mặt</div>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {auditDates.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-medium">
                    Không có lịch sử điểm danh nào trong khoảng thời gian đã chọn.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-xs text-slate-700 border-collapse table-fixed min-w-[700px]">
                      <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                        <tr>
                          <th className="w-[50px] text-center px-3 py-3 font-bold text-slate-500">STT</th>
                          <th className="w-[180px] text-left px-3 py-3 font-bold text-slate-500">Học viên</th>
                          
                          {/* Dynamically render date headers */}
                          {auditDates.map(date => (
                            <th key={date} className="w-[80px] text-center px-1 py-3 font-bold text-slate-500 border-l border-slate-100">
                              <div>{formatSimpleDate(date)}</div>
                              <div className="text-[9px] font-semibold text-slate-400 mt-0.5">{getWeekdayVN(date).replace('Thứ ', 'T')}</div>
                            </th>
                          ))}

                          <th className="w-[60px] text-center px-1 py-3 font-bold text-emerald-600 border-l border-slate-200">Có mặt</th>
                          <th className="w-[60px] text-center px-1 py-3 font-bold text-red-500 border-l border-slate-100">Vắng</th>
                          <th className="w-[60px] text-center px-1 py-3 font-bold text-amber-500 border-l border-slate-100">Phép</th>
                          <th className="w-[70px] text-center px-3 py-3 font-bold text-indigo-600 border-l border-slate-200">Tỷ lệ %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAuditStudents.map((student, idx) => {
                          const sMap = auditMap[student.id] || {};
                          
                          // Recalculate summary counts exclusively for the dates in the selected filtered range
                          let pCount = 0;
                          let aCount = 0;
                          let eCount = 0;
                          
                          auditDates.forEach(d => {
                            const rec = sMap[d];
                            if (rec) {
                              if (rec.status === 'present') pCount++;
                              else if (rec.status === 'absent') aCount++;
                              else if (rec.status === 'excused') eCount++;
                            }
                          });
                          
                          const total = pCount + aCount + eCount;
                          const rate = total > 0 ? Math.round((pCount / total) * 100) : 100;

                          return (
                            <tr key={student.id} className="hover:bg-slate-50/50">
                              <td className="text-center py-3 font-medium text-slate-400">{idx + 1}</td>
                              <td className="px-3 py-3 font-bold text-slate-800 truncate">{student.name}</td>
                              
                              {/* Date cells mapping */}
                              {auditDates.map(date => {
                                const rec = sMap[date];
                                if (!rec) {
                                  return (
                                    <td key={date} className="text-center py-3 text-slate-300 border-l border-slate-100">—</td>
                                  );
                                }
                                
                                const config = STATUS_CONFIG[rec.status as AttStatus];
                                return (
                                  <td
                                    key={date}
                                    title={rec.note ? `Ghi chú: ${rec.note}` : undefined}
                                    className={`text-center py-3 border-l border-slate-100 font-bold ${config?.bg || ''}`}
                                  >
                                    <span className="relative group cursor-help">
                                      {config?.shortLabel}
                                      {rec.note && (
                                        <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                                        </span>
                                      )}
                                    </span>
                                  </td>
                                );
                              })}

                              <td className="text-center py-3 font-bold text-emerald-700 bg-emerald-50/20 border-l border-slate-200">{pCount}</td>
                              <td className="text-center py-3 font-bold text-red-700 bg-red-50/20 border-l border-slate-100">{aCount}</td>
                              <td className="text-center py-3 font-bold text-amber-700 bg-amber-50/20 border-l border-slate-100">{eCount}</td>
                              <td className={`text-center py-3 font-black border-l border-slate-200 bg-indigo-50/10 ${rate >= 90 ? 'text-emerald-700' : rate >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                                {rate}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Daily History Tab */}
          {activeTab === 'lich-su' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {historyLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : classAttendance.length === 0 ? (
                <div className="p-12 text-center text-slate-400">Chưa có lịch sử điểm danh nào cho lớp này</div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {(() => {
                    const grouped: Record<string, any[]> = {};
                    classAttendance.forEach((r: any) => {
                      if (!grouped[r.date]) grouped[r.date] = [];
                      grouped[r.date].push(r);
                    });
                    const sortedGroups = Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));

                    return sortedGroups.map(([date, records]: [string, any[]]) => {
                      const present = records.filter(r => r.status === 'present').length;
                      const absent  = records.filter(r => r.status === 'absent').length;
                      const excused = records.filter(r => r.status === 'excused').length;
                      return (
                        <div key={date} className="px-6 py-4 hover:bg-slate-50/30 transition-colors">
                          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                            <div className="font-bold text-slate-700 flex items-center gap-2">
                              <span>{formatDateVN(date)}</span>
                              <button
                                onClick={() => {
                                  setSelectedDate(date);
                                  setActiveTab('diem-danh');
                                }}
                                className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold flex items-center gap-0.5 hover:underline"
                              >
                                <Pencil className="w-3 h-3" /> Chỉnh sửa
                              </button>
                            </div>
                            <div className="flex gap-3 text-xs font-bold">
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{present} Có mặt</span>
                              <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded">{absent} Vắng</span>
                              {excused > 0 && <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{excused} Có phép</span>}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {records.map((r: any) => (
                              <span
                                key={`${r.studentId}-${r.date}`}
                                title={r.note ? `Lý do: ${r.note}` : undefined}
                                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border cursor-help ${STATUS_CONFIG[r.status as AttStatus]?.color || ''}`}
                              >
                                {STATUS_CONFIG[r.status as AttStatus]?.icon}
                                <span>
                                  {r.studentName}
                                  {r.note && <span className="text-[9px] text-slate-400 ml-1 italic font-normal">({r.note})</span>}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
