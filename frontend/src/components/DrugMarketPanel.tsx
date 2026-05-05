"use client";

import { useEffect, useState } from "react";
import { drugMarket as drugMarketApi } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { useToast } from "@/components/Toast";
import {
  AlertTriangle, TrendingUp, TrendingDown, Minus, Plus, DollarSign,
  Package, Newspaper, RefreshCw, Beaker, ChevronRight,
  BarChart3, Loader2, X, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

interface DrugInfo {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  currentPrice: number;
  previousPrice: number;
  hourlyChange: number;
  trend: "up" | "down" | "stable";
  priceVolatility: number;
  minLevel: number;
}

interface DrugHolding {
  inventoryId: number;
  itemId: number;
  name: string;
  quantity: number;
  avgPurchasePrice: number;
  currentPrice: number;
  currentValue: number;
  totalCost: number;
  profitLoss: number;
  profitLossPercent: number;
}

interface DealerInfo {
  id: number;
  itemId: number;
  name: string;
  baseProduction: number;
  effectiveProduction: number;
  pendingUnits: number;
  lastCollectedAt: string;
  hoursElapsed: number;
}

interface NewsItem {
  id: number;
  headline: string;
  body: string;
  drugItemId: number | null;
  effectType: string;
  effectMagnitude: number;
  createdAt: string;
  expiresAt: string;
}

interface DrugMarketData {
  drugs: DrugInfo[];
  news: NewsItem[];
  holdings: DrugHolding[];
  dealers: DealerInfo[];
  playerCash: number;
  totalDrugValue: number;
  chemLevel: number;
}

export default function DrugMarketPanel({ onRefreshUser }: { onRefreshUser: () => void }) {
  const { user } = useUser();
  const { toast } = useToast();
  const [data, setData] = useState<DrugMarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buyQuantities, setBuyQuantities] = useState<Record<number, number>>({});
  const [collecting, setCollecting] = useState(false);
  const [chartDrug, setChartDrug] = useState<DrugInfo | null>(null);
  const [chartHistory, setChartHistory] = useState<{ price: number; recordedAt: string }[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [sellMode, setSellMode] = useState<Record<number, boolean>>({});

  const loadData = async () => {
    setError("");
    try {
      const d = await drugMarketApi.get();
      setData(d);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBuy = async (itemId: number, qty: number) => {
    setActionId(itemId);
    try {
      await drugMarketApi.buy(itemId, qty);
      toast(`Bought ${qty} units`, "success");
      await loadData();
      onRefreshUser();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setActionId(null);
    }
  };

  const handleSell = async (inventoryId: number, qty: number) => {
    setActionId(inventoryId);
    try {
      const res = await drugMarketApi.sell(inventoryId, qty);
      const pnl = res.profitLoss;
      if (pnl !== 0) {
        toast(`Sold! P&L: ${pnl >= 0 ? "+" : ""}$${pnl}`, pnl >= 0 ? "success" : "error");
      } else {
        toast("Sold!", "success");
      }
      await loadData();
      onRefreshUser();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setActionId(null);
    }
  };

  const handleCollect = async () => {
    setCollecting(true);
    try {
      const res = await drugMarketApi.collect();
      if (res.totalCollected > 0) {
        toast(`Collected ${res.totalCollected} units from dealers!`, "success");
      } else {
        toast("Nothing ready to collect yet", "info");
      }
      await loadData();
      onRefreshUser();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setCollecting(false);
    }
  };

  const showChart = async (drug: DrugInfo) => {
    setChartDrug(drug);
    setChartLoading(true);
    try {
      const res = await drugMarketApi.history(drug.id);
      setChartHistory(res.history || []);
    } catch {
      setChartHistory([]);
    } finally {
      setChartLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-neon-cyan animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-sm border border-red-500/20 bg-red-500/5 p-4">
        <p className="text-xs font-mono text-red-400">{error || "Failed to load market"}</p>
        <button onClick={loadData} className="mt-2 text-xs text-cyan-400 underline">Retry</button>
      </div>
    );
  }

  const { drugs, news, holdings, dealers } = data;
  const totalPnl = holdings.reduce((s, h) => s + h.profitLoss, 0);
  const totalInvested = holdings.reduce((s, h) => s + h.totalCost, 0);

  return (
    <div className="space-y-5">
      {/* Control bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <DollarSign size={13} className="text-neon-green" />
            <span className="text-xs font-mono text-white/40">Cash:</span>
            <span className="text-xs font-mono text-cyan-300">${data.playerCash.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BarChart3 size={13} className="text-purple-400" />
            <span className="text-xs font-mono text-white/40">Portfolio:</span>
            <span className="text-xs font-mono text-cyan-300">${data.totalDrugValue.toLocaleString()}</span>
          </div>
          {totalInvested > 0 && (
            <div className={`flex items-center gap-1.5 ${totalPnl >= 0 ? "text-neon-green" : "text-neon-red"}`}>
              {totalPnl >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              <span className="text-xs font-mono">
                {totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString()}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 bg-bg-dark/80 border border-white/5 rounded-sm px-3 py-1.5 text-[11px] font-mono text-white/40 hover:text-white/70 transition-colors"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300 font-mono">
          {error}
        </div>
      )}

      {/* News Feed */}
      {news.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Newspaper size={13} className="text-yellow-400" />
            <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Street News</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {news.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded border ${
                  item.effectType === "up"
                    ? "bg-red-500/5 border-red-500/20"
                    : "bg-green-500/5 border-green-500/20"
                }`}
              >
                <div className="flex items-start gap-2">
                  {item.effectType === "up" ? (
                    <TrendingUp size={14} className="text-red-400 mt-0.5 shrink-0" />
                  ) : (
                    <TrendingDown size={14} className="text-green-400 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-mono text-white/80">{item.headline}</p>
                    <p className="text-[10px] font-mono text-white/40 mt-1">{item.body}</p>
                    {item.drugItemId && (
                      <span className="inline-block mt-1 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-yellow-400/70">
                        {drugs.find(d => d.id === item.drugItemId)?.name || "Drug"} affected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drug Holdings */}
      {holdings.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Package size={13} className="text-cyan-400" />
            <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">
              Your Stash ({holdings.length} types)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-mono text-white/30 uppercase tracking-wider border-b border-white/5">
                  <th className="pb-2 pr-3">Drug</th>
                  <th className="pb-2 pr-3">Qty</th>
                  <th className="pb-2 pr-3">Avg Price</th>
                  <th className="pb-2 pr-3">Current</th>
                  <th className="pb-2 pr-3">Value</th>
                  <th className="pb-2 pr-3">P&amp;L</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="text-xs font-mono">
                {holdings.map((h) => (
                  <tr key={h.inventoryId} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                    <td className="py-2 pr-3 text-white/70">{h.name}</td>
                    <td className="py-2 pr-3 text-white/60">{h.quantity}</td>
                    <td className="py-2 pr-3 text-white/40">${h.avgPurchasePrice}</td>
                    <td className="py-2 pr-3">
                      <span className={`${h.currentPrice > h.avgPurchasePrice ? "text-neon-green" : h.currentPrice < h.avgPurchasePrice ? "text-neon-red" : "text-white/60"}`}>
                        ${h.currentPrice}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-cyan-300">${h.currentValue.toLocaleString()}</td>
                    <td className={`py-2 pr-3 ${h.profitLoss >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                      {h.profitLoss >= 0 ? "+" : ""}${h.profitLoss.toLocaleString()}
                      <span className="text-[9px] ml-1 opacity-60">
                        ({h.profitLossPercent >= 0 ? "+" : ""}{h.profitLossPercent}%)
                      </span>
                    </td>
                    <td className="py-2">
                      {sellMode[h.inventoryId] ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSell(h.inventoryId, Math.floor(h.quantity / 2))}
                            disabled={actionId === h.inventoryId}
                            className="px-2 py-1 text-[10px] font-mono bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 rounded hover:bg-yellow-500/20"
                          >
                            Half
                          </button>
                          <button
                            onClick={() => handleSell(h.inventoryId, -1)}
                            disabled={actionId === h.inventoryId}
                            className="px-2 py-1 text-[10px] font-mono bg-red-500/10 text-red-300 border border-red-500/20 rounded hover:bg-red-500/20"
                          >
                            All
                          </button>
                          <button
                            onClick={() => setSellMode(prev => ({ ...prev, [h.inventoryId]: false }))}
                            className="px-1.5 py-1 text-[10px] text-white/30 hover:text-white/60"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSellMode(prev => ({ ...prev, [h.inventoryId]: true }))}
                          className="px-2 py-1 text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded hover:bg-emerald-500/20"
                        >
                          Sell
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-4 text-[11px] font-mono pt-1">
            <span className="text-white/40">Invested: <span className="text-white/60">${totalInvested.toLocaleString()}</span></span>
            <span className="text-white/40">P&L: <span className={totalPnl >= 0 ? "text-neon-green" : "text-neon-red"}>
              {totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString()}
            </span></span>
          </div>
        </div>
      )}

      {/* Drug Dealers */}
      {dealers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Beaker size={13} className="text-purple-400" />
              <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">
                Drug Dealers ({dealers.length})
              </span>
            </div>
            <button
              onClick={handleCollect}
              disabled={collecting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded hover:bg-purple-500/30 transition-all disabled:opacity-40"
            >
              {collecting ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
              Collect All
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {dealers.map((dl) => (
              <div key={dl.id} className="p-3 bg-bg-dark/60 border border-white/5 rounded">
                <p className="text-xs font-mono text-white/70">{dl.name}</p>
                <p className="text-[10px] font-mono text-purple-300/60 mt-1">{dl.effectiveProduction} u/hr</p>
                {dl.pendingUnits > 0 ? (
                  <p className="text-[11px] font-mono text-neon-green mt-1">
                    {dl.pendingUnits} pending
                  </p>
                ) : (
                  <p className="text-[10px] font-mono text-white/30 mt-1">
                    {dl.hoursElapsed < 1 ? "Collecting..." : `${dl.hoursElapsed.toFixed(1)}h`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drug Price List */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} className="text-yellow-400" />
          <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">
            Drug Market
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {drugs.map((drug) => {
            const bq = buyQuantities[drug.id] ?? 1;
            const canBuy = data.playerCash >= drug.currentPrice * bq;
            const levelOk = (user?.level ?? 0) >= drug.minLevel;
            const holding = holdings.find(h => h.itemId === drug.id);
            const isBuying = actionId === drug.id;

            return (
              <div
                key={drug.id}
                className={`p-3 rounded border ${
                  !levelOk ? "border-white/5 opacity-50" : "border-white/5 bg-bg-dark/60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-mono tracking-wide ${levelOk ? "text-white/80" : "text-white/30"}`}>
                        {drug.name}
                      </h3>
                      <button
                        onClick={() => showChart(drug)}
                        className="text-white/20 hover:text-cyan-400 transition-colors"
                        title="Price history"
                      >
                        <BarChart3 size={12} />
                      </button>
                    </div>
                    <p className="text-[10px] font-mono text-white/30 mt-0.5">{drug.description}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono text-sm ${canBuy && levelOk ? "text-cyan-300" : "text-red-400/60"}`}>
                        ${drug.currentPrice.toLocaleString()}
                      </span>
                      {drug.trend === "up" ? (
                        <TrendingUp size={12} className="text-neon-green" />
                      ) : drug.trend === "down" ? (
                        <TrendingDown size={12} className="text-neon-red" />
                      ) : (
                        <Minus size={12} className="text-white/30" />
                      )}
                    </div>
                    <span className={`text-[10px] font-mono ${
                      drug.hourlyChange > 0 ? "text-neon-green" : drug.hourlyChange < 0 ? "text-neon-red" : "text-white/30"
                    }`}>
                      {drug.hourlyChange > 0 ? "+" : ""}{drug.hourlyChange}%
                    </span>
                  </div>
                </div>

                {/* Level lock */}
                {!levelOk && (
                  <div className="text-[10px] font-mono text-red-400/60 mt-2">Requires Level {drug.minLevel}</div>
                )}

                {levelOk && (
                  <div className="flex items-center gap-2 mt-3">
                    {/* Buy section */}
                    <div className="flex items-center gap-1 flex-1">
                      <div className="flex items-center gap-1 bg-white/5 rounded px-1.5 py-1">
                        <button
                          onClick={() => setBuyQuantities(prev => ({ ...prev, [drug.id]: Math.max(1, bq - 1) }))}
                          className="text-white/30 hover:text-white/70 p-0.5"
                          disabled={bq <= 1}
                        >
                          <Minus size={10} />
                        </button>
                        <span className="font-mono text-[11px] text-white/60 w-6 text-center">{bq}</span>
                        <button
                          onClick={() => setBuyQuantities(prev => ({ ...prev, [drug.id]: Math.min(1000, bq + 1) }))}
                          className="text-white/30 hover:text-white/70 p-0.5"
                          disabled={bq >= 1000}
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                      <button
                        onClick={() => handleBuy(drug.id, bq)}
                        disabled={isBuying || !canBuy}
                        className={`flex-1 px-2 py-1.5 rounded text-[11px] font-mono uppercase tracking-wider transition-all ${
                          !canBuy
                            ? "bg-white/5 text-white/20 cursor-not-allowed"
                            : "bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20"
                        }`}
                      >
                        {isBuying ? "..." : !canBuy ? "Can't Afford" : `Buy $${(drug.currentPrice * bq).toLocaleString()}`}
                      </button>
                      <button
                        onClick={() => {
                          const maxQty = Math.floor(data.playerCash / drug.currentPrice);
                          if (maxQty > 0) {
                            setBuyQuantities(prev => ({ ...prev, [drug.id]: Math.min(maxQty, 1000) }));
                          }
                        }}
                        className="px-1.5 py-1.5 text-[10px] font-mono text-white/30 hover:text-white/70 bg-white/5 rounded"
                      >
                        Max
                      </button>
                    </div>
                  </div>
                )}

                {/* Holding info */}
                {holding && (
                  <div className={`mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono ${
                    holding.profitLoss >= 0 ? "text-neon-green/70" : "text-neon-red/70"
                  }`}>
                    <span>Hold: {holding.quantity}u @ ${holding.avgPurchasePrice}</span>
                    <span>{holding.profitLoss >= 0 ? "+" : ""}${holding.profitLoss.toLocaleString()}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Price History Chart Modal */}
      {chartDrug && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setChartDrug(null)}>
          <div className="bg-bg-dark border border-white/10 rounded-lg p-5 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-cyan-400" />
                <h3 className="text-sm font-mono text-white/80">{chartDrug.name} - 48h Price History</h3>
              </div>
              <button onClick={() => setChartDrug(null)} className="text-white/30 hover:text-white/70">
                <X size={16} />
              </button>
            </div>

            {chartLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-cyan-400" />
              </div>
            ) : chartHistory.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs font-mono text-white/30">No price history available yet</p>
                <p className="text-[10px] font-mono text-white/20 mt-1">Prices are recorded every 30 minutes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Mini SVG chart */}
                <div className="h-40 bg-bg-deep rounded border border-white/5 p-2">
                  <svg viewBox="0 0 400 150" className="w-full h-full">
                    {(() => {
                      const prices = chartHistory.map(h => h.price);
                      const min = Math.min(...prices);
                      const max = Math.max(...prices);
                      const range = Math.max(max - min, 1);
                      const points = prices.map((p, i) => {
                        const x = (i / Math.max(prices.length - 1, 1)) * 390 + 5;
                        const y = 140 - ((p - min) / range) * 120;
                        return `${x},${y}`;
                      });
                      const polyline = points.join(' ');
                      // Grid lines
                      const gridLines = [];
                      for (let i = 0; i < 4; i++) {
                        const y = 15 + i * 30;
                        gridLines.push(<line key={i} x1="5" y1={y} x2="395" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />);
                      }
                      return (
                        <>
                          {gridLines}
                          <polyline
                            points={polyline}
                            fill="none"
                            stroke={prices[prices.length - 1] >= prices[0] ? "rgb(74,222,128)" : "rgb(248,113,113)"}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle cx={points[points.length - 1].split(',')[0]} cy={points[points.length - 1].split(',')[1]} r="3" fill={prices[prices.length - 1] >= prices[0] ? "rgb(74,222,128)" : "rgb(248,113,113)"} />
                        </>
                      );
                    })()}
                    <text x="5" y="8" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">${chartHistory[0]?.price ?? 0}</text>
                    <text x="310" y="8" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">${chartHistory[chartHistory.length - 1]?.price ?? 0}</text>
                  </svg>
                </div>
                {/* Stats */}
                <div className="flex justify-between text-[10px] font-mono text-white/30">
                  <span>Low: ${Math.min(...chartHistory.map(h => h.price)).toLocaleString()}</span>
                  <span>Current: ${chartDrug.currentPrice.toLocaleString()}</span>
                  <span>High: ${Math.max(...chartHistory.map(h => h.price)).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
