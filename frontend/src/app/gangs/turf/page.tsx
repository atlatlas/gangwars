"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GameLayout from "@/components/GameLayout";
import { gangs as gangsApi } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { useTopNotification } from "@/components/TopNotification";
import { TurfDistrict, GangTurfEntry } from "@/types";
import { Map, Shield, DollarSign, Crown, Swords, ArrowLeft, TrendingUp, Skull } from "lucide-react";

export default function TurfPage() {
  const router = useRouter();
  const { user, refreshUser } = useUser();
  const { showNotification } = useTopNotification();
  const [districts, setDistricts] = useState<(TurfDistrict & { owner: GangTurfEntry | null })[]>([]);
  const [vault, setVault] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const gangId = user?.gangId;

  useEffect(() => {
    if (!gangId) {
      router.push("/gangs");
      return;
    }
    loadTurf();
  }, [gangId]);

  const loadTurf = async () => {
    if (!gangId) return;
    setLoading(true);
    try {
      const data = await gangsApi.turf.list(gangId);
      setDistricts(data.districts);
      setVault(data.vault);
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
      loadTurf();
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
      loadTurf();
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
      loadTurf();
    } catch (err: any) {
      showNotification(err.message || "Failed to abandon", "error");
    }
    setActionLoading(null);
  };

  const isOwnDistrict = (owner: GangTurfEntry | null) => {
    return owner && gangId && owner.gangId === gangId;
  };

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
                <p className="text-xs font-mono text-white/30">Claim districts for your gang</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono text-white/30">Vault</p>
              <p className="font-mono text-sm text-cyan-300">${vault.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-400/30 border-t-pink-400" />
          </div>
        )}

        {/* District grid */}
        {!loading && (
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

                  {/* Bonuses */}
                  <div className="flex gap-3 mb-3 text-[10px] font-mono">
                    {district.crimeBonus > 0 && (
                      <span className="text-green-400/70">+{district.crimeBonus}% Crime</span>
                    )}
                    {district.pvpBonus > 0 && (
                      <span className="text-orange-400/70">+{district.pvpBonus}% PvP</span>
                    )}
                    {district.incomeBonus > 0 && (
                      <span className="text-cyan-400/70">+{district.incomeBonus}% Income</span>
                    )}
                  </div>

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

        {!loading && districts.length === 0 && (
          <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-8 text-center">
            <Map size={32} className="mx-auto text-white/10 mb-3" />
            <p className="text-sm font-mono text-white/30">No districts available</p>
          </div>
        )}
      </div>
    </GameLayout>
  );
}
