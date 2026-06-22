-- ⚠️ SỬA TAY (DECISIONS D12): chuyển cột TEXT chứa JSON-string -> JSONB GIỮ NGUYÊN DỮ LIỆU.
-- Dùng `ALTER COLUMN ... SET DATA TYPE jsonb USING ...` thay cho DROP+ADD (vốn mất dữ liệu).
-- An toàn khi `migrate deploy` lên DB ĐÃ CÓ DỮ LIỆU (không chỉ DB rỗng/test).
-- Quy ước USING:
--   * NULLIF(col,'')        : chuỗi rỗng -> NULL (cột nullable).
--   * COALESCE(...,default) : đảm bảo non-null cho cột NOT NULL nếu gặp '' / NULL.
-- Trên DB rỗng (CI/seed) các mệnh đề USING là vô hại (không có dòng nào để ép kiểu).

-- AuditLog.oldValue / newValue (nullable)
ALTER TABLE "AuditLog"
  ALTER COLUMN "oldValue" SET DATA TYPE JSONB USING NULLIF("oldValue", '')::jsonb,
  ALTER COLUMN "newValue" SET DATA TYPE JSONB USING NULLIF("newValue", '')::jsonb;

-- Class.scheduleDays (NOT NULL DEFAULT '[]')
ALTER TABLE "Class"
  ALTER COLUMN "scheduleDays" DROP DEFAULT,
  ALTER COLUMN "scheduleDays" SET DATA TYPE JSONB USING COALESCE(NULLIF("scheduleDays", '')::jsonb, '[]'::jsonb),
  ALTER COLUMN "scheduleDays" SET DEFAULT '[]';

-- DailyClose.summary (NOT NULL, không default)
ALTER TABLE "DailyClose"
  ALTER COLUMN "summary" SET DATA TYPE JSONB USING COALESCE(NULLIF("summary", '')::jsonb, '{}'::jsonb);

-- Enrollment.feeHistory (NOT NULL DEFAULT '[]')
ALTER TABLE "Enrollment"
  ALTER COLUMN "feeHistory" DROP DEFAULT,
  ALTER COLUMN "feeHistory" SET DATA TYPE JSONB USING COALESCE(NULLIF("feeHistory", '')::jsonb, '[]'::jsonb),
  ALTER COLUMN "feeHistory" SET DEFAULT '[]';

-- FeatureFlag.enabledForRoles (NOT NULL DEFAULT '[]')
ALTER TABLE "FeatureFlag"
  ALTER COLUMN "enabledForRoles" DROP DEFAULT,
  ALTER COLUMN "enabledForRoles" SET DATA TYPE JSONB USING COALESCE(NULLIF("enabledForRoles", '')::jsonb, '[]'::jsonb),
  ALTER COLUMN "enabledForRoles" SET DEFAULT '[]';

-- ImportBatch.errorLog (nullable)
ALTER TABLE "ImportBatch"
  ALTER COLUMN "errorLog" SET DATA TYPE JSONB USING NULLIF("errorLog", '')::jsonb;

-- InventoryVariant.attributes (NOT NULL DEFAULT '{}')
ALTER TABLE "InventoryVariant"
  ALTER COLUMN "attributes" DROP DEFAULT,
  ALTER COLUMN "attributes" SET DATA TYPE JSONB USING COALESCE(NULLIF("attributes", '')::jsonb, '{}'::jsonb),
  ALTER COLUMN "attributes" SET DEFAULT '{}';

-- StaffMember.salaryHistory (NOT NULL DEFAULT '[]')
ALTER TABLE "StaffMember"
  ALTER COLUMN "salaryHistory" DROP DEFAULT,
  ALTER COLUMN "salaryHistory" SET DATA TYPE JSONB USING COALESCE(NULLIF("salaryHistory", '')::jsonb, '[]'::jsonb),
  ALTER COLUMN "salaryHistory" SET DEFAULT '[]';

-- TuitionTransaction.editHistory (NOT NULL DEFAULT '[]')
ALTER TABLE "TuitionTransaction"
  ALTER COLUMN "editHistory" DROP DEFAULT,
  ALTER COLUMN "editHistory" SET DATA TYPE JSONB USING COALESCE(NULLIF("editHistory", '')::jsonb, '[]'::jsonb),
  ALTER COLUMN "editHistory" SET DEFAULT '[]';
