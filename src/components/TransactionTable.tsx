import React, { useState } from 'react';
import { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { Check, CheckCircle, Circle, FileText, Share, Receipt } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  onToggleReconciled: (id: string, currentStatus: boolean) => void;
  onToggleInvoiced: (id: string, currentStatus: boolean) => void;
  onDeleteTransaction: (id: string) => void;
  onGenerateReport: () => void;
  userRole?: string;
}

export default function TransactionTable({
  transactions,
  onToggleReconciled,
  onToggleInvoiced,
  onDeleteTransaction,
  onGenerateReport,
  userRole = 'staff'
}: TransactionTableProps) {
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const filteredTransactions = transactions
    .filter(t => t.paymentDate === filterDate)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const reconciledCount = filteredTransactions.filter(t => t.isReconciled).length;
  const invoicedCount = filteredTransactions.filter(t => t.isInvoiced).length;

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-[11px] font-bold text-slate-800 uppercase flex items-center gap-2 tracking-wide">
            <svg className="w-3 h-3 text-indigo-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"></path></svg>
            Sổ Quỹ & Đối Chiếu
          </h2>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
          />
          <button
            onClick={onGenerateReport}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-sm font-bold shadow-lg shadow-indigo-200 transition-colors whitespace-nowrap"
          >
            <Share className="w-4 h-4" />
            Báo cáo Kế toán
          </button>
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
              <th scope="col" className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest"></th>
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
                    {userRole === 'admin' && (
                      confirmDeleteId === t.id ? (
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => onDeleteTransaction(t.id)} className="text-red-600 font-bold hover:underline">Xác nhận</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-slate-500 hover:underline">Hủy</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(t.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Xóa
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
