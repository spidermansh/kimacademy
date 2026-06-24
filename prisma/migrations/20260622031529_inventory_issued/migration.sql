-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "issued" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "InventoryMovement_issued_movementType_idx" ON "InventoryMovement"("issued", "movementType");
