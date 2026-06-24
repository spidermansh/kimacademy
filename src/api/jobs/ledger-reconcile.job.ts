import cron from 'node-cron';
import { prisma } from '../../infrastructure/db/prisma.client';
import { findLedgerDrift } from '../services/ledger';
import { writeAudit } from '../utils/audit';

/**
 * Job đối soát sổ cái định kỳ: phát hiện chênh lệch giữa sổ cái đã lưu và dữ
 * liệu gốc (giao dịch + điểm danh). KHÔNG tự sửa — chỉ cảnh báo qua Notification
 * + AuditLog để người vận hành chủ động chạy POST /ledger/reconcile khi cần.
 */
async function runLedgerDriftCheck() {
  try {
    const drifts = await findLedgerDrift(prisma);
    if (drifts.length === 0) return;

    const message = `Phát hiện ${drifts.length} sổ cái học phí lệch so với dữ liệu gốc. Vào Đối soát sổ cái để kiểm tra & sửa.`;
    await prisma.notification.create({
      data: {
        type: 'ledger_drift',
        title: 'Sổ cái học phí bị lệch',
        message,
        icon: '⚠️',
        priority: 'high',
        link: '/finance',
      },
    });
    await writeAudit(prisma, undefined, {
      action: 'LEDGER_DRIFT_DETECTED',
      entity: 'tuition_ledger',
      details: message,
    });
    console.warn(`[ledger-reconcile] ${message}`);
  } catch (err) {
    console.error('[ledger-reconcile] check failed:', (err as Error).message);
  }
}

let scheduled = false;

/** Khởi động lịch chạy job (mặc định 01:30 mỗi ngày). Có thể tắt bằng LEDGER_CRON=off. */
export function startLedgerReconcileJob() {
  if (scheduled) return;
  const expr = process.env.LEDGER_CRON || '30 1 * * *';
  if (expr === 'off') return;
  if (!cron.validate(expr)) {
    console.error(`[ledger-reconcile] LEDGER_CRON không hợp lệ: "${expr}", bỏ qua.`);
    return;
  }
  cron.schedule(expr, runLedgerDriftCheck);
  scheduled = true;
  console.log(`🕑 Ledger reconcile job scheduled: "${expr}"`);
}
