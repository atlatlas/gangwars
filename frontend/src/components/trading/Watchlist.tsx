"use client";

import { useEffect, useState } from "react";
import type { TradingAsset, MarketTicker } from "@/types";
import { tradingApi } from "@/lib/tradingApi";
import { getTradingSocket } from "@/lib/tradingSocket";

interface Props {
  selectedId: number | null;
  onSelect: (asset: TradingAsset) => void;
}

export default function Watchlist({ selectedId, onSelect }: Props) {
  const [assets, setAssets] = useState<TradingAsset[]>([]);
  const [tickers, setTickers] = useState<Record<number, MarketTicker>>({});

  // Fetch assets
  useEffect(() => {
    tradingApi.assets().then(setAssets).catch(() => {});
  }, []);

  // Live price updates
  useEffect(() => {
    const socket = getTradingSocket();
    const handleTicker = (data: MarketTicker[]) => {
      const map: Record<number, MarketTicker> = {};
      for (const t of data) map[t.id] = t;
      setTickers(map);
    };
    socket.on("market:ticker", handleTicker);
    return () => {
      socket.off("market:ticker", handleTicker);
    };
  }, []);

  const getPrice = (asset: TradingAsset) => {
    const t = tickers[asset.id];
    if (t) return { price: t.price, change: t.change };
    return { price: asset.currentPrice, change: 0 };
  };

  const categories = Array.from(new Set(assets.map((a) => a.category)));

  return (
    <div className="rounded-sm border border-white/5 bg-bg-dark/50 overflow-hidden">
      <h3 className="text-[11px] font-mono uppercase tracking-wider text-white/50 px-4 py-3 border-b border-white/5">
        Watchlist
      </h3>
      <div className="overflow-y-auto max-h-[560px]">
        {categories.map((cat) => (
          <div key={cat}>
            <div className="px-4 py-1.5 text-[9px] font-mono uppercase tracking-wider text-text-muted/30 bg-black/20">
              {cat.replace("_", " ")}
            </div>
            {assets
              .filter((a) => a.category === cat)
              .map((asset) => {
                const { price, change } = getPrice(asset);
                const isSelected = selectedId === asset.id;
                return (
                  <button
                    key={asset.id}
                    onClick={() => onSelect(asset)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-mono transition-all hover:bg-white/[0.02] ${
                      isSelected ? "bg-purple-500/10 border-l-2 border-purple-500" : "border-l-2 border-transparent"
                    }`}
                  >
                    <div className="text-left">
                      <div className={`text-white/80 ${isSelected ? "text-purple-300" : ""}`}>{asset.symbol}</div>
                      <div className="text-[9px] text-text-muted/40">{asset.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/70">${price.toLocaleString()}</div>
                      <div className={`text-[9px] ${change >= 0 ? "text-green-400/60" : "text-red-400/60"}`}>
                        {change >= 0 ? "+" : ""}{change}%
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
