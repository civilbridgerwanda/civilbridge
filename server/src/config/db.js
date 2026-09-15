import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Connection pool (mysql2 is the modern, promise-friendly equivalent of
// PHP's mysqli - it speaks the same MySQL protocol).
export const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "civilbridge",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
});

export async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log("✅ MySQL connected");
    conn.release();
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
  }
}
