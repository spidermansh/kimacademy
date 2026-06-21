import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api, formatDate } from '../../shared/utils';
import { useToast } from '../components/Toast';
import {
  Users, Plus, Pencil, X, Search, Phone, Calendar, BookOpen,
  GraduationCap, ArrowRight, Download, History, UserPlus,
  AlertTriangle, Check, ShieldAlert, HelpCircle, Award, ClipboardCheck,
  ChevronRight, RefreshCw, Trash2, LayoutGrid, List, MoreHorizontal, MoreVertical,
  ChevronDown, ChevronUp, Clock, FileText, CheckCircle2, UserCheck
} from 'lucide-react';
import DateInput from '../components/ui/DateInput';
import { AdmissionLead } from '../../shared/types';


interface AdmissionLeadFormData {
  studentName: string;
  dateOfBirth: string;
  address: string;
  parentName: string;
  parentPhone: string;
  parentZalo: string;
  source: string;
  learningNeed: string;
  consultationNote: string;
  assignedCounselor: string;
  registrationDate: string;
  testScheduleDate: string;
  testScheduleTime: string;
  testAssignee: string;
  testScheduleNote: string;
}

const EMPTY_FORM: AdmissionLeadFormData = {
  studentName: '',
  dateOfBirth: '',
  address: '',
  parentName: '',
  parentPhone: '',
  parentZalo: '',
  source: 'Facebook',
  learningNeed: '',
  consultationNote: '',
  assignedCounselor: '',
  registrationDate: new Date().toISOString().slice(0, 10),
  testScheduleDate: new Date().toISOString().slice(0, 10),
  testScheduleTime: '18:00',
  testAssignee: '',
  testScheduleNote: '',
};

const STATUS_LABELS: Record<AdmissionLead['status'], string> = {
  new_registration: 'Mới đăng ký',
  test_scheduled: 'Đã hẹn test',
  tested: 'Đã test',
  rejected: 'Không nhận',
  accepted_waiting_class: 'Nhận chờ xếp lớp',
  converted_waiting_class: 'Chờ xếp lớp (Đã tạo HV)',
  converted_assigned_class: 'Đã xếp lớp chính thức',
  cancelled: 'Đã hủy',
};

const STATUS_COLORS: Record<AdmissionLead['status'], string> = {
  new_registration: 'bg-blue-50 text-blue-700 border-blue-200',
  test_scheduled: 'bg-amber-50 text-amber-700 border-amber-200',
  tested: 'bg-purple-50 text-purple-700 border-purple-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  accepted_waiting_class: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  converted_waiting_class: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  converted_assigned_class: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-slate-50 text-slate-700 border-slate-200',
};

