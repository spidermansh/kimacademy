import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCorsOrigins, isProduction } from './config/env';

// Import routers
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { studentsRouter } from './routes/students';
import { classesRouter } from './routes/classes';
import { attendanceRouter } from './routes/attendance';
import { enrollmentsRouter } from './routes/enrollments';
import { financeRouter } from './routes/finance';
import { payrollRouter } from './routes/payroll';
import { settingsRouter } from './routes/settings';
import { reportsRouter } from './routes/reports';
import { admissionsRouter } from './routes/admissions';
import { inventoryRouter } from './routes/inventory';
import { notificationsRouter } from './routes/notifications';
import { backupRouter } from './routes/backup';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3021;
const corsOrigins = getCorsOrigins();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowAnyDevOrigin = !isProduction && corsOrigins.length === 0;
  const isAllowedOrigin = origin && (corsOrigins.includes(origin) || corsOrigins.includes('*'));

  if (allowAnyDevOrigin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else if (isAllowedOrigin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json({ limit: '50mb' }));

export { authenticateToken, requireAdmin } from './middleware/auth';

// Global typing for Express request
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId?: string;
        username: string;
        role: string;
        name: string;
        staffId?: string;
      };
    }
  }
}

// Base route checks
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '3.0.0' });
});

// Register API Routes — all mount at /api, sub-paths defined in route files
app.use('/api/auth', authRouter);
app.use('/api', usersRouter);
app.use('/api', studentsRouter);
app.use('/api', classesRouter);
app.use('/api', attendanceRouter);
app.use('/api', enrollmentsRouter);
app.use('/api', financeRouter);
app.use('/api', payrollRouter);
app.use('/api', settingsRouter);
app.use('/api', reportsRouter);
app.use('/api', admissionsRouter);
app.use('/api', inventoryRouter);
app.use('/api', notificationsRouter);
app.use('/api', backupRouter);

app.use('/api', (req, res) => {
  res.status(404).json({
    message: `Không tìm thấy API ${req.method} ${req.originalUrl}. Vui lòng kiểm tra backend đã cập nhật và restart đúng phiên bản.`,
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      message: 'Dữ liệu gửi lên không đúng định dạng JSON',
    });
  }

  console.error('Unhandled API Error:', err);
  res.status(500).json({
    message: err.message || 'Đã xảy ra lỗi hệ thống nghiêm trọng',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server V3 running on http://localhost:${PORT}`);
});
