"use client";

import { useState, useEffect } from "react";
import GameLayout from "@/components/GameLayout";
import { hoes as hoesApi } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { useTopNotification } from "@/components/TopNotification";
import { DollarSign, Users, Eye, TrendingUp, RefreshCw, Plus, ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";

interface Hoe {
  id: number;
  itemId: number;
  name: string;
  description: string;
  baseIncome: number;
  effectiveIncome: number;
  pendingEarnings: number;
  lastCollectedAt: string;
  hoursElapsed: number;
}

interface AvailableHoe {
  id: number;
  name: string;
  description: string;
  buyPrice: number;
  minLevel: number;
  incomePerHour: number;
}

interface HoeGroup {
  name: string;
  count: number;
  totalPending: number;
  totalIncome: number;
  items: Hoe[];
}

export default function HoesPage() {
  const { user, refreshUser } = useUser();
  const { showNotification } = useTopNotification();
  const [hoes, setHoes] = useState<Hoe[]>([]);
  const [available, setAvailable] = useState<AvailableHoe[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [buying, setBuying] = useState<number | null>(null);
  const [firing, setFiring] = useState<number | null>(null);
  const [womensStudiesLevel, setWomensStudiesLevel] = useState(0);
  const [sexualEdLevel, setSexualEdLevel] = useState(0);
  const [pimpCount, setPimpCount] = useState(0);
  const [unprotectedHoes, setUnprotectedHoes] = useState(0);
  const [protectedCapacity, setProtectedCapacity] = useState(0);
  const [kidnapped, setKidnapped] = useState<string[]>([]);

  const loadHoes = async () => {
    try {
      const data = await hoesApi.list();
      setHoes(data.hoes);
      setAvailable(data.available);
      setTotalPending(data.totalPending);
      setWomensStudiesLevel(data.womensStudiesLevel ?? 0);
      setSexualEdLevel(data.sexualEdLevel ?? 0);
      setPimpCount(data.pimpCount ?? 0);
      setUnprotectedHoes(data.unprotectedHoes ?? 0);
      setProtectedCapacity(data.protectedCapacity ?? 0);
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHoes();
  }, []);

  const handleCollect = async () => {
    setCollecting(true);
    try {
      const data = await hoesApi.collect();
      if (data.kidnapped && data.kidnapped.length > 0) {
        setKidnapped(data.kidnapped);
        showNotification(`Some hoes got kidnapped! You need more pimps.`, "error");
      } else if (data.totalCollected > 0) {
        showNotification(`Collected $${data.totalCollected.toLocaleString()} from your hoes!`, "success");
      } else {
        showNotification(data.message || "Nothing to collect yet", "info");
      }
      await refreshUser();
      await loadHoes();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setCollecting(false);
    }
  };

  const handleBuy = async (itemId: number) => {
    setBuying(itemId);
    try {
      const data = await hoesApi.buy(itemId);
      showNotification(`Recruited ${data.itemName}!`, "success");
      await refreshUser();
      await loadHoes();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setBuying(null);
    }
  };

  const handleFire = async (inventoryId: number, name: string) => {
    setFiring(inventoryId);
    try {
      await hoesApi.fire(inventoryId);
      showNotification(`Fired ${name}`, "success");
      await loadHoes();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setFiring(null);
    }
  };

  // Group owned hoes by name
  const groupedHoes = hoes.reduce<Record<string, HoeGroup>>((acc, hoe) => {
    if (!acc[hoe.name]) {
      acc[hoe.name] = {
        name: hoe.name,
        count: 0,
        totalPending: 0,
        totalIncome: 0,
        items: [],
      };
    }
    acc[hoe.name].count++;
    acc[hoe.name].totalPending += hoe.pendingEarnings;
    acc[hoe.name].totalIncome += hoe.effectiveIncome;
    acc[hoe.name].items.push(hoe);
    return acc;
  }, {});

  const groupedHoesList = Object.values(groupedHoes);

  return (
    <GameLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-5 reveal">
          <h1 className="text-lg font-mono tracking-wider text-white/90 flex items-center gap-2 uppercase">
            <Eye size={16} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" /> Hoes
          </h1>
          <p className="text-xs font-mono text-white/30 tracking-wider mt-1">Manage your stable. They work for you.</p>
        </div>

        {/* Pending earnings banner */}
        {totalPending > 0 && (
          <div className="rounded-sm border border-pink-500/25 bg-pink-500/[0.04] p-4 mb-4 reveal animate-slide-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign size={20} className="text-pink-400" />
                <div>
                  <p className="font-mono text-sm tracking-wider text-pink-300">${totalPending.toLocaleString()} pending</p>
                  <p className="text-xs font-mono text-white/30">Your hoes have been working. Collect their earnings.</p>
                </div>
              </div>
              <button
                onClick={handleCollect}
                disabled={collecting}
                className="font-mono tracking-wider text-xs uppercase text-pink-400/70 hover:text-pink-300 border border-pink-400/20 hover:border-pink-400/40 rounded-sm px-4 py-2 transition-all duration-150 hover:shadow-[0_0_12px_rgba(236,72,153,0.1)] flex items-center gap-2"
              >
                {collecting ? (
                  <div className="animate-spin h-3 w-3 border-2 border-pink-400/30 border-t-pink-400 rounded-full" />
                ) : (
                  <DollarSign size={13} />
                )}
                Collect
              </button>
            </div>
          </div>
        )}

        {/* Pimp Protection Status */}
        {hoes.length > 0 && (
          <div className={`mb-4 rounded-sm border p-3 reveal ${unprotectedHoes > 0 ? "border-red-500/20 bg-red-500/5" : "border-green-500/20 bg-green-500/5"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {unprotectedHoes > 0 ? (
                  <ShieldAlert size={16} className="text-red-400" />
                ) : (
                  <ShieldCheck size={16} className="text-green-400" />
                )}
                <div>
                  <p className={`text-xs font-mono ${unprotectedHoes > 0 ? "text-red-300" : "text-green-300"}`}>
                    {pimpCount} pimp{pimpCount !== 1 ? "s" : ""} protecting {Math.min(hoes.length, protectedCapacity)}/{hoes.length} hoes
                  </p>
                  {unprotectedHoes > 0 && (
                    <p className="text-[10px] font-mono text-red-400/80 mt-0.5">
                      <AlertTriangle size={10} className="inline mr-1" />
                      {unprotectedHoes} hoe{unprotectedHoes !== 1 ? "s" : ""} unprotected! Hire more pimps from the market.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Kidnapped alert */}
            {kidnapped.length > 0 && (
              <div className="mt-2 pt-2 border-t border-red-500/10">
                <p className="text-[10px] font-mono text-red-400/70">
                  Kidnapped: {kidnapped.join(", ")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Your Hoes — grouped by type */}
        <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4 reveal reveal-delay-1">
          <h2 className="font-mono text-sm tracking-wider text-white/90 mb-3 flex items-center gap-2">
            <Users size={14} className="text-pink-400" /> Your Stable ({hoes.length} total)
          </h2>

          {loading ? (
            <p className="text-xs font-mono text-white/30">Loading...</p>
          ) : hoes.length === 0 ? (
            <p className="text-xs font-mono text-white/20">You don't have any hoes yet. Recruit some below.</p>
          ) : (
            <div className="space-y-2">
              {groupedHoesList.map((group) => (
                <div key={group.name} className="flex items-center justify-between bg-black/20 rounded-sm px-3 py-2.5 border border-white/5">
                  <div>
                    <p className="font-mono text-xs text-white/80">
                      {group.name}
                      {group.count > 1 && (
                        <span className="text-[10px] text-pink-400/60 ml-1.5">x{group.count}</span>
                      )}
                    </p>
                    <p className="text-[11px] font-mono text-white/30 mt-0.5">
                      ${group.totalIncome.toLocaleString()}/hr {group.count > 1 && `(${group.items[0].effectiveIncome.toLocaleString()} each)`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-mono text-xs text-pink-300">${group.totalPending.toLocaleString()}</p>
                      <p className="text-[10px] font-mono text-white/20">
                        {group.count > 1 ? `${group.items.length} workers` : `${(group.items[0]?.hoursElapsed ?? 0).toFixed(1)}h`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleFire(group.items[group.items.length - 1].id, group.name)}
                      disabled={firing !== null}
                      className="font-mono text-[10px] uppercase text-red-400/50 hover:text-red-300 border border-red-400/10 hover:border-red-400/30 rounded-sm px-2 py-1 transition-all disabled:opacity-30"
                    >
                      {firing === group.items[group.items.length - 1].id ? (
                        <div className="animate-spin h-2.5 w-2.5 border-2 border-red-400/30 border-t-red-400 rounded-full" />
                      ) : (
                        "Fire"
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Hoes */}
        {available.length > 0 && (
          <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 reveal reveal-delay-2">
            <h2 className="font-mono text-sm tracking-wider text-white/90 mb-3 flex items-center gap-2">
              <Eye size={14} className="text-cyan-400" /> Available to Recruit
            </h2>
            <div className="space-y-2">
              {available.map((hoe) => (
                <div key={hoe.id} className="flex items-center justify-between bg-black/20 rounded-sm px-3 py-2.5 border border-white/5">
                  <div>
                    <p className="font-mono text-xs text-white/80">{hoe.name}</p>
                    <p className="text-[11px] font-mono text-white/30 mt-0.5">{hoe.description}</p>
                    <p className="text-[11px] font-mono text-white/20 mt-0.5">Level {hoe.minLevel}+ &middot; ${hoe.buyPrice.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => handleBuy(hoe.id)}
                    disabled={buying === hoe.id || (user?.cash ?? 0) < hoe.buyPrice}
                    className="font-mono tracking-wider text-xs uppercase text-pink-400/70 hover:text-pink-300 border border-pink-400/20 hover:border-pink-400/40 rounded-sm px-3 py-1.5 transition-all duration-150 hover:shadow-[0_0_12px_rgba(236,72,153,0.1)] flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {buying === hoe.id ? (
                      <div className="animate-spin h-3 w-3 border-2 border-pink-400/30 border-t-pink-400 rounded-full" />
                    ) : (
                      <Plus size={12} />
                    )}
                    Recruit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skill bonuses info */}
        <div className="mt-4 rounded-sm border border-white/5 bg-bg-dark/80 p-3.5 reveal reveal-delay-3">
          <p className="text-[11px] font-mono text-white/30 tracking-wider uppercase mb-1">Income Multipliers</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-black/20 rounded-sm p-2">
              <p className="text-[10px] font-mono uppercase text-white/30">Charisma</p>
              <p className="text-xs font-mono text-pink-300">{user?.charisma ?? 0} ({(1 + (user?.charisma ?? 0) * 0.01).toFixed(1)}x)</p>
            </div>
            <div className="bg-black/20 rounded-sm p-2">
              <p className="text-[10px] font-mono uppercase text-white/30">Women's Studies</p>
              <p className="text-xs font-mono text-purple-300">{womensStudiesLevel} ({(1 + womensStudiesLevel * 0.008).toFixed(1)}x)</p>
            </div>
            <div className="bg-black/20 rounded-sm p-2">
              <p className="text-[10px] font-mono uppercase text-white/30">Sexual Education</p>
              <p className="text-xs font-mono text-cyan-300">{sexualEdLevel} ({(1 + sexualEdLevel * 0.01).toFixed(1)}x)</p>
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
