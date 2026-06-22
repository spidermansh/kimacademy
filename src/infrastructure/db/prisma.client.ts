import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to start Kim Academy API');
}

const toInt = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: toInt(process.env.DB_POOL_MAX, 10),
  idleTimeoutMillis: toInt(process.env.DB_POOL_IDLE_MS, 30000),
  connectionTimeoutMillis: toInt(process.env.DB_POOL_CONN_TIMEOUT_MS, 10000),
});

// Tránh crash tiến trình khi một client nhàn rỗi gặp lỗi mạng/DB.
pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err.message);
});

const adapter = new PrismaPg(pool);

// Các cột @db.Date (date-only). Prisma trả về Date; hợp đồng API là 'YYYY-MM-DD'.
// Tên các cột này không trùng với bất kỳ cột timestamp nào (createdAt, updatedAt,
// completedAt, convertedAt, paidAt, changedAt, lastUpdatedAt, timestamp...).
const DATE_ONLY_FIELDS = new Set([
  'startDate', 'endDate', 'date', 'paymentDate', 'movementDate', 'birthDate',
  'enrollDate', 'registrationDate', 'testScheduleDate', 'testDate', 'dateOfBirth',
  'effectiveFrom', 'effectiveTo', 'convertedAt',
]);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;

/** ĐẦU RA: đệ quy chuyển mọi cột date-only (Date) trong kết quả thành 'YYYY-MM-DD' (UTC). */
function normalizeDateOutput(value: any): any {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = normalizeDateOutput(value[i]);
    return value;
  }
  if (value instanceof Date) return value;
  for (const key of Object.keys(value)) {
    const v = value[key];
    if (v instanceof Date && DATE_ONLY_FIELDS.has(key)) {
      value[key] = v.toISOString().slice(0, 10);
    } else if (v && typeof v === 'object') {
      normalizeDateOutput(v);
    }
  }
  return value;
}

/**
 * ĐẦU VÀO: đệ quy chuyển các chuỗi 'YYYY-MM-DD' tại cột date-only thành Date
 * (Prisma @db.Date yêu cầu Date/ISO đầy đủ khi ghi/lọc). `inDateCtx` = true khi
 * đang ở dưới một khóa date-only (vd filter { gte, lt } hoặc nested write).
 */
function normalizeDateInput(value: any, inDateCtx: boolean): any {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (inDateCtx && ISO_DATE_RE.test(value)) {
      const iso = value.length === 10 ? `${value}T00:00:00.000Z` : value;
      const d = new Date(iso);
      return isNaN(d.getTime()) ? value : d;
    }
    return value;
  }
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((v) => normalizeDateInput(v, inDateCtx));
  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      value[key] = normalizeDateInput(value[key], inDateCtx || DATE_ONLY_FIELDS.has(key));
    }
    return value;
  }
  return value;
}

export const prisma = new PrismaClient({ adapter }).$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        if (args && typeof args === 'object') normalizeDateInput(args, false);
        return normalizeDateOutput(await query(args));
      },
    },
  },
});
export { pool };

/** Đóng kết nối DB gọn gàng khi tắt server. */
export async function disconnectDb(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch (err) {
    console.error('Error during prisma disconnect:', (err as Error).message);
  }
}
