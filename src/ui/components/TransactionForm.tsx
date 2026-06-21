import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PaymentMethod, StudyType, RevenueCategory } from '../../shared/types';
import { CheckCircle2, Search, User, X, AlertTriangle, ChevronDown } from 'lucide-react';
import DateInput from './ui/DateInput';

interface TransactionFormProps {
  onSubmit: (data: any) => void;
  students?: any[];
  classes?: any[];
  feeTypes?: string[]; // Danh mục loại khoản thu từ Settings
  paymentMethods?: string[]; // Hình thức thanh toán từ Settings
}

const DEFAULT_FEE_TYPES = ['Học phí offline', 'Lệ phí thi', 'Thu khác'];
const DEFAULT_PAYMENT_METHODS = ['Chuyển khoản', 'Tiền mặt', 'Momo', 'ZaloPay', 'Khác'];

export default function TransactionForm({
  onSubmit, students = [], classes = [],
  feeTypes = DEFAULT_FEE_TYPES,
  paymentMethods = DEFAULT_PAYMENT_METHODS,
}: TransactionFormProps) {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [selectedEnglishName, setSelectedEnglishName] = useState('');
  const [className, setClassName] = useState('');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [revenueCategory, setRevenueCategory] = useState<RevenueCategory>(feeTypes[0] || 'Học phí offline');
  
  const generateTerm = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return `Tháng ${parts[1]}/${parts[0]}`;
  };
  
  const [term, setTerm] = useState(() => generateTerm(new Date().toISOString().split('T')[0]));
  const [amountString, setAmountString] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(paymentMethods[0] || 'Chuyển khoản');
  const [senderName, setSenderName] = useState('');
  const [notes, setNotes] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // ── Student search state ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filtered students based on search query (supports Vietnamese without diacritics + English name)
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    const qNoDiacritics = removeDiacritics(q);
    return students.filter(s => {
      const name = s.name.toLowerCase();
      const nameNoDiacritics = removeDiacritics(name);
      return (
        name.includes(q) ||
        nameNoDiacritics.includes(qNoDiacritics) ||
        s.englishName?.toLowerCase().includes(q) ||
        s.vietAnhName?.toLowerCase().includes(q) ||
        removeDiacritics(s.vietAnhName || '').toLowerCase().includes(qNoDiacritics) ||
        s.vietnameseName?.toLowerCase().includes(q) ||
        removeDiacritics(s.vietnameseName || '').toLowerCase().includes(qNoDiacritics) ||
        (s.classNames?.some((c: string) => c.toLowerCase().includes(q)) || s.className?.toLowerCase().includes(q)) ||
        (s.classNames?.some((c: string) => removeDiacritics(c).toLowerCase().includes(qNoDiacritics)) || removeDiacritics(s.className || '').toLowerCase().includes(qNoDiacritics)) ||
        s.phone?.includes(q)
      );
    });
  }, [students, searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectStudent = (student: typeof students[number]) => {
    setSelectedStudentId(student.id);
    setStudentName(student.name);
    setSelectedEnglishName(student.englishName || '');
    setSearchQuery('');
    setIsDropdownOpen(false);
    
    const activeEnrs = student.activeEnrollments || [];
    if (activeEnrs.length > 0) {
      const matching = student.className ? activeEnrs.find((e: any) => e.className === student.className) : null;
      if (matching) {
        setEnrollmentId(matching.id);
        setClassName(matching.className);
      } else {
        setEnrollmentId(activeEnrs[0].id);
        setClassName(activeEnrs[0].className);
      }
    } else {
      setEnrollmentId('');
      if (student.className) {
        setClassName(student.className);
      }
    }
  };

  const handleClearStudent = () => {
    setSelectedStudentId('');
    setStudentName('');
    setSelectedEnglishName('');
    setClassName('');
    setEnrollmentId('');
    setSearchQuery('');
  };

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
    if (!selectedStudentId || !studentName || isNaN(amountNumeric)) return;

    onSubmit({
      paymentDate,
      studentId: selectedStudentId,
      studentName,
      className,
      enrollmentId: enrollmentId || undefined,
      term,
      amount: amountNumeric,
      paymentMethod,
      revenueCategory,
      senderName: paymentMethod === 'Chuyển khoản' ? senderName : '',
      notes,
      studyType: 'Trực tiếp',
    });

    // Reset fields but keep date for convenience
    handleClearStudent();
    setAmountString('');
    setSenderName('');
    setNotes('');
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Group students by class for organized display
  const groupedStudents = useMemo(() => {
    const groups: Record<string, typeof students> = {};
    filteredStudents.forEach(s => {
      const key = s.className || 'Chưa có lớp';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return groups;
  }, [filteredStudents]);

  const hasStudents = students.length > 0;

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
            <DateInput
              value={paymentDate}
              onChange={(v) => {
                setPaymentDate(v);
                setTerm(generateTerm(v));
              }}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm flex items-center justify-between"
            />
          </div>

          {/* ── Smart Student Selector ─────────────────────────────────────── */}
          <div ref={dropdownRef} className="relative">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              Tên học viên <span className="text-red-400">*</span>
            </label>

            {selectedStudentId ? (
              /* Selected student chip */
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
                <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">{studentName.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {studentName}
                    {selectedEnglishName && (
                      <span className="text-xs text-indigo-500 font-normal ml-1">({selectedEnglishName})</span>
                    )}
                  </p>
                  {className && <p className="text-[10px] text-indigo-500">{className}</p>}
                </div>
                <button
                  type="button"
                  onClick={handleClearStudent}
                  className="p-1 rounded-full hover:bg-indigo-100 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                  title="Đổi học viên"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Search input */
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={hasStudents ? "Tìm theo tên, lớp, SĐT..." : "Chưa có học viên nào"}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    disabled={!hasStudents}
                    className={`w-full pl-9 pr-8 py-2 border rounded-lg text-sm outline-none transition-all ${
                      hasStudents
                        ? 'border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                        : 'border-amber-300 bg-amber-50 text-amber-600 cursor-not-allowed'
                    }`}
                  />
                  {hasStudents && (
                    <ChevronDown
                      className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  )}
                </div>

                {/* Warning: No students */}
                {!hasStudents && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-amber-600">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Vui lòng thêm học viên ở tab <strong>Học viên</strong> trước!</span>
                  </div>
                )}

                {/* Dropdown results */}
                {isDropdownOpen && hasStudents && (
                  <div
                    className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-[280px] overflow-y-auto"
                    style={{ animation: 'slideDown 0.1s ease-out' }}
                  >
                    {filteredStudents.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <User className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-xs text-slate-400">Không tìm thấy "<strong>{searchQuery}</strong>"</p>
                        <p className="text-[10px] text-slate-300 mt-1">Kiểm tra lại hoặc thêm học viên ở tab Học viên</p>
                      </div>
                    ) : (
                      Object.entries(groupedStudents).map(([cls, studs]: [string, typeof students]) => (
                        <div key={cls}>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-2 pb-1 bg-slate-50 border-b border-slate-100 sticky top-0">
                            {cls} ({studs.length})
                          </p>
                          {studs.map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => handleSelectStudent(s)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-50 transition-colors text-left cursor-pointer"
                            >
                              <div className="w-7 h-7 bg-gradient-to-br from-indigo-400 to-violet-500 rounded-full flex items-center justify-center shrink-0">
                                <span className="text-white text-xs font-bold">{s.name.charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">
                                  {searchQuery ? highlightMatch(s.name, searchQuery) : s.name}
                                  {s.englishName && (
                                    <span className="text-xs text-indigo-400 font-normal ml-1.5">
                                      ({searchQuery ? highlightMatch(s.englishName, searchQuery) : s.englishName})
                                    </span>
                                  )}
                                </p>
                                {s.phone && (
                                  <p className="text-[10px] text-slate-400">{s.phone}</p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Lớp học</label>
            {selectedStudentId && (students.find(s => s.id === selectedStudentId)?.activeEnrollments || []).length > 0 ? (
              <select
                value={enrollmentId}
                onChange={(e) => {
                  const enrId = e.target.value;
                  setEnrollmentId(enrId);
                  const student = students.find(s => s.id === selectedStudentId);
                  const matching = (student?.activeEnrollments || []).find((e: any) => e.id === enrId);
                  if (matching) {
                    setClassName(matching.className);
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-700 bg-white font-medium cursor-pointer"
              >
                {(students.find(s => s.id === selectedStudentId)?.activeEnrollments || []).map((enr: any) => (
                  <option key={enr.id} value={enr.id}>
                    {enr.className}
                  </option>
                ))}
              </select>
            ) : classes.length > 0 ? (
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-700 bg-white"
              >
                <option value="">-- Chọn lớp --</option>
                {classes.filter(cls => cls.type !== 'online').map((cls) => (
                  <option key={cls.id} value={cls.name}>
                    {cls.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="VD: IELTS 6.5 (chưa có lớp nào)"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
              />
            )}
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
              {feeTypes.filter(ft => ft !== 'Học phí online').map(ft => (
                <option key={ft} value={ft}>{ft}</option>
              ))}
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
            <div className="flex flex-wrap gap-2 min-h-[38px]">
              {paymentMethods.map(pm => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={`py-1.5 px-3 border rounded text-xs font-bold transition-colors ${
                    paymentMethod === pm
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {pm}
                </button>
              ))}
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
            disabled={!selectedStudentId}
            className={`w-full font-bold py-2.5 px-4 rounded shadow-lg transition-colors text-sm ${
              selectedStudentId
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            {selectedStudentId ? 'Lưu Khoản Thu' : 'Vui lòng chọn học viên'}
          </button>
        </div>
      </form>

      {/* Hướng dẫn quy trình */}
      <div className="mt-6 bg-slate-50 rounded-lg p-4 border border-slate-100">
        <p className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
          <span className="text-indigo-500">ℹ️</span> Hướng dẫn quy trình
        </p>
        <ol className="text-[11px] text-slate-500 mt-2 space-y-1 list-decimal list-inside">
          <li><strong>Thêm học viên:</strong> Vào tab Học viên → Thêm hồ sơ trước.</li>
          <li><strong>Nhập liệu:</strong> NVVP nhập khoản thu khi có biến động.</li>
          <li>Đối chiếu: Đánh dấu ✓ sau khi khớp số liệu.</li>
          <li>Báo cáo: Gửi Kế toán trước 21h.</li>
          <li>Xuất HĐ: Kế toán đánh dấu hoàn tất.</li>
        </ol>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Helper: remove Vietnamese diacritics ─────────────────────────────────────
function removeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// ── Helper: highlight search match in text (supports diacritics-free) ────────
function highlightMatch(text: string, query: string) {
  if (!query) return text;
  // Try exact match first
  let idx = text.toLowerCase().indexOf(query.toLowerCase());
  // Fallback to diacritics-free match
  if (idx === -1) {
    idx = removeDiacritics(text.toLowerCase()).indexOf(removeDiacritics(query.toLowerCase()));
  }
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-200 text-amber-900 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}
