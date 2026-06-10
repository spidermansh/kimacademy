import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Calculator, BookOpen, AlertTriangle } from 'lucide-react';
import { api } from '../utils';

interface ClassTransferModalProps {
  student: any;
  transactions: any[];
  classes: { id: string; name: string; type: string }[];
  onConfirm: (updatedStudent: any) => void;
  onClose: () => void;
}

export default function ClassTransferModal({
  student,
  transactions,
  classes,
  onConfirm,
  onClose,
}: ClassTransferModalProps) {
  const [newClassName, setNewClassName]         = useState('');
  const [newFeePerSession, setNewFeePerSession] = useState('');
  const [transferDate, setTransferDate]         = useState(new Date().toISOString().slice(0, 10));
  const [transferNote, setTransferNote]         = useState('');
  const [saving, setSaving]                     = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [enrollmentHistory, setEnrollmentHistory] = useState<any[]>([]);

  // Load attendance + enrollment history for this student
  useEffect(() => {
    Promise.all([
      api.getAttendance({ studentId: student.id }),
      api.getEnrollments({ studentId: student.id }),
    ]).then(([att, enr]) => {
      setAttendanceHistory(att);
      setEnrollmentHistory(enr);
    }).catch(() => {});
  }, [student.id]);

  // ── Tính tiền đã dùng theo từng giai đoạn enrollment ──────────────────────
  const totalPaidOffline = transactions
    .filter(t =>
      t.studentName?.toLowerCase() === student.name?.toLowerCase() &&
      t.revenueCategory === 'Học phí offline'
    )
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  // Tính buổi đã dùng + tiền đã dùng tách theo enrollment
  const enrollmentStats = enrollmentHistory
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map(enr => {
      const sessionsUsed = attendanceHistory.filter(a => {
        if (a.className?.toLowerCase() !== enr.className.toLowerCase()) return false;
        if (a.date < enr.startDate) return false;
        if (enr.endDate && a.date > enr.endDate) return false;
        return a.status !== 'excused';
      }).length;
      const costUsed = sessionsUsed * (enr.feePerSession || 0);
      return { ...enr, sessionsUsed, costUsed };
    });

  // Nếu học viên chưa có enrollment history (học viên cũ), tính theo cách cũ
  const totalCostUsed = enrollmentStats.length > 0
    ? enrollmentStats.reduce((s, e) => s + e.costUsed, 0)
    : attendanceHistory.filter(a => a.status !== 'excused').length * (student.feePerSession || 0);

  const moneyRemaining = totalPaidOffline - totalCostUsed;
  const newFee = parseInt(newFeePerSession.replace(/\D/g, '') || '0', 10);
  const sessionsRemainingInNewClass = newFee > 0 ? Math.floor(moneyRemaining / newFee) : 0;

  // Auto-fill fee when selecting a class from the list
  const handleClassSelect = (name: string) => {
    setNewClassName(name);
    // Try to find existing enrollment fee for this class, or keep current
    const existingEnr = enrollmentHistory.find(e => e.className === name);
    if (existingEnr) {
      setNewFeePerSession(new Intl.NumberFormat('en-US').format(existingEnr.feePerSession));
    }
  };

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setNewFeePerSession(raw ? new Intl.NumberFormat('en-US').format(parseInt(raw, 10)) : '');
  };

  const handleConfirm = async () => {
    if (!newClassName) { alert('Vui lòng chọn lớp mới!'); return; }
    if (!transferDate)  { alert('Vui lòng chọn ngày chuyển lớp!'); return; }
    if (newClassName === student.className) {
      alert('Lớp mới phải khác lớp hiện tại!'); return;
    }
    setSaving(true);
    try {
      const result = await api.transferClass({
        studentId: student.id,
        studentName: student.name,
        newClassName,
        newFeePerSession: newFee,
        transferDate,
        transferNote,
      });
      onConfirm(result.student || { ...student, className: newClassName, feePerSession: newFee });
    } catch (err: any) {
      alert('Lỗi chuyển lớp: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const currentSessions = attendanceHistory.filter(a => {
    if (enrollmentHistory.length === 0) return a.status !== 'excused';
    const activeEnr = enrollmentHistory.find(e => e.isActive);
    if (!activeEnr) return false;
    return a.className?.toLowerCase() === activeEnr.className.toLowerCase()
      && a.date >= activeEnr.startDate
      && a.status !== 'excused';
  }).length;

  const currentFee = student.feePerSession || 0;
  const currentTotalBought = currentFee > 0 ? Math.floor(totalPaidOffline / currentFee) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-900 to-indigo-700 rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Chuyển Lớp Học
            </h2>
            <p className="text-indigo-200 text-xs mt-0.5">Học viên: <strong>{student.name}</strong></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-indigo-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-indigo-200" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">

          {/* Tình trạng hiện tại */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tình trạng hiện tại</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white rounded-lg p-3 border border-slate-100">
                <div className="text-lg font-black text-indigo-700">{student.className || '—'}</div>
                <div className="text-[10px] text-slate-400 mt-1 font-medium uppercase">Lớp hiện tại</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-100">
                <div className="text-lg font-black text-emerald-700">
                  {currentFee > 0 ? `${currentFee.toLocaleString('vi-VN')}đ` : '—'}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-medium uppercase">HP/buổi hiện tại</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-100">
                <div className={`text-lg font-black ${moneyRemaining <= 0 ? 'text-red-600' : 'text-indigo-700'}`}>
                  {moneyRemaining.toLocaleString('vi-VN')}đ
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-medium uppercase">Tiền còn lại</div>
              </div>
            </div>
            {/* Cost breakdown */}
            <div className="mt-3 text-xs text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Tổng đã đóng (offline):</span>
                <span className="font-semibold text-slate-700">{totalPaidOffline.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between">
                <span>Đã dùng ({currentSessions} buổi × {currentFee.toLocaleString('vi-VN')}đ):</span>
                <span className="font-semibold text-red-500">−{totalCostUsed.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
          </div>

          {/* Lịch sử giai đoạn học */}
          {enrollmentStats.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Lịch sử giai đoạn học</p>
              <div className="space-y-1.5">
                {enrollmentStats.map(enr => (
                  <div key={enr.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs border ${enr.isActive ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                    <BookOpen className={`w-3.5 h-3.5 shrink-0 ${enr.isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                    <div className="flex-1">
                      <span className={`font-semibold ${enr.isActive ? 'text-indigo-800' : 'text-slate-600'}`}>{enr.className}</span>
                      <span className="text-slate-400 ml-2">{enr.startDate} → {enr.endDate || 'nay'}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-700">{enr.sessionsUsed} buổi</div>
                      <div className="text-slate-400">{enr.costUsed.toLocaleString('vi-VN')}đ</div>
                    </div>
                    {enr.isActive && <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">Hiện tại</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form chuyển lớp */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thông tin lớp mới</p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Lớp mới <span className="text-red-500">*</span></label>
              {classes.length > 0 ? (
                <select
                  value={newClassName}
                  onChange={e => handleClassSelect(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="">-- Chọn lớp --</option>
                  {classes.filter(c => c.name !== student.className).map(c => (
                    <option key={c.id} value={c.name}>{c.name} ({c.type})</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  placeholder="Nhập tên lớp mới"
                  className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-indigo-600 mb-1.5">HP/buổi lớp mới (VNĐ)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newFeePerSession}
                    onChange={handleFeeChange}
                    placeholder="VD: 87,500"
                    className="w-full px-4 py-2.5 border-2 border-indigo-200 bg-indigo-50 rounded-xl text-sm font-mono text-right font-semibold text-indigo-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-indigo-400 pointer-events-none">đ</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ngày chuyển lớp <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={transferDate}
                  onChange={e => setTransferDate(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ghi chú lý do chuyển lớp</label>
              <input
                type="text"
                value={transferNote}
                onChange={e => setTransferNote(e.target.value)}
                placeholder="VD: Học viên tiến bộ nhanh, chuyển lên lớp cao hơn"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Tính toán kết quả */}
          {newClassName && newFee > 0 && (
            <div className={`rounded-xl p-4 border-2 ${moneyRemaining <= 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Calculator className={`w-4 h-4 ${moneyRemaining <= 0 ? 'text-red-500' : 'text-emerald-600'}`} />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Dự tính sau chuyển lớp</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-base font-black text-slate-700">{moneyRemaining.toLocaleString('vi-VN')}đ</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Tiền còn lại</div>
                </div>
                <div>
                  <div className="text-base font-black text-indigo-700">{newFee.toLocaleString('vi-VN')}đ</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">HP/buổi mới</div>
                </div>
                <div>
                  <div className={`text-base font-black ${sessionsRemainingInNewClass <= 3 ? 'text-red-600' : 'text-emerald-700'}`}>
                    ~{sessionsRemainingInNewClass} buổi
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Còn lại ở lớp mới</div>
                </div>
              </div>
              {sessionsRemainingInNewClass <= 3 && sessionsRemainingInNewClass >= 0 && (
                <div className="flex items-center gap-2 mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Cần thông báo phụ huynh đóng thêm học phí sớm!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !newClassName || !transferDate}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            {saving ? 'Đang xử lý...' : `Xác nhận chuyển sang ${newClassName || '...'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
