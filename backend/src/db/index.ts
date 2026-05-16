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

// Earnings & respect breakdown columns
try { sqlite.exec("ALTER TABLE player_stats ADD COLUMN earned_crimes INTEGER DEFAULT 0 NOT NULL"); } catch {}
try { sqlite.exec("ALTER TABLE player_stats ADD COLUMN earned_pvp INTEGER DEFAULT 0 NOT NULL"); } catch {}
try { sqlite.exec("ALTER TABLE player_stats ADD COLUMN earned_drugs INTEGER DEFAULT 0 NOT NULL"); } catch {}
try { sqlite.exec("ALTER TABLE player_stats ADD COLUMN earned_hoes INTEGER DEFAULT 0 NOT NULL"); } catch {}
try { sqlite.exec("ALTER TABLE player_stats ADD COLUMN earned_casino INTEGER DEFAULT 0 NOT NULL"); } catch {}
try { sqlite.exec("ALTER TABLE player_stats ADD COLUMN earned_gang INTEGER DEFAULT 0 NOT NULL"); } catch {}
try { sqlite.exec("ALTER TABLE player_stats ADD COLUMN respect_crimes INTEGER DEFAULT 0 NOT NULL"); } catch {}
try { sqlite.exec("ALTER TABLE player_stats ADD COLUMN respect_pvp INTEGER DEFAULT 0 NOT NULL"); } catch {}
try { sqlite.exec("ALTER TABLE player_stats ADD COLUMN respect_milestones INTEGER DEFAULT 0 NOT NULL"); } catch {}
try { sqlite.exec("ALTER TABLE player_stats ADD COLUMN respect_gang INTEGER DEFAULT 0 NOT NULL"); } catch {}
try { sqlite.exec("ALTER TABLE player_stats ADD COLUMN respect_skills INTEGER DEFAULT 0 NOT NULL"); } catch {}

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

// ─── feedback comments ───
sqlite.exec(`CREATE TABLE IF NOT EXISTS feedback_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feedback_id INTEGER NOT NULL REFERENCES feedback(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
)`);
try {
  sqlite.exec("CREATE INDEX IF NOT EXISTS idx_feedback_comments_feedback ON feedback_comments(feedback_id)");
} catch {}

sqlite.exec(`CREATE TABLE IF NOT EXISTS feedback_comment_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL REFERENCES feedback_comments(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
)`);
try {
  sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_votes_unique ON feedback_comment_votes(comment_id, user_id)");
} catch {}
try {
  sqlite.exec("CREATE INDEX IF NOT EXISTS idx_comment_votes_comment ON feedback_comment_votes(comment_id)");
} catch {}

// Turf influence system
try { sqlite.exec("ALTER TABLE gang_turf ADD COLUMN influence INTEGER DEFAULT 0 NOT NULL"); } catch {}
try { sqlite.exec("ALTER TABLE gang_turf ADD COLUMN level INTEGER DEFAULT 1 NOT NULL"); } catch {}
try { sqlite.exec("ALTER TABLE gang_turf ADD COLUMN last_influence_tick TEXT"); } catch {}

// Turf income
try { sqlite.exec("ALTER TABLE gang_turf ADD COLUMN last_turf_income_at TEXT"); } catch {}

// ─── Gang arsenal ───
sqlite.exec(`CREATE TABLE IF NOT EXISTS gang_arsenal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gang_id INTEGER NOT NULL REFERENCES gangs(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  pvp_power INTEGER DEFAULT 10 NOT NULL,
  crime_bonus INTEGER DEFAULT 0 NOT NULL,
  durability INTEGER DEFAULT 10 NOT NULL,
  max_durability INTEGER DEFAULT 10 NOT NULL,
  equipped_by INTEGER REFERENCES users(id),
  assigned_turf_id INTEGER REFERENCES gang_turf(id),
  purchased_at TEXT NOT NULL
)`);
sqlite.exec(`CREATE TABLE IF NOT EXISTS gang_arsenal_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  arsenal_id INTEGER NOT NULL REFERENCES gang_arsenal(id),
  gang_id INTEGER NOT NULL REFERENCES gangs(id),
  action TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  details TEXT,
  created_at TEXT NOT NULL
)`);

// ─── Gang attacks ───
sqlite.exec(`CREATE TABLE IF NOT EXISTS gang_attacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attacker_gang_id INTEGER NOT NULL REFERENCES gangs(id),
  defender_gang_id INTEGER NOT NULL REFERENCES gangs(id),
  attack_type TEXT NOT NULL,
  attacker_power INTEGER NOT NULL,
  defender_power INTEGER NOT NULL,
  attacker_won INTEGER NOT NULL DEFAULT 0,
  loot_vault INTEGER DEFAULT 0 NOT NULL,
  reputation_change INTEGER DEFAULT 0 NOT NULL,
  created_at TEXT NOT NULL
)`);
sqlite.exec(`CREATE TABLE IF NOT EXISTS gang_attack_cooldowns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attacker_gang_id INTEGER NOT NULL REFERENCES gangs(id),
  defender_gang_id INTEGER NOT NULL REFERENCES gangs(id),
  attack_type TEXT NOT NULL,
  expires_at TEXT NOT NULL
)`)

