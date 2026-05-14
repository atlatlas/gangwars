"use client";

import { useEffect, useState } from "react";
import GameLayout from "@/components/GameLayout";
import ItemCard from "@/components/ItemCard";
import { market as marketApi } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { useTopNotification } from "@/components/TopNotification";
import { MarketItem, InventoryItem } from "@/types";
import { ShoppingBag, Sword, AlertTriangle, Users, RefreshCw, Package, DollarSign } from "lucide-react";
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

  return (
    <GameLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 reveal">
        <div>
          <h1 className="text-lg font-mono tracking-wider text-white/90 flex items-center gap-2 uppercase">
            <ShoppingBag size={16} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" /> Black Market
          </h1>
          <p className="text-xs font-mono text-white/30 tracking-wider mt-1">Buy and sell illegal goods</p>
        </div>
        <button
          onClick={() => { setLoading(true); Promise.all([loadMarket(), loadInventory()]); }}
          className="flex items-center gap-1.5 bg-bg-dark/80 border border-white/5 rounded-sm px-3 py-1.5 text-[11px] font-mono text-white/40 hover:text-white/70 transition-colors"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

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

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-400/30 border-t-pink-400" />
        </div>
      ) : (
        <>
          {/* Empty state */}
          {activeTab !== "drugs" && getCurrentItems().length === 0 && (
            <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-8 text-center">
              <ShoppingBag size={32} className="mx-auto text-white/10 mb-3" />
              <p className="text-sm font-mono text-white/30">No items available in this category</p>
              <p className="text-xs font-mono text-white/20 mt-1">Check back after leveling up</p>
            </div>
          )}

          {/* Drug Market Panel (enhanced) */}
          {activeTab === "drugs" && (
            <DrugMarketPanel onRefreshUser={refreshUser} />
          )}

          {/* Arms / Footmen grid */}
          {activeTab !== "drugs" && getCurrentItems().length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 reveal reveal-delay-3">
              {getCurrentItems().map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  playerCash={playerCash}
                  playerLevel={playerLevel}
                  playerRespect={playerRespect}
                  inventoryFull={inventory.length >= capacity.max}
                  onBuy={handleBuy}
                  onSell={activeTab !== "arms" ? handleSell : undefined}
                  onEquip={activeTab === "arms" && (typeof item.owned === "number" ? item.owned > 0 : item.owned) ? handleEquip : undefined}
                  inventoryId={getInventoryId(item.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
      </div>
    </GameLayout>
  );
}
