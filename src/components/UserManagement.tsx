import React, { useState, useEffect } from 'react';
import { api } from '../utils';
import { UserCheck, UserPlus, UserX, Edit2, Key, AlertCircle, CheckCircle } from 'lucide-react';

interface UserManagementProps {
  currentUserUsername: string;
}

export default function UserManagement({ currentUserUsername }: UserManagementProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'staff' | 'teacher'>('staff');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError('Không thể lấy danh sách người dùng: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setUsername('');
    setPassword('');
    setRole('staff');
    setError('');
  };

  const showTemporarySuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !username || (!editingId && !password)) {
      setError('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      if (editingId) {
        // Edit User
        const payload: any = { name, username, role };
        if (password) payload.password = password; // Only update password if provided
        
        await api.updateUser(editingId, payload);
        showTemporarySuccess('Cập nhật người dùng thành công');
        fetchUsers();
        resetForm();
      } else {
        // Create User
        await api.createUser({ name, username, password, role });
        showTemporarySuccess('Tạo mới người dùng thành công');
        fetchUsers();
        resetForm();
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu thông tin người dùng');
    }
  };

  const handleEdit = (user: any) => {
    setEditingId(user.id);
    setName(user.name);
    setUsername(user.username);
    setPassword(''); // Don't show password, type new to change
    setRole(user.role);
    setError('');
  };

  const handleDelete = async (id: string) => {
    setError('');
    try {
      await api.deleteUser(id);
      showTemporarySuccess('Xóa người dùng thành công');
      setConfirmDeleteId(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xóa người dùng');
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-[11px] font-bold text-slate-800 uppercase flex items-center gap-2 tracking-wide">
             <UserCheck className="w-4 h-4 text-indigo-500" />
             Quản lý Người dùng & Phân quyền
          </h2>
        </div>
      </div>

      {success && (
        <div className="mb-6 flex items-center gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-medium">Đang tải danh sách tài khoản...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8">
          
          {/* Left Column: Form */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/60 self-start">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              {editingId ? (
                <>
                  <Edit2 className="w-4 h-4 text-indigo-600" />
                  Cập nhật tài khoản
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  Thêm tài khoản mới
                </>
              )}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Họ và tên</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Tên đăng nhập</label>
                <input
                  type="text"
                  required
                  placeholder="VD: nvvp2"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!!editingId}
                  className={`w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white ${editingId ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                  Mật khẩu {editingId && <span className="text-slate-400 italic font-normal">(để trống nếu giữ nguyên)</span>}
                </label>
                <input
                  type="password"
                  required={!editingId}
                  placeholder={editingId ? "••••••••" : "Nhập mật khẩu"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Vai trò hệ thống</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'staff' | 'teacher')}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white text-slate-700 font-medium"
                >
                  <option value="staff">Nhân viên văn phòng (Staff)</option>
                  <option value="teacher">Giáo viên (Teacher)</option>
                  <option value="admin">Kế toán / Quản trị viên (Admin)</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded shadow-md shadow-indigo-200 transition-colors text-sm cursor-pointer"
                >
                  {editingId ? 'Cập nhật' : 'Thêm User'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded transition-colors text-sm cursor-pointer"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right Column: List */}
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Danh sách tài khoản hệ thống</h3>
            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Họ và tên</th>
                    <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Username</th>
                    <th scope="col" className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mật khẩu</th>
                    <th scope="col" className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vai trò</th>
                    <th scope="col" className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hành động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-800">{u.name}</div>
                        {u.username === currentUserUsername && (
                          <span className="inline-block px-1.5 py-0.5 bg-indigo-50 border border-indigo-150 rounded text-[9px] font-bold text-indigo-700 mt-1 uppercase">Đang đăng nhập</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-slate-600">
                        {u.username}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-xs text-slate-400 font-mono">
                        <span className="flex items-center justify-center gap-1">
                          <Key className="w-3.5 h-3.5 text-slate-300" />
                          {u.password}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                            : u.role === 'teacher'
                            ? 'bg-teal-100 text-teal-700 border border-teal-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                          {u.role === 'admin' ? 'Admin' : u.role === 'teacher' ? 'Teacher' : 'Staff'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        {confirmDeleteId === u.id ? (
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => handleDelete(u.id)} className="text-red-600 font-bold hover:underline">Xác nhận</button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-slate-500 hover:underline">Hủy</button>
                          </div>
                        ) : (
                          <div className="flex gap-3 justify-end items-center">
                            <button 
                              onClick={() => handleEdit(u)}
                              className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                              title="Chỉnh sửa tài khoản"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Sửa
                            </button>
                            {u.username !== currentUserUsername ? (
                              <button 
                                onClick={() => setConfirmDeleteId(u.id)}
                                className="text-red-650 hover:text-red-900 flex items-center gap-1 cursor-pointer"
                                title="Xóa tài khoản"
                              >
                                <UserX className="w-3.5 h-3.5" /> Xóa
                              </button>
                            ) : (
                              <span 
                                className="text-slate-350 cursor-not-allowed flex items-center gap-1"
                                title="Không thể xóa tài khoản hiện tại của bạn"
                              >
                                <UserX className="w-3.5 h-3.5" /> Xóa
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
