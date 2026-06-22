import React, { useState, useMemo, useEffect } from 'react';
import { REPORT_GROUPS, ReportDefinition } from '../../shared/business/reports';
import { formatCurrency, formatDate, api, auth } from '../../shared/utils';
import * as XLSX from 'xlsx-js-style';
import {
  Search, Calendar, Users, BookOpen, Wallet,
  AlertTriangle, Briefcase, GraduationCap, ShieldAlert,
  CalendarCheck, Clock, FileSpreadsheet, ChevronRight,
  TrendingUp, FileText, LayoutDashboard, Download
} from 'lucide-react';
import DateInput from '../components/ui/DateInput';
import SearchableSelect from '../components/ui/SearchableSelect';

interface Props {
  transactions: any[];
  students: any[];
  classes: any[];
  expenses: any[];
  staff: any[];
  attendance: any[];
  advances: any[];
  salaries: any[];
  dailyCloses: any[];
  auditLogs: any[];
  teachingLogs?: any[];
  systemParameters?: any[];
  admissionLeads?: any[];
  enrollments?: any[];
  selectedGroupId?: string;
  onGroupIdChange?: (id: string) => void;
}

export default function ReportsDashboard({
  transactions = [],
  students = [],
  classes = [],
  expenses = [],
  staff = [],
  attendance = [],
  advances = [],
  salaries = [],
  dailyCloses = [],
  auditLogs = [],
  teachingLogs = [],
  systemParameters = [],
  admissionLeads = [],
  enrollments = [],
  selectedGroupId: propGroupId,
  onGroupIdChange
}: Props) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const todayStr = now.toISOString().slice(0, 10);

  // CMIS Navigation State
  const [localGroupId, setLocalGroupId] = useState<string>('grp_overview');
  const selectedGroupId = propGroupId || localGroupId;
  const setSelectedGroupId = onGroupIdChange || setLocalGroupId;
  const [selectedType, setSelectedType] = useState<'summary' | 'detail' | 'object'>('summary');
  const [selectedReportId, setSelectedReportId] = useState<string>('');

  // Filter conditions state
  const [filters, setFilters] = useState({
    month: currentMonth,
    startDate: currentMonthStart,
    endDate: todayStr,
    classId: '',
    studentId: '',
    teacherId: '',
    paymentMethod: '',
    revenueCategory: '',
    expenseCategory: '',
    staffId: '',
    classStatus: 'all',
    reconciliationStatus: '',
    searchQuery: '',
    itemId: '',
    categoryId: '',
    locationId: ''
  });

  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [reportTime, setReportTime] = useState<string>('');

  // Dữ liệu kho vật tư cho các báo cáo nhóm "grp_inventory" (tự nạp).
  const [invRaw, setInvRaw] = useState<{ items: any[]; categories: any[]; stocks: any[]; movements: any[]; locations: any[] }>({ items: [], categories: [], stocks: [], movements: [], locations: [] });
  const [invLoading, setInvLoading] = useState(true);
  useEffect(() => {
    setInvLoading(true);
    Promise.all([
      api.getInventoryItems(), api.getInventoryCategories(),
      api.getInventoryStocks(), api.getInventoryMovements(), api.getInventoryLocations(),
    ]).then(([items, categories, stocks, movements, locations]) => {
      setInvRaw({ items, categories, stocks, movements, locations });
    }).catch(() => { /* phân hệ kho có thể trống */ }).finally(() => setInvLoading(false));
  }, []);

  // Map dữ liệu kho thô (API) sang shape phẳng cho report engine.
  const inventoryData = useMemo(() => {
    const itemMap = new Map(invRaw.items.map((it: any) => [it.id, it]));
    const catName = (item: any) => item?.category?.name || invRaw.categories.find((c: any) => c.id === item?.categoryId)?.name || 'Khác';
    const inventoryItems = invRaw.items.map((it: any) => ({
      id: it.id, code: it.code, name: it.name, unit: it.unit,
      categoryId: it.categoryId, categoryName: catName(it),
      minStockLevel: it.minStockLevel || 0, defaultSalePrice: it.defaultSalePrice || 0, defaultCostPrice: it.defaultCostPrice || 0,
    }));
    const inventoryStocks = invRaw.stocks.map((s: any) => {
      const it = itemMap.get(s.itemId);
      return {
        itemId: s.itemId, itemCode: it?.code || '', itemName: s.item?.name || it?.name || '', unit: s.item?.unit || it?.unit || '',
        categoryName: catName(it), locationId: s.locationId, locationName: s.location?.name || '',
        quantityOnHand: s.quantityOnHand || 0, averageCost: s.averageCost || 0,
        minStockLevel: it?.minStockLevel || 0, salePrice: it?.defaultSalePrice || 0,
      };
    });
    const inventoryMovements = invRaw.movements.map((m: any) => {
      const it = itemMap.get(m.itemId);
      return {
        id: m.id, movementDate: m.movementDate, movementType: m.movementType,
        itemId: m.itemId, itemCode: it?.code || '', itemName: m.item?.name || it?.name || '', unit: m.item?.unit || it?.unit || '',
        categoryName: catName(it),
        fromLocationName: m.fromLocation?.name || '', toLocationName: m.toLocation?.name || '',
        quantity: m.quantity || 0, unitCost: m.unitCost || 0, unitSalePrice: m.unitSalePrice || 0, totalAmount: m.totalAmount || 0,
        studentId: m.relatedStudentId || undefined, studentName: m.relatedStudent?.name || '', staffName: m.relatedStaff?.name || '',
        paymentStatus: m.paymentStatus, issued: m.issued !== false, paymentDate: m.paymentDate || undefined, paymentMethod: m.paymentMethod || undefined,
        createdBy: m.createdBy || '',
        supplierId: m.supplierId || undefined, supplierName: m.supplier?.name || '',
      };
    });
    const inventoryCategories = invRaw.categories.map((c: any) => ({ id: c.id, name: c.name }));
    return { inventoryItems, inventoryStocks, inventoryMovements, inventoryCategories };
  }, [invRaw]);

  const activeGroup = useMemo(() => {
    return REPORT_GROUPS.find(g => g.id === selectedGroupId) || REPORT_GROUPS[0];
  }, [selectedGroupId]);

  const availableReports = useMemo(() => {
    return activeGroup.reports.filter(r => r.type === selectedType);
  }, [activeGroup, selectedType]);

  // Đếm số báo cáo (đã triển khai) theo từng dạng trong nhóm hiện tại — hiển thị trên tab.
  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { summary: 0, detail: 0, object: 0 };
    activeGroup.reports.forEach(r => { if (r.implemented) c[r.type] = (c[r.type] || 0) + 1; });
    return c;
  }, [activeGroup]);

  // Auto select report when Group or Type changes
  useEffect(() => {
    const implementedReports = availableReports.filter(r => r.implemented);
    if (implementedReports.length > 0) {
      if (!implementedReports.some(r => r.id === selectedReportId)) {
        setSelectedReportId(implementedReports[0].id);
      }
    } else {
      setSelectedReportId('');
    }
  }, [selectedGroupId, selectedType, availableReports, selectedReportId]);

  const activeReport = useMemo(() => {
    return activeGroup.reports.find(r => r.id === selectedReportId);
  }, [activeGroup, selectedReportId]);

  const handleRunReport = () => {
    setAppliedFilters(filters);
    const dateNow = new Date();
    setReportTime(
      dateNow.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
      ' ' +
      formatDate(dateNow.toISOString())
    );
  };

  // Run automatically when report ID is set/changed
  useEffect(() => {
    if (selectedReportId) {
      handleRunReport();
    }
  }, [selectedReportId]);

  // Compute data
  const reportData = useMemo(() => {
    if (!activeReport || !activeReport.implemented) return [];
    try {
      return activeReport.compute({
        students,
        classes,
        transactions,
        attendance,
        expenses,
        staff,
        teachingLogs,
        advances,
        salaries,
        dailyCloses,
        auditLogs,
        filters: appliedFilters,
        systemParameters,
        admissionLeads,
        enrollments,
        ...inventoryData
      });
    } catch (err) {
      console.error('Lỗi khi tính toán dữ liệu báo cáo:', err);
      return [];
    }
  }, [activeReport, students, classes, transactions, attendance, expenses, staff, teachingLogs, advances, salaries, dailyCloses, auditLogs, appliedFilters, systemParameters, admissionLeads, inventoryData]);

  // Totals Row calculation
  const hasTotals = useMemo(() => {
    if (!activeReport || !activeReport.implemented || reportData.length === 0) return false;
    return activeReport.columns.some(col => (col.format === 'currency' || col.format === 'number') && !col.noTotal);
  }, [activeReport, reportData]);

  const totals = useMemo(() => {
    if (!hasTotals || !activeReport) return {};
    const t: Record<string, number> = {};
    activeReport.columns.forEach(col => {
      if ((col.format === 'currency' || col.format === 'number') && !col.noTotal) {
        t[col.key] = reportData.reduce((sum, row) => {
          const val = Number(row[col.key]);
          return sum + (isNaN(val) ? 0 : val);
        }, 0);
      }
    });
    return t;
  }, [hasTotals, activeReport, reportData]);

  // Format Helper
  const formatReportCell = (val: any, format: string) => {
    if (val === undefined || val === null || val === '') return '—';
    if (format === 'currency') {
      return formatCurrency(Number(val));
    }
    if (format === 'number') {
      return Number(val).toLocaleString('vi-VN');
    }
    if (format === 'date') {
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const parts = val.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      try {
        return formatDate(val);
      } catch {
        return val;
      }
    }
    return String(val);
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    if (!activeReport || reportData.length === 0) return;

    const currentUser = auth.getUser();

    // 1. Build Info Sheet
    const infoAoa = [
      ['KIM ACADEMY - PHÂN HỆ BÁO CÁO THỐNG KÊ'],
      [],
      ['Tên báo cáo:', activeReport.name],
      ['Mô tả:', activeReport.description],
      ['Thời gian xuất:', new Date().toLocaleTimeString('vi-VN') + ' ' + formatDate(new Date().toISOString())],
      ['Người xuất:', currentUser?.name || currentUser?.username || 'Kế toán trung tâm'],
      [],
      ['BỘ LỌC ĐÃ ÁP DỤNG:'],
    ];

    if (activeReport.filters.includes('month')) {
      infoAoa.push([' - Tháng báo cáo:', appliedFilters.month]);
    }
    if (activeReport.filters.includes('dateRange')) {
      infoAoa.push([' - Từ ngày:', appliedFilters.startDate]);
      infoAoa.push([' - Đến ngày:', appliedFilters.endDate]);
    }
    if (activeReport.filters.includes('class') && appliedFilters.classId) {
      infoAoa.push([' - Lớp học:', appliedFilters.classId]);
    }
    if (activeReport.filters.includes('student') && appliedFilters.studentId) {
      const s = students.find(x => x.id === appliedFilters.studentId);
      infoAoa.push([' - Học viên:', s ? s.name : appliedFilters.studentId]);
    }
    if (activeReport.filters.includes('teacher') && appliedFilters.teacherId) {
      const t = staff.find(x => x.id === appliedFilters.teacherId);
      infoAoa.push([' - Giáo viên:', t ? t.name : appliedFilters.teacherId]);
    }
    if (activeReport.filters.includes('paymentMethod') && appliedFilters.paymentMethod) {
      infoAoa.push([' - Hình thức thanh toán:', appliedFilters.paymentMethod]);
    }
    if (activeReport.filters.includes('revenueCategory') && appliedFilters.revenueCategory) {
      infoAoa.push([' - Loại khoản thu:', appliedFilters.revenueCategory]);
    }
    if (activeReport.filters.includes('expenseCategory') && appliedFilters.expenseCategory) {
      infoAoa.push([' - Danh mục chi:', appliedFilters.expenseCategory]);
    }
    if (activeReport.filters.includes('staff') && appliedFilters.staffId) {
      const st = staff.find(x => x.id === appliedFilters.staffId);
      infoAoa.push([' - Nhân sự:', st ? st.name : appliedFilters.staffId]);
    }
    if (activeReport.filters.includes('classStatus')) {
      infoAoa.push([' - Trạng thái lớp:', appliedFilters.classStatus]);
    }
    if (activeReport.filters.includes('reconciliationStatus') && appliedFilters.reconciliationStatus) {
      infoAoa.push([' - Trạng thái đối soát:', appliedFilters.reconciliationStatus]);
    }
    if (activeReport.filters.includes('search') && appliedFilters.searchQuery) {
      infoAoa.push([' - Từ khóa tìm kiếm:', appliedFilters.searchQuery]);
    }
    if (activeReport.filters.includes('invCategory') && appliedFilters.categoryId) {
      const c = invRaw.categories.find((x: any) => x.id === appliedFilters.categoryId);
      infoAoa.push([' - Nhóm vật tư:', c ? c.name : appliedFilters.categoryId]);
    }
    if (activeReport.filters.includes('invLocation') && appliedFilters.locationId) {
      const l = invRaw.locations.find((x: any) => x.id === appliedFilters.locationId);
      infoAoa.push([' - Kho lưu trữ:', l ? l.name : appliedFilters.locationId]);
    }
    if (activeReport.filters.includes('invItem') && appliedFilters.itemId) {
      const it = invRaw.items.find((x: any) => x.id === appliedFilters.itemId);
      infoAoa.push([' - Mặt hàng:', it ? `${it.code ? it.code + ' - ' : ''}${it.name}` : appliedFilters.itemId]);
    }

    const wsInfo = XLSX.utils.aoa_to_sheet(infoAoa);

    // Style Info Sheet
    wsInfo['A1'].s = {
      font: { bold: true, size: 16, color: { rgb: '4F46E5' } }
    };
    for (let r = 2; r < infoAoa.length; r++) {
      const ref = `A${r + 1}`;
      if (wsInfo[ref]) {
        wsInfo[ref].s = { font: { bold: true } };
      }
    }
    wsInfo['!cols'] = [{ wch: 25 }, { wch: 60 }];

    // 2. Build Data Sheet
    const headers = activeReport.columns.map(c => c.label);
    const dataRows = reportData.map(row => {
      return activeReport.columns.map(c => {
        const val = row[c.key];
        return val !== undefined && val !== null ? val : '';
      });
    });

    const finalAoa = [headers, ...dataRows];

    // Totals row
    if (hasTotals) {
      const totalRow = activeReport.columns.map((col, idx) => {
        if (idx === 0) return 'TỔNG CỘNG';
        if ((col.format === 'currency' || col.format === 'number') && !col.noTotal) {
          return totals[col.key] || 0;
        }
        return '';
      });
      finalAoa.push(totalRow);
    }

    const wsData = XLSX.utils.aoa_to_sheet(finalAoa);

    // Style Data Sheet
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4F46E5' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    const numRows = finalAoa.length;
    const numCols = activeReport.columns.length;

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = wsData[cellRef];
        if (!cell) continue;

        const colDef = activeReport.columns[c];
        const align = colDef.align || 'left';
        
        cell.s = {
          alignment: { horizontal: align, vertical: 'center' }
        };

        if (r === 0) {
          cell.s = headerStyle;
        } else {
          const isTotalRow = hasTotals && (r === numRows - 1);
          if (isTotalRow) {
            cell.s.font = { bold: true };
            cell.s.fill = { fgColor: { rgb: 'F3F4F6' } };
          }

          if (colDef.format === 'currency') {
            cell.t = 'n';
            cell.z = '#,##0';
          } else if (colDef.format === 'number') {
            cell.t = 'n';
            cell.z = '#,##0';
          } else if (colDef.format === 'date') {
            cell.s.alignment.horizontal = 'center';
            if (typeof cell.v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cell.v)) {
              const parts = cell.v.split('-');
              cell.v = `${parts[2]}/${parts[1]}/${parts[0]}`;
              cell.t = 's';
            }
          }
        }
      }
    }

    // Auto widths
    wsData['!cols'] = activeReport.columns.map((col, cIdx) => {
      let maxLen = col.label.length;
      for (let rIdx = 0; rIdx < numRows; rIdx++) {
        const val = finalAoa[rIdx][cIdx];
        if (val !== undefined && val !== null) {
          let valStr = String(val);
          if (col.format === 'currency') {
            valStr = Number(val).toLocaleString('vi-VN') + ' ₫';
          }
          maxLen = Math.max(maxLen, valStr.length);
        }
      }
      return { wch: Math.min(maxLen + 4, 45) };
    });

    // Write Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsInfo, 'ThongTin');
    XLSX.utils.book_append_sheet(wb, wsData, 'DuLieu');

    // Filename logic
    const sanitizeFilename = (name: string) => {
      return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .trim();
    };

    const filterSuffix = activeReport.filters.includes('month') && appliedFilters.month
      ? `_${appliedFilters.month.replace('-', '_')}`
      : activeReport.filters.includes('dateRange') && appliedFilters.startDate && appliedFilters.endDate
        ? `_${appliedFilters.startDate.replace(/-/g, '_')}_to_${appliedFilters.endDate.replace(/-/g, '_')}`
        : '';

    const filename = `bao_cao_${sanitizeFilename(activeReport.name)}${filterSuffix}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="flex flex-col gap-5 font-sans w-full">
      
      {/* TOP TAB BAR: Dạng Báo cáo (CMIS layout) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm flex items-center justify-between shrink-0">
        <div className="flex gap-1">
          <button
            onClick={() => setSelectedType('summary')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
              selectedType === 'summary'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            📊 Báo cáo Tổng hợp ({typeCounts.summary})
          </button>
          <button
            onClick={() => setSelectedType('detail')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
              selectedType === 'detail'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            📋 Báo cáo Chi tiết ({typeCounts.detail})
          </button>
          <button
            onClick={() => setSelectedType('object')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
              selectedType === 'object'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            👤 Báo cáo theo Đối tượng ({typeCounts.object})
          </button>
        </div>
        <div className="hidden lg:flex items-center gap-2 pr-3">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] text-slate-500 font-medium">Báo cáo cập nhật theo ca học</span>
        </div>
      </div>


          
          {/* CONTAINER LỌC VÀ CHỌN BÁO CÁO (grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* PANEL GIỮA: Danh sách báo cáo thuộc Nhóm + Dạng chọn */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-slate-800 text-sm font-extrabold">Chọn báo cáo</h3>
              <p className="text-xs text-slate-400 mt-0.5">Nhấp chọn loại báo cáo bên dưới để hiển thị bộ lọc</p>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto space-y-2.5 pr-1">
              {availableReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                  <FileText className="w-10 h-10 stroke-1 opacity-60 mb-2" />
                  <p className="text-xs font-medium">Không có báo cáo nào ở phân nhóm này</p>
                  <p className="text-[10px] text-center mt-1 px-4 leading-relaxed">Vui lòng chọn dạng báo cáo khác hoặc nhóm báo cáo khác bên trái</p>
                </div>
              ) : (
                availableReports.map((r, index) => {
                  const isSelected = selectedReportId === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => r.implemented && setSelectedReportId(r.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 relative group ${
                        !r.implemented
                          ? 'bg-slate-50 border-slate-200/60 opacity-60 cursor-not-allowed'
                          : isSelected
                            ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500 cursor-pointer'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        checked={isSelected}
                        disabled={!r.implemented}
                        onChange={() => r.implemented && setSelectedReportId(r.id)}
                        className="mt-1 accent-indigo-600 cursor-pointer h-4 w-4 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-xs font-extrabold ${!r.implemented ? 'text-slate-400' : isSelected ? 'text-indigo-900' : 'text-slate-800 group-hover:text-indigo-900'}`}>
                            {index + 1}. {r.name}
                          </p>
                          {!r.implemented && (
                            <span 
                              className="bg-slate-100 text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] font-bold"
                              title="Không dùng trong giai đoạn chạy thử"
                            >
                              Sẽ triển khai sau
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{r.description}</p>
                      </div>
                      {r.implemented && (
                        <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* PANEL PHẢI: Bộ lọc báo cáo */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-slate-800 text-sm font-extrabold">Điều kiện lọc</h3>
              <p className="text-xs text-slate-400 mt-0.5">Thiết lập các điều kiện bên dưới trước khi trích xuất dữ liệu</p>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto space-y-4 pr-1">
              {!activeReport ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                  <AlertTriangle className="w-10 h-10 stroke-1 opacity-60 mb-2" />
                  <p className="text-xs font-medium">Chưa chọn báo cáo cụ thể</p>
                </div>
              ) : !activeReport.implemented ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                  <AlertTriangle className="w-10 h-10 stroke-1 opacity-60 mb-2 text-amber-500" />
                  <p className="text-xs font-bold text-slate-600">Báo cáo chưa triển khai</p>
                  <p className="text-[10px] text-center mt-1 px-4 leading-relaxed">
                    Báo cáo này nằm ngoài phạm vi MVP (RPT-01-MVP) và sẽ được mở khóa ở các phase tiếp theo.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Dynamic filters display */}
                  {activeReport.filters.includes('month') && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tháng báo cáo</label>
                      <input
                        type="month"
                        value={filters.month}
                        onChange={e => setFilters(prev => ({ ...prev, month: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  )}

                  {activeReport.filters.includes('dateRange') && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Từ ngày</label>
                        <DateInput
                          value={filters.startDate}
                          onChange={v => setFilters(prev => ({ ...prev, startDate: v }))}
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 flex items-center justify-between"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Đến ngày</label>
                        <DateInput
                          value={filters.endDate}
                          onChange={v => setFilters(prev => ({ ...prev, endDate: v }))}
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 flex items-center justify-between"
                        />
                      </div>
                    </div>
                  )}

                  {activeReport.filters.includes('class') && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Lớp học</label>
                      <select
                        value={filters.classId}
                        onChange={e => setFilters(prev => ({ ...prev, classId: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">-- Tất cả lớp --</option>
                        {classes.filter(c => c.type !== 'online').map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeReport.filters.includes('student') && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Học viên</label>
                      <SearchableSelect
                        value={filters.studentId}
                        onChange={v => setFilters(prev => ({ ...prev, studentId: v }))}
                        placeholder="Gõ tên / SĐT để tìm học viên..."
                        emptyOptionLabel="-- Tất cả học viên --"
                        options={students.map(s => ({
                          value: s.id,
                          label: `${s.name} (${s.englishName || '—'})`,
                          keywords: `${s.parentPhone || ''} ${s.code || ''} ${s.className || ''}`,
                        }))}
                      />
                    </div>
                  )}

                  {activeReport.filters.includes('teacher') && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Giáo viên</label>
                      <select
                        value={filters.teacherId}
                        onChange={e => setFilters(prev => ({ ...prev, teacherId: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">-- Tất cả giáo viên --</option>
                        {staff.filter(st => st.role === 'teacher').map(st => (
                          <option key={st.id} value={st.id}>{st.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeReport.filters.includes('paymentMethod') && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hình thức thanh toán</label>
                      <select
                        value={filters.paymentMethod}
                        onChange={e => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">-- Tất cả hình thức --</option>
                        <option value="Tiền mặt">Tiền mặt</option>
                        <option value="Chuyển khoản">Chuyển khoản</option>
                      </select>
                    </div>
                  )}

                  {activeReport.filters.includes('revenueCategory') && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Loại khoản thu</label>
                      <select
                        value={filters.revenueCategory}
                        onChange={e => setFilters(prev => ({ ...prev, revenueCategory: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">-- Tất cả khoản thu --</option>
                        <option value="Học phí offline">Học phí offline</option>
                        <option value="Lệ phí thi">Lệ phí thi</option>
                        <option value="Thu khác">Thu khác</option>
                        <option value="Bán hàng kho">Bán hàng kho (từ phân hệ Kho)</option>
                      </select>
                    </div>
                  )}

                  {activeReport.filters.includes('expenseCategory') && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Danh mục chi</label>
                      <select
                        value={filters.expenseCategory}
                        onChange={e => setFilters(prev => ({ ...prev, expenseCategory: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">-- Tất cả danh mục --</option>
                        <option value="Mặt bằng">Mặt bằng</option>
                        <option value="Điện nước">Điện nước</option>
                        <option value="Văn phòng phẩm">Văn phòng phẩm</option>
                        <option value="Lương">Lương</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Chi khác">Chi khác</option>
                      </select>
                    </div>
                  )}

                  {activeReport.filters.includes('staff') && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nhân sự / Giáo viên</label>
                      <select
                        value={filters.staffId}
                        onChange={e => setFilters(prev => ({ ...prev, staffId: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">-- Tất cả nhân sự --</option>
                        {staff.map(st => (
                          <option key={st.id} value={st.id}>{st.name} ({st.role === 'teacher' ? 'GV' : st.role === 'teaching_assistant' ? 'TG' : 'VP'})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeReport.filters.includes('classStatus') && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Trạng thái lớp</label>
                      <select
                        value={filters.classStatus}
                        onChange={e => setFilters(prev => ({ ...prev, classStatus: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Đang dạy</option>
                        <option value="suspended">Tạm dừng</option>
                        <option value="ended">Đã kết thúc</option>
                      </select>
                    </div>
                  )}

                  {activeReport.filters.includes('reconciliationStatus') && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Trạng thái đối soát</label>
                      <select
                        value={filters.reconciliationStatus}
                        onChange={e => setFilters(prev => ({ ...prev, reconciliationStatus: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">-- Tất cả trạng thái --</option>
                        <option value="Đã đối soát">Đã đối soát</option>
                        <option value="Chưa đối soát">Chưa đối soát</option>
                      </select>
                    </div>
                  )}

                  {activeReport.filters.includes('search') && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Từ khóa tìm kiếm</label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Tìm theo tên/mã/mô tả..."
                          value={filters.searchQuery}
                          onChange={e => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                          className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  {activeReport.filters.includes('invCategory') && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nhóm vật tư</label>
                      <select
                        value={filters.categoryId}
                        onChange={e => setFilters(prev => ({ ...prev, categoryId: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">-- Tất cả nhóm --</option>
                        {invRaw.categories.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeReport.filters.includes('invLocation') && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kho lưu trữ</label>
                      <select
                        value={filters.locationId}
                        onChange={e => setFilters(prev => ({ ...prev, locationId: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">-- Tất cả kho --</option>
                        {invRaw.locations.map((l: any) => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeReport.filters.includes('invItem') && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mặt hàng</label>
                      <select
                        value={filters.itemId}
                        onChange={e => setFilters(prev => ({ ...prev, itemId: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">-- Chọn mặt hàng --</option>
                        {invRaw.items.map((it: any) => (
                          <option key={it.id} value={it.id}>{it.code ? `${it.code} - ` : ''}{it.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4 border-t border-slate-100 pt-4 shrink-0">
              <button
                onClick={handleRunReport}
                disabled={!activeReport || !activeReport.implemented}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-sm shadow-indigo-900/10"
              >
                <Search className="w-4 h-4" /> Xem báo cáo
              </button>
              
              <button
                onClick={handleExportExcel}
                disabled={!activeReport || !activeReport.implemented || reportData.length === 0}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-sm shadow-emerald-900/10"
              >
                <FileSpreadsheet className="w-4 h-4" /> Xuất Excel
              </button>
            </div>
          </div>
        </div>

        {/* PANEL DƯỚI: Kết quả báo cáo */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col min-h-[350px]">
          <div className="border-b border-slate-100 pb-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse" />
                <h3 className="text-slate-800 text-sm font-extrabold">
                  {activeReport ? `Kết quả: ${activeReport.name}` : 'Kết quả truy xuất'}
                </h3>
              </div>
              {activeReport && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Đang hiển thị {reportData.length} kết quả {reportTime && `· Tạo lúc: ${reportTime}`}
                </p>
              )}
            </div>
            
            {activeReport && activeReport.implemented && reportData.length > 0 && (
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Xuất bảng số liệu (.xlsx)
              </button>
            )}
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin max-h-[400px]">
            {!activeReport ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <FileText className="w-12 h-12 stroke-1 opacity-50 mb-3" />
                <p className="text-xs font-medium">Chưa chọn báo cáo để hiển thị bảng số liệu</p>
              </div>
            ) : !activeReport.implemented ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <ShieldAlert className="w-12 h-12 stroke-1 opacity-50 mb-3 text-slate-400" />
                <p className="text-xs font-extrabold text-slate-500">Báo cáo không dùng trong giai đoạn chạy thử</p>
                <p className="text-[10px] text-slate-400 mt-1">Sẽ triển khai sau.</p>
              </div>
            ) : selectedGroupId === 'grp_inventory' && invLoading && reportData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Clock className="w-12 h-12 stroke-1 opacity-50 mb-3 animate-pulse text-indigo-300" />
                <p className="text-xs font-extrabold text-slate-500">Đang tải dữ liệu kho...</p>
              </div>
            ) : reportData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <CalendarCheck className="w-12 h-12 stroke-1 opacity-50 mb-3 text-slate-300" />
                <p className="text-xs font-extrabold text-slate-500">Không có dữ liệu theo điều kiện lọc.</p>
                <p className="text-[10px] text-slate-400 mt-1 text-center max-w-xs">
                  Thử thay đổi khoảng ngày, tháng báo cáo, bộ lọc lớp học hoặc từ khóa tìm kiếm để truy xuất lại.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="px-4 py-3.5 text-center font-bold uppercase tracking-wider text-[10px] w-12">STT</th>
                    {activeReport.columns.map(col => (
                      <th
                        key={col.key}
                        className={`px-4 py-3.5 font-bold uppercase tracking-wider text-[10px] ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors font-medium text-slate-700">
                      <td className="px-4 py-3 text-center text-slate-400">{rIdx + 1}</td>
                      {activeReport.columns.map(col => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 ${
                            col.align === 'right' ? 'text-right font-semibold text-slate-800' : col.align === 'center' ? 'text-center' : 'text-left'
                          }`}
                        >
                          {formatReportCell(row[col.key], col.format || 'text')}
                        </td>
                      ))}
                    </tr>
                  ))}
                  
                  {/* Totals row */}
                  {hasTotals && (
                    <tr className="bg-slate-100/90 border-t border-slate-300 font-extrabold text-slate-900">
                      <td className="px-4 py-3.5 text-center">#</td>
                      {activeReport.columns.map((col, idx) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3.5 uppercase tracking-wide text-[10px] ${
                            col.align === 'right' ? 'text-right font-black text-indigo-900' : col.align === 'center' ? 'text-center' : 'text-left'
                          }`}
                        >
                          {idx === 0 ? (
                            'TỔNG CỘNG'
                          ) : (col.format === 'currency' || col.format === 'number') && !col.noTotal ? (
                            formatReportCell(totals[col.key], col.format)
                          ) : (
                            ''
                          )}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Financial calculations note */}
          {activeReport && (
            <FinancialFormulaNote reportId={activeReport.id} />
          )}
        </div>
      </div>
    );
  }

// Financial Formula Helper component
const FinancialFormulaNote = ({ reportId }: { reportId: string }) => {
  const isFinancial = ['finance', 'pnl', 'tuition', 'earned', 'profit', 'revenue', 'collected', 'debt'].some(k =>
    reportId.toLowerCase().includes(k)
  );
  if (!isFinancial) return null;

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mt-5 shrink-0">
      <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
        <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0" /> Nguyên tắc tài chính & Công thức áp dụng (Đã nghiệm thu)
      </h4>
      <ul className="text-[10px] md:text-xs text-indigo-900/80 space-y-1 list-disc pl-4 leading-relaxed font-medium">
        <li>
          <strong>Học phí đã thu (Offline):</strong> Ghi nhận dòng tiền thực tế thu từ học viên qua các giao dịch offline. Không bao gồm hình thức online.
        </li>
        <li>
          <strong>Doanh thu thực học phí:</strong> Chỉ tính khi học viên đi học (<i>present</i>) hoặc vắng không phép (<i>absent</i>) nhân đơn giá học phí tại ngày điểm danh. Vắng có phép (<i>excused</i>) không tính.
        </li>
        <li>
          <strong>Học phí chưa thực hiện:</strong> Bằng <i>Tổng học phí offline đã thu lũy kế</i> trừ <i>Tổng doanh thu thực học phí lũy kế</i>.
        </li>
        <li>
          <strong>Doanh thu thực khác:</strong> Các khoản thu như giáo trình, đồng phục, lệ phí thi... được ghi nhận doanh thu 100% ngay khi thu tiền.
        </li>
        <li>
          <strong>Lợi nhuận thực tế (Earned Profit):</strong> Tổng doanh thu thực tế (Học phí đã học + Khoản thu khác) trừ Chi phí vận hành và Chi phí lương phát sinh / payrollCost.
        </li>
        <li>
          <strong>Lợi nhuận dòng tiền (Cash Profit):</strong> Tổng tiền thực thu trừ Chi phí vận hành và Chi phí lương phát sinh / payrollCost.
        </li>
      </ul>
    </div>
  );
};
