# Game Design Document: Gang Wars (2026 Revival)

---

## 1. Game Overview

### 1.1 Vision & Target Audience

**Vision:** Rebuild the classic Gang Wars PBBG (Persistent Browser-Based Game) experience for a modern audience — fast-paced turns, strategic depth, social competition, and zero pay-to-win. A game you can play 5 minutes or 50 minutes a day and still feel progress.

**Target Audience:**
- Nostalgic players of early PBBGs (Gang Wars, Torn, Omerta, Mafia Wars)
- Mobile gamers looking for depth without time sinks
- Competitive/social players who enjoy leaderboards, turf wars, and guild-style gangs
- Players aged 20-40 who want a nostalgic but polished experience

**Platforms:** Web (mobile-first responsive), potential native wrappers later.

### 1.2 Unique Selling Points

| Feature | Old Gang Wars / Typical PBBG | This Game |
|---|---|---|
| Turns | Often confusing, slow regen | Clear 5-min tick, big caps, visible countdowns |
| UI | Cluttered tables, tiny links | Card-based, dark theme, mobile-first |
| Combat | Text logs, RNG-heavy | Intel system, estimated odds, animated results |
| Progression | Grindy with unclear paths | Skill trees, clear specialization, varied activities |
| Fairness | Often pay-to-win | Cosmetic-only monetization, capped turn buying |
| Real-time | Chat only | Live notifications, attack feeds, turf war events |

### 1.3 Monetization Philosophy

**Keep it fair. Never pay-to-win.**

Accepted monetization:
- **Cosmetics only:** Player avatars, gang logos, name colors, profile backgrounds, chat stickers
- **Optional convenience:** Small XP boosts (limited per day), extra respect from crimes (limited)
- **Turn packs?** Capped — max 10 bonus turns per day purchased, never a competitive advantage

What we WILL NOT do:
- Sell stat boosts, exclusive weapons, protective gear behind paywalls
- Allow purchasing turns beyond daily cap
- Hide core features behind subscriptions

Revenue model: Cosmetic shop + battle pass-style "season rewards" (cosmetic-only track).

---

## 2. Core Gameplay Loop & Mechanics

### 2.1 Turn/Energy System

**Core concept:** Actions cost turns. Turns regenerate over time. This is the primary pacing mechanism.

**Regeneration:**
- 1 turn every 5 minutes (12 turns per hour)
- Max cap: 100 turns (soft cap), 150 (hard cap with bonuses)
- Full refill from empty: ~8.3 hours

**Bonus turns sources:**
- Level up: +20 turns (can exceed cap)
- Daily login: +10 turns
- Gang vault bonus (passive): +1-3 turns/hour based on turf owned
- Purchased: max 10 bonus turns/day (can exceed cap)

**Turn costs by action type:**

| Action | Turn Cost |
|---|---|
| Petty crime (mugging, shoplifting) | 2 |
| Serious crime (robbery, drug deal) | 5 |
| Heist / high-risk | 10-15 |
| Train stat | 3 |
| Attack player | 5 |
| Rob player | 8 |
| Spy on player/gang | 3 |
| Work (low-income fallback) | 1 |
| Recruit crew member | 10 |
| Travel between districts | 1 |

**Offline progress:** Turns accumulate up to cap. No "idle income" beyond turn regen — all progress requires active play. This keeps sessions short and fair.

### 2.2 Player Stats & Progression

**Primary Stats:**

| Stat | Effect | Max Level |
|---|---|---|
| Strength | Melee damage, intimidation success | 100 |
| Agility | Dodge chance, crime success rate | 100 |
| Intelligence | Heist success, hacking, money found | 100 |
| Charisma | Recruiting, prices, protection payouts | 100 |
| Endurance | HP bonus, reduced damage taken | 100 |

**Derived Stats:**
- **HP:** 50 + (Endurance × 5)
- **Damage:** Base 5 + (Strength × 1.5) + weapon bonus
- **Dodge:** Agility × 0.2% (max 40%)
- **Crit Chance:** Agility × 0.1% + gear bonus (max 15%)

**Leveling:**
- XP required per level: `level × 100 + 50`
- Each level: +1 stat point to distribute, +20 max HP, +20 turn refill
- Level cap: 100
- Max stats = 100 (you cannot max all — specialization is required)

**Stat point costs per level (incremental):**
- 1-25: 1 point per stat-up
- 26-50: 2 points per stat-up
- 51-75: 3 points per stat-up
- 76-100: 5 points per stat-up

→ A player cannot max all stats. They must specialize.

**Respect (secondary currency):**
- Earned from PvP wins, gang wars, high-tier crimes, leaderboard placement
- Spent on: gang creation, black market access, special gear, crew commands
- Never purchasable with real money

