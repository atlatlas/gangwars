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
  statPoints: integer("stat_points").default(1).notNull(),
  strength: integer("strength").default(5).notNull(),
  agility: integer("agility").default(5).notNull(),
  intelligence: integer("intelligence").default(5).notNull(),
  charisma: integer("charisma").default(5).notNull(),
  endurance: integer("endurance").default(5).notNull(),
  specialization: text("specialization", { enum: ["enforcer", "dealer", "hacker"] }),
  jailUntil: text("jail_until"),
  jailPhonecallUsed: integer("jail_phonecall_used").default(0).notNull(),
  hospitalUntil: text("hospital_until"),
  bank: integer("bank").default(0).notNull(),
  createdAt: text("created_at").notNull(),
  lastActive: text("last_active").notNull(),
  avatarUrl: text("avatar_url"),
  highestNetWorth: integer("highest_net_worth").default(0).notNull(),
  totalInterestEarned: integer("total_interest_earned").default(0).notNull(),
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

export const skillCrimeDefinitions = sqliteTable("skill_crime_definitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  minLevel: integer("min_level").default(1).notNull(),
  turnCost: integer("turn_cost").notNull(),
  rewardMin: integer("reward_min").notNull(),
  rewardMax: integer("reward_max").notNull(),
  timingSpeed: real("timing_speed").notNull(),
});

export const skillCrimeLog = sqliteTable("skill_crime_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  crimeId: integer("crime_id").notNull().references(() => skillCrimeDefinitions.id),
  accuracy: real("accuracy").notNull(),
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
  type: text("type", { enum: ["arm", "drug", "footman", "drug_dealer", "hoe", "pimp"] }).notNull(),
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
  earnedCrimes: integer("earned_crimes").default(0).notNull(),
  earnedPvp: integer("earned_pvp").default(0).notNull(),
  earnedDrugs: integer("earned_drugs").default(0).notNull(),
  earnedHoes: integer("earned_hoes").default(0).notNull(),
  earnedCasino: integer("earned_casino").default(0).notNull(),
  earnedGang: integer("earned_gang").default(0).notNull(),
  respectCrimes: integer("respect_crimes").default(0).notNull(),
  respectPvp: integer("respect_pvp").default(0).notNull(),
  respectMilestones: integer("respect_milestones").default(0).notNull(),
  respectGang: integer("respect_gang").default(0).notNull(),
  respectSkills: integer("respect_skills").default(0).notNull(),
});

export const gangs = sqliteTable("gangs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").unique().notNull(),
  tag: text("tag").unique().notNull(),
  description: text("description").default("").notNull(),
  level: integer("level").default(1).notNull(),
  maxMembers: integer("max_members").default(10).notNull(),
  leaderId: integer("leader_id").notNull().references(() => users.id),
  vault: integer("vault").default(0).notNull(),
  reputation: integer("reputation").default(0).notNull(),
  createdAt: text("created_at").notNull(),
  bannerUrl: text("banner_url"),
  accountantId: integer("accountant_id"),
  lastSalaryPayout: text("last_salary_payout"),
  investmentsOpen: integer("investments_open").default(0).notNull(),
  investorShare: integer("investor_share").default(30).notNull(),
  totalInvestments: integer("total_investments").default(0).notNull(),
});

export const gangMembers = sqliteTable("gang_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").unique().notNull().references(() => users.id),
  gangId: integer("gang_id").notNull().references(() => gangs.id),
  role: text("role", { enum: ["leader", "lieutenant", "enforcer", "member"] }).notNull(),
  joinedAt: text("joined_at").notNull(),
  lastRespectPayout: text("last_respect_payout"),
  salary: integer("salary").default(0).notNull(),
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

export const gangJoinRequests = sqliteTable("gang_join_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gangId: integer("gang_id").notNull().references(() => gangs.id),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status", { enum: ["pending", "accepted", "declined"] }).default("pending").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  joinReqGangIdx: index("join_req_gang_idx").on(table.gangId),
  joinReqUserIdx: index("join_req_user_idx").on(table.userId),
  joinReqUnique: uniqueIndex("join_req_unique").on(table.gangId, table.userId, table.status),
}));

export const gangInvestments = sqliteTable("gang_investments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gangId: integer("gang_id").notNull().references(() => gangs.id),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  returnsEarned: integer("returns_earned").default(0).notNull(),
  investedAt: text("invested_at").notNull(),
}, (table) => ({
  invGangIdx: index("inv_gang_idx").on(table.gangId),
  invUserIdx: index("inv_user_idx").on(table.userId),
  invGangUserUnique: uniqueIndex("inv_gang_user_unique").on(table.gangId, table.userId),
}));

