"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skull } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-deep">
      <div className="text-center">
        <Skull size={48} className="text-neon-navy mx-auto mb-4 animate-glow-pulse" />
        <p className="text-text-secondary/60 text-sm tracking-wider uppercase">Loading...</p>
      </div>
    </div>
  );
}
