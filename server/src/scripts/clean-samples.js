import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "../../sql/schema.sql");
const uploadsDir = path.join(__dirname, "../../uploads");

/**
 * Removes the demo content that `npm run migrate:sample` (or the old
 * always-on seed) put in the database, so real uploads start from a clean
 * site. Deliberately narrow - it only touches rows it can positively
 * identify as sample data, so it's safe to run on a database that already
 * has real users and listings:
 *
 *   - users whose email ends in @example.com, or whose password is the
 *     literal "placeholder" (the seed's non-loginable fake people). Their
 *     expert profiles, payments, notifications, chats and reviews go with
 *     them via the foreign keys.
 *   - properties and plans whose image_url is one of the stock photos the
 *     seed inserted (read straight from schema.sql, so this stays correct if
 *     the seed changes).
 *   - newsletter subscribers with an @example.com address.
 *
 * Real accounts (including your admin) and anything you uploaded yourself
 * are never matched.
 *
 *   npm run clean-samples                   dry run - shows what WOULD go
 *   npm run clean-samples -- --yes          actually delete it
 *   npm run clean-samples -- --yes --prune-uploads
 *                                           also delete files in uploads/ that
 *                                           nothing in the database points at
 */
const args = new Set(process.argv.slice(2));
const apply = args.has("--yes");
const pruneUploads = args.has("--prune-uploads");

function seedImageUrls() {
  const sql = fs.readFileSync(schemaPath, "utf8");
  const seedPart = sql.slice(sql.indexOf("-- ==SEED DATA BELOW=="));
  return [...new Set([...seedPart.matchAll(/'(https:\/\/images\.unsplash\.com\/[^']+)'/g)].map((m) => m[1]))];
}

async function referencedUploadFiles(db) {
  const [columns] = await db.query(
    `SELECT TABLE_NAME t, COLUMN_NAME c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND DATA_TYPE IN ('varchar','text','mediumtext','longtext','json')`
  );
  const referenced = new Set();
  for (const { t, c } of columns) {
    const [rows] = await db.query(`SELECT \`${c}\` v FROM \`${t}\` WHERE \`${c}\` LIKE '%/uploads/%'`);
    for (const { v } of rows) {
      for (const m of String(v).matchAll(/\/uploads\/([A-Za-z0-9._-]+)/g)) referenced.add(m[1]);
    }
  }
  return referenced;
}

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "civilbridge",
  });

  const urls = seedImageUrls();
  const inUrls = urls.length ? urls : [""];

  const [users] = await db.query(
    "SELECT id, full_name, email, role FROM users WHERE email LIKE '%@example.com' OR password_hash = 'placeholder'"
  );
  const [properties] = await db.query("SELECT id, title FROM properties WHERE image_url IN (?)", [inUrls]);
  const [plans] = await db.query("SELECT id, title FROM plans WHERE image_url IN (?)", [inUrls]);
  const [subscribers] = await db.query("SELECT id, email FROM newsletter_subscribers WHERE email LIKE '%@example.com'");

  console.log(apply ? "Deleting sample data:\n" : "DRY RUN - nothing will be deleted. Sample data found:\n");
  console.log(`Users (${users.length}):`);
  users.forEach((u) => console.log(`  - ${u.full_name} <${u.email}> [${u.role}]`));
  console.log(`Properties (${properties.length}):`);
  properties.forEach((p) => console.log(`  - ${p.title}`));
  console.log(`Plans (${plans.length}):`);
  plans.forEach((p) => console.log(`  - ${p.title}`));
  console.log(`Newsletter subscribers (${subscribers.length}):`);
  subscribers.forEach((s) => console.log(`  - ${s.email}`));

  if (!apply) {
    console.log("\nRe-run with --yes to delete these. Real accounts and your own uploads are not touched.");
    await db.end();
    return;
  }

  await db.beginTransaction();
  try {
    if (users.length) await db.query("DELETE FROM users WHERE id IN (?)", [users.map((u) => u.id)]);
    if (properties.length) await db.query("DELETE FROM properties WHERE id IN (?)", [properties.map((p) => p.id)]);
    if (plans.length) await db.query("DELETE FROM plans WHERE id IN (?)", [plans.map((p) => p.id)]);
    if (subscribers.length) await db.query("DELETE FROM newsletter_subscribers WHERE id IN (?)", [subscribers.map((s) => s.id)]);
    await db.commit();
  } catch (err) {
    await db.rollback();
    throw err;
  }
  console.log("\n✅ Sample data removed.");

  if (pruneUploads) {
    const referenced = await referencedUploadFiles(db);
    let removed = 0;
    for (const file of fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : []) {
      if (file === ".gitkeep" || referenced.has(file)) continue;
      fs.unlinkSync(path.join(uploadsDir, file));
      removed += 1;
    }
    console.log(`🧹 Removed ${removed} uploaded file(s) that nothing references any more.`);
  }

  await db.end();
}

main().catch((err) => {
  console.error("❌ clean-samples failed:", err.message);
  process.exitCode = 1;
});
