import React from 'react';
import { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { X, Copy, Check } from 'lucide-react';

interface DailyReportModalProps {
  transactions: Transaction[];
  onClose: () => void;
}

export default function DailyReportModal({ transactions, onClose }: DailyReportModalProps) {
  const [copied, setCopied] = React.useState(false);
  
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const today = new Date().toISOString().split('T')[0];
  
  const todaysTransactions = transactions
    .filter(t => t.paymentDate === today)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalAmount = todaysTransactions.reduce((sum, t) => sum + t.amount, 0);

  const reportContent = `BÁO CÁO THU HỌC PHÍ HẰNG NGÀY - KIM ACADEMY
Ngày: ${formatDate(today)}
----------------------------------------
Tổng số giao dịch: ${todaysTransactions.length}
Tổng tiền thu được: ${formatCurrency(totalAmount)}

DANH SÁCH CHI TIẾT:
${todaysTransactions.map((t, idx) => 
  `${idx + 1}. [${t.className}] ${t.studentName} - ${formatCurrency(t.amount)} (${t.revenueCategory} - ${t.paymentMethod})${t.notes ? ` - Ghi chú: ${t.notes}` : ''}`
).join('\n')}

${todaysTransactions.some(t => !t.isReconciled) ? "\nLƯU Ý: Vẫn còn khoản thu chưa được NVVP đối chiếu!" : "\nTất cả khoản thu đã được NVVP đối chiếu (Bước 4)."}
----------------------------------------
Báo cáo gửi Kế toán xuất hóa đơn (Trước 21:00 hằng ngày).`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col flex-nowrap overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Báo cáo cuối ngày (Gửi Kế toán)</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          <pre className="font-mono text-sm text-gray-800 whitespace-pre-wrap word-break">
            {reportContent}
          </pre>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
          <button 
            onClick={copyToClipboard}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Đã chép" : "Sao chép báo cáo"}
          </button>
        </div>
      </div>
    </div>
  );
}
