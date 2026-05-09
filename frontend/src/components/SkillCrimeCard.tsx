"use client";

import { SkillCrimeDefinition } from "@/types";
import { Crosshair, Zap, Lock, Star } from "lucide-react";

interface Props {
  crime: SkillCrimeDefinition;
  onPlay: () => void;
  disabled?: boolean;
  locked?: boolean;
}

export default function SkillCrimeCard({ crime, onPlay, disabled, locked }: Props) {
  // Difficulty display based on timingSpeed
  const difficulty = crime.timingSpeed <= 1.2 ? "Easy" : crime.timingSpeed <= 2.0 ? "Medium" : "Hard";
  const difficultyColor = difficulty === "Easy" ? "text-emerald-400" : difficulty === "Medium" ? "text-amber-400" : "text-red-400";

  return (
    <div className={`relative group bg-bg-card/40 border border-white/5 rounded-sm px-4 py-3 transition-all duration-200 hover:bg-bg-card/60 ${locked ? "opacity-40" : ""}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-sm bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/10">
            <Crosshair size={14} className="text-cyan-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-mono text-white/90 truncate">{crime.name}</h3>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm border ${difficultyColor} border-current/20`}>
                {difficulty}
              </span>
              {locked && (
                <Lock size={11} className="text-white/20 shrink-0" />
              )}
            </div>
            <p className="text-[11px] font-mono text-white/40 mt-0.5">{crime.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-white/30">
            <span className="flex items-center gap-1">
              <Zap size={11} className="text-neon-yellow" />
              {crime.turnCost}
            </span>
            <span className="flex items-center gap-1">
              <Star size={11} className="text-amber-400/60" />
              Lv.{crime.minLevel}
            </span>
            <span className="text-white/20">${crime.rewardMin.toLocaleString()}-${crime.rewardMax.toLocaleString()}</span>
          </div>

          <button
            onClick={onPlay}
            disabled={disabled || locked}
            className={`text-[11px] font-mono tracking-wider uppercase px-3 py-1.5 rounded-sm border transition-all duration-200 ${
              locked
                ? "border-white/5 text-white/10 cursor-not-allowed"
                : "border-cyan-400/20 text-cyan-400/80 hover:bg-cyan-400/10 hover:border-cyan-400/30 active:scale-95"
            }`}
          >
            {locked ? "Locked" : disabled ? "..." : "Play"}
          </button>
        </div>
      </div>
    </div>
  );
}