export const gangOperationDefs = sqliteTable("gang_operation_defs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  skillId: integer("skill_id").notNull().references(() => skillDefinitions.id),
  minSkillLevel: integer("min_skill_level").notNull(),
  dailyTaskType: text("daily_task_type", { enum: ["pvp_win", "crime", "train_skill"] }).notNull(),
  dailyTaskDescription: text("daily_task_description").notNull(),
  incomePerMemberL1: integer("income_per_member_l1").notNull(),
  minSkillLevelL2: integer("min_skill_level_l2").notNull(),
  incomePerMemberL2: integer("income_per_member_l2").notNull(),
  upgradeCostL1toL2: integer("upgrade_cost_l1_to_l2").notNull(),
  minSkillLevelL3: integer("min_skill_level_l3").notNull(),
  incomePerMemberL3: integer("income_per_member_l3").notNull(),
  upgradeCostL2toL3: integer("upgrade_cost_l2_to_l3").notNull(),
});

export const gangOperationReqs = sqliteTable("gang_operation_reqs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  operationDefId: integer("operation_def_id").notNull().references(() => gangOperationDefs.id),
  skillId: integer("skill_id").notNull().references(() => skillDefinitions.id),
  minLevel: integer("min_level").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => ({
  opReqsDefIdx: index("op_reqs_def_idx").on(table.operationDefId, table.sortOrder),
}));

export const gangActiveOperations = sqliteTable("gang_active_operations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gangId: integer("gang_id").notNull().references(() => gangs.id),
  operationDefId: integer("operation_def_id").notNull().references(() => gangOperationDefs.id),
  level: integer("level").default(1).notNull(),
  startedAt: text("started_at").notNull(),
  lastPayoutAt: text("last_payout_at"),
}, (table) => ({
  activeOpGangIdx: index("active_op_gang_idx").on(table.gangId),
}));

export const gangOperationAssignments = sqliteTable("gang_operation_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gangId: integer("gang_id").notNull().references(() => gangs.id),
  activeOperationId: integer("active_operation_id").notNull().references(() => gangActiveOperations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  assignedAt: text("assigned_at").notNull(),
}, (table) => ({
  assignOpIdx: index("assign_op_idx").on(table.activeOperationId),
  assignUserIdx: index("assign_user_idx").on(table.gangId, table.userId),
}));

export const gangDailyTasks = sqliteTable("gang_daily_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gangId: integer("gang_id").notNull().references(() => gangs.id),
  userId: integer("user_id").notNull().references(() => users.id),
  operationDefId: integer("operation_def_id").notNull().references(() => gangOperationDefs.id),
  taskDate: text("task_date").notNull(),
  completed: integer("completed", { mode: "boolean" }).default(false).notNull(),
  verifiedAt: text("verified_at"),
}, (table) => ({
  dailyTaskUserDateIdx: index("daily_task_user_date_idx").on(table.userId, table.taskDate),
  dailyTaskGangDateIdx: index("daily_task_gang_date_idx").on(table.gangId, table.taskDate),
  dailyTaskUnique: uniqueIndex("daily_task_unique").on(table.userId, table.operationDefId, table.taskDate),
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

export const activityEvents = sqliteTable("activity_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  message: text("message").notNull(),
  metadata: text("metadata"),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  userIdIdx: index("activity_events_user_id_idx").on(table.userId),
  createdAtIdx: index("activity_events_created_at_idx").on(table.createdAt),
}));

export const gangOperationPayouts = sqliteTable("gang_operation_payouts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gangId: integer("gang_id").notNull().references(() => gangs.id),
  operationDefId: integer("operation_def_id").notNull().references(() => gangOperationDefs.id),
  level: integer("level").notNull(),
  amountPerMember: integer("amount_per_member").notNull(),
  totalPayout: integer("total_payout").notNull(),
  eligibleMemberCount: integer("eligible_member_count").notNull(),
  paidAt: text("paid_at").notNull(),
}, (table) => ({
  payoutsGangIdx: index("payouts_gang_idx").on(table.gangId),
  payoutsPaidAtIdx: index("payouts_paid_at_idx").on(table.paidAt),
}));

export const turfDistricts = sqliteTable("turf_districts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  claimCost: integer("claim_cost").notNull(),
  crimeBonus: real("crime_bonus").default(0).notNull(),
  pvpBonus: real("pvp_bonus").default(0).notNull(),
  incomeBonus: real("income_bonus").default(0).notNull(),
});

