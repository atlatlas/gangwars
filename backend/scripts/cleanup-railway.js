const Database = require("better-sqlite3");
const path = require("path");

const sqlite = new Database(path.join(__dirname, "..", "data", "gangwars.db"));
sqlite.pragma("journal_mode = WAL");

const users = sqlite.prepare("SELECT id, username, email FROM users").all();
console.log("All users:", JSON.stringify(users));

const demo = sqlite.prepare("SELECT id, username FROM users WHERE username = ?").get("demo");
if (demo) {
  console.log("Found demo user:", JSON.stringify(demo));
  sqlite.prepare("DELETE FROM crime_log WHERE user_id = ?").run(demo.id);
  sqlite.prepare("DELETE FROM skill_crime_log WHERE user_id = ?").run(demo.id);
  sqlite.prepare("DELETE FROM player_stats WHERE user_id = ?").run(demo.id);
  sqlite.prepare("DELETE FROM notifications WHERE user_id = ?").run(demo.id);
  sqlite.prepare("DELETE FROM activity_events WHERE user_id = ?").run(demo.id);
  sqlite.prepare("DELETE FROM user_inventory WHERE user_id = ?").run(demo.id);
  sqlite.prepare("DELETE FROM user_skills WHERE user_id = ?").run(demo.id);
  sqlite.prepare("DELETE FROM pvp_log WHERE attacker_id = ? OR defender_id = ?").run(demo.id, demo.id);
  sqlite.prepare("DELETE FROM retaliation_log WHERE original_attacker_id = ? OR defender_id = ?").run(demo.id, demo.id);
  sqlite.prepare("DELETE FROM gang_invites WHERE user_id = ? OR invited_by = ?").run(demo.id, demo.id);
  sqlite.prepare("DELETE FROM gang_join_requests WHERE user_id = ?").run(demo.id);
  sqlite.prepare("DELETE FROM gang_operation_assignments WHERE user_id = ?").run(demo.id);
  sqlite.prepare("DELETE FROM gang_daily_tasks WHERE user_id = ?").run(demo.id);
  sqlite.prepare("DELETE FROM gang_arsenal WHERE equipped_by = ?").run(demo.id);
  sqlite.prepare("DELETE FROM gang_contract_contributors WHERE user_id = ?").run(demo.id);
  sqlite.prepare("DELETE FROM gang_members WHERE user_id = ?").run(demo.id);
  sqlite.prepare("DELETE FROM users WHERE id = ?").run(demo.id);
  console.log("Demo user deleted successfully");
} else {
  console.log("No demo user found");
}

const remaining = sqlite.prepare("SELECT id, username FROM users").all();
console.log("Remaining users:", remaining.map(u => u.username));

sqlite.close();
