"use client";

import { useEffect, useState } from "react";
import GameLayout from "@/components/GameLayout";
import { leaderboard } from "@/lib/api";
import { LeaderboardData, LeaderboardEntry } from "@/types";
import { Trophy, Users, Skull, Medal, TrendingUp, DollarSign, Zap } from "lucide-react";

const tabs = [
  { key: "level", label: "Level", icon: TrendingUp },
  { key: "respect", label: "Respect", icon: Medal },
  { key: "networth", label: "Net Worth", icon: DollarSign },
  { key: "pvp", label: "PvP", icon: Skull },
];

const rankMedals = ["text-yellow-400", "text-white/40", "text-yellow-500"];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState("level");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    leaderboard
      .get(activeTab)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab]);

  const renderRow = (entry: LeaderboardEntry, index: number) => {
    const rank = index + 1;
    const isMe = data?.myRank === rank;

    let value: string;
    switch (activeTab) {
      case "level":
        value = `Lv.${entry.level}`;
        break;
      case "respect":
        value = `${entry.respect}`;
        break;
      case "networth":
        value = `$${entry.netWorth?.toLocaleString() || 0}`;
        break;
      case "pvp":
        value = `${entry.pvpWins || 0}W / ${entry.pvpLosses || 0}L`;
        break;
      default:
        value = "";
    }

    return (
      <div
        key={entry.id}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors ${
          isMe ? "bg-pink-500/[0.04] border border-pink-500/15" : "hover:bg-white/[0.02]"
        }`}
      >
        <div className="w-7 text-center">
          {rank <= 3 ? (
            <Medal size={16} className={rankMedals[rank - 1]} />
          ) : (
            <span className="text-sm font-mono text-white/20">{rank}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs text-white/80 truncate">
            {entry.username}
            {isMe && <span className="text-pink-400/60 text-sm ml-1">(you)</span>}
          </p>
          <p className="text-xs font-mono text-white/25">Level {entry.level}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs text-white/90">{value}</p>
          {activeTab === "pvp" && entry.winRate !== undefined && (
            <p className="text-sm font-mono text-white/25">{entry.winRate}% win rate</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <GameLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-5 reveal">
        <h1 className="text-lg font-mono tracking-wider text-white/90 flex items-center gap-2 uppercase">
          <Trophy size={16} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" /> Leaderboard
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-black/30 border border-white/5 rounded-sm p-0.5 overflow-x-auto reveal reveal-delay-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono tracking-wider uppercase whitespace-nowrap transition-all duration-150 ${
                activeTab === tab.key
                  ? "bg-pink-500/10 text-pink-300 border border-pink-400/20"
                  : "text-white/25 hover:text-white/50 border border-transparent"
              }`}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* My Rank */}
      {data?.myRank !== undefined && data?.myRank !== null && (
        <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-3 mb-4 flex items-center gap-2 reveal reveal-delay-2">
          <Medal size={14} className="text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.3)]" />
          <span className="text-xs font-mono text-white/30">Your rank:</span>
          <span className="font-mono text-xs text-white/90">#{data.myRank}</span>
        </div>
      )}

      {/* List */}
      <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-1.5 reveal reveal-delay-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-400/30 border-t-pink-400" />
          </div>
        ) : data && data.rows.length > 0 ? (
          <div className="space-y-0.5">
            {data.rows.map((entry, i) => renderRow(entry, i))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users size={24} className="mx-auto text-white/10 mb-2" />
            <p className="text-xs font-mono text-white/20">No players yet</p>
          </div>
        )}
      </div>
      </div>
    </GameLayout>
  );
}