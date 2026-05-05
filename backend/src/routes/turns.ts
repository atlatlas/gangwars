import { db, schema } from "../db";
import { eq, and, sql } from "drizzle-orm";

export function refreshTurns(user: typeof schema.users.$inferSelect): number {
  const now = new Date();
  const lastRegen = new Date(user.lastTurnRegen);
  const elapsedSeconds = (now.getTime() - lastRegen.getTime()) / 1000;
  const ticks = Math.floor(elapsedSeconds / 300);
  const turnsGained = ticks * 4;
  const maxTurns = 5000;

  if (ticks <= 0) return user.turns;

  const newTurns = Math.min(user.turns + turnsGained, maxTurns);
  const effectiveSeconds = ticks * 300;
  const newLastRegen = new Date(lastRegen.getTime() + effectiveSeconds * 1000);
  const newHp = Math.min(user.hp + ticks, user.maxHp);

  // Passive income from skills
  let passiveIncome = 0;
  const womensStudies = db.select()
    .from(schema.userSkills)
    .innerJoin(schema.skillDefinitions, eq(schema.userSkills.skillId, schema.skillDefinitions.id))
    .where(and(eq(schema.userSkills.userId, user.id), eq(schema.skillDefinitions.name, "Women's Studies")))
    .all()[0];
  const sexualEd = db.select()
    .from(schema.userSkills)
    .innerJoin(schema.skillDefinitions, eq(schema.userSkills.skillId, schema.skillDefinitions.id))
    .where(and(eq(schema.userSkills.userId, user.id), eq(schema.skillDefinitions.name, "Sexual Education")))
    .all()[0];
  const wsLevel = womensStudies?.user_skills.level ?? 0;
  const seLevel = sexualEd?.user_skills.level ?? 0;
  passiveIncome = Math.floor(wsLevel * 2.5 + seLevel * 3) * ticks;

  // Atomic update — use SQL increment for cash to avoid race conditions
  db.run(sql`
    UPDATE ${schema.users}
    SET turns = ${newTurns},
        hp = ${newHp},
        cash = cash + ${passiveIncome},
        last_turn_regen = ${newLastRegen.toISOString()}
    WHERE id = ${user.id}
  `);

  return newTurns;
}
