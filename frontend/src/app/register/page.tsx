"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/api";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await auth.register(username, email, password);
      localStorage.setItem("token", res.token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Fullscreen background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/login.png)" }}
      />
      {/* Dark purple overlay */}
      <div className="absolute inset-0 bg-[rgba(20,15,30,0.45)]" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Glassmorphism card */}
        <div className="backdrop-blur-md bg-[rgba(30,20,40,0.55)] rounded-2xl border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.5)] p-10 text-center">
          {/* Logo */}
          <div className="mb-10 flex justify-center">
            <Image
              src="/logo.png"
              alt="Gang Wars"
              width={280}
              height={100}
              className="h-auto drop-shadow-[0_0_15px_rgba(147,51,234,0.6)]"
              priority
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="relative">
              <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-[#6b93d6] text-lg" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[rgba(40,30,40,0.8)] border-2 border-[#3b4a6c] rounded-lg px-12 py-3.5 text-white text-base placeholder:text-[#aaa] placeholder:uppercase placeholder:tracking-widest outline-none transition-all duration-300 focus:border-[#2563eb] focus:shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                placeholder="Username"
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
                required
                autoFocus
              />
            </div>

            {/* Email */}
            <div className="relative">
              <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-[#6b93d6] text-lg" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[rgba(40,30,40,0.8)] border-2 border-[#3b4a6c] rounded-lg px-12 py-3.5 text-white text-base placeholder:text-[#aaa] placeholder:uppercase placeholder:tracking-widest outline-none transition-all duration-300 focus:border-[#2563eb] focus:shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                placeholder="Email"
                required
              />
            </div>

            {/* Password */}
            <div className="relative">
              <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-[#6b93d6] text-lg" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[rgba(40,30,40,0.8)] border-2 border-[#3b4a6c] rounded-lg px-12 py-3.5 text-white text-base placeholder:text-[#aaa] placeholder:uppercase placeholder:tracking-widest outline-none transition-all duration-300 focus:border-[#2563eb] focus:shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                placeholder="Password"
                minLength={6}
                required
              />
            </div>

            {error && (
              <div className="text-[#ef4444] text-sm bg-[rgba(239,68,68,0.1)] rounded-lg px-3 py-2.5 border border-[rgba(239,68,68,0.2)]">
                {error}
              </div>
            )}

            {/* Register button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 border-none text-white font-['Permanent_Marker',cursive] text-2xl tracking-wide cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
            >
              {loading ? "CREATING..." : "Join"}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-10 text-base text-[#ccc]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#2563eb] font-bold no-underline border-b-2 border-transparent transition-all duration-300 hover:border-[#2563eb] hover:text-white">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
