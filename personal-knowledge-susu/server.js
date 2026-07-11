const express = require('express');
const pool = require('./db');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // Thư viện tạo và kiểm tra Token

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
const JWT_SECRET = 'susu_space_bi_mat_sieu_cap_2026'; // Chìa khóa mã hóa Token

// ==========================================
// 🛡️ MIDDLEWARE: KIỂM TRA ĐĂNG NHẬP (AUTH)
// ==========================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Lấy token từ chuỗi "Bearer <token>"

    if (!token) return res.status(401).json({ error: "Bạn chưa đăng nhập nha!" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Phiên đăng nhập hết hạn hoặc không hợp lệ!" });
        req.user = user; // Lưu thông tin người dùng vào req để các API sau sử dụng
        next();
    });
};

// ==========================================
// 🔑 API: ĐĂNG KÝ VÀ ĐĂNG NHẬP TRỰC TIẾP QUA SUPABASE AUTH
// ==========================================

// 1. API ĐĂNG KÝ (Tạo tài khoản)
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Kiểm tra xem email đã tồn tại trong DB chưa
        const userExist = await pool.query("SELECT * FROM auth.users WHERE email = $1", [email]);
        if (userExist.rows.length > 0) {
            return res.status(400).json({ error: "Email này đã được đăng ký rồi bạn ơi!" });
        }

        // Tạo user mới vào bảng auth.users của Supabase (Sử dụng extension pgcrypto để băm pass nếu có, hoặc lưu cơ bản phục vụ học tập)
        // Lưu ý: Ở đây ta dùng hàm gen_random_uuid() của Postgres để tạo id cho nhanh gọn
        const newUser = await pool.query(
            "INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) RETURNING id, email",
            [email, password] // Khuyên dùng bcrypt để hash password ở dự án thực tế, ở đây viết gọn để bạn dễ tiếp cận
        );

        res.json({ message: "Đăng ký tài khoản thành công rực rỡ!", user: newUser.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. API ĐĂNG NHẬP (Lấy Token)
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userRes = await pool.query("SELECT * FROM auth.users WHERE email = $1 AND encrypted_password = $2", [email, password]);
        if (userRes.rows.length === 0) {
            return res.status(400).json({ error: "Sai tài khoản hoặc mật khẩu rồi nè!" });
        }

        const user = userRes.rows[0];
        // Tạo token gửi về cho Frontend giữ
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ message: "Đăng nhập thành công!", token, user: { id: user.id, email: user.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 📂 API: QUẢN LÝ THƯ MỤC (LỌC THEO USER ĐĂNG NHẬP)
// ==========================================

// LẤY THƯ MỤC CỦA RIÊNG MÌNH
app.get('/api/folders', authenticateToken, async (req, res) => {
    try {
        const myFolders = await pool.query("SELECT * FROM folders WHERE user_id = $1 ORDER BY id ASC", [req.user.id]);
        res.json(myFolders.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// TẠO THƯ MỤC MỚI CHÍNH CHỦ
app.post('/api/folders', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const newFolder = await pool.query(
            "INSERT INTO folders (name, user_id) VALUES ($1, $2) RETURNING *",
            [name, req.user.id]
        );
        res.json({ message: "Tạo thư mục thành công!", data: newFolder.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// XÓA NHIỀU THƯ MỤC CỦA MÌNH
app.delete('/api/folders', authenticateToken, async (req, res) => {
    try {
        const { ids } = req.body;
        await pool.query("DELETE FROM notes WHERE folder_id = ANY($1) AND user_id = $2", [ids, req.user.id]);
        await pool.query("DELETE FROM folders WHERE id = ANY($1) AND user_id = $2", [ids, req.user.id]);
        res.json({ message: "Đã xóa sạch các thư mục bạn chọn!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/folders/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM notes WHERE folder_id = $1 AND user_id = $2", [id, req.user.id]);
        await pool.query("DELETE FROM folders WHERE id = $1 AND user_id = $2", [id, req.user.id]);
        res.json({ message: "Xóa thư mục thành công!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 📝 API: QUẢN LÝ GHI CHÚ (LỌC THEO USER ĐĂNG NHẬP)
// ==========================================

// LẤY GHI CHÚ CHÍNH CHỦ
app.get('/api/notes', authenticateToken, async (req, res) => {
    try {
        const myNotes = await pool.query("SELECT * FROM notes WHERE user_id = $1 ORDER BY id DESC", [req.user.id]);
        res.json(myNotes.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// THÊM GHI CHÚ MỚI GẮN USER_ID
app.post('/api/notes', authenticateToken, async (req, res) => {
    try {
        let { title, content, folder_id } = req.body;
        if (!folder_id || Number(folder_id) <= 0 || isNaN(Number(folder_id))) folder_id = null;

        const newNote = await pool.query(
            "INSERT INTO notes (title, content, folder_id, user_id) VALUES ($1, $2, $3, $4) RETURNING *",
            [title, content, folder_id, req.user.id]
        );
        res.json({ message: "Thêm ghi chú thành công!", data: newNote.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SỬA GHI CHÚ CHÍNH CHỦ
app.put('/api/notes/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;
        const result = await pool.query(
            "UPDATE notes SET title = $1, content = $2 WHERE id = $3 AND user_id = $4 RETURNING *",
            [title, content, id, req.user.id]
        );
        res.json({ message: "Cập nhật thành công!", note: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// XÓA NHIỀU GHI CHÚ CHÍNH CHỦ
app.delete('/api/notes', authenticateToken, async (req, res) => {
    try {
        const { ids } = req.body;
        await pool.query("DELETE FROM notes WHERE id = ANY($1) AND user_id = $2", [ids, req.user.id]);
        res.json({ message: "Đã xóa thành công!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// KIỂM TRA TRẠNG THÁI SERVER
app.get('/', (req, res) => {
    res.send('🚀 Trạm không gian Susu Space Auth đang chạy cực ngon!');
});

const nodemailer = require('nodemailer');

// ⚙️ Cấu hình hòm thư gửi Email tự động (Sử dụng Gmail)
// Lưu ý: Để chạy được, bạn cần vào tài khoản Google tạo "Mật khẩu ứng dụng" (App Password)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'email_cua_ban@gmail.com', // Email dùng để gửi đi
        pass: 'mat_khau_ung_dung_cua_ban' // Mật khẩu ứng dụng gồm 16 ký tự của Google
    }
});

// 1. API: YÊU CẦU GỬI MÃ OTP QUÊN MẬT KHẨU
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        // Kiểm tra xem email có tồn tại trong hệ thống không
        const userCheck = await pool.query("SELECT * FROM auth.users WHERE email = $1", [email]);
        if (userCheck.rows.length === 0) {
            return res.status(400).json({ error: "Email này chưa được đăng ký trong hệ thống bạn ơi!" });
        }

        // Sinh mã OTP ngẫu nhiên gồm 6 chữ số
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Lưu mã OTP vào bảng phụ (Xóa mã cũ của email này nếu có trước khi lưu mới)
        await pool.query("DELETE FROM password_resets WHERE email = $1", [email]);
        await pool.query("INSERT INTO password_resets (email, otp) VALUES ($1, $2)", [email, otp]);

        // Cấu hình nội dung thư gửi đi
        const mailOptions = {
            from: '"Susu Space 🔮" <email_cua_ban@gmail.com>',
            to: email,
            subject: '🔮 Mã Khôi Phục Mật Khẩu Susu Space Của Bạn',
            html: `
                <div style="font-family: sans-serif; padding: 20px; background-color: #f3e8ff; border-radius: 20px;">
                    <h2 style="color: #7e22ce;">Chào bạn hành tinh Susu Space!</h2>
                    <p>Bạn hoặc ai đó đã yêu cầu khôi phục mật khẩu. Dưới đây là mã xác thực OTP của bạn:</p>
                    <div style="font-size: 24px; font-weight: bold; color: #db2777; background: #ffffff; padding: 10px 20px; display: inline-block; border-radius: 10px; margin: 10px 0;">${otp}</div>
                    <p>Mã này có hiệu lực trong vòng 15 phút. Tuyệt đối không chia sẻ mã này cho bất kỳ ai nha!</p>
                </div>
            `
        };

        // Bắn thư đi
        await transporter.sendMail(mailOptions);
        res.json({ message: "Mã OTP đã được gửi thẳng vào email của bạn rồi nhé!" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. API: XÁC THỰC OTP VÀ ĐỔI MẬT KHẨU MỚI
app.post('/api/auth/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        // Kiểm tra xem mã OTP có đúng và khớp với email không
        const checkOtp = await pool.query("SELECT * FROM password_resets WHERE email = $1 AND otp = $2", [email, otp]);
        if (checkOtp.rows.length === 0) {
            return res.status(400).json({ error: "Mã OTP không chính xác hoặc đã hết hạn rồi!" });
        }

        // Cập nhật mật khẩu mới vào bảng auth.users
        await pool.query("UPDATE auth.users SET encrypted_password = $1, updated_at = NOW() WHERE email = $2", [newPassword, email]);

        // Xóa mã OTP đi sau khi đã dùng xong để bảo mật
        await pool.query("DELETE FROM password_resets WHERE email = $1", [email]);

        res.json({ message: "Đổi mật khẩu thành công rực rỡ! Đăng nhập lại thôi nào bạn ơi!" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server đang chạy mượt mà tại cổng ${PORT}`);
});