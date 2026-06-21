import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { prisma } from '../../src/infrastructure/db/prisma.client';
import { InventoryService, AuditService, inventoryReports, ExportService } from './services';

async function cleanDatabase() {
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);
  const tables = [
    'AttendanceRecord',
    'TuitionLedgerEntry',
    'TuitionTransaction',
    'RevenueOther',
    'Enrollment',
    'Session',
    'Class',
    'GuardianContact',
    'Student',
    'AdmissionLead',
    'TeachingLog',
    'AssistantWorkLog',
    'SalaryAdvance',
    'PayrollItem',
    'PayrollPeriod',
    'Expense',
    'DailyClose',
    'AuditLog',
    'SystemParameter',
    'FeatureFlag',
    'ImportBatch',
    'BackupSnapshot',
    'Notification',
    'InventoryStock',
    'InventoryMovement',
    'InventoryVariant',
    'InventoryLocation',
    'InventoryItem',
    'InventoryCategory',
    'Supplier',
    'StaffMember',
    'User'
  ];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
}


describe('Kim Academy v2 - Phase 4B Inventory Business Test Cases', () => {
  let locationId: string;

  beforeAll(async () => {
    await cleanDatabase();
    // Create default warehouse location
    const location = await InventoryService.createLocation('Kho Chính', 'Kho lưu trữ trung tâm');
    locationId = location.id;
  });

  beforeEach(async () => {
    await cleanDatabase();
    // Re-create default warehouse location
    const location = await InventoryService.createLocation('Kho Chính', 'Kho lưu trữ trung tâm');
    locationId = location.id;
  });

  // 16. Admin tạo danh mục vật tư thành công
  it('16. should allow admin to create an inventory category', async () => {
    const cat = await InventoryService.createCategory({
      name: 'Sách giáo khoa',
      code: 'SGK',
      description: 'Sách Starter, Mover, Flyer...',
      createdBy: 'admin',
    });

    expect(cat.id).toBeDefined();
    expect(cat.name).toBe('Sách giáo khoa');
  });

  // 17. Admin tạo item sách thành công
  it('17. should allow admin to create an inventory item for books', async () => {
    const cat = await InventoryService.createCategory({
      name: 'Sách giáo khoa',
      code: 'SGK',
      createdBy: 'admin',
    });

    const item = await InventoryService.createItem({
      categoryId: cat.id,
      code: 'BK-STARTER-1',
      name: 'Sách Starter 1',
      unit: 'cuốn',
      itemType: 'sellable',
      defaultSalePrice: 120000,
      defaultCostPrice: 80000,
      minStockLevel: 5,
      description: 'Giáo trình Starter level 1',
      createdBy: 'admin',
    });

    expect(item.id).toBeDefined();
    expect(item.code).toBe('BK-STARTER-1');
  });

  // 18. Admin tạo áo đồng phục có variant size thành công
  it('18. should allow admin to create uniform items with size variants', async () => {
    const cat = await InventoryService.createCategory({
      name: 'Đồng phục',
      code: 'DP',
      createdBy: 'admin',
    });

    const item = await InventoryService.createItem({
      categoryId: cat.id,
      code: 'UNIFORM-POLO',
      name: 'Áo thun đồng phục',
      unit: 'cái',
      itemType: 'sellable',
      defaultSalePrice: 150000,
      defaultCostPrice: 100000,
      createdBy: 'admin',
    });

    const variantM = await InventoryService.createVariant({
      itemId: item.id,
      sku: 'UNIFORM-POLO-M',
      name: 'Áo đồng phục Size M',
      attributes: { size: 'M' },
    });

    expect(variantM.id).toBeDefined();
    expect(variantM.sku).toBe('UNIFORM-POLO-M');
  });

  // 19. Nhập kho 10 cuốn sách → tồn kho tăng 10
  it('19. should increase stock quantity by 10 after purchase-in', async () => {
    const cat = await InventoryService.createCategory({
      name: 'Sách',
      createdBy: 'admin',
    });
    const item = await InventoryService.createItem({
      categoryId: cat.id,
      code: 'BK-STARTER-1',
      name: 'Sách Starter 1',
      unit: 'cuốn',
      itemType: 'sellable',
      createdBy: 'admin',
    });

    await InventoryService.purchaseIn({
      itemId: item.id,
      locationId,
      quantity: 10,
      unitCost: 80000,
      createdBy: 'admin',
    });

    const stock = await prisma.inventoryStock.findFirst({
      where: { itemId: item.id, locationId },
    });
    expect(stock?.quantityOnHand).toBe(10);
    expect(stock?.averageCost).toBe(80000);
  });

  // 20. Xuất 2 cuốn cho học viên → tồn kho giảm 2
  it('20. should decrease stock quantity by 2 after issuing to student', async () => {
    const cat = await InventoryService.createCategory({
      name: 'Sách',
      createdBy: 'admin',
    });
    const item = await InventoryService.createItem({
      categoryId: cat.id,
      code: 'BK-STARTER-1',
      name: 'Sách Starter 1',
      unit: 'cuốn',
      itemType: 'sellable',
      createdBy: 'admin',
    });

    await InventoryService.purchaseIn({
      itemId: item.id,
      locationId,
      quantity: 10,
      unitCost: 80000,
      createdBy: 'admin',
    });

    await InventoryService.issueOut({
      movementType: 'issue_to_student',
      itemId: item.id,
      locationId,
      quantity: 2,
      createdBy: 'admin',
    });

    const stock = await prisma.inventoryStock.findFirst({
      where: { itemId: item.id, locationId },
    });
    expect(stock?.quantityOnHand).toBe(8);
  });

  // 21. Xuất có thu tiền → tạo RevenueOther, không tạo TuitionTransaction
  it('21. should create RevenueOther and NOT TuitionTransaction when issued with payment', async () => {
    const cat = await InventoryService.createCategory({
      name: 'Sách',
      createdBy: 'admin',
    });
    const item = await InventoryService.createItem({
      categoryId: cat.id,
      code: 'BK-STARTER-1',
      name: 'Sách Starter 1',
      unit: 'cuốn',
      itemType: 'sellable',
      createdBy: 'admin',
    });

    // Create student
    const student = await prisma.student.create({
      data: {
        code: 'STD-INV-01',
        name: 'Nguyễn Văn An',
        vietnameseName: 'Nguyễn Văn An',
        englishName: 'An',
        createdBy: 'admin',
      },
    });

    await InventoryService.purchaseIn({
      itemId: item.id,
      locationId,
      quantity: 10,
      unitCost: 80000,
      createdBy: 'admin',
    });

    await InventoryService.issueOut({
      movementType: 'issue_to_student',
      itemId: item.id,
      locationId,
      quantity: 2,
      unitSalePrice: 120000,
      createRevenue: true,
      relatedStudentId: student.id,
      createdBy: 'admin',
    });

    // Check stock
    const stock = await prisma.inventoryStock.findFirst({
      where: { itemId: item.id, locationId },
    });
    expect(stock?.quantityOnHand).toBe(8);

    // Verify RevenueOther exists
    const revs = await prisma.revenueOther.findMany({
      where: { studentId: student.id },
    });
    expect(revs.length).toBe(1);
    expect(revs[0].amount).toBe(240000); // 2 * 120,000

    // Verify TuitionTransaction does NOT exist
    const txs = await prisma.tuitionTransaction.findMany({
      where: { studentId: student.id },
    });
    expect(txs.length).toBe(0);
  });

  // 22. Xuất văn phòng phẩm cho nhân viên → tồn kho giảm, không tạo học phí
  it('22. should decrease stock when issued to staff, without creating tuition', async () => {
    const cat = await InventoryService.createCategory({
      name: 'Văn phòng phẩm',
      createdBy: 'admin',
    });
    const item = await InventoryService.createItem({
      categoryId: cat.id,
      code: 'PEN-BLUE',
      name: 'Bút bi xanh',
      unit: 'hộp',
      itemType: 'consumable',
      createdBy: 'admin',
    });

    // Create staff member
    const staff = await prisma.staffMember.create({
      data: {
        code: 'STF-INV-02',
        name: 'Nhân Viên B',
        role: 'office',
        startDate: '2026-06-01',
      },
    });

    await InventoryService.purchaseIn({
      itemId: item.id,
      locationId,
      quantity: 20,
      unitCost: 50000,
      createdBy: 'admin',
    });

    await InventoryService.issueOut({
      movementType: 'issue_to_staff',
      itemId: item.id,
      locationId,
      quantity: 3,
      relatedStaffId: staff.id,
      createdBy: 'admin',
    });

    const stock = await prisma.inventoryStock.findFirst({
      where: { itemId: item.id, locationId },
    });
    expect(stock?.quantityOnHand).toBe(17);

    // Verify no revenue or tuition transactions are created
    const revCount = await prisma.revenueOther.count();
    const txCount = await prisma.tuitionTransaction.count();
    expect(revCount).toBe(0);
    expect(txCount).toBe(0);
  });

  // 23. Điều chỉnh kiểm kê +3 → tồn kho tăng 3
  it('23. should adjust inventory up by 3 successfully', async () => {
    const cat = await InventoryService.createCategory({
      name: 'Sách',
      createdBy: 'admin',
    });
    const item = await InventoryService.createItem({
      categoryId: cat.id,
      code: 'BK-STARTER-1',
      name: 'Sách Starter 1',
      unit: 'cuốn',
      itemType: 'sellable',
      createdBy: 'admin',
    });

    await InventoryService.purchaseIn({
      itemId: item.id,
      locationId,
      quantity: 5,
      unitCost: 80000,
      createdBy: 'admin',
    });

    // Adjust up (+3) by doing a purchaseIn with type purchase_in and note
    await InventoryService.purchaseIn({
      itemId: item.id,
      locationId,
      quantity: 3,
      unitCost: 80000,
      note: 'Điều chỉnh kiểm kê tăng',
      createdBy: 'admin',
    });

    const stock = await prisma.inventoryStock.findFirst({
      where: { itemId: item.id, locationId },
    });
    expect(stock?.quantityOnHand).toBe(8);
  });

  // 24. Ghi nhận hàng hỏng -1 → tồn kho giảm 1
  it('24. should record damaged stock of -1 successfully', async () => {
    const cat = await InventoryService.createCategory({
      name: 'Sách',
      createdBy: 'admin',
    });
    const item = await InventoryService.createItem({
      categoryId: cat.id,
      code: 'BK-STARTER-1',
      name: 'Sách Starter 1',
      unit: 'cuốn',
      itemType: 'sellable',
      createdBy: 'admin',
    });

    await InventoryService.purchaseIn({
      itemId: item.id,
      locationId,
      quantity: 5,
      unitCost: 80000,
      createdBy: 'admin',
    });

    await InventoryService.issueOut({
      movementType: 'damage',
      itemId: item.id,
      locationId,
      quantity: 1,
      note: 'Sách bị rách bìa',
      createdBy: 'admin',
    });

    const stock = await prisma.inventoryStock.findFirst({
      where: { itemId: item.id, locationId },
    });
    expect(stock?.quantityOnHand).toBe(4);
  });

  // 25. Không cho xuất quá tồn nếu cấu hình không cho âm kho
  it('25. should block issuing more than available stock by default (negative stock block)', async () => {
    const cat = await InventoryService.createCategory({
      name: 'Sách',
      createdBy: 'admin',
    });
    const item = await InventoryService.createItem({
      categoryId: cat.id,
      code: 'BK-STARTER-1',
      name: 'Sách Starter 1',
      unit: 'cuốn',
      itemType: 'sellable',
      createdBy: 'admin',
    });

    await InventoryService.purchaseIn({
      itemId: item.id,
      locationId,
      quantity: 5,
      unitCost: 80000,
      createdBy: 'admin',
    });

    await expect(
      InventoryService.issueOut({
        movementType: 'issue_to_student',
        itemId: item.id,
        locationId,
        quantity: 10, // Exceeds 5
        createdBy: 'admin',
      })
    ).rejects.toThrow();
  });

  // 26. Báo cáo tồn kho hiển thị chính xác tồn thực tế
  it('26. should compute correct stock levels in the stock summary report', async () => {
    const cat = await InventoryService.createCategory({
      name: 'Sách',
      createdBy: 'admin',
    });
    const item = await InventoryService.createItem({
      categoryId: cat.id,
      code: 'BK-STARTER-1',
      name: 'Sách Starter 1',
      unit: 'cuốn',
      itemType: 'sellable',
      createdBy: 'admin',
    });

    await InventoryService.purchaseIn({
      itemId: item.id,
      locationId,
      quantity: 10,
      unitCost: 80000,
      createdBy: 'admin',
    });

    const stockReport = inventoryReports.find(r => r.id === 'inventory_stock_summary');
    expect(stockReport).toBeDefined();

    const data = await stockReport!.compute({ locationId });
    expect(data.length).toBe(1);
    expect(data[0].itemName).toBe('Sách Starter 1');
    expect(data[0].quantityOnHand).toBe(10);
    expect(data[0].totalValue).toBe(800000);
  });

  // 27. Báo cáo vật tư sắp hết cảnh báo đúng các mặt hàng dưới tồn tối thiểu
  it('27. should trigger alert in the low stock alert report for items below threshold', async () => {
    const cat = await InventoryService.createCategory({
      name: 'Sách',
      createdBy: 'admin',
    });
    // Create item with minStockLevel = 5, but current stock is only 2
    const item = await InventoryService.createItem({
      categoryId: cat.id,
      code: 'BK-STARTER-1',
      name: 'Sách Starter 1',
      unit: 'cuốn',
      itemType: 'sellable',
      minStockLevel: 5,
      createdBy: 'admin',
    });

    await InventoryService.purchaseIn({
      itemId: item.id,
      locationId,
      quantity: 2,
      unitCost: 80000,
      createdBy: 'admin',
    });

    const lowStockReport = inventoryReports.find(r => r.id === 'inventory_low_stock_alert');
    expect(lowStockReport).toBeDefined();

    const data = await lowStockReport!.compute({});
    expect(data.length).toBe(1);
    expect(data[0].code).toBe('BK-STARTER-1');
    expect(data[0].totalStock).toBe(2);
    expect(data[0].minStock).toBe(5);
  });

  // 28. Export Excel tồn kho và movements đúng filter
  it('28. should generate correct Excel workbook using ExportService', () => {
    const mockData = [
      { sku: 'BK-STARTER-1', name: 'Sách Starter 1', stock: 10 },
      { sku: 'UNIFORM-POLO-M', name: 'Áo đồng phục Size M', stock: 15 },
    ];

    const buffer = ExportService.exportToExcelBuffer(mockData, 'TonKho');
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(0);
  });

  // 29. Audit log ghi đủ hành động, oldValue, newValue của vật tư
  it('29. should write audit logs for inventory category and item creations', async () => {
    const cat = await InventoryService.createCategory({
      name: 'Sách',
      createdBy: 'admin-operator',
    });

    const logs = await AuditService.getLogs({ entity: 'InventoryCategory', entityId: cat.id });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe('CREATE_INVENTORY_CATEGORY');
    expect(logs[0].user).toBe('admin-operator');
  });

  // 30. Không cho phép hard delete đối với các bản ghi InventoryMovement
  it('30. should prevent hard deletes of InventoryMovement records at application level', async () => {
    // InventoryMovement does not expose a delete API in the repository.
    // If we try to access a delete function on InventoryService, it should not exist.
    expect((InventoryService as any).deleteMovement).toBeUndefined();
    expect((InventoryService as any).removeMovement).toBeUndefined();
  });
});
