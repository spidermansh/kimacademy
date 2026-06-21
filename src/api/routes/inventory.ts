import { Router } from 'express';
import { prisma } from '../../infrastructure/db/prisma.client';
import { authenticateToken } from '../middleware/auth';

export const inventoryRouter = Router();

inventoryRouter.use(authenticateToken);

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

inventoryRouter.post('/inventory/categories', async (req, res) => {
  const { name, code, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Thiếu tên danh mục' });
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

inventoryRouter.post('/inventory/suppliers', async (req, res) => {
  const { name, phone, email, address, note } = req.body;
  if (!name) return res.status(400).json({ message: 'Thiếu tên nhà cung cấp' });
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

inventoryRouter.post('/inventory/locations', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Thiếu tên vị trí kho' });
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

inventoryRouter.post('/inventory/items', async (req, res) => {
  const { categoryId, code, name, unit, itemType, defaultSalePrice, defaultCostPrice, minStockLevel, description } = req.body;
  if (!categoryId || !code || !name || !unit || !itemType) {
    return res.status(400).json({ message: 'Thiếu thông tin mặt hàng bắt buộc' });
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
        name: 'Mặc định'
      }
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// STOCKS (Số lượng tồn kho)
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
// MOVEMENTS (Nhật ký nhập/xuất kho)
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
        relatedStaff: true
      },
      orderBy: { movementDate: 'desc' }
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

inventoryRouter.post('/inventory/movements', async (req, res) => {
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
    note,
    movementDate
  } = req.body;

  if (!movementType || !itemId || !quantity || !movementDate) {
    return res.status(400).json({ message: 'Thiếu thông tin nhập xuất bắt buộc' });
  }

  const qty = Number(quantity);
  const cost = unitCost ? Number(unitCost) : 0;
  const price = unitSalePrice ? Number(unitSalePrice) : 0;

  try {
    // 1. Resolve variant (use first variant if not provided)
    let finalVariantId = variantId;
    if (!finalVariantId) {
      const vari = await prisma.inventoryVariant.findFirst({ where: { itemId } });
      finalVariantId = vari?.id || null;
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: { category: true }
    });
    if (!item) return res.status(404).json({ message: 'Không tìm thấy mặt hàng' });

    // 2. Block negative inventory check for exports
    const isExport = ['issue_to_student', 'issue_to_staff', 'internal_use', 'damage', 'loss', 'transfer'].includes(movementType);
    if (isExport && fromLocationId) {
      const stock = await prisma.inventoryStock.findUnique({
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
        return res.status(400).json({
          message: `Số lượng tồn kho không đủ để xuất. (Hiện còn: ${currentQty} ${item.unit}, Cần xuất: ${qty} ${item.unit})`
        });
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
      const stock = await prisma.inventoryStock.findUnique({
        where: { itemId_variantId_locationId: stockKey }
      });
      if (stock) {
        await prisma.inventoryStock.update({
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
      const stock = await prisma.inventoryStock.findUnique({
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

        const updatedStock = await prisma.inventoryStock.update({
          where: { id: stock.id },
          data: {
            quantityOnHand: stock.quantityOnHand + qty,
            averageCost: newAvgCost
          }
        });
        toStockId = updatedStock.id;
      } else {
        const createdStock = await prisma.inventoryStock.create({
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

    // 4. If issue to student with price > 0, auto-create RevenueOther
    let revenueOtherId: string | null = null;
    if (movementType === 'issue_to_student' && price > 0 && relatedStudentId) {
      const totalRev = price * qty;
      const student = await prisma.student.findUnique({ where: { id: relatedStudentId } });

      const rev = await prisma.revenueOther.create({
        data: {
          category: item.category.name,
          amount: totalRev,
          paymentDate: movementDate,
          paymentMethod: 'Tiền mặt', // Default payment method
          studentId: relatedStudentId,
          description: `Xuất bán ${item.name} (SL: ${qty}) cho học viên ${student?.name || ''}`,
          createdBy: req.user?.name || req.user?.username || 'admin'
        }
      });
      revenueOtherId = rev.id;
    }

    // 5. Create Movement record
    const movement = await prisma.inventoryMovement.create({
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
        note: note || '',
        movementDate,
        createdBy: req.user?.name || req.user?.username || 'admin'
      }
    });

    res.status(201).json(movement);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
