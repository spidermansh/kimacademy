import { Router } from 'express';
import bcryptjs from 'bcryptjs';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateBody } from '../utils/validate';
import { createUserSchema } from '../schemas';

export const usersRouter = Router();

// Apply auth + admin guard to all routes in this file
usersRouter.use(authenticateToken);
usersRouter.use(requireAdmin);

usersRouter.get('/users', async (req, res) => {
  try {
    const list = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        staffId: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

usersRouter.post('/users', validateBody(createUserSchema), async (req, res) => {
  const { username, password, name, role } = req.body;

  try {
    const existing = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });
    if (existing) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const created = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        password: hashedPassword,
        name,
        role
      }
    });

    const { password: _password, ...safeUser } = created;
    res.status(201).json(safeUser);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

usersRouter.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password, name, role } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });
    if (!existingUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const data: any = {};
    if (username && username.toLowerCase() !== existingUser.username) {
      const duplicate = await prisma.user.findUnique({
        where: { username: username.toLowerCase() }
      });
      if (duplicate) {
        return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
      }
      data.username = username.toLowerCase();
    }

    if (password) {
      data.password = await bcryptjs.hash(password, 10);
      // Đổi mật khẩu → thu hồi mọi phiên cũ của user đó.
      data.tokenVersion = { increment: 1 };
    }
    if (name) data.name = name;
    if (role) data.role = role;

    const updated = await prisma.user.update({
      where: { id },
      data
    });

    const { password: _password, ...safeUser } = updated;
    res.json(safeUser);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

usersRouter.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const userToDelete = await prisma.user.findUnique({
      where: { id }
    });

    if (!userToDelete) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    if (userToDelete.username === req.user!.username) {
      return res.status(400).json({ message: 'Không thể tự xóa tài khoản của chính mình!' });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Xóa người dùng thành công' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
