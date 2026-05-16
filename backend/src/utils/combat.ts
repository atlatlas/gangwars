import { db, schema } from "../db";
import { eq, and } from "drizzle-orm";

export function getSkillLevel(userId: number, skillName: string): number {
  const skill = db.select({ level: schema.userSkills.level })
    .from(schema.userSkills)
    .innerJoin(schema.skillDefinitions, eq(schema.userSkills.skillId, schema.skillDefinitions.id))
    .where(and(eq(schema.userSkills.userId, userId), eq(schema.skillDefinitions.name, skillName)))
    .all()[0];
  return skill?.level ?? 0;
}

export function calcWarfareRatings(user: typeof schema.users.$inferSelect) {
  const guerrilla = getSkillLevel(user.id, "Guerrilla Warfare");
  const chemistry = getSkillLevel(user.id, "Chemistry");
  const sixthSense = getSkillLevel(user.id, "Sixth Sense");
  const womensStudies = getSkillLevel(user.id, "Women's Studies");
  const sexualEd = getSkillLevel(user.id, "Sexual Education");

  let thug = user.strength * 2 + guerrilla * 3;
  let dealer = user.intelligence * 2 + chemistry * 2 + sixthSense * 1;
  let pimp = user.charisma * 2 + sexualEd * 3 + womensStudies * 2;

  if (user.specialization === "enforcer") thug = Math.round(thug * 1.1);
  if (user.specialization === "dealer") dealer = Math.round(dealer * 1.1);
  if (user.specialization === "hacker") pimp = Math.round(pimp * 1.1);

  const highest = Math.max(thug, dealer, pimp);
  return { thug, dealer, pimp, highest };
}
