import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Clock, CheckCircle2, X, Loader2, Trash2, PlayCircle, RotateCcw } from 'lucide-react';
import { api, formatDate, formatDateKey } from '../../shared/utils';
import { useToast } from './Toast';
import DateInput from './ui/DateInput';

const STATUS_LABEL: Record<string, string> = { pending: 'Chờ xử lý', in_progress: 'Đang làm', done: 'Hoàn thành' };
const PRIORITY_LABEL: Record<string, string> = { low: 'Thấp', normal: 'Thường', high: 'Cao' };
const PRIORITY_CLASS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-500',
  normal: 'bg-sky-100 text-sky-700',
  high: 'bg-rose-100 text-rose-700',
};

interface Props {
  currentUser: { username: string; name: string; role: string };
}

export default function TaskAssignmentPanel({ currentUser }: Props) {
  const toast = useToast();
  const isAdmin = currentUser.role === 'admin';

  const [myUserId, setMyUserId] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'mine' | 'assigned'>('mine');
  const [showCreate, setShowCreate] = useState(false);

  // Form giao việc
  const [fTitle, setFTitle] = useState('');
  const [fContent, setFContent] = useState('');
  const [fDue, setFDue] = useState('');
  const [fPriority, setFPriority] = useState('normal');
  const [fAssignee, setFAssignee] = useState('');

  // Báo cáo hoàn thành
  const [completing, setCompleting] = useState<any | null>(null);
  const [completeNote, setCompleteNote] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [meRes, taskList] = await Promise.all([api.getMe(), api.getTasks()]);
      setMyUserId(meRes?.user?.userId || '');
      setTasks(Array.isArray(taskList) ? taskList : []);
      if (isAdmin) {
        try { setUsers(await api.getUsers()); } catch { /* không lấy được danh sách user */ }
      }
    } catch {
      /* phân hệ có thể trống */
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const today = formatDateKey(new Date());
  const isOverdue = (t: any) => t.status !== 'done' && t.dueDate && t.dueDate < today;

  const myTasks = useMemo(() => tasks.filter(t => t.assigneeUserId === myUserId), [tasks, myUserId]);
  const assignedByMe = useMemo(
    () => tasks.filter(t => t.assignedByUserId === myUserId && t.assigneeUserId !== myUserId),
    [tasks, myUserId]
  );
  const visible = tab === 'mine' ? myTasks : assignedByMe;

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fTitle.trim()) { toast.error('Thiếu tên công việc', 'Vui lòng nhập tên công việc'); return; }
    try {
      await api.createTask({
        title: fTitle.trim(),
        content: fContent || undefined,
        dueDate: fDue || undefined,
        priority: fPriority,
        assigneeUserId: isAdmin ? (fAssignee || undefined) : undefined,
      });
      toast.success('Đã giao việc', isAdmin && fAssignee ? 'Công việc đã được giao' : 'Đã thêm việc cho bạn');
      setShowCreate(false);
      setFTitle(''); setFContent(''); setFDue(''); setFPriority('normal'); setFAssignee('');
      load();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không tạo được công việc');
    }
  };

  const changeStatus = async (t: any, status: string, note?: string) => {
    try {
      await api.setTaskStatus(t.id, { status, completionNote: note });
      load();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không cập nhật được');
    }
  };

  const submitComplete = async () => {
    if (!completing) return;
    await changeStatus(completing, 'done', completeNote);
    setCompleting(null);
    setCompleteNote('');
  };

  const removeTask = async (t: any) => {
    try { await api.deleteTask(t.id); load(); }
    catch (err: any) { toast.error('Lỗi', err.message || 'Không xoá được'); }
  };

  const statusDot = (t: any) =>
    isOverdue(t) ? 'bg-rose-500' : t.status === 'done' ? 'bg-emerald-500' : t.status === 'in_progress' ? 'bg-amber-500' : 'bg-slate-300';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-indigo-600" />
          <h3 className="text-slate-800 text-sm font-extrabold">Công việc được giao</h3>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> {isAdmin ? 'Giao việc' : 'Thêm việc'}
        </button>
      </div>

      {isAdmin && (
        <div className="flex gap-1 mb-3">
          <button onClick={() => setTab('mine')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tab === 'mine' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            Của tôi ({myTasks.length})
          </button>
          <button onClick={() => setTab('assigned')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tab === 'assigned' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            Tôi đã giao ({assignedByMe.length})
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> <span className="text-xs font-medium">Đang tải công việc...</span>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
          <CheckCircle2 className="w-10 h-10 stroke-1 opacity-50 mb-2" />
          <p className="text-xs font-medium">{tab === 'mine' ? 'Không có công việc nào được giao.' : 'Bạn chưa giao việc nào.'}</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
          {visible.map(t => (
            <div key={t.id} className={`rounded-xl border p-3 ${t.status === 'done' ? 'bg-slate-50 border-slate-200' : isOverdue(t) ? 'bg-rose-50/40 border-rose-200' : 'bg-white border-slate-200'}`}>
              <div className="flex items-start gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${statusDot(t)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-xs font-extrabold ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{t.title}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${PRIORITY_CLASS[t.priority] || PRIORITY_CLASS.normal}`}>{PRIORITY_LABEL[t.priority] || t.priority}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500">{STATUS_LABEL[t.status] || t.status}</span>
                  </div>
                  {t.content && <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{t.content}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold flex-wrap">
                    {t.dueDate && (
                      <span className={`flex items-center gap-1 ${isOverdue(t) ? 'text-rose-600' : 'text-slate-400'}`}>
                        <Clock className="w-3 h-3" /> Hạn: {formatDate(t.dueDate)}{isOverdue(t) ? ' · QUÁ HẠN' : ''}
                      </span>
                    )}
                    {tab === 'assigned' && <span className="text-slate-400">Giao cho: {t.assigneeName}</span>}
                    {tab === 'mine' && t.assignedByName && t.assignedByUserId !== myUserId && <span className="text-slate-400">Người giao: {t.assignedByName}</span>}
                  </div>
                  {t.status === 'done' && t.completionNote && (
                    <p className="text-[10px] text-emerald-700 mt-1.5 bg-emerald-50 rounded-lg px-2 py-1">Báo cáo: {t.completionNote}</p>
                  )}
                </div>
              </div>

              {/* Hành động */}
              <div className="flex items-center justify-end gap-1.5 mt-2">
                {tab === 'mine' && t.status !== 'done' && (
                  <>
                    {t.status !== 'in_progress' && (
                      <button onClick={() => changeStatus(t, 'in_progress')} className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg">
                        <PlayCircle className="w-3.5 h-3.5" /> Đang làm
                      </button>
                    )}
                    <button onClick={() => { setCompleting(t); setCompleteNote(''); }} className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành
                    </button>
                  </>
                )}
                {tab === 'mine' && t.status === 'done' && (
                  <button onClick={() => changeStatus(t, 'pending')} className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg">
                    <RotateCcw className="w-3.5 h-3.5" /> Mở lại
                  </button>
                )}
                {tab === 'assigned' && (
                  <button onClick={() => removeTask(t)} className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" /> Xoá
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal giao việc */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">{isAdmin ? 'Giao công việc' : 'Thêm công việc của tôi'}</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-300 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submitCreate} className="p-6 space-y-4">
              {isAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Giao cho</label>
                  <select value={fAssignee} onChange={e => setFAssignee(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm bg-white focus:outline-none focus:border-indigo-500">
                    <option value="">— Chính tôi —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.username}{u.role ? ` · ${u.role}` : ''})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên công việc *</label>
                <input type="text" required value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Ví dụ: Gọi nhắc phụ huynh lớp KET 1" className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nội dung</label>
                <textarea rows={3} value={fContent} onChange={e => setFContent(e.target.value)} placeholder="Mô tả chi tiết công việc..." className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hạn xử lý</label>
                  <DateInput value={fDue} onChange={setFDue} className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-indigo-500 flex items-center justify-between" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ưu tiên</label>
                  <select value={fPriority} onChange={e => setFPriority(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm bg-white focus:outline-none focus:border-indigo-500">
                    <option value="low">Thấp</option>
                    <option value="normal">Thường</option>
                    <option value="high">Cao</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-slate-50">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700">{isAdmin ? 'Giao việc' : 'Thêm việc'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal báo cáo hoàn thành */}
      {completing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-emerald-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Báo cáo hoàn thành</h3>
              <button onClick={() => setCompleting(null)} className="text-slate-200 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">Công việc: <span className="font-bold text-slate-800">{completing.title}</span></p>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ghi chú kết quả (tuỳ chọn)</label>
                <textarea rows={3} value={completeNote} onChange={e => setCompleteNote(e.target.value)} placeholder="Mô tả kết quả / ghi chú khi hoàn thành..." className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setCompleting(null)} className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-slate-50">Hủy</button>
                <button onClick={submitComplete} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700">Xác nhận hoàn thành</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
