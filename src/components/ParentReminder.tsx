import React, { useState, useMemo, useEffect } from 'react';
import { useToast } from './Toast';
import { api } from '../utils';
import * as XLSX from 'xlsx-js-style';
import {
  Phone, MessageSquare, CheckCircle2, Copy, Download, Search,
  AlertTriangle, Clock, PhoneCall, X, Undo2, Trash2
} from 'lucide-react';

interface ParentReminderProps {
  students: any[];
  transactions: any[];
  classes: any[];
  attendance?: any[];
}

interface ContactRecord {
  studentId: string;
  contactedAt: string;
  contactedBy: string;
  method: 'zalo' | 'phone' | 'sms' | 'other';
  notes: string;
}

// Zalo template messages
const ZALO_TEMPLATES = {
  fee_warning: (name: string, vietAnhName: string, remaining: number, className: string) =>
    `Kính gửi Phụ huynh ${vietAnhName || name},\n\nTrung tâm Kim Academy xin thông báo:\n- Học viên: ${name}\n- Lớp: ${className}\n- Số buổi còn lại: ${remaining} buổi\n\nKính mong Phụ huynh thu xếp đóng học phí để bé không bị gián đoạn lớp học.\n\nTrân trọng,\nKim Academy 📚`,

  fee_expired: (name: string, vietAnhName: string, className: string) =>
    `Kính gửi Phụ huynh ${vietAnhName || name},\n\nTrung tâm Kim Academy xin thông báo:\n- Học viên: ${name}\n- Lớp: ${className}\n- Tình trạng: ĐÃ HẾT BUỔI HỌC\n\nĐể bé tiếp tục tham gia lớp học, kính mong Phụ huynh đóng thêm học phí sớm nhất.\n\nMọi thắc mắc xin liên hệ trực tiếp qua số này.\n\nTrân trọng,\nKim Academy 📚`,

  gentle_remind: (name: string, vietAnhName: string, remaining: number, className: string) =>
    `Chào Phụ huynh ${vietAnhName || name} ạ 😊\n\nKim Academy xin nhắc nhẹ: bé ${name} (lớp ${className}) còn ${remaining} buổi học nữa thôi ạ.\n\nPhụ huynh tiện thì đóng thêm để bé học liên tục nha.\n\nCảm ơn Phụ huynh! 🙏`,
};

type FilterType = 'all' | 'expired' | 'warning' | 'contacted' | 'not_contacted';

