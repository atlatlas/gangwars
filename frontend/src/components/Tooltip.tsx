"use client";

import { ReactNode, useRef, useState } from "react";

interface TooltipProps {
  children: ReactNode;
  content: string;
  className?: string;
}

export default function Tooltip({ children, content, className = "" }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    setShow(true);
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      const tooltipWidth = Math.min(content.length * 7.5, 420);
      const spaceRight = window.innerWidth - rect.left;
      const spaceLeft = rect.right;
      setAlignRight(tooltipWidth > spaceLeft && spaceRight > spaceLeft);
    }
  };

  return (
    <div
      ref={wrapRef}
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className={`absolute z-50 mb-2 px-3 py-1.5 rounded-sm bg-bg-dark border border-white/10 shadow-lg pointer-events-none whitespace-nowrap ${
          alignRight ? "right-0" : "left-1/2 -translate-x-1/2"
        } bottom-full`}>
          <p className="text-[11px] font-mono text-white/70 leading-relaxed">{content}</p>
          <div className={`absolute top-full border-4 border-transparent ${
            alignRight
              ? "right-2 border-t-white/10"
              : "left-1/2 -translate-x-1/2 border-t-white/10"
          }`} />
        </div>
      )}
    </div>
  );
}
