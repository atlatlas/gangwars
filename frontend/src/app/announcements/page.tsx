"use client";

import { useState } from "react";
import GameLayout from "@/components/GameLayout";
import { announcements, Announcement } from "@/data/announcements";
import { Newspaper, Calendar, User, ChevronDown, ChevronUp } from "lucide-react";

export default function AnnouncementsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <GameLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 reveal">
          <Newspaper size={20} className="text-purple-400 shrink-0" />
          <div>
            <h1 className="text-sm font-mono text-white/80 uppercase tracking-wider">Announcements</h1>
            <p className="text-xs font-mono text-white/30 mt-0.5">
              Latest features, fixes, and updates
            </p>
          </div>
        </div>

        {/* No announcements */}
        {announcements.length === 0 && (
          <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-8 text-center reveal">
            <Newspaper size={32} className="mx-auto text-white/10 mb-3" />
            <p className="text-sm font-mono text-white/30">No announcements yet</p>
            <p className="text-xs font-mono text-white/20 mt-1">Check back later for updates.</p>
          </div>
        )}

        {/* Announcement list */}
        <div className="space-y-3">
          {announcements.map((a) => {
            const isExpanded = expanded === a.id;
            return (
              <div
                key={a.id}
                className="rounded-sm border border-white/5 bg-bg-dark/80 reveal overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : a.id)}
                  className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="font-mono text-sm text-white/80">{a.title}</h2>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-white/25">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {a.date}
                      </span>
                      {a.author && (
                        <span className="flex items-center gap-1">
                          <User size={10} />
                          {a.author}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 mt-0.5 text-white/20">
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-white/5 px-4 py-3 animate-slide-in">
                    <p className="text-xs font-mono text-white/50 leading-relaxed whitespace-pre-line">
                      {a.body}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </GameLayout>
  );
}
