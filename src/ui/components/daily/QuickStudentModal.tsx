import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { Class, AppSettings } from '../../../shared/types';
import { api } from '../../../shared/utils';

interface QuickStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: Class[];
  settings: AppSettings | null;
  onSuccess: () => void;
}

export default function QuickStudentModal({
  isOpen,
  onClose,
  classes,
  settings,
  onSuccess
}: QuickStudentModalProps) {
  const [fullName, setFullName] = useState('');
  const [englishName, setEnglishName] = useState('');
  const [className, setClassName] = useState('');
  const [gender, setGender] = useState('Nam');
  const [birthYear, setBirthYear] = useState(new Date().getFullYear() - 10);
  const [parentPhone, setParentPhone] = useState('');
  const [feePerSession, setFeePerSession] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);
  const [success, setSuccess] = useState(false);

  const activeClasses = useMemo(() =>
    classes.filter(c => c.type !== 'online' && c.status === 'active'),
    [classes]
  );

  useEffect(() => {
    if (isOpen) {
      setFullName('');
      setEnglishName('');
      setClassName(activeClasses.length > 0 ? activeClasses[0].name : '');
      setGender('Nam');
      setBirthYear(new Date().getFullYear() - 10);
      setParentPhone('');
      setFeePerSession('');
      setError('');
      setConfirmStep(false);
      setSuccess(false);
    }
  }, [isOpen, activeClasses]);

  // Auto-fill fee when class changes
  useEffect(() => {
    if (className) {
      const cls = classes.find(c => c.name === className);
      if (cls?.defaultFee && cls.defaultFee > 0 && !feePerSession) {
        setFeePerSession(String(cls.defaultFee));
      }
    }
  }, [className, classes]);

  const extractVietnameseName = (name: string): string => {
    const clean = name.trim();
    if (!clean) return '';
    const parts = clean.split(/\s+/);
    if (parts.length <= 2) return clean;
    return parts.slice(-2).join(' ');
  };

  const vietnameseName = extractVietnameseName(fullName);
  const vietAnhName = englishName.trim()
    ? `${vietnameseName} - ${englishName.trim()}`
    : vietnameseName;

  const feeNumeric = parseInt(feePerSession.replace(/\D/g, '') || '0', 10);

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '');
    return /^0\d{9}$/.test(cleaned);
  };

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setFeePerSession(raw);
    setConfirmStep(false);
  };

  const handleValidate = () => {
    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên học viên');
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
    setError('');
    setConfirmStep(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmStep) return;
    setIsSubmitting(true);
    setError('');

    try {
      await api.createStudent({
        name: fullName.trim(),
        vietnameseName: vietnameseName.trim(),
        englishName: englishName.trim(),
        vietAnhName: vietAnhName.trim(),
        className: className.trim(),
        gender,
        birthYear: Number(birthYear),
        parentPhone: parentPhone.trim(),
        feePerSession: feeNumeric,
        status: 'active',
        enrollDate: new Date().toISOString().slice(0, 10),
      });

      setSuccess(true);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu học viên. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-800 to-indigo-800 text-white">
          <h3 className="text-base font-bold flex items-center gap-2">
            👤 Thêm học viên nhanh
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
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
                <h4 className="text-lg font-black text-slate-800">Thêm học viên thành công!</h4>
                <p className="text-sm text-slate-500">
                  Học viên <span className="font-extrabold text-blue-600">{fullName.trim()}</span> đã được thêm vào lớp <span className="font-bold">{className || 'Chưa xếp lớp'}</span>.
                </p>
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

              {/* Họ và tên */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Bùi Trần Sơn Hải"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setConfirmStep(false); }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-semibold"
                  autoFocus
                />
                {fullName.trim() && (
                  <p className="text-[10px] text-blue-600 font-medium mt-0.5">
                    Tên Việt Anh: <span className="font-bold">{vietAnhName || '—'}</span>
                  </p>
                )}
              </div>

              {/* Tên tiếng Anh + Lớp */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Tên tiếng Anh</label>
                  <input
                    type="text"
                    placeholder="VD: Jack"
                    value={englishName}
                    onChange={(e) => { setEnglishName(e.target.value); setConfirmStep(false); }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Lớp học</label>
                  <select
                    value={className}
                    onChange={(e) => { setClassName(e.target.value); setConfirmStep(false); }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="">— Chưa xếp lớp —</option>
                    {activeClasses.map(cls => (
                      <option key={cls.id} value={cls.name}>
                        {cls.name} {cls.teacher ? `(GV: ${cls.teacher})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Giới tính + Năm sinh */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Giới tính</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Năm sinh</label>
                  <input
                    type="number"
                    value={birthYear}
                    onChange={(e) => setBirthYear(Number(e.target.value))}
                    min="1980"
                    max={new Date().getFullYear()}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* SĐT + Học phí */}
              <div className="grid grid-cols-2 gap-4">
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                  />
                  {parentPhone && !validatePhone(parentPhone) && (
                    <p className="text-[10px] text-red-500 font-bold mt-0.5">SĐT phải có 10 số, bắt đầu bằng 0</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Học phí / buổi (₫)</label>
                  <input
                    type="text"
                    placeholder="VD: 87500"
                    value={feePerSession ? Number(feePerSession).toLocaleString('en-US') : ''}
                    onChange={handleFeeChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono text-right"
                  />
                  {feeNumeric > 0 && (
                    <p className="text-[10px] text-blue-600 font-bold mt-0.5 text-right font-mono">
                      = {feeNumeric.toLocaleString('vi-VN')} ₫/buổi
                    </p>
                  )}
                </div>
              </div>

              {/* Submit */}
              {!confirmStep ? (
                <button
                  type="button"
                  onClick={handleValidate}
                  className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  Kiểm tra & Xác nhận
                </button>
              ) : (
                <div className="mt-2 space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2 text-xs">
                    <p className="font-bold text-blue-800 text-sm">✅ Xác nhận thêm học viên:</p>
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <span className="font-medium">Họ tên:</span>
                      <span className="font-bold">{fullName.trim()}</span>
                      <span className="font-medium">Tên Việt Anh:</span>
                      <span className="font-bold">{vietAnhName}</span>
                      <span className="font-medium">Lớp:</span>
                      <span className="font-bold">{className || 'Chưa xếp lớp'}</span>
                      <span className="font-medium">Giới tính / Năm sinh:</span>
                      <span className="font-bold">{gender} / {birthYear}</span>
                      <span className="font-medium">SĐT phụ huynh:</span>
                      <span className="font-bold font-mono">{parentPhone}</span>
                      <span className="font-medium">Học phí / buổi:</span>
                      <span className="font-bold font-mono text-blue-700">{feeNumeric > 0 ? `${feeNumeric.toLocaleString('vi-VN')} ₫` : 'Chưa nhập'}</span>
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
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                      Lưu học viên
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
