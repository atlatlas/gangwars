"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Swords, Crosshair, Crown, Medal, BookOpen, Activity, Heart, DollarSign } from "lucide-react";

// ─── Ambient background orbs ───
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

const NAV_PILLS = ["CRIMES", "PvP", "GANG", "CASINO", "ECONOMY"];

// ─── Dashboard Preview ───
function DashboardPreview() {
  return (
    <div className="rounded-sm border border-white/5 bg-bg-dark/80 overflow-hidden shadow-lg shadow-black/30">
      <div className="relative h-40 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/lvl1_hereo.png)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-deep/90 via-bg-deep/30 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <img
            src="/logo.png"
            alt="Gang Wars"
            className="h-16 w-auto drop-shadow-[0_0_20px_rgba(147,51,234,0.5)]"
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-2">
          <div className="flex items-end gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden bg-bg-card shrink-0">
              <img src="/profiles/profile1.png" className="w-full h-full object-cover" />
            </div>
            <div className="pb-0.5 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs">
                <Crown size={10} className="text-neon-navy" />
                <span className="font-mono text-white/90">Lv.42</span>
                <span className="text-white/70 font-medium">Player</span>
                <Heart size={10} className="text-red-400 ml-1" />
                <span className="font-mono text-red-300 text-[10px]">75<span className="text-white/40">/100</span></span>
              </div>
              <div className="mt-1">
                <div className="w-full h-1 bg-black/30 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[linear-gradient(135deg,#ec4899,#06b6d4)] shadow-[0_0_6px_rgba(236,72,153,0.4)]" style={{ width: "60%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 px-3 py-3">
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
              <Link href="/login" className="text-xs text-white/70 hover:text-white transition-colors">Log in</Link>
              <Link href="/register" className="text-xs px-3.5 py-1.5 rounded border border-neon-cyan/30 text-neon-cyan/80 hover:bg-neon-cyan/10 hover:border-neon-cyan/50 transition-all">Sign up</Link>
            </div>
          </div>
        </header>

        {/* ─── Hero ─── */}
        <section className="relative min-h-screen flex items-center pt-12 overflow-hidden">
          <div className="absolute inset-0">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url(/lvl1_hereo.png)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-deep via-bg-deep/60 to-transparent" />
          </div>

          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
            }}
          />

          <div className="relative z-10 max-w-6xl mx-auto px-6 w-full py-20">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="max-w-xl">
                <div className="text-[10px] tracking-[0.25em] uppercase text-white/60 font-mono mb-5">
                  Browser-based crime strategy
                </div>
                <h1 className="text-[clamp(2.4rem,6vw,4.5rem)] font-bold leading-[1.0] tracking-[-0.02em] mb-5 text-white">
                  Have fun.
                </h1>
                <p className="text-sm sm:text-base text-white/80 leading-relaxed mb-8 max-w-md font-mono">
                  A turn-based crime game with a real-time economy.
                  Crimes, player-driven market, gang warfare — all in your browser.
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
                    className="px-5 py-2.5 rounded text-sm text-white/70 border border-white/20 hover:text-white hover:border-white/40 transition-all"
                  >
                    Log in
                  </Link>
                </div>
              </div>

              <div className="hidden md:block">
                <DashboardPreview />
              </div>
            </div>

            <div className="mt-10 md:hidden max-w-sm mx-auto">
              <DashboardPreview />
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-28 border-t border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-navy/[0.02] to-transparent" />
          <div className="relative max-w-xl mx-auto px-6 text-center">
            <h2 className="text-sm text-text-secondary font-medium mb-3">Start your empire today</h2>
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded bg-neon-gradient text-white text-sm font-medium transition-all hover:shadow-[0_0_12px_rgba(37,99,235,0.3)] active:scale-[0.97]"
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
              <Link href="/login" className="text-[10px] text-text-muted/70 hover:text-text-secondary transition-colors">Log in</Link>
              <Link href="/register" className="text-[10px] text-text-muted/70 hover:text-text-secondary transition-colors">Sign up</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
