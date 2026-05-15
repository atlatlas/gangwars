"use client";

import Link from "next/link";
import Image from "next/image";
import { Swords, Crosshair, TrendingUp, Shield, Building, Dices, Eye, ChevronRight } from "lucide-react";

const PRICE_TICKER = [
  ["WEED", "$191", "+1.8%", true],
  ["COKE", "$3,080", "-2.4%", false],
  ["BTG", "$47,900", "+6.2%", true],
  ["AK47", "$35,200", "-0.8%", false],
  ["LAMBO", "$398,000", "+1.2%", true],
  ["GNG1", "$10,050", "+0.3%", true],
];

const FEATURE_ROWS = [
  {
    icon: Swords,
    label: "Crimes",
    detail: "15 types — Shoplifting to Armed Heist. Stat checks, mini-games, jail risk.",
  },
  {
    icon: Crosshair,
    label: "PvP",
    detail: "5 attack types. Gear, footmen, respect factor in. Retaliation system.",
  },
  {
    icon: TrendingUp,
    label: "Terminal",
    detail: "15 assets. Mean-reverting prices. Limit/stop orders. 5s ticks.",
  },
  {
    icon: Shield,
    label: "Gangs",
    detail: "Turf, arsenal, daily operations. Leaderboard tracks dominance.",
  },
  {
    icon: Building,
    label: "Economy",
    detail: "Bank interest, gang investments, black market spreads.",
  },
  {
    icon: Eye,
    label: "Passive",
    detail: "Hoes, operations, investments — income while offline.",
  },
  {
    icon: Dices,
    label: "Casino",
    detail: "Blackjack, slots, Ride the Bus. Straight odds.",
  },
];

