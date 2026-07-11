const express = require('express');
const pool = require('./db');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
const JWT_SECRET = 'susu_space_bi_mat_sieu_cap_2026';

const { createClient } = require('@supabase/supabase-js');
// Khởi tạo Supabase Client chính xác
// Thay thế đoạn khởi tạo cũ bằng đoạn mã bảo mật này:
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wdszsnshobvrxzdyexef.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
    console.error("⚠️ Thiếu biến môi trường SUPABASE_ANON_KEY rồi bạn ơi!");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 🛡️ MIDDLEWARE: KIỂM TRA ĐĂNG NHẬP (AUTH)
// ==========================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Bạn chưa đăng nhập nha!" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Phiên đăng nhập hết hạn hoặc không hợp lệ!" });
        req.user = user;
        next();
    });
};

// ==========================================
// 🔑 API: XÁC THỰC TÀI KHOẢN (ĐỒNG BỘ SUPABASE)
// ==========================================

// 1. API ĐĂNG KÝ CHUẨN SUPABASE
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Đăng ký tài khoản thông qua hệ thống Auth của Supabase để kích hoạt cơ chế gửi mail tự động
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) return res.status(400).json({ error: error.message });

        res.json({ message: "Đăng ký tài khoản thành công rực rỡ! Hãy kiểm tra mail nếu có xác thực.", user: data.user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. API ĐĂNG NHẬP CHUẨN SUPABASE
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Đăng nhập trực tiếp qua hệ thống Auth của Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) return res.status(400).json({ error: error.message });

        const user = data.user;
        // Tạo token JWT để giữ nguyên logic phân quyền cũ cho Frontend của bạn
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ message: "Đăng nhập thành công!", token, user: { id: user.id, email: user.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. API: YÊU CẦU SUPABASE GỬI MAIL ĐỔI MẬT KHẨU
// 3. API: YÊU CẦU SUPABASE GỬI MAIL ĐỔI MẬT KHẨU
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            // 🌟 SỬA CHÍNH XÁC THÀNH LINK VERCEL THẬT CỦA BẠN Ở ĐÂY
            redirectTo: 'https://susu-space.vercel.app/reset-password', 
        });

        if (error) return res.status(400).json({ error: error.message });

        res.json({ message: "Hệ thống đã gửi một đường link đặt lại mật khẩu vào Email của bạn rồi nhé!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 📂 API: QUẢN LÝ THƯ MỤC (FOLDERS)
// ==========================================
app.get('/api/folders', authenticateToken, async (req, res) => {
    try {
        const myFolders = await pool.query("SELECT * FROM folders WHERE user_id = $1 ORDER BY id ASC", [req.user.id]);
        res.json(myFolders.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/folders', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const newFolder = await pool.query("INSERT INTO folders (name, user_id) VALUES ($1, $2) RETURNING *", [name, req.user.id]);
        res.json({ message: "Tạo thư mục thành công!", data: newFolder.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/folders', authenticateToken, async (req, res) => {
    try {
        const { ids } = req.body;
        await pool.query("DELETE FROM notes WHERE folder_id = ANY($1) AND user_id = $2", [ids, req.user.id]);
        await pool.query("DELETE FROM folders WHERE id = ANY($1) AND user_id = $2", [ids, req.user.id]);
        res.json({ message: "Đã xóa sạch các thư mục bạn chọn!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/folders/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM notes WHERE folder_id = $1 AND user_id = $2", [id, req.user.id]);
        await pool.query("DELETE FROM folders WHERE id = $1 AND user_id = $2", [id, req.user.id]);
        res.json({ message: "Xóa thư mục thành công!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 📝 API: QUẢN LÝ GHI CHÚ (NOTES)
// ==========================================
app.get('/api/notes', authenticateToken, async (req, res) => {
    try {
        const myNotes = await pool.query("SELECT * FROM notes WHERE user_id = $1 ORDER BY id DESC", [req.user.id]);
        res.json(myNotes.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/notes', authenticateToken, async (req, res) => {
    try {
        let { title, content, folder_id } = req.body;
        if (!folder_id || Number(folder_id) <= 0 || isNaN(Number(folder_id))) folder_id = null;

        const newNote = await pool.query(
            "INSERT INTO notes (title, content, folder_id, user_id) VALUES ($1, $2, $3, $4) RETURNING *",
            [title, content, folder_id, req.user.id]
        );
        res.json({ message: "Thêm ghi chú thành công!", data: newNote.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/notes/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;
        const result = await pool.query("UPDATE notes SET title = $1, content = $2 WHERE id = $3 AND user_id = $4 RETURNING *", [title, content, id, req.user.id]);
        res.json({ message: "Cập nhật thành công!", note: result.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/notes', authenticateToken, async (req, res) => {
    try {
        const { ids } = req.body;
        await pool.query("DELETE FROM notes WHERE id = ANY($1) AND user_id = $2", [ids, req.user.id]);
        res.json({ message: "Đã xóa thành công!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/', (req, res) => {
    res.send('🚀 Trạm không gian Susu Space Auth đang chạy cực ngon!');
});

app.listen(PORT, () => {
    console.log(`Server đang chạy mượt mà tại cổng ${PORT}`);
});