-- AlterTable
ALTER TABLE "AdmissionLead" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "AssistantWorkLog" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "BackupSnapshot" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "ImportBatch" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "InventoryCategory" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "InventorySaleBatch" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "PayrollPeriod" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "RevenueOther" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "SystemParameter" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "TuitionTransaction" ADD COLUMN     "createdById" TEXT;
