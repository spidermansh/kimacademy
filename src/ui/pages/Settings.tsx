import React, { useState, useEffect, useRef } from 'react';
import { AppSettings } from '../../shared/types';
import { api, auth } from '../../shared/utils';
import { useToast } from '../components/Toast';
import {
  Building2, Phone, MapPin, Image, Save, Plus, Trash2,
  CreditCard, Tag, Edit2, Check, X, Settings as SettingsIcon,
  RotateCcw, Download, Upload, Shield, Clock, Search,
  HardDrive, RefreshCw, FileJson, AlertTriangle, User,
  Database, ChevronDown, ChevronRight, Receipt,
} from 'lucide-react';
import DateInput from '../components/ui/DateInput';

interface SettingsProps {
  onSettingsUpdated?: (settings: AppSettings) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  centerName: 'Kim Academy',
  logoUrl: '',
  phone: '',
  address: '',
  feeTypes: ['Học phí offline', 'Lệ phí thi', 'Thu khác'],
  paymentMethods: ['Chuyển khoản', 'Tiền mặt', 'Momo', 'ZaloPay', 'Khác'],
  expenseCategories: ['Mặt bằng', 'Điện nước', 'Internet', 'Dụng cụ học tập', 'Marketing/Quảng cáo', 'Bảo trì/Sửa chữa', 'Đối ngoại', 'Văn phòng phẩm', 'Quỹ hoạt động', 'Chi khác'],
};

