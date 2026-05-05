"use client";

import { useEffect, useRef, useState } from "react";

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: "crimson" | "cyan" | "gold";
  flashKey?: number;
}

const flashMap: Record<string, string> = {
  crimson: "text-neon-navy",
  cyan: "text-neon-cyan",
  gold: "text-neon-yellow",
};

const accentMap: Record<string, string> = {
  crimson: "text-neon-navy",
  cyan: "text-neon-cyan",
  gold: "text-neon-yellow",
};

export default function StatsCard({ icon, label, value, sub, color = "crimson", flashKey }: StatsCardProps) {
  const prevKey = useRef(flashKey);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (flashKey !== undefined && prevKey.current !== flashKey) {
      setFlash(true);
      prevKey.current = flashKey;
      const timer = setTimeout(() => setFlash(false), 900);
      return () => clearTimeout(timer);
    }
  }, [flashKey]);

  return (
    <div className="card flex items-center gap-3 group">
      <div className={`${accentMap[color]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="stat-label text-text-muted/60">{label}</div>
        <div className={`stat-value truncate transition-colors duration-300 ${flash ? flashMap[color] : ""}`}>
          {value}
        </div>
        {sub && <div className="text-xs text-text-muted/40 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
