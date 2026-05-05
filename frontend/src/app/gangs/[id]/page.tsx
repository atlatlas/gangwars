"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import GameLayout from "@/components/GameLayout";
import { gangs as gangsApi } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { useToast } from "@/components/Toast";
import { GangDetail, GangMember } from "@/types";
import { Shield, Users, Crown, LogOut, Skull, ArrowLeft, Star, ChevronUp, ChevronDown, Plus, X, Send, DollarSign, TrendingUp } from "lucide-react";

const ROLE_CONFIG: Record<string, { icon: typeof Crown; color: string; label: string }> = {
  leader: { icon: Crown, color: "text-yellow-500 drop-shadow-[0_0_4px_rgba(234,179,8,0.3)]", label: "Leader" },
  lieutenant: { icon: Star, color: "text-purple-400 drop-shadow-[0_0_4px_rgba(168,85,247,0.3)]", label: "Lieutenant" },
  enforcer: { icon: Shield, color: "text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.3)]", label: "Enforcer" },
  member: { icon: Users, color: "text-white/20", label: "Member" },
};

const ROLE_BADGE: Record<string, { color: string }> = {
  leader: { color: "text-yellow-500/80 bg-yellow-500/10" },
  lieutenant: { color: "text-purple-400/80 bg-purple-500/10" },
  enforcer: { color: "text-cyan-400/80 bg-cyan-500/10" },
  member: { color: "text-white/40 bg-white/5" },
};

const ROLE_HIERARCHY: Record<string, number> = {
  member: 0,
  enforcer: 1,
  lieutenant: 2,
  leader: 3,
};

