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
  sqlite.exec("ALTER TABLE users ADD COLUMN total_interest_earned INTEGER DEFAULT 0 NOT NULL");
} catch {
  // column already exists
}
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
try {
  sqlite.exec("ALTER TABLE gangs ADD COLUMN investments_open INTEGER DEFAULT 0 NOT NULL");
} catch {
  // column already exists
}
try {
  sqlite.exec("ALTER TABLE gangs ADD COLUMN investor_share INTEGER DEFAULT 30 NOT NULL");
} catch {
  // column already exists
}
try {
  sqlite.exec("ALTER TABLE gangs ADD COLUMN total_investments INTEGER DEFAULT 0 NOT NULL");
} catch {
  // column already exists
}

sqlite.exec(`CREATE TABLE IF NOT EXISTS gang_investments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gang_id INTEGER NOT NULL REFERENCES gangs(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  returns_earned INTEGER DEFAULT 0 NOT NULL,
  invested_at TEXT NOT NULL
)`);
try {
  sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS inv_gang_user_unique ON gang_investments(gang_id, user_id)");
} catch {}
try {
  sqlite.exec("CREATE INDEX IF NOT EXISTS inv_gang_idx ON gang_investments(gang_id)");
} catch {}
try {
  sqlite.exec("CREATE INDEX IF NOT EXISTS inv_user_idx ON gang_investments(user_id)");
} catch {}

export const db = drizzle(sqlite, { schema });
export { schema };
