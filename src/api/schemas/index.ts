import { z } from 'zod';

// Ngày dạng YYYY-MM-DD (cho phép chuỗi rỗng bị chặn bởi min(1) ở nơi bắt buộc).
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'phải có dạng YYYY-MM-DD');
const positiveAmount = z.coerce.number().refine((n) => Number.isFinite(n) && n > 0, 'phải là số tiền dương');
const nonNegativeAmount = z.coerce.number().refine((n) => Number.isFinite(n) && n >= 0, 'phải là số không âm');

// POST /transactions — thu học phí / doanh thu khác.
export const createTransactionSchema = z
  .object({
    amount: positiveAmount,
    paymentDate: dateString,
    paymentMethod: z.string().min(1, 'bắt buộc'),
    revenueCategory: z.string().optional(),
    studentId: z.string().optional(),
    enrollmentId: z.string().optional(),
    className: z.string().optional(),
    term: z.string().optional(),
    notes: z.string().optional(),
    source: z.string().optional(),
    id: z.string().optional(),
  })
  .passthrough();

// POST /expenses — chi phí vận hành.
export const createExpenseSchema = z
  .object({
    amount: positiveAmount,
    date: dateString,
    description: z.string().min(1, 'bắt buộc'),
    paymentMethod: z.string().min(1, 'bắt buộc'),
    category: z.string().optional(),
    isRecurring: z.boolean().optional(),
    recurringNote: z.string().optional(),
    approvedBy: z.string().optional(),
    notes: z.string().optional(),
  })
  .passthrough();

// POST /enrollments — đăng ký lớp (cho phép feePerSession = 0).
export const createEnrollmentSchema = z
  .object({
    studentId: z.string().min(1, 'bắt buộc'),
    classId: z.string().min(1, 'bắt buộc'),
    feePerSession: nonNegativeAmount,
    startDate: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .passthrough();

// POST /users — tạo tài khoản (admin).
export const createUserSchema = z
  .object({
    username: z.string().min(1, 'bắt buộc'),
    password: z.string().min(1, 'bắt buộc'),
    name: z.string().min(1, 'bắt buộc'),
    role: z.string().min(1, 'bắt buộc'),
  })
  .passthrough();

// POST /classes — tạo lớp học.
export const createClassSchema = z
  .object({
    name: z.string().min(1, 'bắt buộc'),
    teacherId: z.string().min(1, 'bắt buộc'),
  })
  .passthrough();

// POST /staff — tạo nhân sự.
export const createStaffSchema = z
  .object({
    name: z.string().min(1, 'bắt buộc'),
    role: z.string().min(1, 'bắt buộc'),
  })
  .passthrough();

// POST /teaching-logs — chấm công giảng dạy thủ công.
export const createTeachingLogSchema = z
  .object({
    staffId: z.string().min(1, 'bắt buộc'),
    classId: z.string().min(1, 'bắt buộc'),
    date: dateString,
  })
  .passthrough();

// POST /salary-advances — tạm ứng lương.
export const createSalaryAdvanceSchema = z
  .object({
    staffId: z.string().min(1, 'bắt buộc'),
    amount: positiveAmount,
    date: dateString,
  })
  .passthrough();

// POST /admission-leads — tạo lead tuyển sinh.
export const createAdmissionLeadSchema = z
  .object({
    studentName: z.string().min(1, 'bắt buộc'),
    parentPhone: z.string().min(1, 'bắt buộc'),
  })
  .passthrough();

// POST /inventory/movements — nhập/xuất kho.
export const createInventoryMovementSchema = z
  .object({
    movementType: z.string().min(1, 'bắt buộc'),
    itemId: z.string().min(1, 'bắt buộc'),
    quantity: z.coerce.number().refine((n) => Number.isFinite(n) && n !== 0, 'phải khác 0'),
    movementDate: dateString,
  })
  .passthrough();

// POST /daily-close — chốt ca cuối ngày.
export const dailyCloseSchema = z
  .object({
    date: dateString,
    summary: z.union([z.string(), z.record(z.string(), z.any())]),
  })
  .passthrough();
