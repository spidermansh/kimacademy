import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface StudentRegisterModalProps {
  studentName: string;
  className: string;
  onSave: (studentData: any) => void;
  onClose: () => void;
}

export default function StudentRegisterModal({
  studentName,
  className: initialClassName,
  onSave,
  onClose
}: StudentRegisterModalProps) {
  const [fullName, setFullName] = useState(studentName);
  
  // Heuristic to extract Vietnamese Name: take the last 2 words
  const extractVietnameseName = (name: string): string => {
    const clean = name.trim();
    if (!clean) return '';
    const parts = clean.split(/\s+/);
    if (parts.length <= 2) return clean;
    return parts.slice(-2).join(' ');
  };

  const [vietnameseName, setVietnameseName] = useState(() => extractVietnameseName(studentName));
  const [englishName, setEnglishName] = useState('');
  const [className, setClassName] = useState(initialClassName);
  const [gender, setGender] = useState('Nam');
  const [birthYear, setBirthYear] = useState(new Date().getFullYear() - 10); // Default to ~10 years ago
  const [parentPhone, setParentPhone] = useState('');

  // Update Vietnamese name automatically when full name changes (if not customized manually)
  const [isVietNameManual, setIsVietNameManual] = useState(false);
  useEffect(() => {
    if (!isVietNameManual) {
      setVietnameseName(extractVietnameseName(fullName));
    }
  }, [fullName, isVietNameManual]);

  // Compute Viet Anh name in real-time
  const vietAnhName = englishName.trim()
    ? `${vietnameseName.trim()} - ${englishName.trim()}`
    : vietnameseName.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !vietnameseName.trim()) {
      alert('Vui lòng điền Họ và tên và Tên tiếng Việt.');
      return;
    }
    
    onSave({
      name: fullName.trim(),
      vietnameseName: vietnameseName.trim(),
      englishName: englishName.trim(),
      vietAnhName: vietAnhName.trim(),
      className: className.trim(),
      gender,
      birthYear: Number(birthYear),
      parentPhone: parentPhone.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-indigo-900 text-white">
          <div>
            <h2 className="text-base font-bold">Hồ Sơ Học Viên Mới</h2>
            <p className="text-[10px] text-indigo-200 mt-0.5">Phát hiện tên học viên chưa có trong cơ sở dữ liệu</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-indigo-200 hover:text-white hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Họ và tên */}
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-semibold"
                placeholder="VD: Bùi Trần Sơn Hải"
              />
            </div>

            {/* Tên tiếng Việt */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Tên tiếng Việt <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={vietnameseName}
                onChange={(e) => {
                  setVietnameseName(e.target.value);
                  setIsVietNameManual(true);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                placeholder="VD: Sơn Hải"
              />
            </div>

            {/* Tên tiếng Anh */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Tên tiếng Anh
              </label>
              <input
                type="text"
                value={englishName}
                onChange={(e) => setEnglishName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                placeholder="VD: Jack"
              />
            </div>

            {/* Tên Việt Anh */}
            <div className="col-span-2 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
              <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-1">
                Tên Việt Anh (Tự động)
              </label>
              <div className="text-sm font-black text-indigo-900 font-sans">
                {vietAnhName || 'Chưa xác định'}
              </div>
            </div>

            {/* Lớp học */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Lớp học
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                placeholder="VD: IELTS 7.0"
              />
            </div>

            {/* Giới tính */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Giới tính
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm bg-white"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            {/* Năm sinh */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Năm sinh
              </label>
              <input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(Number(e.target.value))}
                min="1980"
                max={new Date().getFullYear()}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
              />
            </div>

            {/* SĐT/Zalo phụ huynh */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                SĐT / Zalo phụ huynh
              </label>
              <input
                type="text"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-mono"
                placeholder="VD: 0912345678"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-md shadow-indigo-100 transition-all cursor-pointer"
            >
              Lưu & Tiếp tục
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
