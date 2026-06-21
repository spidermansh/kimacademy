/**
 * generate-import-templates.ts
 * 
 * Tạo bộ file Excel template để người dùng điền dữ liệu thật từ hệ thống Excel hiện tại
 * vào ứng dụng Kim Academy V3.
 * 
 * Chạy: npx tsx scripts/generate-import-templates.ts
 * Output: thư mục data-templates/ chứa các file .xlsx
 */
import XLSX from 'xlsx-js-style';
import path from 'path';
import fs from 'fs';

const OUTPUT_DIR = path.resolve('data-templates');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ─── Style Definitions ───────────────────────────────────────────────────────
const headerStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Arial' },
  fill: { fgColor: { rgb: '2563EB' } },
  border: {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
};

const requiredHeaderStyle = {
  ...headerStyle,
  fill: { fgColor: { rgb: 'DC2626' } },
};

const optionalHeaderStyle = {
  ...headerStyle,
  fill: { fgColor: { rgb: '059669' } },
};

const exampleStyle = {
  font: { color: { rgb: '6B7280' }, italic: true, sz: 10, name: 'Arial' },
  fill: { fgColor: { rgb: 'F3F4F6' } },
  border: {
    top: { style: 'thin', color: { rgb: 'D1D5DB' } },
    bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
    left: { style: 'thin', color: { rgb: 'D1D5DB' } },
    right: { style: 'thin', color: { rgb: 'D1D5DB' } },
  },
};

const noteStyle = {
  font: { color: { rgb: 'B45309' }, sz: 10, name: 'Arial' },
  fill: { fgColor: { rgb: 'FEF3C7' } },
  alignment: { wrapText: true },
};

interface ColumnDef {
  header: string;
  key: string;
  width: number;
  required: boolean;
  example: string;
  note: string;
}

