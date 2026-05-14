"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GameLayout from "@/components/GameLayout";
import { gangs as gangsApi } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { useTopNotification } from "@/components/TopNotification";
import { GangLeaderboardData, GangLeaderboardEntry, GangInvite } from "@/types";
import { Shield, Medal, TrendingUp, DollarSign, Users, Map, Trophy, ChevronRight, Mail, Check, X as XIcon, Plus, X, Send, Search } from "lucide-react";

const tabs = [
  { key: "rank", label: "Rank", icon: Trophy },
  { key: "level", label: "Level", icon: TrendingUp },
  { key: "vault", label: "Vault", icon: DollarSign },
  { key: "members", label: "Members", icon: Users },
  { key: "respect", label: "Respect", icon: Medal },
  { key: "turf", label: "Turf", icon: Map },
];

const rankMedals = ["text-yellow-400", "text-white/40", "text-yellow-500"];

function getGangValue(entry: GangLeaderboardEntry, tab: string) {
  switch (tab) {
    case "rank":
      return `${entry.rankScore?.toLocaleString() ?? 0} pts`;
    case "level":
      return `Lv.${entry.level}`;
    case "vault":
      return `$${entry.vault.toLocaleString()}`;
    case "members":
      return `${entry.memberCount}/${entry.maxMembers}`;
    case "respect":
      return `${entry.totalRespect.toLocaleString()} respect`;
    case "turf":
      return `${entry.turfCount} district${entry.turfCount !== 1 ? "s" : ""}`;
    default:
      return "";
  }
}

