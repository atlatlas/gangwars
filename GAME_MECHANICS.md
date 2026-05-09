# Gang Wars — Game Mechanics

## 1. Player Stats & Attributes

### Starting Values
| Stat | Value |
|---|---|
| Level | 1 |
| XP | 0 |
| Turns | 100 (max 5,000) |
| Cash | $2,000 |
| Respect | 0 |
| HP | 100 |
| Max HP | 100 |
| Stat Points | 5 |
| Strength / Agility / Intelligence / Charisma / Endurance | 1 each |
| Specialization | none |
| Bank | $0 |

### Registration Rules
- Username: 3–20 chars, alphanumeric + underscores
- Password: 6–100 chars, bcrypt-hashed (10 salt rounds)

### Specialization
One-time choice between 3 roles. Cannot be changed after selection.

| Role | Effect |
|---|---|
| **enforcer** | Thug rating ×1.1 |
| **dealer** | Dealer rating ×1.1 |
| **hacker** | Pimp rating ×1.1 |

### Stat Point Cap
Each stat is capped at **100**. Stat points earned on level-up (+1 per level).

### Max HP Formula
```
maxHp = 50 + endurance × 5
```
| Endurance | Max HP |
|---|---|
| 1 | 55 |
| 10 | 100 |
| 25 | 175 |
| 50 | 300 |
| 100 | 550 |

---

## 2. Turn Regeneration

Every **5 minutes** (300 seconds):

| Resource | Gain per Tick | Cap |
|---|---|---|
| Turns | +4 | 5,000 |
| HP | +1 | maxHp |

```
ticks = floor(elapsedSeconds / 300)
turnsGained = ticks × 4
newTurns = min(currentTurns + turnsGained, 5000)
newHp = min(currentHp + ticks, maxHp)
```

### Passive Income from Skills
Gained every tick alongside turn regen:

```
passiveIncome = floor(wsLevel × 2.5 + seLevel × 3) × ticks
```

- **wsLevel** = Women's Studies skill level
- **seLevel** = Sexual Education skill level

---

## 3. Leveling System

### XP Required Per Level
```
xpNeeded = level × 100 + 50
```

| Level → Next | XP Needed |
|---|---|
| 1 → 2 | 150 |
| 10 → 11 | 1,050 |
| 50 → 51 | 5,050 |
| 100 → 101 | 10,050 |

### Level-Up Bonuses
- **Max HP**: +20
- **Stat Points**: +1
- **Turns**: +20 (capped at 5,000)
- **HP**: Full heal to new maxHp
- **XP carryover**: remaining XP carries into next level
- Multiple level-ups can happen from a single action

### Net Worth Milestones (Respect Awards)
```
netWorth = cash + bank + respect × 10
```

| Net Worth | Respect Awarded |
|---|---|
| $10,000 | 10 |
| $50,000 | 25 |
| $100,000 | 50 |
| $500,000 | 100 |
| $1,000,000 | 250 |
| $5,000,000 | 500 |
| $10,000,000 | 1,000 |
| $50,000,000 | 2,500 |
| $100,000,000 | 5,000 |

Only fires on new highest net worth. Awards the difference from the previous tier.

---

## 4. Respect System

### Titles
| Minimum Respect | Title |
|---|---|
| 100,000 | Godfather |
| 50,000 | Legend |
| 25,000 | Untouchable |
| 10,000 | Kingpin |
| 5,000 | Boss |
| 2,500 | Enforcer |
| 1,000 | Hoodlum |
| 500 | Gangster |
| 100 | Hustler |
| 0 | Street Rat |

### Respect Bonuses
| Bonus | Formula | Cap |
|---|---|---|
| Crime Success | +1% per 1,000 respect | +10% |
| PvP Intimidation | +1 per ~3,333 respect | +30% |
| Drug Trade | +1% per 10,000 respect | +10% |

### Respect Decay
- Activates after **7 days** inactive
- Gang members are **immune**
- Formula:
```
missedDays = floor(daysInactive - 7)
totalDecay = min(missedDays × max(1, floor(respect × 0.02)), missedDays × 20)
```
- Max **20 respect lost per day** of inactivity
- Min **2% of respect per day**

---

## 5. Crime System

