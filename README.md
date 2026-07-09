# 🚀 Susu Space - Siêu Ứng Dụng Ghi Chép Fullstack CRUD

**Susu Space** là ứng dụng quản lý không gian sáng tạo và ghi chép cá nhân toàn diện, xây dựng trên mô hình Fullstack (React + Node.js + Supabase). Ứng dụng sở hữu giao diện bồng bềnh, hỗ trợ soạn thảo Rich Text và dọn dẹp dữ liệu hàng loạt siêu tốc.

## ✨ Tính Năng Nổi Bật
- **🔮 Quản lý Không Gian (Folders):** Tổ chức bài viết theo từng danh mục. Hỗ trợ chọn nhiều để xóa hàng loạt thư mục.
- **📝 Trình Soạn Thảo Rich Text:** Sử dụng React Quill định dạng văn bản chuyên nghiệp (In đậm, nghiêng, danh sách tích chọn).
- **🔍 Tìm Kiếm Thông Minh:** Tự động lùng sục từ khóa tiêu đề hoặc nội dung xuyên suốt toàn bộ các thư mục.
- **📌 Ghim Ghi Chú:** Đánh dấu ghim bài viết quan trọng lên trên cùng danh sách với viền vàng nổi bật.
- **✏️ Chỉnh Sửa (Edit Note):** Đổ ngược dữ liệu bài viết cũ lên form nhập liệu để cập nhật nội dung tức thì.
- **📊 Trạm Thống Kê Sáng Tạo:** Widget đếm tự động tổng số Thư mục và Ghi chép thời gian thực tại Sidebar.

## 🛠️ Công Nghệ Sử Dụng
- **Frontend:** React.js, Vite, React Quill, Axios.
- **Backend:** Node.js, Express.js, Cors.
- **Database:** PostgreSQL (Lưu trữ trực tiếp trên đám mây **Supabase**).

## 🏃‍♂️ Hướng Dẫn Chạy Dự Án (Local)
```bash
# 1. Clone mã nguồn về máy
git clone [https://github.com/nguyenxuanngoctran2006-cloud/susu-space.git](https://github.com/nguyenxuanngoctran2006-cloud/susu-space.git)
cd susu-space

# 2. Cài đặt và chạy Backend
cd personal-knowledge-susu
npm install
node server.js

# 3. Cài đặt và chạy Frontend
cd ../personal-knowledge-frontend
npm install
npm run dev