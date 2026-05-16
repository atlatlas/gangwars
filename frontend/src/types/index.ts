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
  respectTitle?: string;
  respectProgress?: { current: number; next: number; title: string; nextTitle: string; percent: number };
  respectBonuses?: { crimeSuccessBonus: number; combatIntimidation: number; drugTradeBonus: number };
}

export interface PlayerStats {
  crimesCommitted: number;
  pvpWins: number;
  pvpLosses: number;
  totalMoneyEarned: number;
  totalMoneyLost: number;
  timesArrested: number;
  earnedCrimes?: number;
  earnedPvp?: number;
  earnedDrugs?: number;
  earnedHoes?: number;
  earnedCasino?: number;
  earnedGang?: number;
  respectCrimes?: number;
  respectPvp?: number;
  respectMilestones?: number;
  respectGang?: number;
  respectSkills?: number;
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
  respectModifier?: number;
  yourRespect?: number;
  targetRespect?: number;
}

export interface AttackResult {
  attackerWin: boolean;
  isCrit?: boolean;
  attackType: string;
  targetUsername: string;
  damageDealt: number;
  damageTaken: number;
  lootCash: number;
  respectChange: number;
  targetHp: number;
  targetMaxHp?: number;
  targetCash?: number;
  targetStats?: {
    strength: number;
    agility: number;
    intelligence: number;
    charisma: number;
    endurance: number;
  };
  targetEquipment?: string;
  targetFootmenCount?: number;
  itemStolen?: { name: string; quantity: number };
  usingRetaliation?: boolean;
  respectModifier?: number;
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
  type: "arm" | "drug" | "footman" | "pimp";
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
  pimps: MarketItem[];
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
  vault: number;
  createdAt: string;
  memberCount?: number;
  bannerUrl?: string | null;
}

export interface GangMember {
  userId: number;
  username: string;
  level: number;
  avatarUrl?: string | null;
  role: "leader" | "lieutenant" | "enforcer" | "member";
  joinedAt: string;
  respect: number;
  netWorth: number;
  salary?: number;
}

export interface GangDetail extends Gang {
  members: GangMember[];
  memberCount: number;
  reputation: number;
  reputationToNext: number;
  contract: GangContract | null;
  levelBenefits: GangLevelBenefits;
  pendingRequestCount?: number;
  pendingJoinRequest?: boolean;
  accountantId?: number | null;
  lastSalaryPayout?: string | null;
  investmentsOpen?: number;
  investorShare?: number;
  totalInvestments?: number;
}

export interface GangPublicMember {
  userId: number;
  username: string;
  level: number;
  role: string;
  avatarUrl?: string | null;
}

export interface GangPublicProfile {
  id: number;
  name: string;
  tag: string;
  description: string;
  level: number;
  maxMembers: number;
  leaderId: number;
  memberCount: number;
  bannerUrl?: string | null;
  createdAt: string;
  members: GangPublicMember[];
  investmentsOpen?: number;
  investorShare?: number;
  totalInvestments?: number;
  pendingJoinRequest: boolean;
}

export interface GangAttackStatus {
  myGangId: number;
  myPower: number;
  myMemberCount: number;
  targetPower: number;
  targetMemberCount: number;
  targetArsenalBonus: number;
  targetLevelMultiplier: number;
  effectiveDefenderPower: number;
  targetVault: number;
  targetLevel: number;
  myLevel: number;
  raidCooldown: { onCooldown: boolean; expiresAt: string | null };
  sabotageCooldown: { onCooldown: boolean; expiresAt: string | null };
}

export interface GangAttackResult {
  attackerWon: boolean;
  attackerGangId: number;
  defenderGangId: number;
  attackerPower: number;
  defenderPower: number;
  lootVault: number;
  cost: number;
  attackerRepChange: number;
  defenderRepChange: number;
  cooldownExpires: string;
}

