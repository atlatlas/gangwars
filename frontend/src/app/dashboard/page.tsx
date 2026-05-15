"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import GameLayout from "@/components/GameLayout";
import { useUser } from "@/lib/UserContext";
import { crimes as crimesApi, profile as profileApi, bank as bankApi, profileExt, activity as activityApi, FeedEntry } from "@/lib/api";
import { useTopNotification } from "@/components/TopNotification";
import { compressImage } from "@/lib/imageUtils";
import Tooltip from "@/components/Tooltip";
import AvatarPicker from "@/components/AvatarPicker";
import { CrimeResult } from "@/types";
import {
  Zap,
  DollarSign,
  TrendingUp,
  Swords,
  Activity,
  Skull,
  Clock,
  Heart,
  Trophy,
  Crown,
  Crosshair,
  User,
  Medal,
  ChevronRight,
  Flame,
  Camera,
  Plus,
  X,
  BookOpen,
  Shield,
  Gauge,
  Brain,
  MessageCircle,
} from "lucide-react";

export default function DashboardPage() {
  const { user, refreshUser } = useUser();
  const { showNotification, showConfirm } = useTopNotification();
  const [crimeResult, setCrimeResult] = useState<CrimeResult | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [assigning, setAssigning] = useState<Record<string, boolean>>({});
  const [healing, setHealing] = useState(false);
  const [bankData, setBankData] = useState<{ bank: number; cash: number; totalInterestEarned: number } | null>(null);
  const [warfare, setWarfare] = useState<{ thug: number; dealer: number; pimp: number; highest: number } | null>(null);
  const [showSpecPicker, setShowSpecPicker] = useState(false);
  const [choosingSpec, setChoosingSpec] = useState(false);
  const [showStatTip, setShowStatTip] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshUser();
    bankApi.get().then(setBankData).catch(() => {});
    profileExt.warfare().then(setWarfare).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    setFeedLoading(true);
    activityApi.feed(30).then((data) => setFeed(data.feed)).catch(() => {}).finally(() => setFeedLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (user && user.statPoints > 0) setShowStatTip(true);
  }, [user?.statPoints]);

  if (!user) return null;

  const handleQuickCrime = async (crimeId: number) => {
    try {
      const result = await crimesApi.commit(crimeId);
      setCrimeResult(result);
      await refreshUser();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleAssign = async (stat: string) => {
    const points: Record<string, number> = {};
    points[stat] = 1;
    setAssigning((prev) => ({ ...prev, [stat]: true }));
    try {
      await profileApi.assignStats(points);
      await refreshUser();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setAssigning((prev) => ({ ...prev, [stat]: false }));
    }
  };

  const doHeal = async (method: "cash" | "turns") => {
    setHealing(true);
    try {
      await profileApi.heal(method);
      await refreshUser();
      if (method === "turns") showNotification("Sacrificed turns to heal 50% HP", "info");
    } catch (err: any) {
      const data = err.data;
      if (data?.turnHealAvailable) {
        showNotification(data.error || "Not enough cash. Use turns to heal instead?", "warning");
      } else {
        showNotification(err.message || "Failed to heal", "error");
      }
    } finally {
      setHealing(false);
    }
  };

  const handleHeal = (method: "cash" | "turns" = "cash") => {
    if (method === "turns") {
      showConfirm(
        `Sacrifice up to 10 turns at 5% HP per turn to heal? You'll use ${Math.min(user?.turns ?? 0, 10)} turns.`,
        "warning",
        () => doHeal(method)
      );
      return;
    }
    doHeal(method);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);

    // Compress image on client before uploading
    try {
      const dataUrl = await compressImage(file, 256, 0.8);
      await profileApi.avatar(dataUrl);
      await refreshUser();
      showNotification("Profile picture updated!", "success");
    } catch (err: any) {
      showNotification(err?.message || "Failed to upload image", "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      await profileApi.avatar(null);
      await refreshUser();
      showNotification("Profile picture removed", "success");
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const xpPct = user.xpNeeded ? Math.min(100, Math.round((user.xp / user.xpNeeded) * 100)) : 0;

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  const costPerHp = 2;

  const stats = [
    { key: "strength", label: "Strength", value: user.strength, icon: Swords, colorClass: "text-pink-400", progressColor: "pink" as const, tooltip: "+2 PvP attack per point. Used in Mugging & Warehouse Heist." },
    { key: "agility", label: "Agility", value: user.agility, icon: Gauge, colorClass: "text-cyan-400", progressColor: "cyan" as const, tooltip: "+1 PvP defense per point. Used in Shoplifting & Street Racing." },
    { key: "intelligence", label: "Intelligence", value: user.intelligence, icon: Brain, colorClass: "text-cyan-400", progressColor: "cyan" as const, tooltip: "Used in Hacking & Bank Robbery. Boosts skill training XP." },
    { key: "charisma", label: "Charisma", value: user.charisma, icon: MessageCircle, colorClass: "text-yellow-400", progressColor: "gold" as const, tooltip: "Used in Drug Deal & Protection Racket. Better drug trade returns." },
    { key: "endurance", label: "Endurance", value: user.endurance, icon: Shield, colorClass: "text-purple-400", progressColor: "purple" as const, tooltip: "+5 max HP per point. Increases survivability." },
  ];

  const shortcuts = [
    {
      href: "/crimes",
      icon: Swords,
      label: "Crimes",
      desc: "Earn cash & XP",
      stat: `${user.stats?.crimesCommitted || 0} committed`,
      accent: "text-neon-navy",
      bgGlow: "from-neon-navy/5 to-transparent",
      borderGlow: "hover:border-neon-navy/30",
    },
    {
      href: "/fight",
      icon: Crosshair,
      label: "Fight",
      desc: "Battle for respect",
      stat: `${user.stats?.pvpWins || 0}W / ${user.stats?.pvpLosses || 0}L`,
      accent: "text-neon-red",
      bgGlow: "from-neon-red/5 to-transparent",
      borderGlow: "hover:border-neon-red/30",
    },
    {
      href: "/skills",
      icon: BookOpen,
      label: "Skills",
      desc: "Train life skills",
      stat: "Guerrilla, Chemistry & more",
      accent: "text-neon-purple",
      bgGlow: "from-purple-500/5 to-transparent",
      borderGlow: "hover:border-purple-500/30",
    },
    {
      href: "/leaderboard",
      icon: Medal,
      label: "Leaderboard",
      desc: "See the rankings",
      stat: `$${user.cash.toLocaleString()} net`,
      accent: "text-neon-yellow",
      bgGlow: "from-neon-yellow/5 to-transparent",
      borderGlow: "hover:border-neon-yellow/30",
    },
  ];

  return (
    <GameLayout>
      {/* Hero Section — full viewport width, direct child of main */}
      <div className="relative mb-0 overflow-hidden">

        <div
          className="absolute inset-0 z-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-cyan-500/5"
        />

        <Image
          src="/lvl1_hereo.png"
          alt="Your Character"
          width={1897}
          height={829}
          className="w-full h-auto max-h-[300px] md:max-h-[380px] object-cover object-bottom relative z-0"
          priority
        />

        {/* Dark gradient overlay so text is readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-deep/90 via-bg-deep/30 to-transparent" />

        {/* Logo — right on mobile, centered on desktop */}
        <div className="absolute top-1/3 right-4 sm:left-1/2 sm:right-auto -translate-y-1/2 sm:-translate-x-1/2 z-10">
          <img
            src="/logo.png"
            alt="Gang Wars"
            className="h-28 md:h-36 w-auto drop-shadow-[0_0_32px_rgba(147,51,234,0.6)]"
          />
        </div>

        {/* Profile overlay — avatar + name + level + HP + XP + attributes (consolidated) */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 md:px-6 pb-3 md:pb-4">
          <div className="flex items-end gap-4">
            {/* Avatar - larger */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-full border-2 border-white/20 overflow-hidden bg-bg-card shadow-lg shadow-black/40">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.username}
                    width={112}
                    height={112}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neon-navy/20 text-neon-navy">
                    <User size={36} className="md:w-12 md:h-12" />
                  </div>
                )}
              </div>

              {/* Change photo — opens picker */}
              <div
                className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => setShowPicker(true)}
              >
                {uploadingAvatar ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Camera size={18} className="text-white" />
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />

              {/* Remove button */}
              {user.avatarUrl && (
                <button
                  onClick={handleRemoveAvatar}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-bg-deep border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neon-red/80"
                  title="Remove avatar"
                >
                  <span className="text-xs text-white font-bold">&times;</span>
                </button>
              )}
            </div>

            {/* Info + XP + Stats */}
            <div className="pb-1 flex-1 min-w-0">
              {/* Name + Level + HP + heal */}
              <h1 className="text-lg md:text-xl font-bold text-white drop-shadow-lg">{user.username}</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Crown size={14} className="text-neon-navy drop-shadow-lg" />
                <span className="text-sm font-mono text-white/90 drop-shadow-lg">Lv.{user.level}</span>
                <span className="text-white/30 text-xs drop-shadow-lg">|</span>
                <Heart size={12} className="text-red-400 drop-shadow-lg" />
                <span className="text-sm font-mono text-red-300 drop-shadow-lg">{user.hp}<span className="text-white/40">/{user.maxHp}</span></span>
                {user.hp < user.maxHp && user.hp > 0 && (
                  <button onClick={() => handleHeal("cash")} disabled={healing} className="font-mono tracking-wider text-[9px] uppercase text-pink-400/60 hover:text-pink-300 border border-pink-400/20 rounded-sm px-1.5 py-0.5 transition-all flex items-center gap-0.5"><Heart size={8} /> ${((user.maxHp - user.hp) * 2).toLocaleString()}</button>
                )}
                {user.hp <= 0 && (
                  <>
                    <button onClick={() => handleHeal("cash")} disabled={healing} className="font-mono tracking-wider text-[9px] uppercase text-pink-400/60 border border-pink-400/20 rounded-sm px-1.5 py-0.5 flex items-center gap-0.5"><Heart size={8} /> Heal</button>
                    {user.turns > 0 && <button onClick={() => handleHeal("turns")} disabled={healing} className="font-mono tracking-wider text-[9px] uppercase text-cyan-400/60 border border-cyan-400/20 rounded-sm px-1.5 py-0.5 flex items-center gap-0.5"><Zap size={8} /> {(Math.min(user.turns, 10) * 5)}%</button>}
                  </>
                )}
              </div>

              {/* Power Level bar */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.15em] drop-shadow-lg">Power Level</span>
                  <span className="text-[10px] font-mono text-white/40 drop-shadow-lg">{xpPct}%</span>
                </div>
                <div className="w-full h-1 bg-black/30 rounded-full overflow-hidden backdrop-blur-sm">
                  <div className="h-full rounded-full bg-[linear-gradient(135deg,#ec4899,#06b6d4)] shadow-[0_0_8px_rgba(236,72,153,0.5)] transition-all duration-500 ease-out" style={{ width: `${xpPct}%` }} />
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] font-mono text-white/25 drop-shadow-lg">{user.xp.toLocaleString()} / {user.xpNeeded?.toLocaleString()} XP</span>
                  <span className="text-[10px] text-white/25 flex items-center gap-1 drop-shadow-lg"><Flame size={7} />{user.xpNeeded ? user.xpNeeded - user.xp : 0} to next</span>
                </div>
              </div>

              {/* Attributes — larger font row */}
              <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-white/10">
                {stats.map((stat) => (
                  <Tooltip key={stat.key} content={stat.tooltip} className="flex flex-1">
                    <div className="flex items-center gap-1 flex-1">
                      <span className="text-xs font-mono text-white/30 uppercase drop-shadow-lg">{stat.label.substring(0, 3)}</span>
                      <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${Math.min(100, stat.value)}%`,
                          background: `linear-gradient(90deg, ${stat.key === 'strength' ? '#ec4899' : stat.key === 'agility' ? '#06b6d4' : stat.key === 'intelligence' ? '#06b6d4' : stat.key === 'charisma' ? '#eab308' : '#a855f7'}66, ${stat.key === 'strength' ? '#ec4899' : stat.key === 'agility' ? '#06b6d4' : stat.key === 'intelligence' ? '#06b6d4' : stat.key === 'charisma' ? '#eab308' : '#a855f7'}cc)`,
                        }} />
                      </div>
                      <span className="text-xs font-mono text-white/70 drop-shadow-lg">{stat.value}</span>
                      {user.statPoints > 0 && (
                        <button
                          onClick={() => handleAssign(stat.key)}
                          disabled={assigning[stat.key]}
                          className={`shrink-0 ml-0.5 w-4 h-4 flex items-center justify-center rounded-sm drop-shadow-lg animate-pulse-soft ${
                            stat.key === 'strength' ? 'bg-pink-500/20 text-pink-300 hover:bg-pink-500/40' :
                            stat.key === 'agility' ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40' :
                            stat.key === 'intelligence' ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40' :
                            stat.key === 'charisma' ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/40' :
                            'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40'
                          }`}
                        >
                          {assigning[stat.key] ? (
                            <div className={`animate-spin h-2.5 w-2.5 border-2 border-white/30 border-t-white rounded-full ${
                              stat.key === 'strength' ? 'border-t-pink-300' :
                              stat.key === 'agility' ? 'border-t-cyan-300' :
                              stat.key === 'intelligence' ? 'border-t-cyan-300' :
                              stat.key === 'charisma' ? 'border-t-yellow-300' :
                              'border-t-purple-300'
                            }`} />
                          ) : (
                            <Plus size={10} />
                          )}
                        </button>
                      )}
                    </div>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gradient blend at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg-deep via-bg-deep/50 to-transparent pointer-events-none" />
      </div>

      {/* Dashboard content — constrained width */}
      <div className="max-w-5xl mx-auto px-4 py-6">

      {/* Quick Stats — 80s neon resource cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">

        {/* Turns — action economy with cooldown bar + Net Worth */}
        <div className="reveal reveal-delay-1">
          <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 border-l-[3px] border-l-yellow-400/40 shadow-[inset_3px_0_8px_-4px_rgba(250,204,21,0.2)] h-full">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-mono text-white/35 uppercase tracking-wider">Turns</span>
              <span className="text-xs font-mono text-yellow-400/60">{user.nextTurnIn}s</span>
            </div>
            <div className="flex items-baseline gap-1 mb-2.5">
              <span className="text-2xl font-mono font-bold text-white tracking-tight drop-shadow-[0_0_6px_rgba(250,204,21,0.25)]">{user.effectiveTurns ?? user.turns}</span>
              <span className="text-xs font-mono text-white/20">/ 5000</span>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden shadow-[inset_0_0_4px_rgba(0,0,0,0.3)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-500/50 to-yellow-300/60 shadow-[0_0_6px_rgba(250,204,21,0.3)] transition-all duration-700"
                style={{ width: `${Math.min(100, ((user.effectiveTurns ?? user.turns) / 5000) * 100)}%` }}
              />
            </div>
            {/* Net Worth under Turns */}
            <div className="mt-2 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/25 uppercase tracking-wider">Net Worth</span>
                <span className="text-xs font-mono text-cyan-300 drop-shadow-[0_0_4px_rgba(34,211,238,0.15)]">
                  ${((user.cash + (bankData?.bank ?? 0)).toLocaleString())}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[9px] font-mono text-white/15">Cash ${user.cash.toLocaleString()}</span>
                <span className="text-[9px] font-mono text-white/15">Bank ${(bankData?.bank ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cash — bold amount */}
        <div className="reveal reveal-delay-2">
          <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 border-l-[3px] border-l-pink-400/40 shadow-[inset_3px_0_8px_-4px_rgba(244,114,182,0.2)] h-full">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-mono text-white/35 uppercase tracking-wider">Cash</span>
              <DollarSign size={12} className="text-pink-400/60 drop-shadow-[0_0_4px_rgba(244,114,182,0.3)]" />
            </div>
            <div className="flex items-baseline gap-0.5 mb-2.5">
              <span className="text-base font-mono text-pink-400/70 font-semibold drop-shadow-[0_0_4px_rgba(244,114,182,0.2)]">$</span>
              <span className="text-2xl font-mono font-bold text-white tracking-tight drop-shadow-[0_0_6px_rgba(244,114,182,0.25)]">{user.cash.toLocaleString()}</span>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden shadow-[inset_0_0_4px_rgba(0,0,0,0.3)]">
              <div className="h-full rounded-full bg-gradient-to-r from-pink-500/30 to-pink-300/40 shadow-[0_0_6px_rgba(244,114,182,0.15)] transition-all duration-700" />
            </div>
            {/* Top 3 income sources */}
            {user.stats && (user.stats.earnedCrimes || user.stats.earnedPvp || user.stats.earnedHoes || user.stats.earnedDrugs) && (
              <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-white/25 uppercase tracking-wider">Top Sources</span>
                {([
                  { label: "Crimes", value: user.stats.earnedCrimes ?? 0, icon: Swords },
                  { label: "PvP", value: user.stats.earnedPvp ?? 0, icon: Crosshair },
                  { label: "Hoes", value: user.stats.earnedHoes ?? 0, icon: Heart },
                  { label: "Drugs", value: user.stats.earnedDrugs ?? 0, icon: Activity },
                ] as const)
                  .filter(s => s.value > 0)
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 3)
                  .map(s => (
                    <div key={s.label} className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-white/35 flex items-center gap-1">
                        <s.icon size={8} className="text-pink-400/60" /> {s.label}
                      </span>
                      <span className="text-[10px] font-mono text-white/60">${s.value.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Respect - reputation score */}
        <div className="reveal reveal-delay-3">
          <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 border-l-[3px] border-l-cyan-400/40 shadow-[inset_3px_0_8px_-4px_rgba(34,211,238,0.2)] h-full">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-mono text-white/35 uppercase tracking-wider">Respect</span>
                {user.respectTitle && (
                  <span className="text-[9px] font-mono text-cyan-400/50 uppercase tracking-wider border border-cyan-400/15 rounded-sm px-1 py-0.5 leading-none">
                    {user.respectTitle}
                  </span>
                )}
              </div>
              <TrendingUp size={12} className="text-cyan-400/60 drop-shadow-[0_0_4px_rgba(34,211,238,0.3)]" />
            </div>
            <div className="flex items-baseline gap-1 mb-2.5">
              <span className="text-2xl font-mono font-bold text-white tracking-tight drop-shadow-[0_0_6px_rgba(34,211,238,0.25)]">{user.respect}</span>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden shadow-[inset_0_0_4px_rgba(0,0,0,0.3)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500/50 to-cyan-300/60 shadow-[0_0_6px_rgba(34,211,238,0.3)] transition-all duration-700"
                style={{ width: `${user.respectProgress?.percent ?? 100}%` }}
              />
            </div>
            {/* Top 3 respect gainers */}
            {user.stats && (user.stats.respectCrimes || user.stats.respectPvp || user.stats.respectMilestones || user.stats.respectSkills) && (
              <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-white/25 uppercase tracking-wider">Top Sources</span>
                {([
                  { label: "Crimes", value: user.stats.respectCrimes ?? 0, icon: Swords },
                  { label: "PvP", value: user.stats.respectPvp ?? 0, icon: Crosshair },
                  { label: "Milestones", value: user.stats.respectMilestones ?? 0, icon: TrendingUp },
                  { label: "Skills", value: user.stats.respectSkills ?? 0, icon: BookOpen },
                ] as const)
                  .filter(s => s.value > 0)
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 3)
                  .map(s => (
                    <div key={s.label} className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-white/35 flex items-center gap-1">
                        <s.icon size={8} className="text-cyan-400/60" /> {s.label}
                      </span>
                      <span className="text-[10px] font-mono text-white/60">{s.value.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Bank — savings with interest info */}
        <div className="reveal reveal-delay-4">
          <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 border-l-[3px] border-l-emerald-400/40 shadow-[inset_3px_0_8px_-4px_rgba(52,211,153,0.2)] h-full">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-mono text-white/35 uppercase tracking-wider">Bank</span>
              <TrendingUp size={12} className="text-emerald-400/60 drop-shadow-[0_0_4px_rgba(52,211,153,0.3)]" />
            </div>
            <div className="flex items-baseline gap-0.5 mb-2.5">
              <span className="text-base font-mono text-emerald-400/70 font-semibold drop-shadow-[0_0_4px_rgba(52,211,153,0.2)]">$</span>
              <span className="text-2xl font-mono font-bold text-white tracking-tight drop-shadow-[0_0_6px_rgba(52,211,153,0.25)]">{(bankData?.bank ?? 0).toLocaleString()}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/25 uppercase tracking-wider">Interest Rate</span>
                <span className="text-[10px] font-mono text-emerald-400/70">0.4% daily</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/25 uppercase tracking-wider">Total Earned</span>
                <span className="text-[10px] font-mono text-emerald-400/60">${(bankData?.totalInterestEarned ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Crime Result Notification — floating overlay */}
      {crimeResult && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md animate-slide-down">
          <div className={`rounded-sm border p-3 backdrop-blur-xl shadow-lg ${
            crimeResult.success
              ? "border-pink-500/30 bg-pink-500/10"
              : "border-cyan-500/30 bg-cyan-500/10"
          }`}>
            <div className="flex items-center gap-3">
              {crimeResult.success ? (
                <Trophy size={18} className="text-pink-400 shrink-0" />
              ) : (
                <Skull size={18} className="text-cyan-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-mono tracking-wider ${crimeResult.success ? "text-pink-300" : "text-cyan-300"}`}>
                  {crimeResult.success ? "CRIME SUCCESSFUL" : "CRIME FAILED"}
                </p>
                <p className="text-[11px] text-white/50 mt-0.5 font-mono truncate">
                  {crimeResult.crimeName}
                  {crimeResult.success
                    ? ` — +$${crimeResult.reward} cash, +${crimeResult.xpGained} XP`
                    : crimeResult.arrested
                    ? " — You got arrested!"
                    : ` — Lost ${crimeResult.hpLost} HP`}
                </p>
              </div>
              {crimeResult.leveledUp && (
                <div className="bg-gradient-to-r from-pink-500 to-cyan-400 text-white text-[11px] font-bold px-2 py-1 rounded-sm font-mono shadow-[0_0_12px_rgba(236,72,153,0.4)] animate-pulse shrink-0">
                  LV.{crimeResult.newLevel}!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stat Points Notification — top bar overlay */}
      {showStatTip && user.statPoints > 0 && createPortal(
        <div className="fixed top-0 left-0 right-0 z-[200] h-12 flex items-center justify-center gap-3 px-4 font-mono text-xs tracking-wider backdrop-blur-xl border-b border-yellow-500/15 bg-yellow-500/8 text-yellow-300 animate-slide-in">
          <Flame size={14} className="text-yellow-300" />
          <span className="font-semibold">{user.statPoints} unspent stat point{user.statPoints > 1 ? "s" : ""}</span>
          <span className="opacity-40 mx-0.5">—</span>
          <span className="opacity-70">Assign them in your dashboard</span>
          <button
            onClick={() => setShowStatTip(false)}
            className="ml-2 text-white/40 hover:text-white/80 transition-colors"
          >
            <X size={13} />
          </button>
        </div>,
        document.body
      )}

      {/* Tools + Info — main dashboard area */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Tools column — 3/5 width */}
        <div className="lg:col-span-3 space-y-4">

          {/* Quick Actions — compact 2x2 nav grid */}
          <div className="reveal reveal-delay-1">
            <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Swords size={10} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" /> Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-1.5">
              {shortcuts.map((s) => {
                const Icon = s.icon;
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="group rounded-sm border border-white/5 bg-bg-dark/80 p-2.5 no-underline transition-all duration-150 hover:border-pink-400/40 hover:shadow-[0_0_16px_rgba(236,72,153,0.15)] h-full flex items-center gap-2"
                  >
                    <div className="w-7 h-7 rounded-sm bg-gradient-to-br from-pink-500/15 to-cyan-500/15 border border-pink-400/30 flex items-center justify-center text-pink-400 shrink-0">
                      <Icon size={12} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs tracking-wider text-white/80 group-hover:text-pink-300 transition-all duration-150 truncate">{s.label}</p>
                      <p className="text-[10px] font-mono text-white/30 truncate">{s.stat}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick Crimes — compact row */}
          <div className="reveal reveal-delay-2">
            <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Zap size={10} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" /> Quick Crimes
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 1, name: "Shoplifting", turns: 2, chance: 95 },
                { id: 2, name: "Mugging", turns: 3, chance: 75 },
                { id: 3, name: "Drug Deal", turns: 5, chance: 70 },
              ].map((crime) => (
                <button
                  key={crime.id}
                  onClick={() => handleQuickCrime(crime.id)}
                  className="group rounded-sm border border-white/5 bg-bg-dark/80 p-3 text-left transition-all duration-150 hover:border-pink-400/40 hover:shadow-[0_0_16px_rgba(236,72,153,0.15)] h-full"
                >
                  <p className="font-mono text-xs tracking-wider text-white/80 group-hover:text-pink-300 group-hover:drop-shadow-[0_0_4px_rgba(236,72,153,0.2)] transition-all duration-150 truncate">{crime.name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs font-mono text-white/30 flex items-center gap-1">
                      <Zap size={9} /> {crime.turns}t
                    </span>
                    <span className={`text-xs font-mono ${crime.chance >= 80 ? "text-pink-400" : crime.chance >= 50 ? "text-yellow-400" : "text-cyan-400"}`}>
                      {crime.chance}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Activity — self-end aligns bottom with QC */}
        <div className="lg:col-span-2 self-end flex flex-col">
          <div className="reveal reveal-delay-4 flex flex-col flex-1">
            <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Activity size={10} className="text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.3)]" /> Activity
            </h2>
            <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 divide-y divide-white/5 flex-1 flex flex-col justify-end">
              {user.jailTime && user.jailTime > 0 ? (
                <div className="flex items-center gap-2.5 py-1.5 text-yellow-500">
                  <Clock size={14} />
                  <div>
                    <p className="font-mono text-xs tracking-wider">Incarcerated</p>
                    <p className="text-xs text-white/40 font-mono">{user.jailTime}m remaining</p>
                  </div>
                </div>
              ) : user.hospitalTime && user.hospitalTime > 0 ? (
                <div className="flex items-center gap-2.5 py-1.5 text-cyan-400">
                  <Heart size={14} />
                  <div>
                    <p className="font-mono text-xs tracking-wider">Hospitalized</p>
                    <p className="text-xs text-white/40 font-mono">{user.hospitalTime}m until recovery</p>
                  </div>
                </div>
              ) : null}
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs font-mono tracking-wide text-white/35 uppercase">Crimes</span>
                <span className="text-xs font-mono text-white/80">{user.stats?.crimesCommitted || 0}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs font-mono tracking-wide text-white/35 uppercase">PvP Wins</span>
                <span className="text-xs font-mono text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.2)]">{user.stats?.pvpWins || 0}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs font-mono tracking-wide text-white/35 uppercase">PvP Losses</span>
                <span className="text-xs font-mono text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.2)]">{user.stats?.pvpLosses || 0}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs font-mono tracking-wide text-white/35 uppercase">Earned</span>
                <span className="text-xs font-mono text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.2)]">${user.stats?.totalMoneyEarned?.toLocaleString() || 0}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs font-mono tracking-wide text-white/35 uppercase">Lost</span>
                <span className="text-xs font-mono text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.2)]">${user.stats?.totalMoneyLost?.toLocaleString() || 0}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs font-mono tracking-wide text-white/35 uppercase">Arrests</span>
                <span className="text-xs font-mono text-white/80">{user.stats?.timesArrested || 0}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
      </div>

      {/* History Feed — Facebook-style activity feed */}
      <div className="max-w-5xl mx-auto px-4 pb-6">
        <div className="reveal">
          <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity size={10} className="text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.3)]" /> History
          </h2>
          {feedLoading ? (
            <div className="text-xs font-mono text-white/20 py-8 text-center">Loading...</div>
          ) : feed.length === 0 ? (
            <div className="text-xs font-mono text-white/20 py-8 text-center">No activity yet. Start committing crimes!</div>
          ) : (
            <div className="space-y-1">
              {feed.map((entry) => {
                const iconMap: Record<string, { icon: any; bg: string; color: string }> = {
                  level_up: { icon: Trophy, bg: "bg-yellow-500/15", color: "text-yellow-400" },
                  specialization_chosen: { icon: Crosshair, bg: "bg-purple-500/15", color: "text-purple-400" },
                  gang_created: { icon: Crown, bg: "bg-cyan-500/15", color: "text-cyan-400" },
                  gang_member_joined: { icon: User, bg: "bg-green-500/15", color: "text-green-400" },
                  gang_member_left: { icon: User, bg: "bg-orange-500/15", color: "text-orange-400" },
                  gang_member_kicked: { icon: Skull, bg: "bg-red-500/15", color: "text-red-400" },
                  gang_member_promoted: { icon: ChevronRight, bg: "bg-cyan-500/15", color: "text-cyan-400" },
                  gang_member_demoted: { icon: ChevronRight, bg: "bg-red-500/15", color: "text-red-400" },
                  gang_leadership_transferred: { icon: Crown, bg: "bg-yellow-500/15", color: "text-yellow-400" },
                  gang_disbanded: { icon: Skull, bg: "bg-red-500/15", color: "text-red-400" },
                  operation_started: { icon: Crosshair, bg: "bg-indigo-500/15", color: "text-indigo-400" },
                  operation_leveled_up: { icon: TrendingUp, bg: "bg-purple-500/15", color: "text-purple-400" },
                  casino_jackpot_blackjack: { icon: DollarSign, bg: "bg-green-500/15", color: "text-green-400" },
                  casino_jackpot_slots: { icon: DollarSign, bg: "bg-green-500/15", color: "text-green-400" },
                  casino_jackpot_rtb: { icon: DollarSign, bg: "bg-green-500/15", color: "text-green-400" },
                  skill_maxed: { icon: Medal, bg: "bg-yellow-500/15", color: "text-yellow-400" },
                  crime_score: { icon: DollarSign, bg: "bg-green-500/15", color: "text-green-400" },
                  crime_arrested: { icon: Skull, bg: "bg-red-500/15", color: "text-red-400" },
                  crime_drugs_confiscated: { icon: Skull, bg: "bg-orange-500/15", color: "text-orange-400" },
                  pvp_win: { icon: Crosshair, bg: "bg-green-500/15", color: "text-green-400" },
                  pvp_loss: { icon: Skull, bg: "bg-red-500/15", color: "text-red-400" },
                  pvp_item_stolen: { icon: Swords, bg: "bg-red-500/15", color: "text-red-400" },
                  drug_collected: { icon: DollarSign, bg: "bg-purple-500/15", color: "text-purple-400" },
                  hoe_collected: { icon: Heart, bg: "bg-pink-500/15", color: "text-pink-400" },
                  skill_milestone: { icon: TrendingUp, bg: "bg-cyan-500/15", color: "text-cyan-400" },
                  bank_deposit: { icon: DollarSign, bg: "bg-green-500/15", color: "text-green-400" },
                  bank_withdraw: { icon: DollarSign, bg: "bg-yellow-500/15", color: "text-yellow-400" },
                  item_purchased: { icon: Shield, bg: "bg-blue-500/15", color: "text-blue-400" },
                };
                const meta = iconMap[entry.type] || { icon: Activity, bg: "bg-white/5", color: "text-white/40" };
                const Icon = meta.icon;
                return (
                  <div key={entry.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-sm hover:bg-white/[0.02] transition-colors">
                    <div className={`shrink-0 w-6 h-6 rounded-sm flex items-center justify-center ${meta.bg} ${meta.color}`}>
                      <Icon size={10} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-mono text-white/70">{entry.username}</span>
                      <span className="text-xs font-mono text-white/35"> {entry.message}</span>
                    </div>
                    <div className="text-[10px] font-mono text-white/20 shrink-0 whitespace-nowrap">
                      {timeAgo(entry.createdAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {showSpecPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="border border-white/10 bg-bg-dark rounded-sm p-6 max-w-sm w-full mx-4 shadow-[0_0_32px_rgba(0,0,0,0.5)]">
            <h3 className="font-mono text-sm tracking-wider text-white/90 mb-1">Choose Your Specialization</h3>
            <p className="text-xs font-mono text-white/30 mb-4">This choice is permanent. +10% to your warfare rating.</p>
            <div className="space-y-2">
              <button
                onClick={async () => {
                  setChoosingSpec(true);
                  try {
                    await profileExt.chooseSpecialization("enforcer");
                    await refreshUser();
                    setShowSpecPicker(false);
                    const w = await profileExt.warfare();
                    setWarfare(w);
                  } catch (e: any) {
                    showNotification(e.message, "error");
                  } finally {
                    setChoosingSpec(false);
                  }
                }}
                disabled={choosingSpec}
                className="w-full text-left border border-white/10 hover:border-pink-400/40 rounded-sm p-3 transition-colors"
              >
                <p className="text-xs font-mono tracking-wider text-pink-300">Enforcer</p>
                <p className="text-[11px] font-mono text-white/30 mt-0.5">+10% Thug Warfare — strength & combat focus</p>
              </button>
              <button
                onClick={async () => {
                  setChoosingSpec(true);
                  try {
                    await profileExt.chooseSpecialization("dealer");
                    await refreshUser();
                    setShowSpecPicker(false);
                    const w = await profileExt.warfare();
                    setWarfare(w);
                  } catch (e: any) {
                    showNotification(e.message, "error");
                  } finally {
                    setChoosingSpec(false);
                  }
                }}
                disabled={choosingSpec}
                className="w-full text-left border border-white/10 hover:border-cyan-400/40 rounded-sm p-3 transition-colors"
              >
                <p className="text-xs font-mono tracking-wider text-cyan-300">Dealer</p>
                <p className="text-[11px] font-mono text-white/30 mt-0.5">+10% Dealer Warfare — intelligence & drug focus</p>
              </button>
              <button
                onClick={async () => {
                  setChoosingSpec(true);
                  try {
                    await profileExt.chooseSpecialization("hacker");
                    await refreshUser();
                    setShowSpecPicker(false);
                    const w = await profileExt.warfare();
                    setWarfare(w);
                  } catch (e: any) {
                    showNotification(e.message, "error");
                  } finally {
                    setChoosingSpec(false);
                  }
                }}
                disabled={choosingSpec}
                className="w-full text-left border border-white/10 hover:border-purple-400/40 rounded-sm p-3 transition-colors"
              >
                <p className="text-xs font-mono tracking-wider text-purple-300">Hacker</p>
                <p className="text-[11px] font-mono text-white/30 mt-0.5">+10% Pimp Warfare — charisma & control focus</p>
              </button>
            </div>
            <button
              onClick={() => setShowSpecPicker(false)}
              className="w-full mt-3 text-center text-[11px] font-mono text-white/20 hover:text-white/50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showPicker && (
        <AvatarPicker
          currentAvatar={user.avatarUrl ?? null}
          onUpdate={() => { refreshUser(); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}

    </GameLayout>
  );
}
