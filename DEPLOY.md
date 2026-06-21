# Hướng dẫn Triển khai Trực tuyến & Kết nối PostgreSQL Database (Prisma 7)

Tài liệu này hướng dẫn bạn cách thiết lập cơ sở dữ liệu đám mây PostgreSQL miễn phí (hoặc tự lưu trữ) và đưa ứng dụng Kim Academy v3 lên internet qua Render.com để có thể truy cập từ bất kỳ thiết bị nào có kết nối mạng.

---

## BƯỚC 1: Tạo Cơ sở dữ liệu Đám mây PostgreSQL Miễn phí

Bạn có thể sử dụng bất kỳ nhà cung cấp dịch vụ PostgreSQL đám mây nào. Dưới đây là hai lựa chọn miễn phí phổ biến:

### Lựa chọn A: Sử dụng Neon.tech (Khuyên dùng - Cực kỳ nhanh & ổn định)
1. Truy cập **[https://neon.tech/](https://neon.tech/)** và đăng ký một tài khoản miễn phí.
2. Tạo một dự án mới (Project):
   - Chọn tên bất kỳ (ví dụ: `kim-academy`).
   - Chọn khu vực gần Việt Nam nhất (ví dụ: `Singapore` hoặc `Asia Pacific`).
3. Sau khi tạo xong, Neon sẽ hiển thị chuỗi kết nối **Connection String** của bạn.
4. Chọn định dạng phù hợp với Node.js hoặc Prisma:
   - Nó sẽ có dạng tương tự như sau:
     ```text
     postgresql://neondb_owner:password@ep-cool-breeze-a1b2c3d4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
     ```
5. Sao chép và lưu trữ chuỗi kết nối này lại.

### Lựa chọn B: Sử dụng dịch vụ PostgreSQL tích hợp sẵn trên Render.com
1. Đăng nhập vào tài khoản **[https://render.com/](https://render.com/)**.
2. Nhấn nút **New +** ở góc trên bên phải và chọn **PostgreSQL**.
3. Điền thông tin:
   - **Name**: `kim-academy-db`
   - **Region**: Chọn khu vực gần bạn nhất (ví dụ: `Singapore`).
   - Chọn gói **Free** (Miễn phí).
4. Nhấn **Create Database**.
5. Đợi khoảng 1 - 2 phút để Render khởi tạo xong database. Khi hoàn tất, hãy cuộn xuống phần **Connection Connections** và sao chép mục **External Connection String**.

---

## BƯỚC 2: Kiểm tra kết nối dưới local (Tùy chọn)

1. Mở tệp `.env` dưới máy tính của bạn.
2. Thêm hoặc thay đổi biến sau thành chuỗi kết nối PostgreSQL của bạn:
   ```env
   DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"
   ```
3. Chạy lệnh để đồng bộ cấu trúc bảng và seed dữ liệu thử nghiệm (nếu muốn):
   ```bash
   npx prisma db push
   npm run seed:demo
   ```
4. Khởi động ứng dụng bằng `npm run dev` để kiểm tra mọi hoạt động dưới local.

---

## BƯỚC 3: Đẩy mã nguồn lên GitHub cá nhân

1. Bạn đã có repo trên GitHub (`spidermansh/kimacademy`).
2. Mở terminal tại thư mục dự án và chạy các lệnh để lưu và đẩy code mới lên:
   ```bash
   git add -A
   git commit -m "feat: upgrade to v3 (PostgreSQL and Prisma 7 rewrite)"
   git push origin main
   ```

---

## BƯỚC 4: Triển khai trực tuyến lên Render.com

Render.com sẽ tự động lấy code mới nhất từ GitHub của bạn và thực hiện build.

1. Truy cập **[https://render.com/](https://render.com/)** và đăng nhập.
2. Nếu bạn **đã có một Web Service** trước đó cho Kim Academy:
   - Click vào Web Service đó.
   - Chọn mục **Environment** ở cột bên trái.
   - **Xóa** biến môi trường cũ `MONGODB_URI` nếu có.
   - Thêm biến môi trường mới:
     - **Key**: `DATABASE_URL`
     - **Value**: Dán chuỗi kết nối PostgreSQL lấy được ở **Bước 1** vào đây.
   - Chọn mục **Settings** ở cột bên trái và cập nhật các thông số cấu hình build:
     - **Build Command**: `npm install && npx prisma generate && npx prisma db push && npm run build`
     - **Start Command**: `npm start`
   - Nhấn **Save Changes**.
   - Nhấp vào nút **Manual Deploy** ở góc phải và chọn **Clear Cache and Deploy**.

3. Nếu bạn **tạo Web Service mới**:
   - Nhấn nút **New +** ở góc trên bên phải và chọn **Web Service**.
   - Chọn repository GitHub của bạn (`kimacademy`).
   - Cấu hình các thông số sau:
     - **Name**: `kim-academy-finance-v3`
     - **Region**: `Singapore` (hoặc khu vực gần nhất)
     - **Branch**: `main`
     - **Runtime**: `Node`
     - **Build Command**: `npm install && npx prisma generate && npx prisma db push && npm run build`
     - **Start Command**: `npm start`
     - **Instance Type**: Chọn **Free**.
   - Nhấn vào **Advanced** hoặc tab **Environment**, thêm biến môi trường sau:
     - **Key**: `DATABASE_URL`
     - **Value**: Dán chuỗi kết nối PostgreSQL đám mây của bạn.
   - Nhấn **Create Web Service** ở cuối trang.

---

## BƯỚC 5: Kiểm tra kết quả

1. Đợi khoảng 3 - 5 phút để Render tải mã nguồn, cài đặt các thư viện, chạy lệnh `prisma db push` (để tự động tạo các bảng dữ liệu trên PostgreSQL) và build ứng dụng.
2. Khi trạng thái chuyển sang màu xanh lá cây `Live`, bạn có thể nhấp vào liên kết công khai của Render để sử dụng ứng dụng.
3. Chúc mừng! Ứng dụng Kim Academy v3 với kiến trúc cơ sở dữ liệu PostgreSQL + Prisma 7 đã được deploy trực tuyến hoàn toàn miễn phí và tự động!
