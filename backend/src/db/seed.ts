import { db } from "./index";
import { crimeDefinitions, skillCrimeDefinitions, items, skillDefinitions, drugPriceHistory, drugNews, gangOperationDefs, gangOperationReqs } from "./schema";
import { eq } from "drizzle-orm";

// Clear volatile data (no FK references to users)
db.delete(drugNews).run();
db.delete(drugPriceHistory).run();

// Upsert crimes — update existing by name, insert new
const crimes = [
  { name: "Shoplifting", description: "Snatch goods from a convenience store. Quick and easy.", minLevel: 1, turnCost: 2, statUsed: "agility" as const, baseDifficulty: 10, rewardMin: 50, rewardMax: 150, riskLevel: "low" as const },
  { name: "Mugging", description: "Jump someone in a dark alley and take their wallet.", minLevel: 3, turnCost: 3, statUsed: "strength" as const, baseDifficulty: 35, rewardMin: 100, rewardMax: 400, riskLevel: "low" as const },
  { name: "Street Racing", description: "Bet on an illegal street race. High stakes, high speed.", minLevel: 5, turnCost: 4, statUsed: "agility" as const, baseDifficulty: 50, rewardMin: 200, rewardMax: 800, riskLevel: "medium" as const },
  { name: "Drug Deal", description: "Move product to a known buyer. Profitable but risky.", minLevel: 8, turnCost: 5, statUsed: "charisma" as const, baseDifficulty: 45, rewardMin: 300, rewardMax: 1200, riskLevel: "medium" as const },
  { name: "Hacking Job", description: "Breach a corporate database for sensitive data.", minLevel: 12, turnCost: 8, statUsed: "intelligence" as const, baseDifficulty: 55, rewardMin: 500, rewardMax: 3000, riskLevel: "medium" as const },
  { name: "Protection Racket", description: "Extort local businesses for 'protection' money.", minLevel: 10, turnCost: 6, statUsed: "charisma" as const, baseDifficulty: 50, rewardMin: 400, rewardMax: 2000, riskLevel: "medium" as const },
  { name: "Bank Robbery", description: "Hit a bank vault. Maximum risk, maximum reward.", minLevel: 15, turnCost: 10, statUsed: "intelligence" as const, baseDifficulty: 70, rewardMin: 1000, rewardMax: 5000, riskLevel: "high" as const },
  { name: "Warehouse Heist", description: "Bust into a fortified warehouse and take what's inside.", minLevel: 20, turnCost: 12, statUsed: "strength" as const, baseDifficulty: 75, rewardMin: 2000, rewardMax: 8000, riskLevel: "high" as const },
  { name: "Armored Truck Heist", description: "Rip an armored truck. Military-grade security, military-grade payday.", minLevel: 25, turnCost: 14, statUsed: "strength" as const, baseDifficulty: 85, rewardMin: 5000, rewardMax: 15000, riskLevel: "high" as const },
  { name: "Casino Job", description: "Hit the casino vault. High security, high rollers' money.", minLevel: 30, turnCost: 16, statUsed: "intelligence" as const, baseDifficulty: 92, rewardMin: 10000, rewardMax: 30000, riskLevel: "high" as const },
  { name: "Government Black Site", description: "Infiltrate a classified facility. Maximum risk. Maximum reward.", minLevel: 35, turnCost: 20, statUsed: "intelligence" as const, baseDifficulty: 98, rewardMin: 20000, rewardMax: 60000, riskLevel: "high" as const },
];

for (const crime of crimes) {
  const existing = db.select().from(crimeDefinitions).where(eq(crimeDefinitions.name, crime.name)).all()[0];
  if (existing) {
    db.update(crimeDefinitions).set(crime).where(eq(crimeDefinitions.id, existing.id)).run();
  } else {
    db.insert(crimeDefinitions).values(crime).run();
  }
}

