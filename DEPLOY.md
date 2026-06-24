# Huong Dan Trien Khai Kim Academy v3 Len Cloud

Tai lieu nay dung cho ban v3: React/Vite + Express + Prisma 7 + PostgreSQL.

## 1. Kien Truc Khuyen Nghi

- App/Web service: Render, Railway, Fly.io hoac Google Cloud Run.
- Database: Neon PostgreSQL, Render PostgreSQL, Supabase Postgres hoac Cloud SQL.
- Moi truong bat buoc:
  - `staging`: test migration, test restore, test nghiep vu.
  - `production`: du lieu that.
- Production khong dung `prisma db push`; chi dung `prisma migrate deploy`.

## 2. Bien Moi Truong

Tao cac bien sau tren cloud provider:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
JWT_SECRET="random-secret-it-nhat-32-ky-tu"
CORS_ORIGIN="https://your-domain.com"
```

Ghi chu:

- Render/Railway thuong tu cap `PORT`; neu co san thi giu theo provider.
- `JWT_SECRET` bat buoc trong production. Khong dung gia tri mac dinh.
- `CORS_ORIGIN` co the la nhieu domain, cach nhau bang dau phay.

## 3. Chuan Bi Database

### Tao database cloud

1. Tao PostgreSQL tren Neon/Render/Supabase.
2. Chon region gan Viet Nam, vi du Singapore neu co.
3. Copy connection string co `sslmode=require`.
4. Tao rieng database/branch cho staging.

### Tao migration lan dau

Chay local voi `DATABASE_URL` tro den database dev/staging:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
```

Commit thu muc `prisma/migrations`.

## 4. Lenh Build/Start Tren Cloud

Build command:

```bash
npm ci && npx prisma generate && npx prisma migrate deploy && npm run build
```

Start command:

```bash
npm start
```

## 5. Quy Trinh Deploy An Toan

1. Deploy len staging truoc.
2. Kiem tra `/api/health`.
3. Dang nhap admin.
4. Test nghiep vu can ban:
   - Tao nhan su.
   - Tao lop.
   - Tao hoc vien.
   - Ghi danh hoc vien vao lop.
   - Thu hoc phi.
   - Diem danh.
   - Kiem tra so buoi/so du hoc phi.
   - Tao nhap/xuat kho.
   - Xem bao cao.
5. Chi deploy production khi staging pass.

## 6. Checklist Truoc Production

- `npm run lint` pass.
- `npm run build` pass.
- `npm test` pass voi test database rieng.
- Co `prisma/migrations`.
- Production build dung `prisma migrate deploy`.
- `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` da cau hinh.
- Backup database tu dong da bat.
- Restore da duoc test tren staging.
- Khong test restore tren production.

## 7. Rollback

Neu deploy loi:

1. Redeploy commit truoc do.
2. Khong chay rollback DB tuy tien neu migration da thay doi schema.
3. Neu du lieu hong, restore tu snapshot database gan nhat vao staging de kiem tra truoc.
4. Sau khi xac nhan snapshot dung moi restore production.

## 8. Lenh Local Huu Ich

```bash
npm install
npx prisma generate
npm run lint
npm run build
npm test
```

Chay dev:

```bash
npm run dev
```

Frontend: http://localhost:3025
Backend: http://localhost:3021
