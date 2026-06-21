import { Router } from 'express';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { findLedgerDrift, recalcEnrollmentLedger } from '../services/ledger';

export const ledgerRouter = Router();

ledgerRouter.use(authenticateToken);

// GET /ledger/reconcile — chỉ đọc: liệt kê các sổ cái bị lệch so với dữ liệu gốc.
ledgerRouter.get('/ledger/reconcile', requireAdmin, async (req, res) => {
  try {
    const drifts = await findLedgerDrift(prisma);
    res.json({ count: drifts.length, drifts });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /ledger/reconcile — sửa: tính lại các sổ cái bị lệch từ dữ liệu gốc.
ledgerRouter.post('/ledger/reconcile', requireAdmin, async (req, res) => {
  try {
    const drifts = await findLedgerDrift(prisma);
    if (drifts.length === 0) {
      return res.json({ fixed: 0, message: 'Sổ cái khớp với dữ liệu gốc, không cần sửa.' });
    }

    await prisma.$transaction(async (tx) => {
      for (const d of drifts) {
        await recalcEnrollmentLedger(tx, d.enrollmentId);
      }
      await tx.auditLog.create({
        data: {
          action: 'RECONCILE_LEDGER',
          entity: 'tuition_ledger',
          details: `Đối soát & sửa ${drifts.length} sổ cái lệch so với dữ liệu gốc`,
          user: req.user?.name || req.user?.username || 'system',
        },
      });
    });

    res.json({ fixed: drifts.length, drifts });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
