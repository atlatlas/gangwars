import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "gangwars.db");
const isNew = !fs.existsSync(dbPath);

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Run all migration SQL files in order
const migrationsDir = path.join(__dirname, "..", "migrations");
if (fs.existsSync(migrationsDir)) {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    const statements = sql.split("--> statement-breakpoint");
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed) {
        sqlite.exec(trimmed);
      }
    }
    console.log(`  ✓ ${file}`);
  }
}

sqlite.close();

if (isNew) {
  console.log("Database created and migrations applied.");
} else {
  console.log("Migrations applied to existing database.");
}
