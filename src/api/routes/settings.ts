import { Router } from 'express';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken, requireAdmin } from '../middleware/auth';

export const settingsRouter = Router();

settingsRouter.use(authenticateToken);

const DEFAULT_SETTINGS: any = {
  centerName: 'Kim Academy',
  logoUrl: '',
  phone: '0901234567',
  address: '123 Đường Lớn, Quận 1, TP. HCM',
  feeTypes: ['Học phí offline', 'Sách', 'Đồng phục', 'Lệ phí thi', 'Thu khác'],
  paymentMethods: ['Chuyển khoản', 'Tiền mặt', 'Momo', 'ZaloPay', 'Khác'],
  expenseCategories: ['Mặt bằng', 'Điện nước', 'Internet', 'Dụng cụ học tập', 'Marketing/Quảng cáo', 'Văn phòng phẩm', 'Chi khác']
};

// GET /api/settings
settingsRouter.get('/settings', async (req, res) => {
  try {
    const params = await prisma.systemParameter.findMany({
      where: { key: { startsWith: 'settings_' } }
    });

    const settings: any = { ...DEFAULT_SETTINGS };
    params.forEach(p => {
      const key = p.key.replace('settings_', '');
      try {
        if (p.valueType === 'json') {
          settings[key] = JSON.parse(p.value);
        } else {
          settings[key] = p.value;
        }
      } catch (err) {
        settings[key] = p.value;
      }
    });

    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/settings
settingsRouter.put('/settings', requireAdmin, async (req, res) => {
  const data = req.body;
  try {
    for (const key of Object.keys(data)) {
      const dbKey = `settings_${key}`;
      const val = typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key]);
      const valueType = typeof data[key] === 'object' ? 'json' : 'string';

      await prisma.systemParameter.upsert({
        where: { key: dbKey },
        update: { value: val, valueType },
        create: {
          key: dbKey,
          name: `Settings ${key}`,
          group: 'settings',
          valueType,
          value: val,
          effectiveFrom: new Date().toISOString().slice(0, 10),
          createdBy: req.user?.name || req.user?.username || 'admin'
        }
      });
    }

    res.json({ success: true, message: 'Cập nhật cài đặt thành công.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/system-parameters
settingsRouter.get('/system-parameters', async (req, res) => {
  try {
    const params = await prisma.systemParameter.findMany({
      where: { NOT: { key: { startsWith: 'settings_' } } },
      orderBy: { key: 'asc' }
    });
    
    // Map database properties to expected frontend shape
    const formatted = params.map(p => ({
      id: p.id,
      key: p.key,
      name: p.name,
      group: p.group,
      valueType: p.valueType,
      value: p.valueType === 'number' ? Number(p.value) : (p.value === 'true' ? true : (p.value === 'false' ? false : p.value)),
      unit: p.unit || '',
      description: p.description || '',
      effectiveFrom: p.effectiveFrom,
      isActive: p.isActive
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/system-parameters (Create/Update Parameter version)
settingsRouter.post('/system-parameters', requireAdmin, async (req, res) => {
  const { key, value, reason, effectiveFrom } = req.body;
  if (!key || value === undefined) {
    return res.status(400).json({ message: 'Thiếu tham số bắt buộc' });
  }

  try {
    const existing = await prisma.systemParameter.findUnique({ where: { key } });
    const stringVal = String(value);
    const valueType = typeof value === 'number' ? 'number' : (typeof value === 'boolean' ? 'boolean' : 'string');

    const updated = await prisma.systemParameter.upsert({
      where: { key },
      update: {
        value: stringVal,
        valueType,
        updatedBy: req.user?.name || req.user?.username || 'admin',
        updatedAt: new Date()
      },
      create: {
        key,
        name: key,
        group: 'custom',
        valueType,
        value: stringVal,
        effectiveFrom: effectiveFrom || new Date().toISOString().slice(0, 10),
        createdBy: req.user?.name || req.user?.username || 'admin'
      }
    });

    // Add audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_SYSTEM_PARAMETER',
        entity: 'system_parameter',
        entityId: updated.id,
        details: `Cập nhật tham số ${key} thành ${value}. Lý do: ${reason || 'Không có'}`,
        user: req.user?.name || req.user?.username || 'admin'
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/system-parameters/preview
settingsRouter.post('/system-parameters/preview', async (req, res) => {
  const { key, value, effectiveFrom } = req.body;
  // Just echo back or simulate impact
  res.json({ key, value, effectiveFrom, status: 'preview_only' });
});

// GET /api/audit-logs
settingsRouter.get('/audit-logs', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 200;
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    const formatted = logs.map(l => ({
      id: l.id,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId || '',
      details: l.details || '',
      user: l.user || '',
      createdAt: l.timestamp.toISOString(),
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/audit-logs
settingsRouter.post('/audit-logs', async (req, res) => {
  const { action, entity, entityId, details } = req.body;
  if (!action || !entity) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
  }
  try {
    const created = await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: entityId || '',
        details: details || '',
        user: req.user?.name || req.user?.username || 'unknown',
      },
    });
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/seed-demo — Tạo dữ liệu mẫu
settingsRouter.post('/admin/seed-demo', requireAdmin, async (req, res) => {
  const { confirmText } = req.body;
  if (confirmText !== 'TAO DU LIEU MAU') {
    return res.status(400).json({ message: 'Cụm từ xác nhận không đúng' });
  }

  try {
    // Create staff if not exist
    let staffCreated = 0;
    const existingStaff = await prisma.staffMember.count();
    if (existingStaff === 0) {
      await prisma.staffMember.createMany({
        data: [
          { name: 'Cô Nguyễn Thị Kim', role: 'teacher', phone: '0901234567', baseSalary: 5000000, ratePerSession: 300000, status: 'active', startDate: '2024-01-01' },
          { name: 'Thầy Trần Văn Minh', role: 'teacher', phone: '0912345678', baseSalary: 5000000, ratePerSession: 350000, status: 'active', startDate: '2024-01-01' },
          { name: 'Cô Lê Thị Hoa', role: 'teaching_assistant', phone: '0923456789', baseSalary: 3000000, ratePerHour: 50000, status: 'active', startDate: '2024-06-01' },
        ]
      });
      staffCreated = 3;
    }

    // Create classes
    let classesCreated = 0;
    const existingClasses = await prisma.class.count();
    if (existingClasses === 0) {
      const staff = await prisma.staffMember.findMany({ take: 2 });
      await prisma.class.createMany({
        data: [
          { name: 'Lớp Starter A', type: 'offline', teacherId: staff[0]?.id || '', room: 'P101', maxStudents: 12, status: 'active', defaultFeePerSession: 150000, scheduleDays: ['Thứ 2', 'Thứ 4', 'Thứ 6'], scheduleTime: '08:00-09:30' },
          { name: 'Lớp Beginner B', type: 'offline', teacherId: staff[1]?.id || staff[0]?.id || '', room: 'P102', maxStudents: 12, status: 'active', defaultFeePerSession: 180000, scheduleDays: ['Thứ 3', 'Thứ 5', 'Thứ 7'], scheduleTime: '09:30-11:00' },
          { name: 'Lớp Advanced C', type: 'offline', teacherId: staff[0]?.id || '', room: 'P201', maxStudents: 10, status: 'active', defaultFeePerSession: 250000, scheduleDays: ['Thứ 2', 'Thứ 4'], scheduleTime: '14:00-15:30' },
        ]
      });
      classesCreated = 3;
    }

    // Create students + enrollments
    let studentsCreated = 0;
    let enrollmentsCreated = 0;
    const existingStudents = await prisma.student.count();
    if (existingStudents === 0) {
      const classes = await prisma.class.findMany();
      const studentData = [
        { name: 'Nguyễn Minh Anh', vietnameseName: 'Nguyễn Minh Anh', englishName: 'Minh Anh', birthDate: '2016-03-15', status: 'active', enrollDate: '2024-09-01' },
        { name: 'Trần Gia Huy', vietnameseName: 'Trần Gia Huy', englishName: 'Gia Huy', birthDate: '2015-08-22', status: 'active', enrollDate: '2024-09-01' },
        { name: 'Lê Thị Bảo Ngọc', vietnameseName: 'Lê Thị Bảo Ngọc', englishName: 'Bảo Ngọc', birthDate: '2016-12-10', status: 'active', enrollDate: '2024-10-01' },
        { name: 'Phạm Đức Khang', vietnameseName: 'Phạm Đức Khang', englishName: 'Đức Khang', birthDate: '2015-04-05', status: 'active', enrollDate: '2024-09-15' },
        { name: 'Võ Hồng Phúc', vietnameseName: 'Võ Hồng Phúc', englishName: 'Hồng Phúc', birthDate: '2017-01-20', status: 'active', enrollDate: '2024-11-01' },
      ];

      for (let i = 0; i < studentData.length; i++) {
        const s = studentData[i];
        const student = await prisma.student.create({
          data: {
            ...s,
            createdBy: 'seed-demo'
          }
        });
        studentsCreated++;

        // Guardian
        await prisma.guardianContact.create({
          data: { studentId: student.id, name: `Phụ huynh ${s.name}`, phone: `09${String(10000000 + i * 1111111).slice(0, 8)}`, isPrimary: true, relationship: 'parent' }
        });

        // Enrollment
        const cls = classes[i % classes.length];
        const enrollment = await prisma.enrollment.create({
          data: { studentId: student.id, classId: cls.id, feePerSession: cls.defaultFeePerSession, startDate: s.enrollDate, isActive: true, feeHistory: [], createdBy: 'seed-demo' }
        });
        enrollmentsCreated++;

        // Ledger
        await prisma.tuitionLedgerEntry.create({
          data: { studentId: student.id, enrollmentId: enrollment.id, totalPaid: 0, totalSpent: 0, balance: 0, sessionsRemaining: 0 }
        });
      }
    }

    // Count users
    const usersRetained = await prisma.user.count();

    res.json({
      success: true,
      message: 'Tạo dữ liệu mẫu thành công!',
      summary: {
        classesCount: classesCreated,
        studentsCount: studentsCreated,
        transactionsCount: 0,
        attendanceCount: 0,
        expensesCount: 0,
        usersRetained,
        usersAdded: 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
