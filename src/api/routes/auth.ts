import { Router } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken } from '../middleware/auth';

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'kim_academy_super_secret_key';

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ tên đăng nhập và mật khẩu' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });

    if (!user || !bcryptjs.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }

    const token = jwt.sign(
      {
        username: user.username,
        role: user.role,
        name: user.name,
        staffId: user.staffId || ''
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

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

authRouter.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Đăng xuất thành công' });
});

authRouter.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});
