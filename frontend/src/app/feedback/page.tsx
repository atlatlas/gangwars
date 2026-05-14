"use client";

import { useState, useEffect } from "react";
import GameLayout from "@/components/GameLayout";
import {
  MessageSquare,
  Bug,
  Lightbulb,
  ThumbsUp,
  Plus,
  X,
  Filter,
  ChevronDown,
  Clock,
} from "lucide-react";
import { useTopNotification } from "@/components/TopNotification";
import { feedback as feedbackApi, FeedbackData } from "@/lib/api";

type FeedbackType = "suggestion" | "bug";
type FeedbackStatus = "open" | "under-review" | "planned" | "completed" | "declined";

interface FeedbackItem {
  id: number;
  type: FeedbackType;
  title: string;
  description: string;
  votes: number;
  status: FeedbackStatus;
  createdAt: string;
  username: string;
}

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; color: string }> = {
  "open": { label: "Open", color: "text-cyan-400 border-cyan-400/30 bg-cyan-500/8" },
  "under-review": { label: "Reviewing", color: "text-yellow-400 border-yellow-400/30 bg-yellow-500/8" },
  "planned": { label: "Planned", color: "text-purple-400 border-purple-400/30 bg-purple-500/8" },
  "completed": { label: "Completed", color: "text-green-400 border-green-400/30 bg-green-500/8" },
  "declined": { label: "Declined", color: "text-red-400 border-red-400/30 bg-red-500/8" },
};