function createSheet(columns: ColumnDef[], sheetName: string) {
  // Row 0: Headers
  // Row 1: Notes/Description  
  // Row 2: Example data
  // Row 3+: Empty for user data

  const wsData: any[][] = [];
  
  // Header row
  const headerRow = columns.map(c => c.header);
  wsData.push(headerRow);
  
  // Notes row
  const notesRow = columns.map(c => c.note);
  wsData.push(notesRow);
  
  // Example row
  const exampleRow = columns.map(c => c.example);
  wsData.push(exampleRow);

  // 10 empty rows for data entry
  for (let i = 0; i < 10; i++) {
    wsData.push(columns.map(() => ''));
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Apply styles
  columns.forEach((col, colIdx) => {
    const headerCell = XLSX.utils.encode_cell({ r: 0, c: colIdx });
    if (ws[headerCell]) {
      ws[headerCell].s = col.required ? requiredHeaderStyle : optionalHeaderStyle;
    }

    const noteCell = XLSX.utils.encode_cell({ r: 1, c: colIdx });
    if (ws[noteCell]) {
      ws[noteCell].s = noteStyle;
    }

    const exampleCell = XLSX.utils.encode_cell({ r: 2, c: colIdx });
    if (ws[exampleCell]) {
      ws[exampleCell].s = exampleStyle;
    }
  });

  // Set column widths
  ws['!cols'] = columns.map(c => ({ wch: c.width }));

  // Set row height for notes row
  ws['!rows'] = [
    { hpt: 25 },  // header
    { hpt: 45 },  // notes
    { hpt: 20 },  // example
  ];

  return ws;
}

function addInstructionSheet(wb: XLSX.WorkBook, instructions: string[]) {
  const data = [
    ['📋 HƯỚNG DẪN SỬ DỤNG TEMPLATE'],
    [''],
    ...instructions.map(line => [line]),
    [''],
    ['⚠️ LƯU Ý QUAN TRỌNG:'],
    ['- Cột đỏ (🔴) = BẮT BUỘC, không được bỏ trống'],
    ['- Cột xanh (🟢) = TÙY CHỌN, có thể bỏ trống'],
    ['- Hàng 2 (vàng): Mô tả / ghi chú cho từng cột'],
    ['- Hàng 3 (xám): Dữ liệu mẫu, hãy xóa trước khi nhập dữ liệu thật'],
    ['- Bắt đầu nhập dữ liệu thật từ hàng 4 trở đi'],
    ['- Định dạng ngày: DD/MM/YYYY (ví dụ: 21/06/2026)'],
    ['- Số tiền: Nhập dạng số nguyên, không dấu chấm/phẩy (ví dụ: 5000000)'],
    ['- KHÔNG thay đổi tên cột ở hàng 1'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Style title
  const titleCell = ws['A1'];
  if (titleCell) {
    titleCell.s = {
      font: { bold: true, sz: 14, color: { rgb: '1E40AF' }, name: 'Arial' },
    };
  }

  ws['!cols'] = [{ wch: 80 }];
  ws['!rows'] = [{ hpt: 30 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Hướng dẫn');
}

// ─── TEMPLATE 1: NHÂN SỰ (Staff Members) ────────────────────────────────────
function generateStaffTemplate() {
  const wb = XLSX.utils.book_new();

  addInstructionSheet(wb, [
    'Template này dùng để nhập danh sách nhân sự (giáo viên, trợ giảng, nhân viên văn phòng).',
    'Mỗi dòng = 1 nhân sự.',
    '',
    'Vai trò (role): teacher | teaching_assistant | office',
    '  - teacher = Giáo viên',
    '  - teaching_assistant = Trợ giảng',
    '  - office = Nhân viên văn phòng',
    '',
    'Trạng thái (status): active | inactive',
    '  - active = Đang làm việc',
    '  - inactive = Đã nghỉ việc',
    '',
    'Phương pháp tính thuế (tax_method): fixed_percent | progressive | none',
    '  - fixed_percent = Thuế suất cố định (mặc định 10%)',
    '  - progressive = Thuế lũy tiến',
    '  - none = Không tính thuế',
  ]);

  const columns: ColumnDef[] = [
    { header: 'Mã nhân sự (*)', key: 'code', width: 18, required: true, example: 'NS001', note: 'Mã định danh duy nhất của nhân sự' },
    { header: 'Họ và tên (*)', key: 'name', width: 25, required: true, example: 'Nguyễn Văn A', note: 'Tên đầy đủ của nhân sự' },
    { header: 'Vai trò (*)', key: 'role', width: 18, required: true, example: 'teacher', note: 'teacher | teaching_assistant | office' },
    { header: 'Số điện thoại', key: 'phone', width: 15, required: false, example: '0901234567', note: 'Số ĐT liên hệ' },
    { header: 'Lương cơ bản', key: 'base_salary', width: 15, required: false, example: '5000000', note: 'Lương cơ bản/tháng (VNĐ)' },
    { header: 'Đơn giá/buổi dạy', key: 'rate_per_session', width: 18, required: false, example: '300000', note: 'Cho giáo viên (VNĐ/buổi)' },
    { header: 'Đơn giá/giờ', key: 'rate_per_hour', width: 15, required: false, example: '50000', note: 'Cho trợ giảng (VNĐ/giờ)' },
    { header: 'Phụ cấp khác/tháng', key: 'other_allowance', width: 18, required: false, example: '500000', note: 'Phụ cấp hàng tháng (VNĐ)' },
    { header: 'Ghi chú phụ cấp', key: 'other_allowance_note', width: 20, required: false, example: 'Phụ cấp xăng xe', note: 'Mô tả phụ cấp' },
    { header: 'Số tài khoản NH', key: 'bank_account', width: 20, required: false, example: '190283748293', note: 'Số TK ngân hàng' },
    { header: 'Ngân hàng', key: 'bank_name', width: 18, required: false, example: 'Techcombank', note: 'Tên ngân hàng' },
    { header: 'Ngày bắt đầu (*)', key: 'start_date', width: 15, required: true, example: '15/01/2025', note: 'DD/MM/YYYY' },
    { header: 'Trạng thái', key: 'status', width: 12, required: false, example: 'active', note: 'active | inactive (mặc định: active)' },
    { header: 'Phương pháp thuế', key: 'tax_method', width: 18, required: false, example: 'fixed_percent', note: 'fixed_percent | progressive | none' },
    { header: 'Thuế suất (%)', key: 'tax_value', width: 14, required: false, example: '10', note: 'Mặc định 10%' },
    { header: 'Đóng BHXH', key: 'apply_social_insurance', width: 12, required: false, example: 'Không', note: 'Có / Không' },
    { header: 'Đóng BHYT', key: 'apply_health_insurance', width: 12, required: false, example: 'Không', note: 'Có / Không' },
    { header: 'Đóng BHTN', key: 'apply_unemployment_insurance', width: 12, required: false, example: 'Không', note: 'Có / Không' },
    { header: 'Ghi chú', key: 'notes', width: 30, required: false, example: 'GV chính lớp Starters', note: 'Ghi chú thêm' },
  ];

  const ws = createSheet(columns, 'Nhân sự');
  XLSX.utils.book_append_sheet(wb, ws, 'DanhSachNhanSu');

  const filePath = path.join(OUTPUT_DIR, '01_NhanSu.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log(`✅ ${filePath}`);
}

// ─── TEMPLATE 2: LỚP HỌC (Classes) ─────────────────────────────────────────
function generateClassTemplate() {
  const wb = XLSX.utils.book_new();

  addInstructionSheet(wb, [
    'Template này dùng để nhập danh sách lớp học.',
    'Mỗi dòng = 1 lớp học.',
    '',
    'Loại lớp (type): offline | online',
    '',
    'Lịch học: Nhập danh sách ngày học, cách nhau bằng dấu phẩy.',
    'Ví dụ: Thứ 2, Thứ 4, Thứ 6',
    '',
    'Giáo viên chính: Nhập ĐÚNG tên giáo viên đã có trong danh sách nhân sự.',
    'Nếu giáo viên chưa được nhập, vui lòng nhập Nhân sự trước.',
    '',
    'Trạng thái (status): active | paused | completed',
  ]);

  const columns: ColumnDef[] = [
    { header: 'Mã lớp học (*)', key: 'code', width: 18, required: true, example: 'LH001', note: 'Mã lớp học duy nhất' },
    { header: 'Tên lớp (*)', key: 'name', width: 20, required: true, example: 'Starters 1', note: 'Tên lớp học' },
    { header: 'Loại lớp', key: 'type', width: 12, required: false, example: 'offline', note: 'offline | online (mặc định: offline)' },
    { header: 'Mã giáo viên (*)', key: 'teacher_code', width: 18, required: true, example: 'NS001', note: 'Mã GV phải trùng khớp với mã nhân sự đã nhập' },
    { header: 'Phòng học', key: 'room', width: 12, required: false, example: 'P101', note: 'Tên phòng' },
    { header: 'Sĩ số tối đa', key: 'max_students', width: 14, required: false, example: '15', note: 'Mặc định: 15' },
    { header: 'Học phí/buổi (VNĐ) (*)', key: 'default_fee', width: 20, required: true, example: '150000', note: 'Học phí mặc định cho lớp' },
    { header: 'Lịch học', key: 'schedule_days', width: 25, required: false, example: 'Thứ 2, Thứ 4, Thứ 6', note: 'Cách nhau bằng dấu phẩy' },
    { header: 'Giờ học', key: 'schedule_time', width: 15, required: false, example: '18:00-19:30', note: 'Giờ bắt đầu-kết thúc' },
    { header: 'Mô tả', key: 'description', width: 30, required: false, example: 'Lớp cơ bản cho trẻ', note: 'Mô tả lớp học' },
    { header: 'Trạng thái', key: 'status', width: 12, required: false, example: 'active', note: 'active | paused | completed' },
  ];

  const ws = createSheet(columns, 'Lớp học');
  XLSX.utils.book_append_sheet(wb, ws, 'DanhSachLop');

  const filePath = path.join(OUTPUT_DIR, '02_LopHoc.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log(`✅ ${filePath}`);
}

// ─── TEMPLATE 3: HỌC VIÊN + PHỤ HUYNH (Students) ───────────────────────────
function generateStudentTemplate() {
  const wb = XLSX.utils.book_new();

  addInstructionSheet(wb, [
    'Template này dùng để nhập danh sách học viên kèm thông tin phụ huynh.',
    'Mỗi dòng = 1 học viên.',
    '',
    'Giới tính: Nam | Nữ',
    '',
    'Trạng thái: active | waiting_class | suspended | left | trial',
    '  - active = Đang học',
    '  - waiting_class = Chờ xếp lớp',
    '  - suspended = Tạm nghỉ',
    '  - left = Đã nghỉ học',
    '  - trial = Học thử',
    '',
    'Mã lớp học: Nhập ĐÚNG mã lớp học đã có trong danh sách lớp học (Template 02).',
    'Nếu học viên chưa xếp lớp, để trống.',
    '',
    'Học phí riêng/buổi: Nếu bỏ trống, sẽ dùng học phí mặc định của lớp.',
  ]);

  const columns: ColumnDef[] = [
    { header: 'Mã học viên (*)', key: 'code', width: 18, required: true, example: 'HV001', note: 'Mã học viên duy nhất' },
    { header: 'Họ tên tiếng Việt (*)', key: 'vietnamese_name', width: 25, required: true, example: 'Nguyễn Minh Anh', note: 'Tên tiếng Việt đầy đủ' },
    { header: 'Tên tiếng Anh', key: 'english_name', width: 18, required: false, example: 'Minh Anh', note: 'Tên khi học tiếng Anh' },
    { header: 'Giới tính', key: 'gender', width: 10, required: false, example: 'Nữ', note: 'Nam | Nữ' },
    { header: 'Ngày sinh', key: 'birth_date', width: 14, required: false, example: '15/03/2016', note: 'DD/MM/YYYY' },
    { header: 'Ngày nhập học', key: 'enroll_date', width: 14, required: false, example: '01/09/2025', note: 'DD/MM/YYYY' },
    { header: 'Trạng thái', key: 'status', width: 15, required: false, example: 'active', note: 'active | waiting_class | suspended | left | trial' },
    { header: 'Mã lớp học', key: 'class_code', width: 18, required: false, example: 'LH001', note: 'Phải trùng mã lớp học trong DS lớp' },
    { header: 'Học phí riêng/buổi', key: 'fee_per_session', width: 18, required: false, example: '150000', note: 'Nếu trống → dùng phí mặc định lớp' },
    { header: 'Tên phụ huynh', key: 'parent_name', width: 22, required: false, example: 'Nguyễn Văn B', note: 'Tên người giám hộ' },
    { header: 'SĐT phụ huynh (*)', key: 'parent_phone', width: 15, required: true, example: '0912345678', note: 'Số ĐT chính' },
    { header: 'Zalo phụ huynh', key: 'parent_zalo', width: 15, required: false, example: '0912345678', note: 'Zalo liên hệ' },
    { header: 'Email phụ huynh', key: 'parent_email', width: 22, required: false, example: 'phu.huynh@email.com', note: 'Email liên hệ' },
    { header: 'Địa chỉ', key: 'address', width: 30, required: false, example: '123 Đường Lớn, Q1, HCM', note: 'Địa chỉ gia đình' },
    { header: 'Ghi chú', key: 'notes', width: 30, required: false, example: 'Dị ứng đậu phộng', note: 'Ghi chú đặc biệt' },
  ];

  const ws = createSheet(columns, 'Học viên');
  XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHocVien');

  const filePath = path.join(OUTPUT_DIR, '03_HocVien.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log(`✅ ${filePath}`);
}

// ─── TEMPLATE 4: ĐÓNG HỌC PHÍ (Tuition Transactions) ───────────────────────
function generateTuitionTemplate() {
  const wb = XLSX.utils.book_new();

  addInstructionSheet(wb, [
    'Template này dùng để nhập lịch sử đóng học phí của học viên.',
    'Mỗi dòng = 1 lần đóng tiền.',
    '',
    'Tên học viên: Phải ĐÚNG tên đã nhập trong Template 03 (Họ tên tiếng Việt).',
    'Tên lớp: Phải ĐÚNG tên lớp đã nhập trong Template 02.',
    '',
    'Phương thức thanh toán: Chuyển khoản | Tiền mặt | Momo | ZaloPay | Khác',
    '',
    'Gợi ý: Nếu bạn có nhiều lần đóng tiền cho 1 học viên, hãy nhập mỗi lần trên 1 dòng riêng.',
  ]);

  const columns: ColumnDef[] = [
    { header: 'Mã học viên (*)', key: 'student_code', width: 18, required: true, example: 'HV001', note: 'Phải trùng mã học viên trong DS học viên' },
    { header: 'Mã lớp học (*)', key: 'class_code', width: 18, required: true, example: 'LH001', note: 'Phải trùng mã lớp học trong DS lớp' },
    { header: 'Số tiền (*)', key: 'amount', width: 15, required: true, example: '3000000', note: 'Số tiền đóng (VNĐ)' },
    { header: 'Ngày đóng (*)', key: 'payment_date', width: 14, required: true, example: '15/05/2026', note: 'DD/MM/YYYY' },
    { header: 'Phương thức TT', key: 'payment_method', width: 18, required: false, example: 'Chuyển khoản', note: 'Chuyển khoản | Tiền mặt | Momo | ZaloPay' },
    { header: 'Kỳ thu', key: 'term', width: 18, required: false, example: 'Tháng 5/2026', note: 'Kỳ thu học phí' },
    { header: 'Ghi chú', key: 'notes', width: 30, required: false, example: 'Đóng 20 buổi', note: 'Ghi chú giao dịch' },
    { header: 'Đã đối soát', key: 'is_reconciled', width: 14, required: false, example: 'Có', note: 'Có / Không (mặc định: Không)' },
  ];

  const ws = createSheet(columns, 'Học phí');
  XLSX.utils.book_append_sheet(wb, ws, 'DongHocPhi');

  const filePath = path.join(OUTPUT_DIR, '04_HocPhi.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log(`✅ ${filePath}`);
}

// ─── TEMPLATE 5: DOANH THU KHÁC (Revenue Other) ─────────────────────────────
function generateRevenueOtherTemplate() {
  const wb = XLSX.utils.book_new();

  addInstructionSheet(wb, [
    'Template này dùng để nhập doanh thu ngoài học phí (bán sách, đồng phục, lệ phí thi...).',
    'Mỗi dòng = 1 giao dịch thu.',
    '',
    'Danh mục: Sách | Đồng phục | Phí thi | Khác',
    '',
    'Tên học viên: Tùy chọn. Nếu khoản thu liên quan đến 1 học viên cụ thể, nhập tên.',
  ]);

  const columns: ColumnDef[] = [
    { header: 'Danh mục (*)', key: 'category', width: 18, required: true, example: 'Sách', note: 'Sách | Đồng phục | Phí thi | Khác' },
    { header: 'Số tiền (*)', key: 'amount', width: 15, required: true, example: '150000', note: 'Số tiền (VNĐ)' },
    { header: 'Ngày thu (*)', key: 'payment_date', width: 14, required: true, example: '10/05/2026', note: 'DD/MM/YYYY' },
    { header: 'Phương thức TT', key: 'payment_method', width: 18, required: false, example: 'Tiền mặt', note: 'Chuyển khoản | Tiền mặt | ...' },
    { header: 'Mã học viên', key: 'student_code', width: 18, required: false, example: 'HV001', note: 'Nếu liên quan đến HV cụ thể' },
    { header: 'Mô tả', key: 'description', width: 30, required: false, example: 'Mua giáo trình Starters', note: 'Chi tiết giao dịch' },
  ];

  const ws = createSheet(columns, 'Doanh thu khác');
  XLSX.utils.book_append_sheet(wb, ws, 'DoanhThuKhac');

  const filePath = path.join(OUTPUT_DIR, '05_DoanhThuKhac.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log(`✅ ${filePath}`);
}

// ─── TEMPLATE 6: CHI PHÍ VẬN HÀNH (Expenses) ───────────────────────────────
function generateExpenseTemplate() {
  const wb = XLSX.utils.book_new();

  addInstructionSheet(wb, [
    'Template này dùng để nhập chi phí vận hành trung tâm.',
    'Mỗi dòng = 1 khoản chi.',
    '',
    'Danh mục: Mặt bằng | Điện nước | Internet | Marketing | Dụng cụ | Văn phòng phẩm | Chi khác',
    '',
    'Phương thức TT: Chuyển khoản | Tiền mặt | Momo | ZaloPay | Khác',
  ]);

  const columns: ColumnDef[] = [
    { header: 'Ngày chi (*)', key: 'date', width: 14, required: true, example: '01/06/2026', note: 'DD/MM/YYYY' },
    { header: 'Danh mục (*)', key: 'category', width: 20, required: true, example: 'Mặt bằng', note: 'Mặt bằng | Điện nước | Internet | ...' },
    { header: 'Mô tả (*)', key: 'description', width: 30, required: true, example: 'Thuê mặt bằng T6/2026', note: 'Nội dung chi' },
    { header: 'Số tiền (*)', key: 'amount', width: 15, required: true, example: '8000000', note: 'Số tiền chi (VNĐ)' },
    { header: 'Phương thức TT', key: 'payment_method', width: 18, required: false, example: 'Chuyển khoản', note: 'Chuyển khoản | Tiền mặt | ...' },
    { header: 'Chi định kỳ', key: 'is_recurring', width: 14, required: false, example: 'Có', note: 'Có / Không' },
    { header: 'Ghi chú định kỳ', key: 'recurring_note', width: 20, required: false, example: 'Hàng tháng', note: 'Hàng tháng | Hàng quý | ...' },
    { header: 'Ghi chú', key: 'notes', width: 25, required: false, example: '', note: 'Ghi chú thêm' },
  ];

  const ws = createSheet(columns, 'Chi phí');
  XLSX.utils.book_append_sheet(wb, ws, 'ChiPhi');

  const filePath = path.join(OUTPUT_DIR, '06_ChiPhi.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log(`✅ ${filePath}`);
}

// ─── TEMPLATE 7: ĐIỂM DANH (Attendance) ─────────────────────────────────────
function generateAttendanceTemplate() {
  const wb = XLSX.utils.book_new();

  addInstructionSheet(wb, [
    'Template này dùng để nhập lịch sử điểm danh.',
    'Mỗi dòng = 1 bản ghi điểm danh (1 học viên, 1 ngày, 1 lớp).',
    '',
    'Trạng thái: present | absent | excused',
    '  - present = Có mặt',
    '  - absent = Vắng mặt',
    '  - excused = Vắng có phép (không trừ buổi)',
    '',
    '⚠️ LƯU Ý: Template này chỉ cần nhập nếu bạn muốn import lịch sử điểm danh cũ.',
    'Từ khi sử dụng ứng dụng, điểm danh sẽ được thực hiện trực tiếp trên giao diện.',
  ]);

  const columns: ColumnDef[] = [
    { header: 'Mã học viên (*)', key: 'student_code', width: 18, required: true, example: 'HV001', note: 'Phải trùng mã học viên trong DS học viên' },
    { header: 'Mã lớp học (*)', key: 'class_code', width: 18, required: true, example: 'LH001', note: 'Phải trùng mã lớp học trong DS lớp' },
    { header: 'Ngày (*)', key: 'date', width: 14, required: true, example: '10/06/2026', note: 'DD/MM/YYYY' },
    { header: 'Trạng thái (*)', key: 'status', width: 14, required: true, example: 'present', note: 'present | absent | excused' },
    { header: 'Ghi chú', key: 'note', width: 25, required: false, example: '', note: 'Ghi chú (lý do vắng...)' },
  ];

  const ws = createSheet(columns, 'Điểm danh');
  XLSX.utils.book_append_sheet(wb, ws, 'DiemDanh');

  const filePath = path.join(OUTPUT_DIR, '07_DiemDanh.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log(`✅ ${filePath}`);
}

// ─── TEMPLATE 8: TẠM ỨNG LƯƠNG (Salary Advances) ───────────────────────────
function generateAdvanceTemplate() {
  const wb = XLSX.utils.book_new();

  addInstructionSheet(wb, [
    'Template này dùng để nhập lịch sử tạm ứng lương của nhân sự.',
    'Mỗi dòng = 1 lần tạm ứng.',
    '',
    'Tên nhân sự: Phải ĐÚNG tên đã nhập trong Template 01 (Nhân sự).',
  ]);

  const columns: ColumnDef[] = [
    { header: 'Mã nhân sự (*)', key: 'staff_code', width: 18, required: true, example: 'NS001', note: 'Phải trùng mã nhân sự trong DS nhân sự' },
    { header: 'Số tiền (*)', key: 'amount', width: 15, required: true, example: '2000000', note: 'Số tiền tạm ứng (VNĐ)' },
    { header: 'Ngày (*)', key: 'date', width: 14, required: true, example: '05/06/2026', note: 'DD/MM/YYYY' },
    { header: 'Lý do', key: 'reason', width: 30, required: false, example: 'Ứng lương tháng 6', note: 'Lý do tạm ứng' },
  ];

  const ws = createSheet(columns, 'Tạm ứng');
  XLSX.utils.book_append_sheet(wb, ws, 'TamUng');

  const filePath = path.join(OUTPUT_DIR, '08_TamUng.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log(`✅ ${filePath}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   📦 TẠO BỘ TEMPLATE IMPORT DỮ LIỆU - KIM ACADEMY V3  ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

generateStaffTemplate();
generateClassTemplate();
generateStudentTemplate();
generateTuitionTemplate();
generateRevenueOtherTemplate();
generateExpenseTemplate();
generateAttendanceTemplate();
generateAdvanceTemplate();

console.log('');
console.log('════════════════════════════════════════════════════════════');
console.log('🎉 Đã tạo thành công 8 file template tại thư mục:');
console.log(`   📁 ${OUTPUT_DIR}`);
console.log('');
console.log('📋 THỨ TỰ NHẬP DỮ LIỆU ĐỀ XUẤT:');
console.log('   1️⃣  01_NhanSu.xlsx         → Nhập nhân sự (giáo viên, trợ giảng...)');
console.log('   2️⃣  02_LopHoc.xlsx         → Nhập lớp học');
console.log('   3️⃣  03_HocVien.xlsx        → Nhập học viên + phụ huynh');
console.log('   4️⃣  04_HocPhi.xlsx         → Nhập lịch sử đóng học phí');
console.log('   5️⃣  05_DoanhThuKhac.xlsx   → Nhập doanh thu khác');
console.log('   6️⃣  06_ChiPhi.xlsx         → Nhập chi phí vận hành');
console.log('   7️⃣  07_DiemDanh.xlsx       → Nhập lịch sử điểm danh (tùy chọn)');
console.log('   8️⃣  08_TamUng.xlsx         → Nhập tạm ứng lương (nếu có)');
console.log('');
console.log('⚡ Sau khi điền xong, chạy lệnh import:');
console.log('   npx tsx scripts/import-real-data.ts');
console.log('════════════════════════════════════════════════════════════');