### 2.3 Crime System

**Design philosophy:** Crimes are the main PvE loop. Different crimes suit different builds. Higher risk = higher reward. Success chance is visible upfront.

**Crime list (MVP — 8 crimes):**

| Crime | Turns | Min Level | Stat Used | Success% Base | Cash Reward | Risk |
|---|---|---|---|---|---|---|
| Shoplifting | 2 | 1 | Agility | 85% | $50-$150 | Low |
| Mugging | 3 | 3 | Strength | 75% | $100-$400 | Low |
| Street Racing | 4 | 5 | Agility | 65% | $200-$800 | Medium |
| Drug Deal | 5 | 8 | Charisma | 70% | $300-$1,200 | Medium |
| Bank Robbery | 10 | 15 | Intelligence | 50% | $1,000-$5,000 | High |
| Warehouse Heist | 12 | 20 | Strength | 45% | $2,000-$8,000 | High |
| Hacking Job | 8 | 12 | Intelligence | 55% | $500-$3,000 | Medium |
| Protection Racket | 6 | 10 | Charisma | 60% | $400-$2,000 | Medium |

**Success Calculation:**
```
effectiveStat = playerStat + (gear bonuses)
difficulty = crimeBaseDifficulty (e.g. 50 for Bank Robbery)
successChance = clamp((effectiveStat / difficulty) × 50 + (level × 0.2) + 10, 5, 95)
```

