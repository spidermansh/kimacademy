# Hướng dẫn Triển khai Trực tuyến & Kết nối Cloud Database Vĩnh viễn

Tài liệu này hướng dẫn bạn cách thiết lập cơ sở dữ liệu đám mây vĩnh viễn (MongoDB Atlas) miễn phí và đưa ứng dụng lên internet qua Render.com để có thể truy cập từ bất kỳ thiết bị nào có kết nối mạng.

---

## BƯỚC 1: Tạo Cơ sở dữ liệu Đám mây Vĩnh viễn (MongoDB Atlas)

MongoDB Atlas cung cấp gói cơ sở dữ liệu cloud miễn phí vĩnh viễn (gói M0).

1. Truy cập **[https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)** và đăng ký một tài khoản miễn phí.
2. Tạo một dự án mới và nhấn **Create** để tạo Cluster mới:
   - Chọn nhà cung cấp (AWS / Google Cloud / Azure) và khu vực gần bạn nhất (ví dụ: Singapore).
   - Chọn gói **M0** (Free - Miễn phí).
3. Thiết lập thông tin bảo mật kết nối:
   - **Tạo Database User:** Điền Tên đăng nhập và Mật khẩu (hãy ghi nhớ mật khẩu này). Nhấn **Create User**.
   - **Cấu hình Network Access:** Nhấp chọn **Allow Access from Anywhere** (hoặc thêm dải IP `0.0.0.0/0`). Điều này bắt buộc vì địa chỉ IP của máy chủ Render sẽ tự động thay đổi liên tục. Nhấn **Add IP Address**.
4. Lấy chuỗi kết nối (Connection String):
   - Vào mục **Database** trên thanh menu bên trái. Nhấn nút **Connect** bên cạnh Cluster của bạn.
   - Chọn **Drivers** (hoặc Connect your application).
   - Sao chép chuỗi kết nối hiển thị trên màn hình. Chuỗi này sẽ có định dạng tương tự như sau:
     ```text
     mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
     ```
5. Đổi tên cơ sở dữ liệu (tùy chọn):
   - Thay phần `/?` trong chuỗi kết nối bằng `/kim_academy?` để chỉ định tên database là `kim_academy`.
   - Thay `<username>` và `<password>` bằng tài khoản cơ sở dữ liệu bạn đã tạo ở bước 3.
   - Ví dụ hoàn chỉnh: `mongodb+srv://admin:pass123@cluster0.xxxx.mongodb.net/kim_academy?retryWrites=true&w=majority`

---

## BƯỚC 2: Kiểm tra dưới Local trước khi Deploy

1. Mở tệp `.env` trong thư mục dự án của bạn dưới local.
2. Thêm dòng sau (thay bằng chuỗi kết nối thực tế của bạn):
   ```env
   MONGODB_URI="mongodb+srv://admin:pass123@cluster0.xxxx.mongodb.net/kim_academy?retryWrites=true&w=majority"
   ```
3. Chạy lại dự án bằng lệnh:
   ```bash
   npm run dev
   ```
4. Quan sát log terminal xem có xuất hiện thông báo:
   `✅ Connected to MongoDB Atlas successfully.`
   Nếu xuất hiện thông báo này tức là hệ thống đã chuyển sang lưu dữ liệu trực tiếp trên cloud database của bạn.

---

## BƯỚC 3: Đẩy mã nguồn lên GitHub cá nhân

1. Đăng nhập vào **[https://github.com/](https://github.com/)** và tạo một Repository mới (để ở chế độ **Private** hoặc **Public** tùy ý).
2. Dưới máy tính của bạn, mở terminal tại thư mục dự án và chạy các lệnh:
   ```bash
   git init
   git add .
   git commit -m "feat: setup fullstack application with mongodb atlas"
   git branch -M main
   git remote add origin <URL_REPOSITORY_GITHUAB_CỦA_BẠN>
   git push -u origin main
   ```

---

## BƯỚC 4: Triển khai trực tuyến lên Render.com (Miễn phí)

Render.com cho phép chạy các ứng dụng Node.js (cả Frontend + Backend) hoàn toàn miễn phí.

1. Truy cập **[https://render.com/](https://render.com/)** và đăng nhập bằng tài khoản GitHub của bạn.
2. Nhấn nút **New +** ở góc trên bên phải và chọn **Web Service**.
3. Chọn kho chứa mã nguồn (Repository) của dự án này mà bạn vừa đẩy lên GitHub ở Bước 3.
4. Cấu hình dịch vụ Web Service với các thông số sau:
   - **Name:** `kim-academy-finance` (hoặc tên bất kỳ bạn thích).
   - **Region:** Chọn khu vực gần Việt Nam nhất (ví dụ: `Singapore`).
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node server.js`
   - **Instance Type:** Chọn gói **Free** ($0/month).
5. Thiết lập biến môi trường (Environment Variables):
   - Nhấn vào phần **Advanced** hoặc tab **Environment**.
   - Nhấn **Add Environment Variable** để thêm biến sau:
     - **Key:** `MONGODB_URI`
     - **Value:** Điền chuỗi kết nối MongoDB Atlas mà bạn đã lấy ở Bước 1.
6. Nhấn nút **Create Web Service** ở cuối trang.
7. Đợi khoảng 3 - 5 phút để Render tải mã nguồn, cài đặt thư viện và build dự án.
8. Khi quá trình build kết thúc và hiển thị trạng thái `Live`, bạn sẽ thấy một đường liên kết công khai (dạng `https://kim-academy-finance.onrender.com`).

**Chúc mừng!** Bây giờ, bạn có thể gửi link này cho bất kỳ ai hoặc sử dụng điện thoại, máy tính bảng để truy cập và quản lý thu chi học phí trực tuyến từ bất kỳ đâu.
