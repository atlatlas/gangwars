"use client";

export default function CursorGlow() {
  return (
    <div
      className="pointer-events-none fixed bottom-0 left-0 right-0 h-72 -z-10"
      style={{
        background: "linear-gradient(to top, rgba(236,72,153,0.1), transparent 80%)",
      }}
    />
  );
}
