import React, { useState, useEffect } from 'react';
import { api, formatCurrency } from '../utils';
import { TuitionSummary } from '../types';
import { AlertTriangle, CheckCircle2, Wallet, Pencil, X, Save, ChevronDown, ChevronUp, History } from 'lucide-react';

export default function TuitionManagement({ students, transactions }: { students: any[]; transactions: any[] }) {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editFee, setEditFee] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localStudents, setLocalStudents] = useState<any[]>(students);

  useEffect(() => {
    setLocalStudents(students);
  }, [students]);

  useEffect(() => {
    api.getAttendance()
      .then(setAttendance)
      .finally(() => setLoading(false));
  }, []);

  // Compute TuitionSummary for each student
  const summaries: TuitionSummary[] = localStudents.map(student => {
    // Total paid offline
    const totalPaidOffline = transactions
      .filter(t =>
        t.studentName?.toLowerCase() === student.name?.toLowerCase() &&
        t.revenueCategory === 'Học phí offline'
      )
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const feePerSession = Number(student.feePerSession) || 0;
    const totalSessionsBought = feePerSession > 0 ? Math.floor(totalPaidOffline / feePerSession) : 0;

    // Total sessions used (present + absent → trừ buổi; excused → không trừ)
    const totalSessionsUsed = attendance.filter(a =>
      a.studentId === student.id && a.status !== 'excused'
    ).length;

    const sessionsRemaining = totalSessionsBought - totalSessionsUsed;

    return {
      studentId: student.id,
      studentName: student.name,
      className: student.className || '',
      feePerSession,
      totalPaidOffline,
      totalSessionsBought,
      totalSessionsUsed,
      sessionsRemaining,
    };
  }).filter(s => s.totalPaidOffline > 0 || s.feePerSession > 0); // Only show students with data

  // Sort: warning first
  const sorted = [...summaries].sort((a, b) => a.sessionsRemaining - b.sessionsRemaining);

  const getStatusBadge = (remaining: number, feePerSession: number) => {
    if (feePerSession === 0) return { color: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Chưa cài học phí', icon: null };
    if (remaining <= 0) return { color: 'bg-red-100 text-red-700 border-red-300', label: 'Hết buổi!', icon: <AlertTriangle className="w-3.5 h-3.5" /> };
    if (remaining <= 3) return { color: 'bg-amber-100 text-amber-700 border-amber-300', label: `Còn ${remaining} buổi`, icon: <AlertTriangle className="w-3.5 h-3.5" /> };
    return { color: 'bg-emerald-100 text-emerald-700 border-emerald-300', label: `Còn ${remaining} buổi`, icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
  };

  const openEditFee = (student: any) => {
    setEditingStudent(student);
    setEditFee(String(student.feePerSession || ''));
  };

  const handleSaveFee = async () => {
    if (!editingStudent) return;
    const fee = Number(editFee);
    if (isNaN(fee) || fee < 0) {
      alert('Vui lòng nhập học phí hợp lệ (số >= 0)');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateStudent(editingStudent.id, { feePerSession: fee });
      setLocalStudents(prev => prev.map(s => s.id === editingStudent.id ? { ...s, feePerSession: fee } : s));
      setEditingStudent(null);
    } catch (err: any) {
      alert('Lỗi cập nhật học phí: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getStudentAttendance = (studentId: string) =>
    attendance.filter(a => a.studentId === studentId).sort((a, b) => b.date.localeCompare(a.date));

  const getStudentTransactions = (studentName: string) =>
    transactions.filter(t => t.studentName?.toLowerCase() === studentName?.toLowerCase() && t.revenueCategory === 'Học phí offline')
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý Học phí</h2>
          <p className="text-sm text-slate-500 mt-1">Theo dõi số buổi còn lại của từng học viên</p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold">
            {sorted.filter(s => s.sessionsRemaining <= 0 && s.feePerSession > 0).length} hết buổi
          </div>
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 font-semibold">
            {sorted.filter(s => s.sessionsRemaining > 0 && s.sessionsRemaining <= 3 && s.feePerSession > 0).length} sắp hết
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-500 font-medium text-lg">Chưa có dữ liệu học phí</h3>
          <p className="text-slate-400 text-sm mt-2">
            Cần có học viên đã đóng "Học phí offline" và được cài đặt học phí/buổi
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Học viên</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lớp</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">HP/buổi</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã đóng</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Buổi mua</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã học</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Còn lại</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map(s => {
                const badge = getStatusBadge(s.sessionsRemaining, s.feePerSession);
                const isExpanded = expandedId === s.studentId;
                const att = getStudentAttendance(s.studentId);
                const txs = getStudentTransactions(s.studentName);
                const student = localStudents.find(st => st.id === s.studentId);

                return (
                  <React.Fragment key={s.studentId}>
                    <tr className={`hover:bg-slate-50/70 transition-colors ${s.sessionsRemaining <= 0 && s.feePerSession > 0 ? 'bg-red-50/40' : s.sessionsRemaining <= 3 && s.feePerSession > 0 ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {s.studentName.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-800">{s.studentName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-500">{s.className || '—'}</td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => openEditFee(student)}
                          className="flex items-center gap-1 ml-auto text-indigo-600 hover:text-indigo-800 font-medium transition-colors group"
                        >
                          {s.feePerSession > 0 ? (
                            <span>{s.feePerSession.toLocaleString('vi-VN')}đ</span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Chưa cài</span>
                          )}
                          <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-slate-700">{s.totalPaidOffline.toLocaleString('vi-VN')}đ</td>
                      <td className="px-4 py-4 text-right font-semibold text-indigo-600">{s.totalSessionsBought}</td>
                      <td className="px-4 py-4 text-right text-slate-600">{s.totalSessionsUsed}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : s.studentId)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 bg-slate-50/60">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Payment history */}
                            <div>
                              <h4 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-indigo-500" />
                                Lịch sử đóng tiền
                              </h4>
                              {txs.length === 0 ? (
                                <p className="text-slate-400 text-xs italic">Chưa có khoản thu nào</p>
                              ) : (
                                <div className="space-y-2">
                                  {txs.map(t => (
                                    <div key={t.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200 text-xs">
                                      <span className="text-slate-500">{new Date(t.paymentDate).toLocaleDateString('vi-VN')}</span>
                                      <span className="font-semibold text-emerald-700">+{Number(t.amount).toLocaleString('vi-VN')}đ</span>
                                      <span className="text-indigo-600 font-medium">
                                        +{s.feePerSession > 0 ? Math.floor(Number(t.amount) / s.feePerSession) : '?'} buổi
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Attendance history */}
                            <div>
                              <h4 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
                                <History className="w-4 h-4 text-indigo-500" />
                                Lịch sử điểm danh ({att.length} buổi)
                              </h4>
                              {att.length === 0 ? (
                                <p className="text-slate-400 text-xs italic">Chưa có lịch sử điểm danh</p>
                              ) : (
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                  {att.map(a => (
                                    <div key={a.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200 text-xs">
                                      <span className="text-slate-500">{new Date(a.date).toLocaleDateString('vi-VN')}</span>
                                      <span className="text-slate-500">{a.className}</span>
                                      <span className={`font-semibold ${a.status === 'present' ? 'text-emerald-600' : a.status === 'absent' ? 'text-red-500' : 'text-amber-600'}`}>
                                        {a.status === 'present' ? '✅ Có mặt' : a.status === 'absent' ? '❌ Vắng (-1)' : '⏰ Vắng phép'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Also show students without fee data */}
      {localStudents.filter(s => !summaries.find(sum => sum.studentId === s.id)).length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Học viên chưa có dữ liệu học phí offline
          </p>
          <div className="flex flex-wrap gap-2">
            {localStudents.filter(s => !summaries.find(sum => sum.studentId === s.id)).map(s => (
              <button
                key={s.id}
                onClick={() => openEditFee(s)}
                className="flex items-center gap-1.5 text-xs bg-white border border-slate-300 hover:border-indigo-400 text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-full transition-colors"
              >
                {s.name}
                <Pencil className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Edit Fee Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Cài học phí/buổi</h3>
              <button onClick={() => setEditingStudent(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Học viên: <strong className="text-slate-800">{editingStudent.name}</strong>
              </p>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Học phí mỗi buổi (VNĐ)
                </label>
                <input
                  type="number"
                  value={editFee}
                  onChange={e => setEditFee(e.target.value)}
                  placeholder="VD: 87500"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
                {editFee && Number(editFee) > 0 && (
                  <p className="text-xs text-slate-400 mt-2">
                    = {Number(editFee).toLocaleString('vi-VN')} đ/buổi
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setEditingStudent(null)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">
                Hủy
              </button>
              <button
                onClick={handleSaveFee}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
