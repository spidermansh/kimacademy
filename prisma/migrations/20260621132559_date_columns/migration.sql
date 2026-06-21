/*
  Warnings:

  - The `dateOfBirth` column on the `AdmissionLead` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `testScheduleDate` column on the `AdmissionLead` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `testDate` column on the `AdmissionLead` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `convertedAt` column on the `AdmissionLead` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `endDate` column on the `Enrollment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `paymentDate` column on the `InventoryMovement` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `paymentDate` column on the `InventorySaleBatch` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `birthDate` column on the `Student` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `enrollDate` column on the `Student` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `effectiveTo` column on the `SystemParameter` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `registrationDate` on the `AdmissionLead` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `date` on the `AssistantWorkLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `date` on the `AttendanceRecord` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `date` on the `DailyClose` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `completedAt` on the `DailyClose` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `startDate` on the `Enrollment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `date` on the `Expense` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `movementDate` on the `InventoryMovement` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `movementDate` on the `InventorySaleBatch` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `startDate` on the `PayrollPeriod` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `endDate` on the `PayrollPeriod` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `paymentDate` on the `RevenueOther` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `date` on the `SalaryAdvance` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `date` on the `Session` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `startDate` on the `StaffMember` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `effectiveFrom` on the `SystemParameter` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `date` on the `TeachingLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `paymentDate` on the `TuitionTransaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "AdmissionLead" DROP COLUMN "dateOfBirth",
ADD COLUMN     "dateOfBirth" DATE,
DROP COLUMN "registrationDate",
ADD COLUMN     "registrationDate" DATE NOT NULL,
DROP COLUMN "testScheduleDate",
ADD COLUMN     "testScheduleDate" DATE,
DROP COLUMN "testDate",
ADD COLUMN     "testDate" DATE,
DROP COLUMN "convertedAt",
ADD COLUMN     "convertedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AssistantWorkLog" DROP COLUMN "date",
ADD COLUMN     "date" DATE NOT NULL;

-- AlterTable
ALTER TABLE "AttendanceRecord" DROP COLUMN "date",
ADD COLUMN     "date" DATE NOT NULL;

-- AlterTable
ALTER TABLE "DailyClose" DROP COLUMN "date",
ADD COLUMN     "date" DATE NOT NULL,
DROP COLUMN "completedAt",
ADD COLUMN     "completedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Enrollment" DROP COLUMN "startDate",
ADD COLUMN     "startDate" DATE NOT NULL,
DROP COLUMN "endDate",
ADD COLUMN     "endDate" DATE;

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "date",
ADD COLUMN     "date" DATE NOT NULL;

-- AlterTable
ALTER TABLE "InventoryMovement" DROP COLUMN "movementDate",
ADD COLUMN     "movementDate" DATE NOT NULL,
DROP COLUMN "paymentDate",
ADD COLUMN     "paymentDate" DATE;

-- AlterTable
ALTER TABLE "InventorySaleBatch" DROP COLUMN "movementDate",
ADD COLUMN     "movementDate" DATE NOT NULL,
DROP COLUMN "paymentDate",
ADD COLUMN     "paymentDate" DATE;

-- AlterTable
ALTER TABLE "PayrollPeriod" DROP COLUMN "startDate",
ADD COLUMN     "startDate" DATE NOT NULL,
DROP COLUMN "endDate",
ADD COLUMN     "endDate" DATE NOT NULL;

-- AlterTable
ALTER TABLE "RevenueOther" DROP COLUMN "paymentDate",
ADD COLUMN     "paymentDate" DATE NOT NULL;

-- AlterTable
ALTER TABLE "SalaryAdvance" DROP COLUMN "date",
ADD COLUMN     "date" DATE NOT NULL;

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "date",
ADD COLUMN     "date" DATE NOT NULL;

-- AlterTable
ALTER TABLE "StaffMember" DROP COLUMN "startDate",
ADD COLUMN     "startDate" DATE NOT NULL;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "birthDate",
ADD COLUMN     "birthDate" DATE,
DROP COLUMN "enrollDate",
ADD COLUMN     "enrollDate" DATE;

-- AlterTable
ALTER TABLE "SystemParameter" DROP COLUMN "effectiveFrom",
ADD COLUMN     "effectiveFrom" DATE NOT NULL,
DROP COLUMN "effectiveTo",
ADD COLUMN     "effectiveTo" DATE;

-- AlterTable
ALTER TABLE "TeachingLog" DROP COLUMN "date",
ADD COLUMN     "date" DATE NOT NULL;

-- AlterTable
ALTER TABLE "TuitionTransaction" DROP COLUMN "paymentDate",
ADD COLUMN     "paymentDate" DATE NOT NULL;

-- CreateIndex
CREATE INDEX "AttendanceRecord_date_classId_idx" ON "AttendanceRecord"("date", "classId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentId_date_idx" ON "AttendanceRecord"("studentId", "date");

-- CreateIndex
CREATE INDEX "DailyClose_date_idx" ON "DailyClose"("date");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "InventoryMovement_movementDate_idx" ON "InventoryMovement"("movementDate");

-- CreateIndex
CREATE INDEX "InventorySaleBatch_classId_movementDate_idx" ON "InventorySaleBatch"("classId", "movementDate");

-- CreateIndex
CREATE INDEX "InventorySaleBatch_itemId_movementDate_idx" ON "InventorySaleBatch"("itemId", "movementDate");

-- CreateIndex
CREATE INDEX "RevenueOther_paymentDate_idx" ON "RevenueOther"("paymentDate");

-- CreateIndex
CREATE INDEX "Session_classId_date_idx" ON "Session"("classId", "date");

-- CreateIndex
CREATE INDEX "Session_teacherId_date_idx" ON "Session"("teacherId", "date");

-- CreateIndex
CREATE INDEX "TuitionTransaction_paymentDate_idx" ON "TuitionTransaction"("paymentDate");
