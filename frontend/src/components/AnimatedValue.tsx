"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

interface AnimatedValueProps {
  value: number | string;
  children?: ReactNode;
  className?: string;
  format?: "cash" | "turns" | "hp" | "respect" | "plain";
}

const flashStyles: Record<string, string> = {
  cash: "text-neon-green",
  turns: "text-neon-yellow",
  hp: "text-neon-red",
  respect: "text-neon-cyan",
  plain: "text-neon-navy",
};

export default function AnimatedValue({ value, children, className = "", format = "plain" }: AnimatedValueProps) {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prevRef.current !== value) {
      setFlash(true);
      prevRef.current = value;
      const timer = setTimeout(() => setFlash(false), 900);
      return () => clearTimeout(timer);
    }
  }, [value]);

  const display =
    children ??
    (typeof value === "number"
      ? format === "cash"
        ? value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : format === "turns"
        ? String(value)
        : format === "hp"
        ? String(value)
        : String(value)
      : String(value));

  return (
    <span className={`transition-all duration-300 ${flash ? flashStyles[format] : ""} ${className}`}>
      {display}
    </span>
  );
}
