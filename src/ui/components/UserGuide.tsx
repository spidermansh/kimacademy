import React, { useState } from 'react';
import {
  BookOpen, Users, DollarSign, CalendarDays, Wallet, PhoneCall,
  Briefcase, ClipboardCheck, HandCoins, Calculator, BarChart3,
  ChevronDown, ChevronRight, CheckCircle2, ArrowRight, Lightbulb,
  GraduationCap, FolderOpen, Settings, UserPlus, ListChecks,
  Zap, Shield, HelpCircle, PlayCircle, LayoutDashboard,
  Package, Receipt, AlertTriangle,
} from 'lucide-react';

/* ════════════════════════════════════════════════════════════════════════
   HƯỚNG DẪN SỬ DỤNG — Kim Academy
   ════════════════════════════════════════════════════════════════════════ */

interface StepProps {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  tips?: string[];
}

const Step: React.FC<StepProps> = ({ number, title, description, icon, color, tips }) => (
  <div className="flex gap-4 group">
    <div className="flex flex-col items-center">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg bg-${color}-500 group-hover:scale-110 transition-transform`}>
        {number}
      </div>
      <div className="w-0.5 flex-1 bg-slate-200 mt-1" />
    </div>
    <div className="pb-8 flex-1">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-${color}-500`}>{icon}</span>
        <h4 className="font-bold text-slate-800">{title}</h4>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
      {tips && tips.length > 0 && (
        <div className="mt-2 space-y-1">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-slate-500">
              <Lightbulb className="w-3 h-3 mt-0.5 text-amber-400 shrink-0" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  isExpanded: boolean;
  onToggle: () => void;
  steps?: { title: string; desc: string }[];
  warnings?: string[];
}

const ModuleCard: React.FC<ModuleCardProps> = ({ title, description, icon, color, features, isExpanded, onToggle, steps, warnings }) => (
  <div className={`bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden ${isExpanded ? `border-${color}-300 shadow-lg` : 'border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'}`}>
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-4 p-5 text-left cursor-pointer"
    >
      <div className={`w-12 h-12 rounded-xl bg-${color}-100 flex items-center justify-center shrink-0`}>
        <span className={`text-${color}-600`}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-800 text-base">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{description}</p>
      </div>
      {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
    </button>

    {isExpanded && (
      <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4 animate-in fade-in">
        {/* Features */}
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tính năng chính</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle2 className={`w-4 h-4 text-${color}-500 shrink-0`} />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        {steps && steps.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Các bước thực hiện</h4>
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full bg-${color}-100 text-${color}-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                    <p className="text-xs text-slate-500">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings / Lưu ý */}
        {warnings && warnings.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Lưu ý quan trọng
            </h4>
            <div className="space-y-1.5">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);

interface UserGuideProps {
  onNavigate?: (tabId: string) => void;
}

export default function UserGuide({ onNavigate }: UserGuideProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'workflow' | 'modules' | 'faq'>('overview');
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const SECTIONS = [
    { key: 'overview', label: '🏠 Tổng quan', icon: <BookOpen className="w-4 h-4" /> },
    { key: 'workflow', label: '🔄 Quy trình', icon: <ListChecks className="w-4 h-4" /> },
    { key: 'modules', label: '📦 Phân hệ', icon: <FolderOpen className="w-4 h-4" /> },
    { key: 'faq', label: '❓ Hỏi đáp', icon: <HelpCircle className="w-4 h-4" /> },
  ];

  const MODULES = [
    {
      id: 'ban-lam-viec',
      title: '🖥️ Bàn làm việc',
      description: 'Trang chủ tổng hợp — thao tác nhanh mỗi ngày',
      icon: <LayoutDashboard className="w-6 h-6" />,
      color: 'indigo',
      features: [
        'Tổng quan KPI hôm nay (doanh thu, điểm danh, cảnh báo)',
        'Thu tiền nhanh — không cần rời trang chủ',
        'Ghi chi phí nhanh — nhập nhanh khoản chi',
        'Thêm học viên nhanh — đăng ký HV mới ngay',
        'Nhắc phụ huynh nhanh — gọi/nhắn PH',
        'Lịch dạy hôm nay — lớp nào, giờ nào, GV nào',
        'Thống kê nhanh: Tổng HV, Lớp, Thu/Chi tháng',
      ],
      steps: [
        { title: 'Mở ứng dụng', desc: 'Trang Bàn làm việc mở mặc định khi đăng nhập' },
        { title: 'Xem tổng quan', desc: 'Kiểm tra KPI ngày hôm nay: doanh thu, số buổi dạy, cảnh báo' },
        { title: 'Thao tác nhanh', desc: 'Bấm các nút: 💰 Thu tiền, 📝 Ghi chi phí, 👤 Thêm HV nhanh' },
        { title: 'Kiểm tra lịch', desc: 'Xem lịch dạy hôm nay để biết lớp nào cần điểm danh' },
      ],
      warnings: [
        'Bàn làm việc chỉ hiển thị cho Admin, không hiển thị cho Giáo viên (GV dùng Trang GV riêng).',
      ],
    },
    {
      id: 'tuyen-sinh',
      title: '🎓 Tuyển sinh',
      description: 'Quản lý học viên tiềm năng (Leads) — theo dõi quy trình tuyển sinh',
      icon: <UserPlus className="w-6 h-6" />,
      color: 'pink',
      features: [
        'Thêm Lead mới (tên, SĐT, nguồn liên hệ)',
        'Quản lý trạng thái: Mới → Đang tư vấn → Học thử → Đã đăng ký / Từ chối',
        'Ghi chú lịch sử tư vấn, hẹn gọi lại',
        'Chuyển Lead sang Học viên khi đăng ký chính thức',
        'Thống kê tỷ lệ chuyển đổi (Conversion Rate)',
        'Lọc theo trạng thái, nguồn, ngày tạo',
      ],
      steps: [
        { title: 'Tạo Lead mới', desc: 'Bấm "Thêm Lead" → Nhập tên PH, SĐT, nguồn biết trung tâm, tên con' },
        { title: 'Cập nhật trạng thái', desc: 'Sau mỗi lần tư vấn → cập nhật trạng thái Lead (Đang tư vấn, Học thử...)' },
        { title: 'Ghi chú theo dõi', desc: 'Ghi chú nội dung tư vấn, ngày hẹn gọi lại' },
        { title: 'Chuyển thành HV', desc: 'Khi Lead đăng ký → chuyển thành Học viên chính thức → dữ liệu tự đổ sang phân hệ Học viên' },
      ],
      warnings: [
        'Chỉ Admin mới có quyền truy cập phân hệ Tuyển sinh.',
        'Khi chuyển Lead thành Học viên, cần kiểm tra tên không bị trùng.',
      ],
    },
    {
      id: 'danh-muc',
      title: '📂 Danh mục Học vụ',
      description: 'Thiết lập dữ liệu nền tảng: Học viên, Lớp học',
      icon: <FolderOpen className="w-6 h-6" />,
      color: 'blue',
      features: [
        'Thêm/sửa/xóa học viên',
        'Quản lý thông tin chi tiết HV (tên, SĐT PH, năm sinh, giới tính)',
        'Tạo và quản lý lớp học (tên, sĩ số, lịch học, phòng học)',
        'Gán giáo viên chủ nhiệm cho lớp',
        'Thay đổi trạng thái lớp: Hoạt động / Tạm dừng / Kết thúc',
        'Chuyển lớp cho học viên (tính lại buổi tự động)',
        'Xem Timeline lịch sử học viên',
        'Điểm danh: Có mặt / Vắng / Phép (tự tạo chấm công GV)',
      ],
      steps: [
        { title: 'Tạo Lớp học', desc: 'Vào Quản lý Học vụ → Lớp học → Thêm lớp mới (tên, sĩ số tối đa, GV chủ nhiệm, lịch học, học phí mặc định)' },
        { title: 'Thêm Học viên', desc: 'Vào Học viên → Thêm HV (tên đầy đủ, tên tiếng Việt, tên tiếng Anh, lớp, SĐT phụ huynh, học phí/buổi)' },
        { title: 'Gán HV vào Lớp', desc: 'Chọn lớp khi tạo HV, hoặc dùng chức năng Chuyển lớp sau đó' },
        { title: 'Điểm danh', desc: 'Chọn ngày + lớp → Tick Có mặt/Vắng/Phép → Lưu → Hệ thống tự tạo chấm công cho GV' },
      ],
      warnings: [
        'Nên tạo Lớp trước vì khi thêm HV cần chọn lớp.',
        'Khi tất cả HV vắng → hệ thống KHÔNG tạo buổi dạy cho GV.',
        'Nếu đã điểm danh ngày đó → hệ thống cảnh báo tránh trùng.',
      ],
    },
    {
      id: 'thu-tien',
      title: '💰 Thu tiền',
      description: 'Ghi nhận khoản thu từ học viên — giao diện chính hàng ngày',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'emerald',
      features: [
        'Form thu tiền nhanh chóng, dễ dùng',
        'Tự động nhận diện HV mới → gợi ý đăng ký',
        'Chọn hình thức: Tiền mặt / Chuyển khoản / Momo / ZaloPay',
        'Phân loại khoản thu: Học phí offline, Lệ phí thi, Thu khác',
        'Đối chiếu ngân hàng (NVVP đối chiếu)',
        'Kế toán xuất hóa đơn',
        'Lịch sử chỉnh sửa giao dịch (audit trail)',
        'Xuất Excel báo cáo thu',
      ],
      steps: [
        { title: 'Nhập thông tin', desc: 'Điền ngày thu, tên HV (auto-complete), lớp, kỳ học, số tiền' },
        { title: 'Chọn loại doanh thu', desc: 'Học phí offline, Lệ phí thi hoặc Thu khác (Sách & Đồng phục quản lý tại Kho vật tư)' },
        { title: 'Chọn hình thức thanh toán', desc: 'Tiền mặt, Chuyển khoản, Momo, ZaloPay...' },
        { title: 'Xác nhận & Lưu', desc: 'Hệ thống tự kiểm tra HV mới → gợi ý đăng ký nếu chưa có' },
        { title: 'Đối chiếu (tùy chọn)', desc: 'NVVP đánh dấu đã đối chiếu ngân hàng, Kế toán xuất hóa đơn' },
      ],
      warnings: [
        'Sách và Đồng phục KHÔNG thu ở đây — quản lý ở phân hệ Kho vật tư.',
        'Nếu sai thông tin giao dịch, có thể bấm "Sửa" trên bảng giao dịch — mọi thay đổi ghi log.',
      ],
    },
    {
      id: 'chi-phi',
      title: '📋 Chi phí',
      description: 'Ghi nhận các khoản chi tiêu của trung tâm',
      icon: <Receipt className="w-6 h-6" />,
      color: 'red',
      features: [
        'Ghi chi tiêu hàng ngày (điện, nước, vật tư, in ấn...)',
        'Phân loại chi phí: Cố định / Biến đổi',
        'Theo dõi chi phí theo tháng',
        'Xuất báo cáo chi phí',
        'Ghi chú chi tiết cho từng khoản chi',
      ],
      steps: [
        { title: 'Thêm khoản chi', desc: 'Bấm "Thêm chi phí" → Điền ngày, mô tả, số tiền, danh mục chi' },
        { title: 'Phân loại', desc: 'Chọn danh mục phù hợp: Tiền thuê, Điện nước, Vật tư VP, Marketing...' },
        { title: 'Xem tổng hợp', desc: 'Theo dõi tổng chi tháng, so sánh với doanh thu trên Báo cáo P&L' },
      ],
      warnings: [
        'Chi phí lương nhân viên được tính tự động từ Bảng lương — không cần nhập thủ công.',
      ],
    },
    {
      id: 'hoc-phi',
      title: '💵 Quản lý Học phí',
      description: 'Quản lý tình trạng đóng học phí — buổi còn lại — điều chỉnh HP',
      icon: <Wallet className="w-6 h-6" />,
      color: 'cyan',
      features: [
        'Tổng hợp buổi đã học vs buổi đã mua',
        'Cảnh báo HV sắp hết buổi (≤ 2 buổi) — highlight vàng/đỏ',
        'Dự đoán ngày hết buổi theo lịch học',
        'Xem biểu đồ lịch sử số dư từng HV',
        'Thay đổi học phí với 2 chế độ: Áp dụng toàn bộ (Retroactive) / Áp dụng từ bây giờ (Prospective)',
        'Tìm kiếm & lọc theo tên, lớp',
      ],
      steps: [
        { title: 'Xem dashboard', desc: 'Tổng quan tình trạng học phí toàn trường — thống kê nhanh trên đầu trang' },
        { title: 'Kiểm tra cảnh báo', desc: 'HV sắp hết buổi sẽ highlight đỏ/vàng — ưu tiên nhắc PH đóng tiền' },
        { title: 'Điều chỉnh học phí', desc: 'Bấm cột HP/buổi → nhập học phí mới → chọn Áp dụng toàn bộ hoặc Từ bây giờ' },
        { title: 'Xem chi tiết HV', desc: 'Bấm vào dòng HV → mở chi tiết: biểu đồ số dư, lịch sử giao dịch, lịch sử thay đổi HP' },
      ],
      warnings: [
        '"Áp dụng toàn bộ" tính lại tất cả buổi theo mức HP mới. "Áp dụng từ bây giờ" chỉ áp dụng cho buổi từ hôm nay.',
        'Ngày hết buổi dự đoán dựa trên lịch học của lớp — chỉ mang tính tham khảo.',
      ],
    },
    {
      id: 'nhac-ph',
      title: '📱 Nhắc Phụ huynh',
      description: 'Danh sách nhắc phụ huynh đóng tiền — tự động lọc theo cảnh báo',
      icon: <PhoneCall className="w-6 h-6" />,
      color: 'pink',
      features: [
        'Danh sách HV cần nhắc đóng tiền (tự động)',
        'Thông tin liên hệ phụ huynh (SĐT, Zalo)',
        'Tình trạng buổi còn lại',
        'Mẫu tin nhắn nhắc nhở tự động',
        'Ghi chú gọi điện, đánh dấu đã liên hệ',
        'Lọc theo mức độ ưu tiên',
      ],
      steps: [
        { title: 'Mở danh sách', desc: 'Hệ thống tự lọc HV sắp/đã hết buổi cần nhắc nhở' },
        { title: 'Liên hệ PH', desc: 'Gọi/nhắn tin theo SĐT phụ huynh hiển thị — có mẫu tin nhắn sẵn' },
        { title: 'Ghi nhận kết quả', desc: 'Đánh dấu đã liên hệ, ghi chú phản hồi (PH hẹn đóng ngày nào...)' },
      ],
    },
    {
      id: 'kho-vat-tu',
      title: '📦 Kho vật tư',
      description: 'Quản lý sách, đồng phục, vật tư — nhập/xuất kho — xuất cho học viên',
      icon: <Package className="w-6 h-6" />,
      color: 'indigo',
      features: [
        'Danh mục vật tư: Sách, Đồng phục, Văn phòng phẩm...',
        'Nhập kho: Mua mới, Kiểm kê mở đầu',
        'Xuất kho: Xuất cho HV, Hao hụt, Điều chỉnh',
        'Cảnh báo tồn kho thấp (dưới mức tối thiểu)',
        'Giá vốn & Giá bán riêng biệt',
        'Lịch sử giao dịch kho từng mặt hàng',
        'Tự động ghi nhận doanh thu khi xuất cho HV',
      ],
      steps: [
        { title: 'Thêm mặt hàng', desc: 'Bấm "Thêm mặt hàng" → Nhập tên, danh mục, đơn vị, giá vốn, giá bán, mức tồn kho tối thiểu' },
        { title: 'Nhập kho', desc: 'Chọn mặt hàng → Bấm "Nhập kho" → Nhập số lượng, giá vốn → hệ thống cập nhật tồn kho' },
        { title: 'Xuất cho HV', desc: 'Chọn mặt hàng → "Xuất cho HV" → chọn tên HV → hệ thống tạo giao dịch doanh thu tự động' },
        { title: 'Kiểm tra cảnh báo', desc: 'Mặt hàng dưới mức tồn kho tối thiểu sẽ hiển thị cảnh báo đỏ' },
      ],
      warnings: [
        'Sách và Đồng phục phải quản lý ở đây — KHÔNG nằm trong phân hệ Thu tiền.',
        'Khi xuất cho HV, giao dịch doanh thu sẽ tự tạo ở mục Thu tiền.',
      ],
    },
    {
      id: 'nhan-vien',
      title: '👥 Quản lý Nhân viên',
      description: 'Thêm/sửa nhân sự, cấu hình bảo hiểm, thuế TNCN & lịch sử lương',
      icon: <Briefcase className="w-6 h-6" />,
      color: 'orange',
      features: [
        'Thêm/sửa/xóa nhân viên, giáo viên, trợ giảng',
        'Gán vai trò: Admin / Giáo viên / Trợ giảng / Văn phòng',
        'Thiết lập lương cơ bản, đơn giá dạy/buổi hoặc đơn giá dạy/giờ',
        'Cấu hình đóng bảo hiểm: BHXH (8%), BHYT (1.5%), BHTN (1%) và mức lương đóng BH',
        'Cấu hình thuế TNCN: Không khấu trừ, Cố định % hoặc Lũy tiến từng phần (nhập người phụ thuộc)',
        'Lưu trữ lịch sử thay đổi lương (salaryHistory) theo tháng bắt đầu áp dụng',
        'Trạng thái hoạt động: Đang làm / Đã nghỉ',
      ],
      steps: [
        { title: 'Thêm nhân sự mới', desc: 'Nhập thông tin cá nhân cơ bản và chọn Chức vụ (ảnh hưởng đến cách tính lương dạy/buổi hoặc dạy/giờ).' },
        { title: 'Thiết lập Bảo hiểm & Thuế', desc: 'Tick chọn các loại bảo hiểm nhân sự cần đóng, điền mức lương đóng bảo hiểm (nếu khác lương cứng). Chọn phương pháp tính thuế TNCN phù hợp.' },
        { title: 'Cập nhật lương & Chọn tháng áp dụng', desc: 'Khi điều chỉnh lương cứng hoặc đơn giá dạy, hệ thống tự phát hiện thay đổi và hiển thị ô chọn "Tháng áp dụng". Hãy chọn tháng bắt đầu áp dụng mức lương mới này.' },
      ],
      warnings: [
        'Lịch sử lương sẽ được lưu trữ tự động. Khi tính lương tháng nào, hệ thống sẽ tự động quét để lấy mức lương có hiệu lực tại tháng đó (effectiveMonth <= tháng tính lương).',
        'Nếu nhân viên nghỉ việc nhưng vẫn có giờ dạy phát sinh hoặc có tạm ứng chưa thanh toán trong tháng, hệ thống vẫn sẽ tính lương đầy đủ cho nhân sự đó.',
      ],
    },
    {
      id: 'cham-cong',
      title: '⏱️ Chấm công GV & Trợ giảng',
      description: 'Ghi nhận buổi dạy — cơ sở tính lương giáo viên',
      icon: <ClipboardCheck className="w-6 h-6" />,
      color: 'amber',
      features: [
        'Tự động tạo buổi dạy khi điểm danh HV',
        'Thêm buổi dạy thủ công (với kiểm tra logic)',
        'Hỗ trợ dạy thay (GV khác dạy thay)',
        'Lọc theo GV, theo lớp, theo tháng',
        'Badge phân biệt: 🤖 Tự động / ✋ Thủ công',
        'Tính giờ dạy tự động',
      ],
      steps: [
        { title: 'Xem tổng hợp', desc: 'Dashboard hiển thị buổi dạy từng GV trong tháng' },
        { title: 'Kiểm tra chi tiết', desc: 'Lọc theo GV/Lớp → xem từng buổi dạy, thời gian, trạng thái' },
        { title: 'Thêm thủ công (nếu cần)', desc: 'Chọn GV + Lớp + Ngày → hệ thống kiểm tra logic: đã có buổi dạy chưa, có HV điểm danh không' },
        { title: 'Sửa khi dạy thay', desc: 'Nếu GV B dạy thay GV A → xóa buổi của GV A → thêm thủ công cho GV B' },
      ],
      warnings: [
        'Nếu tất cả HV vắng → hệ thống KHÔNG tạo buổi dạy (coi như buổi bị hủy).',
        'Chấm công tự động dựa trên điểm danh — chỉ thêm thủ công khi cần sửa.',
      ],
    },
    {
      id: 'ung-luong',
      title: '💸 Ứng lương',
      description: 'Nhân viên yêu cầu ứng lương — Admin duyệt/từ chối',
      icon: <HandCoins className="w-6 h-6" />,
      color: 'yellow',
      features: [
        'NV tạo yêu cầu ứng lương',
        'Admin duyệt hoặc từ chối với lý do',
        'Lịch sử ứng lương theo tháng',
        'Tự động trừ vào Bảng lương cuối tháng',
        'Hỗ trợ carry over khi ứng lương > lương tháng',
      ],
      steps: [
        { title: 'NV tạo yêu cầu', desc: 'Chọn nhân viên → nhập số tiền ứng, lý do → Gửi yêu cầu' },
        { title: 'Admin duyệt', desc: 'Xem danh sách chờ duyệt → Duyệt hoặc Từ chối (ghi lý do nếu từ chối)' },
        { title: 'Trừ lương tự động', desc: 'Khi tính lương cuối tháng → hệ thống tự trừ tổng ứng lương đã duyệt' },
      ],
      warnings: [
        'Nếu ứng lương > lương tháng → phần dư sẽ carry over sang tháng sau cho đến khi trả hết.',
      ],
    },
    {
      id: 'bang-luong',
      title: '💼 Bảng lương',
      description: 'Tính lương NV & GV cuối tháng — xuất bảng lương',
      icon: <Calculator className="w-6 h-6" />,
      color: 'lime',
      features: [
        'Tính tự động: Lương cơ bản + Buổi dạy × Đơn giá − Ứng lương',
        'Hỗ trợ lương khác (phụ cấp, thưởng, trừ KPI)',
        'Trừ ứng lương tự động',
        'Carry over khi ứng > lương',
        'Xuất bảng lương Excel',
      ],
      steps: [
        { title: 'Chọn tháng', desc: 'Vào Bảng lương → chọn tháng cần tính' },
        { title: 'Kiểm tra dữ liệu', desc: 'Xem buổi dạy từng GV, lương cơ bản, ứng lương — đảm bảo chính xác trước khi tính' },
        { title: 'Điều chỉnh (nếu cần)', desc: 'Thêm phụ cấp, thưởng hoặc trừ KPI cho từng NV' },
        { title: 'Xuất bảng lương', desc: 'Xuất file Excel để in ký nhận hoặc gửi cho NV' },
      ],
      warnings: [
        'Nên hoàn tất chấm công GV và duyệt ứng lương TRƯỚC khi tính bảng lương.',
      ],
    },
    {
      id: 'bao-cao',
      title: '📊 Báo cáo Thống kê',
      description: 'Các nhóm báo cáo phân tích dữ liệu toàn trường',
      icon: <BarChart3 className="w-6 h-6" />,
      color: 'rose',
      features: [
        'Tổng quan trung tâm — Dashboard KPI',
        'Báo cáo Học viên (tuyển mới, nghỉ, retention)',
        'Báo cáo Lớp học & Điểm danh (sĩ số, chuyên cần)',
        'Báo cáo Học phí & Công nợ',
        'Báo cáo Thu chi & Lợi nhuận (P&L 6 tháng)',
        'Báo cáo Nhân sự & Giáo viên (hiệu suất dạy)',
        'Đối soát & Nhật ký (audit log)',
        'Báo cáo Tuyển sinh (conversion funnel)',
        'Xuất Excel & PDF',
      ],
      steps: [
        { title: 'Chọn nhóm báo cáo', desc: 'Nhóm trong sidebar: Tổng quan / Học viên / Lớp học / Học phí / Thu chi / Nhân sự / Đối soát / Tuyển sinh' },
        { title: 'Xem & Phân tích', desc: 'Biểu đồ + bảng chi tiết + KPI cards — dữ liệu realtime từ hệ thống' },
        { title: 'Xuất báo cáo', desc: 'Bấm "Xuất Excel" hoặc "Báo cáo Kế toán" để lưu/in' },
      ],
      warnings: [
        'Chỉ Admin có quyền truy cập Báo cáo Thống kê.',
        'Dữ liệu P&L dựa trên thu thực tế và lương phát sinh — không phải dự toán.',
      ],
    },
    {
      id: 'cai-dat',
      title: '⚙️ Cài đặt hệ thống',
      description: 'Cấu hình trung tâm, danh mục thu, hình thức thanh toán, quản lý người dùng',
      icon: <Settings className="w-6 h-6" />,
      color: 'slate',
      features: [
        'Tên trung tâm, SĐT, email, logo',
        'Mục tiêu doanh thu hàng tháng',
        'Cấu hình danh mục loại khoản thu',
        'Cấu hình hình thức thanh toán',
        'Quản lý tài khoản đăng nhập (Người dùng)',
        'Thay đổi mật khẩu người dùng',
      ],
      steps: [
        { title: 'Thông tin trung tâm', desc: 'Vào Cài đặt → điền tên trung tâm, SĐT, email, upload logo' },
        { title: 'Mục tiêu doanh thu', desc: 'Nhập mức doanh thu mục tiêu/tháng → Dashboard sẽ hiển thị tiến độ' },
        { title: 'Danh mục thu', desc: 'Thêm/xóa loại khoản thu (Học phí offline, Lệ phí thi...) — loại này hiển thị ở Thu tiền' },
        { title: 'Hình thức TT', desc: 'Thêm/xóa hình thức thanh toán (Tiền mặt, CK, Momo, ZaloPay...)' },
        { title: 'Quản lý người dùng', desc: 'Vào Người dùng → Tạo tài khoản cho NV/GV → gán vai trò phù hợp' },
      ],
      warnings: [
        'Chỉ Admin mới có quyền truy cập Cài đặt và Người dùng.',
        'Nên cấu hình Cài đặt đầy đủ trước khi bắt đầu sử dụng hệ thống.',
      ],
    },
  ];

  const FAQ_ITEMS = [
    {
      q: 'Học viên mới vào trường, cần làm gì?',
      a: '① Vào Quản lý Học vụ → Học viên → Thêm HV (điền tên, lớp, SĐT PH, học phí/buổi). ② Hoặc khi thu tiền → hệ thống tự nhận diện HV mới và gợi ý đăng ký. ③ Hoặc dùng "Thêm HV nhanh" ngay trên Bàn làm việc.',
    },
    {
      q: 'Giáo viên A nghỉ, giáo viên B dạy thay — làm thế nào?',
      a: 'Khi điểm danh, hệ thống tự tạo buổi dạy cho GV chủ nhiệm. Nếu GV B dạy thay → vào Chấm công GV → xóa buổi của GV A → thêm buổi thủ công cho GV B tại lớp đó, ngày đó.',
    },
    {
      q: 'Học viên chuyển lớp giữa chừng?',
      a: 'Vào Học viên → Chọn HV → bấm nút Chuyển lớp. Hệ thống tự tính số tiền còn lại → quy đổi ra buổi học mới theo học phí lớp mới. Lịch sử giai đoạn học được ghi lại đầy đủ.',
    },
    {
      q: 'Sai thông tin giao dịch đã lưu?',
      a: 'Vào Thu tiền → Bảng giao dịch bên phải → Tìm giao dịch cần sửa → Bấm "Sửa". Mọi thay đổi đều được ghi log lịch sử chỉnh sửa (audit trail).',
    },
    {
      q: 'Nhân viên ứng lương nhiều hơn lương tháng?',
      a: 'Hệ thống cho phép trả số tiền ≤ lương tháng, phần ứng dư sẽ tự động carry over sang tháng sau cho đến khi trả hết.',
    },
    {
      q: 'Tất cả HV đều vắng buổi hôm đó?',
      a: 'Khi điểm danh tất cả Vắng → hệ thống KHÔNG tạo buổi dạy cho GV (coi như buổi bị hủy). GV không bị tính công buổi đó.',
    },
    {
      q: 'Làm sao biết HV nào sắp hết buổi?',
      a: 'Bàn làm việc có card "Sắp hết buổi" highlight đỏ/vàng. Tab Học phí hiển thị cảnh báo trên bảng. Tab Nhắc PH tự lọc danh sách cần nhắc nhở.',
    },
    {
      q: 'Muốn xem lợi nhuận trường?',
      a: 'Vào Báo cáo → Thu chi & Lợi nhuận → Biểu đồ P&L 6 tháng: Doanh thu − Chi phí − Lương = Lợi nhuận. Có cả Biên lợi nhuận % để đánh giá hiệu quả.',
    },
    {
      q: 'Sách, Đồng phục bán cho học viên thì nhập ở đâu?',
      a: 'Vào Kho vật tư → Chọn mặt hàng → "Xuất cho HV" → chọn HV → hệ thống tự tạo giao dịch doanh thu. KHÔNG nhập ở mục Thu tiền.',
    },
    {
      q: 'Lead tuyển sinh khác Học viên thế nào?',
      a: 'Lead là người quan tâm/chưa đăng ký (ở phân hệ Tuyển sinh). Khi Lead quyết định đăng ký → chuyển thành Học viên chính thức (tự động tạo trong Danh mục HV).',
    },
    {
      q: 'Giáo viên đăng nhập có thấy gì?',
      a: 'GV chỉ thấy: Trang GV (tổng quan buổi dạy) + Điểm danh (lớp mình chủ nhiệm). GV KHÔNG truy cập được: Tài chính, Nhân sự, Báo cáo, Cài đặt.',
    },
    {
      q: 'Muốn thay đổi học phí cho HV?',
      a: 'Vào Học phí → bấm cột HP/buổi của HV → nhập mức mới → chọn: "Áp dụng toàn bộ" (tính lại từ đầu) hoặc "Áp dụng từ bây giờ" (chỉ buổi mới). Lịch sử thay đổi HP được ghi lại.',
    },
    {
      q: 'Tôi muốn tăng lương/điều chỉnh lương cho nhân sự thì làm thế nào để không ảnh hưởng đến bảng lương tháng cũ?',
      a: 'Khi bạn bấm "Sửa" nhân viên và thay đổi mức lương cứng hoặc đơn giá dạy, hệ thống sẽ tự động hiển thị ô "Tháng áp dụng" (ví dụ: 2026-07). Khi bấm lưu, mức lương mới sẽ chỉ có hiệu lực từ tháng được chọn trở đi. Nếu bạn tính lại lương cho các tháng trước đó, hệ thống vẫn sẽ giữ nguyên mức lương cũ theo lịch sử lưu trữ, đảm bảo số liệu kế toán quá khứ không bị sai lệch.',
    },
    {
      q: 'Làm thế nào để cấu hình miễn đóng bảo hiểm xã hội hoặc thuế TNCN cho một số nhân viên cụ thể?',
      a: 'Trên Form Thêm/Sửa nhân sự, mục "Bảo hiểm & Thuế TNCN" cho phép bạn chọn đóng/không đóng riêng biệt. Để miễn trừ bảo hiểm, bạn chỉ cần bỏ tick chọn BHXH, BHYT, BHTN. Để miễn trừ thuế TNCN, tại mục "Khấu trừ Thuế TNCN" hãy chọn option "Không khấu trừ". Hệ thống sẽ tự động thiết lập số tiền khấu trừ bảo hiểm và thuế TNCN của nhân sự đó bằng 0đ khi tính bảng lương tháng.',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Hướng dẫn sử dụng</h2>
            <p className="text-indigo-200 text-sm">Kim Academy — Hệ thống Quản lý Trung tâm Toàn diện</p>
          </div>
        </div>
        <p className="text-indigo-100 text-sm mt-3 leading-relaxed">
          Ứng dụng giúp trung tâm Kim Academy quản lý toàn bộ quy trình: từ tuyển sinh, đăng ký học viên, thu học phí, 
          điểm danh, quản lý kho vật tư, chấm công giáo viên, tính lương đến báo cáo thống kê.
        </p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm flex-wrap">
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeSection === s.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* ═══ TỔNG QUAN ═══ */}
      {activeSection === 'overview' && (
        <div className="space-y-5">
          {/* Logic flow diagram */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" /> Logic hoạt động
            </h3>
            <div className="flex flex-wrap items-center gap-3 justify-center py-4">
              {[
                { label: 'Tuyển sinh', sub: 'Lead → HV mới', color: 'pink', icon: <UserPlus className="w-5 h-5" /> },
                { label: 'Danh mục', sub: 'HV + Lớp + NV', color: 'blue', icon: <FolderOpen className="w-5 h-5" /> },
                { label: 'Thu tiền', sub: 'Ghi nhận khoản thu', color: 'emerald', icon: <DollarSign className="w-5 h-5" /> },
                { label: 'Điểm danh', sub: 'Ghi nhận buổi học', color: 'amber', icon: <CalendarDays className="w-5 h-5" /> },
                { label: 'Kho vật tư', sub: 'Sách, Đồng phục', color: 'indigo', icon: <Package className="w-5 h-5" /> },
                { label: 'Chấm công', sub: 'Tự động từ ĐD', color: 'orange', icon: <ClipboardCheck className="w-5 h-5" /> },
                { label: 'Bảng lương', sub: 'Tính lương NV', color: 'lime', icon: <Calculator className="w-5 h-5" /> },
                { label: 'Báo cáo', sub: 'Phân tích KPI', color: 'rose', icon: <BarChart3 className="w-5 h-5" /> },
              ].map((step, i, arr) => (
                <React.Fragment key={i}>
                  <div className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl bg-${step.color}-50 border border-${step.color}-200 min-w-[100px]`}>
                    <div className={`text-${step.color}-600`}>{step.icon}</div>
                    <span className={`text-xs font-bold text-${step.color}-700`}>{step.label}</span>
                    <span className="text-[10px] text-slate-400">{step.sub}</span>
                  </div>
                  {i < arr.length - 1 && <ArrowRight className="w-5 h-5 text-slate-300 shrink-0" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Key principles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-emerald-600" />
              </div>
              <h4 className="font-bold text-slate-800 mb-1">Tự động hóa</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Điểm danh HV → Tự động tạo buổi dạy cho GV. Thu tiền → Tự động nhận diện HV mới. 
                Bảng lương → Tự động trừ ứng lương. Xuất kho cho HV → Tự động tạo doanh thu.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <h4 className="font-bold text-slate-800 mb-1">Kiểm tra & Cảnh báo</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cảnh báo điểm danh trùng. Kiểm tra logic chấm công thủ công. Cảnh báo HV sắp hết buổi.
                Cảnh báo tồn kho thấp. Validate dữ liệu nhập liệu.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
              <h4 className="font-bold text-slate-800 mb-1">Phân quyền</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Admin: Toàn quyền. Giáo viên: Chỉ xem lớp mình, điểm danh, không truy cập tài chính.
                Mỗi tài khoản đăng nhập riêng, bảo mật.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ QUY TRÌNH ═══ */}
      {activeSection === 'workflow' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-indigo-500" /> Quy trình sử dụng hàng ngày
          </h3>

          <div className="mb-8">
            <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" /> Thiết lập ban đầu (1 lần)
            </h4>
            <Step
              number={1}
              title="Tạo tài khoản Admin"
              description="Đăng nhập lần đầu với tài khoản mặc định, sau đó tạo tài khoản cho các nhân viên khác tại mục Người dùng."
              icon={<UserPlus className="w-4 h-4" />}
              color="indigo"
              tips={['Tài khoản mặc định: admin / 123456', 'Đổi mật khẩu ngay sau khi đăng nhập']}
            />
            <Step
              number={2}
              title="Cấu hình Cài đặt"
              description="Thiết lập tên trường, SĐT, email, logo, mục tiêu doanh thu, danh mục khoản thu, hình thức thanh toán."
              icon={<Settings className="w-4 h-4" />}
              color="slate"
              tips={['Cài đặt ảnh hưởng đến tiêu đề xuất báo cáo, hóa đơn', 'Mục tiêu doanh thu hiển thị trên Dashboard']}
            />
            <Step
              number={3}
              title="Thiết lập Nhân viên & Giáo viên"
              description="Vào Quản lý Nhân sự → Nhân viên → Thêm NV/GV (tên, vai trò, lương cơ bản, đơn giá dạy/buổi). Bước này cần làm trước khi tạo Lớp học."
              icon={<Briefcase className="w-4 h-4" />}
              color="orange"
              tips={['Thêm GV trước vì khi tạo lớp cần gán GV chủ nhiệm']}
            />
            <Step
              number={4}
              title="Tạo Lớp học & Thêm Học viên"
              description="Tạo Lớp (gán GV, sĩ số, lịch học, học phí mặc định) → Thêm Học viên (gán vào lớp, SĐT PH, HP/buổi)."
              icon={<FolderOpen className="w-4 h-4" />}
              color="blue"
              tips={['Tạo lớp trước vì khi thêm HV cần chọn lớp', 'Có thể nhập kho sách, đồng phục ở Kho vật tư trước khi bắt đầu dạy']}
            />
          </div>

          <div className="mb-8">
            <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Thao tác hàng ngày
            </h4>
            <Step
              number={5}
              title="Mở Bàn làm việc — Xem tổng quan ngày"
              description="Kiểm tra KPI hôm nay, lịch dạy, cảnh báo HV sắp hết buổi. Thao tác nhanh: Thu tiền, Ghi chi phí, Thêm HV."
              icon={<LayoutDashboard className="w-4 h-4" />}
              color="indigo"
            />
            <Step
              number={6}
              title="Thu tiền học phí"
              description="Khi phụ huynh đóng tiền → Vào Thu tiền (hoặc Thu tiền nhanh từ Bàn làm việc) → Điền form → Lưu."
              icon={<DollarSign className="w-4 h-4" />}
              color="emerald"
              tips={['Sách & Đồng phục → quản lý ở Kho vật tư, KHÔNG nhập ở Thu tiền']}
            />
            <Step
              number={7}
              title="Điểm danh buổi học"
              description="Đầu mỗi buổi học → Vào Điểm danh → Chọn lớp → Tick có mặt/vắng/phép → Lưu. Hệ thống tự tạo chấm công cho GV."
              icon={<CalendarDays className="w-4 h-4" />}
              color="amber"
              tips={['Nếu GV B dạy thay GV A → vào Chấm công sửa lại', 'Nếu tất cả HV vắng → không tạo buổi dạy cho GV']}
            />
            <Step
              number={8}
              title="Xuất sách/đồng phục cho HV (khi cần)"
              description="Khi HV mua sách hoặc đồng phục → Vào Kho vật tư → Chọn mặt hàng → Xuất cho HV → Hệ thống tự tạo giao dịch doanh thu."
              icon={<Package className="w-4 h-4" />}
              color="indigo"
            />
          </div>

          <div className="mb-8">
            <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Cuối tháng
            </h4>
            <Step
              number={9}
              title="Duyệt ứng lương (nếu có)"
              description="Kiểm tra và duyệt/từ chối các yêu cầu ứng lương của nhân viên. Số tiền đã duyệt sẽ tự trừ vào lương."
              icon={<HandCoins className="w-4 h-4" />}
              color="yellow"
            />
            <Step
              number={10}
              title="Tính lương & Xuất bảng lương"
              description="Vào Bảng lương → Chọn tháng → Hệ thống tự tính: Lương cơ bản + Buổi dạy × Đơn giá − Ứng lương = Thực nhận."
              icon={<Calculator className="w-4 h-4" />}
              color="lime"
              tips={['Hoàn tất chấm công và duyệt ứng lương TRƯỚC khi tính bảng lương']}
            />
            <Step
              number={11}
              title="Xem báo cáo & Phân tích"
              description="Vào Báo cáo → Dashboard KPI, P&L, Công nợ, Chuyên cần, Tuyển sinh. Xuất Excel/PDF nếu cần."
              icon={<BarChart3 className="w-4 h-4" />}
              color="rose"
            />
          </div>

          <div>
            <h4 className="text-xs font-bold text-cyan-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500" /> Khi cần
            </h4>
            <Step
              number={12}
              title="Nhắc phụ huynh đóng tiền"
              description="Khi HV sắp/đã hết buổi → Vào Nhắc PH → Danh sách tự động → Gọi/nhắn PH với mẫu tin nhắn có sẵn."
              icon={<PhoneCall className="w-4 h-4" />}
              color="pink"
            />
            <Step
              number={13}
              title="Chuyển lớp cho Học viên"
              description="Khi HV cần chuyển lớp → Vào Học viên → Chọn HV → Chuyển lớp → Hệ thống tự tính lại buổi học theo HP mới."
              icon={<ArrowRight className="w-4 h-4" />}
              color="violet"
            />
          </div>
        </div>
      )}

      {/* ═══ PHÂN HỆ ═══ */}
      {activeSection === 'modules' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 mb-2">Bấm vào từng phân hệ để xem chi tiết tính năng, các bước thực hiện và lưu ý quan trọng.</p>
          {MODULES.map(m => (
            <ModuleCard
              key={m.id}
              {...m}
              isExpanded={expandedModule === m.id}
              onToggle={() => setExpandedModule(expandedModule === m.id ? null : m.id)}
            />
          ))}
        </div>
      )}

      {/* ═══ HỎI ĐÁP ═══ */}
      {activeSection === 'faq' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 mb-2">Các câu hỏi thường gặp khi sử dụng hệ thống.</p>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-indigo-200 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{item.q}</h4>
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{item.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
