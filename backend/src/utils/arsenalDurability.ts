import { db, schema } from "../db";
import { eq, and } from "drizzle-orm";

/**
 * Apply durability loss to a user's equipped arsenal items after a PvP or crime action.
 * 20% chance per item to lose 1-3 durability. If durability reaches 0, auto-unequip and log.
 */
export function applyArsenalDurabilityLoss(userId: number, gangId: number, action: string): void {
  // Find all equipped arsenal items (users can have one per type)
  const equipped = db.select()
    .from(schema.gangArsenal)
    .where(and(
      eq(schema.gangArsenal.gangId, gangId),
      eq(schema.gangArsenal.equippedBy, userId),
    ))
    .all();

  for (const item of equipped) {
    // 20% chance per item
    if (Math.random() >= 0.2) continue;

    const loss = 1 + Math.floor(Math.random() * 3); // 1-3
    const newDurability = Math.max(0, item.durability - loss);

    if (newDurability <= 0) {
      // Item breaks — auto-unequip
      db.update(schema.gangArsenal)
        .set({ durability: 0, equippedBy: null })
        .where(eq(schema.gangArsenal.id, item.id))
        .run();

      // Log broken event
      db.insert(schema.gangArsenalLog).values({
        arsenalId: item.id,
        gangId: item.gangId,
        action: "broken" as any,
        userId,
        details: `${item.name} broke during ${action}!`,
        createdAt: new Date().toISOString(),
      }).run();
    } else {
      db.update(schema.gangArsenal)
        .set({ durability: newDurability })
        .where(eq(schema.gangArsenal.id, item.id))
        .run();

      // Log durability loss
      db.insert(schema.gangArsenalLog).values({
        arsenalId: item.id,
        gangId: item.gangId,
        action: "durability_loss" as any,
        userId,
        details: `${item.name} lost ${loss} durability (${newDurability}/${item.maxDurability}) during ${action}`,
        createdAt: new Date().toISOString(),
      }).run();
    }
  }
}

/**
 * Find the user's gang ID (if any) for durability loss hooks.
 */
export function getUserGangId(userId: number): number | null {
  const member = db.select({ gangId: schema.gangMembers.gangId })
    .from(schema.gangMembers)
    .where(eq(schema.gangMembers.userId, userId))
    .all()[0];
  return member?.gangId ?? null;
}
