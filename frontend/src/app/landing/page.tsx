"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Swords, Crosshair, TrendingUp, Shield, Building, Eye, Dices, Zap, Heart, DollarSign, Crown, Medal, BookOpen, Activity, Clock, Skull, User } from "lucide-react";

// ─── Ambient background orbs (from game's AmbientOrbs.tsx) ───
function AmbientOrbs() {
  return (
    <>
      <div
        className="pointer-events-none fixed top-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.06]"
        style={{
          background: "radial-gradient(circle, #2563eb, transparent 70%)",
          filter: "blur(80px)",
          animation: "orbFloat 10s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none fixed bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.05]"
        style={{
          background: "radial-gradient(circle, #06b6d4, transparent 70%)",
          filter: "blur(80px)",
          animation: "orbFloat 10s ease-in-out infinite",
          animationDelay: "-5s",
        }}
      />
    </>
  );
}

// ─── Scroll reveal ───
function ScrollReveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setVisible(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-900 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"} ${className}`}
      style={{ transitionDuration: "900ms" }}
    >
      {children}
    </div>
  );
}

// ─── Character profiles data ───
const PROFILES = [
  { src: "/profiles/profile1.png", name: "The Street Kid" },
  { src: "/profiles/profile2.png", name: "The Enforcer" },
  { src: "/profiles/profile3.png", name: "The Fixer" },
  { src: "/profiles/profile4.png", name: "The Kingpin" },
  { src: "/profiles/profile5.png", name: "The Hacker" },
  { src: "/profiles/profile6.png", name: "The Dealer" },
  { src: "/profiles/profile7.png", name: "The Muscle" },
  { src: "/profiles/profile8.png", name: "The Ghost" },
];

// ─── Feature data ───
const FEATURES = [
  {
    icon: Swords,
    title: "Crime & Combat",
    description: "15 crime types from Shoplifting to Armed Heist. Skill checks, mini-games, jail risk, and a PvP system with 5 attack types. Retaliation lets you hit back without spending a turn.",
  },
  {
    icon: TrendingUp,
    title: "Trading Terminal",
    description: "15 assets with mean-reverting prices, limit and stop orders, candlestick charts, and 5-second ticks. The market runs 24/7 whether you are logged in or not.",
  },
  {
    icon: Shield,
    title: "Gang Operations",
    description: "Claim turf districts, build an arsenal, and run daily operations. Every member's skills contribute. The leaderboard tracks who controls the city.",
  },
  {
    icon: Building,
    title: "Living Economy",
    description: "Bank interest, black market spreads, gang investments, and a separate trading capital pool. Drug prices drift via simulated supply and demand.",
  },
  {
    icon: Dices,
    title: "Casino",
    description: "Blackjack, slots, Ride the Bus. No house rigging — straight odds. Win big or lose it all.",
  },
  {
    icon: Eye,
    title: "Passive Income",
    description: "Hoes, drug operations, and gang investments generate income while you are offline. Log in to collect your earnings.",
  },
];

const NAV_PILLS = ["CRIMES", "PvP", "TRADING", "GANG", "CASINO"];

// ─── Dashboard Preview — faithful to the actual game UI ───
function DashboardPreview() {
  return (
    <div className="rounded-sm border border-white/5 bg-bg-dark/80 overflow-hidden shadow-lg shadow-black/30">

      {/* Hero strip with logo */}
      <div className="relative h-40 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/lvl1_hereo.png)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-deep/90 via-bg-deep/30 to-transparent" />
        <div className="absolute top-1/2 right-4 sm:left-1/2 sm:right-auto -translate-y-1/2 sm:-translate-x-1/2">
          <img
            src="/logo.png"
            alt="Gang Wars"
            className="h-16 w-auto drop-shadow-[0_0_20px_rgba(147,51,234,0.5)]"
          />
        </div>

        {/* Profile strip at bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-2">
          <div className="flex items-end gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden bg-bg-card shrink-0">
              <img src="/profile.png" className="w-full h-full object-cover" />
            </div>
            <div className="pb-0.5 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs">
                <Crown size={10} className="text-neon-navy" />
                <span className="font-mono text-white/90">Lv.42</span>
                <span className="text-white/70 font-medium">Player</span>
                <Heart size={10} className="text-red-400 ml-1" />
                <span className="font-mono text-red-300 text-[10px]">75<span className="text-white/40">/100</span></span>
              </div>
              {/* XP bar */}
              <div className="mt-1">
                <div className="w-full h-1 bg-black/30 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[linear-gradient(135deg,#ec4899,#06b6d4)] shadow-[0_0_6px_rgba(236,72,153,0.4)]" style={{ width: "60%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards — exact match to game's dashboard */}
      <div className="grid grid-cols-3 gap-2 px-3 py-3">
        {/* Turns — yellow */}
        <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-3 border-l-[3px] border-l-yellow-400/40 shadow-[inset_3px_0_8px_-4px_rgba(250,204,21,0.2)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-white/35 uppercase tracking-wider">Turns</span>
            <span className="text-[9px] font-mono text-yellow-400/60">42s</span>
          </div>
          <div className="flex items-baseline gap-1 mb-1.5">
            <span className="text-lg font-mono font-bold text-white tracking-tight drop-shadow-[0_0_4px_rgba(250,204,21,0.2)]">47</span>
            <span className="text-[10px] font-mono text-white/20">/ 5000</span>
          </div>
          <div className="h-1 rounded-full bg-white/5 overflow-hidden shadow-[inset_0_0_4px_rgba(0,0,0,0.3)]">
            <div className="h-full rounded-full bg-gradient-to-r from-yellow-500/50 to-yellow-300/60 shadow-[0_0_4px_rgba(250,204,21,0.2)]" style={{ width: "1%" }} />
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-white/25 uppercase tracking-wider">Net Worth</span>
              <span className="text-[10px] font-mono text-cyan-300 drop-shadow-[0_0_4px_rgba(34,211,238,0.15)]">$1,240,000</span>
            </div>
          </div>
        </div>

        {/* Cash — pink */}
        <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-3 border-l-[3px] border-l-pink-400/40 shadow-[inset_3px_0_8px_-4px_rgba(244,114,182,0.2)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-white/35 uppercase tracking-wider">Cash</span>
            <DollarSign size={10} className="text-pink-400/60" />
          </div>
          <div className="flex items-baseline gap-0.5 mb-1.5">
            <span className="text-xs font-mono text-pink-400/70 drop-shadow-[0_0_4px_rgba(244,114,182,0.2)]">$</span>
            <span className="text-lg font-mono font-bold text-white tracking-tight drop-shadow-[0_0_4px_rgba(244,114,182,0.2)]">843,200</span>
          </div>
          <div className="h-1 rounded-full bg-white/5 overflow-hidden shadow-[inset_0_0_4px_rgba(0,0,0,0.3)]">
            <div className="h-full rounded-full bg-gradient-to-r from-pink-500/30 to-pink-300/40 shadow-[0_0_4px_rgba(244,114,182,0.15)]" style={{ width: "80%" }} />
          </div>
        </div>

        {/* Respect — cyan */}
        <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-3 border-l-[3px] border-l-cyan-400/40 shadow-[inset_3px_0_8px_-4px_rgba(34,211,238,0.2)]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-mono text-white/35 uppercase tracking-wider">Respect</span>
            <span className="text-[7px] font-mono text-cyan-400/50 uppercase tracking-wider border border-cyan-400/15 rounded-sm px-1 py-0.5 leading-none">Hustler</span>
          </div>
          <div className="flex items-baseline gap-1 mb-1.5">
            <span className="text-lg font-mono font-bold text-white tracking-tight drop-shadow-[0_0_4px_rgba(34,211,238,0.2)]">2,450</span>
          </div>
          <div className="h-1 rounded-full bg-white/5 overflow-hidden shadow-[inset_0_0_4px_rgba(0,0,0,0.3)]">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500/50 to-cyan-300/60 shadow-[0_0_4px_rgba(34,211,238,0.2)]" style={{ width: "45%" }} />
          </div>
        </div>
      </div>

      {/* Quick Actions — 2x2 grid */}
      <div className="px-3 pb-2">
        <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Swords size={8} className="text-pink-400" /> Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { icon: Swords, label: "Crimes", stat: "42 committed", accent: "text-pink-400" },
            { icon: Crosshair, label: "Fight", stat: "12W / 4L", accent: "text-red-400" },
            { icon: BookOpen, label: "Skills", stat: "Guerrilla, Chemistry", accent: "text-purple-400" },
            { icon: Medal, label: "Leaderboard", stat: "$1.2M net", accent: "text-yellow-400" },
          ].map((a) => (
            <div key={a.label} className="group rounded-sm border border-white/5 bg-bg-dark/80 p-2 transition-all duration-150 flex items-center gap-2">
              <div className="w-6 h-6 rounded-sm bg-gradient-to-br from-pink-500/15 to-cyan-500/15 border border-pink-400/30 flex items-center justify-center shrink-0">
                <a.icon size={10} className={a.accent} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] tracking-wider text-white/80 truncate">{a.label}</p>
                <p className="text-[8px] font-mono text-white/30 truncate">{a.stat}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity panel */}
      <div className="px-3 pb-3">
        <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Activity size={8} className="text-cyan-400" /> Activity
        </h3>
        <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-3 divide-y divide-white/5">
          <div className="flex items-center justify-between py-1">
            <span className="text-[10px] font-mono tracking-wide text-white/35 uppercase">Crimes</span>
            <span className="text-[10px] font-mono text-white/80">42</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-[10px] font-mono tracking-wide text-white/35 uppercase">PvP Wins</span>
            <span className="text-[10px] font-mono text-pink-400">12</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-[10px] font-mono tracking-wide text-white/35 uppercase">PvP Losses</span>
            <span className="text-[10px] font-mono text-cyan-400">4</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-[10px] font-mono tracking-wide text-white/35 uppercase">Earned</span>
            <span className="text-[10px] font-mono text-pink-400">$2.1M</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-[10px] font-mono tracking-wide text-white/35 uppercase">Arrests</span>
            <span className="text-[10px] font-mono text-white/80">3</span>
          </div>
        </div>
      </div>

      {/* Nav pills */}
      <div className="px-3 pb-3 flex flex-wrap gap-1">
        {NAV_PILLS.map((item, i) => (
          <span
            key={item}
            className={`px-2 py-1 text-[9px] font-mono tracking-wider rounded-sm border ${
              i === 2
                ? "border-pink-400/30 text-pink-400/70 bg-pink-500/5"
                : "border-white/10 text-white/30"
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Mini Trading Chart Preview ───
function MiniChartPreview() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const run = async () => {
      try {
        const { createChart, CandlestickSeries } = await import("lightweight-charts");
        const chart = createChart(containerRef.current!, {
          width: containerRef.current!.clientWidth,
          height: 260,
          layout: { background: { color: "transparent" }, textColor: "#64748b" },
          grid: { vertLines: { color: "rgba(148,163,184,0.04)" }, horzLines: { color: "rgba(148,163,184,0.04)" } },
          timeScale: { visible: false },
          rightPriceScale: { visible: false },
          crosshair: { mode: 0 },
        });
        const series = chart.addSeries(CandlestickSeries, {
          upColor: "#22c55e",
          downColor: "#ef4444",
          borderUpColor: "#22c55e",
          borderDownColor: "#ef4444",
          wickUpColor: "#22c55e",
          wickDownColor: "#ef4444",
        });
        const now = Math.floor(Date.now() / 1000);
        const data = [];
        let price = 45000;
        for (let i = 120; i >= 0; i--) {
          const change = price * (Math.random() - 0.48) * 0.008;
          const open = price;
          const close = price + change;
          const high = Math.max(open, close) * (1 + Math.random() * 0.004);
          const low = Math.min(open, close) * (1 - Math.random() * 0.004);
          data.push({ time: (now - i * 300) as any, open, high, low, close });
          price = close;
        }
        series.setData(data);
        chart.timeScale().fitContent();
      } catch {}
    };
    run();
  }, []);

  return <div ref={containerRef} className="w-full h-[260px]" />;
}

export default function LandingPage() {
  return (
    <>
      <style>{`
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="animation"] { animation: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-bg-deep text-text-primary selection:bg-neon-navy/30">
        <AmbientOrbs />

        {/* ─── Fixed header ─── */}
        <header className="fixed top-0 left-0 right-0 z-50 h-12 border-b border-white/5 bg-bg-dark/95 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
            <Image src="/logo.png" alt="Gang Wars" width={60} height={21} className="h-5 w-auto opacity-80" />
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-xs text-text-muted/60 hover:text-text-secondary transition-colors">Log in</Link>
              <Link href="/register" className="text-xs px-3.5 py-1.5 rounded border border-neon-cyan/30 text-neon-cyan/80 hover:bg-neon-cyan/10 hover:border-neon-cyan/50 transition-all">Sign up</Link>
            </div>
          </div>
        </header>

        {/* ─── Hero ─── */}
        <section className="relative min-h-screen flex items-center pt-12 overflow-hidden">
          {/* Hero background — exactly like the game dashboard */}
          <div className="absolute inset-0">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url(/lvl1_hereo.png)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-deep via-bg-deep/60 to-transparent" />
          </div>

          {/* Scanline overlay (from game's Sidebar) */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
            }}
          />

          <div className="relative z-10 max-w-6xl mx-auto px-6 w-full py-20">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left — text */}
              <div className="max-w-xl">
                <div className="text-[10px] tracking-[0.25em] uppercase text-text-muted/70 font-mono mb-5">
                  Browser-based crime strategy
                </div>
                <h1 className="text-[clamp(2.4rem,6vw,4.5rem)] font-bold leading-[1.0] tracking-[-0.02em] mb-5">
                  From nothing
                  <br />
                  <span className="text-text-muted/60">to kingpin.</span>
                </h1>
                <p className="text-sm sm:text-base text-text-muted/80 leading-relaxed mb-8 max-w-md font-mono">
                  A turn-based crime game with a real-time economy.
                  Fifteen crimes, player-driven market, gang warfare — all in your browser.
                </p>
                <div className="flex items-center gap-3">
                  <Link
                    href="/register"
                    className="group relative px-5 py-2.5 rounded bg-neon-gradient text-white text-sm font-medium transition-all hover:shadow-[0_0_12px_rgba(37,99,235,0.3)] active:scale-[0.97]"
                  >
                    Play now
                  </Link>
                  <Link
                    href="/login"
                    className="px-5 py-2.5 rounded text-sm text-text-muted/80 border border-white/5 hover:text-text-secondary hover:border-white/10 transition-all"
                  >
                    Log in
                  </Link>
                </div>
              </div>

              {/* Right — dashboard preview */}
              <div className="hidden md:block">
                <DashboardPreview />
              </div>
            </div>

            {/* Mobile dashboard preview */}
            <div className="mt-10 md:hidden max-w-sm mx-auto">
              <DashboardPreview />
            </div>
          </div>
        </section>

        {/* ─── Game features grid ─── */}
        <section className="py-24 md:py-32 border-t border-white/5">
          <div className="max-w-6xl mx-auto px-6">
            <ScrollReveal>
              <div className="max-w-lg mb-16">
                <h2 className="text-xs tracking-[0.2em] uppercase text-text-muted/70 font-mono mb-3">What it actually is</h2>
                <p className="text-sm text-text-muted/80 leading-relaxed font-mono">
                  No pay-to-win. No idle grind. Every action costs a turn.
                  The economy runs whether you are logged in or not.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04]">
              {FEATURES.map((f, i) => (
                <ScrollReveal key={f.title} delay={i * 80}>
                  <div className="bg-bg-deep p-6 h-full">
                    <f.icon size={16} className="text-neon-cyan/50 mb-3" />
                    <h3 className="text-sm font-medium text-text-secondary mb-2">{f.title}</h3>
                    <p className="text-xs text-text-muted/80 leading-relaxed font-mono">{f.description}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Character Showcase ─── */}
        <section className="py-24 border-t border-white/5">
          <div className="max-w-6xl mx-auto px-6">
            <ScrollReveal>
              <div className="max-w-lg mb-12">
                <h2 className="text-xs tracking-[0.2em] uppercase text-text-muted/70 font-mono mb-3">Choose your path</h2>
                <p className="text-sm text-text-muted/80 leading-relaxed font-mono">
                  Eight character archetypes. Your stats, your skills, your reputation.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {PROFILES.map((p, i) => (
                <ScrollReveal key={p.name} delay={i * 60}>
                  <div className="group cursor-default">
                    <div className="relative rounded-sm border border-white/5 bg-bg-dark/50 overflow-hidden aspect-[3/4] transition-all duration-300 group-hover:border-neon-cyan/30 group-hover:shadow-[0_0_16px_rgba(6,182,212,0.08)]">
                      <Image
                        src={p.src}
                        alt={p.name}
                        width={300}
                        height={400}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-300"
                      />
                    </div>
                    <p className="text-xs font-mono text-text-muted/70 mt-2 tracking-wider group-hover:text-text-secondary transition-colors">{p.name}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Feature deep-dive — Trading ─── */}
        <section className="py-24 border-t border-white/5">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <ScrollReveal>
                <div>
                  <h2 className="text-xs tracking-[0.2em] uppercase text-neon-cyan/50 font-mono mb-3">Trading Terminal</h2>
                  <h3 className="text-lg text-text-secondary font-medium mb-3">Command the market</h3>
                  <p className="text-sm text-text-muted/80 leading-relaxed font-mono mb-4">
                    15 assets across 6 categories — drugs, weapons, luxury goods, crypto, gang stock, contraband.
                    Prices follow a mean-reverting random walk with volatility bands.
                  </p>
                  <p className="text-sm text-text-muted/80 leading-relaxed font-mono mb-4">
                    Market, limit, stop-loss, and take-profit order types. Real-time candlestick charts with 1m/5m/15m/1h resolutions.
                    Price history stored in OHLCV candles.
                  </p>
                  <p className="text-sm text-text-muted/70 leading-relaxed font-mono">
                    Your trading capital is separate from pocket cash. Deposit and withdraw at will.
                  </p>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={100}>
                <div className="rounded-sm border border-white/5 bg-bg-dark/50 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_4px_rgba(34,197,94,0.5)]" />
                    <span className="text-[10px] font-mono text-text-muted/70">BTG/USD &middot; 5m chart</span>
                  </div>
                  <MiniChartPreview />
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ─── Feature deep-dive — Gangs ─── */}
        <section className="py-24 border-t border-white/5">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <ScrollReveal>
                <div className="rounded-sm border border-white/5 bg-bg-dark/50 p-5 order-2 md:order-1">
                  {/* Territory card mockup */}
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={14} className="text-neon-cyan/60" />
                    <span className="text-[10px] font-mono text-text-muted/60 uppercase tracking-wider">Active territory</span>
                  </div>
                  <div className="rounded-sm border border-white/5 bg-bg-deep/60 p-3 mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-text-secondary">Downtown</span>
                      <span className="text-[10px] font-mono text-neon-cyan/60">Lv.3</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-neon-navy/50 to-neon-cyan/60 shadow-[0_0_4px_rgba(6,182,212,0.2)]" style={{ width: "70%" }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] font-mono text-text-muted/60">Influence</span>
                      <span className="text-[9px] font-mono text-text-muted/80">70%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-sm border border-white/5 bg-bg-deep/60 p-2">
                      <span className="text-[9px] font-mono text-text-muted/60">Arsenal</span>
                      <p className="text-xs font-mono text-text-muted/60">AK-47 &middot; Armor</p>
                    </div>
                    <div className="rounded-sm border border-white/5 bg-bg-deep/60 p-2">
                      <span className="text-[9px] font-mono text-text-muted/60">Members</span>
                      <p className="text-xs font-mono text-text-muted/60">12 / 20</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={100}>
                <div className="order-1 md:order-2">
                  <h2 className="text-xs tracking-[0.2em] uppercase text-neon-cyan/50 font-mono mb-3">Gangs</h2>
                  <h3 className="text-lg text-text-secondary font-medium mb-3">Lead your crew</h3>
                  <p className="text-sm text-text-muted/80 leading-relaxed font-mono mb-4">
                    Claim turf districts for stat bonuses. Each territory has an influence meter that grows with daily operations.
                  </p>
                  <p className="text-sm text-text-muted/80 leading-relaxed font-mono mb-4">
                    The Arsenal provides defensive and offensive upgrades that degrade and need repair. Upgrade operations from Lv.1 to Lv.3 for higher per-member payouts.
                  </p>
                  <p className="text-sm text-text-muted/70 leading-relaxed font-mono">
                    Daily operations generate vault income based on member skill levels. The leaderboard tracks which gang truly runs the city.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-28 border-t border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-navy/[0.02] to-transparent" />
          <div className="relative max-w-xl mx-auto px-6 text-center">
            <ScrollReveal>
              <h2 className="text-sm text-text-secondary font-medium mb-3">Start your empire today</h2>
              <p className="text-sm text-text-muted/80 mb-10 max-w-sm mx-auto leading-relaxed font-mono">
                No pay-to-win. No downloads. Fifteen crimes, a living economy, and a city that needs a kingpin.
              </p>
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 px-5 py-2.5 rounded bg-neon-gradient text-white text-sm font-medium transition-all hover:shadow-[0_0_12px_rgba(37,99,235,0.3)] active:scale-[0.97]"
              >
                Create account
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </ScrollReveal>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="border-t border-white/5 py-6">
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <span className="text-[9px] tracking-[0.2em] uppercase text-text-muted/20 font-mono">Gang Wars &copy; 2026</span>
            <div className="flex items-center gap-5">
              <Link href="/login" className="text-[10px] text-text-muted/60 hover:text-text-secondary transition-colors">Log in</Link>
              <Link href="/register" className="text-[10px] text-text-muted/60 hover:text-text-secondary transition-colors">Sign up</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
