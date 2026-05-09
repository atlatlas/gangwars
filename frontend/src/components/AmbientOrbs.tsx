"use client";

export default function AmbientOrbs() {
  return (
    <>
      <div
        className="pointer-events-none fixed top-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.06]"
        style={{
          background: "radial-gradient(circle, #2563eb, transparent 70%)",
          filter: "blur(80px)",
          animation: "orbFloat 10s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none fixed bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.05]"
        style={{
          background: "radial-gradient(circle, #06b6d4, transparent 70%)",
          filter: "blur(80px)",
          animation: "orbFloat 10s ease-in-out infinite",
          animationDelay: "-5s",
        }}
      />
    </>
  );
}