// Upsert items — update existing by name+type, insert new
const shopItems = [
  // Arms (7)
  { name: "Brass Knuckles", type: "arm" as const, description: "Classic fist loaders. Gets the message across.", buyPrice: 500, sellPrice: 250, minLevel: 1, minRespect: 0, effects: JSON.stringify({ crimeBonus: 3, pvpPower: 5 }), slot: "weapon" as const },
  { name: "Switchblade", type: "arm" as const, description: "Quick, concealable, and deadly in close quarters.", buyPrice: 1500, sellPrice: 750, minLevel: 6, minRespect: 0, effects: JSON.stringify({ crimeBonus: 5, pvpPower: 8 }), slot: "weapon" as const },
  { name: "Baseball Bat", type: "arm" as const, description: "America's pastime. Used for intimidation and more.", buyPrice: 3500, sellPrice: 1750, minLevel: 10, minRespect: 0, effects: JSON.stringify({ crimeBonus: 7, pvpPower: 12 }), slot: "weapon" as const },
  { name: "Pistol", type: "arm" as const, description: "Reliable sidearm. Standard issue for any gangster.", buyPrice: 8000, sellPrice: 4000, minLevel: 14, minRespect: 0, effects: JSON.stringify({ crimeBonus: 10, pvpPower: 18 }), slot: "weapon" as const },
  { name: "Shotgun", type: "arm" as const, description: "Close-range devastation. One shot, one kill.", buyPrice: 18000, sellPrice: 9000, minLevel: 18, minRespect: 0, effects: JSON.stringify({ crimeBonus: 12, pvpPower: 25 }), slot: "weapon" as const },
  { name: "SMG", type: "arm" as const, description: "Fully automatic mayhem. Spray and pray.", buyPrice: 35000, sellPrice: 17500, minLevel: 22, minRespect: 0, effects: JSON.stringify({ crimeBonus: 15, pvpPower: 35 }), slot: "weapon" as const },
  { name: "Sniper Rifle", type: "arm" as const, description: "Precision from a distance. They never see it coming.", buyPrice: 150000, sellPrice: 75000, minLevel: 28, minRespect: 500, effects: JSON.stringify({ crimeBonus: 18, pvpPower: 50 }), slot: "weapon" as const },
  // Drugs (6)
  { name: "Weed", type: "drug" as const, description: "Lightweight. Low risk, modest returns.", buyPrice: 200, sellPrice: 0, minLevel: 1, minRespect: 0, effects: JSON.stringify({}), slot: null, basePrice: 200, currentPrice: 200, previousPrice: 200, priceVolatility: 25 },
  { name: "Speed", type: "drug" as const, description: "Move fast. Prices swing wildly.", buyPrice: 500, sellPrice: 0, minLevel: 8, minRespect: 0, effects: JSON.stringify({}), slot: null, basePrice: 500, currentPrice: 500, previousPrice: 500, priceVolatility: 30 },
  { name: "LSD", type: "drug" as const, description: "Trippy market. High volatility.", buyPrice: 1200, sellPrice: 0, minLevel: 12, minRespect: 0, effects: JSON.stringify({}), slot: null, basePrice: 1200, currentPrice: 1200, previousPrice: 1200, priceVolatility: 35 },
  { name: "Coke", type: "drug" as const, description: "Classic product. Stable demand.", buyPrice: 3000, sellPrice: 0, minLevel: 16, minRespect: 0, effects: JSON.stringify({}), slot: null, basePrice: 3000, currentPrice: 3000, previousPrice: 3000, priceVolatility: 25 },
  { name: "Molly", type: "drug" as const, description: "Party season drives prices.", buyPrice: 5000, sellPrice: 0, minLevel: 20, minRespect: 0, effects: JSON.stringify({}), slot: null, basePrice: 5000, currentPrice: 5000, previousPrice: 5000, priceVolatility: 30 },
  { name: "Heroin", type: "drug" as const, description: "Maximum risk, maximum reward.", buyPrice: 12000, sellPrice: 0, minLevel: 25, minRespect: 0, effects: JSON.stringify({}), slot: null, basePrice: 12000, currentPrice: 12000, previousPrice: 12000, priceVolatility: 35 },
  // Footmen (6) — sell at 25% of buy price
  { name: "Street Thug", type: "footman" as const, description: "A brute with a chip on his shoulder. Adds muscle.", buyPrice: 1000, sellPrice: 250, minLevel: 5, minRespect: 0, effects: JSON.stringify({ pvpPower: 2 }), slot: null },
  { name: "Lookout", type: "footman" as const, description: "Keeps watch while you work. Lowers risk.", buyPrice: 3000, sellPrice: 750, minLevel: 8, minRespect: 0, effects: JSON.stringify({ crimeBonus: 3 }), slot: null },
  { name: "Enforcer", type: "footman" as const, description: "A bruiser who leans on people. Muscle and menace.", buyPrice: 10000, sellPrice: 2500, minLevel: 12, minRespect: 0, effects: JSON.stringify({ crimeBonus: 5, pvpPower: 5 }), slot: null },
  { name: "Hacker", type: "footman" as const, description: "Digital wizard. Opens doors that stay locked.", buyPrice: 20000, sellPrice: 5000, minLevel: 16, minRespect: 0, effects: JSON.stringify({ crimeBonus: 8 }), slot: null },
  { name: "Getaway Driver", type: "footman" as const, description: "Wheelman extraordinaire. Gets you out clean.", buyPrice: 30000, sellPrice: 7500, minLevel: 20, minRespect: 0, effects: JSON.stringify({ crimeBonus: 3, pvpPower: 3, arrestReduction: 10 }), slot: null },
  { name: "Lieutenant", type: "footman" as const, description: "Your right hand. Commands respect and delivers results.", buyPrice: 100000, sellPrice: 25000, minLevel: 25, minRespect: 250, effects: JSON.stringify({ crimeBonus: 10, pvpPower: 10 }), slot: null },
  // Drug Dealers (4)
  { name: "Street Dealer", type: "drug_dealer" as const, description: "Low-level pusher. Produces 5 units of random drugs per hour.", buyPrice: 5000, sellPrice: 0, minLevel: 10, minRespect: 0, effects: JSON.stringify({ drugProduction: 5 }), slot: null },
  { name: "Trafficker", type: "drug_dealer" as const, description: "Connected mover. Produces 12 units of random drugs per hour.", buyPrice: 25000, sellPrice: 0, minLevel: 18, minRespect: 0, effects: JSON.stringify({ drugProduction: 12 }), slot: null },
  { name: "Cartel Contact", type: "drug_dealer" as const, description: "Well-connected supplier. Produces 30 units per hour with better drugs.", buyPrice: 150000, sellPrice: 0, minLevel: 25, minRespect: 1000, effects: JSON.stringify({ drugProduction: 30 }), slot: null },
  { name: "International Kingpin", type: "drug_dealer" as const, description: "Global empire. Produces 75 units per hour of premium product.", buyPrice: 2000000, sellPrice: 0, minLevel: 35, minRespect: 5000, effects: JSON.stringify({ drugProduction: 75 }), slot: null },
  // Hoes (5) — sell at 25% of buy price
  { name: "Street Walker", type: "hoe" as const, description: "Low-end. Works the block for spare change. $50/hr.", buyPrice: 1500, sellPrice: 375, minLevel: 1, minRespect: 0, effects: JSON.stringify({ incomePerHour: 50 }), slot: null },
  { name: "Escort", type: "hoe" as const, description: "Classy companion. Charges premium rates. $200/hr.", buyPrice: 15000, sellPrice: 3750, minLevel: 5, minRespect: 0, effects: JSON.stringify({ incomePerHour: 200 }), slot: null },
  { name: "Cam Girl", type: "hoe" as const, description: "Digital entrepreneur. Online following brings $500/hr.", buyPrice: 50000, sellPrice: 12500, minLevel: 16, minRespect: 0, effects: JSON.stringify({ incomePerHour: 500 }), slot: null },
  { name: "Elite Companion", type: "hoe" as const, description: "High-end talent. Politicians and CEOs pay top dollar. $1,500/hr.", buyPrice: 250000, sellPrice: 62500, minLevel: 22, minRespect: 1000, effects: JSON.stringify({ incomePerHour: 1500 }), slot: null },
  { name: "Madame", type: "hoe" as const, description: "Runs her own operation. Manages a stable and delivers $4,000/hr.", buyPrice: 2000000, sellPrice: 500000, minLevel: 30, minRespect: 5000, effects: JSON.stringify({ incomePerHour: 4000 }), slot: null },
  // Pimps (4) — protects hoes from kidnapping. 1 pimp per 5 hoes.
  { name: "Street Pimp", type: "pimp" as const, description: "Low-level hustler. Keeps an eye on the block. Protects 5 hoes.", buyPrice: 8000, sellPrice: 2000, minLevel: 3, minRespect: 0, effects: JSON.stringify({}), slot: null },
  { name: "Hustler", type: "pimp" as const, description: "Smooth talker. Knows the streets and keeps order. Protects 5 hoes.", buyPrice: 35000, sellPrice: 8750, minLevel: 10, minRespect: 0, effects: JSON.stringify({}), slot: null },
  { name: "Mack Daddy", type: "pimp" as const, description: "Veteran player. Respect on the streets. Protects 5 hoes.", buyPrice: 120000, sellPrice: 30000, minLevel: 18, minRespect: 500, effects: JSON.stringify({}), slot: null },
  { name: "King Pin", type: "pimp" as const, description: "Top-tier operator. Runs the game. Protects 5 hoes.", buyPrice: 500000, sellPrice: 125000, minLevel: 26, minRespect: 2500, effects: JSON.stringify({}), slot: null },
];

