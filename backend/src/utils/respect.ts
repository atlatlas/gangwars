export function getRespectBonuses(respect: number) {
  return {
    crimeSuccessBonus: Math.round(25 * (1 - Math.exp(-respect / 20000))),
    combatIntimidation: Math.round(50 * (1 - Math.exp(-respect / 50000))),
    drugTradeBonus: Math.round(20 * (1 - Math.exp(-respect / 100000))),
  };
}

export function getCrimeRespectBonus(respect: number): number {
  return Math.round(25 * (1 - Math.exp(-respect / 20000)));
}
