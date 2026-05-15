"use client";

import { useEffect, useState, useRef } from "react";

const NEWS_ITEMS = [
  "Fed announces surprise rate cut — crypto markets rally",
  "Bust at major port: contraband seizures up 300%",
  "Gang territory dispute drives demand for heavy weaponry",
  "Hedge funds caught accumulating gang bonds",
  "BitGang Coin breaks resistance, analysts bullish",
  "Street prices for narcotics surge amid supply chain disruptions",
  "Darknet Token volatility hits all-time high",
  "Lamborghini imports restricted — luxury prices soar",
  "Rare stolen artwork from heist surfaces on black market",
  "Rolex Daytona becomes preferred collateral for underworld loans",
  "Assault rifle shortage drives prices to record highs",
  "Crypto exchange hack suspected: tokens moving to gang wallets",
];

export default function NewsTicker() {
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % NEWS_ITEMS.length);
    }, 8000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="rounded-sm border border-white/5 bg-bg-dark/50 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="text-[9px] font-mono uppercase tracking-wider text-purple-400/80 bg-purple-500/10 px-2 py-0.5 rounded-sm whitespace-nowrap">
          Flash News
        </span>
        <div className="flex-1 overflow-hidden relative h-4">
          <p
            key={index}
            className="absolute inset-0 flex items-center text-[11px] font-mono text-text-muted/60 animate-slide-in"
          >
            {NEWS_ITEMS[index]}
          </p>
        </div>
      </div>
    </div>
  );
}
