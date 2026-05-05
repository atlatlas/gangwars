import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  level: integer("level").default(1).notNull(),
  xp: integer("xp").default(0).notNull(),
  turns: integer("turns").default(100).notNull(),
  lastTurnRegen: text("last_turn_regen").notNull(),
  cash: integer("cash").default(2000).notNull(),
  respect: integer("respect").default(0).notNull(),
  hp: integer("hp").default(100).notNull(),
  maxHp: integer("max_hp").default(100).notNull(),
  statPoints: integer("stat_points").default(5).notNull(),
  strength: integer("strength").default(1).notNull(),
  agility: integer("agility").default(1).notNull(),
  intelligence: integer("intelligence").default(1).notNull(),
  charisma: integer("charisma").default(1).notNull(),
  endurance: integer("endurance").default(1).notNull(),
  specialization: text("specialization", { enum: ["enforcer", "dealer", "hacker"] }),
  jailUntil: text("jail_until"),
  hospitalUntil: text("hospital_until"),
  bank: integer("bank").default(0).notNull(),
  createdAt: text("created_at").notNull(),
  lastActive: text("last_active").notNull(),
  avatarUrl: text("avatar_url"),
});

export const crimeDefinitions = sqliteTable("crime_definitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  minLevel: integer("min_level").default(1).notNull(),
  turnCost: integer("turn_cost").notNull(),
  statUsed: text("stat_used", { enum: ["strength", "agility", "intelligence", "charisma"] }).notNull(),
  baseDifficulty: integer("base_difficulty").notNull(),
  rewardMin: integer("reward_min").notNull(),
  rewardMax: integer("reward_max").notNull(),
  riskLevel: text("risk_level", { enum: ["low", "medium", "high"] }).notNull(),
  cooldownMinutes: integer("cooldown_minutes").default(0).notNull(),
});

export const crimeLog = sqliteTable("crime_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  crimeId: integer("crime_id").notNull().references(() => crimeDefinitions.id),
  success: integer("success", { mode: "boolean" }).notNull(),
  reward: integer("reward").notNull(),
  xpGained: integer("xp_gained").notNull(),
  createdAt: text("created_at").notNull(),
});

export const pvpLog = sqliteTable("pvp_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  attackerId: integer("attacker_id").notNull().references(() => users.id),
  defenderId: integer("defender_id").notNull().references(() => users.id),
  attackType: text("attack_type", { enum: ["mug", "ambush", "rob", "hit", "spy", "house_raid"] }).notNull(),
  attackerWin: integer("attacker_win", { mode: "boolean" }).notNull(),
  lootCash: integer("loot_cash"),
  respectChange: integer("respect_change").default(0).notNull(),
  damageDealt: integer("damage_dealt").default(0).notNull(),
  damageTaken: integer("damage_taken").default(0).notNull(),
  createdAt: text("created_at").notNull(),
});

export const retaliationLog = sqliteTable("retaliation_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  originalAttackerId: integer("original_attacker_id").notNull().references(() => users.id),
  defenderId: integer("defender_id").notNull().references(() => users.id),
  freeAttacksRemaining: integer("free_attacks_remaining").default(3).notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
}, (table) => ({
  retaliationPairIdx: index("retaliation_pair_idx").on(table.originalAttackerId, table.defenderId),
}));

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: integer("read", { mode: "boolean" }).default(false).notNull(),
  createdAt: text("created_at").notNull(),
});

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", { enum: ["arm", "drug", "footman", "drug_dealer", "hoe"] }).notNull(),
  description: text("description").notNull(),
  buyPrice: integer("buy_price").notNull(),
  sellPrice: integer("sell_price").default(0).notNull(),
  minLevel: integer("min_level").default(1).notNull(),
  minRespect: integer("min_respect").default(0).notNull(),
  effects: text("effects").notNull(), // JSON string of ItemEffects
  slot: text("slot", { enum: ["weapon"] }),
  basePrice: integer("base_price"),
  currentPrice: integer("current_price"),
  previousPrice: integer("previous_price"),
  priceVolatility: integer("price_volatility"),
  lastPriceUpdate: text("last_price_update"),
});

