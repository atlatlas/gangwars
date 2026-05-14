"use client";

import {
  Lock,
  Shield,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  Check,
  Sword,
  Users,
  Plus,
} from "lucide-react";
import { useState } from "react";
import type { MarketItem, ItemEffects } from "@/types";

interface ItemCardProps {
  item: MarketItem;
  playerCash: number;
  playerLevel: number;
  playerRespect: number;
  inventoryFull: boolean;
  onBuy: (itemId: number, quantity: number) => Promise<void>;
  onSell?: (inventoryId: number, quantity: number) => Promise<void>;
  onEquip?: (inventoryId: number) => Promise<void>;
  inventoryId?: number;
}

function formatEffect(effects: ItemEffects): string {
  const parts: string[] = [];
  if (effects.crimeBonus) parts.push(`+${effects.crimeBonus}% crime`);
  if (effects.pvpPower) parts.push(`+${effects.pvpPower} PVP`);
  if (effects.arrestReduction) parts.push(`-${effects.arrestReduction}% arrest`);
  return parts.join(" | ");
}

export default function ItemCard({
  item,
  playerCash,
  playerLevel,
  playerRespect,
  inventoryFull,
  onBuy,
  onSell,
  onEquip,
  inventoryId,
}: ItemCardProps) {
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const [selling, setSelling] = useState(false);
  const [equipping, setEquipping] = useState(false);

  const levelLocked = playerLevel < item.minLevel;
  const respectLocked = item.minRespect > 0 && playerRespect < item.minRespect;
  const price = item.currentPrice ?? item.buyPrice;
  const canAfford = playerCash >= price * quantity;
  const isDrug = item.type === "drug";
  const isWeapon = item.type === "arm";
  const isFootman = item.type === "footman";
  const isPimp = item.type === "pimp";
  const owned = typeof item.owned === "number" ? item.owned : item.owned ? 1 : 0;

  const trendIcon = item.trend === "up" ? (
    <ArrowUp size={12} className="text-neon-green" />
  ) : item.trend === "down" ? (
    <ArrowDown size={12} className="text-neon-red" />
  ) : (
    <Minus size={12} className="text-white/30" />
  );

  const typeIcon = isWeapon ? (
    <Sword size={14} className="text-pink-400" />
  ) : isDrug ? (
    <AlertTriangle size={14} className="text-yellow-400" />
  ) : (
    <Users size={14} className="text-cyan-400" />
  );

  const typeLabel = isWeapon ? "Weapon" : isDrug ? "Drug" : isFootman ? "Footman" : "Pimp";

  const handleBuy = async () => {
    setBuying(true);
    try {
      await onBuy(item.id, quantity);
      setQuantity(1);
    } finally {
      setBuying(false);
    }
  };

  const handleSell = async () => {
    if (!inventoryId || !onSell) return;
    setSelling(true);
    try {
      await onSell(inventoryId, quantity);
      setQuantity(1);
    } finally {
      setSelling(false);
    }
  };

  const handleEquip = async () => {
    if (!inventoryId || !onEquip) return;
    setEquipping(true);
    try {
      await onEquip(inventoryId);
    } finally {
      setEquipping(false);
    }
  };

  const isLocked = levelLocked || respectLocked;

  return (
    <div
      className={`rounded-sm border ${
        isLocked ? "border-white/5 opacity-50" : "border-white/5 bg-bg-dark/80"
      }`}
    >
      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {typeIcon}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className={`font-mono text-sm tracking-wide truncate ${isLocked ? "text-white/30" : "text-white/80"}`}>
                  {item.name}
                </h3>
                {isLocked && <Lock size={10} className="shrink-0 text-white/30" />}
              </div>
              <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider">{typeLabel}</span>
            </div>
          </div>

          {/* Price */}
          <div className="shrink-0 text-right">
            {isDrug && item.currentPrice != null ? (
              <div className="flex items-center gap-1 justify-end">
                <span className={`font-mono text-sm ${canAfford && !isLocked ? "text-cyan-300" : "text-red-400/60"}`}>
                  ${item.currentPrice.toLocaleString()}
                </span>
                {trendIcon}
              </div>
            ) : (
              <span className={`font-mono text-sm ${canAfford && !isLocked ? "text-cyan-300" : "text-red-400/60"}`}>
                ${item.buyPrice.toLocaleString()}
              </span>
            )}
            {item.sellPrice > 0 && !isDrug && (
              <div className="text-[10px] font-mono text-white/20">Sell: ${item.sellPrice}</div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-[11px] font-mono text-white/40 leading-relaxed line-clamp-2">
          {item.description}
        </p>

        {/* Effects */}
        {formatEffect(item.effects) && (
          <div className="flex items-center gap-1.5">
            <Shield size={10} className="text-purple-400/60 shrink-0" />
            <span className="text-[10px] font-mono text-purple-300/60">
              {formatEffect(item.effects)}
            </span>
          </div>
        )}

        {/* Requirements */}
        {levelLocked && (
          <div className="text-[10px] font-mono text-red-400/60 flex items-center gap-1">
            <Lock size={10} /> Requires Level {item.minLevel}
          </div>
        )}
        {respectLocked && (
          <div className="text-[10px] font-mono text-red-400/60 flex items-center gap-1">
            <Lock size={10} /> Requires {item.minRespect} Respect
          </div>
        )}

        {/* Owned badge */}
        {!isLocked && owned > 0 && (
          <div className="flex items-center gap-1">
            <Check size={10} className="text-emerald-400" />
            <span className="text-[10px] font-mono text-emerald-400/60">
              {isWeapon
                ? "Owned"
                : isFootman || isPimp
                ? `${owned} Hired`
                : `${owned} owned`}
            </span>
            {isWeapon && item.equipped && (
              <span className="text-[10px] font-mono text-cyan-400/60 ml-1">(Equipped)</span>
            )}
          </div>
        )}

        {/* Actions */}
        {!isLocked && (
          <div className="flex items-center gap-2 pt-1">
            {/* Buy section */}
            {isWeapon && owned > 0 ? null : (
              <div className="flex items-center gap-1 flex-1">
                {(isDrug || isFootman || isPimp) && (
                  <div className="flex items-center gap-1 mr-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-0.5 rounded text-white/30 hover:text-white/60 transition-colors"
                      disabled={quantity <= 1}
                    >
                      <Minus size={12} />
                    </button>
                    <span className="font-mono text-[11px] text-white/60 w-4 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(99, quantity + 1))}
                      className="p-0.5 rounded text-white/30 hover:text-white/60 transition-colors"
                      disabled={quantity >= 99}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}
                <button
                  onClick={handleBuy}
                  disabled={buying || !canAfford || (isWeapon && owned > 0)}
                  className={`flex-1 px-2 py-1.5 rounded-sm text-[11px] font-mono uppercase tracking-wider transition-all ${
                    !canAfford || (isWeapon && owned > 0)
                      ? "bg-white/5 text-white/20 cursor-not-allowed"
                      : inventoryFull
                      ? "bg-yellow-500/10 text-yellow-400/60 border border-yellow-500/20 cursor-not-allowed"
                      : "bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20"
                  }`}
                >
                  {buying
                    ? "Buying..."
                    : inventoryFull
                    ? "Inventory Full"
                    : !canAfford
                    ? "Can't Afford"
                    : isWeapon && owned > 0
                    ? "Owned"
                    : `Buy $${((item.currentPrice ?? item.buyPrice) * quantity).toLocaleString()}`}
                </button>
              </div>
            )}

            {/* Equip/Unequip (weapons only) */}
            {isWeapon && owned > 0 && inventoryId && onEquip && (
              <button
                onClick={handleEquip}
                disabled={equipping}
                className={`flex-1 px-2 py-1.5 rounded-sm text-[11px] font-mono uppercase tracking-wider transition-all ${
                  item.equipped
                    ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20"
                    : "bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20"
                }`}
              >
                {equipping ? "..." : item.equipped ? "Unequip" : "Equip"}
              </button>
            )}

            {/* Sell (drugs, footmen, pimps) */}
            {(isDrug || isFootman || isPimp) && owned > 0 && inventoryId && onSell && (
              <div className="flex items-center gap-1 flex-1">
                <div className="flex items-center gap-1 mr-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-0.5 rounded text-white/30 hover:text-white/60 transition-colors"
                    disabled={quantity <= 1}
                  >
                    <Minus size={12} />
                  </button>
                  <span className="font-mono text-[11px] text-white/60 w-4 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(owned, quantity + 1))}
                    className="p-0.5 rounded text-white/30 hover:text-white/60 transition-colors"
                    disabled={quantity >= owned}
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <button
                  onClick={handleSell}
                  disabled={selling}
                  className="flex-1 px-2 py-1.5 rounded-sm text-[11px] font-mono uppercase tracking-wider transition-all bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20"
                >
                  {selling ? "..." : `Sell $${((item.sellPrice ?? item.currentPrice ?? item.buyPrice) * quantity).toLocaleString()}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
