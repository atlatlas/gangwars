"use client";

import { useEffect, useState } from "react";
import GameLayout from "@/components/GameLayout";
import { Skill } from "@/types";
import { skills as skillsApi } from "@/lib/api";
import { useTopNotification } from "@/components/TopNotification";
import Image from "next/image";
import {
  BookOpen, Zap, Loader2, TrendingUp, Brain, Eye, Users, Heart,
  Lock, User, Shield, Terminal, Star, BarChart3, ChevronRight,
} from "lucide-react";

const statLabels: Record<string, string> = {
  strength: "STR",
  agility: "AGI",
  intelligence: "INT",
  charisma: "CHA",
};

const statIcons: Record<string, React.ReactNode> = {
  strength: <Zap size={14} className="text-neon-red" />,
  agility: <TrendingUp size={14} className="text-neon-cyan" />,
  intelligence: <Brain size={14} className="text-neon-purple" />,
  charisma: <Heart size={14} className="text-neon-pink" />,
};

const skillIcons: Record<string, React.ReactNode> = {
  "Guerrilla Warfare": <Zap size={18} className="text-neon-red" />,
  Chemistry: <Brain size={18} className="text-neon-green" />,
  "Sixth Sense": <Eye size={18} className="text-neon-cyan" />,
  "Women's Studies": <Users size={18} className="text-neon-pink" />,
  "Sexual Education": <Heart size={18} className="text-purple-400" />,
  Lockpicking: <Lock size={18} className="text-amber-400" />,
  Pickpocketing: <User size={18} className="text-emerald-400" />,
  "Safe Cracking": <Shield size={18} className="text-cyan-400" />,
  Hacking: <Terminal size={18} className="text-rose-400" />,
};

