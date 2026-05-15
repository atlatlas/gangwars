"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

// ─── Ambient background ───
function AmbientBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a14] via-[#0a0a0a] to-[#0a0a0a]" />

      {/* Floating orbs */}
      <div
        className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] rounded-full opacity-[0.04]"
        style={{
          background:
            "radial-gradient(circle, rgba(37,99,235,0.6) 0%, transparent 70%)",
          animation: "orbFloat 30s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-[40%] -right-[10%] w-[600px] h-[600px] rounded-full opacity-[0.03]"
        style={{
          background:
            "radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)",
          animation: "orbFloat 25s ease-in-out infinite 5s",
        }}
      />
      <div
        className="absolute -bottom-[10%] left-[30%] w-[500px] h-[500px] rounded-full opacity-[0.02]"
        style={{
          background:
            "radial-gradient(circle, rgba(37,99,235,0.4) 0%, transparent 70%)",
          animation: "orbFloat 35s ease-in-out infinite 10s",
        }}
      />

      {/* Subtle horizontal glow lines */}
      <div className="absolute top-[30%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
      <div className="absolute top-[60%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" />
    </div>
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
    if (prefersReduced) {
      setVisible(true);
      return;
    }
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

// ─── Animated counter ───
function AnimatedCounter({ value, suffix = "", label }: { value: number; suffix?: string; label: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          if (prefersReduced) {
            setDisplay(value);
            observer.disconnect();
            return;
          }
          const duration = 2200;
          const steps = 50;
          const increment = value / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setDisplay(value);
              clearInterval(timer);
            } else {
              setDisplay(Math.floor(current));
            }
          }, duration / steps);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl sm:text-4xl font-bold text-white/80 tabular-nums">
        {display.toLocaleString()}{suffix}
      </div>
      <div className="text-xs text-white/20 font-mono tracking-wider uppercase mt-1.5">
        {label}
      </div>
    </div>
  );
}

// ─── Dashboard mockup ───
const FAKE_TICKER: [string, string, boolean][] = [
  ["WEED", "$191", true],
  ["COKE", "$3,080", false],
  ["BTG", "$47,900", true],
  ["AK47", "$35,200", false],
  ["LAMBO", "$398,000", true],
  ["GNG1", "$10,050", true],
];

const NAV_ITEMS = ["CRIMES", "PvP", "TRADING", "GANG", "CASINO"];