### Crime Catalog
| Crime | Min Lvl | Turns | Stat | Difficulty | Reward Range | Risk |
|---|---|---|---|---|---|---|
| Shoplifting | 1 | 2 | agility | 10 | $50–$150 | low |
| Mugging | 3 | 3 | strength | 35 | $100–$400 | low |
| Street Racing | 5 | 4 | agility | 50 | $200–$800 | medium |
| Drug Deal | 8 | 5 | charisma | 45 | $300–$1,200 | medium |
| Hacking Job | 12 | 8 | intelligence | 55 | $500–$3,000 | medium |
| Protection Racket | 10 | 6 | charisma | 50 | $400–$2,000 | medium |
| Bank Robbery | 15 | 10 | intelligence | 70 | $1,000–$5,000 | high |
| Warehouse Heist | 20 | 12 | strength | 75 | $2,000–$8,000 | high |
| Armored Truck Heist | 25 | 14 | strength | 85 | $5,000–$15,000 | high |
| Casino Job | 30 | 16 | intelligence | 92 | $10,000–$30,000 | high |
| Government Black Site | 35 | 20 | intelligence | 98 | $20,000–$60,000 | high |

### Success Chance
```
statValue = user[crime.statUsed]
baseChance = (statValue / crime.baseDifficulty) × 50 + level × 0.2 + 20 + itemCrimeBonus
respectBonus = min(10, floor(respect / 1000))
finalChance = clamp(5, 95, round(baseChance + respectBonus))
```

### Success Rewards
| Reward | Formula |
|---|---|
| Cash | `rewardMin + floor(random × (rewardMax - rewardMin))` |
| XP | `floor(reward × 0.1 + turnCost × 5)` |
| Respect (low) | `1 + floor(random × 3) + floor(level / 10)` |
| Respect (medium) | `3 + floor(random × 6) + floor(level / 10)` |
| Respect (high) | `8 + floor(random × 8) + floor(level / 10)` |

### Failure Penalties
| Risk | HP Lost | Cash Lost | Arrest |
|---|---|---|---|
| Low | 5–14 | none | none |
| Medium | 15–29 | 10%–20% of carried cash | none |
| High | 30–49 | 15%–30% of carried cash | 30% chance |

**Arrest**: Jail time = 10–29 minutes. All drugs confiscated.

### Drug Confiscation on Failure
If carrying drugs and NOT arrested: confiscation chance = `0.3 × max(0.1, 1 - chemistryLevel × 0.005)`
- Chemistry 0: 30%
- Chemistry 100: 15%
- Chemistry 180+: 3% (minimum)

Confiscated amount per stack: `max(1, ceil(quantity × (0.2 + random × 0.3)))` (20%–50%)

### Item Effects on Crime
- Equipped weapon: adds its `crimeBonus` to success chance
- All owned footmen: each adds its `crimeBonus` (stacked)
- Getaway Driver footman: +10 arrest reduction

---

## 6. PvP Combat System

### Attack Types
| Type | Turns | Effect |
|---|---|---|
| mug | 5 | Steal 10% cash (max $500) |
| ambush | 8 | Respect transfer |
| rob | 8 | Steal 15% cash (max $1,000) |
| hit | 10 | Respect transfer |
| spy | 2 | Intel only (always succeeds) |
| house_raid | 15 | Steal 30% cash (max $5,000) + 10% item steal |

### Restrictions
- Must be within **10 levels** of target
- Targets below **level 10** are protected

### Combat Ratings
```
thug   = strength × 2 + guerrilla × 3
dealer = intelligence × 2 + chemistry × 2 + sixthSense × 1
pimp   = charisma × 2 + sexualEd × 3 + womensStudies × 2
```
Specialization multiplies the matching rating by ×1.1.

### Combat Power
```
ratings = calcWarfareRatings(user)
highest = max(thug, dealer, pimp)
combatPower = round(highest) + itemPvpPower + level × 0.5
```

### Respect Intimidation
```
diff = attackerRespect - defenderRespect
modifier = clamp(0.7, 1.3, 1 + diff / 100000)
```

### Win Chance
```
atkPower = combatPower(attacker) × respectModifier
defPower = combatPower(defender)
hitChance = atkPower / (atkPower + max(1, defPower))
```

### Threat Levels
| Power Ratio | Label |
|---|---|
| > 1.3 | Easy |
| > 0.9 | Medium |
| > 0.6 | Hard |
| ≤ 0.6 | Extreme |

### Attacker Win Damage
```
damageDealt = max(1, floor((atkPower - defPower × 0.5) × (0.8 + random × 0.4)))
damageTaken = floor(random × 10)
```

### Attacker Loss Damage
```
damageTaken = max(1, floor((defPower - atkPower × 0.5) × (0.8 + random × 0.4)))
damageDealt = floor(random × 5)
```

### Respect Transfer (Ambush / Hit)
```
baseChange = 5-14 (ambush) or 10-24 (hit)
respectRatio = defenderRespect / max(1, attackerRespect)
respectChange = round(baseChange × clamp(0.5, 3, respectRatio))
if defenderRespect > attackerRespect: respectChange ×= 1.5
```
Winner gains this much respect; loser loses this much.

