"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import GameLayout from "@/components/GameLayout";
import CrimeCard from "@/components/CrimeCard";
import SkillCrimeCard from "@/components/SkillCrimeCard";
import TimingGame from "@/components/TimingGame";
import ShellGame from "@/components/ShellGame";
import MastermindGame from "@/components/MastermindGame";
import TerminalHackGame from "@/components/TerminalHackGame";
import { crimes as crimesApi, skillCrimes as skillCrimesApi } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { Crime, SkillCrimeDefinition } from "@/types";
import { Swords, Zap, Trophy, Skull, Crosshair } from "lucide-react";

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
        setNotif({ id: notifKey.current, title: `${res.crimeName} x${res.totalSuccesses + res.totalFailures}`, message: msg, type: crime?.statUsed ?? "success" as any });
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
        type: res.success ? (res.accuracy >= 80 ? "agility" : "success") : "error",
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

  return (
    <GameLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
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
        {playing && (() => {
          const difficultyBonus = (playing.statValue / 10) + playing.skillLevel;
          const props = {
            speed: playing.timingSpeed,
            rewardMin: playing.rewardMin,
            rewardMax: playing.rewardMax,
            crimeName: playing.name,
            onResult: handleTimingResult,
            onClose: () => setPlaying(null),
            difficultyBonus,
          };
          switch (playing.id) {
            case 1: return <TimingGame {...props} />;
            case 2: return <ShellGame {...props} />;
            case 3: return <MastermindGame {...props} />;
            case 4: return <TerminalHackGame {...props} />;
            default: return null;
          }
        })()}

        <div className="flex items-center justify-between mb-5 reveal">
          <div>
            <h1 className="text-lg font-mono tracking-wider text-white/90 flex items-center gap-2 uppercase">
              <Swords size={16} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" /> Crimes
            </h1>
            <p className="text-xs font-mono text-white/30 tracking-wider mt-1">Choose your next hustle</p>
          </div>
          <div className="flex items-center gap-2 bg-bg-dark/80 border border-white/5 rounded-sm px-3 py-1.5">
            <Zap size={13} className="text-neon-yellow" />
            <span className="font-mono text-xs text-white/90">{tab === "skill-crimes" ? skillTurns : turns}</span>
            <span className="text-xs font-mono text-white/30">turns</span>
          </div>
        </div>

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
                  disabled={playing !== null}
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
    </GameLayout>
  );
}