export default function ParentReminder({ students, transactions, classes, attendance = [] }: ParentReminderProps) {
  const toast = useToast();
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [contactRecords, setContactRecords] = useState<ContactRecord[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState<string | null>(null); // studentId
  const [contactNotes, setContactNotes] = useState('');

  // Load contact records from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kim_contact_records');
      if (saved) setContactRecords(JSON.parse(saved));
    } catch {}
  }, []);

  const saveContactRecords = (records: ContactRecord[]) => {
    setContactRecords(records);
    localStorage.setItem('kim_contact_records', JSON.stringify(records));
  };

  // ── Compute tuition data ───────────────────────────────────────────────────
  const reminderList = useMemo(() => {
    return students
      .filter(s => s.className && (s.status || 'active') === 'active')
      .map(student => {
        const fee = Number(student.feePerSession) || 0;
        const totalPaid = transactions
          .filter(t =>
            // Primary: match by studentId
            (t.studentId && t.studentId === student.id) ||
            // Fallback: match by name for legacy
            (!t.studentId && t.studentName?.toLowerCase() === student.name?.toLowerCase())
          )
          .filter(t =>
            t.revenueCategory === 'Học phí offline' || t.revenueCategory === 'Học phí online'
          )
          .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
        const sessionsBought = fee > 0 ? Math.floor(totalPaid / fee) : 0;
        const sessionsUsed = attendance.filter((a: any) =>
          (a.studentId === student.id || a.studentName?.toLowerCase() === student.name?.toLowerCase()) &&
          a.status !== 'excused'
        ).length;
        const sessionsRemaining = sessionsBought - sessionsUsed;

        // Last contact
        const contacts = contactRecords
          .filter(c => c.studentId === student.id)
          .sort((a, b) => new Date(b.contactedAt).getTime() - new Date(a.contactedAt).getTime());
        const lastContact = contacts[0] || null;

        // Urgency
        let urgency: 'expired' | 'warning' | 'ok' = 'ok';
        if (sessionsRemaining <= 0) urgency = 'expired';
        else if (sessionsRemaining <= 2) urgency = 'warning';

        return {
          ...student,
          fee,
          totalPaid,
          sessionsBought,
          sessionsUsed,
          sessionsRemaining,
          urgency,
          lastContact,
          contactCount: contacts.length,
        };
      })
      .filter(s => s.urgency !== 'ok') // Only show students needing reminder
      .sort((a, b) => a.sessionsRemaining - b.sessionsRemaining); // Most urgent first
  }, [students, transactions, attendance, contactRecords]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = reminderList;

    // Search
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      list = list.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.englishName?.toLowerCase().includes(q) ||
        s.vietAnhName?.toLowerCase().includes(q) ||
        s.className?.toLowerCase().includes(q) ||
        s.parentPhone?.includes(q)
      );
    }

    // Filter
    if (filter === 'expired') list = list.filter(s => s.urgency === 'expired');
    else if (filter === 'warning') list = list.filter(s => s.urgency === 'warning');
    else if (filter === 'contacted') list = list.filter(s => s.lastContact);
    else if (filter === 'not_contacted') list = list.filter(s => !s.lastContact);

    return list;
  }, [reminderList, searchText, filter]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCopyPhone = (phone: string, name: string) => {
    navigator.clipboard.writeText(phone);
    toast.success('Đã copy SĐT!', `${phone} — ${name}`);
  };

  const handleCopyTemplate = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã copy tin nhắn mẫu!', 'Dán vào Zalo để gửi phụ huynh');
  };

  const handleMarkContacted = (studentId: string, method: 'zalo' | 'phone' | 'sms' | 'other') => {
    const record: ContactRecord = {
      studentId,
      contactedAt: new Date().toISOString(),
      contactedBy: 'current_user',
      method,
      notes: contactNotes.trim(),
    };
    saveContactRecords([...contactRecords, record]);
    setShowTemplateModal(null);
    setContactNotes('');
    toast.success('Đã đánh dấu liên hệ!', `Phương thức: ${method === 'zalo' ? 'Zalo' : method === 'phone' ? 'Gọi điện' : method === 'sms' ? 'SMS' : 'Khác'}`);
  };

  const handleUndoLastContact = (studentId: string) => {
    const studentContacts = contactRecords.filter(c => c.studentId === studentId);
    if (studentContacts.length === 0) return;
    // Remove the most recent contact for this student
    const lastContact = studentContacts.sort((a, b) => new Date(b.contactedAt).getTime() - new Date(a.contactedAt).getTime())[0];
    const updated = contactRecords.filter(c => c !== lastContact);
    saveContactRecords(updated);
    toast.info('Đã hoàn tác lần nhắc cuối!', `Còn ${updated.filter(c => c.studentId === studentId).length} lần`);
  };

  const handleClearAllContacts = async (studentId: string, name: string) => {
    const ok = await toast.confirm({
      title: `Xóa toàn bộ lịch sử liên hệ?`,
      message: `Sẽ xóa tất cả lần nhắc của "${name}". Không thể hoàn tác.`,
      confirmText: 'Xóa tất cả',
      danger: true,
    });
    if (!ok) return;
    const updated = contactRecords.filter(c => c.studentId !== studentId);
    saveContactRecords(updated);
    toast.success('Đã xóa toàn bộ lịch sử liên hệ!', name);
  };

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      toast.warning('Không có dữ liệu', 'Danh sách trống.');
      return;
    }

    const data = filtered.map((s, idx) => ({
      'STT': idx + 1,
      'Họ và tên': s.name || '',
      'Tên Việt Anh': s.vietAnhName || '',
      'Lớp': s.className || '',
      'SĐT phụ huynh': s.parentPhone || '',
      'Email phụ huynh': s.parentEmail || '',
      'HP/buổi': s.fee || 0,
      'Buổi còn lại': s.sessionsRemaining,
      'Tình trạng': s.urgency === 'expired' ? 'HẾT BUỔI' : 'SẮP HẾT',
      'Lần liên hệ cuối': s.lastContact ? new Date(s.lastContact.contactedAt).toLocaleDateString('vi-VN') : 'Chưa liên hệ',
      'Số lần liên hệ': s.contactCount,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0] || {}).map(key => ({ wch: Math.max(key.length + 4, 15) }));
    ws['!cols'] = colWidths;

    // Stylize headers
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:K1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: 'DC2626' } },
          font: { color: { rgb: 'FFFFFF' }, bold: true, size: 10 },
          alignment: { horizontal: 'center', vertical: 'center' },
        };
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nhắc Đóng Tiền');
    XLSX.writeFile(wb, `Nhac_Dong_Tien_Kim_Academy_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Xuất file thành công!');
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: reminderList.length,
    expired: reminderList.filter(s => s.urgency === 'expired').length,
    warning: reminderList.filter(s => s.urgency === 'warning').length,
    contacted: reminderList.filter(s => s.lastContact).length,
    notContacted: reminderList.filter(s => !s.lastContact).length,
  }), [reminderList]);

  const templateStudent = showTemplateModal ? reminderList.find(s => s.id === showTemplateModal) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <PhoneCall className="w-6 h-6 text-rose-500" />
            Nhắc Phụ Huynh Đóng Tiền
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {stats.total} học viên cần nhắc — {stats.notContacted} chưa liên hệ
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Xuất DS Nhắc ({filtered.length})
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setFilter(filter === 'expired' ? 'all' : 'expired')}
          className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
            filter === 'expired' ? 'border-red-400 bg-red-50 shadow-md' : 'border-slate-200 bg-white hover:border-red-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Hết buổi</span>
          </div>
          <p className="text-2xl font-black text-red-700">{stats.expired}</p>
          <p className="text-[10px] text-slate-400">Cần đóng tiền ngay</p>
        </button>

        <button
          onClick={() => setFilter(filter === 'warning' ? 'all' : 'warning')}
          className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
            filter === 'warning' ? 'border-amber-400 bg-amber-50 shadow-md' : 'border-slate-200 bg-white hover:border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Sắp hết</span>
          </div>
          <p className="text-2xl font-black text-amber-700">{stats.warning}</p>
          <p className="text-[10px] text-slate-400">Còn 1–2 buổi</p>
        </button>

        <button
          onClick={() => setFilter(filter === 'contacted' ? 'all' : 'contacted')}
          className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
            filter === 'contacted' ? 'border-emerald-400 bg-emerald-50 shadow-md' : 'border-slate-200 bg-white hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Đã liên hệ</span>
          </div>
          <p className="text-2xl font-black text-emerald-700">{stats.contacted}</p>
          <p className="text-[10px] text-slate-400">Đã nhắc rồi</p>
        </button>

        <button
          onClick={() => setFilter(filter === 'not_contacted' ? 'all' : 'not_contacted')}
          className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
            filter === 'not_contacted' ? 'border-violet-400 bg-violet-50 shadow-md' : 'border-slate-200 bg-white hover:border-violet-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Phone className="w-4 h-4 text-violet-500" />
            <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">Chưa liên hệ</span>
          </div>
          <p className="text-2xl font-black text-violet-700">{stats.notContacted}</p>
          <p className="text-[10px] text-slate-400">Cần nhắc ngay</p>
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, lớp, SĐT..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>
        {filter !== 'all' && (
          <button
            onClick={() => setFilter('all')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
            Bỏ lọc
          </button>
        )}
      </div>

      {/* Student List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
          <h3 className="text-slate-500 font-medium text-lg">
            {stats.total === 0 ? 'Tất cả học viên đều ổn!' : 'Không có kết quả phù hợp'}
          </h3>
          <p className="text-slate-400 text-sm mt-2">
            {stats.total === 0 ? 'Không có học viên nào cần nhắc đóng tiền 🎉' : 'Thử bỏ bộ lọc hoặc đổi từ khóa'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(student => (
            <StudentReminderCard
              key={student.id}
              student={student}
              onCopyPhone={handleCopyPhone}
              onOpenTemplate={() => setShowTemplateModal(student.id)}
              onMarkContacted={(method) => handleMarkContacted(student.id, method)}
              onUndoContact={() => handleUndoLastContact(student.id)}
              onClearContacts={() => handleClearAllContacts(student.id, student.name)}
            />
          ))}
        </div>
      )}

      {/* ── Template Modal ────────────────────────────────────────────────────── */}
      {showTemplateModal && templateStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-rose-600 to-pink-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">Tin nhắn mẫu Zalo</h3>
                  <p className="text-rose-200 text-xs mt-0.5">
                    {templateStudent.name} — {templateStudent.className}
                  </p>
                </div>
                <button onClick={() => setShowTemplateModal(null)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Phone quick actions */}
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
                <Phone className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-mono font-bold text-slate-700 flex-1">
                  {templateStudent.parentPhone || 'Chưa có SĐT'}
                </span>
                {templateStudent.parentPhone && (
                  <>
                    <button
                      onClick={() => handleCopyPhone(templateStudent.parentPhone, templateStudent.name)}
                      className="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3 inline mr-1" />
                      Copy
                    </button>
                    <a
                      href={`tel:${templateStudent.parentPhone}`}
                      className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold rounded-lg transition-colors"
                    >
                      <PhoneCall className="w-3 h-3 inline mr-1" />
                      Gọi
                    </a>
                  </>
                )}
              </div>

              {/* Template messages */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chọn tin nhắn mẫu:</p>

                {templateStudent.urgency === 'expired' ? (
                  <>
                    <TemplateCard
                      title="🚨 Thông báo hết buổi"
                      text={ZALO_TEMPLATES.fee_expired(templateStudent.name, templateStudent.vietAnhName || '', templateStudent.className)}
                      onCopy={handleCopyTemplate}
                      urgent
                    />
                    <TemplateCard
                      title="😊 Nhắc nhẹ nhàng"
                      text={ZALO_TEMPLATES.gentle_remind(templateStudent.name, templateStudent.vietAnhName || '', templateStudent.sessionsRemaining, templateStudent.className)}
                      onCopy={handleCopyTemplate}
                    />
                  </>
                ) : (
                  <>
                    <TemplateCard
                      title="📋 Thông báo sắp hết buổi"
                      text={ZALO_TEMPLATES.fee_warning(templateStudent.name, templateStudent.vietAnhName || '', templateStudent.sessionsRemaining, templateStudent.className)}
                      onCopy={handleCopyTemplate}
                    />
                    <TemplateCard
                      title="😊 Nhắc nhẹ nhàng"
                      text={ZALO_TEMPLATES.gentle_remind(templateStudent.name, templateStudent.vietAnhName || '', templateStudent.sessionsRemaining, templateStudent.className)}
                      onCopy={handleCopyTemplate}
                    />
                  </>
                )}
              </div>

              {/* Contact notes */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                  Ghi chú liên hệ (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="VD: PH hẹn đóng thứ 6..."
                  value={contactNotes}
                  onChange={e => setContactNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              {/* Mark as contacted */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Đánh dấu đã liên hệ:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleMarkContacted(templateStudent.id, 'zalo')}
                    className="flex items-center justify-center gap-2 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Đã nhắn Zalo
                  </button>
                  <button
                    onClick={() => handleMarkContacted(templateStudent.id, 'phone')}
                    className="flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer"
                  >
                    <PhoneCall className="w-4 h-4" />
                    Đã gọi điện
                  </button>
                  <button
                    onClick={() => handleMarkContacted(templateStudent.id, 'sms')}
                    className="flex items-center justify-center gap-2 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Đã nhắn SMS
                  </button>
                  <button
                    onClick={() => handleMarkContacted(templateStudent.id, 'other')}
                    className="flex items-center justify-center gap-2 py-2.5 bg-slate-500 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Khác
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StudentReminderCardProps {
  key?: React.Key;
  student: any;
  onCopyPhone: (phone: string, name: string) => void;
  onOpenTemplate: () => void;
  onMarkContacted: (method: 'zalo' | 'phone') => void;
  onUndoContact: () => void;
  onClearContacts: () => void;
}

function StudentReminderCard({
  student,
  onCopyPhone,
  onOpenTemplate,
  onMarkContacted,
  onUndoContact,
  onClearContacts,
}: StudentReminderCardProps) {
  const isExpired = student.urgency === 'expired';
  const borderColor = isExpired ? 'border-l-red-500' : 'border-l-amber-400';
  const bgColor = isExpired ? 'bg-red-50/30' : 'bg-amber-50/30';

  return (
    <div className={`bg-white rounded-xl border border-slate-200 border-l-4 ${borderColor} ${bgColor} p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
          isExpired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {student.name?.charAt(0) || '?'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">
                {student.name}
                {student.englishName && (
                  <span className="text-xs text-indigo-400 font-normal ml-1">({student.englishName})</span>
                )}
              </h4>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                <span className="font-medium text-indigo-600">{student.className}</span>
                <span className="text-slate-300">•</span>
                <span className={`font-bold ${isExpired ? 'text-red-600' : 'text-amber-600'}`}>
                  {isExpired ? `Hết buổi (${student.sessionsRemaining})` : `Còn ${student.sessionsRemaining} buổi`}
                </span>
              </div>
            </div>

            {/* Urgency badge */}
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isExpired
                ? 'bg-red-100 text-red-700 border border-red-200'
                : 'bg-amber-100 text-amber-700 border border-amber-200'
            }`}>
              {isExpired ? '🔴 KHẨN' : '🟡 SẮP HẾT'}
            </span>
          </div>

          {/* Phone + Actions */}
          <div className="flex items-center flex-wrap gap-2 mt-3">
            {student.parentPhone ? (
              <button
                onClick={() => onCopyPhone(student.parentPhone, student.name)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer group"
                title="Click để copy SĐT"
              >
                <Phone className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
                {student.parentPhone}
                <Copy className="w-3 h-3 text-slate-300 group-hover:text-indigo-400" />
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 italic">Chưa có SĐT</span>
            )}

            <button
              onClick={onOpenTemplate}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3 h-3" />
              Tin nhắn mẫu
            </button>

            {/* Quick mark contacted */}
            <button
              onClick={() => onMarkContacted('zalo')}
              className="flex items-center gap-1 px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
              title="Đánh dấu đã nhắn Zalo"
            >
              <CheckCircle2 className="w-3 h-3" />
              Đã nhắc
            </button>
          </div>

          {/* Last contact info */}
          {student.lastContact && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md w-fit">
              <CheckCircle2 className="w-3 h-3" />
              <span>
                Đã liên hệ {new Date(student.lastContact.contactedAt).toLocaleDateString('vi-VN')}
                {student.lastContact.method === 'zalo' && ' qua Zalo'}
                {student.lastContact.method === 'phone' && ' qua điện thoại'}
                {student.lastContact.notes && ` — "${student.lastContact.notes}"`}
              </span>
              <span className="text-emerald-400">({student.contactCount} lần)</span>
              <span className="text-slate-300 mx-0.5">|</span>
              <button
                onClick={onUndoContact}
                className="inline-flex items-center gap-0.5 text-amber-500 hover:text-amber-700 hover:underline cursor-pointer transition-colors"
                title="Hoàn tác lần nhắc cuối"
              >
                <Undo2 className="w-3 h-3" />
                Hoàn tác
              </button>
              {student.contactCount > 1 && (
                <button
                  onClick={onClearContacts}
                  className="inline-flex items-center gap-0.5 text-red-400 hover:text-red-600 hover:underline cursor-pointer transition-colors"
                  title="Xóa toàn bộ lịch sử liên hệ"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  Xóa hết
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────
function TemplateCard({
  title,
  text,
  onCopy,
  urgent,
}: {
  title: string;
  text: string;
  onCopy: (text: string) => void;
  urgent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 ${urgent ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-slate-700">{title}</p>
        <button
          onClick={() => onCopy(text)}
          className="flex items-center gap-1 px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
        >
          <Copy className="w-3 h-3" />
          Copy
        </button>
      </div>
      <pre className="text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">{text}</pre>
    </div>
  );
}
