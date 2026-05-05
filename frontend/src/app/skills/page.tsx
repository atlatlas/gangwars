"use client";

import { useEffect, useState } from "react";
import GameLayout from "@/components/GameLayout";
import { Skill, TrainResult } from "@/types";
import { skills as skillsApi } from "@/lib/api";
import { BookOpen, Zap, Loader2, ChevronRight, TrendingUp, Brain, Eye, Users, Heart, AlertCircle } from "lucide-react";

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
};

export default function SkillsPage() {
  const [skillList, setSkillList] = useState<Skill[]>([]);
  const [turns, setTurns] = useState(0);
  const [loading, setLoading] = useState(true);
  const [trainingId, setTrainingId] = useState<number | null>(null);
  const [result, setResult] = useState<TrainResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSkills = async () => {
    try {
      const data = await skillsApi.list();
      setSkillList(data.skills);
      setTurns(data.turns);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleTrain = async (skillId: number) => {
    setTrainingId(skillId);
    setResult(null);
    setError(null);
    try {
      const res = await skillsApi.train(skillId);
      setResult(res);
      await fetchSkills();
    } catch (err: any) {
      setError(err.message);
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
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-500/10 rounded border border-purple-500/20">
            <BookOpen size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-mono tracking-wider text-white/90">Life Skills</h1>
            <p className="text-xs text-text-secondary/60 font-mono tracking-wide">
              Train skills to unlock permanent bonuses
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded">
            <Zap size={14} className="text-neon-yellow" />
            <span className="font-mono text-sm text-yellow-300">{turns} turns</span>
          </div>
        </div>

        {/* Result banner */}
        {result && (
          <div className={`p-4 border rounded ${
            result.leveledUp
              ? "bg-green-500/10 border-green-500/30 text-green-300"
              : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
          }`}>
            <div className="flex items-center gap-2">
              <ChevronRight size={16} />
              <span className="text-sm font-mono">
                {result.skillName}: +{result.xpGained} XP
                {result.leveledUp && (
                  <span className="text-yellow-300"> &middot; LEVEL UP! Now level {result.newLevel}</span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-sm text-red-300 font-mono">{error}</span>
          </div>
        )}

        {/* Skill cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skillList.map((skill) => (
            <div
              key={skill.id}
              className="group relative bg-bg-dark/60 border border-white/5 rounded hover:border-white/10 transition-all duration-200"
            >
              <div className="p-5 space-y-3">
                {/* Header row */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/5 rounded shrink-0">
                    {skillIcons[skill.name] || <BookOpen size={18} className="text-purple-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-mono tracking-wider text-white/80">{skill.name}</h3>
                    <p className="text-xs text-text-secondary/50 mt-1 leading-relaxed">{skill.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 bg-white/5 px-2 py-1 rounded">
                    {statIcons[skill.statUsed]}
                    <span className="text-[10px] font-mono text-white/40 uppercase">{skill.statUsed}</span>
                  </div>
                </div>

                {/* Progress bar */}
                {skill.level < skill.maxLevel ? (
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-cyan-300">Level {skill.level}</span>
                      <span className="text-text-secondary/40">{skill.xp} / {skill.xpNeeded} XP</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded overflow-hidden">
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

                {/* Bottom row: effect text + train button */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-mono text-text-secondary/40">
                    {skill.xpPerTrain} XP per train &middot; {skill.turnCost} turns
                  </span>
                  <button
                    onClick={() => handleTrain(skill.id)}
                    disabled={trainingId === skill.id || turns < skill.turnCost || skill.level >= skill.maxLevel}
                    className="px-4 py-1.5 text-xs font-mono tracking-wider uppercase bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-30 disabled:cursor-not-allowed border border-purple-500/30 rounded transition-all duration-150 flex items-center gap-2"
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
          ))}
        </div>
      </div>
    </GameLayout>
  );
}
