export interface User {
  id: number;
  username: string;
  level: number;
  xp: number;
  turns: number;
  cash: number;
  respect: number;
  hp: number;
  maxHp: number;
  statPoints: number;
  strength: number;
  agility: number;
  intelligence: number;
  charisma: number;
  endurance: number;
  specialization: string | null;
  jailUntil: string | null;
  hospitalUntil: string | null;
  createdAt: string;
  lastActive: string;
  effectiveTurns?: number;
  nextTurnIn?: number;
  turnsGained?: number;
  xpNeeded?: number;
  jailTime?: number;
  hospitalTime?: number;
  stats?: PlayerStats;
  avatarUrl?: string | null;
  gangId?: number;
  gangName?: string;
  gangTag?: string;
  gangRole?: "leader" | "lieutenant" | "enforcer" | "member";
}

export interface PlayerStats {
  crimesCommitted: number;
  pvpWins: number;
  pvpLosses: number;
  totalMoneyEarned: number;
  totalMoneyLost: number;
  timesArrested: number;
}

export interface Crime {
  id: number;
  name: string;
  description: string;
  minLevel: number;
  turnCost: number;
  statUsed: string;
  baseDifficulty: number;
  rewardMin: number;
  rewardMax: number;
  riskLevel: "low" | "medium" | "high";
  successChance: number;
}

export interface CrimeResult {
  success: boolean;
  crimeName: string;
  reward: number;
  xpGained: number;
  hpLost: number;
  arrested: boolean;
  leveledUp: boolean;
  newLevel: number;
  turnsLeft: number;
  drugsConfiscated?: { name: string; quantity: number } | null;
}

export interface PlayerIntel {
  id: number;
  username: string;
  level: number;
  threat: string;
  estimatedWinChance: number;
  combatPower?: number;
  targetCombatPower?: number;
}

export interface AttackResult {
  attackerWin: boolean;
  attackType: string;
  targetUsername: string;
  damageDealt: number;
  damageTaken: number;
  lootCash: number;
  respectChange: number;
  targetHp: number;
  yourHp: number;
  hospitalized: boolean;
}

export interface LeaderboardEntry {
  id: number;
  username: string;
  level: number;
  respect?: number;
  xp?: number;
  netWorth?: number;
  pvpWins?: number;
  pvpLosses?: number;
  winRate?: number;
}

export interface LeaderboardData {
  type: string;
  rows: LeaderboardEntry[];
  myRank: number | null;
}

export interface ItemEffects {
  crimeBonus?: number;
  pvpPower?: number;
  arrestReduction?: number;
  hpBonus?: number;
  passiveIncome?: number;
}

export interface MarketItem {
  id: number;
  name: string;
  type: "arm" | "drug" | "footman";
  description: string;
  buyPrice: number;
  sellPrice: number;
  minLevel: number;
  minRespect: number;
  effects: ItemEffects;
  slot: string | null;
  owned: boolean | number;
  equipped?: boolean;
  // Drug-specific
  currentPrice?: number;
  previousPrice?: number;
  trend?: "up" | "down" | "stable";
}

export interface InventoryItem {
  id: number;
  itemId: number;
  item: MarketItem;
  equipped: boolean;
  quantity: number;
  acquiredAt: string;
}

export interface MarketData {
  arms: MarketItem[];
  drugs: MarketItem[];
  footmen: MarketItem[];
  playerCash: number;
  playerRespect: number;
  playerLevel: number;
}

export interface InventoryData {
  inventory: InventoryItem[];
  capacity: { max: number; used: number };
  equippedWeapon: InventoryItem | null;
}

export interface BuyResult {
  success: boolean;
  cash: number;
}

export interface SellResult {
  success: boolean;
  cashAwarded: number;
  cash: number;
  quantityRemaining: number;
}

export interface EquipResult {
  success: boolean;
  equipped: boolean;
}

export interface Gang {
  id: number;
  name: string;
  tag: string;
  description: string;
  level: number;
  maxMembers: number;
  leaderId: number;
  createdAt: string;
  memberCount?: number;
}

export interface GangMember {
  userId: number;
  username: string;
  level: number;
  role: "leader" | "lieutenant" | "enforcer" | "member";
  joinedAt: string;
  respect: number;
  netWorth: number;
}

export interface GangDetail extends Gang {
  members: GangMember[];
  memberCount: number;
}

export interface GangInvite {
  id: number;
  gangId: number;
  gangName: string;
  gangTag: string;
  invitedBy: number;
  invitedByUsername: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

export interface Skill {
  id: number;
  name: string;
  description: string;
  statUsed: string;
  turnCost: number;
  maxLevel: number;
  difficulty: number;
  level: number;
  xp: number;
  xpNeeded: number;
  progressPercent: number;
  xpPerTrain: number;
  trainingEffect: string;
}

export interface TrainResult {
  success: boolean;
  skillName: string;
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  xp: number;
  xpNeeded: number;
  turnsLeft: number;
  statPointGained?: boolean;
}
