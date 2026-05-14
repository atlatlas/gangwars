"use client";

import GameLayout from "@/components/GameLayout";
import {
  BookOpen, Swords, ShoppingBag, Map, Eye, Building, Dices, Users, Shield,
  Skull, Heart, Clock, Star, DollarSign, TrendingUp, Zap, Target,
  Crosshair, Trophy, Activity, Warehouse, Home,
} from "lucide-react";

// Helper: maps to a "page badge" showing where to find this feature in the game
const PAGE = {
  DASHBOARD: { icon: Home, label: "Dashboard" },
  CRIMES: { icon: Swords, label: "Crimes" },
  SKILLS: { icon: BookOpen, label: "Skills" },
  FIGHT: { icon: Map, label: "Fight" },
  MARKET: { icon: ShoppingBag, label: "Market" },
  HOES: { icon: Eye, label: "Hoes" },
  BANK: { icon: Building, label: "Bank" },
  CASINO: { icon: Dices, label: "Casino" },
  RANKS: { icon: Users, label: "Ranks" },
  GANGS: { icon: Shield, label: "Gangs" },
};

interface Section {
  icon: any;
  title: string;
  subtitle: string;
  content: string[];
  page?: { icon: any; label: string };
  border: string;
  glow: string;
  cols?: boolean;
  items?: { label: string; desc: string; color: string }[];
}

