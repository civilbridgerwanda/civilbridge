import crypto from "crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

/**
 * Creates (or resets the password of) an admin account - the way to get a
 * first admin on a database that was migrated without sample data, or to
 * replace the old fixed test admin's password.
 *
 *   ADMIN_PASSWORD='choose-a-strong-one' npm run create-admin -- you@company.com "Your Name"
 *
 * The password comes from the environment, not the command line, so it
 * doesn't end up in shell history or process listings. If the email already
 * exists, that account is made an admin, verified, and given the new
 * password.
 */
const [email, ...nameParts] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const fullName = nameParts.join(" ").trim();
const password = process.env.ADMIN_PASSWORD;

async function main() {
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !fullName) {
    throw new Error('Usage: ADMIN_PASSWORD=... npm run create-admin -- you@company.com "Your Name"');
  }
  if (!password || password.length < 10) {
    throw new Error("Set ADMIN_PASSWORD (at least 10 characters) in the environment first.");
  }

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "civilbridge",
  });

  const hash = await bcrypt.hash(password, 10);
  const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);

  if (existing.length) {
    await db.query("UPDATE users SET role = 'admin', password_hash = ?, email_verified = TRUE, is_suspended = FALSE WHERE id = ?", [
      hash,
      existing[0].id,
    ]);
    console.log(`✅ ${email} is now an admin with the new password.`);
  } else {
    await db.query(
      "INSERT INTO users (id, full_name, email, password_hash, role, email_verified) VALUES (?, ?, ?, ?, 'admin', TRUE)",
      [crypto.randomUUID(), fullName, email, hash]
    );
    console.log(`✅ Admin account created for ${email}.`);
  }
  await db.end();
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exitCode = 1;
});