export default function GangsPage() {
  const router = useRouter();
  const { user, refreshUser } = useUser();
  const { showNotification } = useTopNotification();
  const [activeTab, setActiveTab] = useState("level");
  const [data, setData] = useState<GangLeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState<GangInvite[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<number | null>(null);
  const [requestedGangs, setRequestedGangs] = useState<Set<number>>(new Set());
  const [form, setForm] = useState({ name: "", tag: "", description: "" });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadLeaderboard();
    loadInvites();
  }, [activeTab]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const result = await gangsApi.leaderboard(activeTab);
      setData(result as GangLeaderboardData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadInvites = async () => {
    try {
      const invites = await gangsApi.myInvites();
      setInvites(invites);
    } catch {}
  };

  const handleAcceptInvite = async (inviteId: number) => {
    setInviteLoading(true);
    try {
      const data = await gangsApi.acceptInvite(inviteId);
      await refreshUser();
      showNotification("Joined gang!", "success");
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      loadLeaderboard();
      if (data.gangId) {
        router.push(`/gangs/${data.gangId}`);
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeclineInvite = async (inviteId: number) => {
    setInviteLoading(true);
    try {
      await gangsApi.declineInvite(inviteId);
      showNotification("Invite declined", "success");
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await gangsApi.create(form);
      await refreshUser();
      showNotification("Gang created!", "success");
      setShowCreate(false);
      setForm({ name: "", tag: "", description: "" });
      loadLeaderboard();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (gangId: number) => {
    setJoining(gangId);
    try {
      await gangsApi.join(gangId);
      await refreshUser();
      setRequestedGangs((prev) => new Set(prev).add(gangId));
      showNotification("Join request sent to the gang leader!", "success");
      loadLeaderboard();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setJoining(null);
    }
  };

  if (!user) return null;

  const renderRow = (entry: GangLeaderboardEntry, index: number) => {
    const rank = index + 1;
    const isMyGang = data?.myGangId === entry.id;
    const isFull = (entry.memberCount ?? 0) >= entry.maxMembers;

    let subtitle: string | null = null;
    switch (activeTab) {
      case "respect":
        subtitle = `${entry.memberCount} members`;
        break;
      case "turf":
        subtitle = `Lv.${entry.level}`;
        break;
    }

    return (
      <div
        key={entry.id}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors ${
          isMyGang ? "bg-pink-500/[0.04] border border-pink-500/15" : "hover:bg-white/[0.02]"
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
          <p className="font-mono text-xs text-white/80 truncate flex items-center gap-1.5">
            <span>{entry.name}</span>
            <span className="text-[11px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-sm">
              [{entry.tag}]
            </span>
            {isMyGang && <span className="text-pink-400/60 text-sm ml-1">(you)</span>}
            {entry.investmentsOpen && !isMyGang && (
              <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1 py-0.5 rounded-sm" title="Open for investment">
                <DollarSign size={9} className="inline" />
              </span>
            )}
          </p>
          <p className="text-xs font-mono text-white/25">{entry.memberCount} members</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs text-white/90">{getGangValue(entry, activeTab)}</p>
          {subtitle && (
            <p className="text-[10px] font-mono text-cyan-400/50">{subtitle}</p>
          )}
        </div>

        {!user.gangId && !isMyGang && (
          <button
            onClick={() => handleJoin(entry.id)}
            disabled={joining === entry.id || isFull || requestedGangs.has(entry.id)}
            className={`shrink-0 ml-3 text-xs font-mono tracking-wider uppercase px-3 py-1.5 rounded-sm transition-all flex items-center gap-1.5 ${
              isFull
                ? "text-white/20 border border-white/5 cursor-not-allowed"
                : requestedGangs.has(entry.id)
                ? "text-yellow-400/60 border border-yellow-400/20 cursor-default"
                : "text-yellow-400/70 hover:text-yellow-300 border border-yellow-400/20 hover:border-yellow-400/40 hover:shadow-[0_0_8px_rgba(234,179,8,0.1)]"
            }`}
          >
            {joining === entry.id ? (
              <div className="animate-spin h-3 w-3 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full mx-auto" />
            ) : isFull ? (
              "Full"
            ) : requestedGangs.has(entry.id) ? (
              <><Send size={10} /> Sent</>
            ) : (
              <><Send size={10} /> Request</>
            )}
          </button>
        )}

        {user.gangId === entry.id && (
          <button
            onClick={() => router.push(`/gangs/${entry.id}`)}
            className="shrink-0 ml-3 text-xs font-mono text-purple-400/60 hover:text-purple-300 transition-colors"
          >
            View
          </button>
        )}
      </div>
    );
  };

  const myEntry = data?.rows.find((e) => e.id === user.gangId);

  const filteredRows = data?.rows.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <GameLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 reveal">
          <div>
            <h1 className="text-lg font-mono tracking-wider text-white/90 flex items-center gap-2 uppercase">
              <Shield size={16} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" /> Gangs
            </h1>
            <p className="text-xs font-mono text-white/30 tracking-wider mt-1">Leaderboard</p>
          </div>
        </div>

        {/* My Gang — pinned at top */}
        {user.gangId && myEntry && (
          <div className="mb-4 rounded-sm border border-purple-500/20 bg-purple-500/5 p-3 reveal">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Shield size={16} className="text-purple-400 shrink-0" />
                <div className="min-w-0">
                  <p className="font-mono text-sm text-purple-300 truncate flex items-center gap-2">
                    [{myEntry.tag}] {myEntry.name}
                    <span className="text-[10px] font-mono text-purple-400/50 bg-purple-400/10 px-1.5 py-0.5 rounded-sm shrink-0 uppercase tracking-wider">
                      {user.gangRole}
                    </span>
                  </p>
                  <p className="text-xs font-mono text-purple-300/50 mt-0.5 flex items-center gap-2">
                    <span>Rank #{data?.myRank ?? "?"}</span>
                    <span className="text-white/15">|</span>
                    <span>{getGangValue(myEntry, activeTab)}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/gangs/${user.gangId}`)}
                className="shrink-0 ml-3 flex items-center gap-1 text-xs font-mono text-purple-400/60 hover:text-purple-300 transition-colors"
              >
                Manage <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Pending invites */}
        {invites.length > 0 && (
          <div className="mb-5 space-y-2 reveal">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="rounded-sm border border-purple-500/20 bg-purple-500/5 p-3 flex items-center justify-between animate-slide-in"
              >
                <div className="flex items-center gap-3">
                  <Mail size={14} className="text-purple-400" />
                  <div>
                    <p className="font-mono text-xs text-purple-300">
                      Invited to join <span className="text-purple-200">[{invite.gangTag}] {invite.gangName}</span>
                    </p>
                    <p className="text-[10px] font-mono text-white/30">
                      by {invite.invitedByUsername}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeclineInvite(invite.id)}
                    disabled={inviteLoading}
                    className="text-[10px] font-mono text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 rounded-sm px-2 py-1 transition-colors flex items-center gap-1"
                  >
                    <XIcon size={10} /> Decline
                  </button>
                  <button
                    onClick={() => handleAcceptInvite(invite.id)}
                    disabled={inviteLoading}
                    className="text-[10px] font-mono text-green-400/80 hover:text-green-300 border border-green-400/20 hover:border-green-400/40 rounded-sm px-2 py-1 transition-colors flex items-center gap-1"
                  >
                    <Check size={10} /> Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Gang — only if not in a gang */}
        {!user.gangId && (
          <>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="mb-5 flex items-center gap-2 px-4 py-2 rounded-sm border border-white/5 bg-bg-dark/80 text-xs font-mono text-white/60 hover:text-white/90 hover:border-pink-400/30 transition-all reveal"
            >
              {showCreate ? <X size={14} /> : <Plus size={14} />}
              {showCreate ? "Cancel" : "Create Gang"}
            </button>

            {showCreate && (
              <form
                onSubmit={handleCreate}
                className="mb-5 rounded-sm border border-white/5 bg-bg-dark/80 p-4 animate-slide-in reveal"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-1">Gang Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-black/30 border border-white/5 rounded-sm px-3 py-2 text-sm font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-pink-400/30 transition-all"
                      placeholder="The Lords"
                      maxLength={25}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-1">Tag (2-5 chars)</label>
                    <input
                      type="text"
                      value={form.tag}
                      onChange={(e) => setForm({ ...form, tag: e.target.value.toUpperCase() })}
                      className="w-full bg-black/30 border border-white/5 rounded-sm px-3 py-2 text-sm font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-pink-400/30 transition-all uppercase"
                      placeholder="LORD"
                      maxLength={5}
                      required
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-1">Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-black/30 border border-white/5 rounded-sm px-3 py-2 text-sm font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-pink-400/30 transition-all"
                    placeholder="We run these streets..."
                    maxLength={100}
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="font-mono tracking-wider text-xs uppercase text-pink-400/70 hover:text-pink-300 border border-pink-400/20 hover:border-pink-400/40 rounded-sm px-4 py-2 transition-all duration-150 hover:shadow-[0_0_12px_rgba(236,72,153,0.1)] flex items-center gap-2"
                >
                  {creating ? (
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-pink-400/30 border-t-pink-400 rounded-full" />
                  ) : (
                    <Shield size={13} />
                  )}
                  {creating ? "Creating..." : "Create Gang"}
                </button>
              </form>
            )}
          </>
        )}

        {/* Search */}
        <div className="relative mb-4 reveal">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gangs by name or tag..."
            className="w-full bg-black/30 border border-white/5 rounded-sm pl-8 pr-3 py-2 text-xs font-mono text-white/60 placeholder:text-white/15 focus:outline-none focus:border-white/10 transition-all"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-black/30 border border-white/5 rounded-sm p-0.5 overflow-x-auto reveal">
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

        {/* Leaderboard list */}
        <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-1.5 reveal">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-400/30 border-t-pink-400" />
            </div>
          ) : filteredRows && filteredRows.length > 0 ? (
            <div className="space-y-0.5">
              {filteredRows.map((entry, i) => renderRow(entry, i))}
            </div>
          ) : data && data.rows.length > 0 && searchQuery ? (
            <div className="text-center py-12">
              <Search size={20} className="mx-auto text-white/10 mb-2" />
              <p className="text-xs font-mono text-white/20">No gangs match your search</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy size={24} className="mx-auto text-white/10 mb-2" />
              <p className="text-xs font-mono text-white/20">No gangs yet</p>
            </div>
          )}
        </div>
      </div>
    </GameLayout>
  );
}