export default function SkillsPage() {
  const [skillList, setSkillList] = useState<Skill[]>([]);
  const [turns, setTurns] = useState(0);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useTopNotification();
  const [trainingId, setTrainingId] = useState<number | null>(null);
  const [turnInputs, setTurnInputs] = useState<Record<number, string>>({});

  const fetchSkills = async () => {
    try {
      const data = await skillsApi.list();
      setSkillList(data.skills);
      setTurns(data.turns);
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleTrain = async (skillId: number) => {
    setTrainingId(skillId);
    const turnsToSpend = turnInputs[skillId] ? parseInt(turnInputs[skillId]) : 0;
    try {
      const res = await skillsApi.train(skillId, turnsToSpend > 0 ? turnsToSpend : undefined);
      const msg = res.maxedOut
        ? `${res.skillName}: MAXED at level ${res.newLevel}! +${res.xpGained} XP (${res.turnsUsed} turns)`
        : res.totalLevelUps > 0
        ? `${res.skillName}: +${res.xpGained} XP, ${res.totalLevelUps} level up${res.totalLevelUps > 1 ? 's' : ''}! Now level ${res.newLevel}`
        : `${res.skillName}: +${res.xpGained} XP (${res.turnsUsed} turns)`;
      showNotification(msg, res.leveledUp ? "success" : "info");
      setTurnInputs((prev) => ({ ...prev, [skillId]: "" }));
      await fetchSkills();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setTrainingId(null);
    }
  };

  const knownSkills = skillList.filter((s) => s.level > 0);

  const totalLevels = knownSkills.reduce((sum, s) => sum + s.level, 0);

  const hero = (
    <div className="relative mb-0 h-[180px] md:h-[260px]">
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-cyan-500/5" />
      <Image
        src="/skills.png?v=1"
        alt="Skills"
        width={1897}
        height={829}
        className="w-full h-full max-h-[200px] md:max-h-[280px] object-cover object-bottom relative z-0"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      <div className="absolute top-3 right-3 md:top-4 md:right-6 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm border border-white/10 rounded-sm px-2.5 py-1.5">
        <Zap size={14} className="text-neon-yellow drop-shadow-[0_0_4px_rgba(250,204,21,0.3)]" />
        <span className="font-mono text-xs text-cyan-300">{turns}</span>
        <span className="text-[10px] font-mono text-white/30">turns</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 md:px-6 pb-3 md:pb-4">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-purple-400 drop-shadow-[0_0_4px_rgba(147,51,234,0.3)]" />
          <h1 className="text-lg md:text-xl font-bold text-white drop-shadow-lg">Life Skills</h1>
        </div>
        <div className="w-36 h-px bg-purple-400/40 mt-1 mb-2" />
        <div className="bg-black/30 backdrop-blur-sm rounded-sm px-2 py-1.5 mb-1 -mx-1 border-t border-l border-white/10">
          <p className="text-[10px] md:text-xs font-mono text-white/60 tracking-wider">
            Train skills to unlock permanent bonuses and stat improvements.
            <br />Each skill uses a different stat — level up to maximize your potential.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
          <Star size={10} className="text-purple-400 drop-shadow-[0_0_4px_rgba(147,51,234,0.5)]" fill="#a78bfa" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <GameLayout>
        {hero}
        <div className="shadow-[inset_0_20px_20px_-12px_rgba(0,0,0,0.7)] border-t border-purple-500/15">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 size={24} className="text-neon-cyan animate-spin" />
            </div>
          </div>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout>
      {hero}
      <div className="shadow-[inset_0_20px_20px_-12px_rgba(0,0,0,0.7)] border-t border-purple-500/15">
        <div className="max-w-5xl mx-auto px-4 py-6">

          {/* Known skills summary */}
          {knownSkills.length > 0 && (
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 size={13} className="text-purple-400" />
                <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">
                  Your Skills ({knownSkills.length})
                </span>
                <span className="text-[10px] font-mono text-white/20">
                  &middot; {totalLevels} total levels
                </span>
              </div>
              <div className="bg-bg-deep border border-white/5 rounded-sm p-3 shadow-[0_-6px_12px_-4px_rgba(0,0,0,0.6)]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-mono text-white/30 uppercase tracking-wider border-b border-white/10">
                      <th className="pb-2 pr-3">Skill</th>
                      <th className="pb-2 pr-3">Level</th>
                      <th className="pb-2 pr-3 hidden sm:table-cell">Progress</th>
                      <th className="pb-2 pr-3 hidden sm:table-cell">Stat</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-mono">
                    {knownSkills.map((s) => (
                      <tr key={s.id} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white/30">{skillIcons[s.name] || <BookOpen size={14} className="text-purple-400" />}</span>
                            <span className="text-white/70">{s.name}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          {s.level >= s.maxLevel ? (
                            <span className="text-yellow-400/80">MAX</span>
                          ) : (
                            <span className="text-cyan-300">{s.level}</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 hidden sm:table-cell">
                          {s.level < s.maxLevel ? (
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-white/5 rounded-sm overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded"
                                  style={{ width: `${s.progressPercent}%` }}
                                />
                              </div>
                              <span className="text-white/30">{s.progressPercent}%</span>
                            </div>
                          ) : (
                            <span className="text-yellow-400/60">Maxed</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 hidden sm:table-cell">
                          <div className="flex items-center gap-1">
                            {statIcons[s.statUsed]}
                            <span className="text-white/40 uppercase text-[10px]">{statLabels[s.statUsed] || s.statUsed}</span>
                          </div>
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => {
                              document.getElementById(`skill-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                            }}
                            className="flex items-center gap-1 text-[10px] font-mono text-purple-400/60 hover:text-purple-400"
                          >
                            Train <ChevronRight size={10} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Skill cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {skillList.map((skill) => {
            const isMaxed = skill.level >= skill.maxLevel;
            const inputVal = turnInputs[skill.id] ?? "";

            return (
              <div
                id={`skill-${skill.id}`}
                key={skill.id}
                className="p-3 rounded border border-white/5 bg-bg-dark/60"
              >
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {skillIcons[skill.name] || <BookOpen size={16} className="text-purple-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-mono tracking-wide text-white/80">{skill.name}</h3>
                      {isMaxed && (
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
                          MAX
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-white/30 mt-0.5 leading-relaxed">{skill.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 bg-white/5 px-2 py-1 rounded-sm">
                    {statIcons[skill.statUsed]}
                    <span className="text-[10px] font-mono text-white/40 uppercase">{statLabels[skill.statUsed] || skill.statUsed}</span>
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] font-mono mb-1">
                    <span className={isMaxed ? "text-yellow-400/80" : "text-cyan-300"}>
                      Level {skill.level}{isMaxed ? "" : ` / ${skill.maxLevel}`}
                    </span>
                    {!isMaxed && (
                      <span className="text-white/30">{skill.xp} / {skill.xpNeeded} XP</span>
                    )}
                  </div>
                  {!isMaxed && (
                    <div className="h-2 bg-white/5 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded transition-all duration-500"
                        style={{ width: `${skill.progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                  <span className="text-[10px] font-mono text-white/30">
                    {skill.xpPerTrain} XP/train &middot; {skill.turnCost} turns
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={turns}
                      placeholder="turns"
                      value={inputVal}
                      onChange={(e) => setTurnInputs((p) => ({ ...p, [skill.id]: e.target.value }))}
                      className="w-14 text-[11px] font-mono bg-black/30 border border-white/10 rounded-sm px-2 py-1.5 text-white/70 placeholder-white/20 text-center focus:outline-none focus:border-purple-500/40"
                    />
                    <button
                      onClick={() => handleTrain(skill.id)}
                      disabled={trainingId === skill.id || turns < skill.turnCost || isMaxed}
                      className="px-3 py-1.5 text-[11px] font-mono tracking-wider uppercase bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-30 disabled:cursor-not-allowed border border-purple-500/30 rounded-sm transition-all duration-150 flex items-center gap-1.5"
                    >
                      {trainingId === skill.id ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Zap size={11} />
                      )}
                      Train
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>

        </div>
      </div>
    </GameLayout>
  );
}