// ─── Cleanup: remove test feedback entries ───
try {
  const testRows = sqlite.prepare("SELECT id FROM feedback WHERE title = ? OR title LIKE ?")
    .all("gacheck1778794242", "%testinvest%") as { id: number }[];
  if (testRows.length > 0) {
    const ids = testRows.map(r => r.id);
    const del = (sql: string) => sqlite.prepare(sql).run(...ids);
    del(`DELETE FROM feedback_comment_votes WHERE comment_id IN (SELECT id FROM feedback_comments WHERE feedback_id IN (${ids.map(() => "?").join(",")}))`);
    del(`DELETE FROM feedback_comments WHERE feedback_id IN (${ids.map(() => "?").join(",")})`);
    del(`DELETE FROM feedback WHERE id IN (${ids.map(() => "?").join(",")})`);
    console.log(`Cleaned up ${ids.length} test feedback entries`);
  }
} catch (e: any) {
  console.log("Feedback cleanup skipped:", e.message);
}

// ─── trading terminal tables ───
sqlite.exec(`CREATE TABLE IF NOT EXISTS trading_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  balance INTEGER DEFAULT 0 NOT NULL,
  created_at TEXT NOT NULL
)`);
try { sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS trading_acc_user_idx ON trading_accounts(user_id)"); } catch {}

sqlite.exec(`CREATE TABLE IF NOT EXISTS trading_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('drug','weapon','luxury','crypto','gang_stock','contraband')),
  base_price INTEGER NOT NULL,
  current_price INTEGER NOT NULL,
  previous_price INTEGER,
  price_volatility REAL DEFAULT 0.3 NOT NULL,
  last_tick_at TEXT NOT NULL,
  min_price INTEGER DEFAULT 1 NOT NULL,
  max_price INTEGER,
  item_id INTEGER REFERENCES items(id),
  tick_size REAL DEFAULT 1 NOT NULL,
  lot_size INTEGER DEFAULT 1 NOT NULL
)`);

sqlite.exec(`CREATE TABLE IF NOT EXISTS trading_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  asset_id INTEGER NOT NULL REFERENCES trading_assets(id),
  quantity INTEGER NOT NULL,
  avg_entry_price INTEGER NOT NULL,
  unrealized_pnl INTEGER DEFAULT 0 NOT NULL,
  opened_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`);
try { sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS t_pos_user_asset_idx ON trading_positions(user_id, asset_id)"); } catch {}

sqlite.exec(`CREATE TABLE IF NOT EXISTS trading_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  asset_id INTEGER NOT NULL REFERENCES trading_assets(id),
  type TEXT NOT NULL CHECK(type IN ('market','limit','stop_loss','take_profit')),
  side TEXT NOT NULL CHECK(side IN ('buy','sell')),
  status TEXT NOT NULL CHECK(status IN ('open','filled','cancelled','expired','triggered')),
  quantity INTEGER NOT NULL,
  filled_quantity INTEGER DEFAULT 0 NOT NULL,
  price INTEGER,
  stop_price INTEGER,
  filled_at TEXT,
  created_at TEXT NOT NULL
)`);
try { sqlite.exec("CREATE INDEX IF NOT EXISTS t_ord_user_idx ON trading_orders(user_id)"); } catch {}
try { sqlite.exec("CREATE INDEX IF NOT EXISTS t_ord_asset_status_idx ON trading_orders(asset_id, status)"); } catch {}

sqlite.exec(`CREATE TABLE IF NOT EXISTS trading_fills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES trading_orders(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  asset_id INTEGER NOT NULL REFERENCES trading_assets(id),
  side TEXT NOT NULL CHECK(side IN ('buy','sell')),
  quantity INTEGER NOT NULL,
  price INTEGER NOT NULL,
  total INTEGER NOT NULL,
  pnl INTEGER DEFAULT 0 NOT NULL,
  created_at TEXT NOT NULL
)`);
try { sqlite.exec("CREATE INDEX IF NOT EXISTS t_fill_user_idx ON trading_fills(user_id)"); } catch {}
try { sqlite.exec("CREATE INDEX IF NOT EXISTS t_fill_asset_idx ON trading_fills(asset_id)"); } catch {}
try { sqlite.exec("CREATE INDEX IF NOT EXISTS t_fill_order_idx ON trading_fills(order_id)"); } catch {}

sqlite.exec(`CREATE TABLE IF NOT EXISTS trading_price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL REFERENCES trading_assets(id),
  price INTEGER NOT NULL,
  volume INTEGER DEFAULT 0 NOT NULL,
  recorded_at TEXT NOT NULL
)`);
try { sqlite.exec("CREATE INDEX IF NOT EXISTS tph_asset_idx ON trading_price_history(asset_id)"); } catch {}
try { sqlite.exec("CREATE INDEX IF NOT EXISTS tph_time_idx ON trading_price_history(recorded_at)"); } catch {}

// ─── Operation system tables ───
sqlite.exec(`CREATE TABLE IF NOT EXISTS gang_operation_defs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  skill_id INTEGER NOT NULL REFERENCES skill_definitions(id),
  min_skill_level INTEGER NOT NULL,
  daily_task_type TEXT NOT NULL,
  daily_task_description TEXT NOT NULL,
  income_per_member_l1 INTEGER NOT NULL,
  min_skill_level_l2 INTEGER NOT NULL,
  income_per_member_l2 INTEGER NOT NULL,
  upgrade_cost_l1_to_l2 INTEGER NOT NULL,
  min_skill_level_l3 INTEGER NOT NULL,
  income_per_member_l3 INTEGER NOT NULL,
  upgrade_cost_l2_to_l3 INTEGER NOT NULL
)`);
sqlite.exec(`CREATE TABLE IF NOT EXISTS gang_operation_reqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_def_id INTEGER NOT NULL REFERENCES gang_operation_defs(id),
  skill_id INTEGER NOT NULL REFERENCES skill_definitions(id),
  min_level INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL
)`);
// Fix: old schema had UNIQUE on gang_id — remove it by recreating the table
// (ALTER TABLE in SQLite can't drop constraints directly)
try {
  const oldSql = sqlite.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='gang_active_operations'").all() as any[];
  if (oldSql.length > 0 && oldSql[0].sql.includes("UNIQUE")) {
    sqlite.exec("ALTER TABLE gang_active_operations RENAME TO gang_active_operations_old");
    sqlite.exec(`CREATE TABLE gang_active_operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gang_id INTEGER NOT NULL REFERENCES gangs(id),
      operation_def_id INTEGER NOT NULL REFERENCES gang_operation_defs(id),
      level INTEGER DEFAULT 1 NOT NULL,
      started_at TEXT NOT NULL,
      last_payout_at TEXT
    )`);
    sqlite.exec("PRAGMA foreign_keys=OFF");
    sqlite.exec("INSERT INTO gang_active_operations SELECT * FROM gang_active_operations_old");
    sqlite.exec("PRAGMA foreign_keys=ON");
    sqlite.exec("DROP TABLE gang_active_operations_old");
    console.log("Migrated gang_active_operations — removed UNIQUE on gang_id");
  }
} catch (e) {
  console.log("gang_active_operations migration skipped:", e);
}
sqlite.exec(`CREATE TABLE IF NOT EXISTS gang_active_operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gang_id INTEGER NOT NULL REFERENCES gangs(id),
  operation_def_id INTEGER NOT NULL REFERENCES gang_operation_defs(id),
  level INTEGER DEFAULT 1 NOT NULL,
  started_at TEXT NOT NULL,
  last_payout_at TEXT
)`);
sqlite.exec(`CREATE TABLE IF NOT EXISTS gang_operation_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gang_id INTEGER NOT NULL REFERENCES gangs(id),
  active_operation_id INTEGER NOT NULL REFERENCES gang_active_operations(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  assigned_at TEXT NOT NULL
)`);
try { sqlite.exec("DROP INDEX IF EXISTS assign_user_unique"); } catch {}
try { sqlite.exec("CREATE INDEX IF NOT EXISTS assign_user_idx ON gang_operation_assignments(gang_id, user_id)"); } catch {}
sqlite.exec(`CREATE TABLE IF NOT EXISTS gang_daily_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gang_id INTEGER NOT NULL REFERENCES gangs(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  operation_def_id INTEGER NOT NULL REFERENCES gang_operation_defs(id),
  task_date TEXT NOT NULL,
  completed INTEGER DEFAULT 0 NOT NULL,
  verified_at TEXT
)`);
sqlite.exec(`CREATE TABLE IF NOT EXISTS gang_operation_payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gang_id INTEGER NOT NULL REFERENCES gangs(id),
  operation_def_id INTEGER NOT NULL REFERENCES gang_operation_defs(id),
  level INTEGER NOT NULL,
  amount_per_member INTEGER NOT NULL,
  total_payout INTEGER NOT NULL,
  eligible_member_count INTEGER NOT NULL,
  paid_at TEXT NOT NULL
)`);

export const db = drizzle(sqlite, { schema });
export { schema };
