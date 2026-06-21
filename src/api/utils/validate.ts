import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

/**
 * Middleware validate req.body theo một schema zod. Khi hợp lệ, gán bản đã parse
 * (đã ép kiểu/đặt mặc định) lại vào req.body để handler dùng dữ liệu sạch.
 * Khi không hợp lệ, trả 400 kèm thông báo tiếng Việt gọn.
 */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.issues[0];
      const path = first?.path?.join('.') || '';
      const message = path ? `Trường "${path}": ${first.message}` : (first?.message || 'Dữ liệu không hợp lệ');
      return res.status(400).json({ message });
    }
    req.body = result.data;
    next();
  };
}