export const userInventory = sqliteTable("user_inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  itemId: integer("item_id").notNull().references(() => items.id),
  equipped: integer("equipped", { mode: "boolean" }).default(false).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  acquiredAt: text("acquired_at").notNull(),
  avgPurchasePrice: integer("avg_purchase_price"),
}, (table) => ({
  userIdIdx: index("idx_inv_user_id").on(table.userId),
  itemIdIdx: index("idx_inv_item_id").on(table.itemId),
  equippedIdx: index("idx_inv_equipped").on(table.equipped),
  userItemIdx: index("idx_inv_user_item").on(table.userId, table.itemId),
  userEquippedIdx: index("idx_inv_user_equipped").on(table.userId, table.equipped),
}));

export const playerStats = sqliteTable("player_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").unique().notNull().references(() => users.id),
  crimesCommitted: integer("crimes_committed").default(0).notNull(),
  pvpWins: integer("pvp_wins").default(0).notNull(),
  pvpLosses: integer("pvp_losses").default(0).notNull(),
  totalMoneyEarned: integer("total_money_earned").default(0).notNull(),
  totalMoneyLost: integer("total_money_lost").default(0).notNull(),
  timesArrested: integer("times_arrested").default(0).notNull(),
});

export const gangs = sqliteTable("gangs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").unique().notNull(),
  tag: text("tag").unique().notNull(),
  description: text("description").default("").notNull(),
  level: integer("level").default(1).notNull(),
  maxMembers: integer("max_members").default(10).notNull(),
  leaderId: integer("leader_id").notNull().references(() => users.id),
  createdAt: text("created_at").notNull(),
});

export const gangMembers = sqliteTable("gang_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").unique().notNull().references(() => users.id),
  gangId: integer("gang_id").notNull().references(() => gangs.id),
  role: text("role", { enum: ["leader", "lieutenant", "enforcer", "member"] }).notNull(),
  joinedAt: text("joined_at").notNull(),
}, (table) => ({
  gangIdIdx: index("gang_members_gang_id_idx").on(table.gangId),
}));

export const gangInvites = sqliteTable("gang_invites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gangId: integer("gang_id").notNull().references(() => gangs.id),
  userId: integer("user_id").notNull().references(() => users.id),
  invitedBy: integer("invited_by").notNull().references(() => users.id),
  status: text("status", { enum: ["pending", "accepted", "declined"] }).default("pending").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  gangInviteGangIdx: index("gang_invites_gang_idx").on(table.gangId),
  gangInviteUserIdx: index("gang_invites_user_idx").on(table.userId),
}));

export const skillDefinitions = sqliteTable("skill_definitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  statUsed: text("stat_used", { enum: ["strength", "agility", "intelligence", "charisma"] }).notNull(),
  baseXpPerTrain: integer("base_xp_per_train").notNull(),
  turnCost: integer("turn_cost").default(3).notNull(),
  maxLevel: integer("max_level").default(100).notNull(),
  difficulty: real("difficulty").default(1.0).notNull(),
});

export const userSkills = sqliteTable("user_skills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  skillId: integer("skill_id").notNull().references(() => skillDefinitions.id),
  level: integer("level").default(0).notNull(),
  xp: integer("xp").default(0).notNull(),
  lastTrainedAt: text("last_trained_at"),
}, (table) => ({
  userSkillIdx: index("user_skills_user_skill_idx").on(table.userId, table.skillId),
  userSkillUnique: uniqueIndex("user_skills_unique").on(table.userId, table.skillId),
}));

export const drugPriceHistory = sqliteTable("drug_price_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id").notNull().references(() => items.id),
  price: integer("price").notNull(),
  recordedAt: text("recorded_at").notNull(),
}, (table) => ({
  drugPriceIdx: index("drug_price_history_item_idx").on(table.itemId),
}));

export const drugNews = sqliteTable("drug_news", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  headline: text("headline").notNull(),
  body: text("body").notNull(),
  drugItemId: integer("drug_item_id"),
  effectType: text("effect_type", { enum: ["up", "down", "random"] }).notNull(),
  effectMagnitude: real("effect_magnitude").default(0.1).notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});
