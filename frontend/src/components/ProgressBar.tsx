"use client";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  color?: "pink" | "cyan" | "gold" | "rose" | "red" | "green" | "purple" | "blue";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const barStyles: Record<string, string> = {
  pink: "from-pink-500/60 to-pink-300/70",
  cyan: "from-cyan-500/60 to-cyan-300/70",
  gold: "from-yellow-500/60 to-yellow-300/70",
  rose: "from-red-500/60 to-red-300/70",
  red: "from-red-600/60 to-red-400/70",
  green: "from-green-500/60 to-green-300/70",
  purple: "from-purple-500/60 to-purple-300/70",
  blue: "from-blue-500/60 to-cyan-300/70",
};

const glowColors: Record<string, string> = {
  pink: "rgba(236,72,153,0.3)",
  cyan: "rgba(34,211,238,0.3)",
  gold: "rgba(250,204,21,0.3)",
  rose: "rgba(248,113,113,0.3)",
  red: "rgba(220,38,38,0.3)",
  green: "rgba(74,222,128,0.3)",
  purple: "rgba(168,85,247,0.3)",
  blue: "rgba(37,99,235,0.3)",
};

const sizes = {
  sm: "h-1",
  md: "h-1.5",
  lg: "h-2",
};

export default function ProgressBar({
  value,
  max,
  label,
  color = "pink",
  size = "md",
  showLabel = true,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const bar = barStyles[color];
  const glow = glowColors[color];

  return (
    <div className="w-full">
      {(label || showLabel) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs font-mono tracking-wide text-white/35 uppercase">{label}</span>}
          {showLabel && (
            <span className="text-xs font-mono text-white/30">
              {value.toLocaleString()}/{max.toLocaleString()}
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-black/30 rounded-full ${sizes[size]} overflow-hidden shadow-[inset_0_0_4px_rgba(0,0,0,0.3)]`}>
        <div
          className={`${sizes[size]} bg-gradient-to-r ${bar} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${pct}%`, boxShadow: `0 0 6px ${glow}` }}
        />
      </div>
    </div>
  );
}
