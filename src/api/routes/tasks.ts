import { Router } from 'express';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../utils/validate';
import { createTaskSchema, updateTaskStatusSchema } from '../schemas';
import { writeAudit } from '../utils/audit';

export const tasksRouter = Router();
tasksRouter.use(authenticateToken);

const isAdmin = (req: any) => req.user?.role === 'admin';

// GET /tasks — admin xem tất cả (lọc tuỳ chọn theo người/trạng thái); nhân viên chỉ xem việc của mình.
tasksRouter.get('/tasks', async (req, res) => {
  try {
    const where: any = {};
    if (isAdmin(req)) {
      if (req.query.assigneeUserId) where.assigneeUserId = String(req.query.assigneeUserId);
      if (req.query.status) where.status = String(req.query.status);
    } else {
      where.assigneeUserId = req.user?.userId;
    }
    const list = await prisma.assignedTask.findMany({
      where,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /tasks — tạo/giao việc. Admin giao cho bất kỳ ai; nhân viên chỉ tự giao cho mình.
tasksRouter.post('/tasks', validateBody(createTaskSchema), async (req, res) => {
  const { title, content, dueDate, priority, assigneeUserId } = req.body;
  try {
    let finalAssigneeId = req.user?.userId;
    if (isAdmin(req) && assigneeUserId) finalAssigneeId = assigneeUserId;
    const assignee = await prisma.user.findUnique({ where: { id: finalAssigneeId } });
    if (!assignee) return res.status(400).json({ message: 'Không tìm thấy người được giao việc' });

    const task = await prisma.assignedTask.create({
      data: {
        title,
        content: content || null,
        dueDate: dueDate || null,
        priority: priority || 'normal',
        status: 'pending',
        assigneeUserId: finalAssigneeId,
        assigneeName: assignee.name,
        assignedByUserId: req.user?.userId || null,
        assignedByName: req.user?.name || req.user?.username || null,
      },
    });
    await writeAudit(prisma, req, { action: 'create', entity: 'AssignedTask', entityId: task.id, details: `Giao việc "${title}" cho ${assignee.name}` });
    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /tasks/:id — sửa nội dung công việc (admin hoặc người giao).
tasksRouter.put('/tasks/:id', async (req, res) => {
  try {
    const task = await prisma.assignedTask.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ message: 'Không tìm thấy công việc' });
    if (!isAdmin(req) && task.assignedByUserId !== req.user?.userId) {
      return res.status(403).json({ message: 'Không có quyền sửa công việc này' });
    }
    const { title, content, dueDate, priority, assigneeUserId } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content || null;
    if (dueDate !== undefined) data.dueDate = dueDate || null;
    if (priority !== undefined) data.priority = priority;
    if (isAdmin(req) && assigneeUserId && assigneeUserId !== task.assigneeUserId) {
      const assignee = await prisma.user.findUnique({ where: { id: assigneeUserId } });
      if (!assignee) return res.status(400).json({ message: 'Không tìm thấy người được giao việc' });
      data.assigneeUserId = assigneeUserId;
      data.assigneeName = assignee.name;
    }
    const updated = await prisma.assignedTask.update({ where: { id: task.id }, data });
    await writeAudit(prisma, req, { action: 'update', entity: 'AssignedTask', entityId: task.id, details: `Sửa công việc "${updated.title}"` });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /tasks/:id/status — đổi trạng thái / báo cáo hoàn thành (người được giao hoặc admin).
tasksRouter.post('/tasks/:id/status', validateBody(updateTaskStatusSchema), async (req, res) => {
  try {
    const task = await prisma.assignedTask.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ message: 'Không tìm thấy công việc' });
    if (!isAdmin(req) && task.assigneeUserId !== req.user?.userId) {
      return res.status(403).json({ message: 'Không có quyền cập nhật công việc này' });
    }
    const { status, completionNote } = req.body;
    const updated = await prisma.assignedTask.update({
      where: { id: task.id },
      data: {
        status,
        completionNote: completionNote !== undefined ? (completionNote || null) : task.completionNote,
        completedAt: status === 'done' ? (task.completedAt || new Date()) : null,
      },
    });
    await writeAudit(prisma, req, { action: 'status', entity: 'AssignedTask', entityId: task.id, details: `Đổi trạng thái "${updated.title}" → ${status}` });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /tasks/:id — xoá (admin hoặc người giao).
tasksRouter.delete('/tasks/:id', async (req, res) => {
  try {
    const task = await prisma.assignedTask.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ message: 'Không tìm thấy công việc' });
    if (!isAdmin(req) && task.assignedByUserId !== req.user?.userId) {
      return res.status(403).json({ message: 'Không có quyền xoá công việc này' });
    }
    await prisma.assignedTask.delete({ where: { id: task.id } });
    await writeAudit(prisma, req, { action: 'delete', entity: 'AssignedTask', entityId: task.id, details: `Xoá công việc "${task.title}"` });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
