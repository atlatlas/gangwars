"use client";

import { Home, Swords, Users, Map, ShoppingBag, Shield, BookOpen, Eye, Building, Dices } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/crimes", label: "Crimes", icon: Swords },
  { href: "/skills", label: "Skills", icon: BookOpen },
  { href: "/market", label: "Market", icon: ShoppingBag },
  { href: "/fight", label: "Fight", icon: Map },
  { href: "/hoes", label: "Hoes", icon: Eye },
  { href: "/bank", label: "Bank", icon: Building },
  { href: "/casino", label: "Casino", icon: Dices },
  { href: "/leaderboard", label: "Ranks", icon: Users },
  { href: "/gangs", label: "Gangs", icon: Shield },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-dark/95 backdrop-blur-xl border-t border-neon-navy/10 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg transition-all duration-200 min-w-0 ${
                isActive
                  ? "text-neon-navy"
                  : "text-text-muted/60 hover:text-text-secondary"
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
