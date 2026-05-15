"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/dashboard");
    } else {
      router.push("/landing");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-deep">
      <div className="text-center">
        <img src="/logo.png" alt="Gang Wars" className="h-40 w-auto mx-auto mb-4 drop-shadow-[0_0_32px_rgba(147,51,234,0.6)]" />
        <p className="text-text-secondary/60 text-sm tracking-wider uppercase">Loading...</p>
      </div>
    </div>
  );
}
