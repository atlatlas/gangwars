"use client";

import { useState, useEffect } from "react";
import GameLayout from "@/components/GameLayout";
import { pvp, profileExt } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { PlayerIntel, AttackResult } from "@/types";
import Image from "next/image";
import { Swords, Search, Skull, Shield, Crosshair, AlertTriangle, Zap, TrendingUp, Terminal, Clock, ChevronDown, ChevronUp, Star } from "lucide-react";

export default function FightPage() {
  const { user, refreshUser } = useUser();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: number; username: string; level: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<PlayerIntel | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [attacking, setAttacking] = useState(false);
  const [result, setResult] = useState<AttackResult | null>(null);
  const [hackResult, setHackResult] = useState<{ success: boolean; targetUsername: string; respectStolen: number; turnsLeft: number } | null>(null);
  const [error, setError] = useState("");
  const [combatLog, setCombatLog] = useState<any[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [loadingLog, setLoadingLog] = useState(false);

  useEffect(() => {
    if (!logOpen || combatLog.length > 0) return;
    setLoadingLog(true);
    pvp.log().then(data => setCombatLog(data)).catch(() => {}).finally(() => setLoadingLog(false));
  }, [logOpen, combatLog.length]);

  const handleSearch = async (q: string) => {
    setQuery(q);
    setError("");
    setResult(null);
    setSelectedTarget(null);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await pvp.search(q);
      setSearchResults(data.players);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectTarget = async (id: number) => {
    setLoadingIntel(true);
    setError("");
    setResult(null);
    setHackResult(null);
    try {
      const data = await pvp.intel(id);
      setSelectedTarget(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingIntel(false);
    }
  };

  const handleHack = async () => {
    if (!selectedTarget) return;
    setAttacking(true);
    setError("");
    setResult(null);
    setHackResult(null);
    try {
      const data = await profileExt.hack(selectedTarget.id);
      setHackResult(data);
      await refreshUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAttacking(false);
    }
  };

  const handleAttack = async (type: string) => {
    if (!selectedTarget) return;
    setAttacking(true);
    setError("");
    try {
      const data = await pvp.attack(selectedTarget.id, type);
      setResult(data);
      await refreshUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAttacking(false);
    }
  };

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const threatColor = (threat: string) => {
    switch (threat) {
      case "Easy": return "text-pink-300";
      case "Medium": return "text-yellow-400";
      case "Hard": return "text-cyan-400";
      case "Extreme": return "text-red-400";
      default: return "text-white/30";
    }
  };

  return (
    <GameLayout>
      {/* Hero Section */}
      <div className="relative mb-0 h-[180px] md:h-[260px]">
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-cyan-500/5" />
        <Image
          src="/fight.png?v=1"
          alt="Fight"
          width={1897}
          height={829}
          className="w-full h-full max-h-[200px] md:max-h-[280px] object-cover object-bottom relative z-0"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 md:px-6 pb-3 md:pb-4">
          <div className="flex items-center gap-2">
            <Swords size={18} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" />
            <h1 className="text-lg md:text-xl font-bold text-white drop-shadow-lg">Fight</h1>
          </div>
          <div className="w-36 h-px bg-pink-400/40 mt-1 mb-2" />
          <div className="bg-black/30 backdrop-blur-sm rounded-sm px-2 py-1.5 mb-1 -mx-1 border-t border-l border-white/10">
            <p className="text-[10px] md:text-xs font-mono text-white/60 tracking-wider">
              Find and attack other players — mug, ambush, rob, or put a hit on them.
              <br />Higher respect gives you an intimidation edge in combat.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-pink-500/40 to-transparent" />
            <Star size={10} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.5)]" fill="#f472b6" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-pink-500/40 to-transparent" />
          </div>
        </div>
      </div>
      <div className="shadow-[inset_0_20px_20px_-12px_rgba(0,0,0,0.7)] border-t border-pink-500/15">
        <div className="max-w-5xl mx-auto px-4 py-6">

      {/* Search */}
      <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-3.5 mb-4 reveal reveal-delay-1">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-black/30 border border-white/5 rounded-sm pl-9 pr-3 py-2 text-sm font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-pink-400/30 focus:shadow-[0_0_8px_rgba(236,72,153,0.08)] transition-all"
            placeholder="Search players by name..."
            autoFocus
          />
        </div>

        {searching && (
          <div className="mt-2 text-xs font-mono text-white/30">Searching...</div>
        )}

        {searchResults.length > 0 && (
          <div className="mt-3 space-y-0.5">
            {searchResults.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectTarget(p.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-sm bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Skull size={14} className="text-white/20" />
                  <span className="font-mono text-xs text-white/80">{p.username}</span>
                </div>
                <span className="text-xs font-mono text-white/30">Lv.{p.level}</span>
              </button>
            ))}
          </div>
        )}

        {query.length >= 2 && !searching && searchResults.length === 0 && (
          <p className="mt-2 text-xs font-mono text-white/20">No players found</p>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-red-400/25 bg-red-500/[0.04] p-3.5">
          <p className="text-xs font-mono text-red-300">{error}</p>
        </div>
      )}

      {/* Intel */}
      {loadingIntel && (
        <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4 text-center">
          <p className="text-xs font-mono text-white/30">Gathering intel...</p>
        </div>
      )}

      {selectedTarget && !loadingIntel && !result && !hackResult && (
        <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4 animate-slide-in reveal">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-mono text-sm tracking-wider text-white/90">{selectedTarget.username}</h2>
              <p className="text-xs font-mono text-white/30">Level {selectedTarget.level}</p>
              {selectedTarget.yourRespect !== undefined && selectedTarget.targetRespect !== undefined && (
                <div className="flex items-center gap-1.5 mt-1">
                  <TrendingUp size={10} className="text-cyan-400/50" />
                  <span className="text-[10px] font-mono text-white/25">
                    Respect: {selectedTarget.yourRespect} vs {selectedTarget.targetRespect}
                  </span>
                  {selectedTarget.respectModifier && selectedTarget.respectModifier !== 1 && (
                    <span className={`text-[10px] font-mono ${selectedTarget.respectModifier > 1 ? 'text-pink-400/60' : 'text-cyan-400/60'}`}>
                      ({selectedTarget.respectModifier > 1 ? '+' : ''}{Math.round((selectedTarget.respectModifier - 1) * 100)}% modifier)
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className={`text-right ${threatColor(selectedTarget.threat)}`}>
              <p className="text-lg font-mono font-bold">{selectedTarget.estimatedWinChance}%</p>
              <p className="text-[11px] font-mono uppercase tracking-wider text-white/30">win chance</p>
              <p className="text-xs font-mono">{selectedTarget.threat}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleAttack("spy")}
              disabled={attacking}
              className="font-mono tracking-wider text-xs uppercase text-purple-400/70 hover:text-purple-300 border border-purple-400/20 hover:border-purple-400/40 rounded-sm px-4 py-2 transition-all duration-150 hover:shadow-[0_0_12px_rgba(147,51,234,0.1)] flex items-center justify-center gap-2 col-span-2"
            >
              <Search size={13} /> Spy (2t) — gather intel
            </button>
            <button
              onClick={() => handleAttack("mug")}
              disabled={attacking}
              className="font-mono tracking-wider text-xs uppercase text-pink-400/70 hover:text-pink-300 border border-pink-400/20 hover:border-pink-400/40 rounded-sm px-4 py-2 transition-all duration-150 hover:shadow-[0_0_12px_rgba(236,72,153,0.1)] flex items-center justify-center gap-2"
            >
              <Crosshair size={13} /> Mug (5t)
            </button>
            <button
              onClick={() => handleAttack("ambush")}
              disabled={attacking}
              className="font-mono tracking-wider text-xs uppercase text-cyan-400/70 hover:text-cyan-300 border border-cyan-400/20 hover:border-cyan-400/40 rounded-sm px-4 py-2 transition-all duration-150 hover:shadow-[0_0_12px_rgba(34,211,238,0.1)] flex items-center justify-center gap-2"
            >
              <Shield size={13} /> Ambush (8t)
            </button>
            <button
              onClick={() => handleAttack("rob")}
              disabled={attacking}
              className="font-mono tracking-wider text-xs uppercase text-pink-400/70 hover:text-pink-300 border border-pink-400/20 hover:border-pink-400/40 rounded-sm px-4 py-2 transition-all duration-150 hover:shadow-[0_0_12px_rgba(236,72,153,0.1)] flex items-center justify-center gap-2"
            >
              <Swords size={13} /> Rob (8t)
            </button>
            <button
              onClick={() => handleAttack("hit")}
              disabled={attacking}
              className="font-mono tracking-wider text-xs uppercase text-cyan-400/70 hover:text-cyan-300 border border-cyan-400/20 hover:border-cyan-400/40 rounded-sm px-4 py-2 transition-all duration-150 hover:shadow-[0_0_12px_rgba(34,211,238,0.1)] flex items-center justify-center gap-2"
            >
              <Skull size={13} /> Hit (10t)
            </button>
            {user?.specialization === "enforcer" && (
              <button
                onClick={() => handleAttack("shakedown")}
                disabled={attacking}
                className="font-mono tracking-wider text-xs uppercase text-red-400/70 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 rounded-sm px-4 py-2 transition-all duration-150 hover:shadow-[0_0_12px_rgba(239,68,68,0.1)] flex items-center justify-center gap-2"
              >
                <Swords size={13} /> Shakedown (12t)
              </button>
            )}
            {user?.specialization === "hacker" && (
              <button
                onClick={handleHack}
                disabled={attacking}
                className="font-mono tracking-wider text-xs uppercase text-purple-400/70 hover:text-purple-300 border border-purple-400/20 hover:border-purple-400/40 rounded-sm px-4 py-2 transition-all duration-150 hover:shadow-[0_0_12px_rgba(147,51,234,0.1)] flex items-center justify-center gap-2"
              >
                <Terminal size={13} /> Data Heist (15t)
              </button>
            )}
            <button
              onClick={() => handleAttack("house_raid")}
              disabled={attacking}
              className="font-mono tracking-wider text-xs uppercase text-orange-400/70 hover:text-orange-300 border border-orange-400/20 hover:border-orange-400/40 rounded-sm px-4 py-2 transition-all duration-150 hover:shadow-[0_0_12px_rgba(251,146,60,0.1)] flex items-center justify-center gap-2 col-span-2"
            >
              <Swords size={13} /> House Raid (15t) — high risk, high reward
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-sm border p-4 animate-slide-in ${result.attackerWin ? "border-pink-500/25 bg-pink-500/[0.04]" : "border-cyan-500/25 bg-cyan-500/[0.04]"}`}>
          <div className="flex items-center gap-3 mb-4">
            {result.attackerWin ? (
              <Swords size={24} className="text-pink-400" />
            ) : (
              <AlertTriangle size={24} className="text-cyan-400" />
            )}
            <div>
              <p className={`font-mono text-sm tracking-wider ${result.attackerWin ? "text-pink-300" : "text-cyan-300"}`}>
                {result.attackerWin ? "> VICTORY" : "> DEFEATED"}
                {result.isCrit && <span className="ml-2 text-yellow-300 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]">CRITICAL HIT!</span>}
              </p>
              <p className="text-xs font-mono text-white/30">
                {result.attackType} on {result.targetUsername}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-black/20 rounded-sm p-3 text-center">
              <p className="text-[11px] font-mono uppercase tracking-wider text-white/30">Damage Dealt</p>
              <p className="font-mono text-sm text-pink-300 drop-shadow-[0_0_4px_rgba(236,72,153,0.2)]">{result.damageDealt}</p>
            </div>
            <div className="bg-black/20 rounded-sm p-3 text-center">
              <p className="text-[11px] font-mono uppercase tracking-wider text-white/30">Damage Taken</p>
              <p className={`font-mono text-sm ${result.attackerWin ? "text-white/80" : "text-cyan-300"} drop-shadow-[0_0_4px_rgba(34,211,238,0.15)]`}>
                {result.damageTaken}
              </p>
            </div>
            <div className="bg-black/20 rounded-sm p-3 text-center">
              <p className="text-[11px] font-mono uppercase tracking-wider text-white/30">Loot</p>
              <p className="font-mono text-sm text-pink-300 drop-shadow-[0_0_4px_rgba(236,72,153,0.2)]">${result.lootCash}</p>
            </div>
            <div className="bg-black/20 rounded-sm p-3 text-center">
              <p className="text-[11px] font-mono uppercase tracking-wider text-white/30">Respect</p>
              <p className={`font-mono text-sm ${result.respectChange >= 0 ? "text-pink-300" : "text-cyan-300"} drop-shadow-[0_0_4px_rgba(236,72,153,0.2)]`}>
                {result.respectChange >= 0 ? "+" : ""}{result.respectChange}
              </p>
            </div>
          </div>

          {result.attackType === "spy" && result.targetCash !== undefined && (
            <div className="mt-3 bg-purple-500/10 text-purple-300 text-xs font-mono rounded-sm px-3 py-2 border border-purple-500/20 space-y-1">
              <p className="uppercase tracking-wider text-white/40 mb-1">Intel Report</p>
              <p>Cash: ${result.targetCash}  |  HP: {result.targetHp}/{result.targetMaxHp}</p>
              <p>Stats: {result.targetStats?.strength} str, {result.targetStats?.agility} agi, {result.targetStats?.intelligence} int, {result.targetStats?.charisma} cha, {result.targetStats?.endurance} end</p>
              <p>Equipment: {result.targetEquipment || "none"}  |  Footmen: {result.targetFootmenCount}</p>
            </div>
          )}

          {result.itemStolen && (
            <div className="mt-3 bg-orange-500/10 text-orange-300 text-xs font-mono rounded-sm px-3 py-2 flex items-center gap-2 border border-orange-500/20">
              <Swords size={12} />
              Stole {result.itemStolen.quantity}x {result.itemStolen.name}!
            </div>
          )}

          {result.usingRetaliation && (
            <div className="mt-3 bg-yellow-500/10 text-yellow-300 text-xs font-mono rounded-sm px-3 py-2 flex items-center gap-2 border border-yellow-500/20">
              <Zap size={12} />
              Revenge attack — no turns used!
            </div>
          )}

          {result.respectModifier !== undefined && result.respectModifier !== 1 && (
            <div className="mt-1 bg-cyan-500/5 text-cyan-300/60 text-[10px] font-mono rounded-sm px-3 py-1.5 flex items-center gap-2 border border-cyan-500/10">
              <TrendingUp size={10} />
              Respect intimidation: {result.respectModifier > 1 ? '+' : ''}{Math.round((result.respectModifier - 1) * 100)}% combat modifier
            </div>
          )}

          {result.hospitalized && (
            <div className="mt-3 bg-cyan-500/10 text-cyan-300 text-xs font-mono rounded-sm px-3 py-2 flex items-center gap-2 border border-cyan-500/20">
              <AlertTriangle size={12} />
              {result.attackerWin
                ? `${result.targetUsername} was hospitalized!`
                : "You were hospitalized!"}
            </div>
          )}

          <button
            onClick={() => { setSelectedTarget(null); setResult(null); setQuery(""); setSearchResults([]); }}
            className="w-full mt-3 font-mono tracking-wider text-xs uppercase text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 rounded-sm px-4 py-2 transition-all duration-150"
          >
            New Attack
          </button>
        </div>
      )}

      {/* Hack Result */}
      {hackResult && (
        <div className={`rounded-sm border p-4 animate-slide-in ${hackResult.success ? "border-purple-500/25 bg-purple-500/[0.04]" : "border-cyan-500/25 bg-cyan-500/[0.04]"}`}>
          <div className="flex items-center gap-3 mb-4">
            <Terminal size={24} className={hackResult.success ? "text-purple-400" : "text-cyan-400"} />
            <div>
              <p className={`font-mono text-sm tracking-wider ${hackResult.success ? "text-purple-300" : "text-cyan-300"}`}>
                {hackResult.success ? "> DATA BREACH SUCCESSFUL" : "> INTRUSION DETECTED"}
              </p>
              <p className="text-xs font-mono text-white/30">
                Target: {hackResult.targetUsername}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="bg-black/20 rounded-sm p-3 text-center">
              <p className="text-[11px] font-mono uppercase tracking-wider text-white/30">Status</p>
              <p className={`font-mono text-sm ${hackResult.success ? "text-purple-300" : "text-cyan-300"}`}>
                {hackResult.success ? "Data acquired" : "Failed"}
              </p>
            </div>
            {hackResult.success && (
              <div className="bg-black/20 rounded-sm p-3 text-center">
                <p className="text-[11px] font-mono uppercase tracking-wider text-white/30">Respect Stolen</p>
                <p className="font-mono text-sm text-purple-300 drop-shadow-[0_0_4px_rgba(147,51,234,0.2)]">
                  +{hackResult.respectStolen}
                </p>
              </div>
            )}
            <div className="bg-black/20 rounded-sm p-3 text-center">
              <p className="text-[11px] font-mono uppercase tracking-wider text-white/30">Turns Left</p>
              <p className="font-mono text-sm text-white/80">{hackResult.turnsLeft}</p>
            </div>
          </div>

          <button
            onClick={() => { setSelectedTarget(null); setResult(null); setHackResult(null); setQuery(""); setSearchResults([]); }}
            className="w-full mt-3 font-mono tracking-wider text-xs uppercase text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 rounded-sm px-4 py-2 transition-all duration-150"
          >
            New Attack
          </button>
        </div>
      )}

      {/* Combat Log */}
      <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-3.5 reveal">
        <button
          onClick={() => setLogOpen(!logOpen)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-white/30" />
            <span className="font-mono text-xs tracking-wider text-white/50 uppercase">Combat Log</span>
          </div>
          {logOpen ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
        </button>

        {logOpen && (
          <div className="mt-3 space-y-1">
            {loadingLog && <p className="text-xs font-mono text-white/20 text-center py-3">Loading...</p>}
            {!loadingLog && combatLog.length === 0 && (
              <p className="text-xs font-mono text-white/20 text-center py-3">No fights yet</p>
            )}
            {combatLog.map((fight) => {
              const iWon = (fight.attackerId === user?.id) === fight.attackerWin;
              return (
                <div
                  key={fight.id}
                  className={`rounded-sm px-3 py-2 border text-xs font-mono ${
                    iWon
                      ? "bg-pink-500/[0.03] border-pink-500/10"
                      : "bg-cyan-500/[0.03] border-cyan-500/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={iWon ? "text-pink-400/80" : "text-cyan-400/80"}>
                      {iWon ? "WON" : "LOST"} {fight.attackType.toUpperCase()}
                    </span>
                    <span className="text-white/20 text-[10px]">{timeAgo(fight.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/40 text-[11px]">
                    <span className={fight.attackerId === user?.id ? "text-white/60" : ""}>{fight.attackerUsername}</span>
                    <span className="text-white/20">vs</span>
                    <span className={fight.defenderId === user?.id ? "text-white/60" : ""}>{fight.defenderUsername}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px]">
                    <span className="text-white/25">DMG: <span className="text-pink-300/60">{fight.damageDealt}</span> / <span className="text-cyan-300/60">{fight.damageTaken}</span></span>
                    {fight.lootCash > 0 && <span className="text-pink-300/60">+${fight.lootCash}</span>}
                    {fight.respectChange !== 0 && (
                      <span className={fight.respectChange > 0 ? "text-pink-300/60" : "text-cyan-300/60"}>
                        {fight.respectChange > 0 ? "+" : ""}{fight.respectChange} rep
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
    </GameLayout>
  );
}