export const gangTurf = sqliteTable("gang_turf", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gangId: integer("gang_id").notNull().references(() => gangs.id),
  districtId: integer("district_id").notNull().references(() => turfDistricts.id).unique(),
  claimedAt: text("claimed_at").notNull(),
  challengedBy: integer("challenged_by").references(() => gangs.id),
  challengeExpiresAt: text("challenge_expires_at"),
  influence: integer("influence").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  lastInfluenceTick: text("last_influence_tick"),
}, (table) => ({
  turfGangIdx: index("turf_gang_idx").on(table.gangId),
}));

export const gangArsenal = sqliteTable("gang_arsenal", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gangId: integer("gang_id").notNull().references(() => gangs.id),
  name: text("name").notNull(),
  type: text("type", { enum: ["melee", "firearm", "explosive", "armor"] }).notNull(),
  durability: integer("durability").default(100).notNull(),
  maxDurability: integer("max_durability").default(100).notNull(),
  pvpPower: integer("pvp_power").notNull(),
  crimeBonus: integer("crime_bonus").default(0).notNull(),
  purchasePrice: integer("purchase_price").notNull(),
  purchasedAt: text("purchased_at").notNull(),
  lastRepairAt: text("last_repair_at"),
  equippedBy: integer("equipped_by").references(() => users.id),
  assignedTurfId: integer("assigned_turf_id").references(() => turfDistricts.id),
}, (table) => ({
  arsenalGangIdx: index("arsenal_gang_idx").on(table.gangId),
  arsenalEquippedIdx: index("arsenal_equipped_idx").on(table.equippedBy),
}));

export const gangArsenalLog = sqliteTable("gang_arsenal_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  arsenalId: integer("arsenal_id").notNull().references(() => gangArsenal.id),
  gangId: integer("gang_id").notNull().references(() => gangs.id),
  action: text("action", { enum: ["purchase", "equip", "unequip", "repair", "broken", "durability_loss"] }).notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  details: text("details"),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  arsenalLogGangIdx: index("arsenal_log_gang_idx").on(table.gangId),
  arsenalLogArsenalIdx: index("arsenal_log_arsenal_idx").on(table.arsenalId),
}));

export const gangContracts = sqliteTable("gang_contracts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gangId: integer("gang_id").notNull().references(() => gangs.id).unique(),
  contractType: text("contract_type", { enum: ["earn_cash", "pvp_wins", "vault_deposits", "crimes"] }).notNull(),
  target: integer("target").notNull(),
  progress: integer("progress").default(0).notNull(),
  weekStart: text("week_start").notNull(),
  deadline: text("deadline").notNull(),
  completed: integer("completed").default(0).notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  contractGangIdx: uniqueIndex("contract_gang_idx").on(table.gangId),
}));

export const gangContractContributors = sqliteTable("gang_contract_contributors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contractId: integer("contract_id").notNull().references(() => gangContracts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  contribution: integer("contribution").default(0).notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  contributorUniqueIdx: uniqueIndex("contributor_unique_idx").on(table.contractId, table.userId),
}));

export const feedbackComments = sqliteTable("feedback_comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  feedbackId: integer("feedback_id").notNull().references(() => feedback.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  feedbackIdx: index("idx_feedback_comments_feedback").on(table.feedbackId),
}));

export const feedbackCommentVotes = sqliteTable("feedback_comment_votes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  commentId: integer("comment_id").notNull().references(() => feedbackComments.id),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  commentVoteUnique: uniqueIndex("idx_comment_votes_unique").on(table.commentId, table.userId),
  commentIdx: index("idx_comment_votes_comment").on(table.commentId),
}));

export const feedback = sqliteTable("feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["suggestion", "bug"] }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  votes: integer("votes").default(1).notNull(),
  status: text("status", { enum: ["open", "under-review", "planned", "completed", "declined"] }).default("open").notNull(),
  createdAt: text("created_at").notNull(),
});

// ─── Trading Terminal ───────────────────────────────────────────

export const tradingAccounts = sqliteTable("trading_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").unique().notNull().references(() => users.id),
  balance: integer("balance").default(0).notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  tradingAccUserIdIdx: uniqueIndex("trading_acc_user_idx").on(table.userId),
}));

