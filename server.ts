import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { db } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: '50mb' }));

// Enable CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static files from Vite build output in production
app.use(express.static(path.join(__dirname, 'dist')));

// In-memory sessions map
const sessions = new Map<string, { username: string; role: string; name: string }>();

// Auth Middleware
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Không tìm thấy token xác thực' });
  }

  const session = sessions.get(token);
  if (!session) {
    return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }

  req.user = session;
  next();
}

declare global {
  namespace Express {
    interface Request {
      user?: { username: string; role: string; name: string };
    }
  }
}

// ─── Auth Routes ─────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ tên đăng nhập và mật khẩu' });
  }

  try {
    const users = await db.getUsers();
    const user = users.find(u => u.username === username.toLowerCase() && u.password === password);

    if (!user) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    sessions.set(token, { username: user.username, role: user.role, name: user.name });

    res.json({
      token,
      user: {
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
  }
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    sessions.delete(token);
  }
  res.json({ message: 'Đăng xuất thành công' });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ─── Users Routes ─────────────────────────────────────────────────────────────
app.get('/api/users', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
  }
  try {
    const users = await db.getUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
  }
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
  }
  try {
    const users = await db.getUsers();
    if (users.some(u => u.username === username.toLowerCase())) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
    }
    const newUser = {
      id: Math.random().toString(36).substring(2, 9),
      username: username.toLowerCase(),
      password,
      name,
      role
    };
    const saved = await db.createUser(newUser);
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
  }
  const { id } = req.params;
  const { username, password, name, role } = req.body;
  try {
    const users = await db.getUsers();
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const updates: any = {};
    if (username && username.toLowerCase() !== users[userIndex].username) {
      if (users.some(u => u.username === username.toLowerCase())) {
        return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
      }
      updates.username = username.toLowerCase();
    }

    if (password) updates.password = password;
    if (name) updates.name = name;
    if (role) updates.role = role;

    const updated = await db.updateUser(id, updates);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
  }
  const { id } = req.params;
  try {
    const users = await db.getUsers();
    const userToDelete = users.find(u => u.id === id);

    if (!userToDelete) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    if (userToDelete.username === req.user!.username) {
      return res.status(400).json({ message: 'Không thể tự xóa tài khoản của chính mình!' });
    }

    const success = await db.deleteUser(id);
    if (success) {
      res.json({ success: true, message: 'Xóa người dùng thành công' });
    } else {
      res.status(500).json({ message: 'Không thể xóa người dùng' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Transactions Routes ──────────────────────────────────────────────────────
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const list = await db.getTransactions();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/transactions', authenticateToken, async (req, res) => {
  const data = req.body;
  const newTx = {
    ...data,
    id: data.id || Math.random().toString(36).substring(2, 9),
    createdAt: data.createdAt || new Date().toISOString(),
    isReconciled: false,
    isInvoiced: false,
  };

  try {
    const saved = await db.createTransaction(newTx);
    await db.upsertStudent(newTx.studentName, newTx.className);
    await db.addAuditLog({
      action: 'CREATE',
      entity: 'transaction',
      entityId: saved.id,
      details: `Thu ${Number(newTx.amount).toLocaleString('vi-VN')}đ — ${newTx.studentName} — ${newTx.revenueCategory || ''}`,
      user: req.user?.name || req.user?.username || 'unknown',
    });
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
  }

  const { id } = req.params;
  try {
    const success = await db.deleteTransaction(id);
    if (success) {
      await db.addAuditLog({
        action: 'DELETE',
        entity: 'transaction',
        entityId: id,
        details: `Xóa giao dịch #${id}`,
        user: req.user?.name || req.user?.username || 'unknown',
      });
      res.json({ success: true, message: 'Xóa giao dịch thành công' });
    } else {
      res.status(404).json({ message: 'Không tìm thấy giao dịch hoặc không thể xóa' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Sửa giao dịch (admin only) — dùng cho Sprint 4.1 và fix dữ liệu
app.put('/api/transactions/:id', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ Quản trị viên mới có quyền sửa giao dịch' });
  }
  const { id } = req.params;
  try {
    const updated = await db.updateTransaction(id, req.body, req.user?.name || req.user?.username);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ message: 'Không tìm thấy giao dịch' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});


app.patch('/api/transactions/:id/reconcile', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { isReconciled } = req.body;

  if (typeof isReconciled !== 'boolean') {
    return res.status(400).json({ message: 'Dữ liệu isReconciled không hợp lệ' });
  }

  try {
    const updated = await db.updateTransactionReconciled(id, isReconciled);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ message: 'Không tìm thấy giao dịch' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.patch('/api/transactions/:id/invoice', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
  }

  const { id } = req.params;
  const { isInvoiced } = req.body;

  if (typeof isInvoiced !== 'boolean') {
    return res.status(400).json({ message: 'Dữ liệu isInvoiced không hợp lệ' });
  }

  try {
    const updated = await db.updateTransactionInvoiced(id, isInvoiced);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ message: 'Không tìm thấy giao dịch' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Students Routes ──────────────────────────────────────────────────────────
app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    const list = await db.getStudents();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/students', authenticateToken, async (req, res) => {
  try {
    const studentData = req.body;
    const saved = await db.createStudent(studentData);
    await db.addAuditLog({
      action: 'CREATE',
      entity: 'student',
      entityId: saved.id,
      details: `Thêm học viên: ${studentData.name} — Lớp ${studentData.className || 'N/A'}`,
      user: req.user?.name || req.user?.username || 'unknown',
    });
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/students/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Lấy thông tin học viên cũ trước khi cập nhật
    const students = await db.getStudents();
    const oldStudent = students.find((s: any) => s.id === id);
    const oldName = oldStudent?.name || '';

    // Sprint 4.2.c: Track fee changes in feeHistory
    const updates = { ...req.body };
    // Remove feeChangeMode from updates (it's metadata, not a student field)
    const feeChangeMode = updates.feeChangeMode || 'retroactive';
    delete updates.feeChangeMode;

    if (oldStudent && updates.feePerSession !== undefined) {
      const oldFee = Number(oldStudent.feePerSession) || 0;
      const newFee = Number(updates.feePerSession) || 0;
      if (oldFee !== newFee) {
        const feeHistory = Array.isArray(oldStudent.feeHistory) ? [...oldStudent.feeHistory] : [];
        feeHistory.push({
          changedBy: req.user?.name || req.user?.username || 'Hệ thống',
          changedAt: new Date().toISOString(),
          oldFee,
          newFee,
          mode: feeChangeMode, // 'retroactive' | 'prospective'
        });
        updates.feeHistory = feeHistory;
      }
    }

    const updated = await db.updateStudent(id, updates);
    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy học viên' });
    }

    // Nếu tên thay đổi → cascade update toàn bộ dữ liệu liên quan
    const newName = updated.name || '';
    if (oldName && newName && oldName.toLowerCase() !== newName.toLowerCase()) {
      const cascadeResult = await db.cascadeUpdateStudentName(id, oldName, newName);
      console.log(`🔄 Cascade update tên "${oldName}" → "${newName}":`, cascadeResult);
      return res.json({
        ...updated,
        _cascadeUpdate: cascadeResult
      });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/students/:id', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
  }
  const { id } = req.params;
  try {
    const success = await db.deleteStudent(id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ message: 'Không tìm thấy học viên' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Classes Routes ───────────────────────────────────────────────────────────
app.get('/api/classes', authenticateToken, async (req, res) => {
  try {
    const list = await db.getClasses();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/classes', authenticateToken, async (req, res) => {
  try {
    const saved = await db.createClass(req.body);
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/classes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await db.updateClass(id, req.body);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ message: 'Không tìm thấy lớp học' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/classes/:id', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
  }
  const { id } = req.params;
  try {
    const success = await db.deleteClass(id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ message: 'Không tìm thấy lớp học' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Attendance Routes ────────────────────────────────────────────────────────
app.get('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const { date, classId, studentId } = req.query;
    const filters: any = {};
    if (date) filters.date = date as string;
    if (classId) filters.classId = classId as string;
    if (studentId) filters.studentId = studentId as string;
    const list = await db.getAttendance(filters);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/attendance/batch', authenticateToken, async (req, res) => {
  try {
    const { records, teacherId, teacherName, isSubstitute, originalTeacherId, originalTeacherName, classId } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'Dữ liệu điểm danh không hợp lệ' });
    }

    // Inject teacher info into each attendance record
    const enrichedRecords = records.map((r: any) => ({
      ...r,
      teacherId: teacherId || undefined,
      teacherName: teacherName || undefined,
      isSubstitute: isSubstitute || false,
    }));

    const saved = await db.createAttendanceBatch(enrichedRecords);

    // ── Auto tạo TeachingLog ──────────────────────────────────────────────
    // Chỉ tạo khi có teacherId VÀ có ít nhất 1 HV "present"
    if (teacherId && records.some((r: any) => r.status === 'present')) {
      const date = records[0]?.date;
      const className = records[0]?.className;

      if (date && className) {
        // Kiểm tra đã có TeachingLog chưa (tránh duplicate)
        const existingLogs = await db.getTeachingLogs({ month: date.slice(0, 7) });
        const alreadyExists = existingLogs.some(
          (l: any) => l.staffId === teacherId && l.date === date && l.className === className
        );

        if (!alreadyExists) {
          await db.createTeachingLog({
            staffId: teacherId,
            staffName: teacherName || '',
            date,
            className,
            classId: classId || '',
            sessions: 1,
            isSubstitute: isSubstitute || false,
            originalTeacherId: isSubstitute ? (originalTeacherId || '') : undefined,
            originalTeacherName: isSubstitute ? (originalTeacherName || '') : undefined,
            source: 'auto',
          });
          console.log(`✅ Auto TeachingLog: ${teacherName} → ${className} (${date})${isSubstitute ? ' [DẠY THAY]' : ''}`);
        }
      }
    }

    res.status(201).json(saved);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/attendance/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Get the record before deleting (to know class+date)
    const allAttendance = await db.getAttendance();
    const deletedRecord = allAttendance.find((a: any) => a.id === id);

    const success = await db.deleteAttendance(id);
    if (success) {
      // ── Cascade: cleanup auto TeachingLog if no more 'present' students ──
      if (deletedRecord) {
        const { date, className, classId } = deletedRecord;
        if (date && (className || classId)) {
          const remaining = allAttendance.filter(
            (a: any) => a.id !== id && a.date === date && 
            (a.className === className || a.classId === classId) &&
            a.status === 'present'
          );
          // If no more present students → remove auto TeachingLog
          if (remaining.length === 0) {
            const logs = await db.getTeachingLogs({ month: date.slice(0, 7) });
            const autoLog = logs.find(
              (l: any) => l.date === date && l.className === className && l.source === 'auto'
            );
            if (autoLog) {
              await db.deleteTeachingLog(autoLog.id);
              console.log(`🗑️ Auto-deleted TeachingLog: ${className} (${date}) — no present students`);
            }
          }
        }
      }
      res.json({ success: true });
    } else {
      res.status(404).json({ message: 'Không tìm thấy bản ghi điểm danh' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Enrollments ─────────────────────────────────────────────────────────────
app.get('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const { studentId, className, isActive } = req.query;
    const filters: any = {};
    if (studentId) filters.studentId = studentId as string;
    if (className) filters.className = className as string;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    const list = await db.getEnrollments(filters);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const created = await db.createEnrollment(req.body);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Chuyển lớp: đóng enrollment cũ + mở enrollment mới + cập nhật student.className
app.post('/api/enrollments/transfer', authenticateToken, async (req, res) => {
  try {
    const { studentId, studentName, newClassName, newFeePerSession, transferDate, transferNote } = req.body;
    if (!studentId || !newClassName || !transferDate) {
      return res.status(400).json({ message: 'Thiếu thông tin chuyển lớp (studentId, newClassName, transferDate)' });
    }
    const result = await db.transferClass({
      studentId, studentName, newClassName,
      newFeePerSession: Number(newFeePerSession) || 0,
      transferDate, transferNote,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});


// ─── Settings Routes ──────────────────────────────────────────────────────────
app.get('/api/settings', async (_req, res) => {
  try {
    const settings = await db.getSettings();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/settings', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ Quản trị viên mới có quyền thay đổi cài đặt' });
  }
  try {
    const updated = await db.updateSettings(req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 🔔 Notifications Routes (Sprint 4.3)
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const list = await db.getNotifications();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const result = await db.updateNotification(req.params.id, { isRead: true });
    if (!result) return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.patch('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const count = await db.markAllNotificationsRead();
    res.json({ success: true, count });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const ok = await db.deleteNotification(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/notifications/generate', authenticateToken, async (req, res) => {
  try {
    const newNotifs = await db.generateNotifications();
    const allNotifs = await db.getNotifications();
    res.json(allNotifs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Backup & Restore Routes ────────────────────────────────────────────────
app.get('/api/backup', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có thể tạo backup' });
  }
  try {
    const backupData = await db.getBackupData();
    await db.addAuditLog({
      action: 'BACKUP',
      entity: 'system',
      details: 'Xuất backup toàn bộ dữ liệu',
      user: req.user?.name || req.user?.username || 'unknown',
    });
    res.json(backupData);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/restore', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có thể khôi phục dữ liệu' });
  }
  try {
    const result = await db.restoreFromBackup(req.body);
    if (result.success) {
      await db.addAuditLog({
        action: 'RESTORE',
        entity: 'system',
        details: `Khôi phục từ backup: ${JSON.stringify(result.stats)}`,
        user: req.user?.name || req.user?.username || 'unknown',
      });
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Audit Log Routes ───────────────────────────────────────────────────────
app.get('/api/audit-logs', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có thể xem audit log' });
  }
  try {
    const limit = parseInt(req.query.limit as string) || 200;
    const logs = await db.getAuditLogs(limit);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
// ═══ STAFF MANAGEMENT MODULE ══════════════════════════════════════════════════

// ─── Staff CRUD ──────────────────────────────────────────────────────────────
app.get('/api/staff', authenticateToken, async (req, res) => {
  try {
    const staff = await db.getStaff();
    res.json(staff);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/staff', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có thể thêm nhân viên' });
  }
  try {
    const now = new Date().toISOString();
    const staff = {
      id: `staff_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      ...req.body,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.createStaff(staff);
    await db.addAuditLog({
      action: 'CREATE',
      entity: 'staff',
      entityId: staff.id,
      details: `Thêm nhân viên: ${staff.name} (${staff.role === 'teacher' ? 'Giáo viên' : 'Văn phòng'})`,
      user: req.user?.name || 'unknown',
    });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/staff/:id', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có thể sửa nhân viên' });
  }
  try {
    const result = await db.updateStaff(req.params.id, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/staff/:id', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có thể xóa nhân viên' });
  }
  try {
    const success = await db.deleteStaff(req.params.id);
    if (!success) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
    await db.addAuditLog({
      action: 'DELETE',
      entity: 'staff',
      entityId: req.params.id,
      details: `Xóa nhân viên ID: ${req.params.id}`,
      user: req.user?.name || 'unknown',
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Expense Management (Quản lý Chi phí) ──────────────────────────────────
app.get('/api/expenses', authenticateToken, async (req, res) => {
  try {
    const query: any = {};
    if (req.query.month) query.month = req.query.month as string;
    if (req.query.category) query.category = req.query.category as string;
    const expenses = await db.getExpenses(query);
    res.json(expenses);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/expenses', authenticateToken, async (req, res) => {
  try {
    const now = new Date().toISOString();
    const expense = {
      id: `exp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      ...req.body,
      createdBy: req.user?.name || 'unknown',
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.createExpense(expense);
    await db.addAuditLog({
      action: 'CREATE',
      entity: 'expense',
      entityId: expense.id,
      details: `Thêm khoản chi: ${expense.category} - ${expense.description} (${expense.amount?.toLocaleString()}đ)`,
      user: req.user?.name || 'unknown',
    });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.updateExpense(req.params.id, req.body);
    await db.addAuditLog({
      action: 'UPDATE',
      entity: 'expense',
      entityId: req.params.id,
      details: `Sửa khoản chi ID: ${req.params.id}`,
      user: req.user?.name || 'unknown',
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/expenses/:id', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có thể xóa khoản chi' });
  }
  try {
    const success = await db.deleteExpense(req.params.id);
    if (!success) return res.status(404).json({ message: 'Không tìm thấy khoản chi' });
    await db.addAuditLog({
      action: 'DELETE',
      entity: 'expense',
      entityId: req.params.id,
      details: `Xóa khoản chi ID: ${req.params.id}`,
      user: req.user?.name || 'unknown',
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Teaching Logs (Chấm công GV) ──────────────────────────────────────────
app.get('/api/teaching-logs', authenticateToken, async (req, res) => {
  try {
    const query: any = {};
    if (req.query.staffId) query.staffId = req.query.staffId as string;
    if (req.query.month) query.month = req.query.month as string;
    const logs = await db.getTeachingLogs(query);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/teaching-logs', authenticateToken, async (req, res) => {
  try {
    const log = {
      id: `tlog_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    const result = await db.createTeachingLog(log);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/teaching-logs/:id', authenticateToken, async (req, res) => {
  try {
    const success = await db.deleteTeachingLog(req.params.id);
    if (!success) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Salary Advances (Ứng lương) ──────────────────────────────────────────
app.get('/api/salary-advances', authenticateToken, async (req, res) => {
  try {
    const query: any = {};
    if (req.query.staffId) query.staffId = req.query.staffId as string;
    if (req.query.month) query.month = req.query.month as string;
    const advances = await db.getSalaryAdvances(query);
    res.json(advances);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/salary-advances', authenticateToken, async (req, res) => {
  try {
    const advance = {
      id: `adv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    const result = await db.createSalaryAdvance(advance);
    await db.addAuditLog({
      action: 'CREATE',
      entity: 'salary_advance',
      entityId: advance.id,
      details: `Ứng lương: ${advance.staffName} - ${advance.amount?.toLocaleString()}đ`,
      user: req.user?.name || 'unknown',
    });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/salary-advances/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.updateSalaryAdvance(req.params.id, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/salary-advances/:id', authenticateToken, async (req, res) => {
  try {
    const success = await db.deleteSalaryAdvance(req.params.id);
    if (!success) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Monthly Salaries (Bảng lương) ──────────────────────────────────────────
app.get('/api/monthly-salaries', authenticateToken, async (req, res) => {
  try {
    const query: any = {};
    if (req.query.month) query.month = req.query.month as string;
    if (req.query.staffId) query.staffId = req.query.staffId as string;
    const salaries = await db.getMonthlySalaries(query);
    res.json(salaries);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/monthly-salaries/calculate', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có thể tính lương' });
  }
  try {
    const { month } = req.body;
    if (!month) return res.status(400).json({ message: 'Thiếu tháng tính lương' });

    const staff = await db.getStaff();
    const activeStaff = staff.filter(s => s.status === 'active');
    const results = [];

    for (const s of activeStaff) {
      const salary = await db.calculateMonthlySalary(s.id, month);
      results.push(salary);
    }

    await db.addAuditLog({
      action: 'CREATE',
      entity: 'monthly_salary',
      details: `Tính lương tháng ${month} cho ${results.length} nhân viên`,
      user: req.user?.name || 'unknown',
    });

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/monthly-salaries/:id/status', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có thể cập nhật trạng thái lương' });
  }
  try {
    const result = await db.updateMonthlySalaryStatus(req.params.id, req.body.status);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/monthly-salaries/:id', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có thể cập nhật bảng lương' });
  }
  try {
    const result = await db.createOrUpdateMonthlySalary({ ...req.body, id: req.params.id });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Fallback all frontend routes to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Initialize DB and then start server
db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});
