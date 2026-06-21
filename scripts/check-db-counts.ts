import { prisma } from '../src/infrastructure/db/prisma.client';

async function main() {
  const counts = {
    students: await prisma.student.count(),
    classes: await prisma.class.count(),
    staff: await prisma.staffMember.count(),
    tuitionTransactions: await prisma.tuitionTransaction.count(),
    attendance: await prisma.attendanceRecord.count(),
    expenses: await prisma.expense.count(),
    teachingLogs: await prisma.teachingLog.count(),
    enrollments: await prisma.enrollment.count(),
    inventoryCategories: await prisma.inventoryCategory.count(),
    inventoryItems: await prisma.inventoryItem.count(),
    inventoryMovements: await prisma.inventoryMovement.count(),
    admissionLeads: await prisma.admissionLead.count(),
    users: await prisma.user.count(),
  };

  console.log('\n=== DATABASE COUNTS ===');
  for (const [key, value] of Object.entries(counts)) {
    const status = value > 0 ? 'OK' : 'EMPTY';
    console.log(`[${status}] ${key}: ${value}`);
  }
  console.log('======================\n');

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