for (const item of shopItems) {
  const existing = db.select().from(items).where(eq(items.name, item.name)).all()[0];
  if (existing) {
    db.update(items).set(item).where(eq(items.id, existing.id)).run();
  } else {
    db.insert(items).values(item).run();
  }
}

// Upsert skill definitions
const skillDefs = [
  { name: "Guerrilla Warfare", description: "Master urban combat tactics. Increases PvP attack power.", statUsed: "strength" as const, baseXpPerTrain: 15, turnCost: 12, maxLevel: 100, difficulty: 1.0 },
  { name: "Chemistry", description: "Expertise in narcotics. Better drug trade prices and reduced bust chance.", statUsed: "intelligence" as const, baseXpPerTrain: 12, turnCost: 15, maxLevel: 100, difficulty: 1.2 },
  { name: "Sixth Sense", description: "Heightened awareness. Reduces damage taken in PvP.", statUsed: "agility" as const, baseXpPerTrain: 10, turnCost: 18, maxLevel: 100, difficulty: 1.5 },
  { name: "Women's Studies", description: "Understanding of the streets oldest trade. Boosts passive income.", statUsed: "charisma" as const, baseXpPerTrain: 10, turnCost: 15, maxLevel: 100, difficulty: 1.3 },
  { name: "Sexual Education", description: "Advanced knowledge for maximum passive income returns.", statUsed: "charisma" as const, baseXpPerTrain: 8, turnCost: 20, maxLevel: 100, difficulty: 1.8 },
  // Skill crime skills — each improves a specific skill crime mini-game
  { name: "Lockpicking", description: "Skillful lock manipulation. Improves lockpicking game.", statUsed: "agility" as const, baseXpPerTrain: 12, turnCost: 8, maxLevel: 100, difficulty: 1.2 },
  { name: "Pickpocketing", description: "Sleight of hand and quick fingers. Improves pickpocketing game.", statUsed: "agility" as const, baseXpPerTrain: 12, turnCost: 8, maxLevel: 100, difficulty: 1.3 },
  { name: "Safe Cracking", description: "Combination lock expertise. Improves safe cracking game.", statUsed: "intelligence" as const, baseXpPerTrain: 14, turnCost: 10, maxLevel: 100, difficulty: 1.4 },
  { name: "Hacking", description: "Digital intrusion techniques. Improves data heist game.", statUsed: "intelligence" as const, baseXpPerTrain: 16, turnCost: 12, maxLevel: 100, difficulty: 1.7 },
];

