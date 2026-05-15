"use client";

import { useState } from "react";
import type { TradingAsset } from "@/types";
import { tradingApi } from "@/lib/tradingApi";
import { useTopNotification } from "@/components/TopNotification";

interface Props {
  asset: TradingAsset | null;
  accountBalance: number;
  onSuccess: () => void;
}

type OrderType = "market" | "limit" | "stop_loss" | "take_profit";
type OrderSide = "buy" | "sell";

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "market", label: "Market" },
  { value: "limit", label: "Limit" },
  { value: "stop_loss", label: "Stop Loss" },
  { value: "take_profit", label: "Take Profit" },
];

export default function OrderForm({ asset, accountBalance, onSuccess }: Props) {
  const { showNotification } = useTopNotification();
  const [side, setSide] = useState<OrderSide>("buy");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [placing, setPlacing] = useState(false);

  const handlePlaceOrder = async () => {
    if (!asset) return;
    if (!quantity || quantity <= 0) {
      showNotification("Enter a valid quantity", "error");
      return;
    }
    if (orderType !== "market" && (!price || parseFloat(price) <= 0)) {
      showNotification("Enter a valid price", "error");
      return;
    }

    setPlacing(true);
    try {
      await tradingApi.placeOrder({
        assetId: asset.id,
        type: orderType,
        side,
        quantity: Math.floor(quantity),
        price: orderType !== "market" ? Math.round(parseFloat(price)) : undefined,
        stopPrice: orderType === "stop_loss" || orderType === "take_profit" ? Math.round(parseFloat(stopPrice || price)) : undefined,
      });
      showNotification(`${side === "buy" ? "Bought" : "Sold"} ${Math.floor(quantity)} ${asset.symbol}`, "success");
      onSuccess();
    } catch (err: any) {
      showNotification(err.message || "Order failed", "error");
    } finally {
      setPlacing(false);
    }
  };

  const setQtyPercent = (pct: number) => {
    if (!asset) return;
    const maxQty = Math.floor((accountBalance * 0.9) / asset.currentPrice);
    setQuantity(Math.max(1, Math.floor(maxQty * pct)));
  };

  if (!asset) {
    return (
      <div className="rounded-sm border border-white/5 bg-bg-dark/50 p-4">
        <p className="text-text-muted/40 text-sm font-mono text-center">Select an asset to trade</p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-white/5 bg-bg-dark/50 p-4">
      <h3 className="text-[11px] font-mono uppercase tracking-wider text-white/50 mb-3">Place Order</h3>

      {/* Buy/Sell toggle */}
      <div className="flex rounded-sm border border-white/5 overflow-hidden mb-3">
        <button
          onClick={() => setSide("buy")}
          className={`flex-1 py-1.5 text-[11px] font-mono uppercase tracking-wider transition-all ${
            side === "buy" ? "bg-green-500/20 text-green-400" : "text-white/30 hover:text-white/60"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide("sell")}
          className={`flex-1 py-1.5 text-[11px] font-mono uppercase tracking-wider transition-all ${
            side === "sell" ? "bg-red-500/20 text-red-400" : "text-white/30 hover:text-white/60"
          }`}
        >
          Sell
        </button>
      </div>

      {/* Order type tabs */}
      <div className="flex flex-wrap gap-1 mb-3">
        {ORDER_TYPES.map((ot) => (
          <button
            key={ot.value}
            onClick={() => setOrderType(ot.value)}
            className={`px-2 py-1 text-[9px] font-mono uppercase tracking-wider rounded-sm transition-all ${
              orderType === ot.value
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "text-text-muted/50 hover:text-white/70 border border-transparent"
            }`}
          >
            {ot.label}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {/* Quantity with % buttons */}
        <div>
          <label className="text-[10px] font-mono text-text-muted/60 uppercase tracking-wider">Quantity</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full mt-0.5 px-2.5 py-1.5 rounded-sm bg-black/30 border border-white/5 text-xs font-mono text-white/80 focus:outline-none focus:border-purple-500/40"
          />
          <div className="flex gap-1 mt-1">
            {[10, 25, 50, 75, 100].map((p) => (
              <button
                key={p}
                onClick={() => setQtyPercent(p / 100)}
                className="flex-1 py-0.5 text-[8px] font-mono text-text-muted/40 hover:text-white/60 border border-transparent hover:border-white/10 rounded-sm transition-all"
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        {/* Price (for limit/stop) */}
        {(orderType === "limit" || orderType === "stop_loss" || orderType === "take_profit") && (
          <div>
            <label className="text-[10px] font-mono text-text-muted/60 uppercase tracking-wider">Price ($)</label>
            <input
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={asset.currentPrice.toLocaleString()}
              className="w-full mt-0.5 px-2.5 py-1.5 rounded-sm bg-black/30 border border-white/5 text-xs font-mono text-white/80 focus:outline-none focus:border-purple-500/40"
            />
          </div>
        )}

        {/* Stop price (for stop_loss / take_profit) */}
        {(orderType === "stop_loss" || orderType === "take_profit") && (
          <div>
            <label className="text-[10px] font-mono text-text-muted/60 uppercase tracking-wider">Stop Price ($)</label>
            <input
              type="number"
              min={1}
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              placeholder={asset.currentPrice.toLocaleString()}
              className="w-full mt-0.5 px-2.5 py-1.5 rounded-sm bg-black/30 border border-white/5 text-xs font-mono text-white/80 focus:outline-none focus:border-purple-500/40"
            />
          </div>
        )}

        {/* Summary */}
        <div className="text-[10px] font-mono text-text-muted/40 space-y-0.5 pt-1">
          <div className="flex justify-between">
            <span>Est. Cost</span>
            <span className="text-white/60">
              ${((orderType === "market" ? asset.currentPrice : parseFloat(price || "0") || asset.currentPrice) * Math.floor(quantity)).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Balance</span>
            <span className={`${accountBalance > 0 ? "text-green-400/60" : "text-red-400/60"}`}>
              ${accountBalance.toLocaleString()}
            </span>
          </div>
        </div>

        <button
          onClick={handlePlaceOrder}
          disabled={placing || !asset}
          className={`w-full py-2 rounded-sm text-[11px] font-mono uppercase tracking-wider transition-all ${
            side === "buy"
              ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
          } disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          {placing ? "Placing..." : `${side === "buy" ? "Buy" : "Sell"} ${asset.symbol}`}
        </button>
      </div>
    </div>
  );
}
