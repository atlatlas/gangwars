"use client";

import { useEffect, useState } from "react";
import GameLayout from "@/components/GameLayout";
import { Skill } from "@/types";
import { skills as skillsApi } from "@/lib/api";
import { useTopNotification } from "@/components/TopNotification";
import { BookOpen, Zap, Loader2, TrendingUp, Brain, Eye, Users, Heart, Lock, User, Shield, Terminal } from "lucide-react";

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

  if (loading) {
    return (
      <GameLayout>
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 size={24} className="text-neon-cyan animate-spin" />
          </div>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-mono tracking-wider text-white/90 flex items-center gap-2 uppercase">
              <BookOpen size={16} className="text-purple-400 drop-shadow-[0_0_4px_rgba(147,51,234,0.3)]" /> Life Skills
            </h1>
            <p className="text-xs font-mono text-white/30 tracking-wider mt-1">Train skills to unlock permanent bonuses</p>
          </div>
          <div className="flex items-center gap-2 bg-bg-dark/80 border border-white/5 rounded-sm px-3 py-1.5">
            <Zap size={13} className="text-neon-yellow" />
            <span className="font-mono text-xs text-white/90">{turns}</span>
            <span className="text-xs font-mono text-white/30">turns</span>
          </div>
        </div>

        {/* Skill cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skillList.map((skill) => (
            <div
              key={skill.id}
              className="group relative bg-bg-dark/80 border border-white/5 rounded-sm hover:border-white/10 transition-all duration-200"
            >
              <div className="p-4 space-y-3">
                {/* Header row */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/5 rounded-sm shrink-0">
                    {skillIcons[skill.name] || <BookOpen size={18} className="text-purple-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-mono tracking-wider text-white/80">{skill.name}</h3>
                    <p className="text-xs text-white/30 mt-1 leading-relaxed">{skill.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 bg-white/5 px-2 py-1 rounded-sm">
                    {statIcons[skill.statUsed]}
                    <span className="text-[10px] font-mono text-white/40 uppercase">{skill.statUsed}</span>
                  </div>
                </div>

                {/* Progress bar */}
                {skill.level < skill.maxLevel ? (
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-cyan-300">Level {skill.level}</span>
                      <span className="text-white/30">{skill.xp} / {skill.xpNeeded} XP</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded transition-all duration-500"
                        style={{ width: `${skill.progressPercent}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-yellow-400">Level {skill.maxLevel}</span>
                    <span className="text-yellow-400/60">MAXED</span>
                  </div>
                )}

                {/* Bottom row: effect text + bulk train */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-mono text-white/30">
                    {skill.xpPerTrain} XP per train &middot; {skill.turnCost} turns
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={turns}
                      placeholder="turns"
                      value={turnInputs[skill.id] ?? ""}
                      onChange={(e) => setTurnInputs((p) => ({ ...p, [skill.id]: e.target.value }))}
                      className="w-16 text-xs font-mono bg-black/30 border border-white/10 rounded-sm px-2 py-1.5 text-white/70 placeholder-white/20 text-center focus:outline-none focus:border-purple-500/40"
                    />
                    <button
                      onClick={() => handleTrain(skill.id)}
                      disabled={trainingId === skill.id || turns < skill.turnCost || skill.level >= skill.maxLevel}
                      className="px-4 py-1.5 text-xs font-mono tracking-wider uppercase bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-30 disabled:cursor-not-allowed border border-purple-500/30 rounded-sm transition-all duration-150 flex items-center gap-2"
                    >
                      {trainingId === skill.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Zap size={12} />
                      )}
                      Train
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </GameLayout>
  );
}
