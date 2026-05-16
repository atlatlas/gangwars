"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { gangs as gangsApi } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { useTopNotification } from "@/components/TopNotification";
import { Swords, Crosshair, Trophy, Skull, RotateCw, Clock, Users, Shield, ArrowRight } from "lucide-react";

interface Countdown {
  raid: string | null;
  sabotage: string | null;
}

function formatTimeRemaining(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

interface GangConflictSectionProps {
  targetGangId: number;
  targetGangName: string;
  targetGangTag: string;
  targetGangLevel: number;
  isOwnGang: boolean;
  userGangId: number | undefined;
}

export default function GangConflictSection({
  targetGangId,
  targetGangName,
  targetGangTag,
  targetGangLevel,
  isOwnGang,
  userGangId,
}: GangConflictSectionProps) {
  const router = useRouter();
  const { user, refreshUser } = useUser();
  const { showNotification } = useTopNotification();

  const [attackStatus, setAttackStatus] = useState<any>(null);
  const [attackStatusLoading, setAttackStatusLoading] = useState(false);
  const [attackStatusError, setAttackStatusError] = useState<string | null>(null);
  const [attackResult, setAttackResult] = useState<any>(null);
  const [attacking, setAttacking] = useState<"raid" | "sabotage" | null>(null);
  const [attackHistory, setAttackHistory] = useState<any[]>([]);
  const [showAttackHistory, setShowAttackHistory] = useState(false);
  const [countdown, setCountdown] = useState<Countdown>({ raid: null, sabotage: null });

  const shouldLoad = !isOwnGang && !!userGangId;

  const loadAttackStatus = async () => {
    setAttackStatusLoading(true);
    setAttackStatusError(null);
    try {
      const data = await gangsApi.attack.status(targetGangId);
      setAttackStatus(data);
    } catch (err: any) {
      setAttackStatusError(err.message || "Failed to load attack info");
    } finally {
      setAttackStatusLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await gangsApi.attack.history(targetGangId);
      setAttackHistory(data);
    } catch {}
  };

  // Load attack status when viewing another gang
  useEffect(() => {
    if (shouldLoad) {
      loadAttackStatus();
    }
  }, [targetGangId, shouldLoad]);

  // Cooldown countdown timer
  useEffect(() => {
    if (!attackStatus) return;
    const tick = () => {
      setCountdown({
        raid: formatTimeRemaining(attackStatus.raidCooldown?.expiresAt),
        sabotage: formatTimeRemaining(attackStatus.sabotageCooldown?.expiresAt),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [attackStatus]);

  const handleRaid = async () => {
    setAttacking("raid");
    setAttackResult(null);
    try {
      const result = await gangsApi.attack.raid(targetGangId);
      setAttackResult(result);
      if (result.attackerWon) {
        showNotification(`Raid Victory! Stole $${result.lootVault.toLocaleString()}`, "success");
      } else {
        showNotification(`Raid failed! Lost $${(result.cost || 0).toLocaleString()}`, "error");
      }
      loadAttackStatus();
    } catch (err: any) {
      showNotification(err.message || "Raid failed", "error");
    } finally {
      setAttacking(null);
    }
  };

  const handleSabotage = async () => {
    setAttacking("sabotage");
    setAttackResult(null);
    try {
      const result = await gangsApi.attack.sabotage(targetGangId);
      setAttackResult(result);
      showNotification(`Sabotage successful! Rep reduced by ${result.reputationReduced}`, "success");
      loadAttackStatus();
    } catch (err: any) {
      showNotification(err.message || "Sabotage failed", "error");
    } finally {
      setAttacking(null);
    }
  };

  const toggleHistory = () => {
    const show = !showAttackHistory;
    setShowAttackHistory(show);
    if (show) loadHistory();
  };

  // ── Not in a gang ──
  if (!userGangId && !isOwnGang) {
    return (
      <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4 reveal">
        <div className="flex items-center gap-2 mb-3">
          <Swords size={14} className="text-white/20" />
          <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider">Gang Conflict</h2>
        </div>
        <p className="text-xs font-mono text-white/30">Join a gang to attack other gangs.</p>
        <button
          onClick={() => router.push("/gangs")}
          className="mt-3 text-xs font-mono text-purple-400/60 hover:text-purple-300 transition-colors"
        >
          View Gangs &rarr;
        </button>
      </div>
    );
  }

  // ── Own gang ──
  if (isOwnGang) {
    return (
      <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4 reveal">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} className="text-white/20" />
          <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider">Gang Conflict</h2>
        </div>
        <p className="text-xs font-mono text-white/30 mb-3">
          This is your gang&apos;s headquarters. You cannot attack your own operation.
        </p>
        <button
          onClick={toggleHistory}
          className="text-xs font-mono text-purple-400/60 hover:text-purple-300 transition-colors"
        >
          {showAttackHistory ? "Hide Attack History" : "View Attack History"}
        </button>

        {showAttackHistory && (
          <div className="mt-3 border-t border-white/5 pt-3">
            {attackHistory.length === 0 ? (
              <p className="text-xs font-mono text-white/20">No attacks yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {attackHistory.map((a: any) => (
                  <div key={a.id} className="bg-black/20 rounded-sm border border-white/5 p-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className={a.attackerWon ? "text-green-400" : "text-red-400"}>
                        {a.attackType.toUpperCase()}
                      </span>
                      <span className="text-white/50">
                        [{a.attackerGangTag}] {a.attackerGangName}
                      </span>
                      <span className="text-white/20">&rarr;</span>
                      <span className="text-white/50">
                        [{a.defenderGangTag}] {a.defenderGangName}
                      </span>
                    </div>
                    <div className="text-white/30 mt-1">
                      {a.attackerWon ? "Attacker won" : "Defender won"} &middot;
                      Power {a.attackerPower} vs {a.defenderPower}
                      {a.lootVault > 0 && <span className="text-green-400"> &middot; Stolen ${a.lootVault.toLocaleString()}</span>}
                    </div>
                    <div className="text-white/20 text-[10px]">{new Date(a.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Loading ──
  if (attackStatusLoading) {
    return (
      <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4 reveal">
        <div className="flex items-center gap-2 mb-3">
          <Swords size={14} className="text-white/20" />
          <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider">Gang Conflict</h2>
        </div>
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin h-5 w-5 border-2 border-pink-400/30 border-t-pink-400 rounded-full" />
        </div>
      </div>
    );
  }

  // ── Error ──
  if (attackStatusError) {
    return (
      <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4 reveal">
        <div className="flex items-center gap-2 mb-3">
          <Swords size={14} className="text-white/20" />
          <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider">Gang Conflict</h2>
        </div>
        <div className="rounded-sm border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-xs font-mono text-red-400/80">{attackStatusError}</p>
        </div>
        <button
          onClick={loadAttackStatus}
          className="mt-3 text-xs font-mono text-purple-400/60 hover:text-purple-300 transition-colors flex items-center gap-1"
        >
          <RotateCw size={10} /> Retry
        </button>
      </div>
    );
  }

  // ── No status (shouldn't happen but handle it) ──
  if (!attackStatus) {
    return null;
  }

  // ── Loaded: Full Conflict Dashboard ──
  const diff = attackStatus.myPower - attackStatus.effectiveDefenderPower;
  const diffAbs = Math.abs(diff);
  const ahead = diff > 0;

  return (
    <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4 reveal">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Swords size={14} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" />
        <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider">Gang Conflict</h2>
      </div>

      {/* Power Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 items-start">
        {/* Your Gang */}
        <div className="bg-black/20 rounded-sm border border-white/5 p-3">
          <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-2">Your Gang</p>
          <p className="font-mono text-lg text-cyan-300">{attackStatus.myPower.toLocaleString()}</p>
          <p className="text-[10px] font-mono text-white/30 mt-1">
            {attackStatus.myMemberCount} members &middot; Lv.{attackStatus.myLevel}
          </p>
        </div>

        {/* VS */}
        <div className="flex items-center justify-center py-2">
          <span className="font-mono text-2xl text-pink-400/60 drop-shadow-[0_0_6px_rgba(236,72,153,0.2)]">VS</span>
        </div>

        {/* Defender */}
        <div className="bg-black/20 rounded-sm border border-white/5 p-3">
          <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-2">
            [{targetGangTag}] {targetGangName}
          </p>
          <p className="font-mono text-lg text-white/80">{attackStatus.effectiveDefenderPower.toLocaleString()}</p>
          <p className="text-[10px] font-mono text-white/30 mt-1">
            {attackStatus.targetMemberCount} members &middot; Lv.{attackStatus.targetLevel}
          </p>
          {attackStatus.targetArsenalBonus > 0 && (
            <p className="text-[10px] font-mono text-orange-400/60 mt-0.5">Arsenal bonus: +{attackStatus.targetArsenalBonus}</p>
          )}
          {attackStatus.targetLevelMultiplier !== 1 && (
            <p className="text-[10px] font-mono text-purple-400/60 mt-0.5">Level multiplier: x{attackStatus.targetLevelMultiplier.toFixed(2)}</p>
          )}
          <p className="text-[10px] font-mono text-yellow-400/60 mt-0.5">Vault: ${attackStatus.targetVault?.toLocaleString() ?? 0}</p>
        </div>
      </div>

      {/* Power difference */}
      <div className={`rounded-sm border p-2 mb-4 text-center text-xs font-mono ${
        ahead ? "border-green-500/20 bg-green-500/5 text-green-400/80" : "border-red-500/20 bg-red-500/5 text-red-400/80"
      }`}>
        {ahead
          ? `Your gang is ${diffAbs.toLocaleString()} power points AHEAD`
          : `Your gang is ${diffAbs.toLocaleString()} power points BEHIND`
        }
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* Raid */}
        <div className="bg-black/20 rounded-sm border border-red-500/15 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Swords size={12} className="text-red-400" />
            <span className="text-xs font-mono text-red-400/80 uppercase tracking-wider">Raid</span>
          </div>
          <div className="space-y-1 text-[10px] font-mono text-white/30 mb-3">
            <p>Cost: 10 turns</p>
            <p>Steal 5-15% of target vault</p>
            <p>24h cooldown</p>
          </div>
          <button
            onClick={handleRaid}
            disabled={!!attacking || !!countdown.raid}
            className="w-full font-mono tracking-wider text-xs uppercase text-red-400/70 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 rounded-sm px-3 py-1.5 transition-all duration-150 flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {attacking === "raid" ? (
              <div className="animate-spin h-3 w-3 border-2 border-red-400/30 border-t-red-400 rounded-full" />
            ) : countdown.raid ? (
              <><Clock size={10} /> {countdown.raid}</>
            ) : (
              <><Swords size={10} /> Launch Raid</>
            )}
          </button>
        </div>

        {/* Sabotage */}
        <div className="bg-black/20 rounded-sm border border-orange-500/15 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Crosshair size={12} className="text-orange-400" />
            <span className="text-xs font-mono text-orange-400/80 uppercase tracking-wider">Sabotage</span>
          </div>
          <div className="space-y-1 text-[10px] font-mono text-white/30 mb-3">
            <p>Cost: ${(50000 + targetGangLevel * 10000).toLocaleString()} from vault</p>
            <p>Reduce reputation by 5-15%</p>
            <p>12h cooldown</p>
          </div>
          <button
            onClick={handleSabotage}
            disabled={!!attacking || !!countdown.sabotage}
            className="w-full font-mono tracking-wider text-xs uppercase text-orange-400/70 hover:text-orange-300 border border-orange-400/20 hover:border-orange-400/40 rounded-sm px-3 py-1.5 transition-all duration-150 flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {attacking === "sabotage" ? (
              <div className="animate-spin h-3 w-3 border-2 border-orange-400/30 border-t-orange-400 rounded-full" />
            ) : countdown.sabotage ? (
              <><Clock size={10} /> {countdown.sabotage}</>
            ) : (
              <><Crosshair size={10} /> Launch Sabotage</>
            )}
          </button>
        </div>
      </div>

      {/* Attack Result */}
      {attackResult && (
        <div className={`rounded-sm border p-3 mb-4 animate-slide-in ${
          attackResult.attackerWon
            ? "border-green-500/30 bg-green-500/5"
            : "border-red-500/30 bg-red-500/5"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {attackResult.attackerWon ? (
              <Trophy size={14} className="text-green-400" />
            ) : (
              <Skull size={14} className="text-red-400" />
            )}
            <span className={`font-mono text-xs uppercase tracking-wider ${
              attackResult.attackerWon ? "text-green-400" : "text-red-400"
            }`}>
              {attackResult.attackerWon ? "Victory!" : "Defeat!"}
            </span>
          </div>
          <div className="space-y-1 text-xs font-mono text-white/50">
            {attackResult.lootVault > 0 && (
              <p>Stolen: <span className="text-green-400">${attackResult.lootVault.toLocaleString()}</span></p>
            )}
            {attackResult.cost > 0 && (
              <p>Lost: <span className="text-red-400">${attackResult.cost.toLocaleString()}</span></p>
            )}
            {attackResult.attackerRepChange !== undefined && (
              <p>Rep: <span className={attackResult.attackerRepChange >= 0 ? "text-green-400" : "text-red-400"}>
                {attackResult.attackerRepChange >= 0 ? "+" : ""}{attackResult.attackerRepChange}
              </span></p>
            )}
            {attackResult.defenderRepChange !== undefined && (
              <p>Defender Rep: <span className={attackResult.defenderRepChange >= 0 ? "text-green-400" : "text-red-400"}>
                {attackResult.defenderRepChange >= 0 ? "+" : ""}{attackResult.defenderRepChange}
              </span></p>
            )}
            <p className="text-[10px] text-white/20">Power: {attackResult.attackerPower} vs {attackResult.defenderPower}</p>
          </div>
        </div>
      )}

      {/* Attack History Toggle */}
      <button
        onClick={toggleHistory}
        className="text-xs font-mono text-purple-400/60 hover:text-purple-300 transition-colors"
      >
        {showAttackHistory ? "Hide Attack History" : "View Attack History"}
      </button>

      {showAttackHistory && (
        <div className="mt-3 border-t border-white/5 pt-3">
          {attackHistory.length === 0 ? (
            <p className="text-xs font-mono text-white/20">No attacks yet</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {attackHistory.map((a: any) => (
                <div key={a.id} className="bg-black/20 rounded-sm border border-white/5 p-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className={a.attackerWon ? "text-green-400" : "text-red-400"}>
                      {a.attackType.toUpperCase()}
                    </span>
                    <span className="text-white/50">
                      [{a.attackerGangTag}] {a.attackerGangName}
                    </span>
                    <span className="text-white/20">&rarr;</span>
                    <span className="text-white/50">
                      [{a.defenderGangTag}] {a.defenderGangName}
                    </span>
                  </div>
                  <div className="text-white/30 mt-1">
                    {a.attackerWon ? "Attacker won" : "Defender won"} &middot;
                    Power {a.attackerPower} vs {a.defenderPower}
                    {a.lootVault > 0 && <span className="text-green-400"> &middot; Stolen ${a.lootVault.toLocaleString()}</span>}
                  </div>
                  <div className="text-white/20 text-[10px]">{new Date(a.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
