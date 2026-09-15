import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

// Sequelize sits on top of the same MySQL database defined in
// server/sql/schema.sql. We use `sync()` in dev only to fill in gaps
// (like this newsletter table) - the source of truth for table structure
// is still schema.sql, so run that first on a fresh database.
export const sequelize = new Sequelize(
  process.env.DB_NAME || "civilbridge",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: false,
  }
);

export async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log("✅ MySQL connected (Sequelize)");
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
    if (err.original?.code === "ER_ACCESS_DENIED_ERROR") {
      console.error(
        "   → DB_USER/DB_PASSWORD in server/.env don't match your MySQL login. " +
          "On XAMPP, root often has no password by default."
      );
    } else if (err.original?.code === "ECONNREFUSED") {
      console.error("   → Is MySQL actually running? Check DB_HOST/DB_PORT in server/.env.");
    } else if (err.original?.code === "ER_BAD_DB_ERROR") {
      console.error("   → The database doesn't exist yet - run `npm run migrate` first.");
    }
  }
}
