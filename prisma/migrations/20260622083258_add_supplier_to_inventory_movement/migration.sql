-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "supplierId" TEXT;

-- CreateIndex
CREATE INDEX "InventoryMovement_supplierId_idx" ON "InventoryMovement"("supplierId");

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
