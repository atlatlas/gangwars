import { db, schema } from "../db";
import { eq, and, sql } from "drizzle-orm";

const TICK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const HOURLY_INCOME_BASE = 10; // $10 per incomeBonus point per hour

const LEVEL_THRESHOLDS = [0, 200, 500, 1000, 2000, 3500];
const BONUS_MULTIPLIERS = [1.0, 1.5, 2.0, 2.5, 3.5, 5.0];

function calcLevel(influence: number): number {
  let lvl = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (influence >= LEVEL_THRESHOLDS[i]) { lvl = i + 1; break; }
  }
  return Math.min(lvl, LEVEL_THRESHOLDS.length);
}

export class TurfEngine {
  private intervalId: NodeJS.Timeout | null = null;

  start(): void {
    this.intervalId = setInterval(() => this.tick(), TICK_INTERVAL);
    console.log("[TurfEngine] Started — 5min tick interval");
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick(): void {
    const now = new Date().toISOString();
    const turfs = db.select().from(schema.gangTurf).all();

    for (const turf of turfs) {
      if (turf.challengedBy) continue; // frozen while challenged

      // Base influence per tick = 1
      let gain = 1;

      // Arsenal bonus: +0.5 per 10 pvpPower of items assigned here
      const arsenalPower = db.select({ pvpPower: schema.gangArsenal.pvpPower })
        .from(schema.gangArsenal)
        .where(eq(schema.gangArsenal.assignedTurfId, turf.districtId))
        .all()
        .reduce((sum, a) => sum + a.pvpPower, 0);
      gain += (arsenalPower / 10) * 0.5;

      // Operations bonus: +0.2 per active operation level
      const ops = db.select({ level: schema.gangActiveOperations.level })
        .from(schema.gangActiveOperations)
        .where(eq(schema.gangActiveOperations.gangId, turf.gangId))
        .all();
      const opsLevelSum = ops.reduce((sum, o) => sum + o.level, 0);
      gain += opsLevelSum * 0.2;

      // Member count bonus: +0.1 per 10 members
      const memberCount = db.select({ count: sql<number>`COUNT(*)` })
        .from(schema.gangMembers)
        .where(eq(schema.gangMembers.gangId, turf.gangId))
        .all()[0]?.count ?? 0;
      gain += Math.floor(memberCount / 10) * 0.1;

      // Apply gain
      const newInfluence = Math.round((turf.influence + gain) * 10) / 10;
      const newLevel = calcLevel(newInfluence);

      db.update(schema.gangTurf)
        .set({
          influence: newInfluence,
          level: newLevel,
          lastInfluenceTick: now,
        })
        .where(eq(schema.gangTurf.id, turf.id))
        .run();

      // ─── Turf Payday: credit hourly income to gang vault ───
      const lastIncome = turf.lastTurfIncomeAt ? new Date(turf.lastTurfIncomeAt).getTime() : 0;
      const hourMs = 60 * 60 * 1000;
      if (Date.now() - lastIncome >= hourMs) {
        const district = db.select({ incomeBonus: schema.turfDistricts.incomeBonus })
          .from(schema.turfDistricts)
          .where(eq(schema.turfDistricts.id, turf.districtId))
          .all()[0];

        if (district && district.incomeBonus > 0) {
          const mult = TurfEngine.getBonusMultiplier(newLevel);
          const payout = Math.round(district.incomeBonus * mult * HOURLY_INCOME_BASE);

          if (payout > 0) {
            db.update(schema.gangs)
              .set({ vault: sql`vault + ${payout}` })
              .where(eq(schema.gangs.id, turf.gangId))
              .run();

            db.update(schema.gangTurf)
              .set({ lastTurfIncomeAt: now })
              .where(eq(schema.gangTurf.id, turf.id))
              .run();
          }
        }
      }
    }
  }

  /** Calculate the effective bonus multiplier for a given turf level */
  static getBonusMultiplier(level: number): number {
    const idx = Math.min(Math.max(level - 1, 0), BONUS_MULTIPLIERS.length - 1);
    return BONUS_MULTIPLIERS[idx];
  }

  /** Get the level at a given influence value */
  static getLevel(influence: number): number {
    return calcLevel(influence);
  }

  /** Get influence needed to reach next level */
  static getNextLevelInfo(influence: number): { currentLevel: number; nextLevel: number; currentThreshold: number; nextThreshold: number; progress: number } {
    const currentLevel = calcLevel(influence);
    const idx = currentLevel - 1;
    const currentThreshold = LEVEL_THRESHOLDS[idx] ?? 0;
    const nextThreshold = LEVEL_THRESHOLDS[idx + 1] ?? LEVEL_THRESHOLDS[idx];
    const progress = nextThreshold > currentThreshold
      ? Math.min(1, (influence - currentThreshold) / (nextThreshold - currentThreshold))
      : 1;
    return { currentLevel, nextLevel: Math.min(currentLevel + 1, LEVEL_THRESHOLDS.length), currentThreshold, nextThreshold, progress };
  }
}