for (const skill of skillDefs) {
  const existing = db.select().from(skillDefinitions).where(eq(skillDefinitions.name, skill.name)).all()[0];
  if (existing) {
    db.update(skillDefinitions).set(skill).where(eq(skillDefinitions.id, existing.id)).run();
  } else {
    db.insert(skillDefinitions).values(skill).run();
  }
}

// Lookup skill IDs for operation definitions
const gwSkill = db.select().from(skillDefinitions).where(eq(skillDefinitions.name, "Guerrilla Warfare")).all()[0];
const chemSkill = db.select().from(skillDefinitions).where(eq(skillDefinitions.name, "Chemistry")).all()[0];
const ssSkill = db.select().from(skillDefinitions).where(eq(skillDefinitions.name, "Sixth Sense")).all()[0];
const wsSkill = db.select().from(skillDefinitions).where(eq(skillDefinitions.name, "Women's Studies")).all()[0];
const seSkill = db.select().from(skillDefinitions).where(eq(skillDefinitions.name, "Sexual Education")).all()[0];

// Upsert 10 gang operation definitions — skill reqs scale from bottom to top
// Sorted by income: Escort (lowest, L1 skill=5) → Arms Trafficking (highest, L3 skill=100)
const operations = [
  { name: "Escort Agency", description: "Premium adult entertainment service for high-end clientele.", skillId: wsSkill.id, minSkillLevel: 5, dailyTaskType: "crime" as const, dailyTaskDescription: "Commit any crime", incomePerMemberL1: 2000, minSkillLevelL2: 25, incomePerMemberL2: 5000, upgradeCostL1toL2: 25000, minSkillLevelL3: 50, incomePerMemberL3: 10000, upgradeCostL2toL3: 150000 },
  { name: "Street Protection Racket", description: "Extort local businesses for weekly protection money.", skillId: gwSkill.id, minSkillLevel: 10, dailyTaskType: "pvp_win" as const, dailyTaskDescription: "Win a mugging or ambush PvP attack", incomePerMemberL1: 3000, minSkillLevelL2: 30, incomePerMemberL2: 7000, upgradeCostL1toL2: 35000, minSkillLevelL3: 55, incomePerMemberL3: 14000, upgradeCostL2toL3: 200000 },
  { name: "Fence Network", description: "Sell stolen goods through an underground distribution chain.", skillId: ssSkill.id, minSkillLevel: 15, dailyTaskType: "crime" as const, dailyTaskDescription: "Commit any crime", incomePerMemberL1: 4000, minSkillLevelL2: 35, incomePerMemberL2: 9000, upgradeCostL1toL2: 40000, minSkillLevelL3: 60, incomePerMemberL3: 18000, upgradeCostL2toL3: 250000 },
  { name: "Moonshine Operation", description: "Run an illegal distillery. Bootleg liquor sales.", skillId: chemSkill.id, minSkillLevel: 20, dailyTaskType: "crime" as const, dailyTaskDescription: "Commit any crime", incomePerMemberL1: 6000, minSkillLevelL2: 40, incomePerMemberL2: 14000, upgradeCostL1toL2: 60000, minSkillLevelL3: 65, incomePerMemberL3: 28000, upgradeCostL2toL3: 350000 },
  { name: "Casino Scam Ring", description: "Run sophisticated cons on underground gambling dens.", skillId: wsSkill.id, minSkillLevel: 25, dailyTaskType: "pvp_win" as const, dailyTaskDescription: "Win a mugging or ambush PvP attack", incomePerMemberL1: 8000, minSkillLevelL2: 45, incomePerMemberL2: 18000, upgradeCostL1toL2: 75000, minSkillLevelL3: 70, incomePerMemberL3: 35000, upgradeCostL2toL3: 500000 },
  { name: "Adult Entertainment Studio", description: "Produce and distribute adult content online.", skillId: seSkill.id, minSkillLevel: 30, dailyTaskType: "crime" as const, dailyTaskDescription: "Commit any crime", incomePerMemberL1: 10000, minSkillLevelL2: 50, incomePerMemberL2: 22000, upgradeCostL1toL2: 100000, minSkillLevelL3: 75, incomePerMemberL3: 45000, upgradeCostL2toL3: 600000 },
  { name: "Money Laundering Front", description: "Legitimate businesses used to clean dirty money.", skillId: chemSkill.id, minSkillLevel: 40, dailyTaskType: "deposit_vault" as const, dailyTaskDescription: "Deposit cash to the gang vault", incomePerMemberL1: 12000, minSkillLevelL2: 60, incomePerMemberL2: 26000, upgradeCostL1toL2: 150000, minSkillLevelL3: 80, incomePerMemberL3: 52000, upgradeCostL2toL3: 1000000 },
  { name: "Safe Cracking Crew", description: "Professional heist team targeting safes and vaults.", skillId: ssSkill.id, minSkillLevel: 50, dailyTaskType: "crime" as const, dailyTaskDescription: "Commit any crime", incomePerMemberL1: 15000, minSkillLevelL2: 70, incomePerMemberL2: 35000, upgradeCostL1toL2: 250000, minSkillLevelL3: 85, incomePerMemberL3: 70000, upgradeCostL2toL3: 1500000 },
  { name: "Underground Fighting Ring", description: "Organize and profit from bare-knuckle brawls.", skillId: seSkill.id, minSkillLevel: 60, dailyTaskType: "train_skill" as const, dailyTaskDescription: "Train your Sexual Education skill 3 times", incomePerMemberL1: 18000, minSkillLevelL2: 80, incomePerMemberL2: 40000, upgradeCostL1toL2: 400000, minSkillLevelL3: 95, incomePerMemberL3: 80000, upgradeCostL2toL3: 2500000 },
  { name: "Arms Trafficking Ring", description: "Smuggle illegal weapons across state lines.", skillId: gwSkill.id, minSkillLevel: 75, dailyTaskType: "pvp_win" as const, dailyTaskDescription: "Win any PvP attack", incomePerMemberL1: 25000, minSkillLevelL2: 90, incomePerMemberL2: 55000, upgradeCostL1toL2: 750000, minSkillLevelL3: 100, incomePerMemberL3: 110000, upgradeCostL2toL3: 5000000 },
];

