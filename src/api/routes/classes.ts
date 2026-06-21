import { Router } from 'express';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateBody } from '../utils/validate';
import { createClassSchema } from '../schemas';

export const classesRouter = Router();

classesRouter.use(authenticateToken);
const requireAcademicRole = requireRole(['admin', 'staff', 'accountant']);

// Helper to format class response consistently with Frontend interface Class
async function formatClass(c: any, staffMap?: Map<string, string>) {
  let activeStaffMap = staffMap;
  if (!activeStaffMap) {
    const staff = await prisma.staffMember.findMany();
    activeStaffMap = new Map<string, string>();
    staff.forEach(s => activeStaffMap!.set(s.id, s.name));
  }
  
  const teacherName = activeStaffMap.get(c.teacherId) || 'Chưa phân công';
  
  let scheduleDays: string[] = [];
  try {
    scheduleDays = typeof c.scheduleDays === 'string' ? JSON.parse(c.scheduleDays || '[]') : (c.scheduleDays || []);
  } catch (err) {
    scheduleDays = [];
  }

  return {
    id: c.id,
    code: c.code,
    name: c.name,
    type: c.type,
    teacherId: c.teacherId,
    teacher: teacherName,
    teacherName,
    room: c.room || '',
    maxStudents: c.maxStudents || 15,
    studentCount: c.enrollments ? c.enrollments.length : await prisma.enrollment.count({ where: { classId: c.id, isActive: true } }),
    status: c.status,
    defaultFee: c.defaultFeePerSession,
    defaultFeePerSession: c.defaultFeePerSession,
    scheduleDays,
    scheduleTime: c.scheduleTime || '',
    description: c.description || '',
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  };
}

// GET all classes
classesRouter.get('/classes', async (req, res) => {
  try {
    const list = await prisma.class.findMany({
      include: {
        enrollments: {
          where: { isActive: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Fetch teachers to populate teacher name
    const staff = await prisma.staffMember.findMany();
    const staffMap = new Map<string, string>();
    staff.forEach(s => staffMap.set(s.id, s.name));

    const formatted = await Promise.all(list.map(c => formatClass(c, staffMap)));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST create class
classesRouter.post('/classes', requireAcademicRole, validateBody(createClassSchema), async (req, res) => {
  const data = req.body;

  try {
    const existing = await prisma.class.findUnique({
      where: { name: data.name }
    });
    if (existing) {
      return res.status(400).json({ message: 'Tên lớp học đã tồn tại' });
    }

    let code = data.code ? String(data.code).trim().toUpperCase() : '';
    if (!code) {
      const cleanName = data.name.replace(/\s+/g, '').toUpperCase();
      code = `LH-${cleanName}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const duplicateCode = await prisma.class.findUnique({
      where: { code }
    });
    if (duplicateCode) {
      return res.status(400).json({ message: 'Mã lớp học đã tồn tại' });
    }

    const created = await prisma.class.create({
      data: {
        code,
        name: data.name,
        type: data.type || 'offline',
        teacherId: data.teacherId,
        room: data.room || null,
        maxStudents: data.maxStudents ? Number(data.maxStudents) : 15,
        status: data.status || 'active',
        defaultFeePerSession: data.defaultFeePerSession !== undefined ? Number(data.defaultFeePerSession) : Number(data.defaultFee || 0),
        scheduleDays: Array.isArray(data.scheduleDays) ? data.scheduleDays : [],
        scheduleTime: data.scheduleTime || null,
        description: data.description || null
      }
    });

    const formatted = await formatClass(created);
    res.status(201).json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update class
classesRouter.put('/classes/:id', requireAcademicRole, async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const existing = await prisma.class.findUnique({
      where: { id }
    });
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy lớp học' });
    }

    // Validate code duplicate if changed
    if (data.code && data.code.trim().toUpperCase() !== existing.code) {
      const duplicateCode = await prisma.class.findUnique({
        where: { code: data.code.trim().toUpperCase() }
      });
      if (duplicateCode) {
        return res.status(400).json({ message: 'Mã lớp học đã tồn tại' });
      }
    }

    const isRenamed = data.name && data.name !== existing.name;
    if (isRenamed) {
      const duplicate = await prisma.class.findUnique({
        where: { name: data.name }
      });
      if (duplicate) {
        return res.status(400).json({ message: 'Tên lớp học đã tồn tại' });
      }
    }

    const updateData: any = {
      code: data.code ? data.code.trim().toUpperCase() : undefined,
      name: data.name,
      type: data.type,
      teacherId: data.teacherId,
      room: data.room,
      maxStudents: data.maxStudents ? Number(data.maxStudents) : undefined,
      status: data.status,
      defaultFeePerSession: data.defaultFeePerSession !== undefined ? Number(data.defaultFeePerSession) : (data.defaultFee !== undefined ? Number(data.defaultFee) : undefined),
      scheduleDays: Array.isArray(data.scheduleDays) ? data.scheduleDays : undefined,
      scheduleTime: data.scheduleTime,
      description: data.description
    };

    let updated;
    if (isRenamed) {
      const renameReason = data.renameReason || 'Cập nhật thông tin hệ thống';
      const changedAt = data.effectiveDate ? new Date(data.effectiveDate) : new Date();
      const changedBy = (req as any).user?.username || 'admin';

      updated = await prisma.$transaction(async (tx) => {
        await tx.classNameHistory.create({
          data: {
            classId: id,
            oldName: existing.name,
            newName: data.name,
            reason: renameReason,
            changedAt,
            changedBy
          }
        });

        return tx.class.update({
          where: { id },
          data: updateData
        });
      });
    } else {
      updated = await prisma.class.update({
        where: { id },
        data: updateData
      });
    }

    const formatted = await formatClass(updated);
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE class
classesRouter.delete('/classes/:id', requireAcademicRole, async (req, res) => {
  const { id } = req.params;

  try {
    const cls = await prisma.class.findUnique({
      where: { id },
      include: {
        enrollments: true,
        sessions: true
      }
    });

    if (!cls) {
      return res.status(404).json({ message: 'Không tìm thấy lớp học' });
    }

    // Check if class has sessions or enrollments
    if (cls.sessions.length > 0 || cls.enrollments.length > 0) {
      // Soft delete by updating status to 'inactive'
      await prisma.class.update({
        where: { id },
        data: { status: 'inactive' }
      });
      return res.json({ success: true, message: 'Đã chuyển trạng thái lớp thành "Ngưng hoạt động" vì có học viên hoặc buổi học.' });
    }

    await prisma.class.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Xóa lớp học thành công.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET class rename history
classesRouter.get('/classes/:id/history', async (req, res) => {
  const { id } = req.params;
  try {
    const history = await prisma.classNameHistory.findMany({
      where: { classId: id },
      orderBy: { changedAt: 'desc' }
    });
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
