"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GameLayout from "@/components/GameLayout";
import { gangs as gangsApi } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { useToast } from "@/components/Toast";
import { Gang, GangInvite } from "@/types";
import { Users, Plus, Shield, ChevronRight, X, Mail, Check, X as XIcon } from "lucide-react";

export default function GangsPage() {
  const router = useRouter();
  const { user, refreshUser } = useUser();
  const { toast } = useToast();
  const [gangs, setGangs] = useState<Gang[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [invites, setInvites] = useState<GangInvite[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [joining, setJoining] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", tag: "", description: "" });

  useEffect(() => {
    loadGangs();
    loadInvites();
  }, []);

  const loadInvites = async () => {
    try {
      const data = await gangsApi.myInvites();
      setInvites(data);
    } catch {}
  };

  const handleAcceptInvite = async (inviteId: number) => {
    setInviteLoading(true);
    try {
      const data = await gangsApi.acceptInvite(inviteId);
      await refreshUser();
      toast("Joined gang!", "success");
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      loadGangs();
      if (data.gangId) {
        router.push(`/gangs/${data.gangId}`);
      }
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeclineInvite = async (inviteId: number) => {
    setInviteLoading(true);
    try {
      await gangsApi.declineInvite(inviteId);
      toast("Invite declined", "success");
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setInviteLoading(false);
    }
  };

  const loadGangs = async () => {
    setError("");
    try {
      const data = await gangsApi.list();
      setGangs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await gangsApi.create(form);
      await refreshUser();
      toast("Gang created!", "success");
      setShowCreate(false);
      setForm({ name: "", tag: "", description: "" });
      loadGangs();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (gangId: number) => {
    setJoining(gangId);
    try {
      await gangsApi.join(gangId);
      await refreshUser();
      toast("Joined gang!", "success");
      loadGangs();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setJoining(null);
    }
  };

  if (!user) return null;

  return (
    <GameLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5 reveal">
          <div>
            <h1 className="text-lg font-mono tracking-wider text-white/90 flex items-center gap-2 uppercase">
              <Users size={16} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" /> Gangs
            </h1>
            <p className="text-xs font-mono text-white/30 tracking-wider mt-1">Create or join a crew</p>
          </div>
        </div>

        {/* My Gang banner */}
        {user.gangId && user.gangTag && (
          <div className="mb-5 rounded-sm border border-purple-500/20 bg-purple-500/5 p-4 reveal reveal-delay-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield size={18} className="text-purple-400" />
                <div>
                  <p className="font-mono text-sm text-purple-300">
                    [{user.gangTag}] {user.gangName}
                  </p>
                  <p className="text-xs font-mono text-white/30 mt-0.5">
                    {user.gangRole === "leader" ? "Gang Leader" : "Member"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/gangs/${user.gangId}`)}
                className="flex items-center gap-1 text-xs font-mono text-purple-400/60 hover:text-purple-300 transition-colors"
              >
                Manage <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Pending invites */}
        {invites.length > 0 && (
          <div className="mb-5 space-y-2 reveal reveal-delay-1">
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
              className="mb-5 flex items-center gap-2 px-4 py-2 rounded-sm border border-white/5 bg-bg-dark/80 text-xs font-mono text-white/60 hover:text-white/90 hover:border-pink-400/30 transition-all reveal reveal-delay-1"
            >
              {showCreate ? <X size={14} /> : <Plus size={14} />}
              {showCreate ? "Cancel" : "Create Gang"}
            </button>

            {showCreate && (
              <form
                onSubmit={handleCreate}
                className="mb-5 rounded-sm border border-white/5 bg-bg-dark/80 p-4 animate-slide-in reveal reveal-delay-2"
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

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-sm border border-red-500/20 bg-red-500/5 p-3 reveal">
            <p className="text-xs font-mono text-red-400">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-400/30 border-t-pink-400" />
          </div>
        ) : (
          <>
            {/* Empty state */}
            {gangs.length === 0 && (
              <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-8 text-center reveal">
                <Users size={32} className="mx-auto text-white/10 mb-3" />
                <p className="text-sm font-mono text-white/30">No gangs exist yet</p>
                <p className="text-xs font-mono text-white/20 mt-1">Be the first to create one</p>
              </div>
            )}

            {/* Gang list */}
            {gangs.length > 0 && (
              <div className="space-y-2 reveal reveal-delay-2">
                {gangs.map((gang) => {
                  const isFull = (gang.memberCount ?? 0) >= gang.maxMembers;
                  return (
                    <div
                      key={gang.id}
                      className="rounded-sm border border-white/5 bg-bg-dark/80 p-3.5 flex items-center justify-between hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Shield size={16} className="text-purple-400/60 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-white/90 truncate">{gang.name}</span>
                            <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-sm shrink-0">
                              [{gang.tag}]
                            </span>
                          </div>
                          <p className="text-xs font-mono text-white/25 mt-0.5">
                            Lv.{gang.level} &middot; {gang.memberCount}/{gang.maxMembers} members
                          </p>
                        </div>
                      </div>

                      {!user.gangId && (
                        <button
                          onClick={() => handleJoin(gang.id)}
                          disabled={joining === gang.id || isFull}
                          className={`shrink-0 ml-3 text-xs font-mono tracking-wider uppercase px-3 py-1.5 rounded-sm transition-all ${
                            isFull
                              ? "text-white/20 border border-white/5 cursor-not-allowed"
                              : "text-pink-400/70 hover:text-pink-300 border border-pink-400/20 hover:border-pink-400/40 hover:shadow-[0_0_8px_rgba(236,72,153,0.1)]"
                          }`}
                        >
                          {joining === gang.id ? (
                            <div className="animate-spin h-3 w-3 border-2 border-pink-400/30 border-t-pink-400 rounded-full mx-auto" />
                          ) : isFull ? (
                            "Full"
                          ) : (
                            "Join"
                          )}
                        </button>
                      )}

                      {user.gangId === gang.id && (
                        <button
                          onClick={() => router.push(`/gangs/${gang.id}`)}
                          className="shrink-0 ml-3 text-xs font-mono text-purple-400/60 hover:text-purple-300 transition-colors"
                        >
                          View
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </GameLayout>
  );
}