for (const op of operations) {
  const existing = db.select().from(gangOperationDefs).where(eq(gangOperationDefs.name, op.name)).all()[0];
  if (existing) {
    db.update(gangOperationDefs).set(op).where(eq(gangOperationDefs.id, existing.id)).run();
  } else {
    db.insert(gangOperationDefs).values(op).run();
  }
}

// Insert operation requirements (multi-skill) — scaled to match operation levels
const operationReqs: { opName: string; reqs: { skillId: number; minLevel: number; sortOrder: number }[] }[] = [
  { opName: "Escort Agency", reqs: [
    { skillId: wsSkill.id, minLevel: 5, sortOrder: 0 },
    { skillId: seSkill.id, minLevel: 3, sortOrder: 1 },
  ]},
  { opName: "Street Protection Racket", reqs: [
    { skillId: gwSkill.id, minLevel: 8, sortOrder: 0 },
    { skillId: chemSkill.id, minLevel: 5, sortOrder: 1 },
  ]},
  { opName: "Fence Network", reqs: [
    { skillId: ssSkill.id, minLevel: 12, sortOrder: 0 },
    { skillId: wsSkill.id, minLevel: 10, sortOrder: 1 },
  ]},
  { opName: "Moonshine Operation", reqs: [
    { skillId: chemSkill.id, minLevel: 18, sortOrder: 0 },
    { skillId: gwSkill.id, minLevel: 14, sortOrder: 1 },
    { skillId: ssSkill.id, minLevel: 12, sortOrder: 2 },
  ]},
  { opName: "Casino Scam Ring", reqs: [
    { skillId: wsSkill.id, minLevel: 22, sortOrder: 0 },
    { skillId: ssSkill.id, minLevel: 18, sortOrder: 1 },
    { skillId: seSkill.id, minLevel: 15, sortOrder: 2 },
  ]},
  { opName: "Adult Entertainment Studio", reqs: [
    { skillId: seSkill.id, minLevel: 28, sortOrder: 0 },
    { skillId: wsSkill.id, minLevel: 24, sortOrder: 1 },
    { skillId: chemSkill.id, minLevel: 20, sortOrder: 2 },
  ]},
  { opName: "Money Laundering Front", reqs: [
    { skillId: chemSkill.id, minLevel: 35, sortOrder: 0 },
    { skillId: ssSkill.id, minLevel: 30, sortOrder: 1 },
    { skillId: gwSkill.id, minLevel: 25, sortOrder: 2 },
  ]},
  { opName: "Safe Cracking Crew", reqs: [
    { skillId: ssSkill.id, minLevel: 45, sortOrder: 0 },
    { skillId: gwSkill.id, minLevel: 40, sortOrder: 1 },
    { skillId: chemSkill.id, minLevel: 35, sortOrder: 2 },
    { skillId: seSkill.id, minLevel: 30, sortOrder: 3 },
  ]},
  { opName: "Underground Fighting Ring", reqs: [
    { skillId: gwSkill.id, minLevel: 55, sortOrder: 0 },
    { skillId: seSkill.id, minLevel: 50, sortOrder: 1 },
    { skillId: wsSkill.id, minLevel: 45, sortOrder: 2 },
    { skillId: chemSkill.id, minLevel: 40, sortOrder: 3 },
  ]},
  { opName: "Arms Trafficking Ring", reqs: [
    { skillId: gwSkill.id, minLevel: 70, sortOrder: 0 },
    { skillId: chemSkill.id, minLevel: 65, sortOrder: 1 },
    { skillId: ssSkill.id, minLevel: 60, sortOrder: 2 },
    { skillId: seSkill.id, minLevel: 55, sortOrder: 3 },
    { skillId: wsSkill.id, minLevel: 50, sortOrder: 4 },
  ]},
];