const sections: Section[] = [
  // ─── INTRO ───
  {
    icon: Skull,
    title: "Welcome to Gang Wars",
    subtitle: "A text-based crime empire MMORPG",
    content: [
      "You start as a nobody on the streets. Build your reputation, recruit allies, and claw your way to the top of the criminal underworld. Every choice matters — will you be a feared enforcer, a cunning dealer, or a mastermind pulling the strings from the shadows?",
      "This guide explains every system in the game. Use it to plan your rise to power.",
    ],
    border: "border-purple-500/20",
    glow: "shadow-purple-500/5",
  },

  // ─── CORE ───
  {
    icon: Target,
    title: "Core Loop — Turns, XP & Leveling",
    subtitle: "The engine that drives everything",
    page: PAGE.DASHBOARD,
    content: [
      "You have Turns — energy used to commit crimes, train skills, and fight. Each action costs a set number of turns. Turns regenerate at a rate of 1 every 2 minutes, up to your maximum (which increases as you level up). You can see your current turns and next-turn countdown on the top bar.",
      "Every action earns XP. When you gain enough XP, you level up. Each level gives you stat points to assign (Strength, Agility, Intelligence, Charisma, Endurance). Leveling up also restores your HP fully and unlocks harder crimes, better equipment, and higher respect bonuses.",
      "Your effective turns shown on the dashboard accounts for any turns that accumulated while you were away. The game logs you out after a period of inactivity, but turn regeneration continues, so you always come back to a full bar.",
    ],
    border: "border-cyan-500/20",
    glow: "shadow-cyan-500/5",
  },

  // ─── HP, JAIL, HOSPITAL ───
  {
    icon: Heart,
    title: "HP, Jail & Hospital",
    subtitle: "Staying alive on the streets",
    page: PAGE.DASHBOARD,
    content: [
      "Your HP is your life meter. It decreases when you get hurt committing crimes or lose PvP fights. You can heal on the Dashboard using cash or turns. If your HP hits 0, you're sent to the Hospital — you can't take any actions until the timer runs out or you pay to leave early.",
      "Getting caught while committing a crime sends you to Jail. Same deal — wait out the timer or pay for an early release. Both timers are displayed on the top bar so you always know your status.",
      "Tip: Keep your HP high before logging off. Coming back to a full hospital timer because someone attacked you while you were away is a nasty surprise.",
    ],
    border: "border-red-500/20",
    glow: "shadow-red-500/5",
  },

  // ─── STATS ───
  {
    icon: Zap,
    title: "Stats & Specialization",
    subtitle: "5 attributes that define your build",
    page: PAGE.DASHBOARD,
    content: [
      "You earn stat points every time you level up. Assign them wisely — your build determines what you're good at. You can see a full breakdown of your stats and progress on the Dashboard.",
      "At level 10, you pick a Specialization: Enforcer (PvP bonuses), Dealer (drug trade bonuses), or Hacker (crime success bonuses). This choice is permanent — choose the path that fits your playstyle.",
    ],
    border: "border-yellow-500/20",
    glow: "shadow-yellow-500/5",
    cols: true,
    items: [
      { label: "Strength", desc: "PvP power & crime success", color: "text-pink-400" },
      { label: "Agility", desc: "Evasion & crime success", color: "text-cyan-400" },
      { label: "Intelligence", desc: "Drug trade & skill XP", color: "text-purple-400" },
      { label: "Charisma", desc: "Passive income & negotiation", color: "text-yellow-400" },
      { label: "Endurance", desc: "HP pool & survival", color: "text-green-400" },
    ],
  },

  // ─── CRIMES ───
  {
    icon: Swords,
    title: "Crimes",
    subtitle: "Your main source of cash & XP",
    page: PAGE.CRIMES,
    content: [
      "Crimes are how you earn money and XP. Each crime has a stat requirement, a base difficulty, a turn cost, and a reward range. Higher risk crimes pay more but have a higher chance of getting caught (which means jail time).",
      "Your success chance is calculated from your relevant stat, equipment, footmen, respect bonuses, and the crime's base difficulty. The risk level (Low / Medium / High) gives you a rough idea of how dangerous the crime is.",
      "Some crimes are locked behind level requirements. Check the Crimes page to see what's available and what you need to unlock next. Equipment and certain skill levels can improve your success rate and reduce jail time.",
    ],
    border: "border-pink-500/20",
    glow: "shadow-pink-500/5",
  },

  // ─── SKILL CRIMES ───
  {
    icon: Crosshair,
    title: "Skill Crimes",
    subtitle: "Timing-based mini-game for bonus rewards",
    page: PAGE.CRIMES,
    content: [
      "Skill Crimes are a separate category of crimes that require precision. Instead of a dice roll, you need to stop a moving meter as close to the target zone as possible — like a timing mini-game.",
      "Your accuracy determines the quality of the reward. Nail the center for maximum payout and XP. These crimes cost turns and have level requirements. They're a great way to earn extra cash if you have good timing.",
      "Unlike regular crimes, Skill Crimes don't send you to jail on failure — you just get a lower reward based on how far off your accuracy was.",
    ],
    border: "border-orange-500/20",
    glow: "shadow-orange-500/5",
  },

  // ─── SKILLS ───
  {
    icon: BookOpen,
    title: "Skills",
    subtitle: "5 training disciplines that unlock the endgame",
    page: PAGE.SKILLS,
    content: [
      "Skills are trained using turns on the Skills page. Each skill trains a specific stat and has a max level of 100. Training costs turns and gives skill XP. Higher skill levels unlock gang operations and improve your effectiveness at related activities.",
      "The five skills: Guerrilla Warfare (Strength) boosts PvP attack power. Chemistry (Intelligence) improves drug trade prices and reduces bust chances. Sixth Sense (Agility) reduces damage taken in PvP. Women's Studies (Charisma) boosts passive income from hoes. Sexual Education (Charisma) further amplifies passive income.",
      "Skill training becomes harder as you level up — higher levels require more XP per level. Focus on the skills that match your specialization and the gang operations you want to run.",
    ],
    border: "border-emerald-500/20",
    glow: "shadow-emerald-500/5",
  },

  // ─── PVP ───
  {
    icon: Map,
    title: "PvP — Fight",
    subtitle: "Attack other players for cash, respect & revenge",
    page: PAGE.FIGHT,
    content: [
      "Search for targets by username on the Fight page. Before attacking, you can run Intel to see their estimated threat level, combat power comparison, and win chance. Attack types: Mugging (steal a portion of their cash — low damage), Ambush (more damage, higher loot), Assassinate (maximum damage and loot, but you take damage too).",
      "Winning earns cash, XP, and respect. Losing costs you HP and cash. Your combat power is calculated from your stats, equipment, footmen, and respect bonuses. If you defeat someone, they get an option to Retaliate — a revenge attack with a small damage bonus.",
      "Tip: Bank your cash before logging off. If someone beats you in PvP, they can only steal what you're carrying, not what's in the bank.",
    ],
    border: "border-orange-500/20",
    glow: "shadow-orange-500/5",
  },

  // ─── MARKET ───
  {
    icon: ShoppingBag,
    title: "Market — Arms, Footmen & Pimps",
    subtitle: "Gear up and build your crew",
    page: PAGE.MARKET,
    content: [
      "The Market has several categories: Arms (weapons that boost crime success and PvP power — equip one at a time in your inventory), Footmen (hired muscle that gives stat bonuses — they stack), Pimps (protect your hoes from being kidnapped — each pimp covers up to 5 hoes).",
      "Each item has level and respect requirements. Better items need higher levels. Check your Inventory to see what you own, equip weapons, manage quantities, and sell items you don't need. Selling items to the market gives you cash back at a fraction of the buy price.",
      "Equipment effects are passive once equipped — they apply to crimes, PvP, and other activities automatically. Footmen also provide passive bonuses and stack with your equipment.",
    ],
    border: "border-amber-500/20",
    glow: "shadow-amber-500/5",
  },

  // ─── DRUG MARKET ───
  {
    icon: TrendingUp,
    title: "Drug Market",
    subtitle: "Buy low, sell high in a volatile market",
    page: PAGE.MARKET,
    content: [
      "The Drug Market is a separate economy with fluctuating prices. Buy drugs when prices are low, sell when they're high. Each drug has a base price and volatility rating that determines how much the price swings. Check the price history to spot trends.",
      "You can also buy Drug Dealers from the Market — they produce drugs passively every hour. Collect their production from the Drug Market page. Higher-tier dealers produce more units per hour (Street Dealer: 5/hr → International Kingpin: 75/hr).",
      "In-game news events (displayed on the Drug Market page) affect prices. A cartel expansion might crash Speed prices, while a bust might spike Heroin prices. Watch the headlines and trade accordingly. The collect button gathers all accumulated production from your dealers at once.",
    ],
    border: "border-green-500/20",
    glow: "shadow-green-500/5",
  },

  // ─── HOES ───
  {
    icon: Eye,
    title: "Hoes — Passive Income",
    subtitle: "Build an empire that prints money while you sleep",
    page: PAGE.HOES,
    content: [
      "Buy hoes to earn money automatically every hour. Higher-tier hoes earn significantly more per hour (Street Walker: $50/hr → Madame: $4,000/hr). Income accumulates even while you're offline — collect it anytime from the Hoes page.",
      "Your hoes can be kidnapped by other players if you don't have enough Pimps to protect them. Each Pimp protects up to 5 hoes. If a hoe is kidnapped, you lose her until you buy a replacement. Keep your stable protected.",
      "Collect your earnings regularly. The longer you wait, the more accumulates — but your hoes can still be kidnapped regardless of how much cash they've earned. Your Women's Studies and Sexual Education skills boost passive income from hoes.",
    ],
    border: "border-pink-500/20",
    glow: "shadow-pink-500/5",
  },

  // ─── BANK ───
  {
    icon: Building,
    title: "Bank",
    subtitle: "Store & protect your cash",
    page: PAGE.BANK,
    content: [
      "Deposit cash into the bank to keep it safe. Cash on hand can be stolen in PvP attacks — bank money is protected. Withdraw anytime. Your total net worth is cash on hand plus bank balance. The bank doesn't pay interest, but it also never gets robbed.",
      "Use the Dashboard to see your cash vs bank balance at a glance. A good rule: deposit everything except what you need for immediate spending. There's no fee for deposits or withdrawals, so use the bank freely.",
    ],
    border: "border-emerald-500/20",
    glow: "shadow-emerald-500/5",
  },

  // ─── CASINO ───
  {
    icon: Dices,
    title: "Casino",
    subtitle: "Test your luck against the house",
    page: PAGE.CASINO,
    content: [
      "Three games of chance: Blackjack — classic 21 against the dealer. Hit, stand, or double down. Win by beating the dealer's hand without busting. Slots — spin the reels and hope for matching symbols. Higher bets mean bigger potential payouts. Ride the Bus — guess whether each card is higher or lower than the previous one. Each correct guess multiplies your winnings. One wrong guess and you lose your bet.",
      "All games cost cash to play. The casino is pure luck — there's no skill involved. Only gamble what you can afford to lose. There's no limit on how many times you can play (as long as you have cash).",
    ],
    border: "border-yellow-500/20",
    glow: "shadow-yellow-500/5",
  },

  // ─── RESPECT ───
  {
    icon: Users,
    title: "Respect & Titles",
    subtitle: "Reputation is power",
    page: PAGE.RANKS,
    content: [
      "Respect is earned through PvP wins, crimes, and gang activities. As your respect grows, you unlock Respect Titles — each title grants specific bonuses that persist permanently. Titles include bonuses like increased crime success, combat intimidation (reduces opponent stats in PvP), and better drug trade prices.",
      "Your current title and progress toward the next one are shown on your Dashboard. The leaderboard tracks top players by level, net worth, PvP wins, and respect. Climbing the ranks proves you're a force to be reckoned with. Higher respect also unlocks better equipment in the Market.",
    ],
    border: "border-purple-500/20",
    glow: "shadow-purple-500/5",
  },

  // ─── GANGS ───
  {
    icon: Shield,
    title: "Gangs — Overview & Roles",
    subtitle: "The endgame: organized crime",
    page: PAGE.GANGS,
    content: [
      "Gangs are player organizations that unlock the deepest layer of the game. You can create your own gang (costs cash) or join an existing one. Roles are hierarchical: Leader (full control), Lieutenant (can invite and manage requests), Enforcer (can manage vault money), Member (basic access).",
      "The gang page shows your gang's info, members list, vault balance, reputation, and level. Leveling up a gang requires completing contracts (weekly objectives). Higher gang levels unlock more member slots, bigger vault capacity, crime/PvP bonuses, and better tag colors.",
    ],
    border: "border-cyan-500/20",
    glow: "shadow-cyan-500/5",
  },

  // ─── GANG VAULT ───
  {
    icon: DollarSign,
    title: "Gangs — Vault & Economy",
    subtitle: "Pool resources, pay members",
    page: PAGE.GANGS,
    content: [
      "The gang vault is a shared wallet. Any member can deposit cash. Leaders and Enforcers can withdraw cash or pay individual members directly. The vault is used to fund operations, turf claims, arsenal purchases, and level upgrades.",
      "If the leader hires an Accountant bot (from the Accountant tab), it handles automatic daily salary payouts. The leader sets individual salaries per member. Every 24 hours, the accountant pays everyone from the vault and takes a 2% overhead fee that is burnt. You can see last payout time and individual salary amounts on the Accountant tab.",
    ],
    border: "border-cyan-500/20",
    glow: "shadow-cyan-500/5",
  },

  // ─── GANG OPERATIONS ───
  {
    icon: Warehouse,
    title: "Gangs — Operations",
    subtitle: "Assign members, earn daily income",
    page: PAGE.GANGS,
    content: [
      "Operations are passive income generators. Each operation has skill requirements — you assign gang members who meet at least one requirement to work it. Every day, assigned members complete a Daily Task (commit a crime, win a PvP, train a skill, or deposit to vault) to earn income for the gang.",
      "More members assigned = more income. Operations can be leveled up (L1 → L2 → L3) using vault cash, which increases income per member. Level upgrades also require higher skill levels from your members. The Operations tab shows available operations (catalog) and active ones with their current income, task progress, and payout history.",
      "Payouts are collected every 24 hours. The leader can stop operations and reassign members at any time. Some operations require multiple skills — you need at least one member covering each skill requirement to start.",
    ],
    border: "border-cyan-500/20",
    glow: "shadow-cyan-500/5",
  },

  // ─── GANG TURF ───
  {
    icon: Map,
    title: "Gangs — Turf",
    subtitle: "Capture districts for bonuses",
    page: PAGE.GANGS,
    content: [
      "Turf represents territorial control. Districts can be claimed for a cash cost from the vault. Each district grants bonuses to the entire gang: crime success rate, PvP power, or passive income. Multiple districts mean bigger bonuses.",
      "Turf can be challenged by other gangs — they initiate a challenge, and if they defeat you in combat, they take the district. You can also abandon districts you don't want to defend. The Turf tab shows all districts and who controls them.",
    ],
    border: "border-cyan-500/20",
    glow: "shadow-cyan-500/5",
  },

  // ─── GANG ARSENAL ───
  {
    icon: Swords,
    title: "Gangs — Arsenal",
    subtitle: "Equipment that boosts your turf defenses",
    page: PAGE.GANGS,
    content: [
      "The Arsenal is gang-level equipment that can be assigned to turf districts to boost their defenses, making them harder for other gangs to capture. Arsenal items can also be equipped to individual members for personal combat bonuses.",
      "Arsenal items take damage when used and need periodic repairs (paid from the vault). The Arsenal tab shows what the gang owns, what's assigned where, and allows buying new equipment, assigning to turf or members, unassigning, and repairing damaged items.",
    ],
    border: "border-cyan-500/20",
    glow: "shadow-cyan-500/5",
  },

  // ─── GANG CONTRACTS ───
  {
    icon: Trophy,
    title: "Gangs — Contracts & Leveling",
    subtitle: "Weekly challenges to grow your gang",
    page: PAGE.GANGS,
    content: [
      "Gang contracts are weekly objectives (earn cash, win PvP fights, deposit to vault, or commit crimes). The whole gang contributes progress. When the contract is completed, the gang earns enough reputation to level up. The leader can then level up the gang on the gang page.",
      "Each gang level increases max members, vault capacity, adds crime/PvP bonuses, and upgrades the tag color (purple → cyan → gold → red). Higher-level gangs also attract better members and have an edge in turf wars.",
    ],
    border: "border-cyan-500/20",
    glow: "shadow-cyan-500/5",
  },

  // ─── ACTIVITY FEED ───
  {
    icon: Activity,
    title: "Activity Feed",
    subtitle: "See what's happening in the underworld",
    page: PAGE.DASHBOARD,
    content: [
      "The activity feed (visible on your Dashboard) shows recent events: crimes committed, PvP fights won and lost, gang actions, levels gained, and other notable activities. It's a live feed of what other players are doing — useful for scouting active players or just seeing the game world feel alive.",
    ],
    border: "border-white/10",
    glow: "shadow-white/5",
  },
];