- Always at least 5% chance, never above 95% (there's always risk)
- Agility and Charisma crimes get a small bonus from successChance cap (95%)
- Strength and Intelligence crimes have slightly higher max rewards

**Failure consequences:**
- Low risk: Lose the turn, minor HP loss (5-10)
- Medium risk: Lose turn, HP loss (15-25), possibly lose some cash (10-20%)
- High risk: Lose turn, significant HP loss (30-50), chance of arrest (jail time = 10-30 min cooldown)

**Cooldowns:**
- Each crime has an individual cooldown (5-30 min depending on seriousness)
- Prevents infinite grinding of best crime
- Encourages rotating between activities

### 2.4 Combat / PvP Rules

**Attack types:**

| Type | Turns | Purpose | Loot |
|---|---|---|---|
| Mug | 5 | Steal cash | Max 10% of target's on-hand cash |
| Ambush | 8 | Damage + humiliation | Cash + small respect |
| Rob | 8 | Steal items | Random unequipped item |
| Hit (contract) | 10 | Reduce target's HP/respect | Respect gain, bounty reward |

**Attack flow:**
1. Search player by name or pick from leaderboard
2. See intel: estimated strength comparison (bars, not raw numbers), success odds
3. Confirm attack → turns deducted
4. Resolution screen: animated combat log, damage dealt, loot summary

**Combat formula (simplified):**
```
attackerPower = (Strength × 2) + (Agility × 1) + weaponPower + (level × 0.5)
defenderPower = (Strength × 2) + (Agility × 1) + weaponPower + (level × 0.5) + dodgeBonus

hitChance = attackerPower / (attackerPower + defenderPower) × 100
damage = (attackerPower - defenderPower × 0.5) × random(0.8, 1.2)
```

- Attacks have a 4-hour cooldown per target (prevents bullying)
- Max 5% HP lost per attack (defender cannot be killed, only "hospitalized" = 15-min cooldown)
- Hospitalized players can't be attacked for 30 min
- New players (under level 10) have full PvP immunity

**Reprisal system:**
- If you attack someone, they get a "Revenge" button for 24 hours (costs 3 turns instead of 5)
- Encourages strategic attacks, not random griefing

### 2.5 Economy

**Currencies:**

| Currency | Earned Via | Spent On | Tradeable? |
|---|---|---|---|
| Cash | Crimes, PvP loot, working | Gear, items, training, healing | Yes (black market) |
| Respect | PvP wins, wars, high crimes, leaderboards | Gang creation, black market, special items, crew commands | No |
| Gold (premium) | Daily login, events, purchase | Cosmetics, name changes, convenience items | No |

**Items & Equipment:**

| Slot | Examples | Rarity Tiers |
|---|---|---|
| Melee | Knuckles, Bat, Machete, Katana | Common → Rare → Epic |
| Ranged | Pistol, SMG, Rifle, Sniper | Common → Rare → Epic |
| Armor | Leather Jacket, Kevlar Vest | Common → Rare |
| Vehicle | Scooter, Sedan, Sports Car, Armored SUV | Common → Rare → Epic |
| Consumable | Medkit, Ammo, Lucky Charm | Consumable |

**Rarity scaling:**
- Common: Store, low crimes
- Rare: Black market, gang vault, medium crimes
- Epic: Heists, war rewards, events, top-tier PvP

**Black Market:**
- Unlocked at Level 15 OR 500 Respect
- Rotating inventory (refreshes every 6 hours)
- Sells rare items for cash + respect
- Accessible to gang members at a discount

**Properties (Phase 2+):**
- Safehouse: HP regen bonus, storage
- Club: Passive income (small), social hub
- Warehouse: Crew capacity, bulk storage
- Casino: Respect income, gambling mini-game

### 2.6 Skill Trees / Specializations

**Three specializations, chosen at Level 10 (one free respec):**

**Enforcer (Strength + Endurance focus):**
- **Brawler:** +20% melee damage
- **Tank:** +15% max HP, -10% damage taken
- **Intimidate:** +15% success on intimidation-based crimes
- **Warlord:** +10% gang war effectiveness

**Dealer (Charisma + Agility focus):**
- **Negotiator:** Better prices (buy -10%, sell +10%)
- **Connections:** +15% crime success on charisma crimes
- **Fence:** Can sell stolen goods for 20% more
- **Protection:** Passive income from rackets +25%

**Hacker (Intelligence + Agility focus):**
- **Slicer:** Better heist success, +20% intelligence crime rewards
- **Ghost:** -15% chance of arrest on failure
- **Scout:** Better PvP intel (see exact power numbers)
- **Saboteur:** Can set traps during gang wars (defensive bonus)

**Tree structure:** Linear 4-node tree (not a sprawling grid). Each node costs stat points + cash. Max all 4 over time but order matters.

---

## 3. Social & Persistent Features

### 3.1 Gang Creation & Management

**Requirements to create:** Level 15 + 2,000 Respect + $50,000 cash

**Gang slots:** 5 members base, +2 per level (max 25)

**Roles:**
- **Leader:** Full control, war declaration, diplomacy
- **Lieutenant:** Recruitment, vault management
- **Enforcer:** War planning, member discipline
- **Member:** Basic participation

**Gang features:**
- Shared vault (members contribute %, leader allocates for wars/upgrades)
- Gang chat with activity feed
- Customizable logo (text + icon picker, no uploads initially)
- Gang XP → levels → perks (more members, bonus to crimes, vault interest)

### 3.2 Turf Control & Passive Income

**Map:** City divided into 12 districts (e.g., Downtown, Docks, Industrial, Suburbs, Slums, Financial District, etc.)

**Mechanic:**
- Gangs claim turf by winning turf battles (scheduled events, not constant)
- Each district generates passive resources:
  - Cash districts (e.g., Financial: +$500/hr)
  - Respect districts (e.g., Slums: +5 respect/hr)
  - Turn bonus districts (e.g., Industrial: +1 turn/hr)
- Turf bonuses stack per district controlled
- Turf is contested every 48 hours (war declaration phase)

**Turf Wars (weekly event):**
- Friday 8pm: Declaration phase opens (24h)
- Saturday 8pm: War phase begins (2 hours)
- Gangs fight for control points in the district
- Most control points at end = winner
- Losers get a 48-hour truce (cannot be attacked)

### 3.3 Alliances, Wars & Diplomacy

**Alliances:**
- Formal pacts between gangs
- Shared chat channel
- Cannot attack allies
- Alliance limit: 2 gangs (3 total including your own)

**Gang Wars:**
- Declared by Leader/Lieutenant
- Lasts 24 hours
- Points earned from: successful attacks on enemy gang
- Bonus points for: attacking higher-level enemies, winning on enemy turf
- Rewards: Respect for all members, bonus cash pool, bragging rights

**Cooldown:** 7 days between wars with same gang.

### 3.4 Leaderboards & Events

**Leaderboards:**
- Player level
- Total respect
- Net worth (cash + items + property)
- PvP wins
- Gang size + level
- Turf controlled

**Daily Events (automated):**
- "Most crimes committed today" — winner gets cash + respect bonus
- "Biggest PvP streak" — respect bonus
- "Gang with most activity" — turn bonus for all members

**Weekly Events:**
- Turf Wars (Saturday)
- Bounty Board: Players/gangs can place bounties on targets
- "Wanted" list: Most arrested players get a jailbreak event

**Seasonal (every 3 months):**
- Leaderboard reset (partial — cosmetics and gang level persist)
- New crime lines, seasonal gear
- Top 10 players/gangs get exclusive cosmetics

---

## 4. UI/UX Details

### 4.1 Visual Design Language

- **Theme:** Dark backgrounds (#0a0a0f primary, #1a1a2e secondary), crimson (#dc2626) and neon cyan (#06b6d4) accents
- **Typography:** Inter (UI), JetBrains Mono (numbers/stats)
- **Cards:** Rounded (12px), subtle borders, glass morphism on active states
- **Icons:** Lucide icon set (gang-themed: Skull, DollarSign, Swords, Car, Building, Users)
- **Micro-animations:** Turn countdown tick (second hand sweep), crime success slide-in, attack result typewriter log

### 4.2 Main Screen Layouts

**Dashboard (Home):**
```
┌─────────────────────────────┐
│ [Logo]   [Lv.14] PlayerName  │
│          💰 $12,450  ⚡45/100 │
│          👑 Respect: 890     │
├─────────────────────────────┤
│ ┌───────┐ ┌───────┐ ┌─────┐ │
│ │ Crimes │ │ Train │ │Fight│ │
│ │ Today  │ │  Str  │ │     │ │
│ │ 23     │ │ +2.4  │ │ 82% │ │
│ └───────┘ └───────┘ └─────┘ │
│                             │
│ Recent Activity             │
│ ┌─────────────────────────┐ │
│ │ ▶ You robbed PlayerX    │ │
│ │   (-$340)               │ │
│ │ ▶ PlayerY attacked you  │ │
│ │   (you won, +$120)      │ │
│ └─────────────────────────┘ │
│                             │
│ [Bottom Nav: Home|Crimes|   │
│  Gang|Map|Market|Profile]   │
└─────────────────────────────┘
```

**Crimes Page:**
```
┌─────────────────────────────┐
│ ← Back        Crimes        │
│                             │
│ ⚡ 45/100 turns             │
│                             │
│ ┌─────────────────────────┐ │
│ │ 🏪  Shoplifting    2t   │ │
│ │ 85%  $50-150  Low risk  │ │
│ │             [Commit] ▶  │ │
│ ├─────────────────────────┤ │
│ │ 🔫  Mugging        3t   │ │
│ │ 75%  $100-400  Low risk │ │
│ │             [Commit] ▶  │ │
│ ├─────────────────────────┤ │
│ │ 💊  Drug Deal      5t   │ │
│ │ 70%  $300-1200 Med risk │ │
│ │     ⏰ Cooldown: 4:32   │ │
│ └─────────────────────────┘ │
│ ...                         │
└─────────────────────────────┘
```

**Player Profile:**
```
┌─────────────────────────────┐
│ ← Back      Player Profile  │
│                             │
│ ┌─────────────────────────┐ │
│ │   [Avatar]  PlayerName  │ │
│ │   Level 14  Respect 890 │ │
│ │   ━━━━━━━━━━━━░░░░ 65% │ │
│ │   to next level         │ │
│ ├─────────────────────────┤ │
│ │ Stats                   │ │
│ │ Str: 28 ━━━━━━━██░░ 28%│ │
│ │ Agi: 35 ━━━━━━━━██ 35%│ │
│ │ Int: 12 ━━━░ 12%       │ │
│ │ Cha: 22 ━━━━━░░ 22%    │ │
│ │ End: 18 ━━━░░ 18%     │ │
│ │ [Spend Points: 0]      │ │
│ ├─────────────────────────┤ │
│ │ Equipment               │ │
│ │ 🗡️ Bat          (+5 dmg)│ │
│ │ 👕 Leather Jack (+3 def)│ │
│ │ 🚗 Scooter      (+2 spd)│ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Combat Screen:**
```
┌─────────────────────────────┐
│ ← Back         Attack       │
│                             │
│ Search player: [__________] │
│                             │
│ Target: PlayerX (Lv. 22)    │
│ Threat: ████░░░░░ Medium    │
│ Est. win: 58%              │
│                             │
│ [🔫 Mug] [⚔️ Ambush] [🕵️ Spy]│
│                             │
│ ──── Combat Log ────        │
│ You strike PlayerX for 24   │
│ PlayerX dodges your attack  │
│ You hit PlayerX for 18      │
│ PlayerX strikes for 12      │
│ ──── Result ────            │
│ ✅ VICTORY                  │
│ Loot: $450                  │
│ Respect gained: +12         │
└─────────────────────────────┘
```

**Gang Page:**
```
┌─────────────────────────────┐
│ 💀 Slum Dragons     Lv. 3   │
│ Members: 12/20              │
│ Turf: 3 districts           │
│ ──────────────────────────  │
│ [🏠 Vault] [⚔️ War] [💬 Chat] │
│                             │
│ Members                     │
│ ┌─────────────────────────┐ │
│ │ 👑 BigBoss (Leader) Lv34│ │
│ │ ⭐ Lieutenant (Lt.) Lv28│ │
│ │ ● Member1        Lv22   │ │
│ │ ● Member2        Lv19   │ │
│ └─────────────────────────┘ │
│                             │
│ Turf                        │
│ Downtown: ✅ $500/hr        │
│ Docks:     ❌               │
│ Slums: ✅ +2 respect/hr    │
└─────────────────────────────┘
```

**Map/City View:**
```
┌─────────────────────────────┐
│ ← Back       City Map       │
│                             │
│  ┌────┐  ┌────────┐        │
│  │Subs│  │Financial│        │
│  │ ❌ │  │  ✅  │        │
│  └────┘  └────────┘        │
│  ┌────┐  ┌────┐  ┌────┐   │
│  │Slums│  │Down │  │Docks│  │
│  │ ✅ │  │ ✅ │  │ ❌ │   │
│  └────┘  └────┘  └────┘   │
│  ┌────┐  ┌────┐            │
│  │Indus│  │Port │            │
│  │ ❌ │  │ ❌ │            │
│  └────┘  └────┘            │
│                             │
│ Legend: ✅ Your turf         │
│         ❌ Enemy / Neutral   │
└─────────────────────────────┘
```

### 4.3 Mobile vs Desktop Differences

| Element | Mobile | Desktop |
|---|---|---|
| Navigation | Bottom tab bar (5 icons) | Left sidebar (full labels) |
| Cards | Full width, stacked | Grid layout (2-3 columns) |
| Map | Single column scroll | Side panel + full map view |
| Combat | Vertical scroll log | Side-by-side with stats |
| Modals | Full-screen sheets | Centered dialogs |

**Mobile-first breakpoints:**
- Mobile: < 640px (bottom nav, single column)
- Tablet: 640-1024px (side nav icons, 2-column grid)
- Desktop: > 1024px (sidebar with labels, 3-column grid)

### 4.4 Key User Flows

**Flow 1: Committing a Crime**
```
Dashboard → Tap "Crimes" → See crime list with odds
→ Tap crime card → Confirm dialog ("Commit Mugging? (3 turns)")
→ Success: Slide-in result card with cash earned + XP gained
→ Failure: Red flash, HP loss notification, maybe arrest timer
→ Auto-return to crime list (cooldown shown on used crime)
```

**Flow 2: Attacking a Player**
```
Dashboard → Tap "Fight" → Search or pick from leaderboard
→ See target intel → Select attack type → Confirm
→ Combat animation (2-3 seconds) → Result screen with log + loot
→ Option to "Revenge?" if you lost
→ Option to "Profile" or "Attack Again" (if cooldown allows)
```

**Flow 3: Joining/Creating a Gang**
```
Profile → Gangs tab → Browse gangs (search/leaderboard)
→ Apply to join (leader gets notification)
→ OR: Create gang → Pay fee → Set name + tag + logo → Invite members
```

**Flow 4: Turf War Participation**
```
Gang page → War tab → War status (if active)
→ "Battle" button appears during war phase
→ Each battle costs 5 turns
→ Fight for control of district → points added to gang total
→ Live scoreboard during war
```

---

## 5. Technical Implementation Notes

### 5.1 Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React + Next.js (App Router) | SSR for initial load, SPA for game interactions |
| Styling | Tailwind CSS v4 | Rapid styling, dark theme, responsive |
| Backend | Node.js + Express / Hono | Fast, shared types with frontend |
| Database | PostgreSQL | Relational integrity for economy, transactions |
| ORM | Drizzle ORM | Type-safe, lightweight, good DX |
| Real-time | WebSockets (Socket.io) | Live notifications, attacks, gang chat |
| Auth | JWT + bcrypt | Simple, stateless, no external dependency initially |
| Hosting | Vercel (frontend) + Railway (backend + DB) | Cheap, scalable, easy deploys |
| State | React Context + TanStack Query | Server state cache, optimistic updates |

### 5.2 Database Schema Outline

**Core tables:**

```
users
  id (PK, UUID)
  username (unique)
  email (unique)
  password_hash
  level (int, default 1)
  xp (int, default 0)
  turns (int, default 100)
  last_turn_regen (timestamp)
  cash (bigint, default 500)
  respect (int, default 0)
  gold (int, default 0)
  hp (int, default 100)
  max_hp (int, default 100)
  stat_points (int, default 5)
  strength (int, default 1)
  agility (int, default 1)
  intelligence (int, default 1)
  charisma (int, default 1)
  endurance (int, default 1)
  specialization (enum: enforcer/dealer/hacker/null)
  gang_id (FK, nullable)
  gang_role (enum: leader/lt/enforcer/member, nullable)
  created_at (timestamp)
  last_active (timestamp)

stats
  id (PK, FK to users)
  crimes_committed (int)
  pvp_wins (int)
  pvp_losses (int)
  total_money_earned (bigint)
  total_money_lost (bigint)
  times_arrested (int)
  gang_wars_won (int)
  gang_wars_lost (int)

turns_log
  id (PK)
  user_id (FK)
  amount (int, positive = gained, negative = spent)
  source (enum: regen, crime, pvp, purchase, bonus, level_up)
  created_at (timestamp)

crimes
  id (PK)
  name (varchar)
  description (text)
  min_level (int)
  turn_cost (int)
  stat_used (enum: strength, agility, intelligence, charisma)
  base_difficulty (int)
  base_success (int) -- percentage
  reward_min (bigint)
  reward_max (bigint)
  risk_level (enum: low, medium, high)
  cooldown_minutes (int)

crime_log
  id (PK)
  user_id (FK)
  crime_id (FK)
  success (boolean)
  reward (bigint)
  xp_gained (int)
  created_at (timestamp)

items
  id (PK)
  name (varchar)
  type (enum: melee, ranged, armor, vehicle, consumable)
  rarity (enum: common, rare, epic)
  stat_bonuses (jsonb) -- e.g. {"strength": 3, "damage": 5}
  slot (enum: weapon, armor, vehicle, accessory)
  buy_price (bigint)
  sell_price (bigint)
  description (text)

user_inventory
  id (PK)
  user_id (FK)
  item_id (FK)
  equipped (boolean, default false)
  acquired_at (timestamp)

pvp_log
  id (PK)
  attacker_id (FK)
  defender_id (FK)
  attack_type (enum: mug, ambush, rob, hit)
  attacker_win (boolean)
  loot_cash (bigint, nullable)
  loot_item_id (FK, nullable)
  respect_change (int)
  damage_dealt (int)
  damage_taken (int)
  created_at (timestamp)

gangs
  id (PK)
  name (unique, varchar)
  tag (varchar, 3-5 chars)
  level (int)
  xp (int)
  vault_cash (bigint)
  logo_data (jsonb) -- icon + color config
  created_at (timestamp)

gang_members
  id (PK)
  gang_id (FK)
  user_id (FK, unique)
  role (enum: leader, lieutenant, enforcer, member)
  joined_at (timestamp)

districts
  id (PK)
  name (varchar)
  controlling_gang_id (FK, nullable)
  resource_type (enum: cash, respect, turns)
  resource_rate (int) -- per hour
  last_contested (timestamp)

events
  id (PK)
  type (enum: turf_war, bounty, daily_challenge)
  starts_at (timestamp)
  ends_at (timestamp)
  state (enum: pending, active, completed)
  data (jsonb) -- event-specific payload

notifications
  id (PK)
  user_id (FK)
  type (varchar) -- e.g. "attack_received", "crime_result", "war_start"
  title (varchar)
  body (text)
  data (jsonb) -- action payload
  read (boolean, default false)
  created_at (timestamp)
```

### 5.3 Key Backend Endpoints

```
POST   /api/auth/register         -- Create account
POST   /api/auth/login            -- Login, returns JWT
GET    /api/auth/me               -- Current user profile + stats

POST   /api/turns/claim           -- Claim regen (called on page load, returns updated turns)

GET    /api/crimes                -- List available crimes
POST   /api/crimes/:id/commit    -- Commit a crime

GET    /api/items                 -- List items in shop
POST   /api/items/:id/buy        -- Buy item
POST   /api/items/:id/sell       -- Sell item
GET    /api/items/black-market    -- Black market listings (rotating)
POST   /api/items/:id/equip      -- Equip/unequip

GET    /api/leaderboard/:type     -- Leaderboard by type (level, respect, networth, pvp)

GET    /api/players/:id           -- View player profile (limited intel)
POST   /api/players/:id/attack   -- Attack player
POST   /api/players/:id/revenge  -- Revenge attack (discounted)

POST   /api/gang/create           -- Create gang
POST   /api/gang/:id/join         -- Request to join
POST   /api/gang/:id/invite       -- Invite player
POST   /api/gang/:id/kick        -- Kick member
POST   /api/gang/:id/declare-war -- Declare war on another gang
GET    /api/gang/:id/turf        -- View gang turf status

GET    /api/turf                  -- Map view of all districts
POST   /api/turf/:id/contest     -- Contest a district (during war phase)

GET    /api/events/active         -- Current/upcoming events

GET    /api/notifications         -- Get notifications
POST   /api/notifications/:id/read -- Mark as read

GET    /ws                        -- WebSocket connection for live updates
```

### 5.4 Anti-Cheat Considerations

**Golden rule: Server-authoritative on everything.**

- **Turns:** Calculated on server based on `last_turn_regen` timestamp. Client shows estimate but server validates every action.
- **Crime outcomes:** Determined server-side. Client just animates the result.
- **Combat:** Full calculation on server. Client receives result.
- **API rate limiting:** 100 requests/min per user, burst to 200. Crime/attack endpoints: 10/min.
- **Request validation:** Every action checks turn balance, level requirements, cooldowns, ownership.
- **JWT expiry:** 24 hours. Refresh endpoint requires re-auth.
- **Suspicious patterns detection:**
  - Multiple failed crimes → temporary lockout (5 min)
  - Rapid-fire requests → cooldown extension
  - Impossible travel times (if map implemented) → jail
  - Same IP multiple accounts → flagged for review (no multi-accounting)
- **No client trust:** Client never calculates outcomes. Client never stores authoritative state. Client is a rendering terminal.

### 5.5 Real-Time Features (Socket.io)

**Events from server:**
```
notification:new       -- New notification (attack, war, event)
turns:updated          -- Turn count changed
crime:result           -- Real-time crime outcome
attack:incoming        -- You're being attacked (live notification)
war:status             -- Gang war score update
chat:message           -- Gang chat message
event:countdown        -- Event timer updates
```

**Events from client:**
```
user:online            -- Mark as online (heartbeat every 60s)
chat:send              -- Send gang chat message
war:ready              -- Signal ready for war battle
```

**Connection management:**
- Socket connects on page load, disconnects on tab close
- Reconnect with exponential backoff (1s, 2s, 4s, 8s, 16s, max 30s)
- No authentication on socket connect beyond JWT handshake
- One socket per user (disconnect old on new connect)

---

## 6. Phased Roadmap

### Phase 1: MVP — Core Loop (Est. effort: High)

| Feature | Details | Effort |
|---|---|---|
| Project setup | Next.js + Tailwind + Express + PostgreSQL + Drizzle | Low |
| Auth system | Register, login, JWT, password hashing, session | Medium |
| User model | Create/migrate users table, basic profile | Low |
| Turn system | Regen logic, caps, claiming, logging | Medium |
| Crime system | 8 crimes, success calc, rewards, cooldowns, failure consequences | High |
| Basic UI | Dashboard, crimes page, profile page, navigation | High |
| PvP system | Attack types, combat formula, loot, cooldowns, revenge | High |
| Leaderboards | Level, respect, PvP, net worth | Medium |
| Responsive design | Mobile nav, desktop sidebar, breakpoint layouts | Medium |
| **Total Phase 1** | **Core playable loop** | **~4-6 weeks (1 dev)** |

### Phase 2: Social & Economy (Est. effort: High)

| Feature | Details | Effort |
|---|---|---|
| Item system | Items table, shop, inventory, equipping, slots | Medium |
| Black market | Rotating inventory, respect-gated access | Medium |
| Gang creation | Gangs table, roles, vault, invites | High |
| Gang features | Chat (basic), activity feed, XP/leveling | Medium |
| Player progression | Level-up rewards, stat point spending, XP formulas | Low |
| Skill trees | Specialization selection, 4 nodes per tree | Medium |
| Property system (basic) | Safehouse, passive HP regen | Low |
| **Total Phase 2** | **Social depth** | **~3-5 weeks** |

### Phase 3: Turf & Events (Est. effort: High)

| Feature | Details | Effort |
|---|---|---|
| Map/city view | Interactive district map | Medium |
| Turf control | Claiming, passive income, bonuses | High |
| Turf wars | Weekly scheduled event, battle phase, scoring | High |
| Daily events | Automated challenges, rewards | Medium |
| Bounty board | Player-placed bounties, wanted list | Medium |
| Notifications | In-app notification center, real-time via WebSocket | Medium |
| WebSocket integration | Socket.io setup, live events, typing indicators | Medium |
| **Total Phase 3** | **Persistent world** | **~4-6 weeks** |

### Phase 4: Polish & Launch (Est. effort: Medium)

| Feature | Details | Effort |
|---|---|---|
| Visual polish | Micro-animations, result screens, transitions | Medium |
| Sound design | Optional SFX for crimes, combat, notifications | Low |
| Anti-cheat hardening | Rate limiting, suspicious pattern detection, auditing | Medium |
| Balancing pass | Tune turn costs, rewards, XP curves, combat | High |
| Onboarding | Tutorial flow, tooltips, new player guide | Medium |
| SEO / social cards | OpenGraph tags, landing page | Low |
| Discord integration | Discord login, webhook for wars/events | Medium |
| Performance | DB query optimization, caching (Redis if needed) | Medium |
| Load testing | Simulate concurrent users, tune server config | Medium |
| Launch preparation | Domain, hosting, CI/CD, monitoring | Low |
| **Total Phase 4** | **Ship-ready** | **~4-5 weeks** |

---

## 7. Potential Risks & Balancing Considerations

### 7.1 Turn Economy Balance

**Risk:** Players run out of turns too fast → quit. Or: turns regenerate too fast → no reason to log off.

**Mitigation:**
- Start with generous cap (100) so new players have plenty to explore
- Turn costs front-loaded: cheap actions at low levels, scaling up
- Bonus turn sources (level-ups, daily login) provide relief
- Monitor average session length vs. turns consumed. Adjust cap/regen in beta.

### 7.2 PvP Dominance / Bullying

**Risk:** High-level players prey on low-levels, new players quit.

**Mitigation:**
- Level-based PvP brackets: can only attack players within 10 levels
- New player immunity (under level 10, 7 days old whichever is longer)
- Hospitalized cooldown: 30 min of PvP immunity
- Revenge mechanic: discounts for the victim
- Max 5% HP loss per attack (no killing, just setback)

### 7.3 Economy Inflation

**Risk:** Players accumulate massive cash, items lose value, economy stalls.

**Mitigation:**
- Cash sinks: training costs, item repair, gang vault taxes, property upkeep
- Respect-gated content (can't buy your way with cash)
- Consumable item decay (medkits, ammo get used)
- Black market as a cash sink (high prices, rotating inventory)
- Money cap? Soft cap at $10M (excess must be in gang vault or items)

### 7.4 Multi-Accounting / Cheating

**Risk:** Players run alts to farm cash, rig leaderboards, or stack gangs.

**Mitigation:**
- Email verification (simple, but a barrier)
- Same IP detection: flag accounts sharing IPs
- No trading between players directly (only PvP loot)
- Gang invites limited per day (5/day)
- Leaderboards filter suspicious accounts (manual review option)
- Report system with in-game flagging

### 7.5 Retention & Engagement

**Risk:** Players finish content, get bored, leave.

**Mitigation:**
- Turn-based pacing naturally spreads content
- Daily login bonuses (small but meaningful — turns + cash)
- Weekly turf wars create recurring appointment gaming
- Seasonal events (every 3 months) with exclusive rewards
- Leaderboard resets keep competition fresh
- Gang wars create social obligation (team doesn't want you to slack)

### 7.6 Scaling Concerns

**Risk:** Game gets popular, server struggles with turn regen calculations and real-time events.

**Mitigation:**
- Turn regen is calculated on read, not continuously — a simple formula based on `last_turn_regen` timestamp
- Crime logs are batch-inserted, not individual queries
- Leaderboards can be cached (30s-60s TTL)
- WebSocket per user, not per room (scales horizontally with sticky sessions)
- PostgreSQL read replicas for leaderboards and profiles
- If needed: Redis for turn state cache, job queue for event processing

---

## Appendix A: Formulas Reference

```
XP to next level:    level × 100 + 50
HP:                  50 + (Endurance × 5)
Base damage:         5 + (Strength × 1.5)
Dodge chance:        Agility × 0.2% (max 40%)
Crit chance:         Agility × 0.1% + gear (max 15%)

Crime success:       clamp((stat / difficulty) × 50 + (level × 0.2) + 10, 5, 95)
Crime XP:            reward × 0.1 + turnCost × 5

Attacker power:      (Strength × 2) + (Agility × 1) + weaponPower + (level × 0.5)
Defender power:      (Strength × 2) + (Agility × 1) + weaponPower + (level × 0.5) + dodgeBonus
Hit chance:          attackerPower / (attackerPower + defenderPower) × 100
Damage:              (attackerPower - defenderPower × 0.5) × random(0.8, 1.2)

Turn regen:          floor((now - last_turn_regen) / 300)  -- 300 seconds = 5 minutes
                     Max: 100 (150 with bonuses)
```

## Appendix B: Glossary

| Term | Definition |
|---|---|
| Turn | Action point; primary resource. 1 per 5 min, max 100 |
| Respect | Secondary currency earned from PvP and high crimes |
| HP | Health points. Regens over time, lost on failure |
| Jail | Cooldown state from crime failure — can't act for duration |
| Hospitalized | PvP cooldown state — can't be attacked or attack for 30 min |
| Turf | City districts controlled by gangs for passive income |
| Specialization | Player class chosen at level 10 (Enforcer/Dealer/Hacker) |
| Revenge | Discounted attack available for 24h after being attacked |
| Black Market | Rotating premium shop unlocked via Respect |
| Vault | Shared gang money pool for wars and upgrades |
