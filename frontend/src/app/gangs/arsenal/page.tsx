"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GameLayout from "@/components/GameLayout";
import { gangs as gangsApi } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { useToast } from "@/components/Toast";
import { Swords, Shield, ArrowLeft, DollarSign, Wrench, Crosshair, Eye } from "lucide-react";

interface ArsenalItem {
  id: number;
  gangId: number;
  name: string;
  type: string;
  durability: number;
  maxDurability: number;
  pvpPower: number;
  crimeBonus: number;
  purchasePrice: number;
  purchasedAt: string;
  equippedBy: number | null;
  equippedToUsername: string | null;
}

interface ArsenalLog {
  id: number;
  action: string;
  details: string | null;
  createdAt: string;
}

interface ArsenalData {
  catalog: { name: string; type: string; pvpPower: number; crimeBonus: number; price: number }[];
  items: ArsenalItem[];
  logs: ArsenalLog[];
  vault: number;
}

const TYPE_ICONS: Record<string, typeof Swords> = {
  melee: Swords,
  firearm: Crosshair,
  explosive: Eye,
  armor: Shield,
};

const TYPE_COLORS: Record<string, string> = {
  melee: "text-orange-400",
  firearm: "text-red-400",
  explosive: "text-yellow-400",
  armor: "text-cyan-400",
};

