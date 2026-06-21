import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';
import { Student, Transaction, AttendanceRecord, AppSettings } from '../../../shared/types';
import { api, formatCurrency, generateId } from '../../../shared/utils';
import { computeTuitionSummary } from '../../../shared/business/tuition';

interface QuickPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  transactions: Transaction[];
  attendance: AttendanceRecord[];
  settings: AppSettings | null;
  onSuccess: () => void;
}

export default function QuickPaymentModal({
  isOpen,
  onClose,
  students,
  transactions,
  attendance,
  settings,
  onSuccess
}: QuickPaymentModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Form states
  const [amount, setAmount] = useState('');
  const [revenueCategory, setRevenueCategory] = useState('Học phí offline');
  const [paymentMethod, setPaymentMethod] = useState('Chuyển khoản');
  const [senderName, setSenderName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    newUnearned: number;
    newSessions: number;
    warnings: string[];
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedStudent(null);
      setSelectedEnrollmentId('');
      setShowSuggestions(false);
      setAmount('');
      setRevenueCategory('Học phí offline');
      setPaymentMethod(settings?.paymentMethods?.[0] || 'Chuyển khoản');
      setSenderName('');
      setNotes('');
      setError('');
      setConfirmStep(false);
      setSuccessResult(null);
    }
  }, [isOpen, settings]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return students.filter(s => 
      s.name.toLowerCase().includes(q) ||
      (s.className || '').toLowerCase().includes(q) ||
      (s.parentPhone || '').includes(q)
    ).slice(0, 10);
  }, [searchQuery, students]);

  // Compute tuition summary of selected student
  const currentSummary = useMemo(() => {
    if (!selectedStudent) return null;
    return computeTuitionSummary(selectedStudent, transactions, attendance, selectedStudent.activeEnrollments || []);
  }, [selectedStudent, transactions, attendance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Số tiền phải lớn hơn 0');
      setIsSubmitting(false);
      return;
    }

    if (revenueCategory === 'Học phí offline' && !selectedStudent) {
      setError('Bắt buộc phải chọn học viên khi thu Học phí offline');
      setIsSubmitting(false);
      return;
    }

    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const payload = {
        paymentDate: todayStr,
        studentName: selectedStudent ? selectedStudent.name : 'Khách vãng lai',
        studentId: selectedStudent ? selectedStudent.id : undefined,
        enrollmentId: (revenueCategory === 'Học phí offline' && selectedEnrollmentId) ? selectedEnrollmentId : undefined,
        className: selectedStudent ? (
          (revenueCategory === 'Học phí offline' && selectedEnrollmentId) 
            ? selectedStudent.activeEnrollments?.find((e: any) => e.id === selectedEnrollmentId)?.className || ''
            : (selectedStudent.className || '')
        ) : '',
        studyType: 'Trực tiếp' as const, // Cố định
        term: todayStr.slice(0, 7),
        amount: numericAmount,
        paymentMethod,
        revenueCategory,
        senderName,
        notes,
        source: 'quick' // Gửi source là quick để server ghi log chính xác
      };

      const savedTx = await api.createTransaction(payload);

      // Compute success metrics
      let newUnearned = 0;
      let newSessions = 0;
      const warnings: string[] = [];

      if (selectedStudent) {
        const fakeTx: Transaction = {
          ...payload,
          id: savedTx.id || generateId(),
          createdAt: new Date().toISOString(),
          isReconciled: false,
          isInvoiced: false,
        };
        const updatedTxs = [...transactions, fakeTx];
        const newSummary = computeTuitionSummary(selectedStudent, updatedTxs, attendance, selectedStudent.activeEnrollments || []);
        newUnearned = newSummary.moneyRemaining;
        newSessions = newSummary.sessionsRemaining;

        if (newSessions <= 0) {
          warnings.push('Học viên đã hết buổi học sau giao dịch này.');
        } else if (newSessions <= 2) {
          warnings.push('Học viên sắp hết buổi học sau giao dịch này (còn 1-2 buổi).');
        }
        if (newUnearned < 0) {
          warnings.push('Tài khoản học phí của học viên vẫn đang ở trạng thái âm.');
        }
      }

      setSuccessResult({
        newUnearned,
        newSessions,
        warnings
      });

      onSuccess(); // Reload parent data
    } catch (err: any) {
      setError(err.message || 'Lỗi không thể lưu giao dịch. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white">
          <h3 className="text-base font-bold flex items-center gap-2">
            💰 Thu tiền nhanh hôm nay
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-teal-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {successResult ? (
            /* Result Screen */
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-800">Thu tiền thành công!</h4>
                <p className="text-sm text-slate-500">
                  Giao dịch {revenueCategory.toLowerCase()} trị giá <span className="font-extrabold text-emerald-600">{Number(amount).toLocaleString('vi-VN')} đ</span> đã được ghi nhận.
                </p>
              </div>

              {selectedStudent && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left space-y-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Số dư học phí mới:</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-3 border border-slate-200/60">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Học phí chưa thực hiện</p>
                      <p className="text-base font-black text-slate-800 font-mono mt-0.5">
                        {successResult.newUnearned.toLocaleString('vi-VN')} ₫
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-200/60">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Số buổi còn lại</p>
                      <p className="text-base font-black text-slate-800 mt-0.5">
                        {successResult.newSessions} buổi
                      </p>
                    </div>
                  </div>

                  {successResult.warnings.length > 0 && (
                    <div className="space-y-2 mt-2 pt-2 border-t border-slate-200/60">
                      {successResult.warnings.map((warn, i) => (
                        <div key={i} className="flex gap-2 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                          <span>{warn}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md"
              >
                Đóng
              </button>
            </div>
          ) : (
            /* Form Screen */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Student Search & Select */}
              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-slate-600">
                  Học viên {revenueCategory === 'Học phí offline' && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên học viên, SĐT hoặc Lớp..."
                    value={selectedStudent ? selectedStudent.name : searchQuery}
                    onChange={(e) => {
                      if (selectedStudent) {
                        setSelectedStudent(null);
                        setSearchQuery('');
                      } else {
                        setSearchQuery(e.target.value);
                      }
                      setShowSuggestions(true);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                  {selectedStudent && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(null);
                        setSearchQuery('');
                      }}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && filteredStudents.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {filteredStudents.map(s => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setSelectedStudent(s);
                          setShowSuggestions(false);
                          setSearchQuery('');
                          if (s.activeEnrollments && s.activeEnrollments.length > 0) {
                            setSelectedEnrollmentId(s.activeEnrollments[0].id);
                          } else {
                            setSelectedEnrollmentId('');
                          }
                        }}
                        className="px-4 py-2.5 hover:bg-slate-50 text-xs text-slate-700 cursor-pointer flex justify-between items-center"
                      >
                        <div className="font-bold">{s.name}</div>
                        <div className="text-slate-400 text-right">
                          {s.className || 'Chưa xếp lớp'} {s.parentPhone ? `• ${s.parentPhone}` : ''}
                          {(s as any).parentName ? ` • ${(s as any).parentName}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chọn Lớp áp dụng học phí nếu học song song nhiều lớp */}
              {revenueCategory === 'Học phí offline' && selectedStudent && selectedStudent.activeEnrollments && selectedStudent.activeEnrollments.length > 1 && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Áp dụng cho Lớp học <span className="text-red-500">*</span></label>
                  <select
                    value={selectedEnrollmentId}
                    onChange={(e) => setSelectedEnrollmentId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white cursor-pointer font-semibold text-slate-700"
                  >
                    {selectedStudent.activeEnrollments.map((enr: any) => (
                      <option key={enr.id} value={enr.id}>
                        {enr.className} ({Number(enr.feePerSession).toLocaleString('vi-VN')} đ/buổi)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Display selected student metrics */}
              {selectedStudent && currentSummary && (
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Học phí chưa thực hiện:</span>
                    <span className={`font-mono font-extrabold ${currentSummary.moneyRemaining < 0 ? 'text-red-500' : 'text-slate-700'}`}>
                      {currentSummary.moneyRemaining.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Số buổi học còn lại:</span>
                    <span className={`font-extrabold ${currentSummary.sessionsRemaining <= 0 ? 'text-red-500' : currentSummary.sessionsRemaining <= 2 ? 'text-amber-500' : 'text-slate-700'}`}>
                      {currentSummary.sessionsRemaining} buổi
                    </span>
                  </div>
                  {(currentSummary.moneyRemaining < 0 || currentSummary.sessionsRemaining <= 0) && (
                    <div className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg mt-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Học viên đang âm tiền hoặc hết buổi học</span>
                    </div>
                  )}
                </div>
              )}

              {/* Amount & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Số tiền (₫) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="VD: 500000"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setConfirmStep(false); }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                  {amount && Number(amount) > 0 && (
                    <p className="text-[10px] text-emerald-600 font-bold mt-1 font-mono">
                      = {Number(amount).toLocaleString('vi-VN')} ₫
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Loại khoản thu</label>
                  <select
                    value={revenueCategory}
                    onChange={(e) => setRevenueCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  >
                    {(settings?.feeTypes || ['Học phí offline', 'Lệ phí thi', 'Thu khác']).filter(ft => ft !== 'Sách' && ft !== 'Đồng phục').map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Method & Sender Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Hình thức thanh toán</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  >
                    {(settings?.paymentMethods || ['Chuyển khoản', 'Tiền mặt', 'Momo', 'ZaloPay', 'Khác']).map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Người chuyển / gửi tiền</label>
                  <input
                    type="text"
                    placeholder="Tên phụ huynh..."
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Ghi chú</label>
                <textarea
                  placeholder="Nhập ghi chú giao dịch..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
                />
              </div>

              {/* Submit Button */}
              {!confirmStep ? (
                <button
                  type="button"
                  onClick={() => {
                    const numericAmount = Number(amount);
                    if (isNaN(numericAmount) || numericAmount <= 0) {
                      setError('Số tiền phải lớn hơn 0');
                      return;
                    }
                    if (revenueCategory === 'Học phí offline' && !selectedStudent) {
                      setError('Bắt buộc phải chọn học viên khi thu Học phí offline');
                      return;
                    }
                    setError('');
                    setConfirmStep(true);
                  }}
                  className="w-full py-3 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  Kiểm tra & Xác nhận
                </button>
              ) : (
                <div className="mt-2 space-y-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2 text-xs">
                    <p className="font-bold text-emerald-800 text-sm">✅ Xác nhận giao dịch:</p>
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <span className="font-medium">Học viên:</span>
                      <span className="font-bold">{selectedStudent?.name || 'Khách vãng lai'}</span>
                      <span className="font-medium">Số tiền:</span>
                      <span className="font-bold text-emerald-700 font-mono">{Number(amount).toLocaleString('vi-VN')} ₫</span>
                      <span className="font-medium">Loại:</span>
                      <span className="font-bold">{revenueCategory}</span>
                      <span className="font-medium">Hình thức:</span>
                      <span className="font-bold">{paymentMethod}</span>
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
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                      Xác nhận thu tiền
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
