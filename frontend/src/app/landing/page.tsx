"use client";

import Link from "next/link";
import Image from "next/image";

const FEATURES = [
  {
    title: "15 crime types — each with risk-reward tiers",
    desc: "Petty theft, armed robbery, drug deals, and heists. Higher risk pays more. Every crime costs turns and can land you in jail.",
  },
  {
    title: "Real-time player-vs-player combat",
    desc: "Attack other players based on strength, agility, endurance, and gear. Win cash, steal items, earn respect. Full PvP log tracks every fight.",
  },
  {
    title: "Black market with dynamic pricing",
    desc: "Drugs, weapons, footmen, pimps, and hoes. Prices fluctuate hourly based on simulated supply chains. Buy low, sell high, or hold.",
  },
  {
    title: "Skill system with 7 training trees",
    desc: "Each skill unlocks higher-tier crimes and gang operations. Train to level up — stat points let you customize your build.",
  },
  {
    title: "Gangs with turf, arsenals, and operations",
    desc: "Form or join a crew. Claim districts, assign heavy weapons, run daily operations for passive vault income. Leaderboard tracks dominance.",
  },
  {
    title: "Trading terminal — simulated market",
    desc: "15 tradeable assets across 6 categories. Mean-reverting prices, limit orders, stop-losses, candlestick charts. Live P&L tracking via WebSocket.",
  },
  {
    title: "Banking, interest, and gang investments",
    desc: "Deposit cash for interest, invest in other gangs for a share of their income, or withdraw at any time. Capital pool is separate from pocket.",
  },
  {
    title: "Casino with 3 game modes",
    desc: "Blackjack, slots, and Ride the Bus. Each win pays out in cash. No house edge manipulation — straight odds.",
  },
  {
    title: "Full feedback system with voting",
    desc: "Feature requests and bug reports. Upvote, comment, and track status. Development is driven by player input.",
  },
];

const MILESTONES = [
  { value: "15", label: "crime types" },
  { value: "7", label: "skill trees" },
  { value: "15", label: "tradable assets" },
  { value: "3", label: "casino games" },
];

export default function LandingPage() {
  return (
    <div className="bg-[#0a0a0f] text-white">
      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-white/[0.04] bg-[#0a0a0f]/90 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Gang Wars" width={90} height={32} className="h-6 w-auto opacity-90" />
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-[13px] text-white/40 hover:text-white/80 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="text-[13px] px-4 py-1.5 rounded-md bg-white text-[#0a0a0f] font-medium hover:bg-white/90 transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex items-center pt-14">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/login.png)", filter: "brightness(0.25) saturate(0.8)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/70 via-transparent to-[#0a0a0f]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(120,80,255,0.08),transparent_60%)]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 w-full">
          <div className="max-w-2xl">
            <div className="mb-4">
              <span className="text-[11px] tracking-[0.2em] uppercase text-white/20 font-mono">
                Browser-based crime strategy
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
              <span className="text-white">Build a criminal empire</span>
              <br />
              <span className="text-white/30">from a browser tab.</span>
            </h1>
            <p className="text-base md:text-lg text-white/30 leading-relaxed max-w-lg mb-10">
              No download. No pay-to-win. Turn-based strategy with a living economy,
              gang warfare, and a simulated trading market — all in real time.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center px-6 py-3 rounded-lg bg-white text-[#0a0a0f] text-sm font-semibold hover:bg-white/90 transition-all"
              >
                Start playing
                <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 rounded-lg text-sm text-white/30 hover:text-white/60 border border-white/10 hover:border-white/20 transition-all"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Milestones ─── */}
      <section className="relative z-10 -mt-32 pb-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden">
            {MILESTONES.map((m) => (
              <div key={m.label} className="bg-[#0a0a0f] px-8 py-10 text-center">
                <div className="text-3xl font-bold text-white/90">{m.value}</div>
                <div className="text-[11px] tracking-widest uppercase text-white/20 mt-1.5 font-mono">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-xl mb-20">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Everything you expect from a crime game. Nothing you don&apos;t.
            </h2>
            <p className="text-white/20 text-sm leading-relaxed">
              Turn-based design means you progress on your schedule. No real-time grinding,
              no notifications. Log in, take action, log out.
            </p>
          </div>

          <div className="space-y-0 divide-y divide-white/[0.04]">
            {FEATURES.map((f) => (
              <div key={f.title} className="py-5 md:py-6 grid md:grid-cols-3 gap-2 md:gap-8">
                <h3 className="text-sm font-medium text-white/90 md:col-span-1">{f.title}</h3>
                <p className="text-sm text-white/20 md:col-span-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Economy Section ─── */}
      <section className="py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent" />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                A simulated economy that runs without you.
              </h2>
              <div className="space-y-4 text-sm text-white/20 leading-relaxed">
                <p>
                  Drug prices drift in a mean-reverting random walk. The trading
                  terminal ticks every 5 seconds — 15 assets across 6 categories,
                  each with its own volatility profile.
                </p>
                <p>
                  Gang operations generate passive vault income based on member
                  skill levels and daily task completion. Every role contributes.
                </p>
                <p>
                  Bank interest compounds on deposits. Gang investments pay a
                  share of operation proceeds. The economy works whether you are
                  actively trading or logged off.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8">
              <div className="text-[11px] tracking-widest uppercase text-white/20 font-mono mb-6">Live price feed</div>
              <div className="space-y-3">
                {[
                  { sym: "WEED", price: "$187", chg: "+2.4%" },
                  { sym: "COKE", price: "$3,120", chg: "-1.1%" },
                  { sym: "BTG", price: "$48,200", chg: "+5.8%" },
                  { sym: "AK47", price: "$34,800", chg: "-0.3%" },
                  { sym: "LAMBO", price: "$402,000", chg: "+0.7%" },
                ].map((a) => (
                  <div key={a.sym} className="flex items-center justify-between py-1.5">
                    <span className="text-sm font-mono text-white/60">{a.sym}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono text-white/40">{a.price}</span>
                      <span className={`text-xs font-mono w-14 text-right ${a.chg.startsWith("+") ? "text-green-400/60" : "text-red-400/60"}`}>
                        {a.chg}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-28">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            No pay-to-win. No download. No grind.
          </h2>
          <p className="text-white/20 text-sm mb-10 leading-relaxed">
            Every mechanic in Gang Wars is built around turn-based strategy.
            What you earn depends on how you play, not how long you stay logged in.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center px-6 py-3 rounded-lg bg-white text-[#0a0a0f] text-sm font-semibold hover:bg-white/90 transition-all"
          >
            Create your account
            <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.04] py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Gang Wars" width={60} height={22} className="h-4 w-auto opacity-20" />
            <span className="text-[11px] text-white/10 font-mono">&copy; 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-[11px] text-white/20 hover:text-white/50 transition-colors">Log in</Link>
            <Link href="/register" className="text-[11px] text-white/20 hover:text-white/50 transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