### Hospitalization
When HP reaches 0 in PvP:
- HP set to **1**
- **15-minute** hospital timer
- Cannot attack or be attacked while hospitalized

### Retaliation System
- Being attacked grants **3 free retaliation attacks** against the attacker
- Window: **12 hours**
- Free attacks do NOT cost turns
- Refreshes to 3 if the same attacker attacks again
- Non-spy attacks only

---

## 7. Skill Training

### Skill Definitions
| Skill | Stat | Base XP | Turn Cost | Max Lvl | Difficulty |
|---|---|---|---|---|---|
| Guerrilla Warfare | strength | 15 | 5 | 100 | 1.0 |
| Chemistry | intelligence | 12 | 6 | 100 | 1.2 |
| Sixth Sense | agility | 10 | 8 | 100 | 1.5 |
| Women's Studies | charisma | 10 | 7 | 100 | 1.3 |
| Sexual Education | charisma | 8 | 10 | 100 | 1.8 |

### XP Per Training
```
xpGained = baseXpPerTrain + floor(statValue × 0.5)
```

### XP Needed Per Level
```
xpNeeded = floor(10 × (currentLevel + 1) × difficulty)
```

| Skill | Lv 0→1 | Lv 50→51 | Lv 99→100 |
|---|---|---|---|
| Guerrilla Warfare | 10 XP | 510 XP | 1,000 XP |
| Chemistry | 12 XP | 612 XP | 1,200 XP |
| Sixth Sense | 15 XP | 765 XP | 1,500 XP |
| Women's Studies | 13 XP | 663 XP | 1,300 XP |
| Sexual Education | 18 XP | 918 XP | 1,800 XP |

### Training Bonuses per Level
| Skill | Effect |
|---|---|
| Guerrilla Warfare | +`floor(level × 0.3)` PvP attack power |
| Chemistry | +`min(20, floor(level × 0.2))`% drug trade efficiency |
| Sixth Sense | +`min(20, floor(level × 0.2))`% PvP damage reduction |
| Women's Studies | +`min(25, floor(level × 0.25))`% passive income |
| Sexual Education | +`min(30, floor(level × 0.3))`% passive income |

### Stat Points from Skills
Every **10 skill levels** (10, 20, 30…100): +1 stat point.

---

## 8. Equipment & Inventory

### Capacity
```
inventoryCapacity = 5 + playerLevel × 2
```
| Level | Slots |
|---|---|
| 1 | 7 |
| 10 | 25 |
| 50 | 105 |
| 100 | 205 |

Drugs stack within a single slot (one slot per drug type). Other items also stack per type.

### Equipping
- Only `arm`-type items (weapons) can be equipped
- Only **one** weapon equipped at a time
- First weapon purchased is auto-equipped
- Equipping a new weapon unequips the previous

### Weapon Prices
| Weapon | Buy | Sell (50%) | Min Lvl | Min Respect | Crime Bonus | PvP Power |
|---|---|---|---|---|---|---|
| Brass Knuckles | $500 | $250 | 1 | 0 | 3 | 5 |
| Switchblade | $1,500 | $750 | 6 | 0 | 5 | 8 |
| Baseball Bat | $3,500 | $1,750 | 10 | 0 | 7 | 12 |
| Pistol | $8,000 | $4,000 | 14 | 0 | 10 | 18 |
| Shotgun | $18,000 | $9,000 | 18 | 0 | 12 | 25 |
| SMG | $35,000 | $17,500 | 22 | 0 | 15 | 35 |
| Sniper Rifle | $80,000 | $40,000 | 28 | 500 | 18 | 50 |

### Footmen
| Name | Buy | Sell (25%) | Min Lvl | Min Respect | Effects |
|---|---|---|---|---|---|
| Street Thug | $1,000 | $250 | 5 | 0 | pvpPower: 2 |
| Lookout | $3,000 | $750 | 8 | 0 | crimeBonus: 3 |
| Enforcer | $10,000 | $2,500 | 12 | 0 | crimeBonus: 5, pvpPower: 5 |
| Hacker | $20,000 | $5,000 | 16 | 0 | crimeBonus: 8 |
| Getaway Driver | $30,000 | $7,500 | 20 | 0 | crimeBonus: 3, pvpPower: 3, arrestReduction: 10 |
| Lieutenant | $75,000 | $18,750 | 25 | 250 | crimeBonus: 10, pvpPower: 10 |

Footmen effects **stack** (all owned footmen contribute).