const ENTITY_LABELS: Record<string, string> = {
  transaction: '💰 Giao dịch',
  student: '🎓 Học viên',
  class: '📚 Lớp học',
  attendance: '✅ Điểm danh',
  system: '⚙️ Hệ thống',
  user: '👤 Người dùng',
  system_parameter: '⚙️ Tham số hệ thống',
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Tạo mới', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  UPDATE: { label: 'Cập nhật', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  DELETE: { label: 'Xóa', color: 'bg-red-100 text-red-700 border-red-200' },
  BACKUP: { label: 'Backup', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  RESTORE: { label: 'Khôi phục', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  seed_demo_data: { label: 'Dữ liệu mẫu', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  system_parameter_created: { label: 'Tạo tham số', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  system_parameter_updated: { label: 'Sửa tham số', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  system_parameter_versioned: { label: 'Chia version', color: 'bg-sky-100 text-sky-700 border-sky-200' },
};

export default function Settings({ onSettingsUpdated }: SettingsProps) {
  const toast = useToast();
  const currentUser = auth.getUser();
  const isAdmin = currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'center' | 'categories' | 'backup' | 'parameters'>('center');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state — thông tin trung tâm
  const [form, setForm] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Danh mục — loại khoản thu
  const [feeTypes, setFeeTypes] = useState<string[]>([]);
  const [newFeeType, setNewFeeType] = useState('');
  const [editingFeeIdx, setEditingFeeIdx] = useState<number | null>(null);
  const [editingFeeVal, setEditingFeeVal] = useState('');

  // Danh mục — hình thức thanh toán
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [editingPmIdx, setEditingPmIdx] = useState<number | null>(null);
  const [editingPmVal, setEditingPmVal] = useState('');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  // Danh mục — loại khoản chi
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [newExpenseCat, setNewExpenseCat] = useState('');
  const [editingExpIdx, setEditingExpIdx] = useState<number | null>(null);
  const [editingExpVal, setEditingExpVal] = useState('');

  // Backup states
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedConfirmText, setSeedConfirmText] = useState('');

  // Audit log states
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState<string>('all');
  const [showAuditDetails, setShowAuditDetails] = useState<string | null>(null);

  // System parameters states (CFG-01 Core)
  const [systemParameters, setSystemParameters] = useState<any[]>([]);
  const [paramLoading, setParamLoading] = useState(false);
  const [paramGroupFilter, setParamGroupFilter] = useState<string>('all');
  const [paramSearch, setParamSearch] = useState('');
  
  // Edit modal state
  const [editingParam, setEditingParam] = useState<any | null>(null);
  const [newParamValue, setNewParamValue] = useState<any>('');
  const [paramScope, setParamScope] = useState<'all_time' | 'from_date'>('from_date');
  const [paramEffectiveFrom, setParamEffectiveFrom] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paramReason, setParamReason] = useState('');
  const [paramPreview, setParamPreview] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saveParamLoading, setSaveParamLoading] = useState(false);

  // History modal state
  const [historyParamKey, setHistoryParamKey] = useState<string | null>(null);

  // Load system parameters
  const loadSystemParameters = async () => {
    setParamLoading(true);
    try {
      const data = await api.getSystemParameters();
      setSystemParameters(data || []);
    } catch (err: any) {
      toast.error('Không thể tải tham số hệ thống', err.message || 'Lỗi kết nối');
    } finally {
      setParamLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'parameters') {
      loadSystemParameters();
    }
  }, [activeTab]);

  // Preview parameter changes automatically
  useEffect(() => {
    if (editingParam) {
      const fetchPreview = async () => {
        setPreviewLoading(true);
        try {
          const date = paramScope === 'all_time' ? '1970-01-01' : paramEffectiveFrom;
          const data = await api.previewSystemParameter({
            key: editingParam.key,
            value: newParamValue,
            effectiveFrom: date
          });
          setParamPreview(data);
        } catch (err) {
          setParamPreview(null);
        } finally {
          setPreviewLoading(false);
        }
      };

      const timer = setTimeout(fetchPreview, 300);
      return () => clearTimeout(timer);
    }
  }, [editingParam, newParamValue, paramScope, paramEffectiveFrom]);

  // Tải cài đặt từ API
  useEffect(() => {
    (async () => {
      try {
        const data = await api.getSettings();
        setSettings(data);
        setForm(data);
        // Filter: loại bỏ các khoản thu đã được quản lý bởi phân hệ khác
        // - 'Học phí online' không áp dụng tại trung tâm offline
        // - 'Sách', 'Đồng phục' đã chuyển sang phân hệ Quản lý kho
        const EXCLUDED_FEE_TYPES = ['Học phí online', 'Sách', 'Đồng phục'];
        setFeeTypes((data.feeTypes || DEFAULT_SETTINGS.feeTypes).filter((ft: string) => !EXCLUDED_FEE_TYPES.includes(ft)));
        setPaymentMethods(data.paymentMethods || DEFAULT_SETTINGS.paymentMethods);
        setExpenseCategories(data.expenseCategories || DEFAULT_SETTINGS.expenseCategories);
      } catch (err) {
        toast.error('Không thể tải cài đặt', 'Sử dụng cài đặt mặc định');
        const EXCLUDED_FALLBACK = ['Học phí online', 'Sách', 'Đồng phục'];
        setFeeTypes(DEFAULT_SETTINGS.feeTypes.filter((ft: string) => !EXCLUDED_FALLBACK.includes(ft)));
        setPaymentMethods(DEFAULT_SETTINGS.paymentMethods);
        setExpenseCategories(DEFAULT_SETTINGS.expenseCategories);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load audit logs when switching to backup tab
  useEffect(() => {
    if (activeTab === 'backup') {
      loadAuditLogs();
    }
  }, [activeTab]);

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const logs = await api.getAuditLogs(200);
      setAuditLogs(logs);
    } catch (err) {
      // May fail for non-admin, silently handle
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleSaveParam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParam) return;
    if (!paramReason.trim()) {
      toast.error('Lỗi nhập liệu', 'Vui lòng nhập lý do thay đổi');
      return;
    }
    setSaveParamLoading(true);
    try {
      const date = paramScope === 'all_time' ? '1970-01-01' : paramEffectiveFrom;
      await api.updateSystemParameter({
        key: editingParam.key,
        value: newParamValue,
        scope: paramScope,
        effectiveFrom: date,
        reason: paramReason,
      });
      toast.success('Thành công', `Đã cập nhật tham số ${editingParam.name}`);
      setEditingParam(null);
      setParamReason('');
      setParamPreview(null);
      await loadSystemParameters();
    } catch (err: any) {
      toast.error('Lỗi lưu tham số', err.message || 'Lỗi không xác định');
    } finally {
      setSaveParamLoading(false);
    }
  };

  // Xử lý upload logo (base64)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.warning('File quá lớn', 'Logo nên nhỏ hơn 500KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(prev => ({ ...prev, logoUrl: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Lưu thông tin trung tâm
  const handleSaveCenter = async () => {
    setSaving(true);
    try {
      const updated = await api.updateSettings({
        centerName: form.centerName,
        logoUrl: form.logoUrl,
        phone: form.phone,
        address: form.address,
        feeTypes,
        paymentMethods,
        expenseCategories,
      });
      setSettings(updated);
      onSettingsUpdated?.(updated);
      toast.success('Đã lưu thông tin trung tâm!');
    } catch (err: any) {
      toast.error('Không thể lưu cài đặt', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Lưu danh mục
  const handleSaveCategories = async () => {
    setSaving(true);
    try {
      const updated = await api.updateSettings({
        centerName: settings.centerName,
        logoUrl: settings.logoUrl,
        phone: settings.phone,
        address: settings.address,
        feeTypes,
        paymentMethods,
        expenseCategories,
      });
      setSettings(updated);
      onSettingsUpdated?.(updated);
      toast.success('Đã lưu danh mục!');
    } catch (err: any) {
      toast.error('Không thể lưu danh mục', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Fee Types handlers ───────────────────────────────────────────────────────
  const addFeeType = () => {
    const val = newFeeType.trim();
    if (!val) return;
    if (feeTypes.includes(val)) {
      toast.warning('Trùng tên', 'Loại khoản thu này đã tồn tại');
      return;
    }
    setFeeTypes(prev => [...prev, val]);
    setNewFeeType('');
  };

  const removeFeeType = async (idx: number) => {
    const ok = await toast.confirm({
      title: `Xóa "${feeTypes[idx]}"?`,
      message: 'Các giao dịch cũ có thể bị ảnh hưởng nếu danh mục này đang được dùng.',
      confirmText: 'Xóa',
      danger: true,
    });
    if (ok) setFeeTypes(prev => prev.filter((_, i) => i !== idx));
  };

  const startEditFee = (idx: number) => {
    setEditingFeeIdx(idx);
    setEditingFeeVal(feeTypes[idx]);
  };

  const saveEditFee = () => {
    const val = editingFeeVal.trim();
    if (!val || editingFeeIdx === null) return;
    if (feeTypes.some((f, i) => f === val && i !== editingFeeIdx)) {
      toast.warning('Trùng tên', 'Loại khoản thu này đã tồn tại');
      return;
    }
    setFeeTypes(prev => prev.map((f, i) => (i === editingFeeIdx ? val : f)));
    setEditingFeeIdx(null);
    setEditingFeeVal('');
  };

  // ── Payment Methods handlers ─────────────────────────────────────────────────
  const addPaymentMethod = () => {
    const val = newPaymentMethod.trim();
    if (!val) return;
    if (paymentMethods.includes(val)) {
      toast.warning('Trùng tên', 'Hình thức thanh toán này đã tồn tại');
      return;
    }
    setPaymentMethods(prev => [...prev, val]);
    setNewPaymentMethod('');
  };

  const removePaymentMethod = async (idx: number) => {
    const ok = await toast.confirm({
      title: `Xóa "${paymentMethods[idx]}"?`,
      message: 'Các giao dịch cũ có thể bị ảnh hưởng.',
      confirmText: 'Xóa',
      danger: true,
    });
    if (ok) setPaymentMethods(prev => prev.filter((_, i) => i !== idx));
  };

  const startEditPm = (idx: number) => {
    setEditingPmIdx(idx);
    setEditingPmVal(paymentMethods[idx]);
  };

  const saveEditPm = () => {
    const val = editingPmVal.trim();
    if (!val || editingPmIdx === null) return;
    if (paymentMethods.some((p, i) => p === val && i !== editingPmIdx)) {
      toast.warning('Trùng tên', 'Hình thức thanh toán này đã tồn tại');
      return;
    }
    setPaymentMethods(prev => prev.map((p, i) => (i === editingPmIdx ? val : p)));
    setEditingPmIdx(null);
    setEditingPmVal('');
  };

  const resetToDefault = async () => {
    const ok = await toast.confirm({
      title: 'Khôi phục mặc định?',
      message: 'Danh mục sẽ về như lúc cài đặt ban đầu. Thông tin trung tâm giữ nguyên.',
      confirmText: 'Khôi phục',
      danger: true,
    });
    if (ok) {
      setFeeTypes(DEFAULT_SETTINGS.feeTypes);
      setPaymentMethods(DEFAULT_SETTINGS.paymentMethods);
      setExpenseCategories(DEFAULT_SETTINGS.expenseCategories);
      toast.info('Đã khôi phục danh mục mặc định. Nhớ bấm Lưu để áp dụng.');
    }
  };

  // ── Backup handlers ──────────────────────────────────────────────────────────
  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const backupData = await api.getBackupData();
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '');
      a.href = url;
      a.download = `KimAcademy_Backup_${dateStr}_${timeStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup thành công!', 'File đã được tải về máy');
      loadAuditLogs();
    } catch (err: any) {
      toast.error('Lỗi tạo backup', err.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.version || !backupData.data) {
        toast.error('File không hợp lệ', 'Đây không phải file backup của Kim Academy');
        return;
      }

      const exportDate = backupData.exportedAt
        ? new Date(backupData.exportedAt).toLocaleString('vi-VN')
        : 'Không rõ';

      const stats = backupData.data;
      const summary = [
        stats.students?.length ? `${stats.students.length} học viên` : null,
        stats.classes?.length ? `${stats.classes.length} lớp học` : null,
        stats.transactions?.length ? `${stats.transactions.length} giao dịch` : null,
        stats.attendance?.length ? `${stats.attendance.length} bản điểm danh` : null,
        stats.users?.length ? `${stats.users.length} tài khoản` : null,
      ].filter(Boolean).join(', ');

      const ok = await toast.confirm({
        title: '⚠️ Khôi phục dữ liệu?',
        message: `Toàn bộ dữ liệu hiện tại sẽ bị GHI ĐÈ bởi file backup!\n\n📅 Ngày backup: ${exportDate}\n📊 Nội dung: ${summary}\n\nHành động này KHÔNG THỂ HOÀN TÁC!`,
        confirmText: 'Khôi phục ngay',
        danger: true,
      });

      if (!ok) return;

      setRestoreLoading(true);
      const result = await api.restoreFromBackup(backupData);

      if (result.success) {
        toast.success('Khôi phục thành công!', 'Trang sẽ tải lại trong 2 giây...');
        loadAuditLogs();
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error('Lỗi khôi phục', result.message);
      }
    } catch (err: any) {
      toast.error('Lỗi đọc file', 'File không đúng định dạng JSON');
    } finally {
      setRestoreLoading(false);
      if (restoreInputRef.current) restoreInputRef.current.value = '';
    }
  };

  const handleSeedDemo = async () => {
    if (seedConfirmText.trim() !== 'TAO DU LIEU MAU') {
      toast.error('Lỗi xác thực', 'Vui lòng nhập chính xác cụm từ "TAO DU LIEU MAU" để tiếp tục.');
      return;
    }

    setSeedLoading(true);
    try {
      const result = await api.seedDemo(seedConfirmText.trim());
      if (result.success) {
        toast.success(
          'Tạo dữ liệu mẫu thành công!',
          `Đã tạo: ${result.summary?.classesCount} lớp, ${result.summary?.studentsCount} học viên, ${result.summary?.transactionsCount} giao dịch, ${result.summary?.attendanceCount} điểm danh, ${result.summary?.expensesCount} khoản chi. Giữ lại: ${result.summary?.usersRetained} user, thêm: ${result.summary?.usersAdded} user.`
        );
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error('Lỗi tạo dữ liệu mẫu', result.message || 'Không thành công');
      }
    } catch (err: any) {
      toast.error('Lỗi kết nối server', err.message);
    } finally {
      setSeedLoading(false);
      setSeedConfirmText('');
    }
  };

  // Filter audit logs
  const filteredAuditLogs = auditLogs.filter(log => {
    if (auditEntityFilter !== 'all' && log.entity !== auditEntityFilter) return false;
    if (auditSearch) {
      const q = auditSearch.toLowerCase();
      return (
        log.details?.toLowerCase().includes(q) ||
        log.user?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        log.entity?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-slate-200 rounded-xl" />
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  // ── Shared tab button ────────────────────────────────────────────────────────
  const TabBtn = ({ id, label, icon }: { id: 'center' | 'categories' | 'backup' | 'parameters'; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
        activeTab === id
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Cài Đặt Trung Tâm</h2>
          <p className="text-sm text-slate-500">Quản lý thông tin, danh mục và dữ liệu hệ thống</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit flex-wrap">
        <TabBtn id="center" label="Thông tin trung tâm" icon={<Building2 className="w-4 h-4" />} />
        <TabBtn id="categories" label="Cấu hình danh mục" icon={<Tag className="w-4 h-4" />} />
        <TabBtn id="backup" label="Backup & Dữ liệu" icon={<HardDrive className="w-4 h-4" />} />
        <TabBtn id="parameters" label="Tham số hệ thống" icon={<SettingsIcon className="w-4 h-4" />} />
      </div>

      {/* ── Tab 1: Thông tin trung tâm ───────────────────────────────────────── */}
      {activeTab === 'center' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-700">Thông tin hiển thị</h3>
            <p className="text-xs text-slate-400 mt-0.5">Các thông tin này sẽ hiển thị trên tiêu đề và báo cáo</p>
          </div>

          <div className="p-6 space-y-5">
            {/* Logo */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                Logo trung tâm
              </label>
              <div className="flex items-center gap-4">
                {form.logoUrl ? (
                  <div className="relative w-16 h-16">
                    <img
                      src={form.logoUrl}
                      alt="Logo"
                      className="w-16 h-16 rounded-xl object-contain border border-slate-200 bg-slate-50"
                    />
                    <button
                      onClick={() => setForm(prev => ({ ...prev, logoUrl: '' }))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 text-slate-300">
                    <Image className="w-6 h-6" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 border border-indigo-300 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Image className="w-3.5 h-3.5" />
                    Tải ảnh lên
                  </button>
                  <p className="text-[10px] text-slate-400">PNG, JPG, SVG — tối đa 500KB</p>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>

            {/* Tên trung tâm */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                Tên trung tâm
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.centerName}
                  onChange={(e) => setForm(prev => ({ ...prev, centerName: e.target.value }))}
                  placeholder="Kim Academy"
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Số điện thoại */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  Số điện thoại
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="0901 234 567"
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all"
                  />
                </div>
              </div>

              {/* Địa chỉ */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  Địa chỉ
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="123 Đường ABC, Quận 1, TP.HCM"
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            {(form.centerName || form.phone || form.address) && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Xem trước sidebar</p>
                <div className="flex items-center gap-2.5">
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-contain bg-white border border-indigo-200" />
                  ) : (
                    <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-sm font-bold">
                      {form.centerName?.charAt(0) || 'K'}
                    </div>
                  )}
                  <div>
                    <p className="text-indigo-800 font-bold text-sm">{form.centerName || 'Kim Academy'}</p>
                    {form.phone && <p className="text-indigo-500 text-[10px]">📞 {form.phone}</p>}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveCenter}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : 'Lưu thông tin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Cấu hình danh mục ────────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div className="space-y-5">
          {/* Reset button */}
          <div className="flex justify-end">
            <button
              onClick={resetToDefault}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Khôi phục mặc định
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Loại khoản thu */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Tag className="w-4 h-4 text-violet-500" />
                <div>
                  <h3 className="font-semibold text-slate-700 text-sm">Loại khoản thu</h3>
                  <p className="text-[10px] text-slate-400">{feeTypes.length} loại đã cấu hình</p>
                </div>
              </div>

              <div className="p-4 space-y-2">
                {/* Thêm mới */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeeType}
                    onChange={(e) => setNewFeeType(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFeeType()}
                    placeholder="Tên loại thu mới..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none text-sm transition-all"
                  />
                  <button
                    onClick={addFeeType}
                    disabled={!newFeeType.trim()}
                    className="flex items-center gap-1 px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm
                  </button>
                </div>

                {/* Danh sách */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {feeTypes.map((ft, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 group"
                    >
                      {editingFeeIdx === idx ? (
                        <>
                          <input
                            autoFocus
                            type="text"
                            value={editingFeeVal}
                            onChange={(e) => setEditingFeeVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditFee();
                              if (e.key === 'Escape') { setEditingFeeIdx(null); setEditingFeeVal(''); }
                            }}
                            className="flex-1 px-2 py-0.5 border border-violet-400 rounded text-sm outline-none bg-white"
                          />
                          <button onClick={saveEditFee} className="text-emerald-600 hover:text-emerald-700 cursor-pointer">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditingFeeIdx(null); setEditingFeeVal(''); }} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-slate-700">{ft}</span>
                          <div className="hidden group-hover:flex items-center gap-1">
                            <button
                              onClick={() => startEditFee(idx)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeFeeType(idx)}
                              className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {feeTypes.length === 0 && (
                    <p className="text-center text-sm text-slate-400 py-4">Chưa có loại khoản thu nào</p>
                  )}
                </div>
              </div>
            </div>

            {/* Hình thức thanh toán */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-cyan-500" />
                <div>
                  <h3 className="font-semibold text-slate-700 text-sm">Hình thức thanh toán</h3>
                  <p className="text-[10px] text-slate-400">{paymentMethods.length} hình thức đã cấu hình</p>
                </div>
              </div>

              <div className="p-4 space-y-2">
                {/* Thêm mới */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPaymentMethod()}
                    placeholder="Hình thức mới (VD: VNPay)..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-sm transition-all"
                  />
                  <button
                    onClick={addPaymentMethod}
                    disabled={!newPaymentMethod.trim()}
                    className="flex items-center gap-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm
                  </button>
                </div>

                {/* Danh sách */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {paymentMethods.map((pm, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 group"
                    >
                      {editingPmIdx === idx ? (
                        <>
                          <input
                            autoFocus
                            type="text"
                            value={editingPmVal}
                            onChange={(e) => setEditingPmVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditPm();
                              if (e.key === 'Escape') { setEditingPmIdx(null); setEditingPmVal(''); }
                            }}
                            className="flex-1 px-2 py-0.5 border border-cyan-400 rounded text-sm outline-none bg-white"
                          />
                          <button onClick={saveEditPm} className="text-emerald-600 hover:text-emerald-700 cursor-pointer">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditingPmIdx(null); setEditingPmVal(''); }} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-slate-700">{pm}</span>
                          <div className="hidden group-hover:flex items-center gap-1">
                            <button
                              onClick={() => startEditPm(idx)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removePaymentMethod(idx)}
                              className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {paymentMethods.length === 0 && (
                    <p className="text-center text-sm text-slate-400 py-4">Chưa có hình thức thanh toán nào</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Loại khoản chi */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-red-500" />
              <div>
                <h3 className="font-semibold text-slate-700 text-sm">Loại khoản chi</h3>
                <p className="text-[10px] text-slate-400">{expenseCategories.length} loại đã cấu hình</p>
              </div>
            </div>

            <div className="p-4 space-y-2">
              {/* Thêm mới */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newExpenseCat}
                  onChange={(e) => setNewExpenseCat(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = newExpenseCat.trim();
                      if (!val) return;
                      if (expenseCategories.includes(val)) {
                        toast.warning('Trùng tên', 'Loại khoản chi này đã tồn tại');
                        return;
                      }
                      setExpenseCategories(prev => [...prev, val]);
                      setNewExpenseCat('');
                    }
                  }}
                  placeholder="Tên loại chi mới..."
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm transition-all"
                />
                <button
                  onClick={() => {
                    const val = newExpenseCat.trim();
                    if (!val) return;
                    if (expenseCategories.includes(val)) {
                      toast.warning('Trùng tên', 'Loại khoản chi này đã tồn tại');
                      return;
                    }
                    setExpenseCategories(prev => [...prev, val]);
                    setNewExpenseCat('');
                  }}
                  disabled={!newExpenseCat.trim()}
                  className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm
                </button>
              </div>

              {/* Danh sách */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {expenseCategories.map((ec, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 group"
                  >
                    {editingExpIdx === idx ? (
                      <>
                        <input
                          autoFocus
                          type="text"
                          value={editingExpVal}
                          onChange={(e) => setEditingExpVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = editingExpVal.trim();
                              if (!val || editingExpIdx === null) return;
                              if (expenseCategories.some((c, i) => c === val && i !== editingExpIdx)) {
                                toast.warning('Trùng tên', 'Loại khoản chi này đã tồn tại');
                                return;
                              }
                              setExpenseCategories(prev => prev.map((c, i) => (i === editingExpIdx ? val : c)));
                              setEditingExpIdx(null);
                              setEditingExpVal('');
                            }
                            if (e.key === 'Escape') { setEditingExpIdx(null); setEditingExpVal(''); }
                          }}
                          className="flex-1 px-2 py-0.5 border border-red-400 rounded text-sm outline-none bg-white"
                        />
                        <button onClick={() => {
                          const val = editingExpVal.trim();
                          if (!val || editingExpIdx === null) return;
                          setExpenseCategories(prev => prev.map((c, i) => (i === editingExpIdx ? val : c)));
                          setEditingExpIdx(null);
                          setEditingExpVal('');
                        }} className="text-emerald-600 hover:text-emerald-700 cursor-pointer">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditingExpIdx(null); setEditingExpVal(''); }} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-slate-700">{ec}</span>
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            onClick={() => { setEditingExpIdx(idx); setEditingExpVal(ec); }}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                            title="Sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              const ok = await toast.confirm({
                                title: `Xóa "${ec}"?`,
                                message: 'Các khoản chi cũ có thể bị ảnh hưởng.',
                                confirmText: 'Xóa',
                                danger: true,
                              });
                              if (ok) setExpenseCategories(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {expenseCategories.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-4">Chưa có loại khoản chi nào</p>
                )}
              </div>
            </div>
          </div>

          {/* Lưu danh mục */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveCategories}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Đang lưu...' : 'Lưu danh mục'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab 3: Backup & Dữ liệu ────────────────────────────────────────── */}
      {activeTab === 'backup' && (
        <div className="space-y-5">
          {/* Backup / Restore cards */}
          <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-3 md:grid-cols-2' : 'md:grid-cols-2'} gap-5`}>
            {/* Backup Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Download className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-800 text-sm">Xuất Backup</h3>
                  <p className="text-[10px] text-emerald-500">Tải toàn bộ dữ liệu về máy</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Backup bao gồm: học viên, lớp học, giao dịch, điểm danh, cài đặt, tài khoản. 
                  File JSON có thể dùng để khôi phục dữ liệu bất cứ lúc nào.
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <FileJson className="w-3.5 h-3.5" />
                  <span>Định dạng: JSON • Tên file: KimAcademy_Backup_[ngày].json</span>
                </div>
                <button
                  onClick={handleBackup}
                  disabled={backupLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all cursor-pointer"
                >
                  {backupLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Đang tạo backup...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Tải Backup ngay
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Restore Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Upload className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-800 text-sm">Khôi phục dữ liệu</h3>
                  <p className="text-[10px] text-amber-500">Nạp lại từ file backup JSON</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-red-600 leading-relaxed font-medium">
                    <strong>Cảnh báo:</strong> Khôi phục sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại. 
                    Hãy tạo backup trước khi thực hiện!
                  </p>
                </div>
                <input
                  ref={restoreInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleRestoreFile}
                />
                <button
                  onClick={() => restoreInputRef.current?.click()}
                  disabled={restoreLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-amber-200 transition-all cursor-pointer"
                >
                  {restoreLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Đang khôi phục...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Chọn file backup để khôi phục
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Seeding Card - Chỉ hiển thị cho admin */}
            {isAdmin && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-violet-50 flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Database className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-indigo-800 text-sm">Tạo dữ liệu mẫu</h3>
                    <p className="text-[10px] text-indigo-500">Thiết lập dữ liệu demo kiểm thử</p>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tạo nhanh dữ liệu mẫu (học viên, lớp học, điểm danh, giao dịch, lương, chi phí) để kiểm thử toàn bộ tính năng và cảnh báo rủi ro của hệ thống.
                  </p>
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-red-600 leading-relaxed font-medium">
                      <strong>Cảnh báo:</strong> Thao tác này sẽ xóa dữ liệu nghiệp vụ hiện tại và thay bằng dữ liệu mẫu để kiểm thử. Không dùng trên dữ liệu thật.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Nhập xác nhận để tiếp tục
                    </label>
                    <input
                      type="text"
                      value={seedConfirmText}
                      onChange={(e) => setSeedConfirmText(e.target.value)}
                      placeholder="Nhập TAO DU LIEU MAU..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    onClick={handleSeedDemo}
                    disabled={seedLoading || seedConfirmText.trim() !== 'TAO DU LIEU MAU'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all cursor-pointer"
                  >
                    {seedLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Đang tạo dữ liệu mẫu...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        Tạo dữ liệu mẫu ngay
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Audit Log Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-4.5 h-4.5 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-700 text-sm">Nhật ký hoạt động</h3>
                  <p className="text-[10px] text-slate-400">{auditLogs.length} bản ghi • Ghi nhận thao tác quan trọng</p>
                </div>
              </div>
              <button
                onClick={loadAuditLogs}
                disabled={auditLoading}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                title="Tải lại"
              >
                <RefreshCw className={`w-4 h-4 ${auditLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Filters */}
            <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  placeholder="Tìm kiếm theo nội dung, người dùng..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                />
              </div>
              <select
                value={auditEntityFilter}
                onChange={e => setAuditEntityFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-violet-500 outline-none cursor-pointer"
              >
                <option value="all">Tất cả loại</option>
                <option value="transaction">💰 Giao dịch</option>
                <option value="student">🎓 Học viên</option>
                <option value="class">📚 Lớp học</option>
                <option value="attendance">✅ Điểm danh</option>
                <option value="system">⚙️ Hệ thống</option>
              </select>
            </div>

            {/* Audit Log List */}
            <div className="max-h-[420px] overflow-y-auto">
              {auditLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
                </div>
              ) : filteredAuditLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 font-medium">Chưa có nhật ký hoạt động</p>
                  <p className="text-xs text-slate-300 mt-1">Các thao tác tạo, sửa, xóa sẽ được ghi lại tự động</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredAuditLogs.map(log => {
                    const actionConfig = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-slate-100 text-slate-600 border-slate-200' };
                    const entityLabel = ENTITY_LABELS[log.entity] || `📋 ${log.entity}`;
                    const isExpanded = showAuditDetails === log.id;
                    const timestamp = log.timestamp
                      ? new Date(log.timestamp).toLocaleString('vi-VN', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '';

                    return (
                      <div
                        key={log.id}
                        className="px-5 py-3 hover:bg-slate-50/50 transition-colors cursor-pointer"
                        onClick={() => setShowAuditDetails(isExpanded ? null : log.id)}
                      >
                        <div className="flex items-center gap-3">
                          {/* Action badge */}
                          <span className={`shrink-0 inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${actionConfig.color}`}>
                            {actionConfig.label}
                          </span>
                          
                          {/* Entity + Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-700 truncate">
                                {entityLabel}
                              </span>
                              {log.details && (
                                <span className="text-xs text-slate-400 truncate hidden sm:inline">
                                  — {log.details}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* User + Time */}
                          <div className="shrink-0 text-right hidden sm:block">
                            <p className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 justify-end">
                              <User className="w-3 h-3" /> {log.user}
                            </p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                              <Clock className="w-3 h-3" /> {timestamp}
                            </p>
                          </div>

                          <ChevronRight className={`w-3.5 h-3.5 text-slate-300 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-2 ml-12 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1 animate-fade-in">
                            <p><strong className="text-slate-500">Chi tiết:</strong> <span className="text-slate-700">{log.details || 'N/A'}</span></p>
                            <p><strong className="text-slate-500">Người thực hiện:</strong> <span className="text-slate-700">{log.user}</span></p>
                            <p><strong className="text-slate-500">Thời gian:</strong> <span className="text-slate-700">{timestamp}</span></p>
                            {log.entityId && <p><strong className="text-slate-500">ID đối tượng:</strong> <span className="font-mono text-slate-600">{log.entityId}</span></p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 4: Tham số hệ thống ───────────────────────────────────────── */}
      {activeTab === 'parameters' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-wrap gap-3">
            <div>
              <h3 className="font-semibold text-slate-700">Tham số hệ thống</h3>
              <p className="text-xs text-slate-400 mt-0.5">Cấu hình các hạn mức, tỷ lệ thuế, bảo hiểm và ngưỡng cảnh báo</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Filter and Search */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full md:max-w-[70%]">
                <button
                  onClick={() => setParamGroupFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    paramGroupFilter === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả
                </button>
                {[
                  { key: 'payroll', label: 'Lương' },
                  { key: 'tax', label: 'Thuế' },
                  { key: 'insurance', label: 'Bảo hiểm' },
                  { key: 'finance', label: 'Tài chính' },
                  { key: 'tuition', label: 'Học phí' },
                  { key: 'attendance', label: 'Điểm danh' },
                  { key: 'alerts', label: 'Cảnh báo' },
                  { key: 'import', label: 'Nhập dữ liệu' },
                  { key: 'system', label: 'Hệ thống' }
                ].map(group => (
                  <button
                    key={group.key}
                    onClick={() => setParamGroupFilter(group.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      paramGroupFilter === group.key
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm tham số..."
                  value={paramSearch}
                  onChange={(e) => setParamSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs transition-all"
                />
              </div>
            </div>

            {/* Params Table */}
            <div className="overflow-x-auto border border-slate-150 rounded-xl">
              {paramLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-155 font-bold">
                      <th className="p-3.5">Tên tham số / Key</th>
                      <th className="p-3.5">Nhóm</th>
                      <th className="p-3.5 text-right">Giá trị hiện tại</th>
                      <th className="p-3.5">Hiệu lực từ</th>
                      <th className="p-3.5">Mô tả</th>
                      <th className="p-3.5 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {(() => {
                      let list = systemParameters.filter(p => p.isActive);
                      if (paramGroupFilter !== 'all') {
                        list = list.filter(p => p.group === paramGroupFilter);
                      }
                      if (paramSearch) {
                        const q = paramSearch.toLowerCase();
                        list = list.filter(p =>
                          p.name.toLowerCase().includes(q) ||
                          p.key.toLowerCase().includes(q) ||
                          (p.description && p.description.toLowerCase().includes(q))
                        );
                      }

                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                              Không tìm thấy tham số nào
                            </td>
                          </tr>
                        );
                      }

                      return list.map(param => {
                        const groupLabel = {
                          payroll: 'Lương', tax: 'Thuế', insurance: 'Bảo hiểm',
                          finance: 'Tài chính', tuition: 'Học phí', attendance: 'Điểm danh',
                          alerts: 'Cảnh báo', import: 'Nhập dữ liệu', system: 'Hệ thống'
                        }[param.group] || param.group;

                        let formattedVal = String(param.value);
                        if (param.valueType === 'money' && typeof param.value === 'number') {
                          formattedVal = param.value.toLocaleString('vi-VN') + ' đ';
                        } else if (param.valueType === 'percent' && typeof param.value === 'number') {
                          formattedVal = param.value + '%';
                        } else if (param.valueType === 'boolean') {
                          formattedVal = param.value ? '🟢 Bật' : '🔴 Tắt';
                        }

                        return (
                          <tr key={param.key} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3.5">
                              <p className="font-semibold text-slate-800">{param.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{param.key}</p>
                            </td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                {groupLabel}
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-semibold text-slate-800 font-mono">
                              {formattedVal}
                            </td>
                            <td className="p-3.5 font-mono text-slate-500">
                              {param.effectiveFrom}
                            </td>
                            <td className="p-3.5 text-slate-400 max-w-[200px] truncate" title={param.description}>
                              {param.description || 'N/A'}
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center justify-center gap-2">
                                {isAdmin ? (
                                  <button
                                    onClick={() => {
                                      setEditingParam(param);
                                      setNewParamValue(param.value);
                                      setParamScope('from_date');
                                      setParamEffectiveFrom(new Date().toISOString().slice(0, 10));
                                      setParamReason('');
                                      setParamPreview(null);
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer animate-fade-in"
                                  >
                                    Sửa
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    title="Chỉ Admin mới có quyền sửa"
                                    className="px-2.5 py-1 text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-200 rounded-lg cursor-not-allowed"
                                  >
                                    Khóa
                                  </button>
                                )}
                                <button
                                  onClick={() => setHistoryParamKey(param.key)}
                                  className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                                >
                                  Lịch sử
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 bg-amber-50/50 border border-amber-100 text-[11px] text-amber-800 rounded-xl">
              💡 <strong>Lưu ý quan trọng:</strong> Mọi sự thay đổi về thuế suất, bảo hiểm hay quy tắc tính toán là cấu hình nội bộ. Vui lòng đối chiếu với phòng kế toán hoặc đơn vị tư vấn trước khi áp dụng chính thức để tránh sai lệch báo cáo tài chính.
            </div>
          </div>
        </div>
      )}

      {/* Edit Parameter Modal */}
      {editingParam && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm">Chỉnh sửa: {editingParam.name}</h3>
              <button type="button" onClick={() => setEditingParam(null)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveParam} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-150 rounded-xl text-[11px] text-blue-700 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Tham số nội bộ. Vui lòng kiểm tra với kế toán/đơn vị tư vấn trước khi áp dụng.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono">
                <p>MÃ: {editingParam.key}</p>
                <p className="text-right">NHÓM: {editingParam.group.toUpperCase()}</p>
              </div>

              {/* Value Input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase block">Giá trị mới</label>
                {editingParam.valueType === 'boolean' ? (
                  <select
                    value={String(newParamValue)}
                    onChange={(e) => setNewParamValue(e.target.value === 'true')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                  >
                    <option value="true">Bật (True)</option>
                    <option value="false">Tắt (False)</option>
                  </select>
                ) : editingParam.valueType === 'select' ? (
                  editingParam.key === 'defaultPayrollTaxMethod' ? (
                    <select
                      value={newParamValue}
                      onChange={(e) => setNewParamValue(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                    >
                      <option value="fixed_percent">Thuế cố định (fixed_percent)</option>
                      <option value="progressive">Thuế lũy tiến (progressive)</option>
                      <option value="none">Không tính thuế (none)</option>
                      <option value="manual_amount">Tự nhập tiền thuế (manual_amount)</option>
                    </select>
                  ) : (
                    <select
                      value={newParamValue}
                      onChange={(e) => setNewParamValue(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                    >
                      <option value="base_salary">Lương cơ bản (base_salary)</option>
                      <option value="regional_minimum">Lương tối thiểu vùng (regional_minimum)</option>
                    </select>
                  )
                ) : editingParam.valueType === 'number' || editingParam.valueType === 'money' || editingParam.valueType === 'percent' ? (
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={newParamValue}
                      onChange={(e) => setNewParamValue(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs font-mono"
                    />
                    {editingParam.unit && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                        {editingParam.unit}
                      </span>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={newParamValue}
                    onChange={(e) => setNewParamValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                  />
                )}
              </div>

              {/* Scope Selection */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase block">Phạm vi áp dụng</label>
                <div className="flex gap-4 mt-1.5">
                  <label className="flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      value="from_date"
                      checked={paramScope === 'from_date'}
                      onChange={() => setParamScope('from_date')}
                      className="w-3.5 h-3.5 text-indigo-600"
                    />
                    Từ ngày hiệu lực
                  </label>
                  <label className="flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      value="all_time"
                      checked={paramScope === 'all_time'}
                      onChange={() => setParamScope('all_time')}
                      className="w-3.5 h-3.5 text-indigo-600"
                    />
                    Áp dụng toàn bộ thời gian
                  </label>
                </div>
              </div>

              {/* Effective From Date */}
              {paramScope === 'from_date' && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase block">Ngày hiệu lực</label>
                  <DateInput
                    value={paramEffectiveFrom}
                    onChange={(v) => setParamEffectiveFrom(v)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs font-mono flex items-center justify-between"
                  />
                </div>
              )}

              {/* Warning for all_time */}
              {paramScope === 'all_time' && (
                <div className="p-3 bg-amber-50 border border-amber-150 rounded-xl text-[11px] text-amber-700 flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Áp dụng toàn bộ thời gian có thể làm thay đổi số liệu lịch sử nếu tính lại.</p>
                </div>
              )}

              {/* Reason for change */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase block flex items-center gap-1">
                  Lý do thay đổi <span className="text-red-500 font-bold">*</span>
                </label>
                <textarea
                  value={paramReason}
                  onChange={(e) => setParamReason(e.target.value)}
                  placeholder="Lý do cập nhật/pháp lý..."
                  required
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                />
              </div>

              {/* Preview Dry-Run Panel */}
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                <p className="font-bold text-slate-600 uppercase tracking-wider block text-[10px]">Preview ảnh hưởng (Dry-Run)</p>
                {previewLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 py-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tính toán ảnh hưởng...</span>
                  </div>
                ) : paramPreview ? (
                  <div className="space-y-1 text-slate-600">
                    <p>• Số bảng lương tạm tính có thể bị ảnh hưởng: <strong className="text-slate-800">{paramPreview.affectedSalariesCount} bản ghi</strong></p>
                    <p>• Số cảnh báo/import có thể đổi ngưỡng: <strong className="text-slate-800">{paramPreview.affectedAlertsCount} danh mục</strong></p>
                    <p className="text-[10px] text-slate-400 italic mt-1.5">{paramPreview.message}</p>
                  </div>
                ) : (
                  <p className="text-slate-400">Không có dữ liệu preview</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingParam(null)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saveParamLoading || !paramReason.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold shadow-lg shadow-indigo-150 disabled:bg-slate-200 disabled:shadow-none disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                >
                  {saveParamLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyParamKey && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm">
                Lịch sử thay đổi: {systemParameters.find(p => p.key === historyParamKey)?.name || historyParamKey}
              </h3>
              <button onClick={() => setHistoryParamKey(null)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-150 font-bold">
                    <th className="p-3">Giá trị</th>
                    <th className="p-3">Thời gian hiệu lực</th>
                    <th className="p-3 font-medium">Người tạo</th>
                    <th className="p-3 font-medium">Ngày thực hiện</th>
                    <th className="p-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {systemParameters
                    .filter(p => p.key === historyParamKey)
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map((ver) => {
                      let formattedVal = String(ver.value);
                      if (ver.valueType === 'money' && typeof ver.value === 'number') {
                        formattedVal = ver.value.toLocaleString('vi-VN') + ' đ';
                      } else if (ver.valueType === 'percent' && typeof ver.value === 'number') {
                        formattedVal = ver.value + '%';
                      } else if (ver.valueType === 'boolean') {
                        formattedVal = ver.value ? 'Bật (True)' : 'Tắt (False)';
                      }

                      return (
                        <tr key={ver.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold font-mono text-slate-800">{formattedVal}</td>
                          <td className="p-3 font-mono text-slate-600">
                            {ver.effectiveFrom} $\rightarrow$ {ver.effectiveTo || 'Vô hạn'}
                          </td>
                          <td className="p-3 text-slate-500 font-medium">{ver.createdBy}</td>
                          <td className="p-3 text-slate-400">
                            {new Date(ver.createdAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="p-3 text-center">
                            {ver.isActive ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                Hiện tại
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200">
                                Hết hạn
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setHistoryParamKey(null)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 font-bold transition-all cursor-pointer shadow-lg shadow-slate-150"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
