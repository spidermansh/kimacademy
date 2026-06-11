import React, { useRef, useState } from 'react';
import { Transaction, AppSettings } from '../types';
import { formatCurrency, formatDate, numberToVietnameseWords } from '../utils';
import { X, Download, GraduationCap, Loader2 } from 'lucide-react';

interface ReceiptModalProps {
  transaction: Transaction;
  settings: AppSettings | null;
  onClose: () => void;
}

export default function ReceiptModal({ transaction, settings, onClose }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!receiptRef.current || exporting) return;
    setExporting(true);

    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const el = receiptRef.current;

      // Capture the receipt element at high resolution
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgW = canvas.width;
      const imgH = canvas.height;

      // A5 dimensions in mm (148.5 x 210)
      const pdfW = 148.5;
      const pdfH = 210;
      const margin = 10;
      const contentW = pdfW - margin * 2;
      const contentH = (imgH / imgW) * contentW;

      const doc = new jsPDF({
        orientation: contentH > pdfH ? 'portrait' : 'portrait',
        unit: 'mm',
        format: 'a5',
      });

      doc.addImage(imgData, 'PNG', margin, margin, contentW, contentH);

      // Generate filename
      const safeStudentName = transaction.studentName.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const fileName = `BienLai_${safeStudentName}_${dateStr}.pdf`;

      doc.save(fileName);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Không thể xuất PDF. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  const centerName = settings?.centerName || 'Kim Academy';
  const phone = settings?.phone || 'Chưa cấu hình hotline';
  const address = settings?.address || 'Chưa cấu hình địa chỉ';
  const logoUrl = settings?.logoUrl || '';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-600" />
            Biên Lai Thu Tiền
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50">
          <div
            ref={receiptRef}
            style={{
              backgroundColor: '#ffffff',
              padding: '32px',
              fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
              color: '#1e293b',
              lineHeight: 1.6,
              maxWidth: '420px',
              margin: '0 auto',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Center Info Section */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', borderBottom: '2px dashed #e2e8f0', paddingBottom: '18px', marginBottom: '18px' }}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'contain', border: '1px solid #e2e8f0', padding: '2px', flexShrink: 0, backgroundColor: '#f8fafc' }}
                />
              ) : (
                <div style={{ width: '48px', height: '48px', backgroundColor: '#4f46e5', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <GraduationCap style={{ width: '28px', height: '28px', color: '#ffffff' }} />
                </div>
              )}
              <div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>{centerName}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Hotline: {phone}</div>
                <div style={{ fontSize: '10px', color: '#64748b', maxWidth: '280px' }}>Đ/C: {address}</div>
              </div>
            </div>

            {/* Receipt Title */}
            <div style={{ textAlign: 'center' as const, marginBottom: '22px' }}>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', letterSpacing: '2px', textTransform: 'uppercase' as const }}>BIÊN LAI THU TIỀN</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>Số phiếu: BL-{transaction.id.toUpperCase()}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                Ngày thu: {formatDate(transaction.createdAt || transaction.paymentDate, true)}
              </div>
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px', fontSize: '12px' }}>
              <ReceiptRow label="Học viên" value={transaction.studentName} bold />
              <ReceiptRow label="Lớp học" value={transaction.className} />
              {transaction.term && <ReceiptRow label="Kỳ học / Tháng" value={transaction.term} />}
              <ReceiptRow label="Nội dung thu" value={transaction.revenueCategory} />
              <ReceiptRow
                label="Hình thức thu"
                value={`${transaction.paymentMethod}${transaction.senderName ? ` (${transaction.senderName})` : ''}`}
              />
              {transaction.notes && <ReceiptRow label="Ghi chú" value={transaction.notes} italic />}

              {/* Amount highlight */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', alignItems: 'baseline' }}>
                <span style={{ color: '#94a3b8', width: '110px', flexShrink: 0 }}>Số tiền nộp:</span>
                <span style={{ fontWeight: 700, color: '#4f46e5', fontSize: '14px' }}>{formatCurrency(transaction.amount)}</span>
              </div>
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                <span style={{ color: '#94a3b8', width: '110px', flexShrink: 0 }}>Bằng chữ:</span>
                <span style={{ fontWeight: 600, fontStyle: 'italic', color: '#1e293b' }}>{numberToVietnameseWords(transaction.amount)}</span>
              </div>
            </div>

            {/* Signature Block */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '32px', paddingTop: '24px', textAlign: 'center' as const, fontSize: '12px' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>Người nộp tiền</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', marginTop: '4px' }}>(Ký và ghi rõ họ tên)</div>
                <div style={{ height: '60px' }}></div>
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>Người lập phiếu</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', marginTop: '4px' }}>(Ký và ghi rõ họ tên)</div>
                <div style={{ height: '60px' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex gap-3 justify-end p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-650 hover:bg-slate-100 text-sm font-bold transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-100 transition-colors flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xuất...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Tải PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Inline sub-component for receipt rows — uses inline styles for html2canvas compatibility */
function ReceiptRow({ label, value, bold, italic }: { label: string; value: string; bold?: boolean; italic?: boolean }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
      <span style={{ color: '#94a3b8', width: '110px', flexShrink: 0 }}>{label}:</span>
      <span style={{ fontWeight: bold ? 700 : 500, fontStyle: italic ? 'italic' : 'normal', color: '#1e293b' }}>{value}</span>
    </div>
  );
}
