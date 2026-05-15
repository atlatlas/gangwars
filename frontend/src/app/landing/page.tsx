"use client";

import Link from "next/link";
import Image from "next/image";

const FEATURES = [
  {
    title: "Crime system",
    items: [
      "15 crimes from Shoplifting to Armed Heist, each with stat checks, jail risk, and escalating rewards.",
      "Skill-based mini-games on higher-tier crimes — Pickpocket, Mastermind, Timing Game.",
      "Reputation track unlocks better contracts and affects PvP intimidation.",
    ],
  },
  {
    title: "Combat",
    items: [
      "Full PvP with 5 attack types based on your primary stat. Gear, footmen, and respect all factor into outcomes.",
      "Retaliation system — attack a player who just hit you without spending a turn.",
      "Hospital system: hit 0 HP and you are out of action. Heal with cash or turns.",
    ],
  },
  {
    title: "Economy",
    items: [
      "15 tradable assets in the Terminal: drugs, weapons, luxury goods, crypto, gang bonds, contraband. Each ticks every 5 seconds with mean-reverting prices.",
      "Black Market with fluctuating buy/sell spreads on 40+ items. Drug prices drift hourly.",
      "Bank pays interest. Gang investments pay a cut of operation revenue. Capital is separate from pocket cash.",
    ],
  },
  {
    title: "Gangs",
    items: [
      "Claim turf districts for stat bonuses. Assign heavy weapons from the Arsenal to defend them.",
      "Run daily operations. Members complete tasks, generate vault income. Upgrade ops to Lv3 for higher payouts.",
      "Leaderboard tracks gang dominance by vault, turf, respect, and member count.",
    ],
  },
  {
    title: "Skills & progression",
    items: [
      "7 skill trees: Pickpocket, Lockpicking, Hacking, Strength, Agility, Intelligence, Charisma.",
      "Each skill unlocks higher-tier crimes and gang operation eligibility.",
      "Stat points on level-up let you specialize (Enforcer, Dealer, Hacker).",
    ],
  },
  {
    title: "Casino & extras",
    items: [
      "Blackjack, Slots, Ride the Bus — all playable with in-game cash. Straight odds, no rigging.",
      "Hoes generate passive income. Collect every 30 minutes.",
      "Feedback system with voting and comments. Suggestions直接影响 roadmap.",
    ],
  },
];

const ASSETS = [
  ["WEED", "$191", "+1.8%"],
  ["COKE", "$3,080", "-2.4%"],
  ["BTG", "$47,900", "+6.2%"],
  ["AK47", "$35,200", "-0.8%"],
  ["LAMBO", "$398,000", "+1.2%"],
  ["GNG1", "$10,050", "+0.3%"],
];

