import { Router } from 'express';
import bcryptjs from 'bcryptjs';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken, requireAdmin } from '../middleware/auth';

export const usersRouter = Router();

// Apply auth + admin guard to all routes in this file
usersRouter.use(authenticateToken);
usersRouter.use(requireAdmin);

usersRouter.get('/users', async (req, res) => {
  try {
    const list = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

usersRouter.post('/users', async (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });
    if (existing) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
    }

    const hashedPassword = bcryptjs.hashSync(password, 10);
    const created = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        password: hashedPassword,
        name,
        role
      }
    });

    res.status(201).json(created);
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

    if (password) data.password = bcryptjs.hashSync(password, 10);
    if (name) data.name = name;
    if (role) data.role = role;

    const updated = await prisma.user.update({
      where: { id },
      data
    });

    res.json(updated);
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
