import { Router } from 'express';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken, requireAdmin, requireRole } from '../middleware/auth';

export const financeRouter = Router();

financeRouter.use(authenticateToken);
const requireFinanceRole = requireRole(['admin', 'staff', 'accountant']);

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
        revenueCategory: 'Há»c phÃ­ offline',
        notes: t.notes || '',
        isReconciled: t.isReconciled,
        isInvoiced: t.isInvoiced,
        senderName: t.notes?.match(/phá»¥ huynh:?\s*(.*)$/i)?.[1] || '',
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
        studentName: t.student?.name || 'KhÃ¡ch vÃ£ng lai',
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
    if (error.message === 'TRANSACTION_NOT_FOUND') {
      return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y giao dá»‹ch' });
    }
    res.status(500).json({ message: error.message });
  }
});

// POST create transaction
financeRouter.post('/transactions', requireFinanceRole, async (req, res) => {
  const data = req.body;
  if (!data.amount || !data.paymentDate || !data.paymentMethod) {
    return res.status(400).json({ message: 'Thiáº¿u thÃ´ng tin giao dá»‹ch báº¯t buá»™c' });
  }

  try {
    const isTuition = data.revenueCategory === 'Há»c phÃ­ offline';
    const saved = await prisma.$transaction(async (tx) => {
      let saved;

    if (isTuition) {
      if (!data.studentId) {
        return res.status(400).json({ message: 'Thu há»c phÃ­ yÃªu cáº§u chá»n há»c viÃªn' });
      }

      // Find student and their enrollments
      const student = await tx.student.findUnique({
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

      saved = await tx.tuitionTransaction.create({
        data: {
          id: data.id || undefined,
          studentId: data.studentId,
          enrollmentId: targetEnroll?.id || null,
          amount: Number(data.amount),
          paymentDate: data.paymentDate,
          paymentMethod: data.paymentMethod,
          term: data.term || 'Ká»³ há»c hiá»‡n táº¡i',
          notes: data.notes || '',
          isReconciled: false,
          isInvoiced: false,
          source: data.source || 'manual',
          createdBy: req.user?.name || req.user?.username || 'unknown'
        }
      });

      // Update student's tuition ledger for this enrollment
      if (targetEnroll) {
        const ledger = await tx.tuitionLedgerEntry.findUnique({
          where: { enrollmentId: targetEnroll.id }
        });
        if (ledger) {
          const newPaid = ledger.totalPaid + Number(data.amount);
          const newBalance = newPaid - ledger.totalSpent;
          const fee = targetEnroll.feePerSession;
          const newSessions = fee > 0 ? Math.floor(newBalance / fee) : 0;

          await tx.tuitionLedgerEntry.update({
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
      saved = await tx.revenueOther.create({
        data: {
          id: data.id || undefined,
          category: data.revenueCategory || 'KhÃ¡c',
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
    await tx.auditLog.create({
      data: {
        action: 'CREATE_TRANSACTION',
        entity: isTuition ? 'tuition_transaction' : 'revenue_other',
        entityId: saved.id,
        details: `Thu tiá»n: ${Number(data.amount).toLocaleString('vi-VN')}Ä‘ â€” Danh má»¥c: ${data.revenueCategory || ''}`,
        user: req.user?.name || req.user?.username || 'unknown'
      }
    });

      return saved;
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
    await prisma.$transaction(async (tx) => {
    // Check if it's TuitionTransaction
    const tuitionTx = await tx.tuitionTransaction.findUnique({
      where: { id }
    });

    if (tuitionTx) {
      await tx.tuitionTransaction.delete({ where: { id } });

      // Recalculate Ledger Entry if enrollmentId is present
      if (tuitionTx.enrollmentId) {
        const ledger = await tx.tuitionLedgerEntry.findUnique({
          where: { enrollmentId: tuitionTx.enrollmentId }
        });
        if (ledger) {
          const newPaid = ledger.totalPaid - tuitionTx.amount;
          const newBalance = newPaid - ledger.totalSpent;
          const enroll = await tx.enrollment.findUnique({ where: { id: tuitionTx.enrollmentId } });
          const fee = enroll ? enroll.feePerSession : 0;
          const newSessions = fee > 0 ? Math.floor(newBalance / fee) : 0;

          await tx.tuitionLedgerEntry.update({
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
      const other = await tx.revenueOther.findUnique({ where: { id } });
      if (!other) {
        throw new Error('TRANSACTION_NOT_FOUND');
      }
      await tx.revenueOther.delete({ where: { id } });
    }

    // Add audit log
    await tx.auditLog.create({
      data: {
        action: 'DELETE_TRANSACTION',
        entity: 'transaction',
        entityId: id,
        details: `XÃ³a giao dá»‹ch #${id}`,
        user: req.user?.name || req.user?.username || 'unknown'
      }
    });
    });

    res.json({ success: true, message: 'XÃ³a giao dá»‹ch thÃ nh cÃ´ng' });
  } catch (error: any) {
    if (error.message === 'TRANSACTION_NOT_FOUND') {
      return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y giao dá»‹ch' });
    }
    res.status(500).json({ message: error.message });
  }
});

// PATCH reconcile transaction
financeRouter.patch('/transactions/:id/reconcile', requireFinanceRole, async (req, res) => {
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
        throw new Error('TRANSACTION_NOT_FOUND');
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
// EXPENSES (Chi phÃ­ váº­n hÃ nh)
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
financeRouter.post('/expenses', requireFinanceRole, async (req, res) => {
  const data = req.body;
  if (!data.amount || !data.date || !data.description || !data.paymentMethod) {
    return res.status(400).json({ message: 'Thiáº¿u thÃ´ng tin chi phÃ­ báº¯t buá»™c' });
  }

  try {
    const created = await prisma.expense.create({
      data: {
        date: data.date,
        category: data.category || 'Chi khÃ¡c',
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
financeRouter.put('/expenses/:id', requireFinanceRole, async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y chi phÃ­' });
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
financeRouter.delete('/expenses/:id', requireFinanceRole, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.expense.delete({ where: { id } });
    res.json({ success: true, message: 'XÃ³a chi phÃ­ thÃ nh cÃ´ng.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});


// ==========================================
// DAILY CLOSING (Chá»‘t ca Ä‘á»‘i soÃ¡t cuá»‘i ngÃ y)
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
financeRouter.post('/daily-close', requireFinanceRole, async (req, res) => {
  const { date, summary, note } = req.body;
  if (!date || !summary) {
    return res.status(400).json({ message: 'Thiáº¿u ngÃ y chá»‘t ca hoáº·c tÃ³m táº¯t sá»‘ liá»‡u chá»‘t' });
  }

  try {
    const existing = await prisma.dailyClose.findFirst({
      where: { date }
    });
    if (existing) {
      return res.status(400).json({ message: `NgÃ y ${date} Ä‘Ã£ Ä‘Æ°á»£c chá»‘t ca trÆ°á»›c Ä‘Ã³.` });
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
        details: `Chá»‘t ca ngÃ y ${date} thÃ nh cÃ´ng.`,
        user: req.user?.name || req.user?.username || 'unknown'
      }
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