### Market Discounts
**Chemistry discount on drug purchases:**
```
chemDiscount = min(10, chemistryLevel × 0.5)  // max 10%
price = round(basePrice × (1 - chemDiscount / 100))
```
**Chemistry premium on drug sales:**
```
chemPremium = min(10, chemistryLevel × 0.5)  // max 10%
price = round(currentPrice × (1 + chemPremium / 100))
```

---

## 9. Drug Market

### Drug Catalog
| Drug | Base Buy Price | Min Level | Volatility |
|---|---|---|---|
| Weed | $200 | 1 | 25 |
| Speed | $500 | 8 | 30 |
| LSD | $1,200 | 12 | 35 |
| Coke | $3,000 | 16 | 25 |
| Molly | $5,000 | 20 | 30 |
| Heroin | $12,000 | 25 | 35 |

### Price Refresh
Every **30 minutes**:
```
volatilityPercent = priceVolatility / 100
change = (random × 2 - 1) × volatilityPercent
newPrice = round(basePrice × (1 + change))
currentPrice = max(1, newPrice)
```
Previous price recorded to history. Price history kept for **72 hours**.

### Drug News System
- **40% chance** per market load to generate news
- Max **3 active stories**
- Duration: 2–4 hours
- 22 templates: 13 global (affect all drugs), 9 drug-specific
- Drug-specific news applies an immediate price adjustment on generation
- News effect decays: `max(0.1, 1 - ageHours × 0.3)`
- News auto-expires after 4 hours

### Buy/Sell Rules
- Max **1,000 units** per buy transaction
- Costs **1 turn** per buy or sell
- Sell `-1` to sell all of a drug type

### Drug Dealer Production
| Dealer | Buy Price | Min Lvl | Min Respect | Base Prod/hr |
|---|---|---|---|---|
| Street Dealer | $5,000 | 10 | 0 | 5 |
| Trafficker | $25,000 | 18 | 0 | 12 |
| Cartel Contact | $100,000 | 25 | 1,000 | 30 |
| International Kingpin | $500,000 | 35 | 5,000 | 75 |

**Effective production:**
```
intBonus   = 1 + intelligence × 0.005       // up to 1.5x
chemBonus  = 1 + chemistryLevel × 0.005     // up to 1.5x
sixthBonus = 1 + sixthSense × 0.003         // up to 1.3x
effectiveProd = round(baseProduction × intBonus × chemBonus × sixthBonus)
```

Max accumulation: **12 hours**. Units distributed evenly among all 6 drug types.

### Profit/Loss Respect
```
profitLoss = (sellPrice - avgPurchasePrice) × quantity
respect = floor(profitLoss / 1000)   // 1 respect per $1,000 profit
```

---

## 10. Hoe System

### Hoe Catalog
| Name | Buy Price | Sell (25%) | Min Lvl | Min Respect | Base Income/hr |
|---|---|---|---|---|---|
| Street Walker | $1,500 | $375 | 1 | 0 | $500 |
| Escort | $15,000 | $3,750 | 5 | 0 | $1,500 |
| Cam Girl | $50,000 | $12,500 | 16 | 0 | $4,000 |
| Elite Companion | $150,000 | $37,500 | 22 | 1,000 | $10,000 |
| Madame | $500,000 | $125,000 | 30 | 5,000 | $25,000 |

### Effective Income
```
charBonus = 1 + charisma × 0.01          // up to 2x
wsBonus   = 1 + womensStudies × 0.008    // up to 1.8x
seBonus   = 1 + sexualEd × 0.01          // up to 2x
effectiveIncome = round(baseIncome × charBonus × wsBonus × seBonus)
```

Max multiplier (all maxed): **7.2×**
- Income from $500/hr base → $3,600/hr
- $25,000/hr base → $180,000/hr

### Collection
- Max accumulation: **12 hours**
- Costs **3 turns** to recruit a hoe
- Multiple hoes stack (including duplicates)

---

## 11. Healing & Hospital

### Cash Heal
```
cost = missingHP × $2
// Heals to full maxHp
```

### Turn Sacrifice Heal (when broke)
```
healAmount = floor(maxHp × 0.5)   // 50% of max HP
cost = ALL current turns
```

### HP Restriction
- HP ≤ 0: all gameplay actions are blocked (crimes, PvP, market, casino, skills, gangs, etc.)
- Heal endpoint is always accessible
- Passive regen: +1 HP per 5-minute tick

### Hospital
- Triggered when PvP drops HP to 0
- HP set to 1, 15-minute hospital timer
- Cannot attack/be attacked while hospitalized

---

## 12. Banking

