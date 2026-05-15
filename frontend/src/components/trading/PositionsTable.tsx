"use client";

import type { TradingPosition } from "@/types";
import { tradingApi } from "@/lib/tradingApi";
import { useTopNotification } from "@/components/TopNotification";

interface Props {
  positions: TradingPosition[];
  onUpdate: () => void;
}

export default function PositionsTable({ positions, onUpdate }: Props) {
  const { showNotification } = useTopNotification();

  const handleClose = async (position: TradingPosition) => {
    try {
      await tradingApi.placeOrder({
        assetId: position.assetId,
        type: "market",
        side: position.unrealizedPnl >= 0 ? "sell" : "sell",
        quantity: position.quantity,
      });
      showNotification(`Closed ${position.symbol} position`, "success");
      onUpdate();
    } catch (err: any) {
      showNotification(err.message || "Failed to close position", "error");
    }
  };

  if (positions.length === 0) {
    return (
      <div className="rounded-sm border border-white/5 bg-bg-dark/50 p-4">
        <p className="text-text-muted/40 text-sm font-mono text-center">No open positions</p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-white/5 bg-bg-dark/50 overflow-hidden">
      <h3 className="text-[11px] font-mono uppercase tracking-wider text-white/50 px-4 py-3 border-b border-white/5">
        Positions ({positions.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] font-mono">
          <thead>
            <tr className="text-text-muted/40 border-b border-white/5">
              <th className="text-left px-3 py-2 font-normal">Asset</th>
              <th className="text-right px-3 py-2 font-normal">Qty</th>
              <th className="text-right px-3 py-2 font-normal">Entry</th>
              <th className="text-right px-3 py-2 font-normal">Current</th>
              <th className="text-right px-3 py-2 font-normal">P&L</th>
              <th className="text-right px-3 py-2 font-normal">Action</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => (
              <tr key={pos.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-3 py-2.5 text-white/80">{pos.symbol}</td>
                <td className="px-3 py-2.5 text-right text-white/60">{pos.quantity}</td>
                <td className="px-3 py-2.5 text-right text-white/60">${pos.avgEntryPrice.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right text-white/80">${pos.currentPrice.toLocaleString()}</td>
                <td className={`px-3 py-2.5 text-right font-semibold ${pos.unrealizedPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {pos.unrealizedPnl >= 0 ? "+" : ""}${pos.unrealizedPnl.toLocaleString()}
                  <span className="text-[9px] ml-1 opacity-60">
                    ({pos.pnlPercent >= 0 ? "+" : ""}{pos.pnlPercent.toFixed(1)}%)
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    onClick={() => handleClose(pos)}
                    className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider rounded-sm bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                  >
                    Close
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
