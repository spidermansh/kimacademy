import { Router } from 'express';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken, requireAdmin } from '../middleware/auth';

export const financeRouter = Router();

financeRouter.use(authenticateToken);

// ==========================================
// TRANSACTIONS & REVENUE (Tuition + RevenueOther)
// ==========================================

// GET all transactions
financeRouter.get('/transactions', async (req, res) => {
  try {
    const tuitionTx = await prisma.tuitionTransaction.findMany({
      include: {
        student: {
          include: {
            enrollments: {
              where: { isActive: true },
              include: { class: true }
            }
          }
        }
      }
    });

    const otherRev = await prisma.revenueOther.findMany({
      include: {
        student: {
          include: {
            enrollments: {
              where: { isActive: true },
              include: { class: true }
            }
          }
        }
      }
    });

    // Format tuition transactions
    const formattedTuition = tuitionTx.map(t => {
      const activeEnroll = t.student.enrollments[0];
      return {
        id: t.id,
        createdAt: t.createdAt.toISOString(),
        paymentDate: t.paymentDate,
        studentId: t.studentId,
        studentName: t.student.name,
        className: activeEnroll?.class?.name || '',
        amount: t.amount,
        paymentMethod: t.paymentMethod,
        revenueCategory: 'Học phí offline',
        notes: t.notes || '',
        isReconciled: t.isReconciled,
        isInvoiced: t.isInvoiced,
        senderName: t.notes?.match(/phụ huynh:?\s*(.*)$/i)?.[1] || '',
        source: t.source || 'manual'
      };
    });

    // Format other revenue
    const formattedOther = otherRev.map(t => {
      const activeEnroll = t.student?.enrollments[0];
      return {
        id: t.id,
        createdAt: t.createdAt.toISOString(),
        paymentDate: t.paymentDate,
        studentId: t.studentId || '',
        studentName: t.student?.name || 'Khách vãng lai',
        className: activeEnroll?.class?.name || '',
        amount: t.amount,
        paymentMethod: t.paymentMethod,
        revenueCategory: t.category,
        notes: t.description || '',
        isReconciled: t.isReconciled,
        isInvoiced: false,
        senderName: '',
        source: 'manual'
      };
    });

    // Combine and sort by date descending
    const combined = [...formattedTuition, ...formattedOther].sort((a, b) => {
      return b.createdAt.localeCompare(a.createdAt);
    });

    res.json(combined);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST create transaction
financeRouter.post('/transactions', async (req, res) => {
  const data = req.body;
  if (!data.amount || !data.paymentDate || !data.paymentMethod) {
    return res.status(400).json({ message: 'Thiếu thông tin giao dịch bắt buộc' });
  }

  try {
    const isTuition = data.revenueCategory === 'Học phí offline';
    let saved;

    if (isTuition) {
      if (!data.studentId) {
        return res.status(400).json({ message: 'Thu học phí yêu cầu chọn học viên' });
      }

      // Find student and their enrollments
      const student = await prisma.student.findUnique({
        where: { id: data.studentId },
        include: {
          enrollments: {
            include: { class: true }
          }
        }
      });

      // Resolve targeted enrollment
      let targetEnroll = null;
      if (data.enrollmentId) {
        targetEnroll = student?.enrollments.find(e => e.id === data.enrollmentId) || null;
      } else if (data.className) {
        targetEnroll = student?.enrollments.find(e => e.class.name === data.className && e.isActive) || null;
      }
      
      // Fallback to active enrollment first
      if (!targetEnroll) {
        targetEnroll = student?.enrollments.find(e => e.isActive) || student?.enrollments[0] || null;
      }

      saved = await prisma.tuitionTransaction.create({
        data: {
          id: data.id || undefined,
          studentId: data.studentId,
          enrollmentId: targetEnroll?.id || null,
          amount: Number(data.amount),
          paymentDate: data.paymentDate,
          paymentMethod: data.paymentMethod,
          term: data.term || 'Kỳ học hiện tại',
          notes: data.notes || '',
          isReconciled: false,
          isInvoiced: false,
          source: data.source || 'manual',
          createdBy: req.user?.name || req.user?.username || 'unknown'
        }
      });

      // Update student's tuition ledger for this enrollment
      if (targetEnroll) {
        const ledger = await prisma.tuitionLedgerEntry.findUnique({
          where: { enrollmentId: targetEnroll.id }
        });
        if (ledger) {
          const newPaid = ledger.totalPaid + Number(data.amount);
          const newBalance = newPaid - ledger.totalSpent;
          const fee = targetEnroll.feePerSession;
          const newSessions = fee > 0 ? Math.floor(newBalance / fee) : 0;

          await prisma.tuitionLedgerEntry.update({
            where: { enrollmentId: targetEnroll.id },
            data: {
              totalPaid: newPaid,
              balance: newBalance,
              sessionsRemaining: newSessions,
              lastUpdatedAt: new Date()
            }
          });
        }
      }
    } else {
      // RevenueOther (Books, uniform, etc.)
      saved = await prisma.revenueOther.create({
        data: {
          id: data.id || undefined,
          category: data.revenueCategory || 'Khác',
          amount: Number(data.amount),
          paymentDate: data.paymentDate,
          paymentMethod: data.paymentMethod,
          studentId: data.studentId || null,
          description: data.notes || '',
          isReconciled: false,
          createdBy: req.user?.name || req.user?.username || 'unknown'
        }
      });
    }

    // Add audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_TRANSACTION',
        entity: isTuition ? 'tuition_transaction' : 'revenue_other',
        entityId: saved.id,
        details: `Thu tiền: ${Number(data.amount).toLocaleString('vi-VN')}đ — Danh mục: ${data.revenueCategory || ''}`,
        user: req.user?.name || req.user?.username || 'unknown'
      }
    });

    res.status(201).json(saved);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE transaction
financeRouter.delete('/transactions/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Check if it's TuitionTransaction
    const tuitionTx = await prisma.tuitionTransaction.findUnique({
      where: { id }
    });

    if (tuitionTx) {
      await prisma.tuitionTransaction.delete({ where: { id } });

      // Recalculate Ledger Entry if enrollmentId is present
      if (tuitionTx.enrollmentId) {
        const ledger = await prisma.tuitionLedgerEntry.findUnique({
          where: { enrollmentId: tuitionTx.enrollmentId }
        });
        if (ledger) {
          const newPaid = ledger.totalPaid - tuitionTx.amount;
          const newBalance = newPaid - ledger.totalSpent;
          const enroll = await prisma.enrollment.findUnique({ where: { id: tuitionTx.enrollmentId } });
          const fee = enroll ? enroll.feePerSession : 0;
          const newSessions = fee > 0 ? Math.floor(newBalance / fee) : 0;

          await prisma.tuitionLedgerEntry.update({
            where: { enrollmentId: tuitionTx.enrollmentId },
            data: {
              totalPaid: newPaid,
              balance: newBalance,
              sessionsRemaining: newSessions,
              lastUpdatedAt: new Date()
            }
          });
        }
      }
    } else {
      // Must be RevenueOther
      const other = await prisma.revenueOther.findUnique({ where: { id } });
      if (!other) {
        return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
      }
      await prisma.revenueOther.delete({ where: { id } });
    }

    // Add audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_TRANSACTION',
        entity: 'transaction',
        entityId: id,
        details: `Xóa giao dịch #${id}`,
        user: req.user?.name || req.user?.username || 'unknown'
      }
    });

    res.json({ success: true, message: 'Xóa giao dịch thành công' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH reconcile transaction
financeRouter.patch('/transactions/:id/reconcile', async (req, res) => {
  const { id } = req.params;
  const { isReconciled } = req.body;

  try {
    const tuitionTx = await prisma.tuitionTransaction.findUnique({ where: { id } });
    let updated;

    if (tuitionTx) {
      updated = await prisma.tuitionTransaction.update({
        where: { id },
        data: { isReconciled }
      });
    } else {
      const other = await prisma.revenueOther.findUnique({ where: { id } });
      if (!other) {
        return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
      }
      updated = await prisma.revenueOther.update({
        where: { id },
        data: { isReconciled }
      });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH invoice transaction
financeRouter.patch('/transactions/:id/invoice', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { isInvoiced } = req.body;

  try {
    const updated = await prisma.tuitionTransaction.update({
      where: { id },
      data: { isInvoiced }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});


// ==========================================
// EXPENSES (Chi phí vận hành)
// ==========================================

// GET all expenses
financeRouter.get('/expenses', async (req, res) => {
  try {
    const { month, category } = req.query;
    const where: any = {};
    if (month) {
      where.date = { startsWith: month as string };
    }
    if (category) {
      where.category = category as string;
    }

    const list = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' }
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST create expense
financeRouter.post('/expenses', async (req, res) => {
  const data = req.body;
  if (!data.amount || !data.date || !data.description || !data.paymentMethod) {
    return res.status(400).json({ message: 'Thiếu thông tin chi phí bắt buộc' });
  }

  try {
    const created = await prisma.expense.create({
      data: {
        date: data.date,
        category: data.category || 'Chi khác',
        description: data.description,
        amount: Number(data.amount),
        paymentMethod: data.paymentMethod,
        isRecurring: data.isRecurring || false,
        recurringNote: data.recurringNote || '',
        approvedBy: data.approvedBy || '',
        notes: data.notes || '',
        createdBy: req.user?.name || req.user?.username || 'unknown'
      }
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update expense
financeRouter.put('/expenses/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy chi phí' });
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        date: data.date,
        category: data.category,
        description: data.description,
        amount: data.amount ? Number(data.amount) : undefined,
        paymentMethod: data.paymentMethod,
        isRecurring: data.isRecurring,
        recurringNote: data.recurringNote,
        approvedBy: data.approvedBy,
        notes: data.notes
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE expense
financeRouter.delete('/expenses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.expense.delete({ where: { id } });
    res.json({ success: true, message: 'Xóa chi phí thành công.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});


// ==========================================
// DAILY CLOSING (Chốt ca đối soát cuối ngày)
// ==========================================

// GET daily closes
financeRouter.get('/daily-closes', async (req, res) => {
  try {
    const list = await prisma.dailyClose.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST save daily close
financeRouter.post('/daily-close', async (req, res) => {
  const { date, summary, note } = req.body;
  if (!date || !summary) {
    return res.status(400).json({ message: 'Thiếu ngày chốt ca hoặc tóm tắt số liệu chốt' });
  }

  try {
    const existing = await prisma.dailyClose.findFirst({
      where: { date }
    });
    if (existing) {
      return res.status(400).json({ message: `Ngày ${date} đã được chốt ca trước đó.` });
    }

    const created = await prisma.dailyClose.create({
      data: {
        date,
        status: 'completed',
        completedAt: new Date().toISOString(),
        completedBy: req.user?.name || req.user?.username || 'unknown',
        summary: typeof summary === 'string' ? summary : JSON.stringify(summary),
        note: note || ''
      }
    });

    // Add audit log
    await prisma.auditLog.create({
      data: {
        action: 'DAILY_CLOSE',
        entity: 'daily_close',
        entityId: created.id,
        details: `Chốt ca ngày ${date} thành công.`,
        user: req.user?.name || req.user?.username || 'unknown'
      }
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