export default function GangDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, refreshUser } = useUser();
  const { toast } = useToast();
  const [gang, setGang] = useState<GangDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviting, setInviting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [showInvites, setShowInvites] = useState(false);

  const gangId = parseInt(params.id as string);

  useEffect(() => {
    loadGang();
    loadPendingInvites();
  }, [gangId]);

  const loadGang = async () => {
    setError("");
    try {
      const data = await gangsApi.get(gangId);
      setGang(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingInvites = async () => {
    try {
      const data = await gangsApi.gangInvites(gangId);
      setPendingInvites(data);
    } catch {}
  };

  const membership = gang?.members.find((m) => m.userId === user?.id);
  const isLeader = user?.gangId === gangId && user?.gangRole === "leader";
  const isLieutenant = user?.gangId === gangId && user?.gangRole === "lieutenant";
  const canInviteMembers = isLeader || isLieutenant;
  const isOwnGang = user?.gangId === gangId;

  const handleLeave = async () => {
    setActionLoading(true);
    try {
      await gangsApi.leave(gangId);
      await refreshUser();
      toast("Left the gang", "success");
      router.push("/gangs");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleKick = async (targetId: number, name: string) => {
    setActionLoading(true);
    try {
      await gangsApi.kick(gangId, targetId);
      await refreshUser();
      toast(`${name} kicked from the gang`, "success");
      loadGang();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setActionLoading(false);
      setConfirming(null);
    }
  };

  const handleTransfer = async (targetId: number, name: string) => {
    setActionLoading(true);
    try {
      await gangsApi.transfer(gangId, targetId);
      await refreshUser();
      toast(`Leadership transferred to ${name}`, "success");
      loadGang();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setActionLoading(false);
      setConfirming(null);
    }
  };

  const handleDisband = async () => {
    setActionLoading(true);
    try {
      await gangsApi.disband(gangId);
      await refreshUser();
      toast("Gang disbanded", "success");
      router.push("/gangs");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setActionLoading(false);
      setConfirming(null);
    }
  };

  const handlePromote = async (targetId: number, name: string) => {
    setActionLoading(true);
    try {
      const data = await gangsApi.promote(gangId, targetId);
      toast(`${name} promoted to ${data.newRole}`, "success");
      loadGang();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setActionLoading(false);
      setConfirming(null);
    }
  };

  const handleDemote = async (targetId: number, name: string) => {
    setActionLoading(true);
    try {
      const data = await gangsApi.demote(gangId, targetId);
      toast(`${name} demoted to ${data.newRole}`, "success");
      loadGang();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setActionLoading(false);
      setConfirming(null);
    }
  };

  const handleInvite = async () => {
    if (!inviteUsername.trim()) return;
    setInviting(true);
    try {
      // Search for the user first
      const results = await gangsApi.searchUsers(inviteUsername.trim());
      const target = results.find(
        (u: any) => u.username.toLowerCase() === inviteUsername.trim().toLowerCase()
      );
      if (!target) {
        toast("User not found", "error");
        setInviting(false);
        return;
      }
      await gangsApi.invite(gangId, target.id);
      toast(`Invite sent to ${target.username}`, "success");
      setInviteUsername("");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvite = async (inviteId: number) => {
    try {
      await gangsApi.cancelInvite(gangId, inviteId);
      toast("Invite cancelled", "success");
      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  const getNextRole = (currentRole: string): string | null => {
    const rank = ROLE_HIERARCHY[currentRole];
    if (rank === 0) return "enforcer";
    if (rank === 1) return "lieutenant";
    return null;
  };

  const getDemoteRole = (currentRole: string): string | null => {
    const rank = ROLE_HIERARCHY[currentRole];
    if (rank === 2) return "enforcer";
    if (rank === 1) return "member";
    return null;
  };

  return (
    <GameLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Back */}
        <button
          onClick={() => router.push("/gangs")}
          className="flex items-center gap-1.5 text-xs font-mono text-white/30 hover:text-white/60 transition-colors mb-4"
        >
          <ArrowLeft size={12} /> Back to Gangs
        </button>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-400/30 border-t-pink-400" />
          </div>
        )}

        {/* Error / Not found */}
        {!loading && error && (
          <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-8 text-center">
            <Skull size={32} className="mx-auto text-white/10 mb-3" />
            <p className="text-sm font-mono text-white/30">Gang not found</p>
            <p className="text-xs font-mono text-white/20 mt-1">{error}</p>
          </div>
        )}

        {/* Gang detail */}
        {!loading && !error && gang && (
          <>
            {/* Header */}
            <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4 reveal">
              <div className="flex items-center gap-3 mb-3">
                <Shield size={20} className="text-purple-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-mono text-white/90">{gang.name}</h1>
                    <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-sm">
                      [{gang.tag}]
                    </span>
                  </div>
                  <p className="text-xs font-mono text-white/30 mt-0.5">
                    Level {gang.level} &middot; {gang.memberCount}/{gang.maxMembers} members
                  </p>
                </div>
              </div>
              {gang.description && (
                <p className="text-xs font-mono text-white/40 border-t border-white/5 pt-3 mt-1">
                  {gang.description}
                </p>
              )}
            </div>

            {/* Actions */}
            {isOwnGang && (
              <div className="flex flex-wrap gap-2 mb-4 reveal reveal-delay-1">
                {membership && membership.role !== "leader" && (
                  <button
                    onClick={() => setConfirming("leave")}
                    disabled={actionLoading}
                    className="font-mono tracking-wider text-xs uppercase text-pink-400/70 hover:text-pink-300 border border-pink-400/20 hover:border-pink-400/40 rounded-sm px-3 py-1.5 transition-all duration-150 hover:shadow-[0_0_8px_rgba(236,72,153,0.1)] flex items-center gap-1.5"
                  >
                    <LogOut size={12} /> {actionLoading && confirming === "leave" ? "Leaving..." : "Leave Gang"}
                  </button>
                )}

                {isLeader && (
                  <>
                    <button
                      onClick={() => setConfirming("disband")}
                      disabled={actionLoading}
                      className="font-mono tracking-wider text-xs uppercase text-red-400/70 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 rounded-sm px-3 py-1.5 transition-all duration-150 flex items-center gap-1.5"
                    >
                      <Skull size={12} /> {actionLoading && confirming === "disband" ? "Disbanding..." : "Disband Gang"}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Confirmation dialogs */}
            {confirming === "leave" && (
              <div className="mb-4 rounded-sm border border-pink-500/20 bg-pink-500/5 p-3 flex items-center justify-between animate-slide-in">
                <p className="text-xs font-mono text-pink-300">Are you sure you want to leave this gang?</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirming(null)} className="text-xs font-mono text-white/40 hover:text-white/70 px-2 py-1">Cancel</button>
                  <button onClick={handleLeave} className="text-xs font-mono text-pink-400 hover:text-pink-300 px-2 py-1">Confirm</button>
                </div>
              </div>
            )}

            {confirming === "disband" && (
              <div className="mb-4 rounded-sm border border-red-500/20 bg-red-500/5 p-3 flex items-center justify-between animate-slide-in">
                <p className="text-xs font-mono text-red-300">Permanently disband the gang? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirming(null)} className="text-xs font-mono text-white/40 hover:text-white/70 px-2 py-1">Cancel</button>
                  <button onClick={handleDisband} className="text-xs font-mono text-red-400 hover:text-red-300 px-2 py-1">Confirm</button>
                </div>
              </div>
            )}

            {/* Invite section — leader/lieutenant only */}
            {canInviteMembers && (
              <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4 reveal reveal-delay-1">
                <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Send size={12} /> Invite Player
                </h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                    placeholder="Enter username..."
                    className="flex-1 bg-black/30 border border-white/5 rounded-sm px-3 py-2 text-sm font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-pink-400/30 transition-all"
                    maxLength={20}
                  />
                  <button
                    onClick={handleInvite}
                    disabled={inviting || !inviteUsername.trim()}
                    className="font-mono tracking-wider text-xs uppercase text-pink-400/70 hover:text-pink-300 border border-pink-400/20 hover:border-pink-400/40 rounded-sm px-3 py-2 transition-all duration-150 hover:shadow-[0_0_8px_rgba(236,72,153,0.1)] flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {inviting ? (
                      <div className="animate-spin h-3 w-3 border-2 border-pink-400/30 border-t-pink-400 rounded-full" />
                    ) : (
                      <Send size={12} />
                    )}
                    Invite
                  </button>
                </div>
              </div>
            )}

            {/* Pending invites — leader/lieutenant only */}
            {canInviteMembers && pendingInvites.length > 0 && (
              <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4 reveal reveal-delay-1">
                <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Send size={12} /> Pending Invites ({pendingInvites.length})
                </h2>
                <div className="space-y-2">
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between bg-black/20 rounded-sm px-3 py-2 border border-white/5">
                      <div>
                        <p className="font-mono text-xs text-white/80">{invite.username}</p>
                        <p className="text-[10px] font-mono text-white/30">Invited {new Date(invite.createdAt).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => handleCancelInvite(invite.id)}
                        className="text-[10px] font-mono text-red-400/60 hover:text-red-400 px-2 py-1"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member list */}
            <div className="rounded-sm border border-white/5 bg-bg-dark/80 reveal reveal-delay-2">
              <div className="px-4 py-3 border-b border-white/5">
                <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider flex items-center gap-2">
                  <Users size={12} /> Members ({gang.memberCount})
                </h2>
              </div>

              <div className="divide-y divide-white/5">
                {gang.members.map((member) => {
                  const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
                  const RoleIcon = roleConfig.icon;
                  const badgeConfig = ROLE_BADGE[member.role] || ROLE_BADGE.member;
                  const currentRank = ROLE_HIERARCHY[member.role];
                  const nextRole = getNextRole(member.role);
                  const demoteRole = getDemoteRole(member.role);
                  const isMemberLeader = member.role === "leader";

                  return (
                    <div key={member.userId} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <RoleIcon size={15} className={`${roleConfig.color} shrink-0`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm text-white/80 truncate">{member.username}</span>
                            <span className={`text-[10px] font-mono ${badgeConfig.color} px-1.5 py-0.5 rounded-sm`}>
                              {roleConfig.label}
                            </span>
                            {member.userId === user?.id && (
                              <span className="text-[10px] font-mono text-white/20">(you)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs font-mono text-white/25">Lv.{member.level}</span>
                            <span className="text-xs font-mono text-white/20 flex items-center gap-1">
                              <DollarSign size={10} /> {member.netWorth?.toLocaleString() ?? 0} NW
                            </span>
                            <span className="text-xs font-mono text-white/20 flex items-center gap-1">
                              <TrendingUp size={10} /> {member.respect ?? 0} Res
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Leader actions */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        {isLeader && !isMemberLeader && member.userId !== user?.id && (
                          <>
                            {confirming === `kick-${member.userId}` ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleKick(member.userId, member.username)}
                                  disabled={actionLoading}
                                  className="text-[10px] font-mono text-pink-400 hover:text-pink-300 px-1.5 py-0.5"
                                >
                                  {actionLoading ? "..." : "Confirm"}
                                </button>
                                <button
                                  onClick={() => setConfirming(null)}
                                  className="text-[10px] font-mono text-white/30 hover:text-white/60 px-1.5 py-0.5"
                                >
                                  No
                                </button>
                              </div>
                            ) : confirming === `transfer-${member.userId}` ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleTransfer(member.userId, member.username)}
                                  disabled={actionLoading}
                                  className="text-[10px] font-mono text-yellow-400 hover:text-yellow-300 px-1.5 py-0.5"
                                >
                                  {actionLoading ? "..." : "Confirm"}
                                </button>
                                <button
                                  onClick={() => setConfirming(null)}
                                  className="text-[10px] font-mono text-white/30 hover:text-white/60 px-1.5 py-0.5"
                                >
                                  No
                                </button>
                              </div>
                            ) : confirming === `promote-${member.userId}` ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handlePromote(member.userId, member.username)}
                                  disabled={actionLoading}
                                  className="text-[10px] font-mono text-green-400 hover:text-green-300 px-1.5 py-0.5"
                                >
                                  {actionLoading ? "..." : "Confirm"}
                                </button>
                                <button
                                  onClick={() => setConfirming(null)}
                                  className="text-[10px] font-mono text-white/30 hover:text-white/60 px-1.5 py-0.5"
                                >
                                  No
                                </button>
                              </div>
                            ) : confirming === `demote-${member.userId}` ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleDemote(member.userId, member.username)}
                                  disabled={actionLoading}
                                  className="text-[10px] font-mono text-orange-400 hover:text-orange-300 px-1.5 py-0.5"
                                >
                                  {actionLoading ? "..." : "Confirm"}
                                </button>
                                <button
                                  onClick={() => setConfirming(null)}
                                  className="text-[10px] font-mono text-white/30 hover:text-white/60 px-1.5 py-0.5"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <>
                                {nextRole && (
                                  <button
                                    onClick={() => setConfirming(`promote-${member.userId}`)}
                                    className="text-[10px] font-mono text-green-500/50 hover:text-green-400 px-1.5 py-0.5 transition-colors"
                                    title={`Promote to ${nextRole}`}
                                  >
                                    <ChevronUp size={11} />
                                  </button>
                                )}
                                {demoteRole && (
                                  <button
                                    onClick={() => setConfirming(`demote-${member.userId}`)}
                                    className="text-[10px] font-mono text-orange-500/50 hover:text-orange-400 px-1.5 py-0.5 transition-colors"
                                    title={`Demote to ${demoteRole}`}
                                  >
                                    <ChevronDown size={11} />
                                  </button>
                                )}
                                <button
                                  onClick={() => setConfirming(`transfer-${member.userId}`)}
                                  className="text-[10px] font-mono text-yellow-500/50 hover:text-yellow-400 px-1.5 py-0.5 transition-colors"
                                  title="Transfer leadership"
                                >
                                  <Crown size={11} />
                                </button>
                                <button
                                  onClick={() => setConfirming(`kick-${member.userId}`)}
                                  className="text-[10px] font-mono text-red-400/50 hover:text-red-400 px-1.5 py-0.5 transition-colors"
                                  title="Kick member"
                                >
                                  <LogOut size={11} />
                                </button>
                              </>
                            )}
                          </>
                        )}
                        {/* Lieutenant can kick members */}
                        {isLieutenant && currentRank === 0 && member.userId !== user?.id && (
                          <>
                            {confirming === `kick-${member.userId}` ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleKick(member.userId, member.username)}
                                  disabled={actionLoading}
                                  className="text-[10px] font-mono text-pink-400 hover:text-pink-300 px-1.5 py-0.5"
                                >
                                  {actionLoading ? "..." : "Confirm"}
                                </button>
                                <button
                                  onClick={() => setConfirming(null)}
                                  className="text-[10px] font-mono text-white/30 hover:text-white/60 px-1.5 py-0.5"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirming(`kick-${member.userId}`)}
                                className="text-[10px] font-mono text-red-400/50 hover:text-red-400 px-1.5 py-0.5 transition-colors"
                                title="Kick member"
                              >
                                <LogOut size={11} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </GameLayout>
  );
}