| Action | Cost | Notes |
|---|---|---|
| Deposit | 1 turn | Cash → Bank |
| Withdraw | 1 turn | Bank → Cash |
| Jail phonecall | free (once) | Deposit from jail, no turn cost |

- Bank is protected from PvP loot
- No interest earned

---

## 13. Jail System

### Getting Arrested
- High-risk crime failures: **30%** arrest chance
- Jail time: 10–29 minutes
- All drugs confiscated on arrest

### Restrictions
- Cannot commit crimes, train skills, attack in PvP, buy/sell, assign stats, heal
- One free deposit phonecall allowed

---

## 14. Casino

### Blackjack
- 52-card deck, reshuffled each hand
- Dealer hits on ≤16, stands on 17+, hits on soft 17
- Minimum bet: **$100**

| Outcome | Payout |
|---|---|
| Natural blackjack | 2.5× bet |
| Player win / dealer bust | 2× bet |
| Push | 1× bet (returned) |
| Player bust / dealer win | $0 |

**Double down**: can only be played on first 2 cards, doubles the bet, draws exactly 1 card. If not bust, dealer plays normally and bet is resolved at 2×.

### Slot Machine
| Symbol | Weight | 3-of-a-kind | 2-of-a-kind |
|---|---|---|---|
| cherry | 25 | 5× | 1.5× |
| lemon | 20 | 3× | 1.2× |
| orange | 18 | 4× | 1.3× |
| grape | 15 | 6× | 1.5× |
| bell | 10 | 10× | 2× |
| diamond | 7 | 20× | 3× |
| seven | 3 | 50× | 5× |
| skull | 2 | 100× | 10× |

Weighted random per reel (3 reels). Pairs match middle symbol (reel 2). Minimum bet: **$100**.

### Ride the Bus
4 rounds of guessing. Wrong guess = lose entire bet.

| Round | Guess | Payout Multiplier |
|---|---|---|
| 1 | Red or black | 1× |
| 2 | Higher or lower (vs previous) | 2× |
| 3 | Inside or outside (between 2 cards) | 4× |
| 4 | Exact suit | 10× |

- Round 1: hearts/diamonds = red, clubs/spades = black
- Round 2: equal rank = automatic loss
- Round 3: "inside" means strictly between the two reference cards; equal to either = loss
- Round 4: pick exactly hearts, diamonds, clubs, or spades

Minimum bet: **$100**.

---

## 15. Gang System

### Creation
- Name: 3–25 chars
- Tag: 2–5 uppercase alphanumeric
- Description: max 100 chars
- Max members: 10
- Cost: free

### Roles & Permissions
| Role | Invite | Kick | Promote | Demote | Transfer | Disband |
|---|---|---|---|---|---|---|
| Leader | ✓ | ✓ (anyone) | ✓ | ✓ | ✓ | ✓ |
| Lieutenant | ✓ | ✓ (members) | ✗ | ✗ | ✗ | ✗ |
| Enforcer | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Member | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

Promotion order: member → enforcer → lieutenant.

### Passive Respect
```
hourlyRate by role: member=2, enforcer=4, lieutenant=6, leader=10
gangLevelMultiplier = 1 + (gangLevel - 1) × 0.1
payout = floor(elapsedHours × hourlyRate × gangLevelMultiplier)
```
Payouts calculated when gang detail is loaded (≥1 hour elapsed).

### Vault
- Members can deposit cash (costs 1 turn)
- Used for operation upgrade costs, turf claiming, arsenal purchases
- No withdrawal mechanism
- Deposit grants gang reputation: 1 rep per $500 deposited

### Gang Reputation
Earned by members through regular gameplay:

| Action | Rep Gain | Contract Progress |
|---|---|---|
| Crime success | +1 | `earn_cash`: reward amount, `crimes`: +1 |
| PvP win | +10 | `pvp_wins`: +1 |
| Vault deposit | +1 per $500 | `vault_deposits`: deposit amount |

### Gang Leveling
```
reputationToNext = floor(500 × level^1.5)
```

| Level | Rep Needed |
|---|---|
| 1→2 | 500 |
| 3→4 | 2,598 |
| 5→6 | 5,590 |
| 10→11 | 15,811 |

**Level-up requirements:**
1. Meet the reputation threshold
2. Complete the weekly contract
3. Leader initiates the level-up

**Level-up process:**
- Reputation resets to surplus over threshold
- Contract and contributors are deleted
- A new contract is generated when rep reaches the next threshold

