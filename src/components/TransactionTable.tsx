import React, { useState } from 'react';
import { Transaction, PaymentMethod, RevenueCategory, AppSettings } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { Check, CheckCircle, Circle, FileText, Share, Receipt, Edit, Clock, X, AlertCircle, Search, Filter, Calendar, Download } from 'lucide-react';
import ReceiptModal from './ReceiptModal';
import * as XLSX from 'xlsx';

interface TransactionTableProps {
  transactions: Transaction[];
  onToggleReconciled: (id: string, currentStatus: boolean) => void;
  onToggleInvoiced: (id: string, currentStatus: boolean) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateTransaction?: (id: string, updates: any) => Promise<any>;
  onGenerateReport: () => void;
  userRole?: string;
  students?: { id: string; name: string; className: string }[];
  classes?: { id: string; name: string; type: string }[];
  feeTypes?: string[];
  paymentMethods?: string[];
  settings?: AppSettings | null;
}

const FIELD_TRANSLATIONS: Record<string, string> = {
  paymentDate: 'Ngày thu',
  studentName: 'Tên học viên',
  className: 'Lớp học',
  term: 'Kỳ học / Tháng',
  amount: 'Số tiền',
  paymentMethod: 'Hình thức thu',
  revenueCategory: 'Nội dung thu',
  senderName: 'Người chuyển khoản',
  notes: 'Ghi chú'
};

const DEFAULT_FEE_TYPES = ['Học phí offline', 'Học phí online', 'Sách', 'Đồng phục', 'Lệ phí thi', 'Thu khác'];
const DEFAULT_PAYMENT_METHODS = ['Chuyển khoản', 'Tiền mặt', 'Momo', 'ZaloPay', 'Khác'];

