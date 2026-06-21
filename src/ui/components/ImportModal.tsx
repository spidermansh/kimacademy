import React, { useState } from 'react';
import { X, Upload, Download, AlertTriangle, FileSpreadsheet, Check, Save } from 'lucide-react';
import { useToast } from './Toast';
import { api } from '../../shared/utils';
import * as XLSX from 'xlsx-js-style';

interface ImportModalProps {
  onConfirm: () => void;
  onClose: () => void;
  classes?: { id: string; name: string; type: string }[];
}

interface ParsedStudent {
  name: string;
  vietnameseName: string;
  englishName: string;
  vietAnhName: string;
  className: string;
  gender: string;
  birthYear: number;
  parentPhone: string;
  parentEmail: string;
  feePerSession: number;
  status: 'active' | 'suspended' | 'left';
  enrollDate: string;
  address: string;
  notes: string;
  isValid: boolean;
  errorMsg?: string;
}

export default function ImportModal({ onConfirm, onClose, classes = [] }: ImportModalProps) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
  const [importing, setImporting] = useState(false);

  // Generate and download sample Excel template
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        {
          'Họ và tên *': 'Bùi Trần Sơn Hải',
          'Tên tiếng Việt *': 'Sơn Hải',
          'Tên tiếng Anh': 'Jack',
          'Lớp học': classes[0]?.name || 'Big 1',
          'Giới tính (Nam/Nữ)': 'Nam',
          'Nam sinh': 2016,
          'SĐT phụ huynh': '0912345678',
          'Email phụ huynh': 'sonhai.parent@email.com',
          'Học phí/buổi': 85000,
          'Trạng thái (active/suspended/left)': 'active',
          'Ngày nhập học (YYYY-MM-DD)': '2026-06-10',
          'Địa chỉ': '123 Đường Nguyễn Huệ, Quận 1',
          'Ghi chú': 'Học viên chuyển từ trung tâm khác sang',
        },
        {
          'Họ và tên *': 'Nguyễn Minh Anh',
          'Tên tiếng Việt *': 'Minh Anh',
          'Tên tiếng Anh': 'Jane',
          'Lớp học': classes[0]?.name || 'Big 1',
          'Giới tính (Nam/Nữ)': 'Nữ',
          'Nam sinh': 2015,
          'SĐT phụ huynh': '0987654321',
          'Email phụ huynh': 'minhanh.parent@email.com',
          'Học phí/buổi': 90000,
          'Trạng thái (active/suspended/left)': 'active',
          'Ngày nhập học (YYYY-MM-DD)': '2026-06-10',
          'Địa chỉ': '456 Đường Lê Lợi, Quận 1',
          'Ghi chú': 'Đăng ký học thử 2 buổi',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      
      // Auto-fit column widths
      const colWidths = Object.keys(templateData[0]).map(key => ({
        wch: Math.max(key.length + 4, 15)
      }));
      ws['!cols'] = colWidths;

      // Stylize headers (Indigo background, white bold text)
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:M3');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
        if (ws[cellRef]) {
          ws[cellRef].s = {
            fill: { fgColor: { rgb: '4F46E5' } },
            font: { color: { rgb: 'FFFFFF' }, bold: true, size: 10 },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      XLSX.writeFile(wb, 'Template_Nhap_Hoc_Vien.xlsx');
      toast.success('Đã tải xuống file mẫu thành công!');
    } catch (err: any) {
      toast.error('Lỗi khi tải file mẫu', err.message);
    }
  };

  // Parse Excel file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const rawRows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });
        
        if (rawRows.length === 0) {
          toast.warning('File rỗng', 'Không tìm thấy dữ liệu học viên trong file Excel.');
          return;
        }

        const normalized: ParsedStudent[] = rawRows.map((row, idx) => {
          // Find fields regardless of column names (headers flexibility)
          const name = (row['Họ và tên *'] || row['Họ và tên'] || row['Họ tên'] || row['Name'] || '').toString().trim();
          const vietnameseName = (row['Tên tiếng Việt *'] || row['Tên tiếng Việt'] || row['Tên'] || '').toString().trim();
          const englishName = (row['Tên tiếng Anh'] || row['English Name'] || '').toString().trim();
          const className = (row['Lớp học'] || row['Lớp'] || row['Class'] || '').toString().trim();
          const gender = (row['Giới tính (Nam/Nữ)'] || row['Giới tính'] || 'Nam').toString().trim();
          const birthYear = parseInt((row['Nam sinh'] || row['Năm sinh'] || row['Birth Year'] || '').toString().replace(/\D/g, ''), 10) || new Date().getFullYear() - 10;
          const parentPhone = (row['SĐT phụ huynh'] || row['Số điện thoại'] || row['SĐT'] || row['Phone'] || '').toString().trim();
          const parentEmail = (row['Email phụ huynh'] || row['Email'] || '').toString().trim();
          const feePerSession = parseInt((row['Học phí/buổi'] || row['Học phí'] || row['Fee'] || '0').toString().replace(/\D/g, ''), 10) || 0;
          
          let status: 'active' | 'suspended' | 'left' = 'active';
          const statusRaw = (row['Trạng thái (active/suspended/left)'] || row['Trạng thái'] || 'active').toString().toLowerCase().trim();
          if (statusRaw.includes('suspend') || statusRaw.includes('tạm nghỉ')) {
            status = 'suspended';
          } else if (statusRaw.includes('left') || statusRaw.includes('nghỉ') || statusRaw.includes('đã nghỉ')) {
            status = 'left';
          }

          const enrollDate = (row['Ngày nhập học (YYYY-MM-DD)'] || row['Ngày nhập học'] || new Date().toISOString().slice(0, 10)).toString().trim();
          const address = (row['Địa chỉ'] || row['Address'] || '').toString().trim();
          const notes = (row['Ghi chú'] || row['Notes'] || '').toString().trim();

          // Validate fields
          let isValid = true;
          let errorMsg = '';

          if (!name) {
            isValid = false;
            errorMsg += 'Thiếu Họ tên; ';
          }
          if (!vietnameseName) {
            isValid = false;
            errorMsg += 'Thiếu Tên tiếng Việt; ';
          }

          // Auto-compute vietAnhName
          const vietAnhName = englishName ? `${vietnameseName} - ${englishName}` : vietnameseName;

          return {
            name,
            vietnameseName,
            englishName,
            vietAnhName,
            className,
            gender,
            birthYear,
            parentPhone,
            parentEmail,
            feePerSession,
            status,
            enrollDate,
            address,
            notes,
            isValid,
            errorMsg: errorMsg ? errorMsg.substring(0, errorMsg.length - 2) : undefined,
          };
        });

        setParsedData(normalized);
        toast.success(`Đã đọc thành công ${normalized.length} dòng dữ liệu!`);
      } catch (err: any) {
        toast.error('Lỗi phân tích file Excel', err.message);
      }
    };

    reader.readAsBinaryString(selectedFile);
  };

  // Submit batch data
  const handleSave = async () => {
    const validData = parsedData.filter(d => d.isValid);
    if (validData.length === 0) {
      toast.warning('Không thể lưu', 'Không có học viên hợp lệ để đăng ký.');
      return;
    }

    setImporting(true);
    try {
      await api.createStudentsBatch(validData);
      toast.success(`Đã thêm thành công ${validData.length} học viên mới!`);
      onConfirm();
    } catch (err: any) {
      toast.error('Lỗi lưu dữ liệu hàng loạt', err.message);
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedData.filter(d => d.isValid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-indigo-900 text-white shrink-0">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" /> Nhập học viên từ Excel
            </h3>
            <p className="text-xs text-indigo-200 mt-0.5">
              Đăng ký hồ sơ học viên hàng loạt nhanh chóng từ bảng Excel mẫu
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5 text-indigo-100" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/30">
          {/* Step 1: Upload & Template */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bước 1: Tải file dữ liệu mẫu</h4>
              <p className="text-xs text-slate-500">
                Hãy tải file mẫu, điền đầy đủ các thông tin học viên theo định dạng cột có sẵn để đảm bảo dữ liệu khớp hệ thống.
              </p>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-500" />
                Tải Excel mẫu
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bước 2: Upload file điền sẵn</h4>
              <p className="text-xs text-slate-500">
                Chọn file Excel (.xlsx) bạn vừa nhập liệu đầy đủ thông tin để hệ thống rà soát và tải lên dữ liệu.
              </p>
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="excel-file-upload"
                />
                <label
                  htmlFor="excel-file-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 cursor-pointer bg-slate-50 hover:bg-indigo-50/20 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  {file ? file.name : 'Chọn file Excel của bạn'}
                </label>
              </div>
            </div>
          </div>

          {/* Step 2: Preview Results */}
          {parsedData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Bảng xem trước dữ liệu nhập</h4>
                <div className="flex gap-2">
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                    Hợp lệ: {validCount}
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-100">
                      Lỗi: {invalidCount}
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-[35vh] overflow-auto">
                <table className="w-full text-left text-xs divide-y divide-slate-100">
                  <thead className="bg-slate-100 text-slate-500 font-bold sticky top-0">
                    <tr>
                      <th className="px-4 py-2">Họ & Tên</th>
                      <th className="px-4 py-2">Tên Việt Anh</th>
                      <th className="px-4 py-2">Lớp học</th>
                      <th className="px-4 py-2">Giới tính</th>
                      <th className="px-4 py-2">Năm sinh</th>
                      <th className="px-4 py-2">Số ĐT</th>
                      <th className="px-4 py-2 text-right">HP/buổi</th>
                      <th className="px-4 py-2">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {parsedData.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className={`hover:bg-slate-50 transition-colors ${
                          !row.isValid ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-slate-800">{row.name || '—'}</div>
                          {!row.isValid && (
                            <div className="text-[10px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="w-3 h-3" /> {row.errorMsg}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 font-medium">{row.vietAnhName || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-500">{row.className || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-500">{row.gender}</td>
                        <td className="px-4 py-2.5 text-slate-500">{row.birthYear}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-500">{row.parentPhone || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                          {row.feePerSession > 0 ? `${row.feePerSession.toLocaleString('vi-VN')}đ` : '0đ'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            !row.isValid
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {row.isValid ? <Check className="w-2.5 h-2.5" /> : null}
                            {row.isValid ? 'Sẵn sàng' : 'Không hợp lệ'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={importing || parsedData.length === 0 || validCount === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {importing ? 'Đang lưu...' : `Nhập ${validCount} học viên`}
          </button>
        </div>

      </div>
    </div>
  );
}