### Level Benefits
| Level | Max Members | Vault Cap | Crime Bonus | PvP Bonus | Tag Color |
|---|---|---|---|---|---|
| 1 | 10 | $100K | 0% | 0% | purple |
| 2 | 12 | $150K | +1% | +2% | purple |
| 5 | 18 | $300K | +4% | +8% | gold |
| 10 | 28 | $550K | +9% | +18% | red |
| 20 | 48 | $1.05M | +19% | +38% | red |

```
maxMembers = 10 + (level - 1) × 2
vaultCapacity = 100000 + (level - 1) × 50000
crimeBonus = (level - 1) × 1%
pvpBonus = (level - 1) × 2%
tagColor: level ≥ 10 = "red", level ≥ 5 = "gold", level ≥ 3 = "cyan", else "purple"
```

### Weekly Contracts
When reputation reaches the next level threshold, a weekly contract is auto-generated:
- 4 types: `earn_cash`, `pvp_wins`, `vault_deposits`, `crimes`
- Randomly selected each week
- 7-day deadline (resets if expired)
- Contributors tracked per user
- Contract must be completed before gang can level up

| Contract Type | Target | Progress Source |
|---|---|---|
| earn_cash | Earn $X from crimes | Cash rewards from crime success |
| pvp_wins | Win X PvP battles | PvP wins |
| vault_deposits | Deposit $X to vault | Vault deposits |
| crimes | Commit X crimes | Crime completions |

---

## 16. Gang Operations

### Operation Catalog
| Operation | Skill | L1 | L1 $/member | L2 Skill | L2 $ | L1→2 Cost | L3 Skill | L3 $ | L2→3 Cost | Task |
|---|---|---|---|---|---|---|---|---|---|---|
| Street Protection Racket | GW | 15 | $3,000 | 35 | $7,000 | $35K | 60 | $14,000 | $100K | pvp_win |
| Moonshine Operation | Chemistry | 10 | $6,000 | 30 | $14,000 | $60K | 55 | $28,000 | $180K | crime |
| Fence Network | Sixth Sense | 10 | $4,000 | 28 | $9,000 | $40K | 50 | $18,000 | $120K | crime |
| Escort Agency | WS | 10 | $2,000 | 28 | $5,000 | $25K | 50 | $10,000 | $80K | crime |
| Adult Entertainment Studio | SE | 12 | $10,000 | 30 | $22,000 | $90K | 55 | $45,000 | $280K | crime |
| Arms Trafficking Ring | GW | 20 | $25,000 | 40 | $55,000 | $300K | 65 | $110,000 | $750K | pvp_win |
| Money Laundering Front | Chemistry | 18 | $12,000 | 38 | $26,000 | $110K | 60 | $52,000 | $350K | deposit_vault |
| Safe Cracking Crew | Sixth Sense | 20 | $15,000 | 40 | $35,000 | $150K | 65 | $70,000 | $450K | crime |
| Casino Scam Ring | WS | 15 | $8,000 | 32 | $18,000 | $75K | 55 | $35,000 | $220K | pvp_win |
| Underground Fighting Ring | SE | 18 | $18,000 | 35 | $40,000 | $200K | 60 | $80,000 | $550K | train_skill |

### Operation Requirements (Multi-Skill)
| Operation | Requirement 1 | Requirement 2 | Requirement 3 | Requirement 4 | Requirement 5 |
|---|---|---|---|---|---|
| Escort Agency | WS Lv.10 | SE Lv.8 | — | — | — |
| Street Protection Racket | GW Lv.14 | Chemistry Lv.12 | — | — | — |
| Fence Network | SS Lv.12 | WS Lv.12 | — | — | — |
| Moonshine Operation | Chemistry Lv.18 | GW Lv.14 | SS Lv.10 | — | — |
| Casino Scam Ring | WS Lv.18 | SS Lv.16 | SE Lv.14 | — | — |
| Adult Entertainment Studio | SE Lv.20 | WS Lv.18 | Chemistry Lv.16 | — | — |
| Money Laundering Front | Chemistry Lv.24 | SS Lv.20 | GW Lv.18 | — | — |
| Safe Cracking Crew | SS Lv.25 | GW Lv.22 | Chemistry Lv.20 | SE Lv.16 | — |
| Underground Fighting Ring | GW Lv.28 | SE Lv.24 | WS Lv.22 | Chemistry Lv.18 | — |
| Arms Trafficking Ring | GW Lv.32 | Chemistry Lv.28 | SS Lv.25 | SE Lv.22 | WS Lv.18 |

Members must satisfy **at least one** requirement to be eligible for payouts.

### Daily Tasks
| Type | Verification |
|---|---|
| pvp_win | PvP log shows a win today |
| crime | Crime log has any entry today |
| train_skill | UserSkills.lastTrainedAt is today for the relevant skill |
| deposit_vault | Auto-marked on vault deposit |

