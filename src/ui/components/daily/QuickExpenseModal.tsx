import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { AppSettings } from '../../../shared/types';
import { api, formatDate } from '../../../shared/utils';

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings | null;
  currentUser: { username: string; name: string; role: string };
  onSuccess: () => void;
}

const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  'Mặt bằng': 'Tiền thuê mặt bằng tháng...',
  'Điện nước': 'Tiền điện nước tháng...',
  'Internet': 'Phí internet tháng...',
  'Dụng cụ học tập': 'Mua sách/bảng/bút...',
  'Marketing/Quảng cáo': 'Chi phí quảng cáo Facebook/Zalo...',
  'Bảo trì/Sửa chữa': 'Sửa điều hòa/máy chiếu...',
  'Đối ngoại': 'Quà tặng/tiếp khách...',
  'Văn phòng phẩm': 'Mua giấy/mực in/kẹp...',
  'Quỹ hoạt động': 'Chi phí tổ chức sự kiện...',
  'Chi khác': 'Mô tả khoản chi...',
};

export default function QuickExpenseModal({
  isOpen,
  onClose,
  settings,
  currentUser,
  onSuccess
}: QuickExpenseModalProps) {
  const categories = useMemo(() =>
    settings?.expenseCategories || [
      'Mặt bằng', 'Điện nước', 'Internet', 'Dụng cụ học tập',
      'Marketing/Quảng cáo', 'Bảo trì/Sửa chữa', 'Đối ngoại',
      'Văn phòng phẩm', 'Quỹ hoạt động', 'Chi khác',
    ],
    [settings]
  );

  const paymentMethods = useMemo(() =>
    settings?.paymentMethods || ['Tiền mặt', 'Chuyển khoản', 'Momo', 'ZaloPay'],
    [settings]
  );

  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Tiền mặt');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCategory(categories[0] || '');
      setDescription('');
      setAmount('');
      setPaymentMethod(paymentMethods[0] || 'Tiền mặt');
      setNotes('');
      setError('');
      setConfirmStep(false);
      setSuccess(false);
    }
  }, [isOpen, categories, paymentMethods]);

  const numericAmount = Number(amount);
  const isLargeExpense = numericAmount >= 10000000;

  const placeholderDesc = CATEGORY_PLACEHOLDERS[category] || 'Mô tả khoản chi...';

  const handleValidate = () => {
    if (!category) {
      setError('Vui lòng chọn danh mục chi');
      return;
    }
    if (!description.trim()) {
      setError('Vui lòng nhập mô tả khoản chi');
      return;
    }
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Số tiền phải lớn hơn 0');
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
      await api.createExpense({
        date: todayStr,
        category,
        description: description.trim(),
        amount: numericAmount,
        paymentMethod,
        notes: notes.trim(),
        createdBy: currentUser.name,
      });

      setSuccess(true);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu khoản chi. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-red-800 to-rose-800 text-white">
          <h3 className="text-base font-bold flex items-center gap-2">
            🧾 Thêm khoản chi nhanh
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-rose-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
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
                <h4 className="text-lg font-black text-slate-800">Ghi nhận khoản chi thành công!</h4>
                <p className="text-sm text-slate-500">
                  Khoản chi <span className="font-bold text-red-600">{numericAmount.toLocaleString('vi-VN')} ₫</span> — <span className="font-bold">{category}</span> đã được ghi nhận.
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

              {/* Danh mục + Số tiền */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">
                    Danh mục chi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => { setCategory(e.target.value); setConfirmStep(false); }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">
                    Số tiền (₫) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="VD: 5000000"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setConfirmStep(false); }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                  {numericAmount > 0 && (
                    <p className="text-[10px] text-red-600 font-bold mt-0.5 font-mono">
                      = {numericAmount.toLocaleString('vi-VN')} ₫
                    </p>
                  )}
                </div>
              </div>

              {/* Cảnh báo khoản chi lớn */}
              {isLargeExpense && (
                <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>⚠️ Khoản chi lớn (≥ 10 triệu). Hãy kiểm tra kỹ trước khi xác nhận.</span>
                </div>
              )}

              {/* Mô tả */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">
                  Mô tả <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={placeholderDesc}
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setConfirmStep(false); }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                />
              </div>

              {/* Hình thức TT + Ghi chú */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Hình thức thanh toán</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => { setPaymentMethod(e.target.value); setConfirmStep(false); }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                  >
                    {paymentMethods.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Ghi chú</label>
                  <input
                    type="text"
                    placeholder="Ghi chú thêm..."
                    value={notes}
                    onChange={(e) => { setNotes(e.target.value); setConfirmStep(false); }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Submit */}
              {!confirmStep ? (
                <button
                  type="button"
                  onClick={handleValidate}
                  className="w-full py-3 mt-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  Kiểm tra & Xác nhận
                </button>
              ) : (
                <div className="mt-2 space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2 text-xs">
                    <p className="font-bold text-red-800 text-sm">✅ Xác nhận khoản chi:</p>
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <span className="font-medium">Ngày:</span>
                      <span className="font-bold">{formatDate(new Date().toISOString())}</span>
                      <span className="font-medium">Danh mục:</span>
                      <span className="font-bold">{category}</span>
                      <span className="font-medium">Mô tả:</span>
                      <span className="font-bold">{description.trim()}</span>
                      <span className="font-medium">Số tiền:</span>
                      <span className="font-bold text-red-700 font-mono">{numericAmount.toLocaleString('vi-VN')} ₫</span>
                      <span className="font-medium">Hình thức:</span>
                      <span className="font-bold">{paymentMethod}</span>
                      <span className="font-medium">Người nhập:</span>
                      <span className="font-bold">{currentUser.name}</span>
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
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                      Xác nhận chi
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
