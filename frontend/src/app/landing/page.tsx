"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Swords, ShoppingBag, Users, Shield, Building, Dices,
  TrendingUp, Eye, Skull, Zap, ArrowRight, Star, Crosshair,
  ChevronDown, Server, UsersRound, Trophy
} from "lucide-react";

const FEATURES = [
  {
    icon: Swords,
    title: "Street Crimes",
    desc: "Rob, steal, and fight your way up from the bottom. Every crime earns respect and cash.",
    color: "text-pink-400",
  },
  {
    icon: Crosshair,
    title: "PvP Combat",
    desc: "Battle other players for cash, items, and dominance. Intimidation wins wars.",
    color: "text-red-400",
  },
  {
    icon: ShoppingBag,
    title: "Black Market",
    desc: "Buy and sell weapons, drugs, and contraband. Prices fluctuate with supply and demand.",
    color: "text-green-400",
  },
  {
    icon: TrendingUp,
    title: "Trading Terminal",
    desc: "Real-time simulated market with crypto, luxury goods, and gang bonds. Candlestick charts, limit orders, live P&L.",
    color: "text-cyan-400",
  },
  {
    icon: Shield,
    title: "Gangs",
    desc: "Form or join a crew. Claim turf, run operations, build arsenals, and dominate the city.",
    color: "text-purple-400",
  },
  {
    icon: Building,
    title: "Banking & Economy",
    desc: "Park cash at the bank for interest, invest in gangs, and hustle every dime.",
    color: "text-yellow-400",
  },
  {
    icon: Dices,
    title: "Casino",
    desc: "Blackjack, slots, and Ride the Bus. Gamble your way to riches — or ruin.",
    color: "text-orange-400",
  },
  {
    icon: Eye,
    title: "Hoes & Hustle",
    desc: "Build your empire from the streets up. Passive income streams for the smart player.",
    color: "text-pink-300",
  },
  {
    icon: UsersRound,
    title: "Community",
    desc: "Feedback boards, leaderboards, and activity feeds. Every move is tracked.",
    color: "text-blue-400",
  },
];

const STATS = [
  { icon: Trophy, value: "15+", label: "Crime Types" },
  { icon: Server, value: "Live", label: "Real-Time Economy" },
  { icon: UsersRound, value: "Gangs", label: "Full Clan System" },
  { icon: TrendingUp, value: "24/7", label: "Active Market" },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const opacity = Math.max(0, 1 - scrolled / 600);

  return (
    <div className="bg-bg-deep text-white overflow-hidden">
      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110"
            style={{
              backgroundImage: "url(/login.png)",
              filter: "brightness(0.3) saturate(1.2)",
              transform: `scale(${1 + scrolled * 0.0003})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-purple-950/60 via-transparent to-bg-deep" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(147,51,234,0.15),transparent_70%)]" />
        </div>

        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: "6s" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: "8s", animationDelay: "2s" }} />

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto" style={{ opacity }}>
          <div className="mb-8 flex justify-center">
            <Image
              src="/logo.png"
              alt="Gang Wars"
              width={400}
              height={140}
              className="h-auto drop-shadow-[0_0_40px_rgba(147,51,234,0.6)]"
              priority
            />
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent">
              Rise Through the Ranks
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 font-mono tracking-wide">
            Build your empire. Dominate the streets. Crush your rivals.
            <br className="hidden md:block" />
            The underground awaits.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group relative px-8 py-4 rounded-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg tracking-widest uppercase transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(147,51,234,0.4)]"
            >
              <span className="relative z-10">Play Now</span>
              <div className="absolute inset-0 rounded-sm bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 rounded-sm border border-white/10 text-white/70 hover:text-white hover:border-white/30 font-mono text-sm tracking-widest uppercase transition-all duration-300"
            >
              Login
            </Link>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown size={24} className="text-white/20" />
          </div>
        </div>
      </section>

      {/* ─── Stats bar ─── */}
      <section className="relative z-10 -mt-20 pb-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="backdrop-blur-md bg-white/[0.03] border border-white/5 rounded-sm px-6 py-6 text-center"
              >
                <stat.icon size={20} className="text-purple-400/60 mx-auto mb-2" />
                <div className="text-2xl font-bold font-mono text-white/90">{stat.value}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-white/30 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent" />

        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
              What Awaits You
            </h2>
            <p className="text-white/30 font-mono text-sm mt-3 tracking-wider">
              Every aspect of the underground economy, simulated in real time.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="group relative rounded-sm border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300"
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <feat.icon size={22} className={`${feat.color} mb-3`} />
                <h3 className="text-sm font-semibold font-mono tracking-wider text-white/80 mb-2">{feat.title}</h3>
                <p className="text-xs font-mono text-white/30 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent mb-16">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create Your Character", desc: "Sign up in seconds and customize your stats. Choose your path — enforcer, dealer, or hacker." },
              { step: "02", title: "Hustle & Build", desc: "Commit crimes, trade on the black market, win fights, and stack cash. Every action earns respect." },
              { step: "03", title: "Dominate", desc: "Join or lead a gang, claim territory, invest in the trading terminal, and rise to the top of the leaderboard." },
            ].map((step) => (
              <div key={step.step} className="relative">
                <div className="text-5xl font-bold font-mono text-purple-500/10 mb-4">{step.step}</div>
                <h3 className="text-base font-semibold font-mono tracking-wider text-white/80 mb-2">{step.title}</h3>
                <p className="text-sm font-mono text-white/30 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-24 md:py-32">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/login.png)", filter: "brightness(0.15)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-950/40 to-cyan-950/40" />

        <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent">
              Ready to Rule the Streets?
            </span>
          </h2>
          <p className="text-white/40 font-mono text-sm mb-10 tracking-wide">
            Thousands of players. A living economy. One kingpin.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg tracking-widest uppercase transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(147,51,234,0.4)]"
          >
            Get Started <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Gang Wars" width={100} height={35} className="h-6 w-auto opacity-40" />
            <span className="text-[10px] font-mono text-white/20 tracking-widest uppercase">&copy; 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-[10px] font-mono text-white/20 hover:text-white/50 uppercase tracking-widest transition-colors">
              Login
            </Link>
            <Link href="/register" className="text-[10px] font-mono text-white/20 hover:text-white/50 uppercase tracking-widest transition-colors">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