export default function AdmissionManagement() {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<{ role: string; name: string } | null>(null);
  const [leads, setLeads] = useState<AdmissionLead[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  // Custom UI view states
  const [viewMode, setViewMode] = useState<'pipeline' | 'table'>('pipeline');
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [activeDropdownLeadId, setActiveDropdownLeadId] = useState<string | null>(null);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // Modals & Forms State
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<AdmissionLead | null>(null);
  const [form, setForm] = useState<AdmissionLeadFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Schedule Test Modal State
  const [scheduleLead, setScheduleLead] = useState<AdmissionLead | null>(null);
  const [testScheduleDate, setTestScheduleDate] = useState('');
  const [testScheduleTime, setTestScheduleTime] = useState('');
  const [testAssignee, setTestAssignee] = useState('');
  const [testScheduleNote, setTestScheduleNote] = useState('');

  // Test Result Modal State
  const [resultLead, setResultLead] = useState<AdmissionLead | null>(null);
  const [testDate, setTestDate] = useState('');
  const [testType, setTestType] = useState('Đầu vào General');
  const [testScore, setTestScore] = useState('');
  const [suggestedLevel, setSuggestedLevel] = useState('');
  const [testNote, setTestNote] = useState('');
  const [testResultNote, setTestResultNote] = useState('');

  // Reject Modal State
  const [rejectLead, setRejectLead] = useState<AdmissionLead | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Convert Modal State
  const [convertLead, setConvertLead] = useState<AdmissionLead | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');

  // Duplicate Warning Modal State
  const [duplicateWarning, setDuplicateWarning] = useState<{
    lead: AdmissionLead;
    existingStudent: any;
    classId: string;
  } | null>(null);

  // Load user info
  useEffect(() => {
    const userStr = localStorage.getItem('kim_academy_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Fetch Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsData, classesData, summaryData] = await Promise.all([
        api.getAdmissionLeads(),
        api.getClasses(),
        api.getAdmissionSummary()
      ]);
      setLeads(leadsData);
      setClasses(classesData);
      setSummary(summaryData);
    } catch (err: any) {
      toast.error('Lỗi tải dữ liệu tuyển sinh', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-trigger]') && !target.closest('[data-dropdown-menu]')) {
        setActiveDropdownLeadId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  // Filters Options
  const sources = useMemo(() => {
    return [...new Set(leads.map(l => l.source).filter(Boolean))];
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const searchLower = searchText.toLowerCase().trim();
      const matchSearch = !searchLower ||
        l.studentName.toLowerCase().includes(searchLower) ||
        l.parentPhone.includes(searchLower) ||
        (l.leadCode && l.leadCode.toLowerCase().includes(searchLower));

      const matchStatus = !filterStatus || l.status === filterStatus;
      const matchSource = !filterSource || l.source === filterSource;
      const matchMonth = !filterMonth || l.registrationDate.startsWith(filterMonth);

      return matchSearch && matchStatus && matchSource && matchMonth;
    });
  }, [leads, searchText, filterStatus, filterSource, filterMonth]);

  // Handle Create/Edit Submit
  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentName.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập tên học viên!');
      return;
    }
    if (!form.parentPhone.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập SĐT phụ huynh!');
      return;
    }
    if (!form.testScheduleDate) {
      toast.warning('Thiếu thông tin', 'Vui lòng chọn ngày hẹn test!');
      return;
    }
    if (!form.testAssignee.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập người phụ trách test!');
      return;
    }

    // Duplicate checks for lead creation
    if (!editingLead) {
      const matchingPhone = leads.find(l => 
        l.parentPhone === form.parentPhone && 
        !['converted_waiting_class', 'converted_assigned_class', 'rejected', 'cancelled'].includes(l.status)
      );

      const matchingBoth = leads.find(l => 
        l.studentName.toLowerCase() === form.studentName.toLowerCase() && 
        l.parentPhone === form.parentPhone
      );

      if (matchingBoth) {
        const confirm = await toast.confirm({
          title: '⚠️ CẢNH BÁO TRÙNG MẠNH!',
          message: `Học viên "${form.studentName}" với số điện thoại ${form.parentPhone} đã tồn tại trong danh sách tuyển sinh.\n\nBạn vẫn chắc chắn muốn tạo hồ sơ tuyển sinh mới?`,
          confirmText: 'Vẫn tạo mới',
          cancelText: 'Hủy'
        });
        if (!confirm) return;
      } else if (matchingPhone) {
        const confirm = await toast.confirm({
          title: '⚠️ Cảnh báo trùng SĐT!',
          message: `Số điện thoại ${form.parentPhone} đã có trong danh sách tuyển sinh của học viên "${matchingPhone.studentName}".\n\nBạn vẫn muốn tạo hồ sơ tuyển sinh mới?`,
          confirmText: 'Vẫn tạo mới',
          cancelText: 'Hủy'
        });
        if (!confirm) return;
      }
    }

    setSaving(true);
    try {
      const submitForm = {
        ...form,
        status: editingLead ? editingLead.status : 'test_scheduled'
      };
      if (editingLead) {
        await api.updateAdmissionLead(editingLead.id, submitForm);
        toast.success('Đã cập nhật hồ sơ tuyển sinh!', form.studentName);
      } else {
        await api.createAdmissionLead(submitForm);
        toast.success('Đã đăng ký tuyển sinh mới thành công!', form.studentName);
      }
      setShowForm(false);
      setEditingLead(null);
      await loadData();
    } catch (err: any) {
      toast.error('Lỗi lưu hồ sơ tuyển sinh', err.message);
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setEditingLead(null);
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      ...EMPTY_FORM,
      registrationDate: today,
      testScheduleDate: today,
      testScheduleTime: '18:00',
    });
    setShowForm(true);
  };

  const openEdit = (lead: AdmissionLead) => {
    setEditingLead(lead);
    setForm({
      studentName: lead.studentName || '',
      dateOfBirth: lead.dateOfBirth || '',
      address: lead.address || '',
      parentName: lead.parentName || '',
      parentPhone: lead.parentPhone || '',
      parentZalo: lead.parentZalo || '',
      source: lead.source || 'Facebook',
      learningNeed: lead.learningNeed || '',
      consultationNote: lead.consultationNote || '',
      assignedCounselor: lead.assignedCounselor || '',
      registrationDate: lead.registrationDate || new Date().toISOString().slice(0, 10),
      testScheduleDate: lead.testScheduleDate || new Date().toISOString().slice(0, 10),
      testScheduleTime: lead.testScheduleTime || '18:00',
      testAssignee: lead.testAssignee || '',
      testScheduleNote: lead.testScheduleNote || '',
    });
    setShowForm(true);
  };

  // Schedule Test Submit
  const handleScheduleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleLead) return;
    if (!testScheduleDate) {
      toast.warning('Thiếu thông tin', 'Vui lòng chọn ngày hẹn test!');
      return;
    }

    try {
      await api.scheduleAdmissionTest(scheduleLead.id, {
        testScheduleDate,
        testScheduleTime,
        testAssignee,
        testScheduleNote,
      });
      toast.success('Đã hẹn lịch test!', scheduleLead.studentName);
      setScheduleLead(null);
      await loadData();
    } catch (err: any) {
      toast.error('Lỗi khi hẹn lịch test', err.message);
    }
  };

  const openSchedule = (lead: AdmissionLead) => {
    setScheduleLead(lead);
    setTestScheduleDate(lead.testScheduleDate || new Date().toISOString().slice(0, 10));
    setTestScheduleTime(lead.testScheduleTime || '18:00');
    setTestAssignee(lead.testAssignee || '');
    setTestScheduleNote(lead.testScheduleNote || '');
  };

  // Test Result Submit
  const handleTestResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultLead) return;
    if (!testDate) {
      toast.warning('Thiếu thông tin', 'Vui lòng chọn ngày thực hiện test!');
      return;
    }

    try {
      await api.updateAdmissionTestResult(resultLead.id, {
        testDate,
        testType,
        testScore,
        suggestedLevel,
        testNote,
        testResultNote,
      });
      toast.success('Đã cập nhật kết quả test!', resultLead.studentName);
      setResultLead(null);
      await loadData();
    } catch (err: any) {
      toast.error('Lỗi khi lưu kết quả test', err.message);
    }
  };

  const openTestResult = (lead: AdmissionLead) => {
    setResultLead(lead);
    setTestDate(lead.testDate || new Date().toISOString().slice(0, 10));
    setTestType(lead.testType || 'Đầu vào General');
    setTestScore(lead.testScore ? String(lead.testScore) : '');
    setSuggestedLevel(lead.suggestedLevel || '');
    setTestNote(lead.testNote || '');
    setTestResultNote(lead.testResultNote || '');
  };

  // Reject Submit
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectLead) return;
    if (!rejectionReason.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập lý do từ chối!');
      return;
    }

    try {
      await api.rejectAdmissionLead(rejectLead.id, rejectionReason.trim());
      toast.success('Đã đánh dấu không nhận hồ sơ!', rejectLead.studentName);
      setRejectLead(null);
      setRejectionReason('');
      await loadData();
    } catch (err: any) {
      toast.error('Lỗi khi từ chối hồ sơ', err.message);
    }
  };

  // Accept Waiting Class
  const handleAcceptWaitingClass = async (lead: AdmissionLead) => {
    try {
      await api.acceptAdmissionLeadWaitingClass(lead.id);
      toast.success('Đã nhận hồ sơ và chuyển trạng thái Chờ xếp lớp!', lead.studentName);
      await loadData();
    } catch (err: any) {
      toast.error('Lỗi khi cập nhật trạng thái', err.message);
    }
  };

  // Convert to Student Submit
  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertLead) return;

    try {
      const result = await api.convertAdmissionLeadToStudent(convertLead.id, {
        classId: selectedClassId || undefined
      });

      if (result.duplicateDetected) {
        // Show duplicate warning modal
        setDuplicateWarning({
          lead: convertLead,
          existingStudent: result.existingStudent,
          classId: selectedClassId
        });
        setConvertLead(null);
      } else {
        toast.success(
          'Đã chuyển học viên chính thức thành công!',
          `${convertLead.studentName} ${selectedClassId ? '-> Lớp mới' : '(Chờ xếp lớp)'}`
        );
        setConvertLead(null);
        setSelectedClassId('');
        await loadData();
      }
    } catch (err: any) {
      toast.error('Lỗi khi chuyển đổi học viên', err.message);
    }
  };

  // Confirm Convert Duplicate
  const handleConfirmConvertDuplicate = async () => {
    if (!duplicateWarning) return;
    if (!isAdmin) {
      toast.error('Quyền truy cập bị từ chối', 'Chỉ tài khoản Admin mới được phép chấp nhận chuyển trùng học viên!');
      return;
    }

    try {
      const result = await api.convertAdmissionLeadToStudent(duplicateWarning.lead.id, {
        classId: duplicateWarning.classId || undefined,
        confirmDuplicate: true
      });

      toast.success(
        'Đã ghi nhận học viên trùng và chuyển đổi thành công!',
        duplicateWarning.lead.studentName
      );
      setDuplicateWarning(null);
      setSelectedClassId('');
      await loadData();
    } catch (err: any) {
      toast.error('Lỗi chuyển trùng học viên', err.message);
    }
  };

  // Conversion rates calculations helper
  const conversionStats = useMemo(() => {
    if (!summary) return { rate: 0, waiting: 0, total: 0 };
    return {
      rate: summary.conversionRate || 0,
      waiting: summary.waitingLeads?.length || 0,
      total: summary.stats?.total || 0,
    };
  }, [summary]);

  // Group leads for pipeline columns (4 Columns flow)
  const col1Leads = useMemo(() => filteredLeads.filter(l => l.status === 'test_scheduled'), [filteredLeads]);
  const col2Leads = useMemo(() => filteredLeads.filter(l => l.status === 'tested'), [filteredLeads]);
  const col3Leads = useMemo(() => filteredLeads.filter(l => ['accepted_waiting_class', 'converted_waiting_class'].includes(l.status)), [filteredLeads]);
  const col4Leads = useMemo(() => filteredLeads.filter(l => ['converted_assigned_class', 'rejected', 'cancelled'].includes(l.status)), [filteredLeads]);

  // Dropdown menu items generator
  const renderDropdownItems = (lead: AdmissionLead) => {
    const showSchedule = !['converted_waiting_class', 'converted_assigned_class', 'rejected', 'cancelled'].includes(lead.status);
    const showTestResult = lead.status === 'test_scheduled';
    const showReject = !['converted_waiting_class', 'converted_assigned_class', 'rejected', 'cancelled'].includes(lead.status);
    const showAcceptWaiting = ['tested'].includes(lead.status);
    const showConvert = !['converted_waiting_class', 'converted_assigned_class', 'rejected', 'cancelled'].includes(lead.status);

    return (
      <div className="py-1">
        <button
          type="button"
          onClick={() => {
            setActiveDropdownLeadId(null);
            openEdit(lead);
          }}
          className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Pencil className="w-3.5 h-3.5 text-slate-400" />
          <span>Chỉnh sửa hồ sơ</span>
        </button>

        {showSchedule && (
          <button
            type="button"
            onClick={() => {
              setActiveDropdownLeadId(null);
              openSchedule(lead);
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span>Hẹn lịch test</span>
          </button>
        )}

        {showTestResult && (
          <button
            type="button"
            onClick={() => {
              setActiveDropdownLeadId(null);
              openTestResult(lead);
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Award className="w-3.5 h-3.5 text-purple-500" />
            <span>Nhập kết quả test</span>
          </button>
        )}

        {showAcceptWaiting && (
          <button
            type="button"
            onClick={() => {
              setActiveDropdownLeadId(null);
              handleAcceptWaitingClass(lead);
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-cyan-500" />
            <span>Nhận chờ xếp lớp</span>
          </button>
        )}

        {showConvert && (
          <button
            type="button"
            onClick={() => {
              setActiveDropdownLeadId(null);
              setConvertLead(lead);
              setSelectedClassId('');
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
            <span>Chuyển thành học viên</span>
          </button>
        )}

        {showReject && (
          <div className="border-t border-slate-100 my-1"></div>
        )}

        {showReject && (
          <button
            type="button"
            onClick={() => {
              setActiveDropdownLeadId(null);
              setRejectLead(lead);
              setRejectionReason('');
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5 text-red-400" />
            <span>Không nhận hồ sơ</span>
          </button>
        )}
      </div>
    );
  };

  // Kanban card renderer
  const renderLeadCard = (lead: AdmissionLead) => {
    const isDropdownOpen = activeDropdownLeadId === lead.id;

    let primaryAction: { label: string; icon: React.ReactNode; onClick: () => void; colorClass: string } | null = null;

    if (lead.status === 'test_scheduled') {
      primaryAction = {
        label: 'Nhập kết quả',
        icon: <Award className="w-3.5 h-3.5" />,
        onClick: () => openTestResult(lead),
        colorClass: 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs',
      };
    } else if (lead.status === 'tested') {
      primaryAction = {
        label: 'Chuyển học viên',
        icon: <UserPlus className="w-3.5 h-3.5" />,
        onClick: () => {
          setConvertLead(lead);
          setSelectedClassId('');
        },
        colorClass: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs',
      };
    } else if (['accepted_waiting_class', 'converted_waiting_class'].includes(lead.status)) {
      primaryAction = {
        label: 'Xếp lớp chính thức',
        icon: <GraduationCap className="w-3.5 h-3.5" />,
        onClick: () => {
          setConvertLead(lead);
          setSelectedClassId('');
        },
        colorClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs',
      };
    }

    return (
      <div 
        key={lead.id} 
        className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between space-y-3 relative group"
      >
        {/* Card Header */}
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] font-bold text-slate-400">
              {lead.leadCode || '—'}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
              {lead.registrationDate.split('-').reverse().join('/')}
            </span>
          </div>
          <div className="flex items-center gap-1 relative shrink-0">
            {lead.source && (
              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 max-w-[80px] truncate" title={lead.source}>
                {lead.source}
              </span>
            )}
            
            <button
              type="button"
              data-dropdown-trigger="true"
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdownLeadId(isDropdownOpen ? null : lead.id);
              }}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isDropdownOpen && (
              <div 
                data-dropdown-menu="true"
                className="absolute right-0 top-7 bg-white border border-slate-200 rounded-xl shadow-lg w-48 z-30 py-1 overflow-hidden"
              >
                {renderDropdownItems(lead)}
              </div>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="space-y-2 flex-1">
          <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">
            {lead.studentName}
          </h4>
          {lead.dateOfBirth && (
            <div className="text-[10px] text-slate-400 font-medium">
              Ngày sinh: {lead.dateOfBirth.split('-').reverse().join('/')}
            </div>
          )}

          {/* Contact Details */}
          <div className="text-xs text-slate-600 font-medium space-y-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
            {lead.parentName && <div className="text-slate-500 font-normal">PH: {lead.parentName}</div>}
            <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <a href={`tel:${lead.parentPhone}`} className="hover:text-indigo-600 hover:underline">{lead.parentPhone}</a>
            </div>
            {lead.parentZalo && (
              <div className="text-[10px] text-blue-600 font-mono">
                Zalo: {lead.parentZalo}
              </div>
            )}
          </div>

          {/* Details per stage */}
          {lead.status === 'test_scheduled' && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 space-y-1">
              <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3" /> Lịch hẹn test:
              </div>
              <div className="text-[11px] text-slate-700 font-bold">
                📅 {lead.testScheduleDate ? lead.testScheduleDate.split('-').reverse().join('/') : '—'} lúc {lead.testScheduleTime || '—'}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                👤 Phụ trách: {lead.testAssignee || 'Chưa gán'}
              </div>
            </div>
          )}

          {['tested', 'accepted_waiting_class', 'converted_waiting_class', 'converted_assigned_class'].includes(lead.status) && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-2.5 space-y-1">
              <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1">
                <Award className="w-3 h-3" /> Kết quả test:
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  Điểm: {lead.testScore ?? '—'}
                </span>
                {lead.suggestedLevel && (
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-1.5 py-0.5 rounded truncate max-w-[120px]" title={lead.suggestedLevel}>
                    Lớp: {lead.suggestedLevel}
                  </span>
                )}
              </div>
              {lead.testResultNote && (
                <div className="text-[10px] text-slate-500 italic truncate" title={lead.testResultNote}>
                  "{lead.testResultNote}"
                </div>
              )}
            </div>
          )}

          {/* Lớp đã xếp */}
          {lead.status === 'converted_assigned_class' && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 space-y-1">
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                <GraduationCap className="w-3 h-3" /> Lớp học đã xếp:
              </div>
              <div className="text-xs font-bold text-emerald-700">
                🏫 {classes.find(c => c.id === lead.assignedClassId)?.name || 'Chưa rõ lớp'}
              </div>
            </div>
          )}

          {/* Learning Needs */}
          {lead.learningNeed && (
            <div className="text-xs text-slate-600 font-medium line-clamp-2" title={lead.learningNeed}>
              <span className="text-slate-400 font-semibold">Nhu cầu:</span> {lead.learningNeed}
            </div>
          )}

          {/* Consultation Note */}
          {lead.consultationNote && (
            <div className="text-[11px] text-slate-500 italic line-clamp-2 border-l-2 border-slate-200 pl-2 mt-1" title={lead.consultationNote}>
              "{lead.consultationNote}"
            </div>
          )}

          {/* Converted Student ID */}
          {lead.convertedStudentId && (
            <div className="text-[10px] text-emerald-600 font-bold font-mono">
              ID học viên: {lead.convertedStudentId}
            </div>
          )}

          {/* Rejection Reason */}
          {lead.rejectionReason && (
            <div className="text-[11px] text-red-600 font-semibold bg-red-50 p-2 rounded-lg border border-red-100">
              Lý do từ chối: "{lead.rejectionReason}"
            </div>
          )}
        </div>

        {/* Card Footer / Primary Action */}
        <div className="pt-2 border-t border-slate-100 flex flex-col shrink-0">
          {primaryAction ? (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 hover:shadow-sm cursor-pointer ${primaryAction.colorClass}`}
            >
              {primaryAction.icon}
              <span>{primaryAction.label}</span>
            </button>
          ) : (
            <div className="text-center py-1">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[lead.status]}`}>
                {STATUS_LABELS[lead.status]}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tuyển sinh & Đăng ký mới</h2>
          <p className="text-sm text-slate-500 mt-1">Quản lý vòng đời tuyển sinh, hẹn test, nhận chờ lớp và chuyển chính thức.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle Switch */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200/60 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                viewMode === 'pipeline'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'hover:bg-slate-50 text-slate-600'
              }`}
              title="Xem dạng quy trình Kanban"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Quy trình</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'hover:bg-slate-50 text-slate-600'
              }`}
              title="Xem dạng danh sách bảng"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Danh sách</span>
            </button>
          </div>

          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            Thêm đăng ký mới
          </button>
        </div>
      </div>

      {/* Guidelines Section */}
      <div>
        {showGuidelines ? (
          <div className="bg-gradient-to-r from-indigo-50/50 via-slate-50 to-indigo-50/20 border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all duration-300">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Quy trình nghiệp vụ tuyển sinh 4 bước</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuidelines(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Thu gọn</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
              {/* Step 1 */}
              <div className="bg-white border border-amber-100 rounded-xl p-3.5 shadow-xs relative">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[10px]">1</span>
                  <span className="font-extrabold text-[11px] text-amber-700 uppercase tracking-wider">Đã hẹn test</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Tiếp nhận Lead mới và chốt ngay lịch làm bài test. Bước tiếp: <b>🏆 Nhập kết quả test</b> khi hoàn thành.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-white border border-purple-100 rounded-xl p-3.5 shadow-xs relative">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[10px]">2</span>
                  <span className="font-extrabold text-[11px] text-purple-700 uppercase tracking-wider">Đã có điểm</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Có nhận xét & đề xuất trình độ. Bước tiếp: <b>👤 Chuyển học viên</b> hoặc chuyển chờ lớp.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-white border border-cyan-100 rounded-xl p-3.5 shadow-xs relative">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-[10px]">3</span>
                  <span className="font-extrabold text-[11px] text-cyan-700 uppercase tracking-wider">Chờ xếp lớp</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Đồng ý học, đang chờ lớp trống phù hợp. Bước tiếp: <b>🏫 Xếp lớp chính thức</b>.
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-white border border-emerald-100 rounded-xl p-3.5 shadow-xs relative">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">4</span>
                  <span className="font-extrabold text-[11px] text-emerald-700 uppercase tracking-wider">Đã xếp lớp</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Đã gán vào lớp học thực tế và chuyển đổi thành học viên chính thức thành công.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <HelpCircle className="w-4.5 h-4.5 text-indigo-500 animate-pulse" />
              <span>Xem hướng dẫn quy trình nghiệp vụ tuyển sinh chuẩn 4 bước</span>
            </div>
            <button
              type="button"
              onClick={() => setShowGuidelines(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Mở rộng</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng lead</span>
            <span className="text-2xl font-black text-slate-800 mt-2">{summary.stats?.total || 0}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hẹn test</span>
            <span className="text-2xl font-black text-amber-600 mt-2">{summary.stats?.test_scheduled || 0}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã test</span>
            <span className="text-2xl font-black text-purple-600 mt-2">{summary.stats?.tested || 0}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Không nhận</span>
            <span className="text-2xl font-black text-rose-600 mt-2">{summary.stats?.rejected || 0}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chờ xếp lớp</span>
            <span className="text-2xl font-black text-cyan-600 mt-2">
              {(summary.stats?.accepted_waiting_class || 0) + (summary.stats?.converted_waiting_class || 0)}
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã xếp lớp</span>
            <span className="text-2xl font-black text-emerald-600 mt-2">{summary.stats?.converted_assigned_class || 0}</span>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider">Tỷ lệ chuyển đổi</span>
            <span className="text-2xl font-black text-indigo-900 mt-2">
              {summary.conversionRate?.toFixed(1) || '0.0'}%
            </span>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, mã tuyển sinh..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        {viewMode === 'table' && (
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <option key={status} value={status}>{label}</option>
            ))}
          </select>
        )}
        <select
          value={filterSource}
          onChange={e => setFilterSource(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer"
        >
          <option value="">Tất cả nguồn</option>
          {sources.map(src => (
            <option key={src} value={src}>{src}</option>
          ))}
        </select>
        <input
          type="month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer"
        />
        <button
          onClick={loadData}
          className="p-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors bg-white cursor-pointer"
          title="Tải lại dữ liệu"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content (Loading/Empty/Table/Kanban) */}
      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white border border-slate-200 rounded-2xl">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-500 font-medium text-lg">
            {searchText || filterStatus || filterSource || filterMonth ? 'Không tìm thấy hồ sơ phù hợp với bộ lọc' : 'Chưa có hồ sơ đăng ký tuyển sinh nào'}
          </h3>
          <p className="text-slate-400 text-sm mt-2">Vui lòng kiểm tra lại bộ lọc hoặc nhấn nút thêm mới.</p>
        </div>
      ) : viewMode === 'pipeline' ? (
        /* Pipeline Kanban View */
        <div className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 select-none">
          <div className="flex gap-4 min-w-[1000px] pb-2">
            {/* Column 1: Đã hẹn test */}
            <div className="flex-1 bg-slate-50/60 border border-slate-200/80 rounded-2xl p-3 flex flex-col min-h-[550px] shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-200/60">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                  <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">1. Đã hẹn test</span>
                </div>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {col1Leads.length}
                </span>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                {col1Leads.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs italic bg-white/40 border border-dashed border-slate-200/60 rounded-2xl">Không có hồ sơ</div>
                ) : (
                  col1Leads.map(lead => renderLeadCard(lead))
                )}
              </div>
            </div>

            {/* Column 2: Đã có điểm */}
            <div className="flex-1 bg-slate-50/60 border border-slate-200/80 rounded-2xl p-3 flex flex-col min-h-[550px] shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-200/60">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-purple-500 rounded-full"></span>
                  <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">2. Đã có điểm</span>
                </div>
                <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {col2Leads.length}
                </span>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                {col2Leads.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs italic bg-white/40 border border-dashed border-slate-200/60 rounded-2xl">Không có hồ sơ</div>
                ) : (
                  col2Leads.map(lead => renderLeadCard(lead))
                )}
              </div>
            </div>

            {/* Column 3: Chờ xếp lớp */}
            <div className="flex-1 bg-slate-50/60 border border-slate-200/80 rounded-2xl p-3 flex flex-col min-h-[550px] shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-200/60">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-cyan-500 rounded-full"></span>
                  <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">3. Chờ xếp lớp</span>
                </div>
                <span className="bg-cyan-100 text-cyan-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {col3Leads.length}
                </span>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                {col3Leads.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs italic bg-white/40 border border-dashed border-slate-200/60 rounded-2xl">Không có hồ sơ</div>
                ) : (
                  col3Leads.map(lead => renderLeadCard(lead))
                )}
              </div>
            </div>

            {/* Column 4: Đã xếp lớp/Khác */}
            <div className="flex-1 bg-slate-50/60 border border-slate-200/80 rounded-2xl p-3 flex flex-col min-h-[550px] shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-200/60">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                  <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">4. Đã xếp lớp/Khác</span>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {col4Leads.length}
                </span>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                {col4Leads.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs italic bg-white/40 border border-dashed border-slate-200/60 rounded-2xl">Không có hồ sơ</div>
                ) : (
                  col4Leads.map(lead => renderLeadCard(lead))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Table Detail View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã / Học viên</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Thông tin liên hệ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nguồn & Ngày Đăng ký</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bài Test / Kết quả</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ghi chú tuyển sinh</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => {
                  const isDropdownOpen = activeDropdownLeadId === lead.id;
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors align-top">
                      {/* Học viên */}
                      <td className="px-5 py-4">
                        <div className="font-mono text-xs font-bold text-indigo-600">{lead.leadCode || '—'}</div>
                        <div className="font-semibold text-slate-800 text-sm mt-0.5">{lead.studentName}</div>
                        {lead.dateOfBirth && (
                          <div className="text-xs text-slate-400 mt-1 font-medium">
                            Ngày sinh: {lead.dateOfBirth.split('-').reverse().join('/')}
                          </div>
                        )}
                      </td>

                      {/* Liên hệ */}
                      <td className="px-4 py-4">
                        <div className="text-slate-700 font-medium">{lead.parentName || '—'}</div>
                        <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {lead.parentPhone}
                        </div>
                        {lead.parentZalo && (
                          <div className="text-[11px] text-blue-600 font-medium mt-0.5">
                            Zalo: {lead.parentZalo}
                          </div>
                        )}
                      </td>

                      {/* Ngày đk */}
                      <td className="px-4 py-4">
                        <div className="text-slate-700 font-semibold">{lead.source || '—'}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {lead.registrationDate.split('-').reverse().join('/')}
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[lead.status]}`}>
                          {STATUS_LABELS[lead.status]}
                        </span>
                        {lead.convertedStudentId && (
                          <div className="text-[10px] text-slate-400 mt-1.5 font-mono">
                            ID HV: {lead.convertedStudentId}
                          </div>
                        )}
                        {lead.status === 'converted_assigned_class' && (
                          <div className="text-[11px] text-emerald-600 mt-1 font-bold">
                            Lớp: {classes.find(c => c.id === lead.assignedClassId)?.name || 'Chưa rõ lớp'}
                          </div>
                        )}
                      </td>

                      {/* Kết quả Test */}
                      <td className="px-4 py-4">
                        {lead.status === 'test_scheduled' && (
                          <div className="bg-amber-50 border border-amber-200/50 rounded-lg p-2 space-y-1">
                            <div className="text-xs font-bold text-amber-800">Lịch hẹn test:</div>
                            <div className="text-[11px] text-slate-700 font-semibold">
                              📅 {lead.testScheduleDate ? lead.testScheduleDate.split('-').reverse().join('/') : '—'} lúc {lead.testScheduleTime || '—'}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              👤 Người test: {lead.testAssignee || 'Chưa gán'}
                            </div>
                          </div>
                        )}

                        {['tested', 'accepted_waiting_class', 'converted_waiting_class', 'converted_assigned_class'].includes(lead.status) && (
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-slate-800">{lead.testType || 'Đầu vào'}</div>
                            <div className="flex items-center gap-2">
                              <span className="bg-purple-100 text-purple-800 text-xs font-bold px-1.5 py-0.5 rounded">
                                Điểm: {lead.testScore ?? '—'}
                              </span>
                              {lead.suggestedLevel && (
                                <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-1.5 py-0.5 rounded">
                                  Lớp: {lead.suggestedLevel}
                                </span>
                              )}
                            </div>
                            {lead.testResultNote && (
                              <div className="text-[11px] text-slate-500 italic max-w-[150px] truncate" title={lead.testResultNote}>
                                "{lead.testResultNote}"
                              </div>
                            )}
                          </div>
                        )}

                        {!['test_scheduled', 'tested', 'accepted_waiting_class', 'converted_waiting_class', 'converted_assigned_class'].includes(lead.status) && (
                          <span className="text-slate-400 text-xs italic">Chưa có lịch test</span>
                        )}
                      </td>

                      {/* Ghi chú */}
                      <td className="px-4 py-4">
                        {lead.learningNeed && (
                          <div className="text-xs font-bold text-slate-700">Nhu cầu: <span className="font-normal text-slate-600">{lead.learningNeed}</span></div>
                        )}
                        {lead.consultationNote && (
                          <div className="text-xs text-slate-500 italic mt-1 max-w-[200px] line-clamp-2" title={lead.consultationNote}>
                            "{lead.consultationNote}"
                          </div>
                        )}
                        {lead.rejectionReason && (
                          <div className="text-xs text-red-600 font-medium mt-1">
                            Lý do từ chối: "{lead.rejectionReason}"
                          </div>
                        )}
                      </td>

                      {/* Hành động */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 justify-end relative">
                          {/* Primary Action Button in Table */}
                          {(() => {
                            if (lead.status === 'test_scheduled') {
                              return (
                                <button
                                  type="button"
                                  onClick={() => openTestResult(lead)}
                                  className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/60 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer"
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  <span>Nhập điểm</span>
                                </button>
                              );
                            } else if (lead.status === 'tested') {
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConvertLead(lead);
                                    setSelectedClassId('');
                                  }}
                                  className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>Chuyển học viên</span>
                                </button>
                              );
                            } else if (['accepted_waiting_class', 'converted_waiting_class'].includes(lead.status)) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConvertLead(lead);
                                    setSelectedClassId('');
                                  }}
                                  className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer"
                                >
                                  <GraduationCap className="w-3.5 h-3.5" />
                                  <span>Xếp lớp</span>
                                </button>
                              );
                            }
                            return null;
                          })()}

                          {/* Secondary actions dropdown */}
                          <button
                            type="button"
                            data-dropdown-trigger="true"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownLeadId(isDropdownOpen ? null : lead.id);
                            }}
                            className="p-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors bg-white cursor-pointer"
                            title="Thao tác khác"
                          >
                            <MoreHorizontal className="w-4.5 h-4.5" />
                          </button>

                          {isDropdownOpen && (
                            <div 
                              data-dropdown-menu="true"
                              className="absolute right-0 top-10 bg-white border border-slate-200 rounded-xl shadow-lg w-48 z-30 py-1 overflow-hidden"
                            >
                              {renderDropdownItems(lead)}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Waiting Leads Section (Chờ Xếp Lớp Report) */}
      {summary && summary.waitingLeads?.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-cyan-500 rounded-full animate-pulse"></span>
            Danh sách học viên đang chờ xếp lớp ({summary.waitingLeads.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.waitingLeads.map((wl: any) => (
              <div key={wl.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 text-sm">{wl.studentName}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{wl.parentPhone}</div>
                  <div className="text-[11px] text-slate-500 mt-1.5">
                    Trình độ: <span className="font-semibold text-indigo-600">{wl.suggestedLevel || '—'}</span>
                  </div>
                </div>
                <div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    wl.status === 'converted_waiting_class'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                  }`}>
                    {wl.status === 'converted_waiting_class' ? 'Đã tạo HV chính thức' : 'Lead chờ xếp'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSaveLead} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-indigo-900 rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingLead ? 'Chỉnh sửa hồ sơ tuyển sinh' : 'Đăng ký tuyển sinh mới'}
                </h3>
                <p className="text-indigo-300 text-xs mt-0.5">
                  {editingLead ? `Mã: ${editingLead.leadCode}` : 'Nhập thông tin liên hệ và nhu cầu của học viên'}
                </p>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="p-2 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5 text-indigo-200" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Họ và tên */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Họ và tên học viên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.studentName}
                    onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Ngày sinh */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Ngày sinh</label>
                  <DateInput
                    value={form.dateOfBirth}
                    onChange={v => setForm(f => ({ ...f, dateOfBirth: v }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none flex items-center justify-between"
                  />
                </div>

                {/* SĐT phụ huynh */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    SĐT phụ huynh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.parentPhone}
                    onChange={e => setForm(f => ({ ...f, parentPhone: e.target.value }))}
                    placeholder="VD: 0912345678"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Tên phụ huynh */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Họ tên phụ huynh</label>
                  <input
                    type="text"
                    value={form.parentName}
                    onChange={e => setForm(f => ({ ...f, parentName: e.target.value }))}
                    placeholder="VD: Nguyễn Văn B"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Zalo phụ huynh */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Zalo liên hệ</label>
                  <input
                    type="text"
                    value={form.parentZalo}
                    onChange={e => setForm(f => ({ ...f, parentZalo: e.target.value }))}
                    placeholder="VD: 0912345678"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Nguồn tuyển sinh */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Nguồn</label>
                  <input
                    type="text"
                    value={form.source}
                    onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    placeholder="Facebook, Hotline, PH giới thiệu..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Ngày đăng ký */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Ngày đăng ký</label>
                  <DateInput
                    required
                    value={form.registrationDate}
                    onChange={v => setForm(f => ({ ...f, registrationDate: v }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none flex items-center justify-between"
                  />
                </div>

                {/* Counselor phụ trách */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Tư vấn viên phụ trách</label>
                  <input
                    type="text"
                    value={form.assignedCounselor}
                    onChange={e => setForm(f => ({ ...f, assignedCounselor: e.target.value }))}
                    placeholder="Nhập tên tư vấn viên"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Nhóm Hẹn test bắt buộc */}
                <div className="col-span-2 bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5 border-b border-amber-200/60 pb-1.5">
                    📅 Lịch hẹn test (Bắt buộc)
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Ngày hẹn test <span className="text-red-500">*</span></label>
                      <DateInput
                        required
                        value={form.testScheduleDate}
                        onChange={v => setForm(f => ({ ...f, testScheduleDate: v }))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 flex items-center justify-between"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Giờ hẹn test</label>
                      <input
                        type="time"
                        value={form.testScheduleTime}
                        onChange={e => setForm(f => ({ ...f, testScheduleTime: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Người phụ trách test <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Cô Kim"
                      value={form.testAssignee}
                      onChange={e => setForm(f => ({ ...f, testAssignee: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Ghi chú hẹn test</label>
                    <input
                      type="text"
                      placeholder="VD: Test offline, mang theo bút chì..."
                      value={form.testScheduleNote}
                      onChange={e => setForm(f => ({ ...f, testScheduleNote: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Địa chỉ */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Địa chỉ thường trú</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Nhập địa chỉ của học viên"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Nhu cầu học */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Nhu cầu học tập</label>
                  <input
                    type="text"
                    value={form.learningNeed}
                    onChange={e => setForm(f => ({ ...f, learningNeed: e.target.value }))}
                    placeholder="VD: Luyện thi IELTS 6.5, học giao tiếp..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Ghi chú tư vấn */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Ghi chú tư vấn</label>
                  <textarea
                    value={form.consultationNote}
                    onChange={e => setForm(f => ({ ...f, consultationNote: e.target.value }))}
                    placeholder="Thông tin tình trạng hiện tại, lộ trình tư vấn..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule Test Modal */}
      {scheduleLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleScheduleTest} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-amber-900 rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-white">Hẹn lịch test đầu vào</h3>
                <p className="text-amber-200 text-xs mt-0.5">Học viên: {scheduleLead.studentName}</p>
              </div>
              <button type="button" onClick={() => setScheduleLead(null)} className="p-2 hover:bg-amber-800 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5 text-amber-200" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Ngày hẹn test <span className="text-red-500">*</span>
                </label>
                <DateInput
                  required
                  value={testScheduleDate}
                  onChange={v => setTestScheduleDate(v)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none flex items-center justify-between"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Khung giờ hẹn</label>
                <input
                  type="time"
                  value={testScheduleTime}
                  onChange={e => setTestScheduleTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Người phụ trách test</label>
                <input
                  type="text"
                  value={testAssignee}
                  onChange={e => setTestAssignee(e.target.value)}
                  placeholder="Tên giáo viên hoặc nhân viên phụ trách"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Ghi chú lịch hẹn</label>
                <textarea
                  value={testScheduleNote}
                  onChange={e => setTestScheduleNote(e.target.value)}
                  placeholder="Địa điểm test, yêu cầu chuẩn bị..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setScheduleLead(null)}
                className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl shadow-sm cursor-pointer"
              >
                Lưu lịch hẹn
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Test Result Modal */}
      {resultLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleTestResult} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-purple-900 rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-white">Cập nhật kết quả test</h3>
                <p className="text-purple-200 text-xs mt-0.5">Học viên: {resultLead.studentName}</p>
              </div>
              <button type="button" onClick={() => setResultLead(null)} className="p-2 hover:bg-purple-800 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5 text-purple-200" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Ngày làm bài test <span className="text-red-500">*</span>
                  </label>
                  <DateInput
                    required
                    value={testDate}
                    onChange={v => setTestDate(v)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none flex items-center justify-between"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Loại bài test</label>
                  <input
                    type="text"
                    value={testType}
                    onChange={e => setTestType(e.target.value)}
                    placeholder="VD: IELTS Cam 15, General..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Điểm số đạt được</label>
                  <input
                    type="number"
                    step="0.1"
                    value={testScore}
                    onChange={e => setTestScore(e.target.value)}
                    placeholder="VD: 6.5"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Trình độ/Lớp đề xuất</label>
                  <input
                    type="text"
                    value={suggestedLevel}
                    onChange={e => setSuggestedLevel(e.target.value)}
                    placeholder="VD: Pre-IELTS"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Chi tiết điểm thành phần</label>
                <textarea
                  value={testNote}
                  onChange={e => setTestNote(e.target.value)}
                  placeholder="VD: Listening: 6.0, Reading: 7.0, Writing: 5.5, Speaking: 6.5"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Đánh giá chung của GV</label>
                <textarea
                  value={testResultNote}
                  onChange={e => setTestResultNote(e.target.value)}
                  placeholder="Đánh giá ưu nhược điểm học viên..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setResultLead(null)}
                className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl shadow-sm cursor-pointer"
              >
                Lưu kết quả
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reject Modal */}
      {rejectLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleReject} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-rose-900 rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-white">Không nhận hồ sơ tuyển sinh</h3>
                <p className="text-rose-200 text-xs mt-0.5">Học viên: {rejectLead.studentName}</p>
              </div>
              <button type="button" onClick={() => setRejectLead(null)} className="p-2 hover:bg-rose-800 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5 text-rose-200" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Lý do không nhận <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Nhập lý do chi tiết từ chối hồ sơ này (VD: Lớp học quá xa nhà, không sắp xếp được lịch học...)"
                  rows={4}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectLead(null)}
                className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-sm cursor-pointer"
              >
                Xác nhận từ chối
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Convert to Student Modal */}
      {convertLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleConvert} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-emerald-900 rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-white">Chuyển thành Học viên chính thức</h3>
                <p className="text-emerald-200 text-xs mt-0.5">Chuyển đổi hồ sơ tuyển sinh của {convertLead.studentName}</p>
              </div>
              <button type="button" onClick={() => setConvertLead(null)} className="p-2 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5 text-emerald-200" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5">
                <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800 leading-relaxed">
                  Hệ thống sẽ tự động tạo hồ sơ học viên chính thức mới dựa trên thông tin đã có, sao chép kết quả bài test vào phần ghi chú học viên.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Xếp vào lớp học có sẵn
                </label>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white cursor-pointer"
                >
                  <option value="">-- Chờ xếp lớp sau (Không gán lớp ngay) --</option>
                  {classes.filter(c => c.status !== 'ended' && c.type !== 'online').map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} (Học phí buổi: {cls.defaultFee?.toLocaleString('vi-VN')}đ)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Lưu ý: Nếu không gán lớp, học sinh sẽ mang trạng thái chờ xếp lớp trong danh mục Học viên.
                </p>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConvertLead(null)}
                className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm cursor-pointer"
              >
                Xác nhận chuyển đổi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Duplicate Warning Modal (Internal UI Modal) */}
      {duplicateWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-red-100">
            <div className="flex items-center justify-between p-5 border-b border-red-100 bg-red-900 rounded-t-2xl">
              <div className="flex items-center gap-2.5 text-white">
                <ShieldAlert className="w-5 h-5 text-red-200 animate-bounce" />
                <div>
                  <h3 className="text-base font-bold">⚠️ Phát hiện trùng học viên!</h3>
                  <p className="text-red-200 text-xs mt-0.5">Trùng tên và SĐT phụ huynh với học viên hiện có</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="p-2 hover:bg-red-800 rounded-lg transition-colors text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                <h4 className="text-sm font-bold text-red-800">Thông tin học viên nghi trùng:</h4>
                <div className="text-xs text-slate-700 space-y-1">
                  <div>• <b>Họ và tên:</b> {duplicateWarning.existingStudent.name}</div>
                  <div>• <b>SĐT phụ huynh:</b> {duplicateWarning.existingStudent.parentPhone}</div>
                  <div>• <b>Lớp hiện tại:</b> {duplicateWarning.existingStudent.className || 'Chưa xếp lớp'}</div>
                  <div>• <b>Trạng thái:</b> {duplicateWarning.existingStudent.status === 'active' ? 'Đang học' : 'Nghỉ học'}</div>
                </div>
              </div>

              {!isAdmin ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    Bạn không có quyền <b>Admin</b> để xác nhận lưu trùng lặp. Vui lòng liên hệ Admin của trung tâm để thực hiện chuyển đổi này.
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2 text-xs text-emerald-800 leading-relaxed">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    Bạn đang đăng nhập bằng tài khoản <b>Admin</b>. Bạn có thể chấp nhận ghi nhận trùng lặp (ví dụ học sinh học lại hoặc hai anh em) và tạo một tài khoản học sinh độc lập. Hệ thống sẽ không tự ý ghi đè hoặc gộp thông tin.
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={!isAdmin}
                onClick={handleConfirmConvertDuplicate}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Vẫn tiếp tục chuyển đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
