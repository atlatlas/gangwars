"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  className?: string;
  position?: "top" | "bottom";
}

export default function Tooltip({ children, content, className = "", position = "top" }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setShow(true);
      if (wrapRef.current) {
        const rect = wrapRef.current.getBoundingClientRect();
        const tooltipWidth = 240;
        const spaceRight = window.innerWidth - rect.left;
        const spaceLeft = rect.right;
        setAlignRight(tooltipWidth > spaceLeft && spaceRight > spaceLeft);
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShow(false);
  };

  const isBottom = position === "bottom";

  return (
    <div
      ref={wrapRef}
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {show && (
        <div className={`absolute z-50 pointer-events-none ${
          alignRight ? "right-0" : "left-1/2 -translate-x-1/2"
        } ${isBottom ? "top-full mt-2" : "bottom-full mb-2"}`}>
          <div className={`animate-${isBottom ? "slide-up" : "slide-down"}`}>
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
