import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env';
import { prisma } from '../../infrastructure/db/prisma.client';

const JWT_SECRET = getJwtSecret();

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Không tìm thấy token xác thực' });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }

  // Kiểm tra token chưa bị thu hồi (logout / đổi mật khẩu làm tăng tokenVersion).
  try {
    if (decoded.userId) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { tokenVersion: true },
      });
      if (!user || (decoded.tv ?? 0) !== user.tokenVersion) {
        return res.status(403).json({ message: 'Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.' });
      }
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi xác thực phiên đăng nhập' });
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
  }
  next();
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
    }
    next();
  };
}