export default function TransactionTable({
  transactions,
  onToggleReconciled,
  onToggleInvoiced,
  onDeleteTransaction,
  onUpdateTransaction,
  onGenerateReport,
  userRole = 'staff',
  students = [],
  classes = [],
  feeTypes = DEFAULT_FEE_TYPES,
  paymentMethods = DEFAULT_PAYMENT_METHODS,
  settings = null
}: TransactionTableProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // States for search and advanced filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [filterReconciled, setFilterReconciled] = useState('all');
  const [filterInvoiced, setFilterInvoiced] = useState('all');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [enableDateFilter, setEnableDateFilter] = useState(true);

  // State for receipt modal
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);

  // States for editing modal
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState<{
    paymentDate: string;
    studentName: string;
    className: string;
    term: string;
    revenueCategory: string;
    amountString: string;
    paymentMethod: string;
    senderName: string;
    notes: string;
  } | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const filteredTransactions = transactions
    .filter(t => {
      // 1. Date Filter
      if (enableDateFilter) {
        if (t.paymentDate < startDate || t.paymentDate > endDate) {
          return false;
        }
      }
      
      // 2. Search Query (realtime search)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const studentMatch = t.studentName.toLowerCase().includes(query);
        const classMatch = t.className.toLowerCase().includes(query);
        const senderMatch = t.senderName ? t.senderName.toLowerCase().includes(query) : false;
        const notesMatch = t.notes ? t.notes.toLowerCase().includes(query) : false;
        const categoryMatch = t.revenueCategory.toLowerCase().includes(query);
        
        if (!studentMatch && !classMatch && !senderMatch && !notesMatch && !categoryMatch) {
          return false;
        }
      }

      // 3. Category Filter
      if (filterCategory !== 'all' && t.revenueCategory !== filterCategory) {
        return false;
      }

      // 4. Payment Method Filter
      if (filterPaymentMethod !== 'all' && t.paymentMethod !== filterPaymentMethod) {
        return false;
      }

      // 5. Reconciled Filter
      if (filterReconciled !== 'all') {
        const isReconciledBool = filterReconciled === 'yes';
        if (t.isReconciled !== isReconciledBool) {
          return false;
        }
      }

      // 6. Invoiced Filter
      if (filterInvoiced !== 'all') {
        const isInvoicedBool = filterInvoiced === 'yes';
        if (t.isInvoiced !== isInvoicedBool) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const reconciledCount = filteredTransactions.filter(t => t.isReconciled).length;
  const invoicedCount = filteredTransactions.filter(t => t.isInvoiced).length;

  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) return;

    const rows = filteredTransactions.map((t, i) => ({
      'STT': i + 1,
      'Ngày thu': t.paymentDate,
      'Học viên': t.studentName,
      'Lớp': t.className,
      'Kỳ học / Tháng': t.term || '',
      'Nội dung thu': t.revenueCategory,
      'Số tiền': t.amount,
      'Hình thức': t.paymentMethod,
      'Người CK': t.senderName || '',
      'Ghi chú': t.notes || '',
      'Đối chiếu': t.isReconciled ? 'Đã khớp' : 'Chưa',
      'Hóa đơn': t.isInvoiced ? 'Đã xuất' : 'Chưa',
    }));

    // Add summary row
    rows.push({
      'STT': '' as any,
      'Ngày thu': '',
      'Học viên': '',
      'Lớp': '',
      'Kỳ học / Tháng': '',
      'Nội dung thu': 'TỔNG CỘNG',
      'Số tiền': totalAmount,
      'Hình thức': '',
      'Người CK': '',
      'Ghi chú': `${filteredTransactions.length} giao dịch`,
      'Đối chiếu': '',
      'Hóa đơn': '',
    });

    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },  // STT
      { wch: 12 }, // Ngày thu
      { wch: 20 }, // Học viên
      { wch: 15 }, // Lớp
      { wch: 15 }, // Kỳ học
      { wch: 18 }, // Nội dung thu
      { wch: 15 }, // Số tiền
      { wch: 14 }, // Hình thức
      { wch: 16 }, // Người CK
      { wch: 20 }, // Ghi chú
      { wch: 10 }, // Đối chiếu
      { wch: 10 }, // Hóa đơn
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Giao dịch');

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filterInfo = enableDateFilter ? `_${startDate}_${endDate}` : '_TatCa';
    XLSX.writeFile(wb, `GiaoDich${filterInfo}_${dateStr}.xlsx`);
  };


  const handleStartEdit = (t: Transaction) => {
    setEditingTx(t);
    setEditForm({
      paymentDate: t.paymentDate,
      studentName: t.studentName,
      className: t.className,
      term: t.term,
      revenueCategory: t.revenueCategory,
      amountString: new Intl.NumberFormat('en-US').format(t.amount),
      paymentMethod: t.paymentMethod,
      senderName: t.senderName || '',
      notes: t.notes || ''
    });
  };

  const handleEditAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editForm) return;
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setEditForm(prev => prev ? { ...prev, amountString: '' } : null);
      return;
    }
    const formatted = new Intl.NumberFormat('en-US').format(parseInt(rawValue, 10));
    setEditForm(prev => prev ? { ...prev, amountString: formatted } : null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx || !editForm || !onUpdateTransaction) return;

    const amountNumeric = parseInt(editForm.amountString.replace(/\D/g, ''), 10);
    if (!editForm.studentName || isNaN(amountNumeric)) return;

    setIsSubmittingEdit(true);
    try {
      const updated = await onUpdateTransaction(editingTx.id, {
        paymentDate: editForm.paymentDate,
        studentName: editForm.studentName,
        className: editForm.className,
        term: editForm.term,
        revenueCategory: editForm.revenueCategory,
        amount: amountNumeric,
        paymentMethod: editForm.paymentMethod,
        senderName: editForm.paymentMethod === 'Chuyển khoản' ? editForm.senderName : '',
        notes: editForm.notes
      });
      if (updated) {
        setEditingTx(updated);
        setEditForm({
          paymentDate: updated.paymentDate,
          studentName: updated.studentName,
          className: updated.className,
          term: updated.term,
          revenueCategory: updated.revenueCategory,
          amountString: new Intl.NumberFormat('en-US').format(updated.amount),
          paymentMethod: updated.paymentMethod,
          senderName: updated.senderName || '',
          notes: updated.notes || ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-[11px] font-bold text-slate-800 uppercase flex items-center gap-2 tracking-wide">
            <svg className="w-3 h-3 text-indigo-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"></path></svg>
            Sổ Quỹ & Đối Chiếu
          </h2>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={handleExportExcel}
            disabled={filteredTransactions.length === 0}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded text-sm font-bold shadow-lg shadow-emerald-200 transition-colors whitespace-nowrap"
            title="Xuất danh sách giao dịch đang hiển thị ra file Excel"
          >
            <Download className="w-4 h-4" />
            Xuất Excel ({filteredTransactions.length})
          </button>
          <button
            onClick={onGenerateReport}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-sm font-bold shadow-lg shadow-indigo-200 transition-colors whitespace-nowrap"
          >
            <Share className="w-4 h-4" />
            Báo cáo Kế toán
          </button>
        </div>
      </div>

      {/* ══ SEARCH & FILTER BAR ══════════════════════════════════════════ */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 space-y-4">
        {/* Row 1: Search & Date Range Toggle */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo học viên, lớp, người chuyển, ghi chú..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-slate-450 hover:text-slate-650 text-xs font-semibold"
              >
                Xóa
              </button>
            )}
          </div>

          {/* Date range filter enablement */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-300 rounded-lg shrink-0">
            <input
              type="checkbox"
              id="enable-date-filter"
              checked={enableDateFilter}
              onChange={(e) => setEnableDateFilter(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-slate-350 rounded focus:ring-indigo-500"
            />
            <label htmlFor="enable-date-filter" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">
              Lọc theo ngày
            </label>
          </div>
        </div>

        {/* Row 2: Advanced filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {/* Start Date */}
          <div className={`${enableDateFilter ? 'opacity-100' : 'opacity-40 pointer-events-none'} transition-opacity flex flex-col`}>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Từ ngày</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs outline-none bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* End Date */}
          <div className={`${enableDateFilter ? 'opacity-100' : 'opacity-40 pointer-events-none'} transition-opacity flex flex-col`}>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Đến ngày</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs outline-none bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex flex-col">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Khoản thu</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs outline-none bg-white focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="all">Tất cả các khoản</option>
              {feeTypes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Payment Method Dropdown */}
          <div className="flex flex-col">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Hình thức</label>
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs outline-none bg-white focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="all">Tất cả hình thức</option>
              {paymentMethods.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Reconciled / Invoiced Dropdowns */}
          <div className="flex flex-col col-span-2 sm:col-span-1 grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Đối chiếu</label>
              <select
                value={filterReconciled}
                onChange={(e) => setFilterReconciled(e.target.value)}
                className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs outline-none bg-white focus:ring-2 focus:ring-indigo-500 text-slate-700"
              >
                <option value="all">Tất cả</option>
                <option value="yes">Đã khớp</option>
                <option value="no">Chưa khớp</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Hóa đơn</label>
              <select
                value={filterInvoiced}
                onChange={(e) => setFilterInvoiced(e.target.value)}
                className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs outline-none bg-white focus:ring-2 focus:ring-indigo-500 text-slate-700"
              >
                <option value="all">Tất cả</option>
                <option value="yes">Đã xuất</option>
                <option value="no">Chưa xuất</option>
              </select>
            </div>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-4 relative">
          <div className="absolute -top-3 left-4 px-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Tổng thu
          </div>
          <p className="text-2xl font-black text-indigo-900 mt-2">{formatCurrency(totalAmount)}</p>
          <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">{filteredTransactions.length} giao dịch</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Đã đối chiếu (NVVP)</p>
          <p className="text-2xl font-bold text-emerald-900">{reconciledCount} / {filteredTransactions.length}</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
          <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-1">Đã xuất HĐ (Kế toán)</p>
          <p className="text-2xl font-bold text-purple-900">{invoicedCount} / {filteredTransactions.length}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Học viên / Lớp</th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chi tiết THU</th>
              <th scope="col" className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Số tiền</th>
              <th scope="col" className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">NVVP Đối chiếu</th>
              <th scope="col" className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">KT Xuất HĐ</th>
              <th scope="col" className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm italic">
                  Không có khoản thu nào trong ngày này.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-semibold text-slate-800">{t.studentName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{t.className}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-800">{t.revenueCategory}</div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[200px] mt-0.5" title={t.notes || t.senderName}>
                      {t.term && <span className="font-bold text-slate-600 mr-1">[{t.term}]</span>}
                      {t.paymentMethod} {t.senderName && <span className="mr-1 italic">Từ: {t.senderName}</span>}
                      {t.notes && <span className="ml-1">- {t.notes}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-indigo-700">
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <button 
                      onClick={() => onToggleReconciled(t.id, t.isReconciled)}
                      className={`inline-flex items-center justify-center w-8 h-8 rounded transition-colors ${
                        t.isReconciled 
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200'
                      }`}
                      title="NVVP Xác nhận đối chiếu (Bước 4)"
                    >
                      {t.isReconciled ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <button 
                      onClick={() => onToggleInvoiced(t.id, t.isInvoiced)}
                      disabled={userRole !== 'admin'}
                      className={`inline-flex items-center justify-center w-8 h-8 rounded transition-colors ${
                        t.isInvoiced 
                          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200' 
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200'
                      } ${userRole !== 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={userRole === 'admin' ? "Kế toán xác nhận đã xuất hóa đơn (Bước 6)" : "Chỉ Kế toán mới được phép xuất hóa đơn"}
                    >
                      {t.isInvoiced ? <Receipt className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-2 justify-end items-center">
                      <button
                        onClick={() => setReceiptTx(t)}
                        className="text-slate-650 hover:text-slate-900 inline-flex items-center gap-1 border border-slate-200 hover:border-slate-350 px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 transition-colors"
                        title="Xem và in biên lai"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-550" />
                        Biên lai
                      </button>

                      {userRole === 'admin' && (
                        <>
                          <button
                            onClick={() => handleStartEdit(t)}
                            className="text-indigo-600 hover:text-indigo-900 inline-flex items-center gap-1 border border-indigo-200 hover:border-indigo-400 px-2 py-1 rounded bg-indigo-50/50"
                            title="Chỉnh sửa giao dịch"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Sửa
                          </button>

                          {confirmDeleteId === t.id ? (
                            <div className="flex gap-2.5 items-center bg-red-50 border border-red-200 px-2.5 py-1 rounded">
                              <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Xác nhận?</span>
                              <button onClick={() => onDeleteTransaction(t.id)} className="text-red-600 font-bold hover:underline text-xs">Xóa</button>
                              <button onClick={() => setConfirmDeleteId(null)} className="text-slate-500 hover:underline text-xs">Hủy</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(t.id)}
                              className="text-red-500 hover:text-red-800 border border-red-100 hover:border-red-300 px-2 py-1 rounded bg-red-50/30"
                            >
                              Xóa
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ══ EDIT TRANSACTION MODAL ══════════════════════════════════════════ */}
      {editingTx && editForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-5 bg-indigo-600 rounded-full"></span>
                  Chỉnh Sửa Giao Dịch
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {editingTx.id}</p>
              </div>
              <button 
                onClick={() => { setEditingTx(null); setEditForm(null); }}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-5 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Ngày thu</label>
                  <input
                    type="date"
                    required
                    value={editForm.paymentDate}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, paymentDate: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Tên học viên</label>
                  <input
                    type="text"
                    required
                    list="edit-students-list"
                    placeholder="VD: Nguyễn Văn A"
                    value={editForm.studentName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditForm(prev => prev ? { ...prev, studentName: val } : null);
                      const matched = students.find(s => s.name.toLowerCase() === val.toLowerCase().trim());
                      if (matched && matched.className) {
                        setEditForm(prev => prev ? { ...prev, className: matched.className } : null);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  />
                  <datalist id="edit-students-list">
                    {students.map((student) => (
                      <option key={student.id} value={student.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Lớp học</label>
                  {classes.length > 0 ? (
                    <select
                      value={editForm.className}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, className: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-700 bg-white"
                    >
                      <option value="">-- Chọn lớp --</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.name}>
                          {cls.name} ({cls.type === 'offline' ? 'Offline' : 'Online'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="VD: IELTS 6.5"
                      value={editForm.className}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, className: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Kỳ học / Tháng</label>
                  <input
                    type="text"
                    placeholder="VD: Tháng 10/2023"
                    value={editForm.term}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, term: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Nội dung thu</label>
                  <select
                    value={editForm.revenueCategory}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, revenueCategory: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-700 bg-white"
                  >
                    {feeTypes.map(ft => (
                      <option key={ft} value={ft}>{ft}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Số tiền (VNĐ)</label>
                  <input
                    type="text"
                    required
                    placeholder="0"
                    value={editForm.amountString}
                    onChange={handleEditAmountChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-mono text-right font-semibold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Hình thức thu</label>
                  <div className="flex flex-wrap gap-2">
                    {paymentMethods.map(pm => (
                      <button
                        key={pm}
                        type="button"
                        onClick={() => setEditForm(prev => prev ? { ...prev, paymentMethod: pm } : null)}
                        className={`py-1.5 px-3.5 border rounded-lg text-xs font-bold transition-all ${
                          editForm.paymentMethod === pm
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {pm}
                      </button>
                    ))}
                  </div>
                </div>

                {editForm.paymentMethod === 'Chuyển khoản' && (
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Người chuyển khoản</label>
                    <input
                      type="text"
                      placeholder="Tên người chuyển khoản (nếu khác học viên)"
                      value={editForm.senderName}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, senderName: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Ghi chú</label>
                <input
                  type="text"
                  placeholder="Ghi chú thêm..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                />
              </div>

              {/* ══ LỊCH SỬ CHỈNH SỬA (EDIT HISTORY) ══ */}
              {editingTx.editHistory && editingTx.editHistory.length > 0 && (
                <div className="border-t border-slate-100 pt-4 mt-6">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Lịch sử chỉnh sửa ({editingTx.editHistory.length})
                  </h4>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3.5 max-h-[160px] overflow-y-auto">
                    {editingTx.editHistory.map((log, logIdx) => (
                      <div key={logIdx} className="text-xs border-b border-slate-200/50 pb-3 last:border-b-0 last:pb-0">
                        <div className="flex justify-between text-slate-500 font-semibold mb-1">
                          <span>👤 Người sửa: <strong className="text-slate-800">{log.editedBy}</strong></span>
                          <span>🕒 {formatDate(log.editedAt, true)}</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1 mt-1.5">
                          {log.changes.map((change, chIdx) => {
                            const fieldLabel = FIELD_TRANSLATIONS[change.field] || change.field;
                            let oldVal = change.oldValue;
                            let newVal = change.newValue;
                            if (change.field === 'amount') {
                              oldVal = formatCurrency(Number(oldVal));
                              newVal = formatCurrency(Number(newVal));
                            }
                            return (
                              <li key={chIdx} className="leading-relaxed">
                                <span className="font-medium">{fieldLabel}</span>:{' '}
                                <span className="line-through text-red-500 bg-red-50 px-1 rounded">{String(oldVal || 'trống')}</span>
                                <span className="mx-1 text-slate-400">→</span>
                                <span className="text-emerald-700 bg-emerald-50 px-1 rounded font-medium">{String(newVal || 'trống')}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-4 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => { setEditingTx(null); setEditForm(null); }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-sm font-bold transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-100 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmittingEdit ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang lưu...
                    </>
                  ) : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ RECEIPT MODAL ══════════════════════════════════════════════════ */}
      {receiptTx && (
        <ReceiptModal
          transaction={receiptTx}
          settings={settings}
          onClose={() => setReceiptTx(null)}
        />
      )}
    </div>
  );
}
