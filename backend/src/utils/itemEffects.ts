import { z } from "zod";

export const ItemEffectsSchema = z.object({
  crimeBonus: z.number().optional(),
  pvpPower: z.number().optional(),
  arrestReduction: z.number().optional(),
  hpBonus: z.number().optional(),
  passiveIncome: z.number().optional(),
  drugProduction: z.number().optional(),
  incomePerHour: z.number().optional(),
});

export type ItemEffects = z.infer<typeof ItemEffectsSchema>;

const defaultEffects: ItemEffects = {};

export function parseItemEffects(json: string): ItemEffects {
  try {
    const parsed = JSON.parse(json);
    const result = ItemEffectsSchema.safeParse(parsed);
    return result.success ? result.data : defaultEffects;
  } catch {
    return defaultEffects;
  }
}
