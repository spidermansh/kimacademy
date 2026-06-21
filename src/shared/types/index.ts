export type PaymentMethod = string;
export type StudyType = "Trực tiếp" | "Online";
export type RevenueCategory = string;
export type ExpenseCategory = string;
export type ClassType = "offline" | "online";
export type AttendanceStatus = "present" | "absent" | "excused";

export interface AppSettings {
  centerName: string;
  logoUrl: string;
  phone: string;
  address: string;
  feeTypes: string[];
  paymentMethods: string[];
  expenseCategories: string[];
}

export interface TransactionEditLog {
  editedBy: string;
  editedAt: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface Transaction {
  id: string;
  createdAt: string;
  paymentDate: string;
  studentName: string;
  studentId?: string;
  className: string;
  studyType?: StudyType;
  term: string;
  amount: number;
  paymentMethod: PaymentMethod;
  revenueCategory: RevenueCategory;
  senderName: string;
  notes: string;
  isReconciled: boolean;
  isInvoiced: boolean;
  editHistory?: TransactionEditLog[];
  source?: string;
  importBatchId?: string;
}

export interface FeeChangeLog {
  changedBy: string;
  changedAt: string;
  oldFee: number;
  newFee: number;
  mode: 'retroactive' | 'prospective';
}

export interface Student {
  id: string;
  name: string;
  vietnameseName: string;
  englishName: string;
  vietAnhName: string;
  className: string;
  classNames?: string[];
  activeEnrollments?: Enrollment[];
  gender: string;
  birthYear: number;
  birthDate?: string; // YYYY-MM-DD
  parentPhone: string;
  feePerSession: number;
  feeHistory?: FeeChangeLog[];
  status?: 'active' | 'waiting_class' | 'suspended' | 'left' | 'trial';
  enrollDate?: string;
  parentEmail?: string;
  address?: string;
  notes?: string;
  admissionLeadId?: string;
  admissionStatus?: 'none' | 'waiting_class' | 'assigned_class';
  parentZalo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Class {
  id: string;
  name: string;
  type: ClassType;
  schedule: string;
  teacher: string;
  teacherId?: string;
  description: string;
  room?: string;
  maxStudents?: number;
  status?: 'active' | 'suspended' | 'ended';
  defaultFee?: number;
  scheduleDays?: string[];
  scheduleTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  sessionsDeducted: number;
  feeApplied?: number;
  note?: string;
  teacherId?: string;
  teacherName?: string;
  isSubstitute?: boolean;
  createdAt: string;
  source?: string;
  importBatchId?: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  feePerSession: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  transferNote?: string;
  feeHistory?: string; // JSON String
  createdAt: string;
}

export interface EnrollmentBreakdown {
  className: string;
  feePerSession: number;
  sessionsUsed: number;
  costUsed: number;
}

export interface TuitionSummary {
  studentId: string;
  studentName: string;
  className: string;
  feePerSession: number;
  totalPaidOffline: number;
  totalCostUsed: number;
  moneyRemaining: number;
  totalSessionsBought: number;
  totalSessionsUsed: number;
  sessionsRemaining: number;
  enrollments?: Enrollment[];
  enrollmentBreakdown?: EnrollmentBreakdown[];
}

export type NotificationType = 'fee_warning' | 'attendance' | 'system' | 'reminder' | 'todo';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
  studentId?: string;
  studentName?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'teacher' | 'office' | 'teaching_assistant';
  phone: string;
  linkedUserId?: string;
  baseSalary: number;
  ratePerSession: number;
  ratePerHour?: number;
  otherMonthlyAllowance?: number;
  otherMonthlyAllowanceNote?: string;
  bankAccount?: string;
  bankName?: string;
  startDate: string;
  status: 'active' | 'inactive';
  notes?: string;
  taxMethod?: string;
  taxMethodValue?: number;
  dependentsCount?: number;
  applySocialInsurance?: boolean;
  applyHealthInsurance?: boolean;
  applyUnemploymentInsurance?: boolean;
  insuranceBaseSalary?: number;
  salaryHistory?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeachingLog {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  className: string;
  classId?: string;
  sessions: number;
  hoursWorked?: number;
  isSubstitute?: boolean;
  originalTeacherId?: string;
  originalTeacherName?: string;
  source?: 'manual' | 'auto';
  note?: string;
  createdAt: string;
}

export interface AssistantWorkLog {
  id: string;
  staffId: string;
  date: string;
  hoursWorked: number;
  hourlyRate: number;
  totalAmount: number;
  note?: string;
  createdAt: string;
  createdBy: string;
}

export interface SalaryAdvance {
  id: string;
  staffId: string;
  staffName: string;
  amount: number;
  date: string;
  reason?: string;
  approvedBy?: string;
  createdAt: string;
}

export type SalaryStatus = 'draft' | 'confirmed' | 'paid';

export interface MonthlySalary {
  id: string;
  staffId: string;
  staffName: string;
  month: string;
  role: 'teacher' | 'office' | 'teaching_assistant';
  totalSessions: number;
  ratePerSession: number;
  teachingIncome: number;
  totalHours?: number;
  ratePerHour?: number;
  hourlyIncome?: number;
  baseSalary: number;
  otherIncome: number;
  otherMonthlyAllowance?: number;
  otherMonthlyAllowanceNote?: string;
  otherSalary?: number;
  otherSalaryNote?: string;
  kpiDeduction: number;
  grossSalary: number;
  taxRate: number;
  taxAmount: number;
  totalAdvance: number;
  advanceApplied?: number;
  advanceCarryOver?: number;
  netSalary: number;
  status: SalaryStatus;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: string;
  isRecurring?: boolean;
  recurringNote?: string;
  approvedBy?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyCloseRecord {
  id: string;
  date: string;
  status: 'completed';
  completedAt: string;
  completedBy: string;
  summary: {
    cashIncome: number;
    cashExpense: number;
    cashBalance: number;
    tuitionEarned: number;
    totalEarnedRevenue: number;
    blockingIssuesCount: number;
    nonBlockingWarningsCount: number;
  };
  note?: string;
}

export interface SystemParameter {
  id: string;
  key: string;
  name: string;
  group: 'payroll' | 'tax' | 'insurance' | 'finance' | 'tuition' | 'attendance' | 'alerts' | 'import' | 'system';
  valueType: 'number' | 'percent' | 'money' | 'boolean' | 'text' | 'select';
  value: string | number | boolean;
  unit?: string;
  description?: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface AdmissionLead {
  id: string;
  leadCode?: string;
  studentName: string;
  dateOfBirth?: string;
  address?: string;
  parentName?: string;
  parentPhone: string;
  parentZalo?: string;
  source?: string;
  learningNeed?: string;
  consultationNote?: string;
  assignedCounselor?: string;
  registrationDate: string;
  status:
    | 'new_registration'
    | 'test_scheduled'
    | 'tested'
    | 'rejected'
    | 'accepted_waiting_class'
    | 'converted_waiting_class'
    | 'converted_assigned_class'
    | 'cancelled';
  testScheduleDate?: string;
  testScheduleTime?: string;
  testAssignee?: string;
  testScheduleNote?: string;
  testDate?: string;
  testType?: string;
  testScore?: number;
  suggestedLevel?: string;
  testNote?: string;
  testResultNote?: string;
  rejectionReason?: string;
  convertedStudentId?: string;
  assignedClassId?: string;
  convertedAt?: string;
  convertedBy?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// ==========================================
// INVENTORY MODULE INTERFACES
// ==========================================

export interface InventoryCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface InventoryItem {
  id: string;
  categoryId: string;
  category?: InventoryCategory;
  code: string;
  name: string;
  unit: string;
  itemType: 'consumable' | 'sellable' | 'equipment';
  defaultSalePrice?: number;
  defaultCostPrice?: number;
  minStockLevel?: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface InventoryVariant {
  id: string;
  itemId: string;
  item?: InventoryItem;
  sku: string;
  name: string;
  attributes: string; // JSON string
  barcode?: string;
  isActive: boolean;
  createdAt: string;
}

export interface InventoryLocation {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface InventoryStock {
  id: string;
  itemId: string;
  variantId?: string;
  locationId: string;
  quantityOnHand: number;
  averageCost?: number;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  movementType:
    | 'opening'
    | 'purchase_in'
    | 'return_in'
    | 'issue_to_student'
    | 'issue_to_staff'
    | 'internal_use'
    | 'adjustment'
    | 'damage'
    | 'loss'
    | 'transfer';
  itemId: string;
  item?: InventoryItem;
  variantId?: string;
  fromLocationId?: string;
  toLocationId?: string;
  quantity: number;
  unitCost?: number;
  unitSalePrice?: number;
  totalAmount?: number;
  relatedStudentId?: string;
  relatedStaffId?: string;
  relatedRevenueOtherId?: string;
  relatedExpenseId?: string;
  note?: string;
  movementDate: string;
  createdAt: string;
  createdBy: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
  isActive: boolean;
  createdAt: string;
}
