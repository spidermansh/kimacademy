import { Router } from 'express';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken, requireRole } from '../middleware/auth';

export const inventoryRouter = Router();

inventoryRouter.use(authenticateToken);
const requireInventoryRole = requireRole(['admin', 'staff', 'accountant']);

const INVENTORY_PAYMENT_STATUSES = new Set(['not_applicable', 'unpaid', 'paid']);

function normalizePaymentStatus(rawStatus: any, isStudentSale: boolean): 'not_applicable' | 'unpaid' | 'paid' {
  if (!isStudentSale) return 'not_applicable';
  if (rawStatus === 'unpaid' || rawStatus === 'deferred' || rawStatus === 'pending_payment') return 'unpaid';
  if (!rawStatus || rawStatus === 'paid' || rawStatus === 'paid_now' || rawStatus === 'collected') return 'paid';
  if (INVENTORY_PAYMENT_STATUSES.has(String(rawStatus))) return rawStatus as 'not_applicable' | 'unpaid' | 'paid';
  return 'paid';
}

function getActor(req: any) {
  return req.user?.name || req.user?.username || 'admin';
}

function generateBatchCode() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `PX-${stamp}-${suffix}`;
}

// ==========================================
// CATEGORIES
// ==========================================
inventoryRouter.get('/inventory/categories', async (req, res) => {
  try {
    const list = await prisma.inventoryCategory.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

inventoryRouter.post('/inventory/categories', requireInventoryRole, async (req, res) => {
  const { name, code, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Thiáº¿u tÃªn danh má»¥c' });
  try {
    const created = await prisma.inventoryCategory.create({
      data: {
        name,
        code: code || null,
        description: description || null,
        createdBy: req.user?.name || req.user?.username || 'admin'
      }
    });
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// SUPPLIERS
// ==========================================
inventoryRouter.get('/inventory/suppliers', async (req, res) => {
  try {
    const list = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

inventoryRouter.post('/inventory/suppliers', requireInventoryRole, async (req, res) => {
  const { name, phone, email, address, note } = req.body;
  if (!name) return res.status(400).json({ message: 'Thiáº¿u tÃªn nhÃ  cung cáº¥p' });
  try {
    const created = await prisma.supplier.create({
      data: { name, phone, email, address, note }
    });
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// LOCATIONS
// ==========================================
inventoryRouter.get('/inventory/locations', async (req, res) => {
  try {
    const list = await prisma.inventoryLocation.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

inventoryRouter.post('/inventory/locations', requireInventoryRole, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Thiáº¿u tÃªn vá»‹ trÃ­ kho' });
  try {
    const created = await prisma.inventoryLocation.create({
      data: { name, description }
    });
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// ITEMS & VARIANTS
// ==========================================
inventoryRouter.get('/inventory/items', async (req, res) => {
  try {
    const list = await prisma.inventoryItem.findMany({
      include: {
        category: true,
        variants: true
      },
      orderBy: { name: 'asc' }
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

inventoryRouter.post('/inventory/items', requireInventoryRole, async (req, res) => {
  const { categoryId, code, name, unit, itemType, defaultSalePrice, defaultCostPrice, minStockLevel, description } = req.body;
  if (!categoryId || !code || !name || !unit || !itemType) {
    return res.status(400).json({ message: 'Thiáº¿u thÃ´ng tin máº·t hÃ ng báº¯t buá»™c' });
  }

  try {
    const created = await prisma.inventoryItem.create({
      data: {
        categoryId,
        code,
        name,
        unit,
        itemType,
        defaultSalePrice: defaultSalePrice ? Number(defaultSalePrice) : 0,
        defaultCostPrice: defaultCostPrice ? Number(defaultCostPrice) : 0,
        minStockLevel: minStockLevel ? Number(minStockLevel) : 0,
        description: description || null,
        createdBy: req.user?.name || req.user?.username || 'admin'
      }
    });

    // Create a default variant matching the item SKU
    await prisma.inventoryVariant.create({
      data: {
        itemId: created.id,
        sku: `${code}-DEFAULT`,
        name: 'Máº·c Ä‘á»‹nh'
      }
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// STOCKS (Sá»‘ lÆ°á»£ng tá»“n kho)
// ==========================================
inventoryRouter.get('/inventory/stocks', async (req, res) => {
  try {
    const list = await prisma.inventoryStock.findMany({
      include: {
        item: true,
        variant: true,
        location: true
      }
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// MOVEMENTS (Nháº­t kÃ½ nháº­p/xuáº¥t kho)
// ==========================================
inventoryRouter.get('/inventory/movements', async (req, res) => {
  try {
    const list = await prisma.inventoryMovement.findMany({
      include: {
        item: true,
        variant: true,
        fromLocation: true,
        toLocation: true,
        relatedStudent: true,
        relatedStaff: true,
        saleBatch: true
      },
      orderBy: { movementDate: 'desc' }
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

inventoryRouter.post('/inventory/movements', requireInventoryRole, async (req, res) => {
  const {
    movementType,
    itemId,
    variantId,
    fromLocationId,
    toLocationId,
    quantity,
    unitCost,
    unitSalePrice,
    relatedStudentId,
    relatedStaffId,
    paymentStatus,
    paymentMethod,
    paymentDate,
    note,
    movementDate
  } = req.body;

  if (!movementType || !itemId || !quantity || !movementDate) {
    return res.status(400).json({ message: 'Thiáº¿u thÃ´ng tin nháº­p xuáº¥t báº¯t buá»™c' });
  }

  const qty = Number(quantity);
  const cost = unitCost ? Number(unitCost) : 0;
  const price = unitSalePrice ? Number(unitSalePrice) : 0;
  if (!Number.isFinite(qty) || qty <= 0) {
    return res.status(400).json({ message: 'Số lượng giao dịch phải lớn hơn 0' });
  }

  try {
    const movement = await prisma.$transaction(async (tx) => {
    // 1. Resolve variant (use first variant if not provided)
    let finalVariantId = variantId;
    if (!finalVariantId) {
      const vari = await tx.inventoryVariant.findFirst({ where: { itemId } });
      finalVariantId = vari?.id || null;
    }

    const item = await tx.inventoryItem.findUnique({
      where: { id: itemId },
      include: { category: true }
    });
    if (!item) throw new Error('INVENTORY_ITEM_NOT_FOUND');

    const isStudentSale = movementType === 'issue_to_student' && price > 0;
    if (movementType === 'issue_to_student' && !relatedStudentId) {
      throw new Error('STUDENT_REQUIRED_FOR_INVENTORY_SALE');
    }
    const finalPaymentStatus = normalizePaymentStatus(paymentStatus, isStudentSale);
    const finalPaymentDate = finalPaymentStatus === 'paid' ? (paymentDate || movementDate) : null;
    const finalPaymentMethod = finalPaymentStatus === 'paid' ? (paymentMethod || 'Tiền mặt') : null;

    // 2. Block negative inventory check for exports
    const isExport = ['issue_to_student', 'issue_to_staff', 'internal_use', 'damage', 'loss', 'transfer'].includes(movementType);
    if (isExport && fromLocationId) {
      const stock = await tx.inventoryStock.findUnique({
        where: {
          itemId_variantId_locationId: {
            itemId,
            variantId: finalVariantId || '',
            locationId: fromLocationId
          }
        }
      });

      const currentQty = stock?.quantityOnHand || 0;
      if (currentQty < qty) {
        throw new Error(`INSUFFICIENT_STOCK|Sá»‘ lÆ°á»£ng tá»“n kho khÃ´ng Ä‘á»§ Ä‘á»ƒ xuáº¥t. (Hiá»‡n cÃ²n: ${currentQty} ${item.unit}, Cáº§n xuáº¥t: ${qty} ${item.unit})`);
      }
    }

    // 3. Perform inventory updates
    // Decrement from source
    if (fromLocationId) {
      const stockKey = {
        itemId,
        variantId: finalVariantId || '',
        locationId: fromLocationId
      };
      const stock = await tx.inventoryStock.findUnique({
        where: { itemId_variantId_locationId: stockKey }
      });
      if (stock) {
        await tx.inventoryStock.update({
          where: { id: stock.id },
          data: { quantityOnHand: stock.quantityOnHand - qty }
        });
      }
    }

    // Increment to destination
    let toStockId = '';
    if (toLocationId) {
      const stockKey = {
        itemId,
        variantId: finalVariantId || '',
        locationId: toLocationId
      };
      const stock = await tx.inventoryStock.findUnique({
        where: { itemId_variantId_locationId: stockKey }
      });

      if (stock) {
        let newAvgCost = stock.averageCost || cost;
        // Recalculate average cost for purchase input
        if (movementType === 'purchase_in' && cost > 0) {
          const totalQty = stock.quantityOnHand + qty;
          if (totalQty > 0) {
            newAvgCost = ((stock.quantityOnHand * (stock.averageCost || 0)) + (qty * cost)) / totalQty;
          }
        }

        const updatedStock = await tx.inventoryStock.update({
          where: { id: stock.id },
          data: {
            quantityOnHand: stock.quantityOnHand + qty,
            averageCost: newAvgCost
          }
        });
        toStockId = updatedStock.id;
      } else {
        const createdStock = await tx.inventoryStock.create({
          data: {
            itemId,
            variantId: finalVariantId,
            locationId: toLocationId,
            quantityOnHand: qty,
            averageCost: cost
          }
        });
        toStockId = createdStock.id;
      }
    }

    // 4. If issue to student and payment is collected now, create RevenueOther
    let revenueOtherId: string | null = null;
    if (isStudentSale && finalPaymentStatus === 'paid' && relatedStudentId) {
      const totalRev = price * qty;
      const student = await tx.student.findUnique({ where: { id: relatedStudentId } });

      const rev = await tx.revenueOther.create({
        data: {
          category: item.category.name,
          amount: totalRev,
          paymentDate: finalPaymentDate || movementDate,
          paymentMethod: finalPaymentMethod || 'Tiền mặt',
          studentId: relatedStudentId,
          description: `Xuất bán ${item.name} (SL: ${qty}) cho học viên ${student?.name || ''}`,
          createdBy: getActor(req)
        }
      });
      revenueOtherId = rev.id;
    }

    // 5. Create Movement record
    const movement = await tx.inventoryMovement.create({
      data: {
        movementType,
        itemId,
        variantId: finalVariantId,
        fromLocationId: fromLocationId || null,
        toLocationId: toLocationId || null,
        quantity: qty,
        unitCost: cost,
        unitSalePrice: price,
        totalAmount: isExport ? (price * qty) : (cost * qty),
        relatedStudentId: relatedStudentId || null,
        relatedStaffId: relatedStaffId || null,
        relatedRevenueOtherId: revenueOtherId,
        paymentStatus: finalPaymentStatus,
        paymentMethod: finalPaymentMethod,
        paymentDate: finalPaymentDate,
        paidAt: finalPaymentStatus === 'paid' ? new Date() : null,
        collectedBy: finalPaymentStatus === 'paid' ? getActor(req) : null,
        note: note || '',
        movementDate,
        createdBy: getActor(req)
      }
    });

      return movement;
    });

    res.status(201).json(movement);
  } catch (error: any) {
    if (error.message === 'INVENTORY_ITEM_NOT_FOUND') {
      return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y máº·t hÃ ng' });
    }
    if (error.message === 'STUDENT_REQUIRED_FOR_INVENTORY_SALE') {
      return res.status(400).json({ message: 'Cần chọn học viên nhận hàng trước khi xuất bán vật tư' });
    }
    if (typeof error.message === 'string' && error.message.startsWith('INSUFFICIENT_STOCK|')) {
      return res.status(400).json({ message: error.message.slice('INSUFFICIENT_STOCK|'.length) });
    }
    res.status(500).json({ message: error.message });
  }
});

inventoryRouter.post('/inventory/movements/bulk', requireInventoryRole, async (req, res) => {
  const {
    movementType,
    classId,
    itemId,
    variantId,
    fromLocationId,
    students,
    unitCost,
    unitSalePrice,
    paymentStatus,
    paymentMethod,
    paymentDate,
    movementDate,
    note,
    allowDuplicate
  } = req.body;

  if (movementType !== 'issue_to_student') {
    return res.status(400).json({ message: 'Bán hàng loạt hiện chỉ hỗ trợ nghiệp vụ xuất bán học viên' });
  }
  if (!classId || !itemId || !fromLocationId || !movementDate) {
    return res.status(400).json({ message: 'Thiếu lớp, mặt hàng, kho nguồn hoặc ngày thực hiện' });
  }
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ message: 'Cần chọn ít nhất 1 học viên để phát/bán hàng loạt' });
  }

  const cost = unitCost ? Number(unitCost) : 0;
  const price = unitSalePrice ? Number(unitSalePrice) : 0;
  const mergedRows = new Map<string, number>();
  for (const row of students) {
    const studentId = String(row.studentId || '');
    const quantity = Number(row.quantity || 0);
    if (!studentId || !Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Danh sách học viên có số lượng không hợp lệ' });
    }
    mergedRows.set(studentId, (mergedRows.get(studentId) || 0) + quantity);
  }

  const saleRows = Array.from(mergedRows.entries()).map(([studentId, quantity]) => ({ studentId, quantity }));
  const totalQty = saleRows.reduce((sum, row) => sum + row.quantity, 0);
  const finalPaymentStatus = normalizePaymentStatus(paymentStatus, price > 0);
  const finalPaymentDate = finalPaymentStatus === 'paid' ? (paymentDate || movementDate) : null;
  const finalPaymentMethod = finalPaymentStatus === 'paid' ? (paymentMethod || 'Tiền mặt') : null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      let finalVariantId = variantId;
      if (!finalVariantId) {
        const vari = await tx.inventoryVariant.findFirst({ where: { itemId } });
        finalVariantId = vari?.id || null;
      }

      const item = await tx.inventoryItem.findUnique({
        where: { id: itemId },
        include: { category: true }
      });
      if (!item) throw new Error('INVENTORY_ITEM_NOT_FOUND');

      const cls = await tx.class.findFirst({
        where: {
          OR: [
            { id: classId },
            { code: classId },
            { name: classId }
          ]
        },
        include: {
          enrollments: {
            where: { isActive: true },
            include: { student: true }
          }
        }
      });
      if (!cls) throw new Error('CLASS_NOT_FOUND');

      const activeStudentMap = new Map(cls.enrollments.map(enrollment => [enrollment.studentId, enrollment.student]));
      const studentsOutsideClass = saleRows
        .filter(row => !activeStudentMap.has(row.studentId))
        .map(row => row.studentId);
      if (studentsOutsideClass.length > 0) {
        throw new Error(`STUDENT_NOT_IN_CLASS|${studentsOutsideClass.length}`);
      }

      if (!allowDuplicate) {
        const duplicateSales = await tx.inventoryMovement.findMany({
          where: {
            movementType: 'issue_to_student',
            itemId,
            variantId: finalVariantId,
            movementDate,
            relatedStudentId: { in: saleRows.map(row => row.studentId) }
          },
          include: { relatedStudent: true }
        });
        if (duplicateSales.length > 0) {
          const duplicateNames = duplicateSales.map(sale => sale.relatedStudent?.name || sale.relatedStudentId).join(', ');
          throw new Error(`DUPLICATE_INVENTORY_SALE|${duplicateNames}`);
        }
      }

      const stock = await tx.inventoryStock.findUnique({
        where: {
          itemId_variantId_locationId: {
            itemId,
            variantId: finalVariantId || '',
            locationId: fromLocationId
          }
        }
      });
      const currentQty = stock?.quantityOnHand || 0;
      if (!stock || currentQty < totalQty) {
        throw new Error(`INSUFFICIENT_STOCK|Số lượng tồn kho không đủ để xuất hàng loạt. (Hiện còn: ${currentQty} ${item.unit}, cần xuất: ${totalQty} ${item.unit})`);
      }

      await tx.inventoryStock.update({
        where: { id: stock.id },
        data: { quantityOnHand: currentQty - totalQty }
      });

      const batch = await tx.inventorySaleBatch.create({
        data: {
          code: generateBatchCode(),
          classId: cls.id,
          className: cls.name,
          itemId,
          variantId: finalVariantId,
          fromLocationId,
          movementDate,
          paymentStatus: finalPaymentStatus,
          paymentMethod: finalPaymentMethod,
          paymentDate: finalPaymentDate,
          totalStudents: saleRows.length,
          totalQuantity: totalQty,
          totalAmount: price * totalQty,
          note: note || null,
          createdBy: getActor(req)
        }
      });

      const movements = [];
      for (const row of saleRows) {
        const student = activeStudentMap.get(row.studentId);
        let revenueOtherId: string | null = null;
        const rowAmount = price * row.quantity;

        if (price > 0 && finalPaymentStatus === 'paid') {
          const rev = await tx.revenueOther.create({
            data: {
              category: item.category.name,
              amount: rowAmount,
              paymentDate: finalPaymentDate || movementDate,
              paymentMethod: finalPaymentMethod || 'Tiền mặt',
              studentId: row.studentId,
              description: `Xuất bán ${item.name} (SL: ${row.quantity}) cho học viên ${student?.name || ''} theo lô ${batch.code}`,
              createdBy: getActor(req)
            }
          });
          revenueOtherId = rev.id;
        }

        const movement = await tx.inventoryMovement.create({
          data: {
            saleBatchId: batch.id,
            movementType: 'issue_to_student',
            itemId,
            variantId: finalVariantId,
            fromLocationId,
            toLocationId: null,
            quantity: row.quantity,
            unitCost: cost,
            unitSalePrice: price,
            totalAmount: rowAmount,
            relatedStudentId: row.studentId,
            relatedRevenueOtherId: revenueOtherId,
            paymentStatus: price > 0 ? finalPaymentStatus : 'not_applicable',
            paymentMethod: finalPaymentMethod,
            paymentDate: finalPaymentDate,
            paidAt: finalPaymentStatus === 'paid' ? new Date() : null,
            collectedBy: finalPaymentStatus === 'paid' ? getActor(req) : null,
            note: note || `Xuất bán hàng loạt theo lớp ${cls.name}`,
            movementDate,
            createdBy: getActor(req)
          },
          include: {
            item: true,
            variant: true,
            fromLocation: true,
            relatedStudent: true,
            saleBatch: true
          }
        });
        movements.push(movement);
      }

      return { batch, movements };
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (error.message === 'INVENTORY_ITEM_NOT_FOUND') {
      return res.status(404).json({ message: 'Không tìm thấy mặt hàng' });
    }
    if (error.message === 'CLASS_NOT_FOUND') {
      return res.status(404).json({ message: 'Không tìm thấy lớp học' });
    }
    if (typeof error.message === 'string' && error.message.startsWith('STUDENT_NOT_IN_CLASS|')) {
      return res.status(400).json({ message: 'Một số học viên đã chọn không thuộc danh sách đang học của lớp' });
    }
    if (typeof error.message === 'string' && error.message.startsWith('DUPLICATE_INVENTORY_SALE|')) {
      return res.status(409).json({ message: `Đã có giao dịch phát/bán cùng mặt hàng trong ngày cho: ${error.message.slice('DUPLICATE_INVENTORY_SALE|'.length)}` });
    }
    if (typeof error.message === 'string' && error.message.startsWith('INSUFFICIENT_STOCK|')) {
      return res.status(400).json({ message: error.message.slice('INSUFFICIENT_STOCK|'.length) });
    }
    res.status(500).json({ message: error.message });
  }
});

inventoryRouter.post('/inventory/movements/:id/collect-payment', requireInventoryRole, async (req, res) => {
  const { id } = req.params;
  const { paymentDate, paymentMethod, note } = req.body;

  if (!paymentDate || !paymentMethod) {
    return res.status(400).json({ message: 'Cần nhập ngày thu tiền và hình thức thanh toán' });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const movement = await tx.inventoryMovement.findUnique({
        where: { id },
        include: {
          item: { include: { category: true } },
          relatedStudent: true
        }
      });

      if (!movement) throw new Error('INVENTORY_MOVEMENT_NOT_FOUND');
      if (movement.movementType !== 'issue_to_student' || !movement.relatedStudentId) {
        throw new Error('INVENTORY_PAYMENT_NOT_ALLOWED');
      }
      if ((movement.totalAmount || 0) <= 0) {
        throw new Error('INVENTORY_PAYMENT_AMOUNT_INVALID');
      }
      if (movement.paymentStatus === 'paid' || movement.relatedRevenueOtherId) {
        throw new Error('INVENTORY_PAYMENT_ALREADY_COLLECTED');
      }

      const rev = await tx.revenueOther.create({
        data: {
          category: movement.item.category.name,
          amount: movement.totalAmount || 0,
          paymentDate,
          paymentMethod,
          studentId: movement.relatedStudentId,
          description: note || `Thu tiền vật tư đã phát: ${movement.item.name} (SL: ${movement.quantity}) cho học viên ${movement.relatedStudent?.name || ''}`,
          createdBy: getActor(req)
        }
      });

      return tx.inventoryMovement.update({
        where: { id },
        data: {
          paymentStatus: 'paid',
          paymentDate,
          paymentMethod,
          paidAt: new Date(),
          collectedBy: getActor(req),
          relatedRevenueOtherId: rev.id,
          note: note ? `${movement.note || ''}${movement.note ? '\n' : ''}Thu tiền: ${note}` : movement.note
        },
        include: {
          item: true,
          variant: true,
          fromLocation: true,
          toLocation: true,
          relatedStudent: true,
          relatedStaff: true,
          relatedRevenueOther: true
        }
      });
    });

    res.json(updated);
  } catch (error: any) {
    if (error.message === 'INVENTORY_MOVEMENT_NOT_FOUND') {
      return res.status(404).json({ message: 'Không tìm thấy giao dịch kho' });
    }
    if (error.message === 'INVENTORY_PAYMENT_NOT_ALLOWED') {
      return res.status(400).json({ message: 'Chỉ giao dịch xuất bán cho học viên mới được thu tiền sau' });
    }
    if (error.message === 'INVENTORY_PAYMENT_AMOUNT_INVALID') {
      return res.status(400).json({ message: 'Giao dịch này không có số tiền cần thu' });
    }
    if (error.message === 'INVENTORY_PAYMENT_ALREADY_COLLECTED') {
      return res.status(409).json({ message: 'Giao dịch này đã thu tiền, không thể thu trùng' });
    }
    res.status(500).json({ message: error.message });
  }
});
