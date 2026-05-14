"use client";

import {
  Home,
  Swords,
  Users,
  Map,
  LogOut,
  ShoppingBag,
  Shield,
  BookOpen,
  Eye,
  Building,
  Dices,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/crimes", label: "Crimes", icon: Swords },
  { href: "/skills", label: "Skills", icon: BookOpen },
  { href: "/market", label: "Market", icon: ShoppingBag },
  { href: "/fight", label: "Fight", icon: Map },
  { href: "/hoes", label: "Hoes", icon: Eye },
  { href: "/bank", label: "Bank", icon: Building },
  { href: "/casino", label: "Casino", icon: Dices },
  { href: "/leaderboard", label: "Ranks", icon: Users },
  { href: "/gangs", label: "Gangs", icon: Shield },
  { href: "/help", label: "Help", icon: HelpCircle },
  { href: "/feedback", label: "Feedback", icon: MessageSquare },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <aside className="relative sticky top-12 min-h-[calc(100vh-3rem)] flex flex-col overflow-y-auto w-full">
      {/* Retro background layers */}
      <div className="absolute inset-0 bg-bg-dark" />
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(147,51,234,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(147,51,234,0.3) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      {/* Scanline overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
        }}
      />
      {/* Border-right glow */}
      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-purple-500/20 via-purple-500/5 to-transparent" />

      {/* Content — relative to sit above backgrounds */}
      <div className="relative flex flex-col h-full">
        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm tracking-wider uppercase transition-all duration-150 ${
                  isActive
                    ? "text-purple-300 bg-purple-500/10 border-l-2 border-purple-500 shadow-[inset_0_0_12px_rgba(147,51,234,0.08)]"
                    : "text-text-muted/50 hover:text-purple-400 hover:bg-purple-500/5 hover:border-l-2 hover:border-purple-500/30 border-l-2 border-transparent"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-purple-500 shadow-[0_0_6px_rgba(147,51,234,0.6)]" />
                )}
                <item.icon size={16} className={isActive ? "text-purple-400" : "text-purple-400/60 group-hover:text-purple-400"} />
                <span className="font-mono text-sm tracking-[0.15em]">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-purple-500/10">
          <p className="text-[10px] text-text-muted/20 tracking-[0.2em] uppercase font-mono">Gang Wars &copy; 2026</p>
          <button
            onClick={handleLogout}
            className="text-pink-400/30 hover:text-pink-400 transition-colors"
            title="Logout"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
