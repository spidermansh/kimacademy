CREATE TABLE "InventorySaleBatch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "classId" TEXT,
    "className" TEXT,
    "itemId" TEXT NOT NULL,
    "variantId" TEXT,
    "fromLocationId" TEXT,
    "movementDate" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "paymentMethod" TEXT,
    "paymentDate" TEXT,
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "totalQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "InventorySaleBatch_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InventoryMovement"
ADD COLUMN "saleBatchId" TEXT;

CREATE UNIQUE INDEX "InventorySaleBatch_code_key" ON "InventorySaleBatch"("code");
CREATE INDEX "InventorySaleBatch_classId_movementDate_idx" ON "InventorySaleBatch"("classId", "movementDate");
CREATE INDEX "InventorySaleBatch_itemId_movementDate_idx" ON "InventorySaleBatch"("itemId", "movementDate");
CREATE INDEX "InventoryMovement_saleBatchId_idx" ON "InventoryMovement"("saleBatchId");

ALTER TABLE "InventoryMovement"
ADD CONSTRAINT "InventoryMovement_saleBatchId_fkey"
FOREIGN KEY ("saleBatchId") REFERENCES "InventorySaleBatch"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