export interface GangAttackEntry {
  id: number;
  attackerGangId: number;
  defenderGangId: number;
  attackType: "raid" | "sabotage";
  attackerPower: number;
  defenderPower: number;
  attackerWon: boolean;
  lootVault: number;
  reputationChange: number;
  createdAt: string;
  attackerGangName: string;
  attackerGangTag: string;
  defenderGangName: string;
  defenderGangTag: string;
}

export interface GangLevelBenefits {
  maxMembers: number;
  vaultCapacity: number;
  crimeBonus: number;
  pvpBonus: number;
  tagColor: "purple" | "cyan" | "gold" | "red";
}

export interface GangContract {
  type: "earn_cash" | "pvp_wins" | "vault_deposits" | "crimes";
  target: number;
  progress: number;
  deadline: string;
  completed: boolean;
  contributors: { userId: number; username: string; contribution: number }[];
}

export interface OperationDef {
  id: number;
  name: string;
  description: string;
  skillId: number;
  skillName: string;
  minSkillLevel: number;
  dailyTaskType: "pvp_win" | "crime" | "train_skill" | "deposit_vault";
  dailyTaskDescription: string;
  incomePerMemberL1: number;
  minSkillLevelL2: number;
  incomePerMemberL2: number;
  upgradeCostL1toL2: number;
  minSkillLevelL3: number;
  incomePerMemberL3: number;
  upgradeCostL2toL3: number;
  requirements: { skillId: number; skillName: string; minLevel: number; sortOrder: number; satisfied: boolean }[];
}

export interface MemberEligibility {
  userId: number;
  username: string;
  skillLevel: number;
  isEligible: boolean;
  satisfiedReqs: number[];
}

export interface OperationCatalogEntry {
  def: OperationDef;
  eligibleMemberCount: number;
  allRequirementsSatisfied: boolean;
  isActive: boolean;
  userSkillLevel: number;
  memberEligibility: MemberEligibility[];
}

export interface AssignedMember {
  userId: number;
  username: string;
  completed: boolean;
  isEligible: boolean;
  assignedAt: string;
}

export interface ActiveOperation {
  id: number;
  defId: number;
  name: string;
  description: string;
  skillName: string;
  requiredSkillLevel: number;
  level: number;
  upgradeCost?: number;
  currentIncome: number;
  totalDailyIncome: number;
  dailyTaskDescription: string;
  dailyTaskType: string;
  dailyProgress: {
    completed: number;
    total: number;
    eligibleMembers: number;
  };
  assignedMembers: AssignedMember[];
  pendingPayout: number;
  startedAt: string;
  lastPayoutAt: string | null;
  requirements: { skillId: number; skillName: string; minLevel: number; sortOrder: number; satisfied: boolean }[];
}

