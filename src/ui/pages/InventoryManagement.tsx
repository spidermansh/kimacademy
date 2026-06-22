import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Layers, MapPin, Truck, RefreshCw, 
  ArrowDownLeft, ArrowUpRight, AlertTriangle, AlertCircle, 
  HelpCircle, Info, Calendar, User, DollarSign, ListFilter,
  ShieldCheck, FileSpreadsheet, X, Check
} from 'lucide-react';
import { api, formatCurrency } from '../../shared/utils';
import { useToast } from '../components/Toast';
import * as XLSX from 'xlsx';

type SubTabId = 'stocks' | 'movements' | 'items' | 'suppliers' | 'locations' | 'categories';

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  opening: 'Tồn đầu kỳ',
  purchase_in: 'Mua nhập kho',
  return_in: 'Trả lại kho',
  issue_to_student: 'Bán học viên',
  issue_to_staff: 'Cấp nhân sự',
  internal_use: 'Sử dụng nội bộ',
  adjustment: 'Kiểm kê điều chỉnh',
  damage: 'Hỏng hóc',
  loss: 'Mất mát',
  transfer: 'Chuyển kho',
};

export default function InventoryManagement() {
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('stocks');
  const [loading, setLoading] = useState(false);

  // Data states
  const [stocks, setStocks] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);

  // Search/Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');

  // Form Modals
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAddMovementModal, setShowAddMovementModal] = useState(false);

  // New Category Form
  const [categoryName, setCategoryName] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');

  // New Location Form
  const [locationName, setLocationName] = useState('');
  const [locationDesc, setLocationDesc] = useState('');

  // New Supplier Form
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierNote, setSupplierNote] = useState('');

  // New Item Form
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemUnit, setItemUnit] = useState('cuốn');
  const [itemType, setItemType] = useState<'consumable' | 'sellable' | 'equipment'>('sellable');
  const [itemSalePrice, setItemSalePrice] = useState(0);
  const [itemCostPrice, setItemCostPrice] = useState(0);
  const [itemMinStock, setItemMinStock] = useState(5);
  const [itemDesc, setItemDesc] = useState('');

  // New Movement Form
  const [mType, setMType] = useState<string>('purchase_in');
  const [mItemId, setMItemId] = useState('');
  const [mVariantId, setMVariantId] = useState('');
  const [mFromLocationId, setMFromLocationId] = useState('');
  const [mToLocationId, setMToLocationId] = useState('');
  const [mSupplierId, setMSupplierId] = useState(''); // NCC khi nhập kho (purchase_in)
  const [mQty, setMQty] = useState(1);
  const [mUnitCost, setMUnitCost] = useState(0);
  const [mUnitSalePrice, setMUnitSalePrice] = useState(0);
  const [mStudentId, setMStudentId] = useState('');
  const [mStaffId, setMStaffId] = useState('');
  const [mNote, setMNote] = useState('');
  const [mDate, setMDate] = useState(new Date().toISOString().slice(0, 10));
  const [mPaymentStatus, setMPaymentStatus] = useState<'unpaid' | 'paid'>('unpaid');
  const [mIssued, setMIssued] = useState(true); // false = đã thu tiền nhưng chưa phát hàng
  const [mPaymentMethod, setMPaymentMethod] = useState('Tiền mặt');
  const [mPaymentDate, setMPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [mSaleMode, setMSaleMode] = useState<'single' | 'bulk'>('single');
  const [mClassId, setMClassId] = useState('');
  const [mSelectedStudentIds, setMSelectedStudentIds] = useState<string[]>([]);
  const [mStudentQuantities, setMStudentQuantities] = useState<Record<string, number>>({});
  const [collectingMovement, setCollectingMovement] = useState<any | null>(null);
  const [collectPaymentMethod, setCollectPaymentMethod] = useState('Tiền mặt');
  const [collectPaymentDate, setCollectPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [collectNote, setCollectNote] = useState('');

  // Bộ lọc Nhật ký xuất nhập
  const [mvfType, setMvfType] = useState('all');
  const [mvfPayment, setMvfPayment] = useState('all'); // all | unpaid | paid | pending_delivery
  const [mvfFrom, setMvfFrom] = useState('');
  const [mvfTo, setMvfTo] = useState('');
  const [mvfSearch, setMvfSearch] = useState('');

  const inventoryPaymentMethods = ['Tiền mặt', 'Chuyển khoản', 'Momo', 'ZaloPay', 'Khác'];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [cats, sups, locs, prodItems, stockList, mvList, stds, stf, cls, enrollmentList] = await Promise.all([
        api.getInventoryCategories(),
        api.getSuppliers(),
        api.getInventoryLocations(),
        api.getInventoryItems(),
        api.getInventoryStocks(),
        api.getInventoryMovements(),
        api.getStudents(),
        api.getStaff(),
        api.getClasses(),
        api.getEnrollments({ isActive: true })
      ]);

      setCategories(cats);
      setSuppliers(sups);
      setLocations(locs);
      setItems(prodItems);
      setStocks(stockList);
      setMovements(mvList);
      setStudents(stds);
      setStaff(stf);
      setClasses(cls);
      setEnrollments(enrollmentList);
    } catch (err: any) {
      toast.error('Lỗi tải dữ liệu kho', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Categories Save
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName) return;
    try {
      await api.createInventoryCategory({
        name: categoryName,
        code: categoryCode,
        description: categoryDesc
      });
      toast.success('Thành công', 'Đã tạo danh mục vật tư mới');
      setShowAddCategoryModal(false);
      setCategoryName('');
      setCategoryCode('');
      setCategoryDesc('');
      fetchInitialData();
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    }
  };

  // Locations Save
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName) return;
    try {
      await api.createInventoryLocation({
        name: locationName,
        description: locationDesc
      });
      toast.success('Thành công', 'Đã tạo kho/vị trí mới');
      setShowAddLocationModal(false);
      setLocationName('');
      setLocationDesc('');
      fetchInitialData();
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    }
  };

  // Suppliers Save
  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName) return;
    try {
      await api.createSupplier({
        name: supplierName,
        phone: supplierPhone,
        email: supplierEmail,
        address: supplierAddress,
        note: supplierNote
      });
      toast.success('Thành công', 'Đã lưu nhà cung cấp mới');
      setShowAddSupplierModal(false);
      setSupplierName('');
      setSupplierPhone('');
      setSupplierEmail('');
      setSupplierAddress('');
      setSupplierNote('');
      fetchInitialData();
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    }
  };

  // Items Save
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCategoryId || !itemCode || !itemName) {
      toast.error('Lỗi', 'Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }
    try {
      await api.createInventoryItem({
        categoryId: itemCategoryId,
        code: itemCode,
        name: itemName,
        unit: itemUnit,
        itemType,
        defaultSalePrice: itemSalePrice,
        defaultCostPrice: itemCostPrice,
        minStockLevel: itemMinStock,
        description: itemDesc
      });
      toast.success('Thành công', 'Đã tạo sản phẩm vật tư mới');
      setShowAddItemModal(false);
      setItemCategoryId('');
      setItemCode('');
      setItemName('');
      setItemUnit('cuốn');
      setItemType('sellable');
      setItemSalePrice(0);
      setItemCostPrice(0);
      setItemMinStock(5);
      setItemDesc('');
      fetchInitialData();
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    }
  };

  const resetMovementForm = () => {
    setMItemId('');
    setMVariantId('');
    setMFromLocationId('');
    setMToLocationId('');
    setMSupplierId('');
    setMQty(1);
    setMUnitCost(0);
    setMUnitSalePrice(0);
    setMStudentId('');
    setMStaffId('');
    setMNote('');
    setMPaymentStatus('unpaid');
    setMIssued(true);
    setMPaymentMethod('Tiền mặt');
    setMPaymentDate(new Date().toISOString().slice(0, 10));
    setMSaleMode('single');
    setMClassId('');
    setMSelectedStudentIds([]);
    setMStudentQuantities({});
  };

  // Movements Save (Stock check logic included on Backend, but we capture the response)
  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mItemId || !mQty || !mDate) {
      toast.error('Lỗi', 'Vui lòng điền đủ thông tin bắt buộc');
      return;
    }

    // Set locations based on movement type
    let fromLoc = mFromLocationId;
    let toLoc = mToLocationId;

    if (mType === 'opening' || mType === 'purchase_in' || mType === 'return_in') {
      fromLoc = '';
    } else if (mType === 'issue_to_student' || mType === 'issue_to_staff' || mType === 'internal_use' || mType === 'damage' || mType === 'loss') {
      toLoc = '';
    }

    try {
      if (mType === 'issue_to_student' && mSaleMode === 'bulk') {
        if (!mClassId) {
          toast.error('Thiếu lớp học', 'Vui lòng chọn lớp trước khi bán hàng loạt');
          return;
        }
        if (mSelectedStudentIds.length === 0) {
          toast.error('Chưa chọn học viên', 'Vui lòng chọn ít nhất 1 học viên trong lớp');
          return;
        }

        await api.createInventoryMovementsBulk({
          movementType: mType,
          classId: mClassId,
          itemId: mItemId,
          variantId: mVariantId || undefined,
          fromLocationId: fromLoc || undefined,
          students: mSelectedStudentIds.map(studentId => ({
            studentId,
            quantity: mStudentQuantities[studentId] || 1
          })),
          unitCost: mUnitCost,
          unitSalePrice: mUnitSalePrice,
          paymentStatus: mUnitSalePrice > 0 ? mPaymentStatus : undefined,
          issued: mUnitSalePrice > 0 ? mIssued : undefined,
          paymentMethod: mPaymentStatus === 'paid' ? mPaymentMethod : undefined,
          paymentDate: mPaymentStatus === 'paid' ? mPaymentDate : undefined,
          note: mNote,
          movementDate: mDate
        });

        toast.success(
          'Đã tạo giao dịch hàng loạt',
          `Đã tạo ${mSelectedStudentIds.length} giao dịch cho lớp đã chọn`
        );
        setShowAddMovementModal(false);
        resetMovementForm();
        fetchInitialData();
        return;
      }

      await api.createInventoryMovement({
        movementType: mType,
        itemId: mItemId,
        variantId: mVariantId || undefined,
        fromLocationId: fromLoc || undefined,
        toLocationId: toLoc || undefined,
        quantity: mQty,
        unitCost: mUnitCost,
        unitSalePrice: mUnitSalePrice,
        relatedStudentId: mStudentId || undefined,
        relatedStaffId: mStaffId || undefined,
        supplierId: mType === 'purchase_in' ? (mSupplierId || undefined) : undefined,
        paymentStatus: mType === 'issue_to_student' && mUnitSalePrice > 0 ? mPaymentStatus : undefined,
        issued: mType === 'issue_to_student' ? mIssued : undefined,
        paymentMethod: mType === 'issue_to_student' && mPaymentStatus === 'paid' ? mPaymentMethod : undefined,
        paymentDate: mType === 'issue_to_student' && mPaymentStatus === 'paid' ? mPaymentDate : undefined,
        note: mNote,
        movementDate: mDate
      });

      toast.success(
        'Thành công',
        mType === 'issue_to_student' && !mIssued
          ? 'Đã thu tiền — chờ phát hàng (vào Nhật ký để bấm "Phát hàng" khi giao)'
          : mType === 'issue_to_student' && mPaymentStatus === 'unpaid'
          ? 'Đã phát hàng và ghi nhận trạng thái chưa thu tiền'
          : 'Đã thực hiện giao dịch kho thành công'
      );
      setShowAddMovementModal(false);
      resetMovementForm();
      fetchInitialData();
    } catch (err: any) {
      toast.error('Giao dịch thất bại', err.message);
    }
  };

  const openCollectPaymentModal = (movement: any) => {
    setCollectingMovement(movement);
    setCollectPaymentMethod('Tiền mặt');
    setCollectPaymentDate(new Date().toISOString().slice(0, 10));
    setCollectNote('');
  };

  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingMovement) return;
    try {
      await api.collectInventoryPayment(collectingMovement.id, {
        paymentDate: collectPaymentDate,
        paymentMethod: collectPaymentMethod,
        note: collectNote
      });
      toast.success('Đã thu tiền', 'Giao dịch vật tư đã được xác nhận hoàn tất');
      setCollectingMovement(null);
      setCollectNote('');
      fetchInitialData();
    } catch (err: any) {
      toast.error('Thu tiền thất bại', err.message);
    }
  };

  const handleDeliver = async (movement: any) => {
    const ok = await toast.confirm({
      title: '📦 Xác nhận phát hàng?',
      message: `Phát ${movement.quantity} ${movement.item?.unit || ''} "${movement.item?.name || ''}" cho học viên ${movement.relatedStudent?.name || ''}. Hệ thống sẽ trừ kho ngay (kiểm tra tồn).`,
      confirmText: 'Phát hàng',
      danger: false,
    });
    if (!ok) return;
    try {
      await api.deliverInventoryMovement(movement.id, {});
      toast.success('Đã phát hàng', 'Giao dịch hoàn tất: đã thu tiền + đã phát hàng');
      fetchInitialData();
    } catch (err: any) {
      toast.error('Phát hàng thất bại', err.message);
    }
  };

  // Automatically fetch default prices when item changes in movement form
  useEffect(() => {
    if (mItemId) {
      const selectedItem = items.find(i => i.id === mItemId);
      if (selectedItem) {
        setMUnitCost(selectedItem.defaultCostPrice || 0);
        setMUnitSalePrice(selectedItem.defaultSalePrice || 0);
        // Pre-fill variant if exists
        if (selectedItem.variants && selectedItem.variants.length > 0) {
          setMVariantId(selectedItem.variants[0].id);
        } else {
          setMVariantId('');
        }
      }
    }
  }, [mItemId, items]);

  // Adjust defaults when movement type changes
  useEffect(() => {
    if (mType === 'purchase_in') {
      setMFromLocationId('');
      if (locations.length > 0) setMToLocationId(locations[0].id);
      setMSaleMode('single');
    } else if (mType === 'issue_to_student' || mType === 'issue_to_staff') {
      if (locations.length > 0) setMFromLocationId(locations[0].id);
      setMToLocationId('');
      if (mType === 'issue_to_student') {
        setMPaymentStatus('unpaid');
        setMIssued(true);
        setMPaymentDate(mDate);
      } else {
        setMSaleMode('single');
      }
    } else if (mType === 'transfer') {
      if (locations.length > 1) {
        setMFromLocationId(locations[0].id);
        setMToLocationId(locations[1].id);
      }
      setMSaleMode('single');
    }
  }, [mType, locations, mDate]);

  useEffect(() => {
    setMSelectedStudentIds([]);
    setMStudentQuantities({});
  }, [mClassId]);

  // Filters logic
  const filteredStocks = stocks.filter(stock => {
    const item = stock.item;
    if (!item) return false;

    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchesLocation = selectedLocation === 'all' || stock.locationId === selectedLocation;

    return matchesSearch && matchesCategory && matchesLocation;
  });

  const studentsById = new Map(students.map(student => [student.id, student]));
  const bulkClassEnrollments = enrollments.filter(enrollment =>
    enrollment.classId === mClassId && enrollment.isActive !== false
  );
  const bulkClassStudents = bulkClassEnrollments.map(enrollment => {
    const student = studentsById.get(enrollment.studentId);
    return {
      ...(student || {}),
      id: enrollment.studentId,
      name: student?.name || enrollment.studentName,
      parentPhone: student?.parentPhone || '',
      className: enrollment.className
    };
  });
  const selectedBulkStudents = bulkClassStudents.filter(student => mSelectedStudentIds.includes(student.id));
  const bulkTotalQuantity = selectedBulkStudents.reduce((sum, student) => sum + (mStudentQuantities[student.id] || 1), 0);
  const bulkTotalAmount = bulkTotalQuantity * (mUnitSalePrice || 0);
  const selectedStock = stocks.find(stock =>
    stock.itemId === mItemId &&
    stock.locationId === mFromLocationId &&
    (!mVariantId || stock.variantId === mVariantId)
  );
  const selectedStockQty = selectedStock?.quantityOnHand || 0;
  // Tồn thiếu chỉ chặn khi PHÁT hàng ngay (mIssued). "Đã thu – chưa phát" không trừ kho lúc tạo (D9).
  const bulkStockShort = mType === 'issue_to_student' && mSaleMode === 'bulk' && mIssued && bulkTotalQuantity > selectedStockQty;
  const allBulkStudentsSelected = bulkClassStudents.length > 0 && bulkClassStudents.every(student => mSelectedStudentIds.includes(student.id));

  const pendingInventoryPayments = movements.filter(m =>
    m.movementType === 'issue_to_student' &&
    m.paymentStatus === 'unpaid' &&
    (m.totalAmount || 0) > 0
  );
  const pendingInventoryAmount = pendingInventoryPayments.reduce((sum, m) => sum + (Number(m.totalAmount) || 0), 0);

  // Đã thu tiền nhưng chưa phát hàng (chờ giao).
  const pendingDeliveries = movements.filter(m =>
    m.movementType === 'issue_to_student' &&
    m.paymentStatus === 'paid' &&
    m.issued === false
  );
  const pendingDeliveryQty = pendingDeliveries.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

  // --- Bộ lọc + xuất Excel cho Nhật ký xuất nhập ---
  const filteredMovements = movements.filter(m => {
    if (mvfType !== 'all' && m.movementType !== mvfType) return false;
    if (mvfFrom && m.movementDate < mvfFrom) return false;
    if (mvfTo && m.movementDate > mvfTo) return false;
    if (mvfPayment === 'unpaid' && !(m.movementType === 'issue_to_student' && m.paymentStatus === 'unpaid' && (m.totalAmount || 0) > 0)) return false;
    if (mvfPayment === 'paid' && m.paymentStatus !== 'paid') return false;
    if (mvfPayment === 'pending_delivery' && !(m.paymentStatus === 'paid' && m.issued === false)) return false;
    if (mvfSearch.trim()) {
      const q = mvfSearch.toLowerCase().trim();
      const hay = `${m.item?.name || ''} ${m.relatedStudent?.name || ''} ${m.relatedStaff?.name || ''} ${m.note || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const exportMovementsXLSX = () => {
    if (filteredMovements.length === 0) {
      toast.error('Không có dữ liệu', 'Danh sách giao dịch (sau lọc) đang trống');
      return;
    }
    const rows = filteredMovements.map(m => ({
      'Ngày GD': m.movementDate,
      'Loại GD': MOVEMENT_TYPE_LABELS[m.movementType] || m.movementType,
      'Mặt hàng': `${m.item?.name || ''}${m.variant?.name && m.variant.name !== 'Mặc định' ? ` (${m.variant.name})` : ''}`,
      'Từ kho': m.fromLocation?.name || '',
      'Đến kho': m.toLocation?.name || '',
      'Số lượng': m.quantity,
      'Đơn vị': m.item?.unit || '',
      'Thành tiền (VND)': m.totalAmount || 0,
      'Đối tác': m.relatedStudent ? `HV: ${m.relatedStudent.name}` : m.relatedStaff ? `NV: ${m.relatedStaff.name}` : '',
      'Thu tiền': m.movementType === 'issue_to_student' && (m.totalAmount || 0) > 0 ? (m.paymentStatus === 'paid' ? 'Đã thu' : 'Chưa thu') : '',
      'Phát hàng': m.movementType === 'issue_to_student' ? (m.issued ? 'Đã phát' : 'Chờ phát') : '',
      'Ngày thu': m.paymentDate || '',
      'Hình thức thu': m.paymentMethod || '',
      'Ghi chú': m.note || '',
      'Người tạo': m.createdBy || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NhatKyXuatNhap');
    XLSX.writeFile(wb, `nhat-ky-xuat-nhap-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Đã xuất Excel', `${rows.length} giao dịch`);
  };

  const renderMovementToolbar = () => (
    <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-slate-500 text-xs font-black"><ListFilter className="w-4 h-4" /> Lọc</span>
      <input value={mvfSearch} onChange={e => setMvfSearch(e.target.value)} placeholder="Tìm mặt hàng / học viên / ghi chú…" className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-400 min-w-[200px] flex-1" />
      <select value={mvfType} onChange={e => setMvfType(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-xl text-xs bg-white">
        <option value="all">Tất cả loại GD</option>
        {Object.entries(MOVEMENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <select value={mvfPayment} onChange={e => setMvfPayment(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-xl text-xs bg-white">
        <option value="all">Mọi trạng thái</option>
        <option value="unpaid">Chưa thu (nợ tiền)</option>
        <option value="paid">Đã thu</option>
        <option value="pending_delivery">Đã thu - chờ phát</option>
      </select>
      <input type="date" value={mvfFrom} onChange={e => setMvfFrom(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-xl text-xs bg-white font-mono" />
      <span className="text-slate-400 text-xs">→</span>
      <input type="date" value={mvfTo} onChange={e => setMvfTo(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-xl text-xs bg-white font-mono" />
      <span className="text-xs text-slate-500 font-bold">{filteredMovements.length}/{movements.length}</span>
      {(mvfType !== 'all' || mvfPayment !== 'all' || mvfFrom || mvfTo || mvfSearch) && (
        <button onClick={() => { setMvfType('all'); setMvfPayment('all'); setMvfFrom(''); setMvfTo(''); setMvfSearch(''); }} className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 rounded-xl border border-slate-200 bg-white cursor-pointer">Xóa lọc</button>
      )}
      <button onClick={exportMovementsXLSX} className="ml-auto px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer inline-flex items-center gap-1.5">
        <FileSpreadsheet className="w-4 h-4" /> Xuất Excel
      </button>
    </div>
  );

  const toggleBulkStudent = (studentId: string) => {
    setMSelectedStudentIds(prev => (
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    ));
    setMStudentQuantities(prev => ({
      ...prev,
      [studentId]: prev[studentId] || 1
    }));
  };

  const toggleAllBulkStudents = () => {
    if (allBulkStudentsSelected) {
      setMSelectedStudentIds([]);
      return;
    }
    const nextIds = bulkClassStudents.map(student => student.id);
    setMSelectedStudentIds(nextIds);
    setMStudentQuantities(prev => {
      const next = { ...prev };
      nextIds.forEach(id => {
        next[id] = next[id] || 1;
      });
      return next;
    });
  };

  const updateBulkStudentQuantity = (studentId: string, quantity: number) => {
    setMStudentQuantities(prev => ({
      ...prev,
      [studentId]: Math.max(1, Number(quantity) || 1)
    }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
            <Package className="w-7 h-7 text-indigo-400" />
            Quản lý Kho Vật tư & Học cụ
          </h2>
          <p className="text-indigo-200 text-xs sm:text-sm font-medium">
            Hệ thống quản lý xuất nhập tồn, bán giáo trình, áo đồng phục học viên và thiết bị nội bộ.
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={() => {
              if (items.length === 0) {
                toast.error('Lỗi', 'Cần tạo Mặt hàng/Sản phẩm trước khi nhập xuất kho');
                return;
              }
              if (locations.length === 0) {
                toast.error('Lỗi', 'Cần tạo Kho/Vị trí lưu trữ trước khi nhập xuất kho');
                return;
              }
              setShowAddMovementModal(true);
            }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nhập/Xuất kho
          </button>
          <button
            onClick={fetchInitialData}
            disabled={loading}
            className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-2xl transition-all cursor-pointer border border-white/10"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TABS SELECT */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-px shrink-0">
        {[
          { id: 'stocks', label: 'Tồn kho thực tế', icon: <Package className="w-4 h-4" /> },
          { id: 'movements', label: 'Nhật ký xuất nhập', icon: <RefreshCw className="w-4 h-4" /> },
          { id: 'items', label: 'Danh mục mặt hàng', icon: <Layers className="w-4 h-4" /> },
          { id: 'suppliers', label: 'Nhà cung cấp', icon: <Truck className="w-4 h-4" /> },
          { id: 'locations', label: 'Kho lưu trữ', icon: <MapPin className="w-4 h-4" /> },
          { id: 'categories', label: 'Nhóm vật tư', icon: <Layers className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as SubTabId)}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* FILTER PANEL */}
      {activeSubTab === 'stocks' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm tên hoặc mã sản phẩm..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">Tất cả danh mục vật tư</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={selectedLocation}
              onChange={e => setSelectedLocation(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">Tất cả các kho</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* TAB CONTENT: STOCKS */}
      {activeSubTab === 'stocks' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Mã SKU</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Tên mặt hàng</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Kho hàng</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Số lượng tồn</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Đơn vị</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Giá vốn bình quân</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Giá bán niêm yết</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Cảnh báo tồn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-slate-400 font-medium">
                      Đang tải dữ liệu tồn kho...
                    </td>
                  </tr>
                ) : filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-slate-400 font-medium">
                      Không tìm thấy mặt hàng nào trong kho.
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map(stock => {
                    const lowStock = stock.quantityOnHand <= (stock.item.minStockLevel || 5);
                    return (
                      <tr key={stock.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-600">{stock.item.code}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {stock.item.name} {stock.variant?.name !== 'Mặc định' ? `(${stock.variant?.name})` : ''}
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{stock.location.name}</td>
                        <td className="px-6 py-4 font-black">
                          <span className={lowStock ? 'text-rose-600 font-extrabold flex items-center gap-1' : 'text-slate-800'}>
                            {stock.quantityOnHand}
                            {lowStock && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{stock.item.unit}</td>
                        <td className="px-6 py-4 font-mono text-slate-600 font-medium">
                          {formatCurrency(stock.averageCost || stock.item.defaultCostPrice || 0)}
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-800 font-bold">
                          {formatCurrency(stock.item.defaultSalePrice || 0)}
                        </td>
                        <td className="px-6 py-4">
                          {lowStock ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Dưới mức tối thiểu ({stock.item.minStockLevel || 5})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              An toàn
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: MOVEMENTS */}
      {activeSubTab === 'movements' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-amber-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-amber-700">Công nợ vật tư đã phát</p>
              <p className="text-xs text-amber-800 mt-1">
                {pendingInventoryPayments.length} giao dịch chưa thu tiền, tổng {formatCurrency(pendingInventoryAmount)}
              </p>
            </div>
            {pendingInventoryPayments.length > 0 && (
              <button
                onClick={() => openCollectPaymentModal(pendingInventoryPayments[0])}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black cursor-pointer"
              >
                Thu giao dịch đầu tiên
              </button>
            )}
          </div>
          {pendingDeliveries.length > 0 && (
            <div className="px-6 py-4 border-b border-slate-100 bg-sky-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-sky-700">Đã thu tiền — chờ phát hàng</p>
                <p className="text-xs text-sky-800 mt-1">
                  {pendingDeliveries.length} giao dịch chờ phát, tổng {pendingDeliveryQty} sản phẩm
                </p>
              </div>
              <button
                onClick={() => handleDeliver(pendingDeliveries[0])}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black cursor-pointer"
              >
                Phát giao dịch đầu tiên
              </button>
            </div>
          )}
          {renderMovementToolbar()}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Ngày giao dịch</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Loại giao dịch</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Tên mặt hàng</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Từ kho</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Đến kho</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Số lượng</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Thành tiền</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Thanh toán</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Đối tác liên quan</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Ghi chú</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredMovements.length === 0 && (
                  <tr><td colSpan={11} className="px-6 py-8 text-center text-slate-400 text-sm">Không có giao dịch nào khớp bộ lọc.</td></tr>
                )}
                {filteredMovements.map(m => {
                  const isImport = ['opening', 'purchase_in', 'return_in'].includes(m.movementType);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-500 font-medium">{m.movementDate}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold text-[11px] ${
                          isImport 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        }`}>
                          {isImport ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                          {m.movementType === 'opening' && 'Tồn đầu kỳ'}
                          {m.movementType === 'purchase_in' && 'Mua nhập kho'}
                          {m.movementType === 'return_in' && 'Trả lại kho'}
                          {m.movementType === 'issue_to_student' && 'Bán học viên'}
                          {m.movementType === 'issue_to_staff' && 'Cấp nhân sự'}
                          {m.movementType === 'internal_use' && 'Sử dụng nội bộ'}
                          {m.movementType === 'adjustment' && 'Kiểm kê điều chỉnh'}
                          {m.movementType === 'damage' && 'Hỏng hóc'}
                          {m.movementType === 'loss' && 'Mất mát'}
                          {m.movementType === 'transfer' && 'Chuyển kho'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {m.item.name} {m.variant?.name !== 'Mặc định' ? `(${m.variant?.name})` : ''}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{m.fromLocation?.name || '-'}</td>
                      <td className="px-6 py-4 text-slate-500">{m.toLocation?.name || '-'}</td>
                      <td className="px-6 py-4 font-extrabold">{m.quantity} {m.item.unit}</td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">
                        {formatCurrency(m.totalAmount || 0)}
                      </td>
                      <td className="px-6 py-4">
                        {m.movementType === 'issue_to_student' && (m.totalAmount || 0) > 0 ? (
                          m.paymentStatus === 'unpaid' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-black text-[11px] bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Đã phát - chưa thu
                            </span>
                          ) : m.issued ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-black text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3.5 h-3.5" />
                              Đã thu - đã phát
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-black text-[11px] bg-sky-50 text-sky-700 border border-sky-200">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Đã thu - chờ phát
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                        {m.paymentStatus === 'paid' && m.paymentDate && (
                          <div className="mt-1 text-[10px] text-slate-400 font-medium">
                            {m.paymentDate} · {m.paymentMethod || 'N/A'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-600">
                        {m.relatedStudent ? `Học viên: ${m.relatedStudent.name}` : m.relatedStaff ? `Nhân viên: ${m.relatedStaff.name}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 italic max-w-xs truncate">{m.note || '-'}</td>
                      <td className="px-6 py-4">
                        {m.movementType === 'issue_to_student' && m.paymentStatus === 'unpaid' && (m.totalAmount || 0) > 0 ? (
                          <button
                            onClick={() => openCollectPaymentModal(m)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black cursor-pointer inline-flex items-center gap-1"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Thu tiền
                          </button>
                        ) : m.movementType === 'issue_to_student' && m.paymentStatus === 'paid' && !m.issued ? (
                          <button
                            onClick={() => handleDeliver(m)}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-[11px] font-black cursor-pointer inline-flex items-center gap-1"
                          >
                            <Package className="w-3.5 h-3.5" />
                            Phát hàng
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ITEMS */}
      {activeSubTab === 'items' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-xs text-slate-500 font-bold">Tổng cộng: {items.length} mặt hàng trong danh mục</span>
            <button
              onClick={() => {
                if (categories.length === 0) {
                  toast.error('Lỗi', 'Vui lòng tạo ít nhất 1 Nhóm vật tư trước');
                  return;
                }
                setShowAddItemModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Thêm mặt hàng mới
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-600">
                    {item.code}
                  </span>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {item.category?.name}
                  </span>
                </div>
                <h4 className="font-bold text-slate-800 text-base">{item.name}</h4>
                <p className="text-xs text-slate-400 line-clamp-2">{item.description || 'Không có mô tả sản phẩm.'}</p>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block">Đơn vị tính</span>
                    <span className="font-bold text-slate-700">{item.unit}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Giá mua mặc định</span>
                    <span className="font-bold text-slate-700 font-mono">{formatCurrency(item.defaultCostPrice || 0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Giá bán niêm yết</span>
                    <span className="font-bold text-slate-700 font-mono">{formatCurrency(item.defaultSalePrice || 0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: SUPPLIERS */}
      {activeSubTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-xs text-slate-500 font-bold">Tổng cộng: {suppliers.length} nhà cung cấp hợp tác</span>
            <button
              onClick={() => setShowAddSupplierModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Thêm nhà cung cấp
            </button>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Tên nhà cung cấp</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Số điện thoại</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Địa chỉ</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {suppliers.map(sup => (
                  <tr key={sup.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{sup.name}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono">{sup.phone || '-'}</td>
                    <td className="px-6 py-4 text-slate-500">{sup.email || '-'}</td>
                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{sup.address || '-'}</td>
                    <td className="px-6 py-4 text-slate-400 italic">{sup.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: LOCATIONS */}
      {activeSubTab === 'locations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-xs text-slate-500 font-bold">Tổng cộng: {locations.length} kho lưu trữ khả dụng</span>
            <button
              onClick={() => setShowAddLocationModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Thêm vị trí kho
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {locations.map(loc => (
              <div key={loc.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-indigo-600">
                  <MapPin className="w-5 h-5 shrink-0" />
                  <h4 className="font-bold text-slate-800 text-base">{loc.name}</h4>
                </div>
                <p className="text-xs text-slate-400 italic">{loc.description || 'Không có ghi chú vị trí.'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CATEGORIES */}
      {activeSubTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-xs text-slate-500 font-bold">Tổng cộng: {categories.length} nhóm vật tư cấu hình</span>
            <button
              onClick={() => setShowAddCategoryModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Tạo nhóm vật tư
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-base">{cat.name}</h4>
                  {cat.code && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 border text-[9px] font-mono font-bold text-slate-500">
                      {cat.code}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 italic">{cat.description || 'Không có mô tả nhóm.'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD CATEGORY MODAL */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex justify-between items-center flex-shrink-0">
              <h3 className="font-bold text-sm">Tạo nhóm vật tư mới</h3>
              <button onClick={() => setShowAddCategoryModal(false)} className="text-slate-300 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddCategory} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên nhóm vật tư *</label>
                <input type="text" required value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="Ví dụ: Giáo trình, Áo phông" className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã nhóm viết tắt</label>
                <input type="text" value={categoryCode} onChange={e => setCategoryCode(e.target.value)} placeholder="Ví dụ: GT, AP" className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mô tả chi tiết</label>
                <textarea rows={3} value={categoryDesc} onChange={e => setCategoryDesc(e.target.value)} placeholder="Mô tả nhóm hàng..." className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddCategoryModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-700">Tạo mới</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD LOCATION MODAL */}
      {showAddLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex justify-between items-center flex-shrink-0">
              <h3 className="font-bold text-sm">Thêm kho / vị trí mới</h3>
              <button onClick={() => setShowAddLocationModal(false)} className="text-slate-300 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddLocation} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên kho hàng *</label>
                <input type="text" required value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="Ví dụ: Kho tầng 1, Tủ sách A" className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mô tả kho hàng</label>
                <textarea rows={3} value={locationDesc} onChange={e => setLocationDesc(e.target.value)} placeholder="Ghi chú vị trí hoặc sức chứa..." className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddLocationModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-700">Tạo mới</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SUPPLIER MODAL */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex justify-between items-center flex-shrink-0">
              <h3 className="font-bold text-sm">Thêm nhà cung cấp mới</h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="text-slate-300 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên đối tác nhà cung cấp *</label>
                <input type="text" required value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Ví dụ: NXB Giáo Dục, Công ty May Đồng Phục" className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Điện thoại liên hệ</label>
                  <input type="text" value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)} placeholder="0987..." className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                  <input type="email" value={supplierEmail} onChange={e => setSupplierEmail(e.target.value)} placeholder="supplier@gmail.com" className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Địa chỉ văn phòng</label>
                <input type="text" value={supplierAddress} onChange={e => setSupplierAddress(e.target.value)} placeholder="Số nhà, Quận, TP..." className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ghi chú đối tác</label>
                <textarea rows={2} value={supplierNote} onChange={e => setSupplierNote(e.target.value)} placeholder="Thông tin liên hệ phụ hoặc sản phẩm cung cấp chính..." className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddSupplierModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-700">Lưu nhà cung cấp</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD ITEM MODAL */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex justify-between items-center flex-shrink-0">
              <h3 className="font-bold text-sm">Thêm sản phẩm / mặt hàng mới</h3>
              <button onClick={() => setShowAddItemModal(false)} className="text-slate-300 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddItem} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nhóm vật tư *</label>
                  <select required value={itemCategoryId} onChange={e => setItemCategoryId(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm">
                    <option value="">-- Chọn nhóm --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã sản phẩm (SKU/Code) *</label>
                  <input type="text" required value={itemCode} onChange={e => setItemCode(e.target.value)} placeholder="Ví dụ: SACH-D1-KIM" className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên sản phẩm *</label>
                <input type="text" required value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Ví dụ: Giáo trình Let's Go 1" className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Đơn vị tính *</label>
                  <input type="text" required value={itemUnit} onChange={e => setItemUnit(e.target.value)} placeholder="Ví dụ: cuốn, cái, bộ" className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loại mặt hàng *</label>
                  <select value={itemType} onChange={e => setItemType(e.target.value as any)} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm">
                    <option value="sellable">Bán cho học viên</option>
                    <option value="consumable">Tiêu hao nội bộ</option>
                    <option value="equipment">Thiết bị/Công cụ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tồn kho tối thiểu *</label>
                  <input type="number" required min={0} value={itemMinStock} onChange={e => setItemMinStock(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Giá nhập dự kiến (VND)</label>
                  <input type="number" min={0} step={1000} value={itemCostPrice} onChange={e => setItemCostPrice(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Giá bán mặc định (VND)</label>
                  <input type="number" min={0} step={1000} value={itemSalePrice} onChange={e => setItemSalePrice(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mô tả sản phẩm</label>
                <textarea rows={2} value={itemDesc} onChange={e => setItemDesc(e.target.value)} placeholder="Nhập thêm chi tiết..." className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddItemModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-700">Tạo sản phẩm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COLLECT INVENTORY PAYMENT MODAL */}
      {collectingMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-emerald-900 text-white flex justify-between items-center flex-shrink-0">
              <h3 className="font-bold text-sm">Thu tiền vật tư đã phát</h3>
              <button onClick={() => setCollectingMovement(null)} className="text-emerald-100 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCollectPayment} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase">Giao dịch cần thu</p>
                <p className="font-black text-slate-900">{collectingMovement.item?.name}</p>
                <p className="text-sm text-slate-600">
                  Học viên: <span className="font-bold">{collectingMovement.relatedStudent?.name || '-'}</span>
                </p>
                <p className="text-sm text-slate-600">
                  Số lượng: <span className="font-bold">{collectingMovement.quantity} {collectingMovement.item?.unit}</span>
                </p>
                <p className="text-xl font-black text-emerald-700">{formatCurrency(collectingMovement.totalAmount || 0)}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngày thu tiền *</label>
                  <input type="date" required value={collectPaymentDate} onChange={e => setCollectPaymentDate(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-emerald-500 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hình thức thu *</label>
                  <select value={collectPaymentMethod} onChange={e => setCollectPaymentMethod(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-emerald-500 text-sm">
                    {inventoryPaymentMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ghi chú thu tiền</label>
                <textarea rows={2} value={collectNote} onChange={e => setCollectNote(e.target.value)} placeholder="Ví dụ: Phụ huynh chuyển khoản sau khi nhận sách..." className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-emerald-500 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setCollectingMovement(null)} className="px-4 py-2 border rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-emerald-700 inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  Xác nhận đã thu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MOVEMENT MODAL (NHẬP/XUẤT KHO) */}
      {showAddMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex justify-between items-center flex-shrink-0">
              <h3 className="font-bold text-sm">Giao dịch kho hàng (Nhập / Xuất)</h3>
              <button onClick={() => setShowAddMovementModal(false)} className="text-slate-300 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddMovement} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loại nghiệp vụ kho *</label>
                  <select value={mType} onChange={e => setMType(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-bold">
                    <option value="purchase_in">📥 Nhập kho (Mua hàng mới)</option>
                    <option value="return_in">📥 Nhập lại kho (Khách trả hàng)</option>
                    <option value="opening">📥 Nhập tồn đầu kỳ</option>
                    <option value="issue_to_student">📤 Xuất bán học viên</option>
                    <option value="issue_to_staff">📤 Xuất cấp nhân viên</option>
                    <option value="internal_use">📤 Sử dụng nội bộ trung tâm</option>
                    <option value="adjustment">🔄 Điều chỉnh sau kiểm kho</option>
                    <option value="transfer">🔄 Chuyển giao giữa các kho</option>
                    <option value="damage">❌ Xuất hủy do hỏng hóc</option>
                    <option value="loss">❌ Xuất hủy do thất thoát</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngày thực hiện *</label>
                  <input type="date" required value={mDate} onChange={e => setMDate(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chọn mặt hàng vật tư *</label>
                <select required value={mItemId} onChange={e => setMItemId(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm">
                  <option value="">-- Chọn mặt hàng --</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>{item.code} — {item.name} ({item.unit})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Source location (For exports, transfers, adjustments) */}
                {['issue_to_student', 'issue_to_staff', 'internal_use', 'damage', 'loss', 'transfer', 'adjustment'].includes(mType) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Từ kho nguồn *</label>
                    <select required value={mFromLocationId} onChange={e => setMFromLocationId(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm">
                      <option value="">-- Chọn kho nguồn --</option>
                      {locations.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {/* Destination location (For imports, transfers, adjustments) */}
                {['purchase_in', 'return_in', 'opening', 'transfer', 'adjustment'].includes(mType) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Đến kho đích *</label>
                    <select required value={mToLocationId} onChange={e => setMToLocationId(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm">
                      <option value="">-- Chọn kho đích --</option>
                      {locations.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Nhà cung cấp (chỉ khi mua nhập kho) */}
              {mType === 'purchase_in' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nhà cung cấp</label>
                  <select value={mSupplierId} onChange={e => setMSupplierId(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm">
                    <option value="">-- Không chọn / chưa rõ --</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    {mType === 'issue_to_student' && mSaleMode === 'bulk' ? 'SL mặc định' : 'Số lượng giao dịch *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={mQty}
                    onChange={e => setMQty(Number(e.target.value))}
                    disabled={mType === 'issue_to_student' && mSaleMode === 'bulk'}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Giá vốn nhập (VND)</label>
                  <input type="number" min={0} step={1000} value={mUnitCost} onChange={e => setMUnitCost(Number(e.target.value))} disabled={!['purchase_in', 'opening', 'adjustment'].includes(mType)} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-mono disabled:bg-slate-50 disabled:text-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Giá bán thu tiền (VND)</label>
                  <input type="number" min={0} step={1000} value={mUnitSalePrice} onChange={e => setMUnitSalePrice(Number(e.target.value))} disabled={mType !== 'issue_to_student'} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-mono disabled:bg-slate-50 disabled:text-slate-400" />
                </div>
              </div>

              {/* Related Student (only if issue_to_student) */}
              {mType === 'issue_to_student' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chế độ bán/phát cho học viên *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMSaleMode('single')}
                        className={`px-3 py-2 rounded-xl text-xs font-black border cursor-pointer text-left ${
                          mSaleMode === 'single'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Bán 1 học viên
                      </button>
                      <button
                        type="button"
                        onClick={() => setMSaleMode('bulk')}
                        className={`px-3 py-2 rounded-xl text-xs font-black border cursor-pointer text-left ${
                          mSaleMode === 'bulk'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Bán hàng loạt theo lớp
                      </button>
                    </div>
                  </div>

                  {mSaleMode === 'single' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Học viên mua hàng *</label>
                      <select required value={mStudentId} onChange={e => setMStudentId(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm">
                        <option value="">-- Chọn học viên --</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.parentPhone})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lọc học viên theo lớp *</label>
                        <select value={mClassId} onChange={e => setMClassId(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm bg-white">
                          <option value="">-- Chọn lớp --</option>
                          {classes.filter(c => c.status !== 'inactive').map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.studentCount || 0} học viên)</option>
                          ))}
                        </select>
                      </div>

                      {mClassId && (
                        <>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={toggleAllBulkStudents}
                              className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-xl text-xs font-black cursor-pointer"
                            >
                              {allBulkStudentsSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả học viên'}
                            </button>
                            <p className={`text-xs font-bold ${bulkStockShort ? 'text-rose-600' : 'text-slate-500'}`}>
                              Đã chọn {mSelectedStudentIds.length}/{bulkClassStudents.length} học viên · Cần xuất {bulkTotalQuantity} · Tồn {selectedStockQty}
                            </p>
                          </div>

                          <div className="max-h-56 overflow-auto rounded-2xl border border-slate-200 bg-white">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 font-black text-slate-400 uppercase">Chọn</th>
                                  <th className="px-3 py-2 font-black text-slate-400 uppercase">Học viên</th>
                                  <th className="px-3 py-2 font-black text-slate-400 uppercase">Phụ huynh</th>
                                  <th className="px-3 py-2 font-black text-slate-400 uppercase w-24">SL</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {bulkClassStudents.length === 0 ? (
                                  <tr>
                                    <td colSpan={4} className="px-3 py-6 text-center text-slate-400 font-bold">
                                      Lớp này chưa có học viên đang học.
                                    </td>
                                  </tr>
                                ) : (
                                  bulkClassStudents.map(student => {
                                    const checked = mSelectedStudentIds.includes(student.id);
                                    return (
                                      <tr key={student.id} className={checked ? 'bg-indigo-50/60' : ''}>
                                        <td className="px-3 py-2">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleBulkStudent(student.id)}
                                            className="w-4 h-4 accent-indigo-600"
                                          />
                                        </td>
                                        <td className="px-3 py-2 font-bold text-slate-700">
                                          {student.name}
                                          <div className="text-[10px] text-slate-400 font-mono">{student.code || student.id.slice(0, 8)}</div>
                                        </td>
                                        <td className="px-3 py-2 text-slate-500">{student.parentPhone || '-'}</td>
                                        <td className="px-3 py-2">
                                          <input
                                            type="number"
                                            min={1}
                                            value={mStudentQuantities[student.id] || 1}
                                            onChange={e => updateBulkStudentQuantity(student.id, Number(e.target.value))}
                                            disabled={!checked}
                                            className="w-20 px-2 py-1 border rounded-lg text-xs font-mono disabled:bg-slate-50 disabled:text-slate-400"
                                          />
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>

                          <div className={`rounded-2xl p-3 border ${bulkStockShort ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-indigo-100 text-slate-700'}`}>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold">
                              <span>Học viên: {mSelectedStudentIds.length}</span>
                              <span>Tổng SL: {bulkTotalQuantity}</span>
                              <span>Tổng tiền: {formatCurrency(bulkTotalAmount)}</span>
                            </div>
                            {bulkStockShort && (
                              <p className="text-xs font-bold mt-2">Tồn kho không đủ cho số lượng đã chọn. Giảm số lượng hoặc nhập thêm hàng trước khi xác nhận.</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-indigo-500 mt-1 font-bold">
                    Doanh thu vật tư chỉ ghi nhận khi trạng thái là "Đã thu tiền".
                  </p>
                  <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-3 space-y-3">
                    <label className="block text-xs font-black text-amber-700 uppercase">Trạng thái thu tiền / phát hàng</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => { setMPaymentStatus('unpaid'); setMIssued(true); }}
                        className={`px-3 py-2 rounded-xl text-xs font-black border cursor-pointer text-left ${
                          mPaymentStatus === 'unpaid'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-amber-700 border-amber-200'
                        }`}
                      >
                        Đã phát - chưa thu tiền
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMPaymentStatus('paid');
                          setMIssued(true);
                          setMPaymentDate(mDate);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-black border cursor-pointer text-left ${
                          mPaymentStatus === 'paid' && mIssued
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-emerald-700 border-emerald-200'
                        }`}
                      >
                        Thu tiền ngay
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMPaymentStatus('paid');
                          setMIssued(false);
                          setMPaymentDate(mDate);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-black border cursor-pointer text-left ${
                          mPaymentStatus === 'paid' && !mIssued
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-white text-sky-700 border-sky-200'
                        }`}
                      >
                        Đã thu - chưa phát (nợ hàng)
                      </button>
                    </div>
                    {mPaymentStatus === 'paid' && !mIssued && (
                      <p className="text-[10px] text-sky-600 font-bold">
                        ⓘ Ghi nhận doanh thu ngay, CHƯA trừ kho. Vào Nhật ký bấm "Phát hàng" khi giao (lúc đó mới trừ kho).
                      </p>
                    )}
                    {mPaymentStatus === 'paid' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ngày thu tiền</label>
                          <input type="date" required value={mPaymentDate} onChange={e => setMPaymentDate(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-emerald-500 text-sm font-mono bg-white" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hình thức thu</label>
                          <select value={mPaymentMethod} onChange={e => setMPaymentMethod(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-emerald-500 text-sm bg-white">
                            {inventoryPaymentMethods.map(method => (
                              <option key={method} value={method}>{method}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Related Staff (only if issue_to_staff) */}
              {mType === 'issue_to_staff' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nhân sự nhận hàng *</label>
                  <select required value={mStaffId} onChange={e => setMStaffId(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm">
                    <option value="">-- Chọn nhân sự --</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ghi chú giao dịch</label>
                <textarea rows={2} value={mNote} onChange={e => setMNote(e.target.value)} placeholder="Nhập lý do xuất nhập kho, mã hóa đơn nếu có..." className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm" />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddMovementModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50">Hủy</button>
                <button
                  type="submit"
                  disabled={mType === 'issue_to_student' && mSaleMode === 'bulk' && (bulkStockShort || mSelectedStudentIds.length === 0)}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  Xác nhận nghiệp vụ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