export default function FeedbackPage() {
  const { showNotification } = useTopNotification();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | FeedbackType>("all");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "top">("newest");
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<FeedbackType>("suggestion");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [votedItems, setVotedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    feedbackApi.list()
      .then((data) => setItems(data as any))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDesc.trim()) return;

    setSubmitting(true);
    try {
      const created = await feedbackApi.create({
        type: formType,
        title: formTitle.trim(),
        description: formDesc.trim(),
      });
      setItems((prev) => [{ ...created as any, username: "You" }, ...prev]);
      setFormTitle("");
      setFormDesc("");
      setShowForm(false);
      showNotification("Feedback submitted!", "success");
    } catch (err: any) {
      showNotification(err.message || "Failed to submit", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (id: number) => {
    const alreadyVoted = votedItems.has(id);
    try {
      await feedbackApi.vote(id, !alreadyVoted);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, votes: item.votes + (alreadyVoted ? -1 : 1) }
            : item
        )
      );
      setVotedItems((prev) => {
        const next = new Set(prev);
        if (alreadyVoted) next.delete(id);
        else next.add(id);
        return next;
      });
    } catch {}
  };

  let filtered = items;

  if (activeTab !== "all") {
    filtered = filtered.filter((i) => i.type === activeTab);
  }
  if (statusFilter !== "all") {
    filtered = filtered.filter((i) => i.status === statusFilter);
  }

  if (sortBy === "newest") filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  else if (sortBy === "oldest") filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  else if (sortBy === "top") filtered.sort((a, b) => b.votes - a.votes);

  const suggestionCount = items.filter((i) => i.type === "suggestion").length;
  const bugCount = items.filter((i) => i.type === "bug").length;

  function timeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  if (loading) {
    return (
      <GameLayout>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-400/30 border-t-pink-400" />
          </div>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <MessageSquare size={18} className="text-purple-400" />
              Feedback Board
            </h1>
            <p className="text-xs font-mono text-white/30 mt-0.5">
              Share suggestions or report bugs
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-sm border border-purple-400/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400/50 transition-all font-mono text-xs tracking-wider"
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancel" : "New Post"}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-6 rounded-sm border border-white/10 bg-bg-dark/80 p-4 animate-slide-down">
            <form onSubmit={handleSubmit}>
              {/* Type toggle */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setFormType("suggestion")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono tracking-wider transition-all ${
                    formType === "suggestion"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-400/30"
                      : "bg-transparent text-white/30 border border-white/10 hover:text-white/60"
                  }`}
                >
                  <Lightbulb size={12} />
                  Suggestion
                </button>
                <button
                  type="button"
                  onClick={() => setFormType("bug")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono tracking-wider transition-all ${
                    formType === "bug"
                      ? "bg-red-500/20 text-red-300 border border-red-400/30"
                      : "bg-transparent text-white/30 border border-white/10 hover:text-white/60"
                  }`}
                >
                  <Bug size={12} />
                  Bug Report
                </button>
              </div>

              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={formType === "suggestion" ? "What's your idea?" : "What went wrong?"}
                maxLength={100}
                required
                className="w-full bg-bg-deep/80 border border-white/10 rounded-sm px-3 py-2 text-sm text-white placeholder:text-white/20 font-mono focus:outline-none focus:border-purple-400/40 transition-all mb-2"
              />

              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder={formType === "suggestion" ? "Describe your suggestion in detail..." : "Steps to reproduce, expected vs actual behavior..."}
                rows={3}
                maxLength={1000}
                required
                className="w-full bg-bg-deep/80 border border-white/10 rounded-sm px-3 py-2 text-sm text-white placeholder:text-white/20 font-mono focus:outline-none focus:border-purple-400/40 transition-all mb-3 resize-none"
              />

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/20">{formDesc.length}/1000</span>
                <button
                  type="submit"
                  disabled={submitting || !formTitle.trim() || !formDesc.trim()}
                  className="px-4 py-1.5 rounded-sm bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-mono tracking-wider hover:bg-purple-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? "Posting..." : `Submit ${formType === "suggestion" ? "Suggestion" : "Bug Report"}`}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Type tabs */}
          <div className="flex rounded-sm border border-white/10 overflow-hidden">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 text-xs font-mono tracking-wider transition-all ${
                activeTab === "all"
                  ? "bg-white/10 text-white"
                  : "bg-transparent text-white/30 hover:text-white/60"
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setActiveTab("suggestion")}
              className={`px-3 py-1.5 text-xs font-mono tracking-wider transition-all flex items-center gap-1 ${
                activeTab === "suggestion"
                  ? "bg-purple-500/20 text-purple-300"
                  : "bg-transparent text-white/30 hover:text-white/60"
              }`}
            >
              <Lightbulb size={10} />
              Ideas ({suggestionCount})
            </button>
            <button
              onClick={() => setActiveTab("bug")}
              className={`px-3 py-1.5 text-xs font-mono tracking-wider transition-all flex items-center gap-1 ${
                activeTab === "bug"
                  ? "bg-red-500/20 text-red-300"
                  : "bg-transparent text-white/30 hover:text-white/60"
              }`}
            >
              <Bug size={10} />
              Bugs ({bugCount})
            </button>
          </div>

          <div className="flex-1" />

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="appearance-none bg-bg-dark border border-white/10 rounded-sm px-3 py-1.5 pr-7 text-xs font-mono text-white/50 focus:outline-none focus:border-purple-400/40 cursor-pointer"
            >
              <option value="all">All status</option>
              <option value="open">Open</option>
              <option value="under-review">Under review</option>
              <option value="planned">Planned</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
            </select>
            <Filter size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none bg-bg-dark border border-white/10 rounded-sm px-3 py-1.5 pr-7 text-xs font-mono text-white/50 focus:outline-none focus:border-purple-400/40 cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="top">Top voted</option>
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
          </div>
        </div>

        {/* Board list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare size={32} className="mx-auto text-white/10 mb-3" />
            <p className="text-sm font-mono text-white/20">
              {items.length === 0
                ? "No feedback yet. Be the first to post!"
                : "No items match your filters."}
            </p>
            {items.length === 0 && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-xs font-mono text-purple-400/60 hover:text-purple-300 transition-colors"
              >
                + Share your thoughts
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="group rounded-sm border border-white/5 bg-bg-dark/80 p-4 hover:border-white/10 transition-all"
              >
                <div className="flex gap-4">
                  {/* Vote column */}
                  <div className="flex flex-col items-center gap-0.5 shrink-0 w-10">
                    <button
                      onClick={() => handleVote(item.id)}
                      className={`flex items-center justify-center w-7 h-7 rounded-sm transition-all ${
                        votedItems.has(item.id)
                          ? "bg-purple-500/20 text-purple-400 border border-purple-400/30"
                          : "bg-transparent text-white/20 border border-transparent hover:text-purple-400 hover:border-purple-400/30"
                      }`}
                    >
                      <ThumbsUp size={11} />
                    </button>
                    <span className={`text-xs font-mono font-bold ${
                      votedItems.has(item.id) ? "text-purple-400" : "text-white/40"
                    }`}>
                      {item.votes}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Type badge */}
                      <span className={`text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded-sm border ${
                        item.type === "suggestion"
                          ? "text-purple-400 border-purple-400/20 bg-purple-500/8"
                          : "text-red-400 border-red-400/20 bg-red-500/8"
                      }`}>
                        {item.type === "suggestion" ? "Idea" : "Bug"}
                      </span>

                      {/* Status badge */}
                      <span className={`text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded-sm border ${
                        STATUS_CONFIG[item.status].color
                      }`}>
                        {STATUS_CONFIG[item.status].label}
                      </span>

                      <span className="text-[10px] font-mono text-white/20 ml-auto">
                        <Clock size={9} className="inline mr-0.5" />
                        {timeAgo(item.createdAt)}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white/90 mt-1.5 group-hover:text-purple-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs font-mono text-white/40 mt-1 leading-relaxed whitespace-pre-wrap">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GameLayout>
  );
}
