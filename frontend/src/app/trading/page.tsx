"use client";

import { useEffect, useState, useCallback } from "react";
import type { TradingAsset, TradingAccount, TradingPosition } from "@/types";
import { tradingApi } from "@/lib/tradingApi";
import { getTradingSocket } from "@/lib/tradingSocket";
import TradingChart from "@/components/trading/TradingChart";
import OrderForm from "@/components/trading/OrderForm";
import PositionsTable from "@/components/trading/PositionsTable";
import Watchlist from "@/components/trading/Watchlist";
import PortfolioSummary from "@/components/trading/PortfolioSummary";
import NewsTicker from "@/components/trading/NewsTicker";
import { useTopNotification } from "@/components/TopNotification";

export default function TradingPage() {
  const { showNotification } = useTopNotification();
  const [selectedAsset, setSelectedAsset] = useState<TradingAsset | null>(null);
  const [account, setAccount] = useState<TradingAccount | null>(null);
  const [positions, setPositions] = useState<TradingPosition[]>([]);
  const [depositAmount, setDepositAmount] = useState(10000);
  const [withdrawAmount, setWithdrawAmount] = useState(10000);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [acc, pos] = await Promise.all([
        tradingApi.account(),
        tradingApi.positions(),
      ]);
      setAccount(acc);
      setPositions(pos);
    } catch {
      // not logged in or server error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh on socket tick
  useEffect(() => {
    const socket = getTradingSocket();
    const handleTicker = () => {
      // Refresh positions P&L when prices update
      tradingApi.positions().then(setPositions).catch(() => {});
      tradingApi.account().then(setAccount).catch(() => {});
    };
    socket.on("market:ticker", handleTicker);
    return () => {
      socket.off("market:ticker", handleTicker);
    };
  }, []);

  const handleDeposit = async () => {
    try {
      const result = await tradingApi.deposit(depositAmount);
      setAccount(result);
      showNotification(`Deposited $${depositAmount.toLocaleString()} to trading account`, "success");
    } catch (err: any) {
      showNotification(err.message || "Deposit failed", "error");
    }
  };

  const handleWithdraw = async () => {
    try {
      const result = await tradingApi.withdraw(withdrawAmount);
      setAccount(result);
      showNotification(`Withdrew $${withdrawAmount.toLocaleString()} from trading account`, "success");
    } catch (err: any) {
      showNotification(err.message || "Withdraw failed", "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-deep p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-text-muted/40 text-sm font-mono">Loading trading terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-deep p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-mono font-semibold text-white tracking-wider uppercase">
            Black Market Terminal
          </h1>
          <p className="text-[10px] font-mono text-text-muted/40 tracking-widest uppercase">
            Simulated Trading Desk
          </p>
        </div>
      </div>

      {/* Portfolio Summary */}
      <PortfolioSummary account={account} positions={positions} />

      {/* Deposit / Withdraw controls */}
      {account && (
        <div className="flex flex-wrap gap-3 items-center rounded-sm border border-white/5 bg-bg-dark/50 px-4 py-3">
          <span className="text-[10px] font-mono text-text-muted/60 uppercase tracking-wider">Account:</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={depositAmount}
              onChange={(e) => setDepositAmount(parseInt(e.target.value) || 0)}
              className="w-28 px-2 py-1 rounded-sm bg-black/30 border border-white/5 text-[11px] font-mono text-white/80 focus:outline-none focus:border-purple-500/40"
            />
            <button
              onClick={handleDeposit}
              className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded-sm bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all"
            >
              Deposit
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(parseInt(e.target.value) || 0)}
              className="w-28 px-2 py-1 rounded-sm bg-black/30 border border-white/5 text-[11px] font-mono text-white/80 focus:outline-none focus:border-purple-500/40"
            />
            <button
              onClick={handleWithdraw}
              className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded-sm bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
            >
              Withdraw
            </button>
          </div>
        </div>
      )}

      {/* Main grid: chart + watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <TradingChart asset={selectedAsset} />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <OrderForm asset={selectedAsset} accountBalance={account?.balance ?? 0} onSuccess={refresh} />
            </div>
            <div className="lg:col-span-3">
              <PositionsTable positions={positions} onUpdate={refresh} />
            </div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <Watchlist
            selectedId={selectedAsset?.id ?? null}
            onSelect={(asset) => {
              setSelectedAsset(asset);
            }}
          />
        </div>
      </div>

      {/* Fills / Order history - compact */}
      <OrderHistory />

      {/* News ticker */}
      <NewsTicker />
    </div>
  );
}

function OrderHistory() {
  const [fills, setFills] = useState<any[]>([]);
  const [showFills, setShowFills] = useState(false);

  useEffect(() => {
    tradingApi.fills().then(setFills).catch(() => {});
  }, []);

  return (
    <div className="rounded-sm border border-white/5 bg-bg-dark/50 overflow-hidden">
      <button
        onClick={() => setShowFills(!showFills)}
        className="w-full flex items-center justify-between px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-white/50 hover:text-white/70 transition-all"
      >
        <span>Trade History ({fills.length})</span>
        <span className="text-xs">{showFills ? "▲" : "▼"}</span>
      </button>
      {showFills && (
        <div className="overflow-x-auto border-t border-white/5">
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="text-text-muted/40 border-b border-white/5">
                <th className="text-left px-3 py-2 font-normal">Asset</th>
                <th className="text-left px-3 py-2 font-normal">Side</th>
                <th className="text-right px-3 py-2 font-normal">Qty</th>
                <th className="text-right px-3 py-2 font-normal">Price</th>
                <th className="text-right px-3 py-2 font-normal">Total</th>
                <th className="text-right px-3 py-2 font-normal">P&L</th>
                <th className="text-right px-3 py-2 font-normal">Time</th>
              </tr>
            </thead>
            <tbody>
              {fills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center px-3 py-6 text-text-muted/30 text-[11px]">
                    No trades yet
                  </td>
                </tr>
              ) : (
                fills.map((fill: any) => (
                  <tr key={fill.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-3 py-2 text-white/80">{fill.symbol || `#${fill.assetId}`}</td>
                    <td className={`px-3 py-2 ${fill.side === "buy" ? "text-green-400" : "text-red-400"}`}>
                      {fill.side.toUpperCase()}
                    </td>
                    <td className="px-3 py-2 text-right text-white/60">{fill.quantity}</td>
                    <td className="px-3 py-2 text-right text-white/60">${fill.price.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-white/60">${fill.total.toLocaleString()}</td>
                    <td className={`px-3 py-2 text-right ${fill.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {fill.pnl >= 0 ? "+" : ""}${fill.pnl.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-text-muted/40">
                      {new Date(fill.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
