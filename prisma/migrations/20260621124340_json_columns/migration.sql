/*
  Warnings:

  - The `oldValue` column on the `AuditLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `newValue` column on the `AuditLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `scheduleDays` column on the `Class` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `feeHistory` column on the `Enrollment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `enabledForRoles` column on the `FeatureFlag` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `errorLog` column on the `ImportBatch` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `attributes` column on the `InventoryVariant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `salaryHistory` column on the `StaffMember` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `editHistory` column on the `TuitionTransaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `summary` on the `DailyClose` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "oldValue",
ADD COLUMN     "oldValue" JSONB,
DROP COLUMN "newValue",
ADD COLUMN     "newValue" JSONB;

-- AlterTable
ALTER TABLE "Class" DROP COLUMN "scheduleDays",
ADD COLUMN     "scheduleDays" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "DailyClose" DROP COLUMN "summary",
ADD COLUMN     "summary" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Enrollment" DROP COLUMN "feeHistory",
ADD COLUMN     "feeHistory" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "FeatureFlag" DROP COLUMN "enabledForRoles",
ADD COLUMN     "enabledForRoles" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "ImportBatch" DROP COLUMN "errorLog",
ADD COLUMN     "errorLog" JSONB;

-- AlterTable
ALTER TABLE "InventoryVariant" DROP COLUMN "attributes",
ADD COLUMN     "attributes" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "StaffMember" DROP COLUMN "salaryHistory",
ADD COLUMN     "salaryHistory" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "TuitionTransaction" DROP COLUMN "editHistory",
ADD COLUMN     "editHistory" JSONB NOT NULL DEFAULT '[]';
