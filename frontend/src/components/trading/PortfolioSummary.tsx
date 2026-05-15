"use client";

import type { TradingAccount, TradingPosition } from "@/types";

interface Props {
  account: TradingAccount | null;
  positions: TradingPosition[];
}

export default function PortfolioSummary({ account, positions }: Props) {
  const totalPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const positionValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
  const equity = account ? account.balance + positionValue : 0;

  const cards = [
    {
      label: "Balance",
      value: account ? `$${account.balance.toLocaleString()}` : "$0",
      color: "text-cyan-300",
    },
    {
      label: "Equity",
      value: `$${equity.toLocaleString()}`,
      color: "text-purple-300",
    },
    {
      label: "Positions",
      value: `$${positionValue.toLocaleString()}`,
      color: "text-blue-300",
    },
    {
      label: "Unrealized P&L",
      value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toLocaleString()}`,
      color: totalPnl >= 0 ? "text-green-400" : "text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-sm border border-white/5 bg-bg-dark/50 px-4 py-3"
        >
          <div className="text-[9px] font-mono uppercase tracking-wider text-text-muted/40 mb-1">
            {card.label}
          </div>
          <div className={`text-sm font-mono font-semibold ${card.color}`}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}
