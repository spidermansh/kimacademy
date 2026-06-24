import { Router } from 'express';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken, requireAdmin } from '../middleware/auth';

export const backupRouter = Router();

backupRouter.use(authenticateToken);

const pickRows = (payload: any, ...keys: string[]) => {
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
};

const createManyIfAny = async (
  model: { createMany(args: { data: any[] }): Promise<unknown> },
  rows: any[]
) => {
  if (rows.length > 0) {
    await model.createMany({ data: rows });
  }
};

backupRouter.get('/backup', requireAdmin, async (req, res) => {
  try {
    const [
      students,
      guardianContacts,
      classes,
      enrollments,
      sessions,
      attendanceRecords,
      tuitionTransactions,
      revenueOthers,
      tuitionLedgerEntries,
      admissionLeads,
      teachingLogs,
      assistantWorkLogs,
      salaryAdvances,
      payrollPeriods,
      payrollItems,
      expenses,
      dailyCloses,
      systemParameters,
      featureFlags,
      notifications,
      inventoryCategories,
      inventoryItems,
      inventoryVariants,
      inventoryLocations,
      inventoryStocks,
      inventorySaleBatches,
      inventoryMovements,
      suppliers
    ] = await Promise.all([
      prisma.student.findMany(),
      prisma.guardianContact.findMany(),
      prisma.class.findMany(),
      prisma.enrollment.findMany(),
      prisma.session.findMany(),
      prisma.attendanceRecord.findMany(),
      prisma.tuitionTransaction.findMany(),
      prisma.revenueOther.findMany(),
      prisma.tuitionLedgerEntry.findMany(),
      prisma.admissionLead.findMany(),
      prisma.teachingLog.findMany(),
      prisma.assistantWorkLog.findMany(),
      prisma.salaryAdvance.findMany(),
      prisma.payrollPeriod.findMany(),
      prisma.payrollItem.findMany(),
      prisma.expense.findMany(),
      prisma.dailyClose.findMany(),
      prisma.systemParameter.findMany(),
      prisma.featureFlag.findMany(),
      prisma.notification.findMany(),
      prisma.inventoryCategory.findMany(),
      prisma.inventoryItem.findMany(),
      prisma.inventoryVariant.findMany(),
      prisma.inventoryLocation.findMany(),
      prisma.inventoryStock.findMany(),
      prisma.inventorySaleBatch.findMany(),
      prisma.inventoryMovement.findMany(),
      prisma.supplier.findMany()
    ]);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=kim_academy_v3_backup_${new Date().toISOString().slice(0, 10)}.json`);
    res.json({
      version: '3.0.0',
      timestamp: new Date().toISOString(),
      data: {
        students,
        guardianContacts,
        classes,
        enrollments,
        sessions,
        attendanceRecords,
        tuitionTransactions,
        revenueOthers,
        tuitionLedgerEntries,
        admissionLeads,
        teachingLogs,
        assistantWorkLogs,
        salaryAdvances,
        payrollPeriods,
        payrollItems,
        expenses,
        dailyCloses,
        systemParameters,
        featureFlags,
        notifications,
        inventoryCategories,
        inventoryItems,
        inventoryVariants,
        inventoryLocations,
        inventoryStocks,
        inventorySaleBatches,
        inventoryMovements,
        suppliers
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: `Backup failed: ${error.message}` });
  }
});

// Các khóa dữ liệu mà restore biết xử lý (đồng bộ với hàm GET /backup).
const KNOWN_BACKUP_KEYS = new Set([
  'staffMembers', 'staffMember', 'classes', 'class', 'students', 'student',
  'guardianContacts', 'enrollments', 'enrollment', 'expenses', 'revenueOthers',
  'tuitionTransactions', 'tuitionLedgerEntries', 'sessions', 'attendanceRecords',
  'teachingLogs', 'assistantWorkLogs', 'salaryAdvances', 'payrollPeriods',
  'payrollItems', 'admissionLeads', 'dailyCloses', 'systemParameters',
  'featureFlags', 'notifications', 'suppliers', 'inventoryLocations',
  'inventoryCategories', 'inventoryItems', 'inventoryVariants', 'inventoryStocks',
  'inventorySaleBatches', 'inventoryMovements',
]);

backupRouter.post('/restore', requireAdmin, async (req, res) => {
  const backupData = req.body;
  if (!backupData || !backupData.data || typeof backupData.data !== 'object') {
    return res.status(400).json({ message: 'Restore payload is empty or invalid' });
  }

  // Chỉ chấp nhận bản sao lưu cùng dòng phiên bản v3 để tránh nạp sai schema.
  const version = String(backupData.version || '');
  if (!version.startsWith('3.')) {
    return res.status(400).json({
      message: `Bản sao lưu phiên bản "${version || 'không rõ'}" không tương thích (yêu cầu v3.x).`,
    });
  }

  const payload = backupData.data;

  // Phát hiện bảng lạ: nếu backup chứa khóa mà restore không xử lý, dữ liệu sẽ bị
  // mất thầm lặng — chặn lại để buộc cập nhật danh sách thay vì âm thầm bỏ qua.
  const unknownKeys = Object.keys(payload).filter(
    (k) => Array.isArray(payload[k]) && !KNOWN_BACKUP_KEYS.has(k)
  );
  if (unknownKeys.length > 0) {
    return res.status(400).json({
      message: `Bản sao lưu chứa dữ liệu chưa được hỗ trợ phục hồi: ${unknownKeys.join(', ')}. Vui lòng cập nhật phiên bản phục hồi.`,
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.inventoryMovement.deleteMany({});
      await tx.inventorySaleBatch.deleteMany({});
      await tx.inventoryStock.deleteMany({});
      await tx.inventoryVariant.deleteMany({});
      await tx.inventoryItem.deleteMany({});
      await tx.inventoryCategory.deleteMany({});
      await tx.supplier.deleteMany({});
      await tx.inventoryLocation.deleteMany({});

      await tx.auditLog.deleteMany({});
      await tx.dailyClose.deleteMany({});
      await tx.notification.deleteMany({});
      await tx.systemParameter.deleteMany({});
      await tx.featureFlag.deleteMany({});

      await tx.payrollItem.deleteMany({});
      await tx.payrollPeriod.deleteMany({});
      await tx.salaryAdvance.deleteMany({});
      await tx.assistantWorkLog.deleteMany({});
      await tx.teachingLog.deleteMany({});
      await tx.attendanceRecord.deleteMany({});
      await tx.session.deleteMany({});
      await tx.tuitionLedgerEntry.deleteMany({});
      await tx.tuitionTransaction.deleteMany({});
      await tx.revenueOther.deleteMany({});
      await tx.expense.deleteMany({});
      await tx.enrollment.deleteMany({});
      await tx.guardianContact.deleteMany({});
      await tx.student.deleteMany({});
      await tx.class.deleteMany({});
      await tx.staffMember.deleteMany({});

      await createManyIfAny(tx.staffMember, pickRows(payload, 'staffMembers', 'staffMember'));
      await createManyIfAny(tx.class, pickRows(payload, 'classes', 'class'));
      await createManyIfAny(tx.student, pickRows(payload, 'students', 'student'));
      await createManyIfAny(tx.guardianContact, pickRows(payload, 'guardianContacts'));
      await createManyIfAny(tx.enrollment, pickRows(payload, 'enrollments', 'enrollment'));
      await createManyIfAny(tx.expense, pickRows(payload, 'expenses'));
      await createManyIfAny(tx.revenueOther, pickRows(payload, 'revenueOthers'));
      await createManyIfAny(tx.tuitionTransaction, pickRows(payload, 'tuitionTransactions'));
      await createManyIfAny(tx.tuitionLedgerEntry, pickRows(payload, 'tuitionLedgerEntries'));
      await createManyIfAny(tx.session, pickRows(payload, 'sessions'));
      await createManyIfAny(tx.attendanceRecord, pickRows(payload, 'attendanceRecords'));
      await createManyIfAny(tx.teachingLog, pickRows(payload, 'teachingLogs'));
      await createManyIfAny(tx.assistantWorkLog, pickRows(payload, 'assistantWorkLogs'));
      await createManyIfAny(tx.salaryAdvance, pickRows(payload, 'salaryAdvances'));
      await createManyIfAny(tx.payrollPeriod, pickRows(payload, 'payrollPeriods'));
      await createManyIfAny(tx.payrollItem, pickRows(payload, 'payrollItems'));
      await createManyIfAny(tx.admissionLead, pickRows(payload, 'admissionLeads'));
      await createManyIfAny(tx.dailyClose, pickRows(payload, 'dailyCloses'));
      await createManyIfAny(tx.systemParameter, pickRows(payload, 'systemParameters'));
      await createManyIfAny(tx.featureFlag, pickRows(payload, 'featureFlags'));
      await createManyIfAny(tx.notification, pickRows(payload, 'notifications'));
      await createManyIfAny(tx.supplier, pickRows(payload, 'suppliers'));
      await createManyIfAny(tx.inventoryLocation, pickRows(payload, 'inventoryLocations'));
      await createManyIfAny(tx.inventoryCategory, pickRows(payload, 'inventoryCategories'));
      await createManyIfAny(tx.inventoryItem, pickRows(payload, 'inventoryItems'));
      await createManyIfAny(tx.inventoryVariant, pickRows(payload, 'inventoryVariants'));
      await createManyIfAny(tx.inventoryStock, pickRows(payload, 'inventoryStocks'));
      await createManyIfAny(tx.inventorySaleBatch, pickRows(payload, 'inventorySaleBatches'));
      await createManyIfAny(tx.inventoryMovement, pickRows(payload, 'inventoryMovements'));
    }, { timeout: 60000 });

    res.json({ success: true, message: 'Restore completed successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: `Restore failed: ${error.message}` });
  }
});
