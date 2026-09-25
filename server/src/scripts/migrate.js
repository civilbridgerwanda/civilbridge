import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "../../sql/schema.sql");
const SEED_MARKER = "-- ==SEED DATA BELOW==";

// Columns added to schema.sql *after* their table already existed for
// people who ran `npm run migrate` early in the project. `CREATE TABLE IF
// NOT EXISTS` does nothing once a table exists, so a new column in
// schema.sql alone never reaches an existing database - these explicit
// ALTER statements are what actually backfills it. Safe to re-run: a
// "Duplicate column" error just means it's already there.
//
// This has to run BETWEEN the table-creation half of schema.sql and the
// seed-data half: the seed INSERTs reference view_count, so on an old
// database that predates this column, running seeds before the backfill
// fails the same way querying it from the app would.
const columnBackfills = [
  "ALTER TABLE properties ADD COLUMN view_count INT DEFAULT 0",
  "ALTER TABLE experts ADD COLUMN view_count INT DEFAULT 0",
  "ALTER TABLE plans ADD COLUMN view_count INT DEFAULT 0",
  "ALTER TABLE users ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE",
  "ALTER TABLE users ADD COLUMN plan ENUM('starter', 'professional', 'business') NOT NULL DEFAULT 'starter'",
  "ALTER TABLE plan_inquiries ADD COLUMN assigned_expert_id CHAR(36) NULL",
  "ALTER TABLE estimates ADD COLUMN assigned_expert_id CHAR(36) NULL",
  "ALTER TABLE users MODIFY COLUMN role ENUM('client', 'expert', 'property_owner', 'admin') NOT NULL DEFAULT 'client'",
  "ALTER TABLE users ADD COLUMN credits_remaining INT NOT NULL DEFAULT 5",
  "ALTER TABLE users ADD COLUMN credits_reset_at TIMESTAMP NULL DEFAULT NULL",
  "ALTER TABLE users ADD COLUMN requested_plan ENUM('professional', 'business') NULL DEFAULT NULL",
  "ALTER TABLE properties ADD COLUMN images JSON NULL",
  "ALTER TABLE properties ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE properties ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT TRUE",
  "ALTER TABLE properties ADD COLUMN rating DECIMAL(2,1) DEFAULT 0.0",
  "ALTER TABLE properties ADD COLUMN review_count INT DEFAULT 0",
  "ALTER TABLE plans ADD COLUMN images JSON NULL",
  "ALTER TABLE plans ADD COLUMN document_url VARCHAR(500) NULL",
  "ALTER TABLE plans ADD COLUMN video_url VARCHAR(500) NULL",
  "ALTER TABLE plans ADD COLUMN zip_url VARCHAR(500) NULL",
  "ALTER TABLE plans ADD COLUMN description TEXT NULL",
  "ALTER TABLE payments ADD COLUMN payment_method VARCHAR(30) NULL",
  "ALTER TABLE payments ADD COLUMN target_plan VARCHAR(30) NULL",
  "ALTER TABLE payments ADD COLUMN notes VARCHAR(500) NULL",
  "ALTER TABLE plans ADD COLUMN review_count INT DEFAULT 0",
  "ALTER TABLE plans ADD COLUMN license_price DECIMAL(14,2) NULL",
  "ALTER TABLE plan_inquiries ADD COLUMN preferred_date DATETIME NULL",
  "ALTER TABLE ai_conversations ADD COLUMN share_token VARCHAR(32) NULL UNIQUE",
  // These three make the seed INSERTs below actually idempotent - see the
  // comments on these columns in schema.sql for why UUID() primary keys
  // alone don't stop `npm run migrate` from re-duplicating sample rows.
  "ALTER TABLE experts ADD UNIQUE KEY unique_expert_user (user_id)",
  "ALTER TABLE properties ADD UNIQUE KEY unique_property_image (image_url)",
  "ALTER TABLE plans ADD UNIQUE KEY unique_plan_image (image_url)",
];

// Catches a regression where a property/plan gets seeded with an image_url
// already used by another row - each listing is presented as distinct and
// individually priced, so its photo should be too. Reads image_url straight
// out of the raw INSERT statements in the seed half of schema.sql (rather
// than querying the seeded table), so it catches a duplicate introduced in
// schema.sql even before anyone runs it against a database.
function assertNoDuplicateImages(seedSql) {
  const urls = [...seedSql.matchAll(/'(https:\/\/images\.unsplash\.com\/[^']+)'/g)].map((m) => m[1]);
  const counts = new Map();
  for (const url of urls) counts.set(url, (counts.get(url) || 0) + 1);
  const duplicates = [...counts.entries()].filter(([, count]) => count > 1);
  if (duplicates.length > 0) {
    const lines = duplicates.map(([url, count]) => `  - ${url} (used ${count} times)`);
    throw new Error(
      `Seed data reuses the same image across multiple listings - every property/plan needs its own photo:\n${lines.join("\n")}`
    );
  }
}

