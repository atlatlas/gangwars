"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

const STATS = [
  { value: "14,000+", label: "Active players" },
  { value: "$2.4B", label: "Economy volume" },
  { value: "340,000+", label: "Gang wars" },
];

const CHAPTERS = [
  {
    number: "01",
    title: "Build your operation",
    description:
      "Start with nothing. Run street-level jobs, build capital, and work your way up. Fifteen crime types, each with its own risks and rewards. Every choice has a consequence.",
  },
  {
    number: "02",
    title: "Command the market",
    description:
      "A living economy with forty-plus tradeable assets. Drug prices drift with simulated supply. The trading terminal supports limit orders, stop-losses, and real-time charts. The market runs 24/7 — you don't have to.",
  },
  {
    number: "03",
    title: "Lead your gang",
    description:
      "Claim territory, build an arsenal, and run daily operations with your crew. Every member's skills contribute to the gang's reach. The leaderboard tracks who runs the city.",
  },
  {
    number: "04",
    title: "Rise through the ranks",
    description:
      "Seven skill trees, specializations at level ten, and a respect system that affects how others see you. Passive income keeps your empire growing while you're away.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-white/10">
      {/* ─── Header ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-white/[0.04] bg-[#0a0a0a]/90 backdrop-blur-md">
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
              className="text-sm px-4 py-1.5 rounded border border-white/10 text-white/70 hover:bg-white/5 hover:border-white/20 transition-all"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex items-center pt-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="relative max-w-6xl mx-auto px-6 w-full py-28">
          <div className="max-w-3xl">
            <div className="text-xs tracking-[0.2em] uppercase text-white/20 font-mono mb-6">
              Browser-based crime strategy
            </div>
            <h1 className="text-[clamp(2.8rem,7vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.02em] mb-6">
              Power. Territory.
              <br />
              <span className="text-white/25">Wealth.</span>
            </h1>
            <p className="text-base sm:text-lg text-white/40 leading-relaxed max-w-lg mb-10">
              A turn-based crime game with a player-driven economy.
              Build your empire, control the market, and claim the city — all from your browser.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/register"
                className="px-6 py-3 bg-white text-[#0a0a0a] text-sm font-medium rounded hover:bg-white/90 transition-all"
              >
                Play now
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 text-sm text-white/40 border border-white/10 rounded hover:text-white/60 hover:border-white/20 transition-all"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats bar ─── */}
      <section className="py-16 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-3 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white/80">
                  {s.value}
                </div>
                <div className="text-xs text-white/20 font-mono tracking-wider uppercase mt-1.5">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Chapters ─── */}
      <section className="py-24 md:py-32 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-lg mb-20">
            <h2 className="text-xs tracking-[0.2em] uppercase text-white/20 font-mono mb-3">
              How it works
            </h2>
            <p className="text-base text-white/40 leading-relaxed">
              No pay-to-win. No idle grind. The economy runs whether you are logged in or not.
              What you earn depends on strategy, not time spent.
            </p>
          </div>

          <div className="space-y-16">
            {CHAPTERS.map((ch) => (
              <div
                key={ch.number}
                className="group grid md:grid-cols-[4rem_1fr_1fr] gap-4 md:gap-8 items-start"
              >
                <span className="text-xs font-mono text-white/10 group-hover:text-white/30 transition-colors">
                  {ch.number}
                </span>
                <h3 className="text-base sm:text-lg font-medium text-white/70 group-hover:text-white/90 transition-colors">
                  {ch.title}
                </h3>
                <p className="text-sm text-white/30 leading-relaxed">
                  {ch.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-28 border-t border-white/[0.04]">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-lg sm:text-xl text-white/70 font-medium mb-3">
            The city is waiting.
          </h2>
          <p className="text-sm text-white/30 mb-10 max-w-sm mx-auto leading-relaxed">
            Create your account and start building. The economy is already live.
          </p>
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 px-6 py-3 bg-white text-[#0a0a0a] text-sm font-medium rounded hover:bg-white/90 transition-all"
          >
            Create account
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
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
  );
}