const DETAIL_SECTIONS = [
  {
    title: "Crime & Combat",
    items: [
      "15 crimes from Shoplifting (Lv.1, low risk) to Armed Heist (Lv.25, high risk). Each has stat requirements, jail chances, and reward tiers.",
      "Skill-based mini-games on pickpocket and lockpicking crimes — accuracy and timing determine success.",
      "PvP uses a damage formula that factors strength, agility, equipped weapon, footmen, and respect differential.",
      "Retaliation: attack someone who just hit you without spending a turn. Hospitalized players can be looted.",
    ],
  },
  {
    title: "Economy & Trading",
    items: [
      "Black Market has 40+ items with fluctuating buy/sell spreads. Drug prices drift hourly via simulated supply.",
      "Trading Terminal: 15 assets in 6 categories. Price model is a mean-reverting random walk with volatility bands. Market, limit, stop-loss, and take-profit order types.",
      "Bank pays interest on deposits. Gang investments pay a percentage of operation revenue. Each capital pool is separate from pocket cash.",
      "Price history is stored in 1m/5m/15m/1h OHLCV candles. The frontend renders candlestick charts via lightweight-charts.",
    ],
  },
  {
    title: "Gangs & Progression",
    items: [
      "7 skill trees (Pickpocket, Lockpicking, Hacking, Strength, Agility, Intelligence, Charisma). Each unlocks higher-tier crimes and gang operation eligibility.",
      "Gangs claim turf districts for stat bonuses. The Arsenal provides defensive and offensive upgrades that degrade and need repair.",
      "Daily operations generate vault income based on member skill levels. Upgrade operations from Lv.1 to Lv.3 for higher per-member payouts.",
      "Stat points on level-up. Specialization at Lv.10: Enforcer (combat), Dealer (economy), or Hacker (skill crimes).",
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-deep text-text-primary">
      {/* ─── Fixed header ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-12 border-b border-white/5 bg-bg-dark/95 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <Image src="/logo.png" alt="Gang Wars" width={80} height={28} className="h-5 w-auto opacity-80" />
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-xs text-text-muted/60 hover:text-text-secondary transition-colors">
              Log in
            </Link>
            <Link
              href="/register"
              className="text-xs px-3.5 py-1.5 rounded border border-neon-cyan/30 text-neon-cyan/80 hover:bg-neon-cyan/10 hover:border-neon-cyan/50 transition-all"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex items-center pt-12 overflow-hidden">
        {/* Background layers — matches game aesthetic */}
        <div className="absolute inset-0 bg-gradient-to-b from-bg-deep via-bg-dark/50 to-bg-deep" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(147,51,234,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
          }}
        />

        {/* Gradient accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-neon-navy/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/20 to-transparent" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 w-full">
          <div className="max-w-2xl">
            <div className="text-[10px] tracking-[0.25em] uppercase text-text-muted/30 font-mono mb-6">
              Browser-based crime strategy
            </div>
            <h1 className="text-[clamp(2.2rem,5.5vw,4rem)] font-bold leading-[1.05] tracking-tight mb-5">
              A criminal empire,
              <br />
              <span className="text-text-muted/40">one turn at a time.</span>
            </h1>
            <p className="text-sm text-text-muted/50 leading-relaxed max-w-md mb-10 font-mono">
              Turn-based crime strategy with a real-time economy.
              No downloads. No pay-to-win. No grinding.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/register"
                className="group relative px-5 py-2.5 rounded bg-neon-gradient text-white text-sm font-medium transition-all hover:shadow-[0_0_12px_rgba(37,99,235,0.3)]"
              >
                <span className="relative z-10">Play now</span>
              </Link>
              <Link
                href="/login"
                className="px-5 py-2.5 rounded text-sm text-text-muted/50 border border-white/5 hover:text-text-secondary hover:border-white/10 transition-all"
              >
                Log in
              </Link>
            </div>
          </div>

          {/* Price ticker — bottom-right */}
          <div className="mt-20 md:mt-0 md:absolute md:right-6 md:bottom-16 md:w-[260px]">
            <div className="text-[9px] tracking-[0.2em] uppercase text-text-muted/20 font-mono mb-3">Live prices &middot; 5s tick</div>
            <div className="rounded border border-white/5 bg-bg-dark/50 overflow-hidden">
              {PRICE_TICKER.map(([sym, price, chg, up]) => (
                <div
                  key={sym as string}
                  className="flex items-center justify-between px-4 py-2 border-b border-white/[0.03] last:border-0"
                >
                  <span className="text-xs font-mono text-text-secondary">{sym as string}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-text-muted/60">{price as string}</span>
                    <span className={`text-[10px] font-mono w-12 text-right ${up ? "text-neon-green/60" : "text-neon-red/60"}`}>
                      {chg as string}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Feature pills ─── */}
      <section className="relative z-10 -mt-16 pb-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {FEATURE_ROWS.map((f) => (
              <div
                key={f.label}
                className="group flex items-center gap-2 px-3.5 py-2 rounded border border-white/5 bg-bg-dark/30 hover:bg-bg-dark/60 hover:border-white/10 transition-all"
              >
                <f.icon size={13} className="text-neon-cyan/50 group-hover:text-neon-cyan/80" />
                <span className="text-xs font-mono text-text-muted/50 group-hover:text-text-secondary">{f.label}</span>
                <span className="text-[10px] text-text-muted/20 hidden sm:inline">— {f.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Detail sections ─── */}
      <section className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-lg mb-16">
            <h2 className="text-xs tracking-[0.2em] uppercase text-text-muted/40 font-mono mb-3">What it actually is</h2>
            <p className="text-sm text-text-muted/50 leading-relaxed">
              A turn-based crime game with a real-time economy. Every action costs a turn.
              The market runs 24/7. What you earn depends on strategy, not time spent.
            </p>
          </div>

          <div className="space-y-20">
            {DETAIL_SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs tracking-[0.2em] uppercase text-neon-cyan/50 font-mono mb-6">{section.title}</h3>
                <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
                  {section.items.map((item) => (
                    <div key={item.slice(0, 30)} className="text-sm text-text-muted/50 leading-relaxed pl-4 border-l border-neon-cyan/10">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-navy/[0.02] to-transparent" />
        <div className="relative z-10 max-w-xl mx-auto px-6 text-center">
          <h2 className="text-sm text-text-secondary font-medium mb-3">No pay-to-win. No downloads. No grind.</h2>
          <p className="text-sm text-text-muted/50 mb-10 leading-relaxed max-w-sm mx-auto font-mono">
            Play when you want, as much as you want. The economy runs whether you are logged in or not.
          </p>
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded bg-neon-gradient text-white text-sm font-medium transition-all hover:shadow-[0_0_12px_rgba(37,99,235,0.3)]"
          >
            Create account
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="text-[9px] tracking-[0.2em] uppercase text-text-muted/20 font-mono">Gang Wars &copy; 2026</span>
          <div className="flex items-center gap-5">
            <Link href="/login" className="text-[10px] text-text-muted/30 hover:text-text-secondary transition-colors">Log in</Link>
            <Link href="/register" className="text-[10px] text-text-muted/30 hover:text-text-secondary transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
