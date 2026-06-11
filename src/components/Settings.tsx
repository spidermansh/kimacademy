import React, { useState, useEffect, useRef } from 'react';
import { AppSettings } from '../types';
import { api } from '../utils';
import { useToast } from './Toast';
import {
  Building2, Phone, MapPin, Image, Save, Plus, Trash2,
  CreditCard, Tag, Edit2, Check, X, Settings as SettingsIcon,
  RotateCcw, Download, Upload, Shield, Clock, Search,
  HardDrive, RefreshCw, FileJson, AlertTriangle, User,
  Database, ChevronDown, ChevronRight,
} from 'lucide-react';

interface SettingsProps {
  onSettingsUpdated?: (settings: AppSettings) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  centerName: 'Kim Academy',
  logoUrl: '',
  phone: '',
  address: '',
  feeTypes: ['Học phí offline', 'Học phí online', 'Sách', 'Đồng phục', 'Lệ phí thi', 'Thu khác'],
  paymentMethods: ['Chuyển khoản', 'Tiền mặt', 'Momo', 'ZaloPay', 'Khác'],
};

const ENTITY_LABELS: Record<string, string> = {
  transaction: '💰 Giao dịch',
  student: '🎓 Học viên',
  class: '📚 Lớp học',
  attendance: '✅ Điểm danh',
  system: '⚙️ Hệ thống',
  user: '👤 Người dùng',
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Tạo mới', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  UPDATE: { label: 'Cập nhật', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  DELETE: { label: 'Xóa', color: 'bg-red-100 text-red-700 border-red-200' },
  BACKUP: { label: 'Backup', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  RESTORE: { label: 'Khôi phục', color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

export default function Settings({ onSettingsUpdated }: SettingsProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'center' | 'categories' | 'backup'>('center');
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

  // Backup states
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Audit log states
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState<string>('all');
  const [showAuditDetails, setShowAuditDetails] = useState<string | null>(null);

  // Tải cài đặt từ API
  useEffect(() => {
    (async () => {
      try {
        const data = await api.getSettings();
        setSettings(data);
        setForm(data);
        setFeeTypes(data.feeTypes || DEFAULT_SETTINGS.feeTypes);
        setPaymentMethods(data.paymentMethods || DEFAULT_SETTINGS.paymentMethods);
      } catch (err) {
        toast.error('Không thể tải cài đặt', 'Sử dụng cài đặt mặc định');
        setFeeTypes(DEFAULT_SETTINGS.feeTypes);
        setPaymentMethods(DEFAULT_SETTINGS.paymentMethods);
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
  const TabBtn = ({ id, label, icon }: { id: 'center' | 'categories' | 'backup'; label: string; icon: React.ReactNode }) => (
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
    </div>
  );
}
