const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Hàm khởi tạo các bảng dữ liệu
const initDatabase = async () => {
  try {
    // 1. Tạo bảng quản lý thư mục (Folders) trước
    await pool.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        parent_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Cập nhật hoặc tạo bảng notes (Ghi chú) có liên kết với bảng folders
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Cấu trúc Database cấu trúc cây đã sẵn sàng trên Supabase!');
  } catch (err) {
    console.error('❌ Cấu trúc Database thất bại:', err.message);
  }
};

initDatabase();

module.exports = pool;