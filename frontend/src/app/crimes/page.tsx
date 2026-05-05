"use client";

import { useEffect, useState } from "react";
import GameLayout from "@/components/GameLayout";
import CrimeCard from "@/components/CrimeCard";
import { crimes as crimesApi } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { useToast } from "@/components/Toast";
import { Crime, CrimeResult } from "@/types";
import { Swords, Skull, Trophy, Zap } from "lucide-react";

export default function CrimesPage() {
  const { refreshUser } = useUser();
  const { toast } = useToast();
  const [crimes, setCrimes] = useState<Crime[]>([]);
  const [locked, setLocked] = useState<Crime[]>([]);
  const [turns, setTurns] = useState(0);
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState<number | null>(null);
  const [result, setResult] = useState<CrimeResult | null>(null);

  useEffect(() => {
    loadCrimes();
  }, []);

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

  const handleCommit = async (crimeId: number) => {
    setCommitting(crimeId);
    setResult(null);
    try {
      const res = await crimesApi.commit(crimeId);
      setResult(res);
      loadCrimes();
      await refreshUser();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setCommitting(null);
    }
  };

  return (
    <GameLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5 reveal">
        <div>
          <h1 className="text-lg font-mono tracking-wider text-white/90 flex items-center gap-2 uppercase">
            <Swords size={16} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" /> Crimes
          </h1>
          <p className="text-xs font-mono text-white/30 tracking-wider mt-1">Choose your next hustle</p>
        </div>
        <div className="flex items-center gap-2 bg-bg-dark/80 border border-white/5 rounded-sm px-3 py-1.5">
          <Zap size={13} className="text-neon-yellow" />
          <span className="font-mono text-xs text-white/90">{turns}</span>
          <span className="text-xs font-mono text-white/30">turns</span>
        </div>
      </div>

      {/* Result banner */}
      {result && (
        <div className={`mb-5 animate-slide-in rounded-sm border p-4 ${result.success ? "border-pink-500/25 bg-pink-500/[0.04]" : "border-cyan-500/25 bg-cyan-500/[0.04]"}`}>
          <div className="flex items-center gap-3">
            {result.success ? <Trophy size={22} className="text-pink-400" /> : <Skull size={22} className="text-cyan-400" />}
            <div className="flex-1">
              <p className={`font-semibold text-sm font-mono tracking-wider ${result.success ? "text-pink-300" : "text-cyan-300"}`}>
                {result.success ? "> CRIME SUCCESSFUL" : "> CRIME FAILED"}
              </p>
              <p className="text-xs font-mono text-white/50 mt-0.5">
                {result.crimeName}
                {result.success
                  ? ` — +$${result.reward} cash, +${result.xpGained} XP`
                  : result.arrested
                  ? " — You got arrested!"
                  : ` — Lost ${result.hpLost} HP`}
              </p>
            </div>
            {result.leveledUp && (
              <div className="bg-gradient-to-r from-pink-500 to-cyan-400 text-white text-sm font-bold px-3 py-1.5 rounded-sm font-mono shadow-[0_0_12px_rgba(236,72,153,0.4)] animate-pulse">
                LV.{result.newLevel}!
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
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
      )}
      </div>
    </GameLayout>
    );
  }