export interface GangOperationsData {
  catalog: OperationCatalogEntry[];
  activeOperations: ActiveOperation[];
  payoutHistory?: {
    id: number;
    level: number;
    amountPerMember: number;
    totalPayout: number;
    eligibleMemberCount: number;
    paidAt: string;
  }[];
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

export interface GangJoinRequest {
  id: number;
  userId: number;
  username: string;
  level: number;
  respect: number;
  cash: number;
  hp: number;
  maxHp: number;
  stats: {
    strength: number;
    agility: number;
    intelligence: number;
    charisma: number;
    endurance: number;
  };
  skills: { skillId: number; name: string; level: number; xp: number; description: string }[];
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

export interface TurfDistrict {
  id: number;
  name: string;
  description: string;
  claimCost: number;
  crimeBonus: number;
  pvpBonus: number;
  incomeBonus: number;
}

export interface GangTurfEntry {
  districtId: number;
  districtName: string;
  gangId: number;
  gangName: string;
  gangTag: string;
  claimedAt: string;
  challengedBy: number | null;
  challengedByGangName: string | null;
  challengeExpiresAt: string | null;
  defensePower?: number;
  influence?: number;
  level?: number;
  bonusMultiplier?: number;
  effectiveCrimeBonus?: number;
  effectivePvpBonus?: number;
  effectiveIncomeBonus?: number;
  assignedArsenalCount?: number;
}

export interface TurfData {
  districts: (TurfDistrict & { owner: GangTurfEntry | null })[];
  vault: number;
}

export interface TurfTerritory {
  districtId: number;
  name: string;
  description: string;
  claimCost: number;
  influence: number;
  level: number;
  bonusMultiplier: number;
  crimeBonus: number;
  pvpBonus: number;
  incomeBonus: number;
  nextLevel: {
    currentLevel: number;
    nextLevel: number;
    currentThreshold: number;
    nextThreshold: number;
    progress: number;
  };
}

export interface TurfOverviewData {
  territories: TurfTerritory[];
  memberCount: number;
  maxMembers: number;
  arsenal: {
    id: number;
    name: string;
    type: string;
    pvpPower: number;
    crimeBonus: number;
    durability: number;
    maxDurability: number;
    assignedTurfId: number | null;
  }[];
  vault: number;
}

export interface GangLeaderboardEntry {
  id: number;
  name: string;
  tag: string;
  level: number;
  vault: number;
  maxMembers: number;
  memberCount: number;
  totalRespect: number;
  turfCount: number;
  rankScore?: number;
  investmentsOpen?: number;
}

export interface GangLeaderboardData {
  type: string;
  rows: GangLeaderboardEntry[];
  myRank: number | null;
  myGangId: number | null;
}

export interface GangInvestment {
  gangId: number;
  gangName: string;
  gangTag: string;
  amount: number;
  returnsEarned: number;
  investedAt: string;
}

export interface GangInvestmentsInfo {
  investmentsOpen: boolean;
  investorShare: number;
  totalInvestments: number;
  investorCount: number;
  myInvestment: { amount: number; returnsEarned: number } | null;
}

export interface SkillCrimeDefinition {
  id: number;
  name: string;
  description: string;
  minLevel: number;
  turnCost: number;
  rewardMin: number;
  rewardMax: number;
  timingSpeed: number;
  statUsed: "agility" | "intelligence";
  skillLevel: number;
  statValue: number;
}

export interface SkillCrimeResult {
  success: boolean;
  crimeName: string;
  result: string;
  reward: number;
  xpGained: number;
  accuracy: number;
  leveledUp: boolean;
  newLevel: number;
  turnsLeft: number;
}

// ─── Trading Terminal ───

export interface TradingAsset {
  id: number;
  symbol: string;
  name: string;
  category: "drug" | "weapon" | "luxury" | "crypto" | "gang_stock" | "contraband";
  basePrice: number;
  currentPrice: number;
  previousPrice: number | null;
  priceVolatility: number;
  minPrice: number;
  maxPrice: number | null;
  tickSize: number;
  lotSize: number;
}

export interface TradingAccount {
  id: number;
  userId: number;
  balance: number;
  equity: number;
  unrealizedPnl: number;
  createdAt: string;
}

export interface TradingPosition {
  id: number;
  assetId: number;
  symbol: string;
  name: string;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  pnlPercent: number;
  openedAt: string;
}

export interface TradingOrder {
  id: number;
  userId: number;
  assetId: number;
  symbol: string;
  name: string;
  type: "market" | "limit" | "stop_loss" | "take_profit";
  side: "buy" | "sell";
  status: "open" | "filled" | "cancelled" | "expired";
  quantity: number;
  filledQuantity: number;
  price: number | null;
  stopPrice: number | null;
  createdAt: string;
  filledAt: string | null;
}

export interface TradingFill {
  id: number;
  orderId: number;
  assetId: number;
  symbol: string;
  name: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  total: number;
  pnl: number;
  createdAt: string;
}

export interface OhlcvCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketTicker {
  id: number;
  symbol: string;
  name: string;
  category: string;
  price: number;
  previousPrice: number;
  change: number;
  volume: number;
  timestamp: string;
}

export interface PriceTick {
  price: number;
  previousPrice: number;
  change: number;
  volume: number;
  timestamp: string;
}
