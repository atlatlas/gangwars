"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GameLayout from "@/components/GameLayout";
import { gangs as gangsApi } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { useTopNotification } from "@/components/TopNotification";
import { TurfDistrict, GangTurfEntry, TurfOverviewData, TurfTerritory } from "@/types";
import { Map, Shield, DollarSign, Crown, Swords, ArrowLeft, TrendingUp, Skull, Users, Crosshair, ArmchairIcon } from "lucide-react";

function InfluenceBar({ influence, nextLevel }: { influence: number; nextLevel: TurfTerritory["nextLevel"] }) {
  const pct = Math.min(100, Math.round(nextLevel.progress * 100));
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden shadow-[inset_0_0_4px_rgba(0,0,0,0.3)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-500/50 to-cyan-400/60 shadow-[0_0_6px_rgba(6,182,212,0.2)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-white/40 w-12 text-right tabular-nums">
        {pct}%
      </span>
    </div>
  );
}

function TerritoryCard({ territory }: { territory: TurfTerritory }) {
  return (
    <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-purple-400" />
          <span className="font-mono text-sm text-white/90">{territory.name}</span>
        </div>
        <span className="text-[10px] font-mono text-cyan-400/80 border border-cyan-400/20 rounded-sm px-1.5 py-0.5">
          Lv.{territory.level}
        </span>
      </div>

      {/* Influence bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">Influence</span>
          <span className="text-[9px] font-mono text-white/40">
            {territory.influence} / {territory.nextLevel.nextThreshold}
          </span>
        </div>
        <InfluenceBar influence={territory.influence} nextLevel={territory.nextLevel} />
      </div>

      {/* Bonuses */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {territory.crimeBonus > 0 && (
          <span className="text-[9px] font-mono text-green-400/70 bg-green-400/5 border border-green-400/10 rounded-sm px-1.5 py-0.5">
            +{territory.crimeBonus}% Crime
          </span>
        )}
        {territory.pvpBonus > 0 && (
          <span className="text-[9px] font-mono text-orange-400/70 bg-orange-400/5 border border-orange-400/10 rounded-sm px-1.5 py-0.5">
            +{territory.pvpBonus}% PvP
          </span>
        )}
        {territory.incomeBonus > 0 && (
          <span className="text-[9px] font-mono text-cyan-400/70 bg-cyan-400/5 border border-cyan-400/10 rounded-sm px-1.5 py-0.5">
            +{territory.incomeBonus}% Income
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-[10px] font-mono text-white/30 leading-relaxed">{territory.description}</p>
    </div>
  );
}

export default function TurfPage() {
  const router = useRouter();
  const { user, refreshUser } = useUser();
  const { showNotification } = useTopNotification();
  const [districts, setDistricts] = useState<(TurfDistrict & { owner: GangTurfEntry | null })[]>([]);
  const [overview, setOverview] = useState<TurfOverviewData | null>(null);
  const [vault, setVault] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "districts">("overview");

  const gangId = user?.gangId;

  useEffect(() => {
    if (!gangId) {
      router.push("/gangs");
      return;
    }
    loadData();
  }, [gangId]);

  const loadData = async () => {
    if (!gangId) return;
    setLoading(true);
    try {
      const [turfData, overviewData] = await Promise.all([
        gangsApi.turf.list(gangId),
        gangsApi.turf.overview(gangId),
      ]);
      setDistricts(turfData.districts);
      setVault(turfData.vault);
      setOverview(overviewData);
    } catch (err: any) {
      showNotification(err.message || "Failed to load turf", "error");
    }
    setLoading(false);
  };

  const handleClaim = async (districtId: number, name: string) => {
    if (!gangId) return;
    setActionLoading(`claim-${districtId}`);
    try {
      const result = await gangsApi.turf.claim(gangId, districtId);
      showNotification(`Claimed ${name}!`, "success");
      await refreshUser();
      loadData();
    } catch (err: any) {
      showNotification(err.message || "Failed to claim district", "error");
    }
    setActionLoading(null);
  };

  const handleChallenge = async (districtId: number, name: string) => {
    if (!gangId) return;
    setActionLoading(`challenge-${districtId}`);
    try {
      const result = await gangsApi.turf.challenge(gangId, districtId);
      showNotification(result.message || `Challenged for ${name}!`, "success");
      await refreshUser();
      loadData();
    } catch (err: any) {
      showNotification(err.message || "Failed to challenge", "error");
    }
    setActionLoading(null);
  };

  const handleAbandon = async (districtId: number, name: string) => {
    if (!gangId) return;
    setActionLoading(`abandon-${districtId}`);
    try {
      const result = await gangsApi.turf.abandon(gangId, districtId);
      showNotification(result.message || `Abandoned ${name}`, "success");
      await refreshUser();
      loadData();
    } catch (err: any) {
      showNotification(err.message || "Failed to abandon", "error");
    }
    setActionLoading(null);
  };

  const isOwnDistrict = (owner: GangTurfEntry | null) => {
    return owner && gangId && owner.gangId === gangId;
  };

  const handleAssignArsenal = async (arsenalId: number, turfId: number | null) => {
    if (!gangId) return;
    setActionLoading(`arsenal-${arsenalId}`);
    try {
      if (turfId) {
        await gangsApi.arsenal.assignTurf(gangId, arsenalId, turfId);
      } else {
        await gangsApi.arsenal.unassignTurf(gangId, arsenalId);
      }
      showNotification(turfId ? "Assigned to territory" : "Unassigned from territory", "success");
      loadData();
    } catch (err: any) {
      showNotification(err.message || "Failed to update arsenal assignment", "error");
    }
    setActionLoading(null);
  };

  const myTerritories = overview?.territories ?? [];

  return (
    <GameLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Back */}
        <button
          onClick={() => router.push(`/gangs/${gangId}`)}
          className="flex items-center gap-1.5 text-xs font-mono text-white/30 hover:text-white/60 transition-colors mb-4"
        >
          <ArrowLeft size={12} /> Back to Gang
        </button>

        {/* Header */}
        <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4 reveal">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Map size={20} className="text-purple-400" />
              <div>
                <h1 className="text-lg font-mono text-white/90">Turf</h1>
                <p className="text-xs font-mono text-white/30">Claim and manage districts</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono text-white/30">Vault</p>
              <p className="font-mono text-sm text-cyan-300">${vault.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-4">
          <button
            onClick={() => setActiveTab("overview")}
            className={`text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 rounded-sm border transition-all ${
              activeTab === "overview"
                ? "border-purple-400/30 text-purple-400/80 bg-purple-500/5"
                : "border-white/5 text-white/30 hover:text-white/50"
            }`}
          >
            Territory Overview
          </button>
          <button
            onClick={() => setActiveTab("districts")}
            className={`text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 rounded-sm border transition-all ${
              activeTab === "districts"
                ? "border-purple-400/30 text-purple-400/80 bg-purple-500/5"
                : "border-white/5 text-white/30 hover:text-white/50"
            }`}
          >
            All Districts
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-400/30 border-t-pink-400" />
          </div>
        )}

        {!loading && activeTab === "overview" && (
          <div className="space-y-4">
            {/* Territory cards */}
            {myTerritories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myTerritories.map((t) => (
                  <TerritoryCard key={t.districtId} territory={t} />
                ))}
              </div>
            ) : (
              <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-8 text-center">
                <Shield size={32} className="mx-auto text-white/10 mb-3" />
                <p className="text-sm font-mono text-white/30 mb-1">No territories claimed</p>
                <p className="text-xs font-mono text-white/20">Go to All Districts to claim your first territory.</p>
              </div>
            )}

            {/* Gang stats */}
            <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-3 flex items-center gap-1.5">
                <Users size={12} className="text-cyan-400" /> Gang
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-sm border border-white/5 bg-bg-deep/60 p-3">
                  <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">Members</span>
                  <p className="text-sm font-mono text-white/70 mt-0.5">
                    {overview?.memberCount ?? 0} <span className="text-white/30">/ {overview?.maxMembers ?? 0}</span>
                  </p>
                </div>
                <div className="rounded-sm border border-white/5 bg-bg-deep/60 p-3">
                  <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">Territories</span>
                  <p className="text-sm font-mono text-white/70 mt-0.5">
                    {myTerritories.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Arsenal assignment */}
            {overview && overview.arsenal.length > 0 && (
              <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4">
                <h3 className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-3 flex items-center gap-1.5">
                  <Crosshair size={12} className="text-orange-400" /> Arsenal Assignment
                </h3>
                <div className="space-y-1.5">
                  {overview.arsenal.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-sm border border-white/5 bg-bg-deep/60 p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-white/70">{item.name}</span>
                        <span className="text-[9px] font-mono text-white/30">PvP: +{item.pvpPower}</span>
                        {item.assignedTurfId && (
                          <span className="text-[9px] font-mono text-cyan-400/60">
                            → {myTerritories.find(t => t.districtId === item.assignedTurfId)?.name ?? "Unknown"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {myTerritories.length > 0 && (
                          <select
                            value={item.assignedTurfId ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleAssignArsenal(item.id, val ? parseInt(val) : null);
                            }}
                            className="text-[9px] font-mono bg-bg-deep border border-white/10 text-white/60 rounded-sm px-1.5 py-1"
                          >
                            <option value="">Unassigned</option>
                            {myTerritories.map((t) => (
                              <option key={t.districtId} value={t.districtId}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        )}
                        {item.assignedTurfId && (
                          <button
                            onClick={() => handleAssignArsenal(item.id, null)}
                            disabled={actionLoading === `arsenal-${item.id}`}
                            className="text-[9px] font-mono text-red-400/60 hover:text-red-400/80 transition-colors"
                          >
                            {actionLoading === `arsenal-${item.id}` ? "..." : "Unassign"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* District grid */}
        {!loading && activeTab === "districts" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {districts.map((district) => {
              const owned = isOwnDistrict(district.owner);
              const otherOwned = district.owner && !owned;

              return (
                <div
                  key={district.id}
                  className={`rounded-sm border p-4 ${
                    owned ? "border-green-500/30 bg-green-500/5" :
                    otherOwned ? "border-red-500/20 bg-red-500/5" :
                    "border-white/5 bg-bg-dark/80"
                  }`}
                >
                  {/* District name + owner */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-mono text-sm text-white/90">{district.name}</h3>
                      <p className="text-xs font-mono text-white/40 leading-relaxed">{district.description}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      {district.owner ? (
                        <div className="flex items-center gap-1 text-xs font-mono">
                          <Crown size={10} className={owned ? "text-green-400" : "text-red-400"} />
                          <span className={owned ? "text-green-400" : "text-red-400"}>
                            [{district.owner.gangTag}]
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-white/25">Unowned</span>
                      )}
                    </div>
                  </div>

                  {/* Level & influence for owned */}
                  {owned && district.owner && (
                    <div className="mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-mono text-cyan-400/70">Lv.{district.owner.level ?? 1}</span>
                        <span className="text-[9px] font-mono text-white/30">
                          Influence: {district.owner.influence ?? 0}
                        </span>
                        {(district.owner.effectiveCrimeBonus ?? 0) > 0 && (
                          <span className="text-[9px] font-mono text-green-400/60">
                            +{district.owner.effectiveCrimeBonus}% Crime
                          </span>
                        )}
                        {(district.owner.effectivePvpBonus ?? 0) > 0 && (
                          <span className="text-[9px] font-mono text-orange-400/60">
                            +{district.owner.effectivePvpBonus}% PvP
                          </span>
                        )}
                        {(district.owner.effectiveIncomeBonus ?? 0) > 0 && (
                          <span className="text-[9px] font-mono text-cyan-400/60">
                            +{district.owner.effectiveIncomeBonus}% Income
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bonuses (base) */}
                  <div className="flex gap-3 mb-3 text-[10px] font-mono">
                    {district.crimeBonus > 0 && (
                      <span className="text-green-400/70">
                        +{district.crimeBonus}% {owned && (district.owner?.level ?? 1) > 1 ? "(base) " : ""}Crime
                      </span>
                    )}
                    {district.pvpBonus > 0 && (
                      <span className="text-orange-400/70">
                        +{district.pvpBonus}% {owned && (district.owner?.level ?? 1) > 1 ? "(base) " : ""}PvP
                      </span>
                    )}
                    {district.incomeBonus > 0 && (
                      <span className="text-cyan-400/70">
                        +{district.incomeBonus}% {owned && (district.owner?.level ?? 1) > 1 ? "(base) " : ""}Income
                      </span>
                    )}
                  </div>

                  {/* Defense power for owned */}
                  {owned && (district.owner?.defensePower ?? 0) > 0 && (
                    <div className="mb-2 text-[9px] font-mono text-orange-400/50">
                      Defense: +{district.owner?.defensePower} from arsenal
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!district.owner && (
                      <button
                        onClick={() => handleClaim(district.id, district.name)}
                        disabled={actionLoading?.startsWith("claim")}
                        className="font-mono text-xs uppercase text-green-400/70 border border-green-400/20 rounded-sm px-3 py-1.5 hover:border-green-400/40 transition-all disabled:opacity-30"
                      >
                        {actionLoading === `claim-${district.id}` ? (
                          <div className="animate-spin h-3 w-3 border-2 border-green-400/30 border-t-green-400 rounded-full mx-auto" />
                        ) : (
                          `Claim $${district.claimCost.toLocaleString()}`
                        )}
                      </button>
                    )}

                    {otherOwned && (
                      <button
                        onClick={() => handleChallenge(district.id, district.name)}
                        disabled={actionLoading?.startsWith("challenge")}
                        className="font-mono text-xs uppercase text-orange-400/70 border border-orange-400/20 rounded-sm px-3 py-1.5 hover:border-orange-400/40 transition-all disabled:opacity-30"
                      >
                        {actionLoading === `challenge-${district.id}` ? (
                          <div className="animate-spin h-3 w-3 border-2 border-orange-400/30 border-t-orange-400 rounded-full mx-auto" />
                        ) : (
                          "Challenge"
                        )}
                      </button>
                    )}

                    {owned && (
                      <button
                        onClick={() => handleAbandon(district.id, district.name)}
                        disabled={actionLoading?.startsWith("abandon")}
                        className="font-mono text-xs uppercase text-red-400/60 border border-red-400/20 rounded-sm px-3 py-1.5 hover:border-red-400/40 transition-all disabled:opacity-30"
                      >
                        {actionLoading === `abandon-${district.id}` ? (
                          <div className="animate-spin h-3 w-3 border-2 border-red-400/30 border-t-red-400 rounded-full mx-auto" />
                        ) : (
                          "Abandon"
                        )}
                      </button>
                    )}

                    {otherOwned && district.owner?.challengedBy && (
                      <span className="text-[10px] font-mono text-yellow-400/60">
                        Under challenge
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && activeTab === "districts" && districts.length === 0 && (
          <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-8 text-center">
            <Map size={32} className="mx-auto text-white/10 mb-3" />
            <p className="text-sm font-mono text-white/30">No districts available</p>
          </div>
        )}
      </div>
    </GameLayout>
  );
}
