"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import AmbientOrbs from "./AmbientOrbs";
import CursorGlow from "./CursorGlow";
import { useUser } from "@/lib/UserContext";
import AnimatedValue from "./AnimatedValue";
import Link from "next/link";
import { LogOut, Heart, Zap, DollarSign, TrendingUp, Crown, PanelLeftClose, PanelLeft, Shield } from "lucide-react";

interface GameLayoutProps {
  children: React.ReactNode;
}

export default function GameLayout({ children }: GameLayoutProps) {
  const router = useRouter();
  const { user, loading } = useUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
  }, [router]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  // Scroll-reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    const targets = document.querySelectorAll(".reveal");
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-deep">
        <div className="text-center">
          <img src="/logo.png" alt="Gang Wars" className="h-20 w-auto mx-auto mb-4 drop-shadow-[0_0_32px_rgba(147,51,234,0.6)] animate-glow-pulse" />
          <p className="text-text-secondary/60 text-sm tracking-wider uppercase">Loading...</p>
        </div>
      </div>
    );
  }

  const nextTurnIn = user?.nextTurnIn ?? 0;
  const turnsDisplay = user?.effectiveTurns ?? user?.turns ?? 0;
  const jailRemaining = user?.jailTime ?? 0;
  const xpPct = user.xpNeeded ? Math.min(100, Math.round((user.xp / user.xpNeeded) * 100)) : 0;

  return (
    <div className="min-h-screen bg-bg-deep">
      <CursorGlow />
      <AmbientOrbs />

      {/* Unified Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-12">
        <div className="absolute inset-0 bg-bg-dark/95 backdrop-blur-xl" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(236,72,153,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
          }}
        />

        {/* Power level gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px]">
          <div
            className="h-full bg-gradient-to-r from-pink-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${xpPct}%` }}
          />
          <div className="absolute inset-0 h-full bg-gradient-to-r from-pink-500/20 to-cyan-400/20"
            style={{ left: `${xpPct}%`, right: 0 }}
          />
        </div>

        <div className="relative flex items-center h-full px-3 md:px-4 gap-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-sm text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
            title={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
          >
            {sidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>

          <div className="flex items-center gap-3 md:gap-5 flex-1 overflow-x-auto">
            <div className="flex items-center gap-1.5 shrink-0" title="HP">
              <Heart size={13} className="text-neon-red drop-shadow-[0_0_4px_rgba(248,113,113,0.3)]" />
              <AnimatedValue value={`${user.hp}/${user.maxHp}`} format="hp" className="font-mono text-xs text-pink-300" />
            </div>
            <div className="w-px h-4 bg-white/5 shrink-0" />
            <div className="flex items-center gap-1.5 shrink-0" title="Turns">
              <Zap size={13} className="text-neon-yellow drop-shadow-[0_0_4px_rgba(250,204,21,0.3)]" />
              <AnimatedValue value={turnsDisplay} format="turns" className="font-mono text-xs text-cyan-300" />
              <span className="font-mono text-[10px] text-white/30">{nextTurnIn}s</span>
            </div>
            <div className="w-px h-4 bg-white/5 shrink-0" />
            <div className="flex items-center gap-1.5 shrink-0" title="Cash">
              <DollarSign size={13} className="text-neon-green drop-shadow-[0_0_4px_rgba(74,222,128,0.3)]" />
              <AnimatedValue value={user.cash ?? 0} format="cash" className="font-mono text-xs text-cyan-300" />
            </div>
            <div className="w-px h-4 bg-white/5 shrink-0" />
            <div className="flex items-center gap-1.5 shrink-0" title="Respect">
              <TrendingUp size={13} className="text-neon-cyan drop-shadow-[0_0_4px_rgba(34,211,238,0.3)]" />
              <span className="font-mono text-xs text-pink-300">{user.respect}</span>
            </div>
            {user.gangTag && (
              <>
                <div className="w-px h-4 bg-white/5 shrink-0" />
                <Link
                  href={`/gangs/${user.gangId}`}
                  className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity"
                  title={user.gangName}
                >
                  <Shield size={13} className="text-purple-400 drop-shadow-[0_0_4px_rgba(147,51,234,0.3)]" />
                  <span className="font-mono text-xs text-purple-300">[{user.gangTag}]</span>
                </Link>
              </>
            )}
            {jailRemaining > 0 && (
              <>
                <div className="w-px h-4 bg-white/5 shrink-0" />
                <span className="text-[10px] text-yellow-500 uppercase tracking-wider font-mono bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 shrink-0">
                  Jail {jailRemaining}m
                </span>
              </>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-sm text-pink-400/30 hover:text-pink-400 hover:bg-white/5 transition-all shrink-0"
            title="Logout"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Flex layout: sidebar + main */}
      <div className="flex pt-12 min-h-screen">
        <div
          className={`hidden md:block flex-shrink-0 transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? "w-0 overflow-hidden" : "w-56 lg:w-64"
          }`}
        >
          <Sidebar />
        </div>

        <main className="flex-1 min-w-0 pb-20 md:pb-8">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
