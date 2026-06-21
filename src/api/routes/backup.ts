import { Router } from 'express';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken, requireAdmin } from '../middleware/auth';

export const backupRouter = Router();

backupRouter.use(authenticateToken);

// GET /api/backup - Download backup data
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
      prisma.inventoryMovement.findMany(),
      prisma.supplier.findMany()
    ]);

    const backupData = {
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
        inventoryMovements,
        suppliers
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=kim_academy_v3_backup_${new Date().toISOString().slice(0,10)}.json`);
    res.json(backupData);
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi sao lưu dữ liệu: ' + error.message });
  }
});

// POST /api/restore - Upload and restore backup data
backupRouter.post('/restore', requireAdmin, async (req, res) => {
  const backupData = req.body;
  if (!backupData || !backupData.data) {
    return res.status(400).json({ message: 'Dữ liệu phục hồi không hợp lệ hoặc bị trống' });
  }

  const payload = backupData.data;

  try {
    console.log('🔄 Bắt đầu phục hồi dữ liệu từ bản sao lưu...');

    // Delete in constraint order (Users table is preserved!)
    await prisma.inventoryMovement.deleteMany({});
    await prisma.inventoryStock.deleteMany({});
    await prisma.inventoryVariant.deleteMany({});
    await prisma.inventoryItem.deleteMany({});
    await prisma.inventoryCategory.deleteMany({});
    await prisma.supplier.deleteMany({});
    await prisma.inventoryLocation.deleteMany({});

    await prisma.auditLog.deleteMany({});
    await prisma.dailyClose.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.systemParameter.deleteMany({});
    await prisma.featureFlag.deleteMany({});

    await prisma.payrollItem.deleteMany({});
    await prisma.payrollPeriod.deleteMany({});
    await prisma.salaryAdvance.deleteMany({});
    await prisma.assistantWorkLog.deleteMany({});
    await prisma.teachingLog.deleteMany({});
    await prisma.attendanceRecord.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.tuitionLedgerEntry.deleteMany({});
    await prisma.tuitionTransaction.deleteMany({});
    await prisma.revenueOther.deleteMany({});
    await prisma.expense.deleteMany({});
    await prisma.enrollment.deleteMany({});
    await prisma.guardianContact.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.class.deleteMany({});
    await prisma.staffMember.deleteMany({});

    // Restore sequentially
    if (payload.staffMember) await prisma.staffMember.createMany({ data: payload.staffMember });
    if (payload.class) await prisma.class.createMany({ data: payload.class });
    if (payload.student) await prisma.student.createMany({ data: payload.student });
    if (payload.guardianContacts) await prisma.guardianContact.createMany({ data: payload.guardianContacts });
    if (payload.enrollment) await prisma.enrollment.createMany({ data: payload.enrollment });
    if (payload.expenses) await prisma.expense.createMany({ data: payload.expenses });
    if (payload.revenueOthers) await prisma.revenueOther.createMany({ data: payload.revenueOthers });
    if (payload.tuitionTransactions) await prisma.tuitionTransaction.createMany({ data: payload.tuitionTransactions });
    if (payload.tuitionLedgerEntries) await prisma.tuitionLedgerEntry.createMany({ data: payload.tuitionLedgerEntries });
    
    if (payload.sessions) await prisma.session.createMany({ data: payload.sessions });
    if (payload.attendanceRecords) await prisma.attendanceRecord.createMany({ data: payload.attendanceRecords });
    if (payload.teachingLogs) await prisma.teachingLog.createMany({ data: payload.teachingLogs });
    if (payload.assistantWorkLogs) await prisma.assistantWorkLog.createMany({ data: payload.assistantWorkLogs });
    if (payload.salaryAdvances) await prisma.salaryAdvance.createMany({ data: payload.salaryAdvances });
    if (payload.payrollPeriods) await prisma.payrollPeriod.createMany({ data: payload.payrollPeriods });
    if (payload.payrollItems) await prisma.payrollItem.createMany({ data: payload.payrollItems });
    
    if (payload.admissionLeads) await prisma.admissionLead.createMany({ data: payload.admissionLeads });
    if (payload.dailyCloses) await prisma.dailyClose.createMany({ data: payload.dailyCloses });
    if (payload.systemParameters) await prisma.systemParameter.createMany({ data: payload.systemParameters });
    if (payload.featureFlags) await prisma.featureFlag.createMany({ data: payload.featureFlags });
    if (payload.notifications) await prisma.notification.createMany({ data: payload.notifications });

    // Restore Inventory
    if (payload.suppliers) await prisma.supplier.createMany({ data: payload.suppliers });
    if (payload.inventoryLocations) await prisma.inventoryLocation.createMany({ data: payload.inventoryLocations });
    if (payload.inventoryCategories) await prisma.inventoryCategory.createMany({ data: payload.inventoryCategories });
    if (payload.inventoryItems) await prisma.inventoryItem.createMany({ data: payload.inventoryItems });
    if (payload.inventoryVariants) await prisma.inventoryVariant.createMany({ data: payload.inventoryVariants });
    if (payload.inventoryStocks) await prisma.inventoryStock.createMany({ data: payload.inventoryStocks });
    if (payload.inventoryMovements) await prisma.inventoryMovement.createMany({ data: payload.inventoryMovements });

    console.log('✅ Phục hồi dữ liệu thành công!');
    res.json({ success: true, message: 'Dữ liệu đã được phục hồi thành công.' });
  } catch (error: any) {
    console.error('Error during data restore:', error);
    res.status(500).json({ message: 'Lỗi trong quá trình phục hồi dữ liệu: ' + error.message });
  }
});
