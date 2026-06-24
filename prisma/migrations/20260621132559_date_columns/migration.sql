-- ⚠️ SỬA TAY (DECISIONS D12): chuyển cột TEXT chứa ngày 'YYYY-MM-DD' (hoặc ISO) -> DATE / TIMESTAMP
-- GIỮ NGUYÊN DỮ LIỆU bằng `ALTER COLUMN ... SET DATA TYPE ... USING ...` thay cho DROP+ADD (mất dữ liệu).
-- An toàn khi `migrate deploy` lên DB ĐÃ CÓ DỮ LIỆU.
-- Quy ước USING:
--   * btrim(col)::date          : cột NOT NULL — dữ liệu luôn là chuỗi ngày hợp lệ (::date nhận cả ISO).
--   * NULLIF(btrim(col),'')::... : cột nullable — '' / khoảng trắng -> NULL.
-- Cột type-change KHÔNG drop nên index phụ thuộc được Postgres tự rebuild → CREATE INDEX IF NOT EXISTS
-- (một số index đã tạo ở migration init / bulk_sale_batch, IF NOT EXISTS để khỏi trùng).
-- Trên DB rỗng (CI/seed) các mệnh đề USING là vô hại.

-- AlterTable
ALTER TABLE "AdmissionLead"
  ALTER COLUMN "dateOfBirth" SET DATA TYPE DATE USING NULLIF(btrim("dateOfBirth"), '')::date,
  ALTER COLUMN "registrationDate" SET DATA TYPE DATE USING btrim("registrationDate")::date,
  ALTER COLUMN "testScheduleDate" SET DATA TYPE DATE USING NULLIF(btrim("testScheduleDate"), '')::date,
  ALTER COLUMN "testDate" SET DATA TYPE DATE USING NULLIF(btrim("testDate"), '')::date,
  ALTER COLUMN "convertedAt" SET DATA TYPE TIMESTAMP(3) USING NULLIF(btrim("convertedAt"), '')::timestamp;

-- AlterTable
ALTER TABLE "AssistantWorkLog"
  ALTER COLUMN "date" SET DATA TYPE DATE USING btrim("date")::date;

-- AlterTable
ALTER TABLE "AttendanceRecord"
  ALTER COLUMN "date" SET DATA TYPE DATE USING btrim("date")::date;

-- AlterTable
ALTER TABLE "DailyClose"
  ALTER COLUMN "date" SET DATA TYPE DATE USING btrim("date")::date,
  ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMP(3) USING btrim("completedAt")::timestamp;

-- AlterTable
ALTER TABLE "Enrollment"
  ALTER COLUMN "startDate" SET DATA TYPE DATE USING btrim("startDate")::date,
  ALTER COLUMN "endDate" SET DATA TYPE DATE USING NULLIF(btrim("endDate"), '')::date;

-- AlterTable
ALTER TABLE "Expense"
  ALTER COLUMN "date" SET DATA TYPE DATE USING btrim("date")::date;

-- AlterTable
ALTER TABLE "InventoryMovement"
  ALTER COLUMN "movementDate" SET DATA TYPE DATE USING btrim("movementDate")::date,
  ALTER COLUMN "paymentDate" SET DATA TYPE DATE USING NULLIF(btrim("paymentDate"), '')::date;

-- AlterTable
ALTER TABLE "InventorySaleBatch"
  ALTER COLUMN "movementDate" SET DATA TYPE DATE USING btrim("movementDate")::date,
  ALTER COLUMN "paymentDate" SET DATA TYPE DATE USING NULLIF(btrim("paymentDate"), '')::date;

-- AlterTable
ALTER TABLE "PayrollPeriod"
  ALTER COLUMN "startDate" SET DATA TYPE DATE USING btrim("startDate")::date,
  ALTER COLUMN "endDate" SET DATA TYPE DATE USING btrim("endDate")::date;

-- AlterTable
ALTER TABLE "RevenueOther"
  ALTER COLUMN "paymentDate" SET DATA TYPE DATE USING btrim("paymentDate")::date;

-- AlterTable
ALTER TABLE "SalaryAdvance"
  ALTER COLUMN "date" SET DATA TYPE DATE USING btrim("date")::date;

-- AlterTable
ALTER TABLE "Session"
  ALTER COLUMN "date" SET DATA TYPE DATE USING btrim("date")::date;

-- AlterTable
ALTER TABLE "StaffMember"
  ALTER COLUMN "startDate" SET DATA TYPE DATE USING btrim("startDate")::date;

-- AlterTable
ALTER TABLE "Student"
  ALTER COLUMN "birthDate" SET DATA TYPE DATE USING NULLIF(btrim("birthDate"), '')::date,
  ALTER COLUMN "enrollDate" SET DATA TYPE DATE USING NULLIF(btrim("enrollDate"), '')::date;

-- AlterTable
ALTER TABLE "SystemParameter"
  ALTER COLUMN "effectiveFrom" SET DATA TYPE DATE USING btrim("effectiveFrom")::date,
  ALTER COLUMN "effectiveTo" SET DATA TYPE DATE USING NULLIF(btrim("effectiveTo"), '')::date;

-- AlterTable
ALTER TABLE "TeachingLog"
  ALTER COLUMN "date" SET DATA TYPE DATE USING btrim("date")::date;

-- AlterTable
ALTER TABLE "TuitionTransaction"
  ALTER COLUMN "paymentDate" SET DATA TYPE DATE USING btrim("paymentDate")::date;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AttendanceRecord_date_classId_idx" ON "AttendanceRecord"("date", "classId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AttendanceRecord_studentId_date_idx" ON "AttendanceRecord"("studentId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DailyClose_date_idx" ON "DailyClose"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryMovement_movementDate_idx" ON "InventoryMovement"("movementDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventorySaleBatch_classId_movementDate_idx" ON "InventorySaleBatch"("classId", "movementDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventorySaleBatch_itemId_movementDate_idx" ON "InventorySaleBatch"("itemId", "movementDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RevenueOther_paymentDate_idx" ON "RevenueOther"("paymentDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_classId_date_idx" ON "Session"("classId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_teacherId_date_idx" ON "Session"("teacherId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TuitionTransaction_paymentDate_idx" ON "TuitionTransaction"("paymentDate");
