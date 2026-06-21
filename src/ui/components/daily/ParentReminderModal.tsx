import React, { useState, useMemo } from 'react';
import { X, Copy, Check, MessageSquare, AlertTriangle, AlertCircle } from 'lucide-react';
import { Student, Transaction, AttendanceRecord, AppSettings } from '../../../shared/types';
import { api, formatCurrency } from '../../../shared/utils';
import { computeTuitionSummary } from '../../../shared/business/tuition';

interface ParentReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  transactions: Transaction[];
  attendance: AttendanceRecord[];
  settings: AppSettings | null;
  onSuccess?: () => void;
}

type TabType = 'sap-het' | 'het' | 'am-tien' | 'vang-nhieu' | 'lau-chua-hoc' | 'prepay-lon';

export default function ParentReminderModal({
  isOpen,
  onClose,
  students,
  transactions,
  attendance,
  settings,
  onSuccess
}: ParentReminderModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('sap-het');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [remindedIds, setRemindedIds] = useState<Record<string, boolean>>({});

  const centerName = settings?.centerName || 'Kim Academy';

  // Today's YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Compute tuition summaries for all students
  const studentSummaries = useMemo(() => {
    return students.reduce((acc, s) => {
      acc[s.id] = computeTuitionSummary(s, transactions, attendance);
      return acc;
    }, {} as Record<string, ReturnType<typeof computeTuitionSummary>>);
  }, [students, transactions, attendance]);

  // Group 1: Sắp hết buổi (1–2 buổi)
  const sapHetStudents = useMemo(() => {
    return students.filter(s => {
      if (s.status !== 'active') return false;
      const sum = studentSummaries[s.id];
      return sum && sum.sessionsRemaining > 0 && sum.sessionsRemaining <= 2;
    });
  }, [students, studentSummaries]);

  // Group 2: Hết buổi (0 buổi)
  const hetStudents = useMemo(() => {
    return students.filter(s => {
      if (s.status !== 'active') return false;
      const sum = studentSummaries[s.id];
      return sum && sum.sessionsRemaining === 0 && sum.moneyRemaining >= 0;
    });
  }, [students, studentSummaries]);

  // Group 3: Học vượt / âm tiền
  const amTienStudents = useMemo(() => {
    return students.filter(s => {
      if (s.status !== 'active') return false;
      const sum = studentSummaries[s.id];
      return sum && sum.moneyRemaining < 0;
    });
  }, [students, studentSummaries]);

  // Group 4: Vắng nhiều (vắng >= 3 buổi)
  const vangNhieuStudents = useMemo(() => {
    return students.filter(s => {
      if (s.status !== 'active') return false;
      const studentAtt = attendance.filter(a => a.studentId === s.id && a.status === 'absent');
      return studentAtt.length >= 3;
    });
  }, [students, attendance]);

  // Group 5: Lâu chưa đi học (>= 14 ngày không điểm danh)
  const lauChuaHocStudents = useMemo(() => {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const limitDate = fourteenDaysAgo.toISOString().slice(0, 10);

    return students.filter(s => {
      if (s.status !== 'active') return false;
      // Get all attendance records for student
      const studentAtt = attendance.filter(a => a.studentId === s.id);
      if (studentAtt.length === 0) {
        // If student registered but never attended, check enrollment date
        return s.enrollDate ? s.enrollDate <= limitDate : false;
      }
      // Find latest attendance date
      const sortedAtt = [...studentAtt].sort((a, b) => b.date.localeCompare(a.date));
      const latestDate = sortedAtt[0].date;
      return latestDate <= limitDate;
    });
  }, [students, attendance]);

  // Group 6: Học phí đóng trước lớn (> 5.000.000 ₫)
  const prepayLonStudents = useMemo(() => {
    return students.filter(s => {
      if (s.status !== 'active') return false;
      const sum = studentSummaries[s.id];
      return sum && sum.moneyRemaining > 5000000;
    });
  }, [students, studentSummaries]);

  const activeGroupStudents = useMemo(() => {
    switch (activeTab) {
      case 'sap-het': return sapHetStudents;
      case 'het': return hetStudents;
      case 'am-tien': return amTienStudents;
      case 'vang-nhieu': return vangNhieuStudents;
      case 'lau-chua-hoc': return lauChuaHocStudents;
      case 'prepay-lon': return prepayLonStudents;
      default: return [];
    }
  }, [activeTab, sapHetStudents, hetStudents, amTienStudents, vangNhieuStudents, lauChuaHocStudents, prepayLonStudents]);

  const generateMessage = (student: Student, type: TabType) => {
    const sum = studentSummaries[student.id];
    switch (type) {
      case 'sap-het':
        return `Kính gửi phụ huynh con ${student.name}, ${centerName} xin thông báo con hiện chỉ còn ${sum?.sessionsRemaining || 0} buổi học. Kính mong phụ huynh lưu ý đóng học phí khóa tiếp theo để tránh gián đoạn học tập của con. Xin cảm ơn!`;
      case 'het':
        return `Kính gửi phụ huynh con ${student.name}, ${centerName} xin thông báo con đã hoàn thành xong số buổi học của khóa. Kính mong phụ huynh đóng học phí khóa tiếp theo để con tiếp tục đi học đầy đủ. Xin cảm ơn!`;
      case 'am-tien':
        return `Kính gửi phụ huynh con ${student.name}, ${centerName} xin thông báo con đã học vượt số buổi đóng trước (âm ${Math.abs(sum?.sessionsRemaining || 0)} buổi), hiện đang dư nợ học phí là ${Math.abs(sum?.moneyRemaining || 0).toLocaleString('vi-VN')}đ. Kính mong phụ huynh sắp xếp thanh toán nợ học phí sớm cho con. Xin cảm ơn!`;
      case 'vang-nhieu': {
        const absentCount = attendance.filter(a => a.studentId === student.id && a.status === 'absent').length;
        return `Kính gửi phụ huynh con ${student.name}, ${centerName} xin thông báo con đã vắng học ${absentCount} buổi trong thời gian qua. Trung tâm rất mong con đi học đầy đủ để đảm bảo chất lượng học tập. Kính chúc gia đình sức khỏe!`;
      }
      case 'lau-chua-hoc': {
        const studentAtt = attendance.filter(a => a.studentId === student.id);
        let daysCount = 14;
        if (studentAtt.length > 0) {
          const sortedAtt = [...studentAtt].sort((a, b) => b.date.localeCompare(a.date));
          const diffMs = Date.now() - new Date(sortedAtt[0].date).getTime();
          daysCount = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }
        return `Kính gửi phụ huynh con ${student.name}, ${centerName} nhận thấy đã ${daysCount} ngày con chưa tham gia điểm danh lớp học. Phụ huynh vui lòng liên hệ trung tâm để sắp xếp lịch đi học lại cho con nhé. Xin cảm ơn!`;
      }
      case 'prepay-lon':
        return `Kính gửi phụ huynh con ${student.name}, ${centerName} xin xác nhận số dư học phí đóng trước hiện tại của con là ${sum?.moneyRemaining.toLocaleString('vi-VN')}đ. Trung tâm sẽ tiếp tục đồng hành và điểm danh trừ buổi khi con đi học. Trân trọng cảm ơn phụ huynh!`;
      default:
        return '';
    }
  };

  const handleCopyMessage = async (student: Student) => {
    const msg = generateMessage(student, activeTab);
    try {
      await navigator.clipboard.writeText(msg);
      setCopiedId(student.id);
      setTimeout(() => setCopiedId(null), 2000);

      // Audit log on client
      await api.addAuditLog({
        action: 'parent_reminder_copied',
        entity: 'student',
        entityId: student.id,
        details: `Copy tin nhắn nhắc phụ huynh học viên ${student.name} (${activeTab})`
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Không thể copy tin nhắn:', err);
    }
  };

  const handleMarkReminded = async (student: Student) => {
    try {
      await api.addAuditLog({
        action: 'parent_reminder_marked',
        entity: 'student',
        entityId: student.id,
        details: `Đã liên hệ nhắc nhở phụ huynh học viên ${student.name} về học phí/điểm danh`
      });
      setRemindedIds(prev => ({
        ...prev,
        [student.id]: true
      }));
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Không thể đánh dấu đã nhắc:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-900 to-indigo-950 text-white">
          <h3 className="text-base font-bold flex items-center gap-2">
            🔔 Nhắc nhở phụ huynh hằng ngày
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 flex flex-wrap gap-1.5 overflow-x-auto shrink-0">
          {[
            { id: 'sap-het', label: '🟡 Sắp hết buổi', count: sapHetStudents.length },
            { id: 'het', label: '🔴 Hết buổi', count: hetStudents.length },
            { id: 'am-tien', label: '🚨 Âm tiền', count: amTienStudents.length },
            { id: 'vang-nhieu', label: '📅 Vắng >= 3 buổi', count: vangNhieuStudents.length },
            { id: 'lau-chua-hoc', label: '🕒 Lâu chưa đi học', count: lauChuaHocStudents.length },
            { id: 'prepay-lon', label: '💰 Đóng trước lớn (>5M)', count: prepayLonStudents.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer border whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Modal body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeGroupStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold">Không có học viên nào thuộc danh mục này cần nhắc nhở.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 font-semibold mb-2">
                Hệ thống tự động lọc các học viên rủi ro vận hành. Sử dụng nút copy tin nhắn để gửi qua Zalo/SMS cho phụ huynh.
              </div>

              <div className="space-y-3">
                {activeGroupStudents.map(student => {
                  const sum = studentSummaries[student.id];
                  const hasPhone = student.parentPhone && student.parentPhone.trim().length > 0;
                  const isReminded = remindedIds[student.id];

                  // Detailed info based on active tab
                  let infoText = '';
                  if (activeTab === 'sap-het') infoText = `Số buổi còn lại: ${sum?.sessionsRemaining} buổi`;
                  if (activeTab === 'het') infoText = 'Số buổi còn lại: 0 buổi';
                  if (activeTab === 'am-tien') infoText = `Âm học phí: ${sum ? Math.abs(sum.moneyRemaining).toLocaleString('vi-VN') : 0} ₫ (${sum?.sessionsRemaining} buổi)`;
                  if (activeTab === 'vang-nhieu') {
                    const absent = attendance.filter(a => a.studentId === student.id && a.status === 'absent').length;
                    infoText = `Số buổi vắng không phép: ${absent} buổi`;
                  }
                  if (activeTab === 'lau-chua-hoc') {
                    const studentAtt = attendance.filter(a => a.studentId === student.id);
                    if (studentAtt.length > 0) {
                      const sorted = [...studentAtt].sort((a, b) => b.date.localeCompare(a.date));
                      infoText = `Buổi điểm danh cuối: ${sorted[0].date} (Cách đây ${Math.floor((Date.now() - new Date(sorted[0].date).getTime()) / (1000 * 3600 * 24))} ngày)`;
                    } else {
                      infoText = `Chưa từng đi học (Ngày nhập học: ${student.enrollDate || 'N/A'})`;
                    }
                  }
                  if (activeTab === 'prepay-lon') infoText = `Đã đóng trước lũy kế: ${sum?.moneyRemaining.toLocaleString('vi-VN')} ₫`;

                  return (
                    <div key={student.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left side: Student details */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{student.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                            {student.className || 'Chưa xếp lớp'}
                          </span>
                          {!hasPhone && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Thiếu SĐT phụ huynh
                            </span>
                          )}
                        </div>
                        <div className="text-xs space-y-1">
                          <p className="text-indigo-600 font-bold">{infoText}</p>
                          {hasPhone && <p className="text-slate-500 font-semibold">SĐT: {student.parentPhone}</p>}
                        </div>

                        {/* Generated message preview */}
                        <div className="bg-white rounded-xl p-3 border border-slate-200 text-xs text-slate-600 leading-relaxed italic relative mt-2">
                          {generateMessage(student, activeTab)}
                        </div>
                      </div>

                      {/* Right side: Action Buttons */}
                      <div className="flex sm:flex-row md:flex-col gap-2 shrink-0 md:justify-center">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(student)}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 text-indigo-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          {copiedId === student.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Đã copy</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy tin nhắn</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkReminded(student)}
                          className={`flex items-center justify-center gap-1.5 px-4 py-2 border font-bold text-xs rounded-xl transition-all cursor-pointer ${
                            isReminded
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 pointer-events-none'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {isReminded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Đã nhắc nhở</span>
                            </>
                          ) : (
                            <span>Đánh dấu Đã nhắc</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
