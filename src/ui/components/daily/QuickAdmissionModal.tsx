import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { AdmissionLead } from '../../../shared/types';
import { api } from '../../../shared/utils';

interface QuickAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  admissionLeads: AdmissionLead[];
  currentUser: { username: string; name: string; role: string };
  onSuccess: () => void;
}

const SOURCES = ['Facebook', 'Zalo', 'Giới thiệu', 'Walk-in', 'Website', 'Khác'];

export default function QuickAdmissionModal({
  isOpen,
  onClose,
  admissionLeads,
  currentUser,
  onSuccess
}: QuickAdmissionModalProps) {
  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [source, setSource] = useState('Facebook');
  const [learningNeed, setLearningNeed] = useState('');
  const [consultationNote, setConsultationNote] = useState('');

  // Lịch hẹn test bắt buộc
  const [testScheduleDate, setTestScheduleDate] = useState('');
  const [testScheduleTime, setTestScheduleTime] = useState('18:00');
  const [testAssignee, setTestAssignee] = useState('');
  const [testScheduleNote, setTestScheduleNote] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);
  const [success, setSuccess] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStudentName('');
      setParentName('');
      setParentPhone('');
      setSource('Facebook');
      setLearningNeed('');
      setConsultationNote('');
      const today = new Date().toISOString().slice(0, 10);
      setTestScheduleDate(today);
      setTestScheduleTime('18:00');
      setTestAssignee('');
      setTestScheduleNote('');
      setError('');
      setConfirmStep(false);
      setSuccess(false);
      setDuplicateWarning(null);
    }
  }, [isOpen]);

  // Check duplicate phone when phone changes
  useEffect(() => {
    if (parentPhone.length >= 10) {
      const cleaned = parentPhone.replace(/\s/g, '');
      const existing = admissionLeads.find(lead =>
        lead.parentPhone.replace(/\s/g, '') === cleaned &&
        !['cancelled', 'rejected'].includes(lead.status)
      );
      if (existing) {
        const statusText = existing.status === 'test_scheduled' ? 'Đã hẹn test' : existing.status;
        setDuplicateWarning(
          `SĐT này đã tồn tại trong hồ sơ tuyển sinh: "${existing.studentName}" (${statusText})`
        );
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  }, [parentPhone, admissionLeads]);

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '');
    return /^0\d{9}$/.test(cleaned);
  };

  const handleValidate = () => {
    if (!studentName.trim()) {
      setError('Vui lòng nhập tên học viên');
      return;
    }
    if (!parentPhone.trim()) {
      setError('Vui lòng nhập SĐT phụ huynh');
      return;
    }
    if (!validatePhone(parentPhone)) {
      setError('SĐT phụ huynh phải có 10 chữ số và bắt đầu bằng 0 (VD: 0912345678)');
      return;
    }
    if (!testScheduleDate) {
      setError('Vui lòng chọn ngày hẹn test');
      return;
    }
    if (!testScheduleTime) {
      setError('Vui lòng chọn giờ hẹn test');
      return;
    }
    if (!testAssignee.trim()) {
      setError('Vui lòng nhập người phụ trách test');
      return;
    }
    setError('');
    setConfirmStep(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmStep) return;
    setIsSubmitting(true);
    setError('');

    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      await api.createAdmissionLead({
        studentName: studentName.trim(),
        parentName: parentName.trim() || undefined,
        parentPhone: parentPhone.trim(),
        source,
        learningNeed: learningNeed.trim() || undefined,
        consultationNote: consultationNote.trim() || undefined,
        registrationDate: todayStr,
        status: 'test_scheduled',
        testScheduleDate,
        testScheduleTime,
        testAssignee: testAssignee.trim(),
        testScheduleNote: testScheduleNote.trim() || undefined,
        createdBy: currentUser.name,
      });

      setSuccess(true);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi đăng ký tuyển sinh. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-pink-800 to-fuchsia-800 text-white">
          <h3 className="text-base font-bold flex items-center gap-2">
            🎓 Đăng ký tuyển sinh nhanh
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-pink-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {success ? (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-800">Đăng ký tuyển sinh thành công!</h4>
                <p className="text-sm text-slate-500">
                  Lead <span className="font-extrabold text-pink-600">{studentName.trim()}</span> đã được thêm vào danh sách tuyển sinh.
                </p>
                <p className="text-[11px] text-slate-400">Trạng thái: Đã hẹn test → đang chờ làm test đầu vào</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md"
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

              {/* Tên học viên */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">
                  Tên học viên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Minh Anh"
                  value={studentName}
                  onChange={(e) => { setStudentName(e.target.value); setConfirmStep(false); }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white font-semibold"
                  autoFocus
                />
              </div>

              {/* Tên + SĐT phụ huynh */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Tên phụ huynh</label>
                  <input
                    type="text"
                    placeholder="VD: Chị Lan"
                    value={parentName}
                    onChange={(e) => { setParentName(e.target.value); setConfirmStep(false); }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">
                    SĐT phụ huynh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 0912345678"
                    value={parentPhone}
                    onChange={(e) => { setParentPhone(e.target.value); setConfirmStep(false); }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white font-mono"
                  />
                  {parentPhone && !validatePhone(parentPhone) && (
                    <p className="text-[10px] text-red-500 font-bold mt-0.5">SĐT phải có 10 số, bắt đầu bằng 0</p>
                  )}
                </div>
              </div>

              {/* Cảnh báo trùng SĐT */}
              {duplicateWarning && (
                <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>{duplicateWarning}</span>
                </div>
              )}

              {/* Nguồn tuyển sinh */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Nguồn tuyển sinh</label>
                <div className="flex flex-wrap gap-1.5">
                  {SOURCES.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSource(s); setConfirmStep(false); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        source === s
                          ? 'bg-pink-100 border-pink-300 text-pink-800 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nhóm Hẹn test bắt buộc */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  📅 Lịch hẹn test (Bắt buộc)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Ngày hẹn test</label>
                    <input
                      type="date"
                      required
                      value={testScheduleDate}
                      onChange={(e) => { setTestScheduleDate(e.target.value); setConfirmStep(false); }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Giờ hẹn test</label>
                    <input
                      type="time"
                      required
                      value={testScheduleTime}
                      onChange={(e) => { setTestScheduleTime(e.target.value); setConfirmStep(false); }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Người phụ trách test</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Cô Kim"
                    value={testAssignee}
                    onChange={(e) => { setTestAssignee(e.target.value); setConfirmStep(false); }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Ghi chú hẹn test</label>
                  <input
                    type="text"
                    placeholder="VD: Test offline, mang theo bút chì..."
                    value={testScheduleNote}
                    onChange={(e) => { setTestScheduleNote(e.target.value); setConfirmStep(false); }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              {/* Nhu cầu học tập */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Nhu cầu học tập</label>
                <input
                  type="text"
                  placeholder="VD: Muốn học IELTS 6.5, nền tảng lớp 10"
                  value={learningNeed}
                  onChange={(e) => { setLearningNeed(e.target.value); setConfirmStep(false); }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white"
                />
              </div>

              {/* Ghi chú tư vấn */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Ghi chú tư vấn</label>
                <textarea
                  placeholder="Ghi chú nhanh cho nhân viên tư vấn..."
                  value={consultationNote}
                  onChange={(e) => { setConsultationNote(e.target.value); setConfirmStep(false); }}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white resize-none"
                />
              </div>

              {/* Submit */}
              {!confirmStep ? (
                <button
                  type="button"
                  onClick={handleValidate}
                  className="w-full py-3 mt-2 bg-pink-600 hover:bg-pink-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  Kiểm tra & Xác nhận
                </button>
              ) : (
                <div className="mt-2 space-y-3">
                  <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4 space-y-2 text-xs">
                    <p className="font-bold text-pink-800 text-sm">✅ Xác nhận đăng ký tuyển sinh:</p>
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <span className="font-medium">Tên học viên:</span>
                      <span className="font-bold">{studentName.trim()}</span>
                      {parentName.trim() && (
                        <>
                          <span className="font-medium">Phụ huynh:</span>
                          <span className="font-bold">{parentName.trim()}</span>
                        </>
                      )}
                      <span className="font-medium">SĐT:</span>
                      <span className="font-bold font-mono">{parentPhone}</span>
                      <span className="font-medium">Nguồn:</span>
                      <span className="font-bold">{source}</span>
                      {learningNeed.trim() && (
                        <>
                          <span className="font-medium">Nhu cầu:</span>
                          <span className="font-bold">{learningNeed.trim()}</span>
                        </>
                      )}
                      <span className="font-medium">Lịch hẹn test:</span>
                      <span className="font-bold text-pink-700">{testScheduleDate.split('-').reverse().join('/')} lúc {testScheduleTime} (bởi {testAssignee})</span>
                      <span className="font-medium">Trạng thái:</span>
                      <span className="font-bold text-pink-700">Đã hẹn test</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmStep(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Sửa lại
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                      Đăng ký lead
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
