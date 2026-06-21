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

export const prisma = new PrismaClient({ adapter });
export { pool };

/** Đóng kết nối DB gọn gàng khi tắt server. */
export async function disconnectDb(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch (err) {
    console.error('Error during prisma disconnect:', (err as Error).message);
  }
}