/**
 * Runs sql/schema.sql against MySQL directly - no `mysql` CLI required.
 * This is the "npm run migrate" command; it's what actually creates the
 * database and tables. Sequelize (used everywhere else in the app) only
 * *queries* those tables once they exist - it does not create them.
 *
 * Runs in three ordered phases so each one can safely depend on the
 * previous having finished, rather than treating the whole file as one
 * black-box batch:
 *   1. Table creation (everything above the SEED_MARKER comment)
 *   2. Column backfills (see columnBackfills above)
 *   3. Seed data (everything below SEED_MARKER) - uses INSERT IGNORE
 *      everywhere, so re-running against a database that already has the
 *      sample rows silently skips them instead of throwing.
 */
async function migrate() {
  // Sample data is opt-in. The seed half of schema.sql includes fake
  // experts/listings AND three fixed accounts whose passwords/roles it
  // resets on every run - fine for a throwaway dev database, wrong for a
  // real one (deploy.sh runs this on every deploy). Run
  // `npm run migrate:sample` when you actually want the demo content.
  const withSampleData = process.argv.includes("--with-sample-data");
  const sql = fs.readFileSync(schemaPath, "utf8");
  const markerIndex = sql.indexOf(SEED_MARKER);
  if (markerIndex === -1) {
    console.error(`❌ Could not find "${SEED_MARKER}" in schema.sql - migrate.js and schema.sql are out of sync.`);
    process.exitCode = 1;
    return;
  }
  const schemaSql = sql.slice(0, markerIndex);
  const seedSql = sql.slice(markerIndex);

  if (withSampleData) {
    try {
      assertNoDuplicateImages(seedSql);
    } catch (err) {
      console.error(`❌ ${err.message}`);
      process.exitCode = 1;
      return;
    }
  }

  console.log(`Connecting to MySQL at ${process.env.DB_HOST || "127.0.0.1"}:${process.env.DB_PORT || 3306}...`);

  let connection;
  try {
    // Connect WITHOUT selecting a database yet, since schema.sql itself
    // creates the database with `CREATE DATABASE IF NOT EXISTS`.
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      multipleStatements: true,
    });
  } catch (err) {
    console.error("❌ Could not connect to MySQL:", err.message);
    if (err.code === "ER_ACCESS_DENIED_ERROR") {
      console.error(
        "\nThis means DB_USER/DB_PASSWORD in server/.env don't match your MySQL login.\n" +
          "On XAMPP, MySQL's root user often has NO password by default - try setting\n" +
          "DB_PASSWORD= (empty) in server/.env, or use whatever password you set for\n" +
          "root when you installed MySQL."
      );
    } else if (err.code === "ECONNREFUSED") {
      console.error(
        "\nCouldn't reach MySQL at all - make sure your MySQL server is actually\n" +
          "running (e.g. started in the XAMPP control panel) and that DB_HOST/DB_PORT\n" +
          "in server/.env match where it's listening."
      );
    }
    process.exitCode = 1;
    return;
  }

  try {
    console.log("1/3  Creating database and tables...");
    await connection.query(schemaSql);

    console.log("2/3  Backfilling any columns added since your last migrate...");
    for (const statement of columnBackfills) {
      try {
        await connection.query(statement);
      } catch (err) {
        // Column, or (for the UNIQUE KEY backfills) constraint, already
        // exists from a previous migrate run - fine either way.
        if (err.code !== "ER_DUP_FIELDNAME" && err.code !== "ER_DUP_KEYNAME") throw err;
      }
    }

    if (withSampleData) {
      console.log("3/3  Adding sample data (skips rows that already exist)...");
      await connection.query(seedSql);
      console.log("\n✅ Migration complete. Tables and sample data are ready.");
    } else {
      console.log("3/3  Skipping sample data (run `npm run migrate:sample` if you want demo content).");
      console.log("\n✅ Migration complete. Tables are ready and no sample data was added.");
    }
  } catch (err) {
    console.error("\n❌ Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

migrate();