export const tradingAssets = sqliteTable("trading_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").unique().notNull(),
  name: text("name").notNull(),
  category: text("category", { enum: ["drug", "weapon", "luxury", "crypto", "gang_stock", "contraband"] }).notNull(),
  basePrice: integer("base_price").notNull(),
  currentPrice: integer("current_price").notNull(),
  previousPrice: integer("previous_price"),
  priceVolatility: real("price_volatility").default(0.3).notNull(),
  lastTickAt: text("last_tick_at").notNull(),
  minPrice: integer("min_price").default(1).notNull(),
  maxPrice: integer("max_price"),
  itemId: integer("item_id").references(() => items.id),
  tickSize: real("tick_size").default(1).notNull(),
  lotSize: integer("lot_size").default(1).notNull(),
});

export const tradingPositions = sqliteTable("trading_positions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  assetId: integer("asset_id").notNull().references(() => tradingAssets.id),
  quantity: integer("quantity").notNull(),
  avgEntryPrice: integer("avg_entry_price").notNull(),
  unrealizedPnl: integer("unrealized_pnl").default(0).notNull(),
  openedAt: text("opened_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  tPosUserAssetIdx: uniqueIndex("t_pos_user_asset_idx").on(table.userId, table.assetId),
}));

export const tradingOrders = sqliteTable("trading_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  assetId: integer("asset_id").notNull().references(() => tradingAssets.id),
  type: text("type", { enum: ["market", "limit", "stop_loss", "take_profit"] }).notNull(),
  side: text("side", { enum: ["buy", "sell"] }).notNull(),
  status: text("status", { enum: ["open", "filled", "cancelled", "expired", "triggered"] }).notNull(),
  quantity: integer("quantity").notNull(),
  filledQuantity: integer("filled_quantity").default(0).notNull(),
  price: integer("price"),
  stopPrice: integer("stop_price"),
  filledAt: text("filled_at"),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  tOrdUserIdIdx: index("t_ord_user_idx").on(table.userId),
  tOrdAssetStatusIdx: index("t_ord_asset_status_idx").on(table.assetId, table.status),
}));

export const tradingFills = sqliteTable("trading_fills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => tradingOrders.id),
  userId: integer("user_id").notNull().references(() => users.id),
  assetId: integer("asset_id").notNull().references(() => tradingAssets.id),
  side: text("side", { enum: ["buy", "sell"] }).notNull(),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(),
  total: integer("total").notNull(),
  pnl: integer("pnl").default(0).notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  tFillUserIdIdx: index("t_fill_user_idx").on(table.userId),
  tFillAssetIdIdx: index("t_fill_asset_idx").on(table.assetId),
  tFillOrderIdIdx: index("t_fill_order_idx").on(table.orderId),
}));

export const tradingPriceHistory = sqliteTable("trading_price_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assetId: integer("asset_id").notNull().references(() => tradingAssets.id),
  price: integer("price").notNull(),
  volume: integer("volume").default(0).notNull(),
  recordedAt: text("recorded_at").notNull(),
}, (table) => ({
  tphAssetIdx: index("tph_asset_idx").on(table.assetId),
  tphTimeIdx: index("tph_time_idx").on(table.recordedAt),
}));

export const gangAttacks = sqliteTable("gang_attacks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  attackerGangId: integer("attacker_gang_id").notNull().references(() => gangs.id),
  defenderGangId: integer("defender_gang_id").notNull().references(() => gangs.id),
  attackType: text("attack_type", { enum: ["raid", "sabotage"] }).notNull(),
  attackerPower: integer("attacker_power").notNull(),
  defenderPower: integer("defender_power").notNull(),
  attackerWon: integer("attacker_won", { mode: "boolean" }).notNull(),
  lootVault: integer("loot_vault").default(0).notNull(),
  reputationChange: integer("reputation_change").default(0).notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  gangAttackAttackerIdx: index("gang_attack_attacker_idx").on(table.attackerGangId),
  gangAttackDefenderIdx: index("gang_attack_defender_idx").on(table.defenderGangId),
}));

export const gangAttackCooldowns = sqliteTable("gang_attack_cooldowns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  attackerGangId: integer("attacker_gang_id").notNull().references(() => gangs.id),
  defenderGangId: integer("defender_gang_id").notNull().references(() => gangs.id),
  attackType: text("attack_type", { enum: ["raid", "sabotage"] }).notNull(),
  expiresAt: text("expires_at").notNull(),
}, (table) => ({
  cooldownAttackerDefenderIdx: uniqueIndex("cooldown_attacker_defender_idx").on(table.attackerGangId, table.defenderGangId, table.attackType),
}));
