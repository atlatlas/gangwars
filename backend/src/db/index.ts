import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const dataDir = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(path.join(dataDir, "gangwars.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// ─── Auto-migrate: add columns ───
try {
  sqlite.exec("ALTER TABLE gangs ADD COLUMN banner_url TEXT");
} catch {
  // column already exists
}
try {
  sqlite.exec("ALTER TABLE gangs ADD COLUMN accountant_id INTEGER");
} catch {
  // column already exists
}
try {
  sqlite.exec("ALTER TABLE gangs ADD COLUMN last_salary_payout TEXT");
} catch {
  // column already exists
}
try {
  sqlite.exec("ALTER TABLE gang_members ADD COLUMN salary INTEGER DEFAULT 0 NOT NULL");
} catch {
  // column already exists
}

export const db = drizzle(sqlite, { schema });
export { schema };