for (const { opName, reqs } of operationReqs) {
  const def = db.select().from(gangOperationDefs).where(eq(gangOperationDefs.name, opName)).all()[0];
  if (!def) continue;
  db.delete(gangOperationReqs).where(eq(gangOperationReqs.operationDefId, def.id)).run();
  for (const r of reqs) {
    db.insert(gangOperationReqs).values({ operationDefId: def.id, ...r }).run();
  }
}

// Demo user creation removed — no test accounts on production.

// Upsert skill crime definitions
const skillCrimes = [
  { name: "Lockpicking", description: "Pick the lock on a secure safe. Steady hands needed.", minLevel: 3, turnCost: 3, rewardMin: 200, rewardMax: 800, timingSpeed: 1.0 },
  { name: "Pickpocketing", description: "Lift wallets from a crowded subway. Quick reflexes required.", minLevel: 8, turnCost: 4, rewardMin: 500, rewardMax: 2500, timingSpeed: 1.5 },
  { name: "Safe Cracking", description: "Crack a bank vault's combination lock under time pressure.", minLevel: 15, turnCost: 8, rewardMin: 3000, rewardMax: 15000, timingSpeed: 2.2 },
  { name: "Data Heist", description: "Infiltrate a corporate server room and steal encrypted data.", minLevel: 25, turnCost: 12, rewardMin: 10000, rewardMax: 45000, timingSpeed: 3.0 },
];

for (const sc of skillCrimes) {
  const existing = db.select().from(skillCrimeDefinitions).where(eq(skillCrimeDefinitions.name, sc.name)).all()[0];
  if (existing) {
    db.update(skillCrimeDefinitions).set(sc).where(eq(skillCrimeDefinitions.id, existing.id)).run();
  } else {
    db.insert(skillCrimeDefinitions).values(sc).run();
  }
}

console.log("Catalog seeded successfully!");
console.log("User data preserved.");
