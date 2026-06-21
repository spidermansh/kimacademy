ALTER TABLE "InventoryMovement"
ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'not_applicable',
ADD COLUMN "paymentMethod" TEXT,
ADD COLUMN "paymentDate" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "collectedBy" TEXT;

UPDATE "InventoryMovement"
SET "paymentStatus" = CASE
  WHEN "relatedRevenueOtherId" IS NOT NULL THEN 'paid'
  WHEN "movementType" = 'issue_to_student'
    AND COALESCE("unitSalePrice", 0) > 0
    AND COALESCE("totalAmount", 0) > 0
    THEN 'unpaid'
  ELSE 'not_applicable'
END;

CREATE INDEX "InventoryMovement_paymentStatus_movementType_idx"
ON "InventoryMovement"("paymentStatus", "movementType");