export default function ArsenalPage() {
  const router = useRouter();
  const { user, refreshUser } = useUser();
  const { toast } = useToast();
  const [data, setData] = useState<ArsenalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const gangId = user?.gangId;

  useEffect(() => {
    if (!gangId) {
      router.push("/gangs");
      return;
    }
    loadArsenal();
  }, [gangId]);

  const loadArsenal = async () => {
    if (!gangId) return;
    setLoading(true);
    try {
      const result = await gangsApi.arsenal.list(gangId);
      setData(result);
    } catch (err: any) {
      toast(err.message || "Failed to load arsenal", "error");
    }
    setLoading(false);
  };

  const handleBuy = async (name: string) => {
    if (!gangId) return;
    setActionLoading(`buy-${name}`);
    try {
      await gangsApi.arsenal.buy(gangId, name);
      toast(`Purchased ${name}!`, "success");
      await refreshUser();
      loadArsenal();
    } catch (err: any) {
      toast(err.message || "Failed to purchase", "error");
    }
    setActionLoading(null);
  };

  const handleEquip = async (arsenalId: number) => {
    if (!gangId) return;
    setActionLoading(`equip-${arsenalId}`);
    try {
      await gangsApi.arsenal.equip(gangId, arsenalId);
      toast("Item equipped!", "success");
      loadArsenal();
    } catch (err: any) {
      toast(err.message || "Failed to equip", "error");
    }
    setActionLoading(null);
  };

  const handleUnequip = async (arsenalId: number) => {
    if (!gangId) return;
    setActionLoading(`unequip-${arsenalId}`);
    try {
      await gangsApi.arsenal.unequip(gangId, arsenalId);
      toast("Item unequipped!", "success");
      loadArsenal();
    } catch (err: any) {
      toast(err.message || "Failed to unequip", "error");
    }
    setActionLoading(null);
  };

  const handleRepair = async (arsenalId: number) => {
    if (!gangId) return;
    setActionLoading(`repair-${arsenalId}`);
    try {
      await gangsApi.arsenal.repair(gangId, arsenalId);
      toast("Item repaired!", "success");
      await refreshUser();
      loadArsenal();
    } catch (err: any) {
      toast(err.message || "Failed to repair", "error");
    }
    setActionLoading(null);
  };

  const isLeaderOrLT = user?.gangRole === "leader" || user?.gangRole === "lieutenant";

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
              <Swords size={20} className="text-purple-400" />
              <div>
                <h1 className="text-lg font-mono text-white/90">Gang Arsenal</h1>
                <p className="text-xs font-mono text-white/30">Shared weapons and equipment</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono text-white/30">Vault</p>
              <p className="font-mono text-sm text-cyan-300">${data?.vault?.toLocaleString() ?? 0}</p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-400/30 border-t-pink-400" />
          </div>
        )}

        {!loading && data && (
          <>
            {/* Owned Items */}
            <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4 reveal">
              <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider flex items-center gap-2 mb-3">
                <Shield size={12} /> Owned Items ({data.items.length})
              </h2>

              {data.items.length === 0 && (
                <p className="text-xs font-mono text-white/25 py-4 text-center">No arsenal items yet. Buy from the catalog below.</p>
              )}

              <div className="space-y-2">
                {data.items.map((item) => {
                  const TypeIcon = TYPE_ICONS[item.type] || Swords;
                  const typeColor = TYPE_COLORS[item.type] || "text-white/40";
                  const isEquippedByMe = item.equippedBy === user?.id;
                  const isBroken = item.durability <= 0;
                  const dmgPct = item.maxDurability > 0 ? (item.durability / item.maxDurability) * 100 : 0;
                  const durColor = dmgPct > 50 ? "bg-green-500" : dmgPct > 25 ? "bg-yellow-500" : "bg-red-500";

                  return (
                    <div key={item.id} className={`bg-black/20 rounded-sm p-3 border ${isEquippedByMe ? "border-green-500/30" : "border-white/5"}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <TypeIcon size={14} className={typeColor} />
                          <div>
                            <span className="font-mono text-sm text-white/90">{item.name}</span>
                            <span className="text-[10px] font-mono text-white/30 ml-2 uppercase">{item.type}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="text-orange-400/70">+{item.pvpPower} PvP</span>
                          {item.crimeBonus > 0 && (
                            <span className="text-green-400/70">+{item.crimeBonus} Crime</span>
                          )}
                        </div>
                      </div>

                      {/* Durability bar */}
                      <div className="mb-2">
                        <div className="flex justify-between text-[10px] font-mono text-white/30 mb-0.5">
                          <span>Durability</span>
                          <span>{item.durability}/{item.maxDurability}</span>
                        </div>
                        <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden">
                          <div className={`h-full ${durColor} rounded-full transition-all`} style={{ width: `${dmgPct}%` }} />
                        </div>
                      </div>

                      {/* Equip status + actions */}
                      <div className="flex items-center gap-2">
                        {isEquippedByMe && (
                          <span className="text-[10px] font-mono text-green-400/80 mr-1">Equipped</span>
                        )}
                        {item.equippedToUsername && !isEquippedByMe && (
                          <span className="text-[10px] font-mono text-white/30 mr-1">Used by {item.equippedToUsername}</span>
                        )}

                        {!item.equippedBy && (
                          <button
                            onClick={() => handleEquip(item.id)}
                            disabled={actionLoading?.startsWith("equip") || isBroken}
                            className="font-mono text-[10px] uppercase text-green-400/60 border border-green-400/20 rounded-sm px-2 py-1 hover:border-green-400/40 transition-all disabled:opacity-30"
                          >
                            {actionLoading === `equip-${item.id}` ? "..." : "Equip"}
                          </button>
                        )}

                        {isEquippedByMe && (
                          <button
                            onClick={() => handleUnequip(item.id)}
                            disabled={actionLoading?.startsWith("unequip")}
                            className="font-mono text-[10px] uppercase text-yellow-400/60 border border-yellow-400/20 rounded-sm px-2 py-1 hover:border-yellow-400/40 transition-all disabled:opacity-30"
                          >
                            {actionLoading === `unequip-${item.id}` ? "..." : "Unequip"}
                          </button>
                        )}

                        {isBroken && (
                          <span className="text-[10px] font-mono text-red-400/80">Broken</span>
                        )}

                        {isLeaderOrLT && !isBroken && item.durability < item.maxDurability && (
                          <button
                            onClick={() => handleRepair(item.id)}
                            disabled={actionLoading?.startsWith("repair")}
                            className="font-mono text-[10px] uppercase text-cyan-400/60 border border-cyan-400/20 rounded-sm px-2 py-1 hover:border-cyan-400/40 transition-all disabled:opacity-30"
                          >
                            {actionLoading === `repair-${item.id}` ? "..." : "Repair"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Buy Catalog */}
            {isLeaderOrLT && (
              <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4 reveal">
                <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <DollarSign size={12} /> Buy Arsenal
                </h2>
                <div className="space-y-2">
                  {data.catalog.map((item) => (
                    <div key={item.name} className="bg-black/20 rounded-sm p-3 border border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-white/90">{item.name}</span>
                          <span className="text-[10px] font-mono text-white/30 uppercase">{item.type}</span>
                        </div>
                        <button
                          onClick={() => handleBuy(item.name)}
                          disabled={actionLoading === `buy-${item.name}` || (data.vault ?? 0) < item.price}
                          className="font-mono text-xs uppercase text-pink-400/70 border border-pink-400/20 rounded-sm px-3 py-1.5 hover:border-pink-400/40 transition-all disabled:opacity-30"
                        >
                          {actionLoading === `buy-${item.name}` ? "..." : `$${item.price.toLocaleString()}`}
                        </button>
                      </div>
                      <div className="flex gap-3 text-[10px] font-mono">
                        <span className="text-orange-400/70">+{item.pvpPower} PvP</span>
                        {item.crimeBonus > 0 && (
                          <span className="text-green-400/70">+{item.crimeBonus} Crime</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Log */}
            {data.logs.length > 0 && (
              <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 reveal">
                <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Eye size={12} /> Activity Log
                </h2>
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {data.logs.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between text-[10px] font-mono text-white/30 py-0.5">
                      <span>{log.details || log.action}</span>
                      <span className="text-white/15">{new Date(log.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </GameLayout>
  );
}
