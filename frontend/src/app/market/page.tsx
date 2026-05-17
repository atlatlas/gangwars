"use client";

import { useEffect, useState } from "react";
import GameLayout from "@/components/GameLayout";
import { market as marketApi } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { useTopNotification } from "@/components/TopNotification";
import { MarketItem, InventoryItem } from "@/types";
import Image from "next/image";
import { ShoppingBag, Sword, AlertTriangle, Users, RefreshCw, Package, DollarSign, Star, Shield, Lock, Check, Minus, Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import DrugMarketPanel from "@/components/DrugMarketPanel";

type Tab = "arms" | "drugs" | "footmen" | "pimps";

export default function MarketPage() {
  const { refreshUser, user } = useUser();
  const { showNotification } = useTopNotification();
  const [activeTab, setActiveTab] = useState<Tab>("arms");
  const [arms, setArms] = useState<MarketItem[]>([]);
  const [drugs, setDrugs] = useState<MarketItem[]>([]);
  const [footmen, setFootmen] = useState<MarketItem[]>([]);
  const [pimps, setPimps] = useState<MarketItem[]>([]);
  const [playerCash, setPlayerCash] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(0);
  const [playerRespect, setPlayerRespect] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [capacity, setCapacity] = useState({ max: 5, used: 0 });
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [buyQty, setBuyQty] = useState<Record<number, number>>({});

  const tabs: { key: Tab; label: string; icon: typeof Sword }[] = [
    { key: "arms", label: "Arms", icon: Sword },
    { key: "drugs", label: "Drugs", icon: AlertTriangle },
    { key: "footmen", label: "Footmen", icon: Users },
    { key: "pimps", label: "Pimps", icon: Users },
  ];

  useEffect(() => {
    loadMarket();
    loadInventory();
  }, []);

  const loadMarket = async () => {
    setError("");
    try {
      const data = await marketApi.list();
      setArms(data.arms);
      setDrugs(data.drugs);
      setFootmen(data.footmen);
      setPimps(data.pimps ?? []);
      setPlayerCash(data.playerCash);
      setPlayerLevel(data.playerLevel);
      setPlayerRespect(data.playerRespect);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async () => {
    try {
      const data = await marketApi.inventory();
      setInventory(data.inventory);
      setCapacity(data.capacity);
    } catch {}
  };

  const getMergedItems = (items: MarketItem[], type: Tab): MarketItem[] => {
    return items.map((item) => {
      const owned = type === "arms"
        ? inventory.filter((i) => i.itemId === item.id).length > 0
        : inventory
            .filter((i) => i.itemId === item.id)
            .reduce((sum, i) => sum + i.quantity, 0);
      const equipped = inventory.some((i) => i.itemId === item.id && i.equipped);
      return { ...item, owned, equipped };
    });
  };

  const inventoryFull = inventory.length >= capacity.max && capacity.max > 0;

  const handleBuy = async (itemId: number, quantity: number) => {
    setActiveItemId(itemId);
    try {
      const res = await marketApi.buy(itemId, quantity);
      setPlayerCash(res.cash);
      await Promise.all([loadInventory(), loadMarket(), refreshUser()]);
      showNotification("Item purchased!", "success");
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setActiveItemId(null);
    }
  };

  const handleSell = async (inventoryId: number, quantity: number) => {
    setActiveItemId(inventoryId);
    try {
      const res = await marketApi.sell(inventoryId, quantity);
      setPlayerCash(res.cash);
      await Promise.all([loadInventory(), loadMarket(), refreshUser()]);
      showNotification("Item sold!", "success");
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setActiveItemId(null);
    }
  };

  const handleEquip = async (inventoryId: number) => {
    setActiveItemId(inventoryId);
    try {
      await marketApi.equip(inventoryId);
      await Promise.all([loadInventory(), loadMarket(), refreshUser()]);
      showNotification("Equipment changed!", "success");
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setActiveItemId(null);
    }
  };

  const getCurrentItems = () => {
    switch (activeTab) {
      case "arms": return getMergedItems(arms, "arms");
      case "drugs": return getMergedItems(drugs, "drugs");
      case "footmen": return getMergedItems(footmen, "footmen");
      case "pimps": return getMergedItems(pimps, "pimps");
    }
  };

  const getInventoryId = (itemId: number): number | undefined => {
    const inv = inventory.find((i) => i.itemId === itemId);
    return inv?.id;
  };

  const equippedWeapon = inventory.find((i) => i.equipped);

  const hero = (
    <div className="relative mb-0 h-[180px] md:h-[260px]">
      <div
        className="absolute inset-0 z-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-cyan-500/5"
      />
      <Image
        src="/market.png?v=1"
        alt="Black Market"
        width={1897}
        height={829}
        className="w-full h-full max-h-[200px] md:max-h-[280px] object-cover object-bottom relative z-0"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      <div className="absolute top-3 right-3 md:top-4 md:right-6 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm border border-white/10 rounded-sm px-2.5 py-1.5">
        <button
          onClick={() => { setLoading(true); Promise.all([loadMarket(), loadInventory()]); }}
          className="flex items-center gap-1.5 text-[11px] font-mono text-pink-400/60 hover:text-pink-300 transition-colors"
          title="Refresh market"
        >
          <RefreshCw size={14} className="drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" />
          Refresh
        </button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 md:px-6 pb-3 md:pb-4">
        <div className="flex items-center gap-2">
          <ShoppingBag size={18} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" />
          <h1 className="text-lg md:text-xl font-bold text-white drop-shadow-lg">Black Market</h1>
        </div>
        <div className="w-36 h-px bg-pink-400/40 mt-1 mb-2" />
        <div className="bg-black/30 backdrop-blur-sm rounded-sm px-2 py-1.5 mb-1 -mx-1 border-t border-l border-white/10">
          <p className="text-[10px] md:text-xs font-mono text-white/60 tracking-wider">
            Buy and sell illegal goods — from weapons and drugs to footmen and pimps.
            <br />Higher respect and level unlock better inventory and items.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-pink-500/40 to-transparent" />
          <Star size={10} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.5)]" fill="#f472b6" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-pink-500/40 to-transparent" />
        </div>
      </div>
    </div>
  );

  return (
    <GameLayout>
      {hero}
      <div className="shadow-[inset_0_20px_20px_-12px_rgba(0,0,0,0.7)] border-t border-pink-500/15">
        <div className="max-w-5xl mx-auto px-4 py-6">

      {/* Inventory summary bar */}
      <div className="mb-5 rounded-sm border border-white/5 bg-bg-dark/80 p-3 reveal reveal-delay-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Package size={12} className="text-purple-400" />
              <span className="text-[11px] font-mono text-white/40">Inventory</span>
              <span className="text-[11px] font-mono text-white/70">
                {capacity.used}/{capacity.max}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign size={12} className="text-neon-green" />
              <span className="text-[11px] font-mono text-white/40">Cash</span>
              <span className="text-[11px] font-mono text-cyan-300">
                ${playerCash.toLocaleString()}
              </span>
            </div>
          </div>
          {equippedWeapon && (
            <div className="flex items-center gap-1.5">
              <Sword size={12} className="text-pink-400" />
              <span className="text-[10px] font-mono text-white/30">Equipped:</span>
              <span className="text-[11px] font-mono text-pink-300">{equippedWeapon.item.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-5 rounded-sm border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-xs font-mono text-red-400">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 reveal reveal-delay-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-sm text-[11px] font-mono uppercase tracking-wider transition-all ${
                isActive
                  ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                  : "text-white/30 hover:text-white/60 border border-transparent hover:border-white/10"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Stash drawers for arms / footmen / pimps */}
      {activeTab !== "drugs" && !loading && (() => {
        const stashItems = inventory.filter(i => {
          if (activeTab === "arms") return i.item.type === "arm";
          if (activeTab === "footmen") return i.item.type === "footman";
          if (activeTab === "pimps") return i.item.type === "pimp";
          return false;
        });
        if (stashItems.length === 0) return null;
        const labels = { arms: "Your Arsenal", footmen: "Your Crew", pimps: "Your Hoes" };
        const icons = { arms: Sword, footmen: Users, pimps: Users };
        const Icon = icons[activeTab];
        return (
          <div className="space-y-2 mb-5">
            <div className="flex items-center gap-2">
              <Icon size={13} className="text-cyan-400" />
              <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">
                {labels[activeTab]} ({stashItems.length})
              </span>
            </div>
            <div className="bg-bg-deep border border-white/5 rounded-sm p-3 space-y-3 overflow-x-auto w-full shadow-[0_-6px_12px_-4px_rgba(0,0,0,0.6)]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-mono text-white/30 uppercase tracking-wider border-b border-white/10">
                      <th className="pb-2 pr-3">Item</th>
                      <th className="pb-2 pr-3">Qty</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-mono">
                    {stashItems.map((si) => (
                      <tr key={si.id} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                        <td className="py-2 pr-3 text-white/70">{si.item.name}</td>
                        <td className="py-2 pr-3 text-white/60">{si.quantity}</td>
                        <td className="py-2 pr-3">
                          {si.equipped ? (
                            <span className="text-emerald-400/70">Equipped</span>
                          ) : (
                            <span className="text-white/30">Unequipped</span>
                          )}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-1">
                            {activeTab === "arms" && !si.equipped && (
                              <button
                                onClick={() => handleEquip(si.id)}
                                disabled={activeItemId === si.id}
                                className="px-2 py-1 text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded hover:bg-purple-500/20"
                              >
                                Equip
                              </button>
                            )}
                            {activeTab !== "arms" && (
                              <button
                                onClick={() => handleSell(si.id, si.quantity)}
                                disabled={activeItemId === si.id}
                                className="px-2 py-1 text-[10px] font-mono bg-red-500/10 text-red-300 border border-red-500/20 rounded hover:bg-red-500/20"
                              >
                                Sell
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
        );
      })()}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-400/30 border-t-pink-400" />
        </div>
      ) : (
        <>
          {/* Empty state */}
          {activeTab !== "drugs" && getCurrentItems().length === 0 && (
            <div className="bg-bg-deep border border-white/5 rounded-sm p-8 text-center shadow-[0_-6px_12px_-4px_rgba(0,0,0,0.6)]">
              <ShoppingBag size={32} className="mx-auto text-white/10 mb-3" />
              <p className="text-sm font-mono text-white/30">No items available in this category</p>
              <p className="text-xs font-mono text-white/20 mt-1">Check back after leveling up</p>
            </div>
          )}

          {/* Drug Market Panel (enhanced) */}
          {activeTab === "drugs" && (
            <DrugMarketPanel onRefreshUser={refreshUser} />
          )}

          {/* Arms / Footmen / Pimps grid — styled like drug market */}
          {activeTab !== "drugs" && getCurrentItems().length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {getCurrentItems().map((item) => {
                const isWeapon = item.type === "arm";
                const isFootman = item.type === "footman";
                const isPimp = item.type === "pimp";
                const levelLocked = playerLevel < item.minLevel;
                const respectLocked = item.minRespect > 0 && playerRespect < item.minRespect;
                const isLocked = levelLocked || respectLocked;
                const price = item.currentPrice ?? item.buyPrice;
                const owned = typeof item.owned === "number" ? item.owned : item.owned ? 1 : 0;
                const canAfford = playerCash >= price;
                const invId = getInventoryId(item.id);
                const qty = buyQty[item.id] ?? 1;
                const totalCost = price * qty;
                const canAffordQty = playerCash >= totalCost;

                // effects string
                const effectParts: string[] = [];
                if (item.effects.crimeBonus) effectParts.push(`+${item.effects.crimeBonus}% crime`);
                if (item.effects.pvpPower) effectParts.push(`+${item.effects.pvpPower} PVP`);
                if (item.effects.arrestReduction) effectParts.push(`-${item.effects.arrestReduction}% arrest`);
                if (item.effects.hpBonus) effectParts.push(`+${item.effects.hpBonus} HP`);
                if (item.effects.passiveIncome) effectParts.push(`+$${item.effects.passiveIncome}/hr`);
                const effectStr = effectParts.join(" | ");

                const setQ = (v: number) => setBuyQty(prev => ({ ...prev, [item.id]: v }));

                return (
                  <div key={item.id} className={`p-3 rounded border ${isLocked ? "border-white/5 opacity-50" : "border-white/5 bg-bg-dark/60"}`}>
                    {/* Header: name + price */}
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {isWeapon ? <Sword size={14} className="text-pink-400 shrink-0" /> : <Users size={14} className="text-cyan-400 shrink-0" />}
                          <h3 className={`text-sm font-mono tracking-wide truncate ${isLocked ? "text-white/30" : "text-white/80"}`}>
                            {item.name}
                          </h3>
                          {isLocked && <Lock size={10} className="shrink-0 text-white/30" />}
                          {!isLocked && owned > 0 && (
                            <span className="shrink-0 text-[9px] font-mono px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                              {isWeapon ? "Owned" : `${owned}`}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-white/30 mt-0.5 leading-relaxed">{item.description}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <span className={`font-mono text-sm ${canAfford && !isLocked ? "text-cyan-300" : "text-red-400/60"}`}>
                          ${price.toLocaleString()}
                        </span>
                        {item.sellPrice > 0 && (
                          <div className="text-[10px] font-mono text-white/20">Sell: ${item.sellPrice}</div>
                        )}
                      </div>
                    </div>

                    {/* Effects */}
                    {effectStr && !isLocked && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Shield size={10} className="text-purple-400/60 shrink-0" />
                        <span className="text-[10px] font-mono text-purple-300/60">{effectStr}</span>
                      </div>
                    )}

                    {/* Locked requirements */}
                    {levelLocked && (
                      <div className="text-[10px] font-mono text-red-400/60 flex items-center gap-1 mt-2">
                        <Lock size={10} /> Requires Level {item.minLevel}
                      </div>
                    )}
                    {respectLocked && (
                      <div className="text-[10px] font-mono text-red-400/60 flex items-center gap-1 mt-2">
                        <Lock size={10} /> Requires {item.minRespect} Respect
                      </div>
                    )}

                    {/* Actions */}
                    {!isLocked && (
                      <div className="flex items-center gap-2 mt-3">
                        {/* Arms */}
                        {isWeapon && (
                          <>
                            {owned > 0 && invId ? (
                              <button
                                onClick={() => handleEquip(invId)}
                                disabled={activeItemId === invId}
                                className={`flex-1 px-2 py-1.5 rounded-sm text-[11px] font-mono uppercase tracking-wider transition-all ${
                                  item.equipped
                                    ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20"
                                    : "bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20"
                                }`}
                              >
                                {activeItemId === invId ? "..." : item.equipped ? "Equipped" : "Equip"}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBuy(item.id, 1)}
                                disabled={activeItemId === item.id || !canAfford || inventoryFull}
                                className={`flex-1 px-2 py-1.5 rounded-sm text-[11px] font-mono uppercase tracking-wider transition-all ${
                                  !canAfford
                                    ? "bg-white/5 text-white/20 cursor-not-allowed"
                                    : inventoryFull
                                    ? "bg-yellow-500/10 text-yellow-400/60 border border-yellow-500/20 cursor-not-allowed"
                                    : "bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20"
                                }`}
                              >
                                {activeItemId === item.id ? "Buying..." : !canAfford ? "Can't Afford" : inventoryFull ? "Inventory Full" : `Buy $${price.toLocaleString()}`}
                              </button>
                            )}
                          </>
                        )}

                        {/* Footmen / Pimps */}
                        {(isFootman || isPimp) && (
                          <>
                            <div className="flex items-center gap-1 flex-1">
                              <div className="flex items-center gap-1 bg-white/5 rounded px-1.5 py-1">
                                <button
                                  onClick={() => setQ(Math.max(1, qty - 1))}
                                  className="text-white/30 hover:text-white/70 p-0.5"
                                  disabled={qty <= 1}
                                >
                                  <Minus size={10} />
                                </button>
                                <span className="font-mono text-[11px] text-white/60 w-6 text-center">{qty}</span>
                                <button
                                  onClick={() => setQ(Math.min(99, qty + 1))}
                                  className="text-white/30 hover:text-white/70 p-0.5"
                                  disabled={qty >= 99}
                                >
                                  <Plus size={10} />
                                </button>
                              </div>
                              <button
                                onClick={() => { handleBuy(item.id, qty); setQ(1); }}
                                disabled={activeItemId === item.id || !canAffordQty || inventoryFull}
                                className={`flex-1 px-2 py-1.5 rounded-sm text-[11px] font-mono uppercase tracking-wider transition-all ${
                                  !canAffordQty
                                    ? "bg-white/5 text-white/20 cursor-not-allowed"
                                    : inventoryFull
                                    ? "bg-yellow-500/10 text-yellow-400/60 border border-yellow-500/20 cursor-not-allowed"
                                    : "bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20"
                                }`}
                              >
                                {activeItemId === item.id ? "..." : !canAffordQty ? "Can't Afford" : inventoryFull ? "Full" : `Buy $${(price * qty).toLocaleString()}`}
                              </button>
                              <button
                                onClick={() => {
                                  const maxQty = Math.floor(playerCash / price);
                                  if (maxQty > 0) setQ(Math.min(maxQty, 99));
                                }}
                                className="px-1.5 py-1.5 text-[10px] font-mono text-white/30 hover:text-white/70 bg-white/5 rounded"
                              >
                                Max
                              </button>
                            </div>

                            {/* Sell section when owned */}
                            {owned > 0 && invId && (
                              <button
                                onClick={() => handleSell(invId, owned)}
                                disabled={activeItemId === invId}
                                className="px-2 py-1.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded hover:bg-emerald-500/20"
                              >
                                {activeItemId === invId ? "..." : `Sell All`}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Owned info row for arms */}
                    {!isLocked && isWeapon && owned > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/5 flex items-center text-[10px] font-mono">
                        <span className="text-emerald-400/60 flex items-center gap-1">
                          <Check size={10} /> Owned{item.equipped ? " (Equipped)" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
        </div>
      </div>
    </GameLayout>
  );
}
