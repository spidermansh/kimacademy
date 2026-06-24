import { prisma } from '../src/infrastructure/db/prisma.client';

const tables = [
  'AttendanceRecord', 'TuitionLedgerEntry', 'TuitionTransaction', 'RevenueOther',
  'Enrollment', 'Session', 'Class', 'GuardianContact', 'Student', 'AdmissionLead',
  'TeachingLog', 'AssistantWorkLog', 'SalaryAdvance', 'PayrollItem', 'PayrollPeriod',
  'Expense', 'DailyClose', 'AuditLog', 'SystemParameter', 'FeatureFlag', 'ImportBatch',
  'BackupSnapshot', 'Notification', 'InventoryStock', 'InventoryMovement',
  'InventorySaleBatch', 'InventoryVariant', 'InventoryItem', 'InventoryCategory',
  'Supplier', 'StaffMember', 'User',
];

async function main() {
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);
  for (const t of tables) {
    try { await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE;`); } catch { /* table may not exist */ }
  }
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
  console.log('truncated all tables');
  await prisma.$disconnect();
}
main();
