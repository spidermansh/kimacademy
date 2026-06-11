import React, { useState } from 'react';
import {
  BookOpen, Users, DollarSign, CalendarDays, Wallet, PhoneCall,
  Briefcase, ClipboardCheck, HandCoins, Calculator, BarChart3,
  ChevronDown, ChevronRight, CheckCircle2, ArrowRight, Lightbulb,
  GraduationCap, FolderOpen, Settings, UserPlus, ListChecks,
  Zap, Shield, HelpCircle, PlayCircle,
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
}

const ModuleCard: React.FC<ModuleCardProps> = ({ title, description, icon, color, features, isExpanded, onToggle, steps }) => (
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
      id: 'danh-muc',
      title: '📂 Danh mục',
      description: 'Thiết lập dữ liệu nền tảng: Học viên, Lớp học, Nhân viên',
      icon: <FolderOpen className="w-6 h-6" />,
      color: 'indigo',
      features: [
        'Thêm/sửa/xóa học viên',
        'Quản lý thông tin chi tiết HV',
        'Tạo và quản lý lớp học',
        'Gán giáo viên chủ nhiệm cho lớp',
        'Thêm/sửa nhân viên & giáo viên',
        'Chuyển lớp, thay đổi trạng thái HV',
      ],
      steps: [
        { title: 'Tạo Lớp học', desc: 'Vào Danh mục → Lớp học → Thêm lớp mới (tên, sĩ số tối đa, giáo viên chủ nhiệm)' },
        { title: 'Thêm Nhân viên/GV', desc: 'Vào Danh mục → Nhân viên → Thêm NV (tên, vai trò, lương cơ bản, SĐT)' },
        { title: 'Thêm Học viên', desc: 'Vào Danh mục → Học viên → Thêm HV (tên, lớp, SĐT phụ huynh, học phí/buổi)' },
        { title: 'Gán HV vào Lớp', desc: 'Chọn lớp khi tạo HV, hoặc dùng chức năng Chuyển lớp sau đó' },
      ],
    },
    {
      id: 'thu-tien',
      title: '💰 Thu tiền',
      description: 'Ghi nhận khoản thu từ học viên — giao diện chính hàng ngày',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'emerald',
      features: [
        'Form thu tiền nhanh chóng',
        'Tự động nhận diện HV mới',
        'Chọn hình thức: Tiền mặt / Chuyển khoản',
        'Phân loại doanh thu (Offline, Online, Sách...)',
        'Đối chiếu ngân hàng (Reconcile)',
        'Xuất hóa đơn',
        'Lịch sử chỉnh sửa giao dịch',
      ],
      steps: [
        { title: 'Nhập thông tin', desc: 'Điền tên HV, lớp, kỳ học, số tiền, hình thức thanh toán' },
        { title: 'Chọn loại doanh thu', desc: 'Học phí offline, online, sách vở, đồng phục...' },
        { title: 'Xác nhận & Lưu', desc: 'Hệ thống tự kiểm tra HV mới → gợi ý đăng ký' },
        { title: 'Đối chiếu (tùy chọn)', desc: 'Đánh dấu đã đối chiếu ngân hàng, xuất hóa đơn' },
      ],
    },
    {
      id: 'diem-danh',
      title: '📅 Điểm danh',
      description: 'Điểm danh học viên theo buổi học — cơ sở tính buổi còn lại',
      icon: <CalendarDays className="w-6 h-6" />,
      color: 'amber',
      features: [
        'Chọn lớp → hiển thị danh sách HV',
        'Điểm danh: Có mặt / Vắng / Phép',
        'Cảnh báo đã điểm danh (tránh trùng)',
        'Xem lịch sử điểm danh',
        'Tự động tạo buổi dạy cho GV khi điểm danh',
      ],
      steps: [
        { title: 'Chọn ngày & lớp', desc: 'Chọn ngày cần điểm danh, chọn lớp học' },
        { title: 'Đánh dấu trạng thái', desc: 'Tick Có mặt / Vắng / Phép cho từng HV' },
        { title: 'Xác nhận', desc: 'Bấm Lưu → hệ thống tự tạo TeachingLog cho GV chủ nhiệm' },
        { title: 'Kiểm tra cảnh báo', desc: 'Nếu đã điểm danh rồi → hệ thống cảnh báo, hướng dẫn qua Lịch sử sửa' },
      ],
    },
    {
      id: 'hoc-phi',
      title: '💵 Học phí',
      description: 'Quản lý tình trạng đóng học phí — buổi còn lại — nhắc nhở',
      icon: <Wallet className="w-6 h-6" />,
      color: 'cyan',
      features: [
        'Tổng hợp buổi đã học vs buổi đã mua',
        'Cảnh báo HV sắp hết buổi (≤ 2 buổi)',
        'Lịch sử đóng tiền từng HV',
        'Thay đổi học phí (hồi tố / từ nay)',
      ],
      steps: [
        { title: 'Xem dashboard', desc: 'Tổng quan tình trạng học phí toàn trường' },
        { title: 'Kiểm tra cảnh báo', desc: 'HV sắp hết buổi sẽ highlight đỏ/vàng' },
        { title: 'Nhắc phụ huynh', desc: 'Bấm vào HV → xem chi tiết → liên hệ PH' },
      ],
    },
    {
      id: 'nhac-ph',
      title: '📱 Nhắc Phụ huynh',
      description: 'Tự động tạo danh sách nhắc phụ huynh đóng tiền',
      icon: <PhoneCall className="w-6 h-6" />,
      color: 'pink',
      features: [
        'Danh sách HV cần nhắc đóng tiền',
        'Thông tin liên hệ phụ huynh',
        'Tình trạng buổi còn lại',
        'Ghi chú gọi điện',
      ],
      steps: [
        { title: 'Mở danh sách', desc: 'Hệ thống tự lọc HV sắp/đã hết buổi' },
        { title: 'Liên hệ PH', desc: 'Gọi/nhắn tin theo SĐT phụ huynh hiển thị' },
        { title: 'Ghi nhận kết quả', desc: 'Đánh dấu đã liên hệ, ghi chú phản hồi' },
      ],
    },
    {
      id: 'cham-cong',
      title: '⏱️ Chấm công GV',
      description: 'Ghi nhận buổi dạy — cơ sở tính lương giáo viên',
      icon: <ClipboardCheck className="w-6 h-6" />,
      color: 'amber',
      features: [
        'Tự động từ điểm danh HV',
        'Thêm thủ công (kiểm tra logic)',
        'Hỗ trợ dạy thay (GV khác dạy thay)',
        'Lọc theo GV, theo lớp',
        'Badge phân biệt: Tự động / Thủ công',
      ],
      steps: [
        { title: 'Xem tổng hợp', desc: 'Dashboard hiển thị buổi dạy từng GV trong tháng' },
        { title: 'Kiểm tra chi tiết', desc: 'Lọc theo GV/Lớp → xem từng buổi dạy' },
        { title: 'Thêm thủ công (nếu cần)', desc: 'Chọn GV + Lớp + Ngày → hệ thống kiểm tra logic với điểm danh' },
      ],
    },
    {
      id: 'luong',
      title: '💼 Lương & Ứng lương',
      description: 'Tính lương, ứng lương, bảng lương tháng',
      icon: <Calculator className="w-6 h-6" />,
      color: 'lime',
      features: [
        'Ứng lương: Duyệt/Từ chối',
        'Bảng lương: Lương cơ bản + buổi dạy × đơn giá',
        'Trừ ứng lương tự động',
        'Xử lý ứng lương > lương tháng (carry over)',
        'Xuất bảng lương',
      ],
      steps: [
        { title: 'Duyệt ứng lương', desc: 'NV yêu cầu → Admin duyệt hoặc từ chối' },
        { title: 'Tính lương', desc: 'Cuối tháng → Bảng lương → Chọn tháng → Tự động tính' },
        { title: 'Kiểm tra & Xuất', desc: 'Xem chi tiết lương từng NV → Xuất file' },
      ],
    },
    {
      id: 'bao-cao',
      title: '📊 Báo cáo Thống kê',
      description: '12 báo cáo phân tích dữ liệu toàn trường',
      icon: <BarChart3 className="w-6 h-6" />,
      color: 'rose',
      features: [
        'Dashboard tổng quan KPI',
        'Báo cáo tài chính (ngày/tháng/tuỳ chọn)',
        'P&L — Lợi nhuận (6 tháng)',
        'Công nợ học viên',
        'Hiệu suất giáo viên',
        'Tuyển sinh & Retention',
        'Sĩ số lớp, Chuyên cần',
        'DT theo lớp/GV, CP nhân sự',
        'Xuất Excel & PDF',
      ],
      steps: [
        { title: 'Chọn báo cáo', desc: 'Nhóm: Tổng quan / Tài chính / Học vụ' },
        { title: 'Xem & Phân tích', desc: 'Biểu đồ + bảng chi tiết + KPI cards' },
        { title: 'Xuất báo cáo', desc: 'Xuất Excel hoặc PDF để in/gửi' },
      ],
    },
  ];

  const FAQ_ITEMS = [
    {
      q: 'Học viên mới vào trường, cần làm gì?',
      a: '① Vào Danh mục → Thêm Học viên (điền tên, lớp, SĐT PH, học phí/buổi). ② Khi thu tiền lần đầu, hệ thống sẽ tự nhận diện HV mới và gợi ý đăng ký nếu chưa có trong danh mục.',
    },
    {
      q: 'Giáo viên A nghỉ, giáo viên B dạy thay — làm thế nào?',
      a: 'Khi điểm danh, hệ thống sẽ tạo buổi dạy cho GV chủ nhiệm. Nếu GV B dạy thay, vào Chấm công GV → xóa buổi của GV A → thêm buổi thủ công cho GV B tại lớp đó, ngày đó.',
    },
    {
      q: 'Học viên chuyển lớp giữa chừng?',
      a: 'Vào Danh mục → Học viên → Chọn HV → Chuyển lớp. Hệ thống ghi lại lịch sử chuyển lớp, số buổi đã học được giữ nguyên.',
    },
    {
      q: 'Sai thông tin giao dịch đã lưu?',
      a: 'Vào Thu tiền → Bảng giao dịch → Tìm giao dịch cần sửa → Bấm Sửa. Mọi thay đổi đều được ghi log lịch sử chỉnh sửa.',
    },
    {
      q: 'Nhân viên ứng lương nhiều hơn lương tháng?',
      a: 'Hệ thống cho phép trả số tiền ≤ lương tháng, phần còn lại sẽ tự động carry over sang tháng sau cho đến khi trả hết.',
    },
    {
      q: 'Tất cả HV đều vắng buổi hôm đó?',
      a: 'Khi điểm danh tất cả Vắng → hệ thống KHÔNG tạo buổi dạy cho GV (coi như buổi bị hủy). GV không bị tính công buổi đó.',
    },
    {
      q: 'Làm sao biết HV nào sắp hết buổi?',
      a: 'Dashboard tổng quan có card "Sắp hết buổi (≤ 2)" highlight vàng/đỏ. Ngoài ra, tab Học phí và Nhắc PH đều hiển thị danh sách.',
    },
    {
      q: 'Muốn xem lợi nhuận trường?',
      a: 'Vào Báo cáo → P&L → Biểu đồ 6 tháng: Doanh thu - Chi phí lương = Lợi nhuận. Có cả Biên lợi nhuận % để đánh giá hiệu quả.',
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
            <p className="text-indigo-200 text-sm">Kim Academy — Hệ thống Quản lý Thu tiền & Nhân sự</p>
          </div>
        </div>
        <p className="text-indigo-100 text-sm mt-3 leading-relaxed">
          Ứng dụng giúp trung tâm Kim Academy quản lý toàn bộ quy trình: từ đăng ký học viên, thu học phí, 
          điểm danh, chấm công giáo viên đến tính lương và báo cáo thống kê.
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
                { label: 'Danh mục', sub: 'HV + Lớp + NV', color: 'indigo', icon: <FolderOpen className="w-5 h-5" /> },
                { label: 'Thu tiền', sub: 'Ghi nhận khoản thu', color: 'emerald', icon: <DollarSign className="w-5 h-5" /> },
                { label: 'Điểm danh', sub: 'Ghi nhận buổi học', color: 'amber', icon: <CalendarDays className="w-5 h-5" /> },
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
                Bảng lương → Tự động trừ ứng lương.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <h4 className="font-bold text-slate-800 mb-1">Kiểm tra & Cảnh báo</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cảnh báo điểm danh trùng. Kiểm tra logic chấm công thủ công. Cảnh báo HV sắp hết buổi.
                Validate dữ liệu nhập liệu.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
              <h4 className="font-bold text-slate-800 mb-1">Phân quyền</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Admin: Toàn quyền. Giáo viên: Chỉ xem lớp mình, điểm danh, không truy cập tài chính.
                Mỗi tài khoản đăng nhập riêng.
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
              title="Thiết lập Danh mục"
              description="Tạo Lớp học trước → Thêm Nhân viên/GV → Thêm Học viên (gán vào lớp). Đây là bước nền tảng cho mọi thao tác sau."
              icon={<FolderOpen className="w-4 h-4" />}
              color="violet"
              tips={['Tạo lớp trước vì khi thêm HV cần chọn lớp', 'Thêm GV trước vì khi tạo lớp cần gán GV chủ nhiệm']}
            />
            <Step
              number={3}
              title="Cấu hình Cài đặt"
              description="Thiết lập tên trường, thông tin liên hệ, mục tiêu doanh thu tháng tại mục Cài đặt."
              icon={<Settings className="w-4 h-4" />}
              color="slate"
            />
          </div>

          <div className="mb-8">
            <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Thao tác hàng ngày
            </h4>
            <Step
              number={4}
              title="Thu tiền học phí"
              description="Khi phụ huynh đóng tiền → Vào Thu tiền → Điền form → Lưu. Hệ thống tự phân loại doanh thu và cập nhật buổi còn lại."
              icon={<DollarSign className="w-4 h-4" />}
              color="emerald"
              tips={['Nếu HV chưa có trong danh mục → hệ thống gợi ý đăng ký mới']}
            />
            <Step
              number={5}
              title="Điểm danh buổi học"
              description="Đầu mỗi buổi học → Vào Điểm danh → Chọn lớp → Tick có mặt/vắng/phép → Lưu. Hệ thống tự tạo chấm công cho GV."
              icon={<CalendarDays className="w-4 h-4" />}
              color="amber"
              tips={['Nếu GV B dạy thay GV A → vào Chấm công sửa lại', 'Nếu tất cả HV vắng → không tạo buổi dạy']}
            />
          </div>

          <div className="mb-8">
            <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Cuối tháng
            </h4>
            <Step
              number={6}
              title="Duyệt ứng lương (nếu có)"
              description="Kiểm tra và duyệt/từ chối các yêu cầu ứng lương của nhân viên."
              icon={<HandCoins className="w-4 h-4" />}
              color="yellow"
            />
            <Step
              number={7}
              title="Tính lương & Xuất bảng lương"
              description="Vào Bảng lương → Chọn tháng → Hệ thống tự tính: Lương cơ bản + Buổi dạy × Đơn giá - Ứng lương = Thực nhận."
              icon={<Calculator className="w-4 h-4" />}
              color="lime"
            />
            <Step
              number={8}
              title="Xem báo cáo & Phân tích"
              description="Vào Báo cáo → Dashboard để xem KPI, P&L, Công nợ, Chuyên cần. Xuất Excel/PDF nếu cần gửi cho ban giám đốc."
              icon={<BarChart3 className="w-4 h-4" />}
              color="rose"
            />
          </div>

          <div>
            <h4 className="text-xs font-bold text-cyan-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500" /> Khi cần
            </h4>
            <Step
              number={9}
              title="Nhắc phụ huynh đóng tiền"
              description="Khi HV sắp/đã hết buổi → Vào Nhắc PH → Danh sách tự động → Gọi/nhắn PH."
              icon={<PhoneCall className="w-4 h-4" />}
              color="pink"
            />
          </div>
        </div>
      )}

      {/* ═══ PHÂN HỆ ═══ */}
      {activeSection === 'modules' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 mb-2">Bấm vào từng phân hệ để xem chi tiết tính năng và hướng dẫn các bước thực hiện.</p>
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
