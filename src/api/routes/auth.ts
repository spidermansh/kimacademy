import { Router } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken } from '../middleware/auth';
import { getJwtSecret } from '../config/env';

export const authRouter = Router();
const JWT_SECRET = getJwtSecret();

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ tên đăng nhập và mật khẩu' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });

    if (!user || !(await bcryptjs.compare(password, user.password))) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        staffId: user.staffId || '',
        tv: user.tokenVersion
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        username: user.username,
        name: user.name,
        role: user.role,
        staffId: user.staffId || ''
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
  }
});

// Đăng xuất = thu hồi MỌI token đang phát hành cho user (tăng tokenVersion).
authRouter.post('/logout', authenticateToken, async (req, res) => {
  try {
    if (req.user?.userId) {
      await prisma.user.update({
        where: { id: req.user.userId },
        data: { tokenVersion: { increment: 1 } },
      });
    }
    res.json({ message: 'Đăng xuất thành công' });
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi đăng xuất: ' + error.message });
  }
});

// Cấp token mới (gia hạn phiên) nếu token hiện tại còn hợp lệ & chưa bị thu hồi.
authRouter.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        staffId: user.staffId || '',
        tv: user.tokenVersion
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token });
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi gia hạn phiên: ' + error.message });
  }
});

authRouter.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});