export default function HelpPage() {
  return (
    <GameLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/15 bg-purple-500/5 mb-4">
            <BookOpen size={12} className="text-purple-400/60" />
            <span className="text-[10px] font-mono text-purple-400/60 uppercase tracking-[0.2em]">Reference Guide</span>
          </div>
          <h1 className="text-2xl font-mono tracking-wider text-white/90 mb-2">Gang Wars</h1>
          <p className="text-xs font-mono text-white/30 max-w-lg mx-auto leading-relaxed">
            A text-based crime empire MMORPG. Build your reputation, expand your operations, and rule the streets.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/15 to-transparent" />
          <Star size={10} className="text-purple-400/30" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/15 to-transparent" />
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section) => {
            const PageIcon = section.page?.icon;
            return (
              <div
                key={section.title}
                className={`rounded-sm border ${section.border} bg-bg-dark/60 p-4 ${section.glow} shadow-sm`}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="mt-0.5">
                    <section.icon size={14} className="text-white/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-mono tracking-wider text-white/90">{section.title}</h2>
                      {section.page && PageIcon && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-white/5 border border-white/5">
                          <PageIcon size={9} className="text-white/25" />
                          <span className="text-[8px] font-mono text-white/20 uppercase tracking-wider">{section.page.label}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-white/20 uppercase tracking-wider">{section.subtitle}</p>
                  </div>
                </div>

                {section.content.map((paragraph: string, i: number) => (
                  <p key={i} className={`text-xs font-mono text-white/50 leading-relaxed pl-7 ${i > 0 ? "mt-2" : ""}`}>
                    {paragraph}
                  </p>
                ))}

                {section.cols && section.items && (
                  <div className="pl-7 mt-2 grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {section.items.map((item: any) => (
                      <div key={item.label} className="bg-black/30 border border-white/5 rounded-sm px-2 py-1.5 text-center">
                        <p className={`text-[10px] font-mono ${item.color} font-semibold`}>{item.label}</p>
                        <p className="text-[9px] font-mono text-white/30">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 mt-8 mb-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/15 to-transparent" />
          <p className="text-[10px] font-mono text-white/10 tracking-[0.2em] uppercase">Gang Wars &copy; 2026</p>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/15 to-transparent" />
        </div>
      </div>
    </GameLayout>
  );
}