### Payout Cycle
- **24-hour** cycle
- Daily income = `completedMembers × incomeRate`
- Paid to gang vault
- Leader can stop anytime (final payout calculated)
- If 0 completed: no payout, operation stays idle

### Upgrading
- Levels 1→2 and 2→3
- Costs paid from gang vault
- Leader must meet the skill requirement

---

## 17. Database Schema (Tables)

| Table | Purpose |
|---|---|
| users | Core player data |
| playerStats | Crime/PvP tracking stats |
| crimeDefinitions | Crime catalog (11 crimes) |
| crimeLog | Crime history |
| pvpLog | PvP history |
| retaliationLog | Free attack tracking |
| notifications | In-game messages |
| items | All purchasable items (weapons, footmen, dealers, hoes) |
| userInventory | Items owned by players |
| gangs | Gang data |
| gangMembers | Membership & roles |
| gangInvites | Pending invites |
| skillDefinitions | Skill catalog (5 skills) |
| userSkills | Player skill progress |
| gangOperationDefs | Operation catalog (10 ops) |
| gangActiveOperations | Currently active operation |
| gangDailyTasks | Daily task completion |
| drugPriceHistory | Drug price records |
| drugNews | Active drug market news |

---

## 18. Item Effects System

```typescript
interface ItemEffects {
  crimeBonus?: number;         // Added to crime success %
  pvpPower?: number;           // Added to combat power
  arrestReduction?: number;    // Getaway Driver: 10
  hpBonus?: number;            // (unused)
  passiveIncome?: number;      // (unused)
  drugProduction?: number;     // Drug dealers
  incomePerHour?: number;      // Hoes
}
```

---

## 19. HP=0 Block

When HP reaches 0 (from crime failures):
- **All gameplay actions blocked** (crimes, PvP, skills, market, bank, casino, gangs, hoes)
- Can still view data (dashboard, leaderboard, profile)
- Must heal to continue playing
- Dashboard shows "CRITICAL" warning with pulsing HP display

---

## 20. Combat Ratings (Warfare)

```
thug   = strength × 2 + guerrilla × 3
dealer = intelligence × 2 + chemistry × 2 + sixthSense × 1
pimp   = charisma × 2 + sexualEd × 3 + womensStudies × 2
```

Specialization multipliers:
- enforcer → thug × 1.1
- dealer → dealer × 1.1
- hacker → pimp × 1.1

---

## 21. Skill Crimes

A timing-based mini-game that replaces the RNG crime system with player skill. Higher accuracy = higher rewards.

### Skill Crime Catalog
| Crime | Min Lvl | Turns | Reward Range | Speed |
|---|---|---|---|---|
| Lockpicking | 3 | 3 | $200–$600 | 1.0 |
| Pickpocketing | 8 | 4 | $500–$1,500 | 1.5 |
| Safe Cracking | 15 | 8 | $2,000–$8,000 | 2.2 |
| Data Heist | 25 | 12 | $8,000–$25,000 | 3.0 |

### Gameplay
- **15-second** Guitar Hero-style game with 4 lanes (keys: 1, 2, 3, 4)
- Colored markers fall from top to bottom in each lane
- A target zone is at the bottom of the track
- Press the corresponding key when a marker reaches the target zone
- Web Audio API generates triangle-wave pluck sounds on hit, sawtooth on miss

### Reward Calculation
```
range = rewardMax - rewardMin
reward = rewardMin + floor(range × accuracy / 100)
xpGained = max(1, floor(reward × 0.1 × (1 + accuracy / 100 × 0.5)))
```

| Accuracy | Result Text | Notes |
|---|---|---|
| ≥ 95% | Perfect | Maximum reward tier |
| ≥ 80% | Great | Near-perfect execution |
| ≥ 60% | Good | Solid performance |
| ≥ 40% | Decent | Below threshold: still pays but "shaky" |
| < 40% | Sloppy | Poor performance, minimal payout |

### Note Generation
```
avgGap = max(0.25, 0.7 - (speed - 1) × 0.15)
```
- Speed 1.0 (Lockpicking): ~0.7s gap between notes
- Speed 3.0 (Data Heist): ~0.4s gap between notes
- Hit window: 0.25s before/after perfect hit time
- 4 lanes, random lane assignment per note

### Level-Up from Skill Crimes
Uses same XP formula as regular crimes: `xpNeeded = level × 100 + 50`

---

## 22. Turf Districts

Gangs can claim, defend, and lose districts on the city map. Each district provides passive bonuses.

