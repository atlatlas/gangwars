"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import GameLayout from "@/components/GameLayout";
import { useUser } from "@/lib/UserContext";
import { crimes as crimesApi, profile as profileApi, bank as bankApi, profileExt } from "@/lib/api";
import { useToast } from "@/components/Toast";
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
  BookOpen,
  Shield,
  Gauge,
  Brain,
  MessageCircle,
  Building,
  Eye,
} from "lucide-react";
import Tooltip from "@/components/Tooltip";

export default function DashboardPage() {
  const { user, refreshUser } = useUser();
  const { toast } = useToast();
  const [crimeResult, setCrimeResult] = useState<CrimeResult | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [assigning, setAssigning] = useState<Record<string, boolean>>({});
  const [healing, setHealing] = useState(false);
  const [bankData, setBankData] = useState<{ bank: number; cash: number } | null>(null);
  const [warfare, setWarfare] = useState<{ thug: number; dealer: number; pimp: number; highest: number } | null>(null);
  const [showSpecPicker, setShowSpecPicker] = useState(false);
  const [choosingSpec, setChoosingSpec] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bankApi.get().then(setBankData).catch(() => {});
    profileExt.warfare().then(setWarfare).catch(() => {});
  }, [user?.id]);

  if (!user) return null;

  const handleQuickCrime = async (crimeId: number) => {
    try {
      const result = await crimesApi.commit(crimeId);
      setCrimeResult(result);
      await refreshUser();
    } catch (err: any) {
      toast(err.message, "error");
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
      toast(err.message, "error");
    } finally {
      setAssigning((prev) => ({ ...prev, [stat]: false }));
    }
  };

  const handleHeal = async () => {
    setHealing(true);
    try {
      await profileApi.heal();
      await refreshUser();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setHealing(false);
    }
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
      toast("Profile picture updated!", "success");
    } catch (err: any) {
      toast(err?.message || "Failed to upload image", "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  /** Resize & compress an image file to a max dimension, returns base64 data URL */
  function compressImage(file: File, maxDim: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxDim) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else if (height > maxDim) {
            width = (width / height) * maxDim;
            height = maxDim;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => reject(new Error("Failed to decode image"));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      await profileApi.avatar(null);
      await refreshUser();
      toast("Profile picture removed", "success");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const xpPct = user.xpNeeded ? Math.min(100, Math.round((user.xp / user.xpNeeded) * 100)) : 0;

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

        {/* Logo — 1/3 from top, centered */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <img
            src="/logo.png"
            alt="Gang Wars"
            className="h-28 md:h-36 w-auto drop-shadow-[0_0_32px_rgba(147,51,234,0.6)]"
          />
        </div>

        {/* Profile overlay — avatar + name + level */}
        <div className="absolute bottom-16 md:bottom-20 left-0 right-0 z-10 px-4 md:px-6">
          <div className="flex items-end gap-4">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-white/20 overflow-hidden bg-bg-card shadow-lg shadow-black/40">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.username}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neon-navy/20 text-neon-navy">
                    <User size={28} className="md:w-8 md:h-8" />
                  </div>
                )}
              </div>

              {/* Upload overlay */}
              <div
                className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
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

            {/* Name + Level */}
            <div className="pb-1">
              <h1 className="text-lg md:text-xl font-bold text-white drop-shadow-lg">{user.username}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Crown size={14} className="text-neon-navy drop-shadow-lg" />
                <span className="text-sm font-mono text-white/90 drop-shadow-lg">Lv.{user.level}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Power Level bar — integrated into hero bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 md:px-6 pb-4 md:pb-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-[0.15em] drop-shadow-lg">Power Level</span>
            <span className="text-xs font-mono text-white/50 drop-shadow-lg">{xpPct}%</span>
          </div>
          <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className="h-full rounded-full bg-[linear-gradient(135deg,#ec4899,#06b6d4)] shadow-[0_0_8px_rgba(236,72,153,0.5)] transition-all duration-500 ease-out"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-mono text-white/30 drop-shadow-lg">
              {user.xp.toLocaleString()} / {user.xpNeeded?.toLocaleString()} XP
            </span>
            <span className="text-sm text-white/30 flex items-center gap-1 drop-shadow-lg">
              <Flame size={8} />
              {user.xpNeeded ? user.xpNeeded - user.xp : 0} to next
            </span>
          </div>
        </div>

        {/* Gradient blend at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg-deep via-bg-deep/50 to-transparent" />
      </div>

      {/* Dashboard content — constrained width */}
      <div className="max-w-5xl mx-auto px-4 py-6">

      {/* Quick Stats — 80s neon resource cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">

        {/* Turns — action economy with cooldown bar */}
        <div className="reveal reveal-delay-1">
          <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 border-l-[3px] border-l-yellow-400/40 shadow-[inset_3px_0_8px_-4px_rgba(250,204,21,0.2)]">
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
          </div>
        </div>

        {/* Cash — net worth, bold amount */}
        <div className="reveal reveal-delay-2">
          <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 border-l-[3px] border-l-pink-400/40 shadow-[inset_3px_0_8px_-4px_rgba(244,114,182,0.2)]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-mono text-white/35 uppercase tracking-wider">Cash</span>
              <DollarSign size={12} className="text-pink-400/60 drop-shadow-[0_0_4px_rgba(244,114,182,0.3)]" />
            </div>
            <div className="flex items-baseline gap-0.5 mb-2.5">
              <span className="text-base font-mono text-pink-400/70 font-semibold drop-shadow-[0_0_4px_rgba(244,114,182,0.2)]">$</span>
              <span className="text-2xl font-mono font-bold text-white tracking-tight drop-shadow-[0_0_6px_rgba(244,114,182,0.25)]">{user.cash.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-pink-400/40 via-pink-400/20 to-transparent shadow-[0_0_4px_rgba(244,114,182,0.15)]" />
            </div>
          </div>
        </div>

        {/* Respect — reputation score */}
        <div className="reveal reveal-delay-3">
          <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 border-l-[3px] border-l-cyan-400/40 shadow-[inset_3px_0_8px_-4px_rgba(34,211,238,0.2)]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-mono text-white/35 uppercase tracking-wider">Respect</span>
              <TrendingUp size={12} className="text-cyan-400/60 drop-shadow-[0_0_4px_rgba(34,211,238,0.3)]" />
            </div>
            <div className="flex items-baseline gap-0.5 mb-2.5">
              <span className="text-2xl font-mono font-bold text-white tracking-tight drop-shadow-[0_0_6px_rgba(34,211,238,0.25)]">{user.respect}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-cyan-400/40 via-cyan-400/20 to-transparent shadow-[0_0_4px_rgba(34,211,238,0.15)]" />
            </div>
          </div>
        </div>

        {/* HP — health status with bar */}
        <div className="reveal reveal-delay-4">
          <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 border-l-[3px] border-l-red-400/40 shadow-[inset_3px_0_8px_-4px_rgba(248,113,113,0.2)]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-mono text-white/35 uppercase tracking-wider">HP</span>
              <div className="flex items-center gap-2">
                {user.hp < user.maxHp && (
                  <button
                    onClick={handleHeal}
                    disabled={healing}
                    className="font-mono tracking-wider text-[10px] uppercase text-pink-400/70 hover:text-pink-300 border border-pink-400/20 hover:border-pink-400/40 rounded-sm px-2 py-0.5 transition-all duration-150 hover:shadow-[0_0_12px_rgba(236,72,153,0.1)] flex items-center gap-1"
                  >
                    <Heart size={10} /> ${((user.maxHp - user.hp) * 2).toLocaleString()}
                  </button>
                )}
                <Heart size={12} className="text-red-400/60 drop-shadow-[0_0_4px_rgba(248,113,113,0.3)]" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mb-2.5">
              <span className="text-2xl font-mono font-bold text-white tracking-tight drop-shadow-[0_0_6px_rgba(248,113,113,0.25)]">{user.hp}</span>
              <span className="text-xs font-mono text-white/20">/ {user.maxHp}</span>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden shadow-[inset_0_0_4px_rgba(0,0,0,0.3)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500/50 to-red-300/60 shadow-[0_0_6px_rgba(248,113,113,0.3)] transition-all duration-700"
                style={{ width: `${(user.hp / user.maxHp) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Crime Result Banner */}
      {crimeResult && (
        <div className={`mb-5 animate-slide-in rounded-sm border p-4 ${crimeResult.success ? "border-pink-500/25 bg-pink-500/[0.04]" : "border-cyan-500/25 bg-cyan-500/[0.04]"}`}>
          <div className="flex items-center gap-3">
            {crimeResult.success ? (
              <Trophy size={22} className="text-pink-400" />
            ) : (
              <Skull size={22} className="text-cyan-400" />
            )}
            <div className="flex-1">
              <p className={`font-semibold text-sm font-mono tracking-wider ${crimeResult.success ? "text-pink-300" : "text-cyan-300"}`}>
                {crimeResult.success ? "> CRIME SUCCESSFUL" : "> CRIME FAILED"}
              </p>
              <p className="text-xs text-white/50 mt-0.5 font-mono">
                {crimeResult.crimeName}
                {crimeResult.success
                  ? ` — +$${crimeResult.reward} cash, +${crimeResult.xpGained} XP`
                  : crimeResult.arrested
                  ? " — You got arrested!"
                  : ` — Lost ${crimeResult.hpLost} HP`}
              </p>
            </div>
            {crimeResult.leveledUp && (
              <div className="bg-gradient-to-r from-pink-500 to-cyan-400 text-white text-sm font-bold px-3 py-1.5 rounded-sm font-mono shadow-[0_0_12px_rgba(236,72,153,0.4)] animate-pulse">
                LV.{crimeResult.newLevel}!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tools + Info — main dashboard area */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Tools column — 3/5 width */}
        <div className="lg:col-span-3 space-y-4">

          {/* Quick Actions — 2x2 nav grid */}
          <div className="reveal reveal-delay-1">
            <h2 className="text-sm font-mono text-white/30 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Swords size={12} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" /> Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {shortcuts.map((s) => {
                const Icon = s.icon;
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="group rounded-sm border border-white/5 bg-bg-dark/80 p-3.5 no-underline transition-all duration-150 hover:border-pink-400/40 hover:shadow-[0_0_16px_rgba(236,72,153,0.15)]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-pink-500/15 to-cyan-500/15 border border-pink-400/30 flex items-center justify-center text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.15)] group-hover:drop-shadow-[0_0_8px_rgba(236,72,153,0.3)] transition-all duration-150">
                        <Icon size={15} />
                      </div>
                      <ChevronRight size={12} className="text-white/10 group-hover:text-pink-400/50 transition-all group-hover:translate-x-0.5" />
                    </div>
                    <p className="font-mono text-sm tracking-wider text-white/80 group-hover:text-pink-300 group-hover:drop-shadow-[0_0_4px_rgba(236,72,153,0.2)] transition-all duration-150">{s.label}</p>
                    <p className="text-xs font-mono text-white/35 mt-0.5">{s.desc}</p>
                    <p className="text-sm font-mono text-white/15 mt-1.5">{s.stat}</p>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick Crimes — compact row */}
          <div className="reveal reveal-delay-2">
            <h2 className="text-sm font-mono text-white/30 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Zap size={12} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" /> Quick Crimes
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
                  className="group rounded-sm border border-white/5 bg-bg-dark/80 p-3 text-left transition-all duration-150 hover:border-pink-400/40 hover:shadow-[0_0_16px_rgba(236,72,153,0.15)]"
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

        {/* Info column — 2/5 width */}
        <div className="lg:col-span-2 space-y-4">
          {/* Attributes */}
          <div className="reveal reveal-delay-3">
            <h2 className="text-sm font-mono text-white/30 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Swords size={12} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" /> Attributes
              {user.statPoints > 0 && (
                <span className="text-[11px] font-mono text-cyan-300 drop-shadow-[0_0_4px_rgba(34,211,238,0.2)]">({user.statPoints} pts)</span>
              )}
            </h2>
            <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4">
              <div className="space-y-2.5">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  const loading = assigning[stat.key];
                  return (
                    <div key={stat.key} className="flex items-center gap-2.5">
                      <Icon size={13} className={stat.colorClass} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <Tooltip content={stat.tooltip}>
                            <span className="text-[11px] font-mono text-white/30 uppercase tracking-wider border-b border-dotted border-white/10 cursor-help">{stat.label}</span>
                          </Tooltip>
                          <span className="font-mono text-xs text-white/80">{stat.value}</span>
                        </div>
                        <div className="w-full h-1 bg-black/30 rounded-full overflow-hidden shadow-[inset_0_0_4px_rgba(0,0,0,0.3)]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, stat.value)}%`,
                              background: `linear-gradient(90deg, ${stat.key === 'strength' ? '#ec4899' : stat.key === 'agility' ? '#06b6d4' : stat.key === 'intelligence' ? '#06b6d4' : stat.key === 'charisma' ? '#eab308' : '#a855f7'}33, ${stat.key === 'strength' ? '#ec4899' : stat.key === 'agility' ? '#06b6d4' : stat.key === 'intelligence' ? '#06b6d4' : stat.key === 'charisma' ? '#eab308' : '#a855f7'}99)`,
                              boxShadow: `0 0 6px ${stat.key === 'strength' ? 'rgba(236,72,153,0.3)' : stat.key === 'agility' ? 'rgba(6,182,212,0.3)' : stat.key === 'intelligence' ? 'rgba(6,182,212,0.3)' : stat.key === 'charisma' ? 'rgba(234,179,8,0.3)' : 'rgba(168,85,247,0.3)'}`
                            }}
                          />
                        </div>
                      </div>
                      {user.statPoints > 0 && (
                        <button
                          onClick={() => handleAssign(stat.key)}
                          disabled={loading}
                          className="text-pink-400/50 hover:text-pink-300 hover:bg-pink-500/10 p-1 rounded-sm transition-colors shrink-0"
                          title={`+1 ${stat.label}`}
                        >
                          {loading ? (
                            <div className="animate-spin h-3 w-3 border-2 border-pink-400/30 border-t-pink-400 rounded-full" />
                          ) : (
                            <Plus size={13} />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="reveal reveal-delay-5">
            <h2 className="text-sm font-mono text-white/30 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <DollarSign size={12} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" /> Net Worth
            </h2>
            <div className="rounded-sm border border-white/5 bg-bg-dark/80 divide-y divide-white/5">
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-xs font-mono tracking-wide text-white/35 uppercase">Cash</span>
                <span className="text-xs font-mono text-white/80">${user.cash.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-xs font-mono tracking-wide text-white/35 uppercase">Bank</span>
                <span className="text-xs font-mono text-cyan-400">${(bankData?.bank ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-xs font-mono tracking-wide text-white/35 uppercase">Respect</span>
                <span className="text-xs font-mono text-white/80">{user.respect}</span>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-xs font-mono tracking-wide text-white/35 uppercase">Specialization</span>
                <span className="text-xs font-mono text-white/80">
                  {user.specialization ? (
                    user.specialization.charAt(0).toUpperCase() + user.specialization.slice(1)
                  ) : (
                    <button
                      onClick={() => setShowSpecPicker(true)}
                      className="text-pink-400/70 hover:text-pink-300 underline underline-offset-2"
                    >
                      Choose
                    </button>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-xs font-mono tracking-wide text-white/35 uppercase">Level</span>
                <span className="text-xs font-mono text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.2)]">{user.level}</span>
              </div>
            </div>
          </div>

          <div className="reveal reveal-delay-4">
            <h2 className="text-sm font-mono text-white/30 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Activity size={12} className="text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.3)]" /> Activity
            </h2>
            <div className="rounded-sm border border-white/5 bg-bg-dark/80 divide-y divide-white/5">
              {user.jailTime && user.jailTime > 0 ? (
                <div className="flex items-center gap-2.5 p-3.5 text-yellow-500">
                  <Clock size={14} />
                  <div>
                    <p className="font-mono text-xs tracking-wider">Incarcerated</p>
                    <p className="text-xs text-white/40 font-mono">{user.jailTime}m remaining</p>
                  </div>
                </div>
              ) : user.hospitalTime && user.hospitalTime > 0 ? (
                <div className="flex items-center gap-2.5 p-3.5 text-cyan-400">
                  <Heart size={14} />
                  <div>
                    <p className="font-mono text-xs tracking-wider">Hospitalized</p>
                    <p className="text-xs text-white/40 font-mono">{user.hospitalTime}m until recovery</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-xs font-mono tracking-wide text-white/35 uppercase">Crimes</span>
                    <span className="text-xs font-mono text-white/80">{user.stats?.crimesCommitted || 0}</span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-xs font-mono tracking-wide text-white/35 uppercase">PvP Wins</span>
                    <span className="text-xs font-mono text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.2)]">{user.stats?.pvpWins || 0}</span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-xs font-mono tracking-wide text-white/35 uppercase">PvP Losses</span>
                    <span className="text-xs font-mono text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.2)]">{user.stats?.pvpLosses || 0}</span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-xs font-mono tracking-wide text-white/35 uppercase">Earned</span>
                    <span className="text-xs font-mono text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.2)]">${user.stats?.totalMoneyEarned?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-xs font-mono tracking-wide text-white/35 uppercase">Lost</span>
                    <span className="text-xs font-mono text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.2)]">${user.stats?.totalMoneyLost?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-xs font-mono tracking-wide text-white/35 uppercase">Arrests</span>
                    <span className="text-xs font-mono text-white/80">{user.stats?.timesArrested || 0}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      </div>
      </div>

      {/* Specialization Chooser Modal */}
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
                    toast(e.message, "error");
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
                    toast(e.message, "error");
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
                    toast(e.message, "error");
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

      {/* Warfare Ratings */}
      {warfare && (
        <div className="fixed bottom-20 md:bottom-4 right-4 z-40">
          <div className="border border-white/5 bg-bg-dark/90 backdrop-blur-sm rounded-sm px-3 py-2 text-[11px] font-mono shadow-[0_0_16px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-2 text-white/30 uppercase tracking-wider mb-1">
              <Swords size={10} /> Warfare
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-pink-400/70 w-10">Thug</span>
                <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-pink-500/70" style={{ width: `${Math.min(100, (warfare.thug / 200) * 100)}%` }} />
                </div>
                <span className="text-pink-300 w-8 text-right">{warfare.thug}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400/70 w-10">Dealer</span>
                <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-cyan-500/70" style={{ width: `${Math.min(100, (warfare.dealer / 200) * 100)}%` }} />
                </div>
                <span className="text-cyan-300 w-8 text-right">{warfare.dealer}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-400/70 w-10">Pimp</span>
                <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-purple-500/70" style={{ width: `${Math.min(100, (warfare.pimp / 200) * 100)}%` }} />
                </div>
                <span className="text-purple-300 w-8 text-right">{warfare.pimp}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </GameLayout>
  );
}
