import { db } from "./index";
import { crimeDefinitions, users, playerStats, items, skillDefinitions, drugPriceHistory, drugNews } from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
  { name: "Sniper Rifle", type: "arm" as const, description: "Precision from a distance. They never see it coming.", buyPrice: 80000, sellPrice: 40000, minLevel: 28, minRespect: 0, effects: JSON.stringify({ crimeBonus: 18, pvpPower: 50 }), slot: "weapon" as const },
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
  { name: "Lieutenant", type: "footman" as const, description: "Your right hand. Commands respect and delivers results.", buyPrice: 75000, sellPrice: 18750, minLevel: 25, minRespect: 0, effects: JSON.stringify({ crimeBonus: 10, pvpPower: 10 }), slot: null },
  // Drug Dealers (4)
  { name: "Street Dealer", type: "drug_dealer" as const, description: "Low-level pusher. Produces 5 units of random drugs per hour.", buyPrice: 5000, sellPrice: 0, minLevel: 10, minRespect: 0, effects: JSON.stringify({ drugProduction: 5 }), slot: null },
  { name: "Trafficker", type: "drug_dealer" as const, description: "Connected mover. Produces 12 units of random drugs per hour.", buyPrice: 25000, sellPrice: 0, minLevel: 18, minRespect: 0, effects: JSON.stringify({ drugProduction: 12 }), slot: null },
  { name: "Cartel Contact", type: "drug_dealer" as const, description: "Well-connected supplier. Produces 30 units per hour with better drugs.", buyPrice: 100000, sellPrice: 0, minLevel: 25, minRespect: 0, effects: JSON.stringify({ drugProduction: 30 }), slot: null },
  { name: "International Kingpin", type: "drug_dealer" as const, description: "Global empire. Produces 75 units per hour of premium product.", buyPrice: 500000, sellPrice: 0, minLevel: 35, minRespect: 0, effects: JSON.stringify({ drugProduction: 75 }), slot: null },
  // Hoes (5) — sell at 25% of buy price
  { name: "Street Walker", type: "hoe" as const, description: "Low-end. Works the block for spare change. $500/hr.", buyPrice: 1500, sellPrice: 375, minLevel: 1, minRespect: 0, effects: JSON.stringify({ incomePerHour: 500 }), slot: null },
  { name: "Escort", type: "hoe" as const, description: "Classy companion. Charges premium rates. $1,500/hr.", buyPrice: 15000, sellPrice: 3750, minLevel: 5, minRespect: 0, effects: JSON.stringify({ incomePerHour: 1500 }), slot: null },
  { name: "Cam Girl", type: "hoe" as const, description: "Digital entrepreneur. Online following brings $4,000/hr.", buyPrice: 50000, sellPrice: 12500, minLevel: 16, minRespect: 0, effects: JSON.stringify({ incomePerHour: 4000 }), slot: null },
  { name: "Elite Companion", type: "hoe" as const, description: "High-end talent. Politicians and CEOs pay top dollar. $10,000/hr.", buyPrice: 150000, sellPrice: 37500, minLevel: 22, minRespect: 0, effects: JSON.stringify({ incomePerHour: 10000 }), slot: null },
  { name: "Madame", type: "hoe" as const, description: "Runs her own operation. Manages a stable and delivers $25,000/hr.", buyPrice: 500000, sellPrice: 125000, minLevel: 30, minRespect: 0, effects: JSON.stringify({ incomePerHour: 25000 }), slot: null },
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
  { name: "Guerrilla Warfare", description: "Master urban combat tactics. Increases PvP attack power.", statUsed: "strength" as const, baseXpPerTrain: 15, turnCost: 3, maxLevel: 100, difficulty: 1.0 },
  { name: "Chemistry", description: "Expertise in narcotics. Better drug trade prices and reduced bust chance.", statUsed: "intelligence" as const, baseXpPerTrain: 12, turnCost: 3, maxLevel: 100, difficulty: 1.2 },
  { name: "Sixth Sense", description: "Heightened awareness. Reduces damage taken in PvP.", statUsed: "agility" as const, baseXpPerTrain: 10, turnCost: 3, maxLevel: 100, difficulty: 1.5 },
  { name: "Women's Studies", description: "Understanding of the streets oldest trade. Boosts passive income.", statUsed: "charisma" as const, baseXpPerTrain: 10, turnCost: 3, maxLevel: 100, difficulty: 1.3 },
  { name: "Sexual Education", description: "Advanced knowledge for maximum passive income returns.", statUsed: "charisma" as const, baseXpPerTrain: 8, turnCost: 3, maxLevel: 100, difficulty: 1.8 },
];

for (const skill of skillDefs) {
  const existing = db.select().from(skillDefinitions).where(eq(skillDefinitions.name, skill.name)).all()[0];
  if (existing) {
    db.update(skillDefinitions).set(skill).where(eq(skillDefinitions.id, existing.id)).run();
  } else {
    db.insert(skillDefinitions).values(skill).run();
  }
}

// Create demo user only if not already present
const existing = db.select().from(users).where(eq(users.username, "demo")).all()[0];
if (!existing) {
  const hash = bcrypt.hashSync("password123", 10);
  const now = new Date().toISOString();

  const result = db.insert(users).values({
    username: "demo",
    email: "demo@gangwars.test",
    passwordHash: hash,
    level: 14,
    xp: 1850,
    turns: 85,
    lastTurnRegen: now,
    cash: 12450,
    respect: 890,
    hp: 100,
    maxHp: 100,
    statPoints: 3,
    strength: 7,
    agility: 5,
    intelligence: 3,
    charisma: 3,
    endurance: 3,
    createdAt: now,
    lastActive: now,
  }).run();

  db.insert(playerStats).values({
    userId: Number(result.lastInsertRowid),
    crimesCommitted: 47,
    pvpWins: 12,
    pvpLosses: 5,
    totalMoneyEarned: 45200,
    totalMoneyLost: 3200,
    timesArrested: 3,
  }).run();
}

console.log("Catalog seeded successfully!");
console.log("User data preserved.");
