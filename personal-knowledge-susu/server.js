const express = require('express');
const pool = require('./db'); // Nhập cấu hình database từ file db.js
const app = express();
const cors = require('cors'); // Thêm cors mở khóa kết nối

app.use(cors());              // Kích hoạt CORS chặn lỗi bảo mật trình duyệt
const PORT = 3000;

// Cho phép Express đọc được dữ liệu JSON gửi lên
app.use(express.json());

// 1. API TRANG CHỦ
app.get('/', (req, res) => {
    res.send('Server Note App đang hoạt động ngon lành!');
});

// 2. API THÊM GHI CHÚ MỚI (Bản vá lỗi chống null / chống sập khóa ngoại)
app.post('/api/notes', async (req, res) => {
    try {
        let { title, content, folder_id } = req.body; 
        
        // 🌟 THÊM ĐOẠN KIỂM TRA NÀY: Nếu folder_id gửi lên bằng 0, hoặc không phải là số, hoặc null
        // thì ép nó về null hẳn để PostgreSQL hiểu là ghi chú tự do, không bắt bẻ lỗi khóa ngoại nữa.
        if (!folder_id || Number(folder_id) <= 0 || isNaN(Number(folder_id))) {
            folder_id = null;
        }
        
        const newNote = await pool.query(
            "INSERT INTO notes (title, content, folder_id) VALUES ($1, $2, $3) RETURNING *",
            [title, content, folder_id]
        );
        res.json({ message: "Thêm ghi chú thành công!", data: newNote.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. API ĐỌC TẤT CẢ GHI CHÚ
app.get('/api/notes', async (req, res) => {
    try {
        const allNotes = await pool.query("SELECT * FROM notes ORDER BY id DESC");
        res.json(allNotes.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. API XÓA MỘT GHI CHÚ
app.delete('/api/notes/:id', async (req, res) => {
    try {
        const { id } = req.params; 
        await pool.query("DELETE FROM notes WHERE id = $1", [id]);
        res.json({ message: `Đã xóa thành công ghi chú có ID = ${id}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// GIAI ĐOẠN 2: API QUẢN LÝ THƯ MỤC (FOLDERS)
// ==========================================

// 1. API TẠO THƯ MỤC MỚI
app.post('/api/folders', async (req, res) => {
    try {
        const { name, parent_id } = req.body; 
        const newFolder = await pool.query(
            "INSERT INTO folders (name, parent_id) VALUES ($1, $2) RETURNING *",
            [name, parent_id || null]
        );
        res.json({ message: "Tạo thư mục thành công!", data: newFolder.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. API LẤY TẤT CẢ THƯ MỤC
app.get('/api/folders', async (req, res) => {
    try {
        const allFolders = await pool.query("SELECT * FROM folders ORDER BY id ASC");
        res.json(allFolders.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// API XÓA MỘT HOẶC NHIỀU GHI CHÚ CÙNG LÚC (Cập nhật hỗ trợ xóa hàng loạt)
app.delete('/api/notes', async (req, res) => {
    try {
        // Nhận vào một mảng các ID dạng: [1, 2, 3]
        const { ids } = req.body; 
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "Mảng ID không hợp lệ!" });
        }

        // Câu lệnh SQL xóa tất cả các ID nằm trong danh sách truyền lên
        await pool.query("DELETE FROM notes WHERE id = ANY($1)", [ids]);
        res.json({ message: "Đã xóa các ghi chú được chọn thành công!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API XÓA THƯ MỤC (Sửa dứt điểm lỗi xóa thất bại)
// API XÓA THƯ MỤC CHUẨN SQL (Sửa dứt điểm lỗi xóa thất bại)
app.delete('/api/folders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Xóa toàn bộ ghi chú thuộc thư mục này trước để tránh lỗi Khóa ngoại (Foreign Key)
        await pool.query("DELETE FROM notes WHERE folder_id = $1", [id]);
        
        // 2. Sau khi ghi chú đã sạch sẽ, tiến hành xóa thư mục
        const result = await pool.query("DELETE FROM folders WHERE id = $1 RETURNING *", [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Không tìm thấy thư mục này để xóa!" });
        }
        
        res.json({ message: "Đã dọn dẹp sạch sẽ thư mục và các ghi chú bên trong!" });
    } catch (err) {
        console.error("Lỗi Backend khi xóa thư mục:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// API XÓA NHIỀU THƯ MỤC CÙNG LÚC (Dọn dẹp hàng loạt)
app.delete('/api/folders', async (req, res) => {
    try {
        const { ids } = req.body; // Nhận mảng ID dạng: [1, 2, 3]
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "Mảng ID thư mục không hợp lệ!" });
        }

        // Bước 1: Xóa toàn bộ ghi chú nằm trong tất cả các thư mục được chọn trước
        await pool.query("DELETE FROM notes WHERE folder_id = ANY($1)", [ids]);
        
        // Bước 2: Tiến hành xóa toàn bộ các thư mục này
        await pool.query("DELETE FROM folders WHERE id = ANY($1)", [ids]);
        
        res.json({ message: "Đã dọn dẹp sạch sẽ các thư mục được chọn và ghi chú bên trong!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🌟 API MỚI: CẬP NHẬT TIÊU ĐỀ VÀ NỘI DUNG CỦA GHI CHÚ CŨ
app.put('/api/notes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;

        if (!title.trim()) {
            return res.status(400).json({ error: "Tiêu đề không được để trống nha!" });
        }

        // Câu lệnh SQL cập nhật dữ liệu dựa theo ID ghi chú
        const result = await pool.query(
            "UPDATE notes SET title = $1, content = $2 WHERE id = $3 RETURNING *",
            [title, content, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Không tìm thấy ghi chú này để cập nhật!" });
        }

        res.json({ message: "Cập nhật ghi chú thành công rồi nè!", note: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server đang chạy cực mượt tại: http://localhost:${PORT}`);
});