### District Catalog
| District | Claim Cost | Crime Bonus | PvP Bonus | Income Bonus |
|---|---|---|---|---|
| Warehouse District | $25,000 | +3% | +5% | +2% |
| Downtown Financial | $100,000 | +5% | +8% | +5% |
| Industrial Sector | $300,000 | +8% | +5% | +10% |
| Docklands | $600,000 | +10% | +12% | +8% |
| Suburbs | $1,000,000 | +15% | +15% | +15% |

### Claiming
- Any member can initiate a claim
- Cost deducted from gang vault
- District must be unclaimed

### Abandoning
- Leader only
- Refunds **50%** of claim cost to vault
- All arsenal items assigned to the district are unassigned

### Challenge System
Any member can challenge an enemy-held district:
1. **Challenge fee**: 10% of claim cost (paid from vault)
2. **Power calculation** compares attacker vs defender:
   ```
   attackerPower = memberStats (strength + agility + intelligence + charisma + endurance + level × 2) for all members
   defenderPower = memberStats + assignedArsenalPvpPower
   ```
3. **Immediate takeover** if `attackerPower > defenderPower`
4. **24-hour challenge timer** if `attackerPower ≤ defenderPower` — expires if not enough power

### Defense
- Arsenal items assigned to a district contribute their `pvpPower` to defense
- Displayed as "Defense: +X" on the turf card
- Calculated in real-time during challenge resolution

---

## 23. Gang Arsenal

A shared weapon and equipment pool for the gang. Items are bought from the catalog and assigned to turfs for defense.

### Arsenal Catalog
| Item | Type | PvP Power | Crime Bonus | Price |
|---|---|---|---|---|
| Brass Knuckles | melee | 4 | 1 | $3,000 |
| Gang Knife | melee | 8 | 2 | $10,000 |
| Machete | melee | 14 | 4 | $40,000 |
| Katana | melee | 22 | 6 | $120,000 |
| Pistol | firearm | 12 | 3 | $25,000 |
| Sawed-off Shotgun | firearm | 20 | 5 | $50,000 |
| SMG | firearm | 28 | 7 | $100,000 |
| Assault Rifle | firearm | 35 | 10 | $200,000 |
| Sniper Rifle | firearm | 45 | 12 | $350,000 |
| Firecrackers | explosive | 6 | 3 | $8,000 |
| Molotov Cocktail | explosive | 15 | 8 | $35,000 |
| Grenade | explosive | 25 | 14 | $90,000 |
| C4 Explosive | explosive | 40 | 20 | $250,000 |
| Leather Jacket | armor | 2 | 0 | $15,000 |
| Bulletproof Vest | armor | 5 | 0 | $75,000 |
| Tactical Armor | armor | 10 | 2 | $180,000 |
| Exoskeleton Plate | armor | 18 | 4 | $400,000 |

### Purchasing
- Leader and lieutenants can buy from the catalog
- Cost deducted from gang vault
- Item starts at 100/100 durability

### Durability & Repair
```
dmgRatio = 1 - durability / maxDurability
repairCost = max(100, floor(purchasePrice × 0.5 × dmgRatio))
```
- Items lose durability when used in turf defense
- Repair requires leader or lieutenant role
- Repair cost scales with damage taken (50% of purchase price at 0 durability)
- Minimum repair cost: $100

### Drag-and-Drop Assignment (Turf Defense)
- Leader, lieutenants, and **enforcers** can assign items to owned turfs
- HTML5 Drag and Drop: drag from inventory panel onto turf card
- Items stack on turfs — multiple items per district
- Each item's `pvpPower` adds to the district's defense power
- Unassign with ✕ button on the item chip
- Regular members see a read-only view

### Turf Arsenal Display
- **Left panel**: Arsenal inventory grid — unassigned items (draggable)
- **Right panel**: Turf defense — owned districts as drop zones
- Assigned items shown as chips inside turf cards (name + pvpPower)
- District shows cumulative "Defense: +X" based on all assigned items

### Activity Log
All arsenal actions are logged: purchases, assignments, unassignments, repairs.

---

## 24. Database Schema (Additional Tables)

| Table | Purpose |
|---|---|
| turfDistricts | District catalog (5 districts) |
| gangTurf | Claimed districts with owner/challenge info |
| gangArsenal | Gang-owned arsenal items |
| gangArsenalLog | Arsenal action history |
| gangContracts | Weekly level-up contracts |
| gangContractContributors | Per-user contract progress |
| skillCrimeDefinitions | Skill crime catalog (4 crimes) |
| skillCrimeLog | Skill crime attempt history |
| gangOperationPayouts | Historical operation payout records |
| gangOperationReqs | Multi-skill operation requirements |
