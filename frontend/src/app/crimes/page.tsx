"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import GameLayout from "@/components/GameLayout";
import CrimeCard from "@/components/CrimeCard";
import SkillCrimeCard from "@/components/SkillCrimeCard";
import TimingGame from "@/components/TimingGame";
import PickpocketGame from "@/components/PickpocketGame";
import MastermindGame from "@/components/MastermindGame";
import TerminalHackGame from "@/components/TerminalHackGame";
import { crimes as crimesApi, skillCrimes as skillCrimesApi } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { Crime, SkillCrimeDefinition } from "@/types";
import { Swords, Zap, Trophy, Skull, Crosshair, Star } from "lucide-react";

type Tab = "crimes" | "skill-crimes";

export default function CrimesPage() {
  const { refreshUser } = useUser();
  const [tab, setTab] = useState<Tab>("crimes");

  // Regular crimes state
  const [crimes, setCrimes] = useState<Crime[]>([]);
  const [locked, setLocked] = useState<Crime[]>([]);
  const [turns, setTurns] = useState(0);
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState<number | null>(null);
  const [notif, setNotif] = useState<{ id: number; title: string; message: string; type: string; exiting?: boolean } | null>(null);
  const notifKey = useRef(0);

  // Skill crimes state
  const [skillCrimes, setSkillCrimes] = useState<SkillCrimeDefinition[]>([]);
  const [lockedSkillCrimes, setLockedSkillCrimes] = useState<SkillCrimeDefinition[]>([]);
  const [skillTurns, setSkillTurns] = useState(0);
  const [skillLoading, setSkillLoading] = useState(false);
  const [playing, setPlaying] = useState<SkillCrimeDefinition | null>(null);
  const [practicing, setPracticing] = useState<SkillCrimeDefinition | null>(null);
  const [crimeStats, setCrimeStats] = useState<{ totalCrimes: number; totalSuccesses: number; totalCash: number } | null>(null);

  // Auto-dismiss notification
  useEffect(() => {
    if (!notif) return;
    const t = setTimeout(() => setNotif((p) => p ? { ...p, exiting: true } : null), 2500);
    const t2 = setTimeout(() => setNotif(null), 2700);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [notif?.id]);

  useEffect(() => {
    loadCrimes();
  }, []);

  useEffect(() => {
    if (tab === "skill-crimes") loadSkillCrimes();
  }, [tab]);

  const loadCrimes = async () => {
    try {
      const data = await crimesApi.list();
      setCrimes(data.crimes);
      setLocked(data.locked);
      setTurns(data.turns);
      if (data.stats) setCrimeStats(data.stats);
    } catch (err) {
      console.error("Failed to load crimes", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSkillCrimes = async () => {
    setSkillLoading(true);
    try {
      const data = await skillCrimesApi.list();
      setSkillCrimes(data.crimes);
      setLockedSkillCrimes(data.locked);
      setSkillTurns(data.turns);
    } catch (err) {
      console.error("Failed to load skill crimes", err);
    } finally {
      setSkillLoading(false);
    }
  };

  const handleCommit = async (crimeId: number, times: number = 1) => {
    setCommitting(crimeId);
    setNotif(null);
    const crime = crimes.find((c) => c.id === crimeId);
    try {
      const res = await crimesApi.commit(crimeId, times);
      notifKey.current++;
      if (res.success || res.totalSuccesses > 0) {
        let msg = `+$${res.reward} cash, +${res.xpGained} XP`;
        if (res.totalFailures > 0) msg += ` | ${res.totalFailures} failed`;
        if (res.hpLost > 0) msg += ` | -${res.hpLost} HP`;
        if (res.totalArrests > 0) msg += ` | ARRESTED`;
        if (res.leveledUp) msg += ` | LEVEL UP! LV.${res.newLevel}`;
        setNotif({ id: notifKey.current, title: `${res.crimeName} x${res.totalSuccesses + res.totalFailures}`, message: msg, type: "success" });
      } else if (res.arrested) {
        setNotif({ id: notifKey.current, title: res.crimeName, message: "You got arrested!", type: "error" });
      } else {
        setNotif({ id: notifKey.current, title: res.crimeName, message: `Failed. Lost ${res.hpLost} HP.`, type: "error" });
      }
      loadCrimes();
      await refreshUser();
    } catch (err: any) {
      notifKey.current++;
      setNotif({ id: notifKey.current, title: "Error", message: err.message, type: "error" });
    } finally {
      setCommitting(null);
    }
  };

  const handlePlay = (crime: SkillCrimeDefinition) => {
    setPlaying(crime);
  };

  const handleTimingResult = async (accuracy: number) => {
    if (!playing) return;
    try {
      const res = await skillCrimesApi.attempt(playing.id, accuracy);
      notifKey.current++;
      const resultLabel = res.success ? "Success" : "Failed";
      setNotif({
        id: notifKey.current,
        title: `${res.crimeName} — ${res.result}`,
        message: res.success
          ? `+$${res.reward} cash, +${res.xpGained} XP (${res.accuracy}% accuracy)`
          : `Failed (${res.accuracy}% accuracy)`,
        type: res.success ? "success" : "error",
      });
      setPlaying(null);
      loadSkillCrimes();
      await refreshUser();
    } catch (err: any) {
      notifKey.current++;
      setNotif({ id: notifKey.current, title: "Error", message: err.message, type: "error" });
      setPlaying(null);
    }
  };

  const handlePractice = (crime: SkillCrimeDefinition) => {
    setPracticing(crime);
  };

  const handlePracticeResult = (accuracy: number) => {
    if (!practicing) return;
    notifKey.current++;
    setNotif({
      id: notifKey.current,
      title: `${practicing.name} — Practice`,
      message: accuracy >= 40
        ? `Pass! ${accuracy}% accuracy (would earn $${Math.floor(practicing.rewardMin + (practicing.rewardMax - practicing.rewardMin) * ((accuracy - 40) / 60)).toLocaleString()})`
        : `Failed (${accuracy}% accuracy — need 40% to pass)`,
      type: accuracy >= 40 ? "success" : "error",
    });
    setPracticing(null);
  };

  return (
    <GameLayout>
      {/* Hero Section */}
      <div className="relative mb-0 h-[180px] md:h-[260px]">

        <div
          className="absolute inset-0 z-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-cyan-500/5"
        />

        <Image
          src="/crimes.png?v=2"
          alt="Crimes"
          width={1897}
          height={829}
          className="w-full h-full max-h-[200px] md:max-h-[280px] object-cover object-bottom relative z-0"
          priority
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

        {/* Turns badge */}
        <div className="absolute top-3 right-3 md:top-4 md:right-6 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm border border-white/10 rounded-sm px-2.5 py-1.5">
          <Zap size={14} className="text-neon-yellow drop-shadow-[0_0_4px_rgba(250,204,21,0.3)]" />
          <span className="font-mono text-xs text-cyan-300">{tab === "skill-crimes" ? skillTurns : turns}</span>
          <span className="text-[10px] font-mono text-white/30">turns</span>
        </div>

        {/* Overlay title */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 md:px-6 pb-3 md:pb-4">
          <div className="flex items-center gap-2">
            <Swords size={18} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" />
            <h1 className="text-lg md:text-xl font-bold text-white drop-shadow-lg">Crimes</h1>
          </div>
          <div className="w-36 h-px bg-red-400/40 mt-1 mb-2" />
          <div className="bg-black/30 backdrop-blur-sm rounded-sm px-2 py-1.5 mb-1 -mx-1 border-t border-l border-white/10">
            <p className="text-[10px] md:text-xs font-mono text-white/60 tracking-wider">
              From street-level hustles to high-stakes heists — use your turns to earn cash and XP.
              <br />Higher stats improve your success chance. Some crimes require a minimum level.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
            <Star size={10} className="text-red-400 drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]" fill="#f87171" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="shadow-[inset_0_20px_20px_-12px_rgba(0,0,0,0.7)] border-t border-purple-500/15">
        <div className="max-w-5xl mx-auto px-4 py-6">
        {crimeStats && (
          <div className="flex items-center gap-3 mb-5 text-[10px] md:text-[11px] font-mono text-white/40">
            <span>Total crimes: <span className="text-white/70">{crimeStats.totalCrimes}</span></span>
            <span className="text-white/20">|</span>
            <span>Success rate: <span className="text-emerald-400/70">{crimeStats.totalCrimes > 0 ? Math.round(crimeStats.totalSuccesses / crimeStats.totalCrimes * 100) : 0}%</span></span>
            <span className="text-white/20 hidden sm:inline">|</span>
            <span className="hidden sm:inline">Earned: <span className="text-cyan-300/70">${crimeStats.totalCash.toLocaleString()}</span></span>
          </div>
        )}
        {/* Top notification overlay — portaled to body */}
        {notif && createPortal(
          <div
            className={`fixed top-0 left-0 right-0 z-[200] h-12 flex items-center justify-center gap-3 px-4 font-mono text-xs tracking-wider backdrop-blur-xl border-b ${
              notif.exiting ? "animate-slide-up-out" : "animate-slide-in"
            } ${
              notif.type === "error" ? "bg-red-500/8 text-red-300 border-red-500/15" :
              notif.type === "strength" ? "bg-rose-500/8 text-rose-300 border-rose-500/15" :
              notif.type === "agility" ? "bg-emerald-500/8 text-emerald-300 border-emerald-500/15" :
              notif.type === "intelligence" ? "bg-violet-500/8 text-violet-300 border-violet-500/15" :
              notif.type === "charisma" ? "bg-amber-500/8 text-amber-300 border-amber-500/15" :
              notif.type === "endurance" ? "bg-cyan-500/8 text-cyan-300 border-cyan-500/15" :
              "bg-emerald-500/8 text-emerald-300 border-emerald-500/15"
            }`}
          >
            {notif.type === "error" ? (
              <Skull size={14} className="text-red-300" />
            ) : (
              <Trophy size={14} className={`
                ${notif.type === "strength" ? "text-rose-300" :
                  notif.type === "agility" ? "text-emerald-300" :
                  notif.type === "intelligence" ? "text-violet-300" :
                  notif.type === "charisma" ? "text-amber-300" :
                  notif.type === "endurance" ? "text-cyan-300" :
                  "text-emerald-300"}
              `} />
            )}
            <span className="font-semibold">{notif.title}</span>
            <span className="opacity-40 mx-0.5">—</span>
            <span className="opacity-70">{notif.message}</span>
          </div>,
          document.body
        )}

        {/* Game modals — dispatch by crime ID */}
        {(playing || practicing) && (() => {
          const crime = playing ?? practicing!;
          const difficultyBonus = (crime.statValue / 10) + crime.skillLevel;
          const props = {
            speed: crime.timingSpeed,
            rewardMin: crime.rewardMin,
            rewardMax: crime.rewardMax,
            crimeName: crime.name,
            onResult: practicing ? handlePracticeResult : handleTimingResult,
            onClose: () => { setPlaying(null); setPracticing(null); },
            difficultyBonus,
          };
          switch (crime.id) {
            case 1: return <TimingGame {...props} />;
            case 2: return <PickpocketGame {...props} />;
            case 3: return <MastermindGame {...props} />;
            case 4: return <TerminalHackGame {...props} />;
            default: return null;
          }
        })()}

        {/* Tab bar */}
        <div className="flex gap-1 mb-4 border-b border-white/5">
          <button
            onClick={() => setTab("crimes")}
            className={`px-4 py-2 text-[11px] font-mono tracking-wider uppercase transition-colors border-b-2 ${
              tab === "crimes"
                ? "text-pink-400 border-pink-400/60"
                : "text-white/30 border-transparent hover:text-white/50"
            }`}
          >
            <Swords size={12} className="inline mr-1.5 -mt-0.5" />
            Crimes
          </button>
          <button
            onClick={() => setTab("skill-crimes")}
            className={`px-4 py-2 text-[11px] font-mono tracking-wider uppercase transition-colors border-b-2 ${
              tab === "skill-crimes"
                ? "text-cyan-400 border-cyan-400/60"
                : "text-white/30 border-transparent hover:text-white/50"
            }`}
          >
            <Crosshair size={12} className="inline mr-1.5 -mt-0.5" />
            Skill Crimes
          </button>
        </div>

        {/* Crimes Tab */}
        {tab === "crimes" && (
          loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-400/30 border-t-pink-400" />
            </div>
          ) : (
            <div className="space-y-2.5 reveal reveal-delay-1">
              {crimes.map((crime) => (
                <CrimeCard
                  key={crime.id}
                  crime={crime}
                  onCommit={handleCommit}
                  disabled={committing !== null}
                  loading={committing === crime.id}
                  turnsRemaining={turns}
                />
              ))}

              {locked.length > 0 && (
                <>
                  <h2 className="text-[11px] font-mono text-white/20 uppercase tracking-wider pt-5 pb-2">
                    Locked &mdash; Level too low
                  </h2>
                  {locked.map((crime) => (
                    <CrimeCard
                      key={crime.id}
                      crime={crime}
                      onCommit={() => {}}
                      disabled
                    />
                  ))}
                </>
              )}
            </div>
          )
        )}

        {/* Skill Crimes Tab */}
        {tab === "skill-crimes" && (
          skillLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400/30 border-t-cyan-400" />
            </div>
          ) : (
            <div className="space-y-2.5 reveal reveal-delay-1">
              <p className="text-[11px] font-mono text-white/30 mb-3">
                Each skill crime requires a <span className="text-cyan-400">different approach</span>. Master them all for maximum rewards!
              </p>

              {skillCrimes.map((crime) => (
                <SkillCrimeCard
                  key={crime.id}
                  crime={crime}
                  onPlay={() => handlePlay(crime)}
                  onPractice={() => handlePractice(crime)}
                  disabled={playing !== null || practicing !== null}
                />
              ))}

              {lockedSkillCrimes.length > 0 && (
                <>
                  <h2 className="text-[11px] font-mono text-white/20 uppercase tracking-wider pt-5 pb-2">
                    Locked &mdash; Level too low
                  </h2>
                  {lockedSkillCrimes.map((crime) => (
                    <SkillCrimeCard
                      key={crime.id}
                      crime={crime}
                      onPlay={() => {}}
                      disabled
                      locked
                    />
                  ))}
                </>
              )}
            </div>
          )
        )}
        </div>
      </div>
    </GameLayout>
  );
}