function DashboardMockup() {
  const [ticker, setTicker] = useState(FAKE_TICKER);
  const [time, setTime] = useState("");

  // Simulate price changes every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      setTicker((prev) =>
        prev.map(([sym, price, up]) => {
          const p = parseInt(price.replace(/[,$]/g, ""));
          const change = p * (Math.random() - 0.5) * 0.02;
          const newP = Math.max(1, p + Math.floor(change));
          const newUp = newP >= p;
          return [sym, `$${newP.toLocaleString()}`, newUp] as [string, string, boolean];
        })
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="relative rounded-xl border border-white/[0.08] bg-[#0c0c18]/90 backdrop-blur-sm overflow-hidden shadow-[0_0_60px_rgba(37,99,235,0.06)]"
      style={{ animation: "mockupFloat 6s ease-in-out infinite" }}
    >
      {/* Mockup header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_6px_rgba(6,182,212,0.5)]" />
          <span className="text-xs font-mono text-white/50">Lv.42</span>
          <span className="text-xs font-medium text-white/70">KINGPIN</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-white/30">{time}</span>
          <span className="text-xs font-mono text-neon-green/70">+$12,430</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 px-5 py-4">
        {[
          { label: "CASH", value: "$843,200", color: "text-neon-green/80" },
          { label: "BANK", value: "$500,000", color: "text-neon-cyan/80" },
          {
            label: "HEALTH",
            value: "90%",
            color: "text-neon-green/80",
            bar: 90,
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="text-[9px] tracking-[0.15em] font-mono text-white/30 uppercase mb-1">{stat.label}</div>
            <div className={`text-sm font-mono font-bold ${stat.color}`}>{stat.value}</div>
            {"bar" in stat && (
              <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full bg-neon-green/50" style={{ width: `${stat.bar}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Market ticker */}
      <div className="mx-5 mb-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="text-[9px] tracking-[0.15em] font-mono text-white/25 uppercase mb-2">Live market</div>
        <div className="space-y-1.5">
          {ticker.slice(0, 4).map(([sym, price, up]) => (
            <div key={sym as string} className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-white/40">{sym as string}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-white/60">{price as string}</span>
                <span className={`text-[10px] ${up ? "text-neon-green/60" : "text-neon-red/60"}`}>
                  {up ? "▲" : "▼"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nav pills */}
      <div className="px-5 pb-4 flex flex-wrap gap-1.5">
        {NAV_ITEMS.map((item, i) => (
          <span
            key={item}
            className={`px-2.5 py-1 text-[10px] font-mono tracking-wider rounded border ${
              i === 2
                ? "border-neon-cyan/30 text-neon-cyan/70 bg-neon-cyan/[0.04]"
                : "border-white/[0.06] text-white/30"
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Features data ───
const FEATURES = [
  {
    number: "01",
    title: "Build your operation",
    description:
      "Start with nothing and work your way up. Fifteen crime types, each with unique risks and rewards. Every choice compounds.",
  },
  {
    number: "02",
    title: "Command the market",
    description:
      "Forty-plus tradeable assets with supply-driven pricing. Real-time charts, limit orders, and stop-losses. The economy never sleeps.",
  },
  {
    number: "03",
    title: "Lead your crew",
    description:
      "Claim territory, build arsenals, run operations. Your gang's strength depends on every member's contribution.",
  },
  {
    number: "04",
    title: "Rise through the ranks",
    description:
      "Seven skill trees, specializations at level ten, and a respect system that changes how the city treats you.",
  },
];

// ─── Main page ───
export default function LandingPage() {
  return (
    <>
      {/* Inject global keyframes */}
      <style>{`
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes mockupFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="animation"] { animation: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-white/10">
        {/* ─── Fixed header ─── */}
        <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-white/[0.04] bg-[#0a0a0a]/80 backdrop-blur-lg">
          <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
            <Image
              src="/logo.png"
              alt="Gang Wars"
              width={80}
              height={28}
              className="h-5 w-auto opacity-70"
            />
            <div className="flex items-center gap-5">
              <Link
                href="/login"
                className="text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="text-sm px-4 py-1.5 rounded border border-white/10 text-white/70 hover:bg-white/5 hover:border-white/20 transition-all active:scale-[0.97]"
              >
                Sign up
              </Link>
            </div>
          </div>
        </header>

        {/* ─── Hero ─── */}
        <section className="relative min-h-screen flex items-center pt-14 overflow-hidden">
          <AmbientBackground />

          <div className="relative w-full py-20 md:py-28">
            <div className="max-w-6xl mx-auto px-6">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                {/* Left — text */}
                <div className="max-w-xl">
                  <div className="text-xs tracking-[0.2em] uppercase text-white/20 font-mono mb-6">
                    Browser-based crime strategy
                  </div>
                  <h1 className="text-[clamp(2.4rem,6vw,4.5rem)] font-bold leading-[1.0] tracking-[-0.02em] mb-5">
                    From nothing
                    <br />
                    <span className="text-white/25">to kingpin.</span>
                  </h1>
                  <p className="text-base sm:text-lg text-white/40 leading-relaxed mb-10 max-w-md">
                    A turn-based crime game with a living economy.
                    Build your empire, control the supply, and claim the city — all from your browser.
                  </p>
                  <div className="flex items-center gap-4">
                    <Link
                      href="/register"
                      className="group relative px-6 py-3 bg-white text-[#0a0a0a] text-sm font-medium rounded hover:bg-white/90 transition-all active:scale-[0.97]"
                    >
                      Play now
                      <span className="absolute inset-0 rounded bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    <Link
                      href="/login"
                      className="px-6 py-3 text-sm text-white/40 border border-white/10 rounded hover:text-white/60 hover:border-white/20 transition-all active:scale-[0.97]"
                    >
                      Log in
                    </Link>
                  </div>
                </div>

                {/* Right — Dashboard mockup */}
                <div className="hidden md:block">
                  <DashboardMockup />
                </div>
              </div>

              {/* Mobile dashboard */}
              <div className="mt-12 md:hidden">
                <DashboardMockup />
              </div>
            </div>
          </div>
        </section>

        {/* ─── Stats bar ─── */}
        <section className="py-16 border-t border-white/[0.04]">
          <div className="max-w-4xl mx-auto px-6">
            <ScrollReveal>
              <div className="grid grid-cols-3 gap-8">
                <AnimatedCounter value={14000} suffix="+" label="Active players" />
                <AnimatedCounter value={2400000000} label="Economy volume" />
                <AnimatedCounter value={340000} suffix="+" label="Gang wars" />
              </div>
            </ScrollReveal>
          </div>
          {/* Fix formatting: $2.4B display */}
          <div className="text-center -mt-2">
            <span className="text-[10px] text-white/10 font-mono tracking-wider">
              $2.4B &middot; Live economy
            </span>
          </div>
        </section>

        {/* ─── Features ─── */}
        <section className="py-24 md:py-32 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto px-6">
            <ScrollReveal>
              <div className="max-w-lg mb-20">
                <h2 className="text-xs tracking-[0.2em] uppercase text-white/20 font-mono mb-3">
                  How it works
                </h2>
                <p className="text-base text-white/40 leading-relaxed">
                  No pay-to-win. No idle grind. The economy runs whether you are logged in or not.
                  Your strategy determines your wealth.
                </p>
              </div>
            </ScrollReveal>

            <div className="space-y-12">
              {FEATURES.map((f, i) => (
                <ScrollReveal key={f.number} delay={i * 100}>
                  <div className="group grid md:grid-cols-[4rem_1fr_1fr] gap-4 md:gap-8 items-start py-4 border-t border-white/[0.03]">
                    <span className="text-xs font-mono text-white/10 group-hover:text-white/30 transition-colors">
                      {f.number}
                    </span>
                    <h3 className="text-base sm:text-lg font-medium text-white/70 group-hover:text-white/90 transition-colors">
                      {f.title}
                    </h3>
                    <p className="text-sm text-white/30 leading-relaxed">
                      {f.description}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-28 border-t border-white/[0.04] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent" />
          <div className="relative max-w-xl mx-auto px-6 text-center">
            <ScrollReveal>
              <h2 className="text-lg sm:text-xl text-white/70 font-medium mb-3">
                The city is waiting.
              </h2>
              <p className="text-sm text-white/30 mb-10 max-w-sm mx-auto leading-relaxed">
                Create your account and start building. The economy is already live — every second you wait is money on the table.
              </p>
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 px-6 py-3 bg-white text-[#0a0a0a] text-sm font-medium rounded hover:bg-white/90 transition-all active:scale-[0.97]"
              >
                Create account
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </ScrollReveal>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="border-t border-white/[0.04] py-6">
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <span className="text-xs text-white/10 font-mono">
              Gang Wars &copy; 2026
            </span>
            <div className="flex items-center gap-5">
              <Link
                href="/login"
                className="text-xs text-white/20 hover:text-white/50 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="text-xs text-white/20 hover:text-white/50 transition-colors"
              >
                Sign up
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
