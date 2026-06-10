import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { db } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Define __dirname in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

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

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: { username: string; role: string; name: string };
    }
  }
}

// Auth Routes
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

// Users Management Routes (Admin only)
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
    
    if (userToDelete.username === req.user.username) {
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

// Transactions Routes
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
      res.json({ success: true, message: 'Xóa giao dịch thành công' });
    } else {
      res.status(404).json({ message: 'Không tìm thấy giao dịch hoặc không thể xóa' });
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

// Students routes
app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    const list = await db.getStudents();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Fallback all frontend routes to index.html (for React SPA routing in production)
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
