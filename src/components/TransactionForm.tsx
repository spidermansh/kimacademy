import React, { useState } from 'react';
import { PaymentMethod, StudyType, RevenueCategory } from '../types';
import { CheckCircle2 } from 'lucide-react';

interface TransactionFormProps {
  onSubmit: (data: any) => void;
}

export default function TransactionForm({ onSubmit }: TransactionFormProps) {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentName, setStudentName] = useState('');
  const [className, setClassName] = useState('');
  const [revenueCategory, setRevenueCategory] = useState<RevenueCategory>('Học phí offline');
  
  const generateTerm = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return `Tháng ${parts[1]}/${parts[0]}`;
  };
  
  const [term, setTerm] = useState(() => generateTerm(new Date().toISOString().split('T')[0]));
  const [amountString, setAmountString] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Chuyển khoản');
  const [senderName, setSenderName] = useState('');
  const [notes, setNotes] = useState('');

  const [showSuccess, setShowSuccess] = useState(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setAmountString('');
      return;
    }
    const formatted = new Intl.NumberFormat('en-US').format(parseInt(rawValue, 10));
    setAmountString(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNumeric = parseInt(amountString.replace(/\D/g, ''), 10);
    if (!studentName || isNaN(amountNumeric)) return;

    onSubmit({
      paymentDate,
      studentName,
      className,
      term,
      amount: amountNumeric,
      paymentMethod,
      revenueCategory,
      senderName: paymentMethod === 'Chuyển khoản' ? senderName : '',
      notes,
    });

    // Reset some fields but keep date and class for convenience
    setStudentName('');
    setAmountString('');
    setSenderName('');
    setNotes('');
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
          Nhập Khoản Thu Mới
        </h2>
        {showSuccess && (
          <span className="flex items-center text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Đã lưu thành công
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Ngày thu</label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => {
                setPaymentDate(e.target.value);
                setTerm(generateTerm(e.target.value));
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tên học viên</label>
            <input
              type="text"
              required
              placeholder="VD: Nguyễn Văn A"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Lớp học</label>
            <input
              type="text"
              placeholder="VD: IELTS 6.5"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Kỳ học / Tháng</label>
            <input
              type="text"
              placeholder="VD: Tháng 10/2023"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Nội dung thu</label>
            <select
              value={revenueCategory}
              onChange={(e) => setRevenueCategory(e.target.value as RevenueCategory)}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-700 bg-white"
            >
              <option value="Học phí offline">Học phí offline</option>
              <option value="Học phí online">Học phí online</option>
              <option value="Sách">Sách</option>
              <option value="Đồng phục">Đồng phục</option>
              <option value="Lệ phí thi">Lệ phí thi</option>
              <option value="Thu khác">Thu khác</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Số tiền (VNĐ)</label>
            <input
              type="text"
              required
              placeholder="0"
              value={amountString}
              onChange={handleAmountChange}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-mono text-right"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Hình thức thu</label>
            <div className="grid grid-cols-2 gap-2 h-[38px]">
              <button
                type="button"
                onClick={() => setPaymentMethod('Tiền mặt')}
                className={`py-2 px-3 border rounded text-xs font-bold transition-colors ${
                  paymentMethod === 'Tiền mặt' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                Tiền mặt
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('Chuyển khoản')}
                className={`py-2 px-3 border rounded text-xs font-bold transition-colors ${
                  paymentMethod === 'Chuyển khoản' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                Chuyển khoản
              </button>
            </div>
          </div>

          {paymentMethod === 'Chuyển khoản' && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Người chuyển khoản</label>
              <input
                type="text"
                placeholder="Tên (nếu khác học viên)"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
              />
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Nội dung ghi chú</label>
          <input
            type="text"
            placeholder="Ghi chú thêm..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded shadow-lg shadow-indigo-200 transition-colors text-sm"
          >
            Lưu Khoản Thu
          </button>
        </div>
      </form>
    </div>
  );
}
