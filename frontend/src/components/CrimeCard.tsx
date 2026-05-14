"use client";

import { useState } from "react";
import { Crime } from "@/types";
import {
  ShoppingBag,
  Skull,
  Car,
  Pill,
  Monitor,
  Shield,
  Building,
  Warehouse,
  Lock,
  Zap,
} from "lucide-react";

const crimeIcons: Record<string, React.ReactNode> = {
  Shoplifting: <ShoppingBag size={16} />,
  Mugging: <Skull size={16} />,
  "Street Racing": <Car size={16} />,
  "Drug Deal": <Pill size={16} />,
  "Hacking Job": <Monitor size={16} />,
  "Protection Racket": <Shield size={16} />,
  "Bank Robbery": <Building size={16} />,
  "Warehouse Heist": <Warehouse size={16} />,
};

const riskColors: Record<string, string> = {
  low: "text-pink-400",
  medium: "text-yellow-400",
  high: "text-cyan-400",
};

const statLabels: Record<string, string> = {
  strength: "STR",
  agility: "AGI",
  intelligence: "INT",
  charisma: "CHA",
};

interface CrimeCardProps {
  crime: Crime;
  onCommit: (id: number, times: number) => void;
  disabled?: boolean;
  loading?: boolean;
  turnsRemaining?: number;
}

export default function CrimeCard({ crime, onCommit, disabled, loading, turnsRemaining }: CrimeCardProps) {
  const isLocked = crime.successChance === 0;
  const maxTimes = Math.min(500, Math.floor((turnsRemaining ?? 0) / crime.turnCost) || 1);
  const [times, setTimes] = useState(1);

  const barColor =
    crime.successChance >= 70 ? "from-pink-500/60 to-pink-300/70" :
    crime.successChance >= 40 ? "from-yellow-500/60 to-yellow-300/70" :
    "from-cyan-500/60 to-cyan-300/70";

  const barGlow =
    crime.successChance >= 70 ? "rgba(236,72,153,0.3)" :
    crime.successChance >= 40 ? "rgba(250,204,21,0.3)" :
    "rgba(34,211,238,0.3)";

  const barTextColor =
    crime.successChance >= 70 ? "text-pink-300" :
    crime.successChance >= 40 ? "text-yellow-400" :
    "text-cyan-300";

  return (
    <div className={`rounded-sm border border-white/5 bg-bg-dark/80 animate-slide-in transition-all duration-150 hover:border-white/10 ${isLocked ? "opacity-40" : ""}`}>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-pink-400/60 shrink-0">{crimeIcons[crime.name] || <Skull size={16} />}</div>
            <div className="min-w-0">
              <h3 className="font-mono text-sm tracking-wider text-white/90">{crime.name}</h3>
              <p className="text-xs font-mono text-white/30 truncate">{crime.description}</p>
            </div>
          </div>

          {isLocked ? (
            <div className="flex items-center gap-1 text-white/20 text-xs font-mono whitespace-nowrap shrink-0">
              <Lock size={11} />
              <span>Lv.{crime.minLevel}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-0.5 select-none">
                <button
                  type="button"
                  onClick={() => setTimes(Math.max(1, times - 1))}
                  disabled={times <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-sm border border-white/10 text-white/40 hover:text-white/70 hover:border-white/30 transition-all text-lg disabled:opacity-20 active:bg-white/5"
                >
                  −
                </button>
                <span className="w-8 text-center text-xs font-mono text-white/70 tabular-nums">{times}</span>
                <button
                  type="button"
                  onClick={() => setTimes(Math.min(maxTimes, times + 1))}
                  disabled={times >= maxTimes}
                  className="w-8 h-8 flex items-center justify-center rounded-sm border border-white/10 text-white/40 hover:text-white/70 hover:border-white/30 transition-all text-lg disabled:opacity-20 active:bg-white/5"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => onCommit(crime.id, times)}
                disabled={disabled || loading}
                className="text-xs font-mono tracking-wider uppercase text-pink-400/70 hover:text-pink-300 border border-pink-400/20 hover:border-pink-400/40 rounded-sm px-3 py-1.5 transition-all duration-150 hover:shadow-[0_0_12px_rgba(236,72,153,0.1)] shrink-0"
              >
                {loading ? "..." : "Commit"}
              </button>
            </div>
          )}
        </div>

        {/* Success % bar */}
        {!isLocked && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className={barTextColor}>
                {crime.successChance}% {statLabels[crime.statUsed]}
              </span>
              <span className={riskColors[crime.riskLevel]}>{crime.riskLevel}</span>
            </div>
            <div className="w-full h-1 bg-black/30 rounded-full overflow-hidden shadow-[inset_0_0_4px_rgba(0,0,0,0.3)]">
              <div
                className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
                style={{ width: `${crime.successChance}%`, boxShadow: `0 0 6px ${barGlow}` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 mt-2.5 text-xs font-mono text-white/30">
          <span className="flex items-center gap-1">
            <Zap size={10} /> {crime.turnCost}t
          </span>
          <span>${crime.rewardMin.toLocaleString()}-{crime.rewardMax.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