export default function LandingPage() {
  return (
    <div className="bg-[#07070a] text-white font-sans antialiased selection:bg-white/10">
      {/* ─── Nav ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-12 border-b border-white/[0.04] bg-[#07070a]/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <Image src="/logo.png" alt="" width={80} height={28} className="h-5 w-auto opacity-80" />
          <div className="flex items-center gap-5">
            <Link href="/login" className="text-xs text-white/30 hover:text-white/70 transition-colors">
              Log in
            </Link>
            <Link
              href="/register"
              className="text-xs px-3.5 py-1.5 rounded-md bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="min-h-screen flex items-center pt-12 relative overflow-hidden">
        {/* Background — dark, no photo */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#07070a] via-[#0a0a12] to-[#07070a]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-white/[0.03] to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 w-full">
          <div className="max-w-2xl">
            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.04] tracking-tight mb-5">
              A criminal empire,
              <br />
              <span className="text-white/20">one turn at a time.</span>
            </h1>
            <p className="text-sm md:text-base text-white/20 leading-relaxed max-w-md mb-10">
              Turn-based crime strategy with a real-time economy.
              No downloads, no pay-to-win, no grinding.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-lg bg-white text-[#07070a] text-sm font-medium hover:bg-white/90 transition-all"
              >
                Play now
              </Link>
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-lg text-sm text-white/30 border border-white/[0.08] hover:text-white/60 hover:border-white/[0.15] transition-all"
              >
                Log in
              </Link>
            </div>
          </div>

          {/* Price ticker — bottom right area */}
          <div className="mt-20 md:mt-0 md:absolute md:right-6 md:bottom-16 md:max-w-[280px] w-full">
            <div className="text-[10px] tracking-widest uppercase text-white/[0.08] font-mono mb-3">Live assets &bull; 5s tick</div>
            <div className="space-y-1">
              {ASSETS.map(([sym, price, chg]) => (
                <div key={sym} className="flex items-center justify-between py-1 border-b border-white/[0.02] last:border-0">
                  <span className="text-xs font-mono text-white/40">{sym}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-white/25">{price}</span>
                    <span className={`text-[10px] font-mono w-12 text-right ${chg.startsWith("+") ? "text-green-500/50" : "text-red-500/50"}`}>
                      {chg}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-lg mb-16">
            <h2 className="text-sm text-white/90 font-medium mb-3">What the game actually is</h2>
            <p className="text-sm text-white/20 leading-relaxed">
              Criminally short description in five paragraphs indeed. Turn-based means you play on your
              own time. The economy runs 24/7. Every action has a cost, a risk, and a reward.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-x-12 gap-y-16">
            {FEATURES.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs tracking-widest uppercase text-white/40 font-mono mb-4">
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.items.map((item) => (
                    <li key={item.slice(0, 20)} className="text-sm text-white/20 leading-relaxed pl-4 border-l border-white/[0.06]">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Economic engine ─── */}
      <section className="py-24 md:py-32 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="max-w-sm">
              <h2 className="text-sm text-white/90 font-medium mb-4">What runs under the hood</h2>
              <div className="space-y-4 text-sm text-white/20 leading-relaxed">
                <p>
                  Prices follow a mean-reverting random walk. Every asset has a base price, a volatility
                  factor, and min/max bounds. The engine ticks every 5 seconds, writes to
                  <code className="text-white/40 mx-1 text-xs">trading_price_history</code>,
                  and broadcasts via WebSocket.
                </p>
                <p>
                  Orders execute against the live price feed: market fills immediately, limit orders sit
                  in the book until crossed, stop-loss and take-profit trigger on condition. Positions
                  track average entry cost and unrealized P&amp;L per tick.
                </p>
                <p>
                  Gang vault income accrues from member operation tasks. Collect manually — no automatic
                  payouts. Turf bonuses apply to crime success and PvP stats. Arsenal items degrade
                  and need repair.
                </p>
              </div>
            </div>

            {/* SQL snippet */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/20">trading_price_history &mdash; schema</span>
                <span className="text-[10px] font-mono text-white/[0.06]">5 columns</span>
              </div>
              <pre className="px-5 py-4 text-xs font-mono leading-relaxed text-white/15 overflow-x-auto">
{`id          INTEGER   PRIMARY KEY
asset_id    INTEGER   NOT NULL  → trading_assets
price       INTEGER   NOT NULL
volume      INTEGER   DEFAULT 0
recorded_at TEXT      NOT NULL  → INDEX`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-28">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-sm text-white/90 font-medium mb-3">No tricks. Just turns.</h2>
          <p className="text-sm text-white/20 mb-10 leading-relaxed max-w-sm mx-auto">
            Gang Wars is free, browser-based, and turn-gated. Play when you want, as much as you want.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center px-5 py-2.5 rounded-lg bg-white text-[#07070a] text-sm font-medium hover:bg-white/90 transition-all"
          >
            Create account
            <svg className="ml-2 w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.04] py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="text-[10px] text-white/[0.06] font-mono tracking-widest uppercase">Gang Wars &copy; 2026</span>
          <div className="flex items-center gap-5">
            <Link href="/login" className="text-[10px] text-white/20 hover:text-white/50 transition-colors">Log in</Link>
            <Link href="/register" className="text-[10px] text-white/20 hover:text-white/50 transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
