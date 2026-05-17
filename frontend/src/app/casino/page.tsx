"use client";

import { useState } from "react";
import GameLayout from "@/components/GameLayout";
import { useUser } from "@/lib/UserContext";
import { useTopNotification } from "@/components/TopNotification";
import { casino as casinoApi } from "@/lib/api";
import Image from "next/image";
import { Dices, DollarSign, Loader2, Star } from "lucide-react";

type GameTab = "blackjack" | "slots" | "ride-the-bus";

export default function CasinoPage() {
  const [activeTab, setActiveTab] = useState<GameTab>("blackjack");

  return (
    <GameLayout>
      {/* Hero Section */}
      <div className="relative mb-0 h-[180px] md:h-[260px]">
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-cyan-500/5" />
        <Image
          src="/casino.png?v=1"
          alt="Casino"
          width={1897}
          height={829}
          className="w-full h-full max-h-[200px] md:max-h-[280px] object-cover object-bottom relative z-0"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 md:px-6 pb-3 md:pb-4">
          <div className="flex items-center gap-2">
            <Dices size={18} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]" />
            <h1 className="text-lg md:text-xl font-bold text-white drop-shadow-lg">Casino</h1>
          </div>
          <div className="w-36 h-px bg-pink-400/40 mt-1 mb-2" />
          <div className="bg-black/30 backdrop-blur-sm rounded-sm px-2 py-1.5 mb-1 -mx-1 border-t border-l border-white/10">
            <p className="text-[10px] md:text-xs font-mono text-white/60 tracking-wider">
              Luck favors the bold — try your hand at blackjack, slots, or ride the bus.
              <br />All games take a small rake. Higher Intelligence improves your odds.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-pink-500/40 to-transparent" />
            <Star size={10} className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.5)]" fill="#f472b6" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-pink-500/40 to-transparent" />
          </div>
        </div>
      </div>
      <div className="shadow-[inset_0_20px_20px_-12px_rgba(0,0,0,0.7)] border-t border-pink-500/15">
        <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b border-white/5">
          {([
            { id: "blackjack" as const, label: "Blackjack" },
            { id: "slots" as const, label: "Slots" },
            { id: "ride-the-bus" as const, label: "Ride the Bus" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? "text-pink-300 border-b-2 border-pink-500"
                  : "text-white/30 hover:text-white/60 border-b-2 border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "blackjack" && <BlackjackPanel />}
        {activeTab === "slots" && <SlotsPanel />}
        {activeTab === "ride-the-bus" && <RideTheBusPanel />}
      </div>
      </div>
    </GameLayout>
  );
}

// ─── Blackjack ───

function BlackjackPanel() {
  const { user, refreshUser } = useUser();
  const { showNotification } = useTopNotification();
  const [bet, setBet] = useState("");
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerHand, setPlayerHand] = useState<any[]>([]);
  const [dealerHand, setDealerHand] = useState<any[]>([]);
  const [dealerUpcard, setDealerUpcard] = useState<any>(null);
  const [playerValue, setPlayerValue] = useState(0);
  const [status, setStatus] = useState<string>("idle");
  const [payout, setPayout] = useState(0);
  const [loading, setLoading] = useState(false);

  const cardStr = (c: any) => `${c.rank}${c.suit[0].toUpperCase()}`;

  const handleDeal = async () => {
    const val = parseInt(bet);
    if (!val || val < 100) { showNotification("Minimum bet is $100", "error"); return; }
    if ((user?.cash ?? 0) < val) { showNotification("Not enough cash", "error"); return; }
    setLoading(true);
    try {
      const data = await casinoApi.blackjackDeal(val);
      setPlayerHand(data.playerHand);
      setPlayerValue(data.playerValue);
      setPayout(data.payout);
      if (data.gameId) {
        setGameId(data.gameId);
        setDealerUpcard(data.dealerUpcard);
        setDealerHand([]);
        setStatus("playing");
      } else {
        setGameId(null);
        setDealerHand(data.dealerHand);
        setStatus("round_over");
        if (data.status === "blackjack") showNotification("Blackjack! $" + data.payout, "success");
        else if (data.status === "push") showNotification("Push — bet returned", "info");
      }
      await refreshUser();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "hit" | "stand" | "double") => {
    if (!gameId) return;
    setLoading(true);
    try {
      const data = await casinoApi.blackjackAction(gameId, action);
      if (action === "hit" && data.status === "active") {
        // Still playing — update hand, keep game alive
        setPlayerHand(data.playerHand);
        setPlayerValue(data.playerValue);
        setDealerHand([]);
        setPayout(0);
      } else {
        // Hand resolved
        setPlayerHand(data.playerHand);
        setPlayerValue(data.playerValue);
        setDealerHand(data.dealerHand);
        setPayout(data.payout);
        setGameId(null);
        setStatus("round_over");

        if (data.status === "player_bust") showNotification("Bust!", "error");
        else if (data.status === "player_win" || data.status === "dealer_bust")
          showNotification(`You won $${data.payout}!`, "success");
        else if (data.status === "push") showNotification("Push — bet returned", "info");
        else showNotification("Dealer wins!", "error");
      }
      await refreshUser();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStatus("idle");
    setBet("");
    setGameId(null);
    setPlayerHand([]);
    setDealerHand([]);
    setPayout(0);
  };

  if (status === "idle" || status === "round_over") {
    return (
      <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4">
        {status === "round_over" && (
          <div className="mb-4 space-y-3">
            <div className="rounded-sm bg-black/30 p-3">
              <p className="text-xs font-mono text-cyan-400/70 uppercase mb-2">Dealer</p>
              <div className="flex gap-2 flex-wrap">
                {dealerHand.map((c: any, i: number) => (
                  <span key={i} className="font-mono text-sm text-white/80 bg-black/40 px-2 py-1 rounded">{cardStr(c)}</span>
                ))}
              </div>
              <p className="text-xs font-mono text-white/30 mt-1">Value: {handTotal(dealerHand)}</p>
            </div>
            <div className="rounded-sm bg-pink-500/10 p-3">
              <p className="text-xs font-mono text-pink-400/70 uppercase mb-2">Your Hand</p>
              <div className="flex gap-2 flex-wrap">
                {playerHand.map((c: any, i: number) => (
                  <span key={i} className="font-mono text-sm text-white bg-black/40 px-2 py-1 rounded">{cardStr(c)}</span>
                ))}
              </div>
              <p className="text-xs font-mono text-white/30 mt-1">Value: {playerValue}</p>
            </div>
            <div className="text-center pt-2">
              <p className={`text-sm font-mono ${payout > 0 ? "text-pink-300" : "text-white/50"}`}>
                {payout > 0 ? `You won $${payout}!` : "You lost this hand."}
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 mb-4">
          <DollarSign size={16} className="text-pink-400" />
          <input
            type="number" min="100"
            value={bet} onChange={(e) => setBet(e.target.value)}
            placeholder="Enter bet ($100 min)..."
            className="flex-1 bg-black/30 border border-white/10 rounded-sm px-3 py-2 font-mono text-sm text-white/80 placeholder-white/20 outline-none focus:border-pink-500/40"
          />
        </div>
        <button onClick={handleDeal} disabled={loading || !bet}
          className="w-full py-2.5 rounded-sm bg-pink-500/10 border border-pink-500/30 text-pink-300 font-mono text-xs uppercase tracking-wider hover:bg-pink-500/20 disabled:opacity-30 transition-all">
          {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : status === "round_over" ? "Play Again" : "Deal Hand"}
        </button>
      </div>
    );
  }

  // Playing state
  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4">
        <p className="text-xs font-mono text-cyan-400/70 uppercase mb-2">Dealer</p>
        <div className="flex gap-2 flex-wrap mb-1">
          <span className="font-mono text-sm text-white/80 bg-black/30 px-2 py-1 rounded">{cardStr(dealerUpcard)}</span>
          <span className="font-mono text-sm text-white/30 bg-black/30 px-2 py-1 rounded border border-dashed border-white/10">?</span>
        </div>
      </div>
      <div className="rounded-sm border border-pink-500/20 bg-bg-dark/80 p-4">
        <p className="text-xs font-mono text-pink-400/70 uppercase mb-2">Your Hand ({playerValue})</p>
        <div className="flex gap-2 flex-wrap mb-3">
          {playerHand.map((c: any, i: number) => (
            <span key={i} className="font-mono text-sm text-white bg-black/30 px-2 py-1 rounded">{cardStr(c)}</span>
          ))}
        </div>
        <div className="flex gap-2">
          {playerHand.length === 2 && (
            <button onClick={() => handleAction("double")} disabled={loading}
              className="flex-1 py-2 rounded-sm bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 font-mono text-xs uppercase hover:bg-yellow-500/20 disabled:opacity-30 transition-all">
              {loading ? "..." : "Double"}
            </button>
          )}
          <button onClick={() => handleAction("hit")} disabled={loading}
            className="flex-1 py-2 rounded-sm bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs uppercase hover:bg-cyan-500/20 disabled:opacity-30 transition-all">
            {loading ? "..." : "Hit"}
          </button>
          <button onClick={() => handleAction("stand")} disabled={loading}
            className="flex-1 py-2 rounded-sm bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-xs uppercase hover:bg-purple-500/20 disabled:opacity-30 transition-all">
            Stand
          </button>
        </div>
      </div>
      {loading && <p className="text-center text-xs font-mono text-white/30">Processing...</p>}
    </div>
  );
}

function handTotal(hand: any[]) {
  if (!hand || hand.length === 0) return 0;
  let total = hand.reduce((s: number, c: any) => s + c.value, 0);
  let aces = hand.filter((c: any) => c.rank === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

// ─── Slots ───

const SYMBOL_EMOJIS: Record<string, string> = {
  cherry: "🍒", lemon: "🍋", orange: "🍊", grape: "🍇",
  bell: "🔔", diamond: "💎", seven: "7️⃣", skull: "💀",
};

const SYMBOL_NAMES: Record<string, string> = {
  cherry: "Cherry", lemon: "Lemon", orange: "Orange", grape: "Grape",
  bell: "Bell", diamond: "Diamond", seven: "Seven", skull: "Skull",
};

function SlotsPanel() {
  const { user, refreshUser } = useUser();
  const { showNotification } = useTopNotification();
  const [bet, setBet] = useState("");
  const [reels, setReels] = useState<string[] | null>(null);
  const [payout, setPayout] = useState(0);
  const [multiplier, setMultiplier] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const handleSpin = async () => {
    const val = parseInt(bet);
    if (!val || val < 100) { showNotification("Minimum bet is $100", "error"); return; }
    if ((user?.cash ?? 0) < val) { showNotification("Not enough cash", "error"); return; }
    setSpinning(true);
    setReels(null);
    try {
      const data = await casinoApi.slotsSpin(val);
      setReels(data.reels);
      setPayout(data.payout);
      setMultiplier(data.multiplier);
      if (data.payout > 0) {
        showNotification(`You won $${data.payout} (${data.multiplier}x)!`, "success");
      } else {
        showNotification("No luck this time!", "error");
      }
      await refreshUser();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setSpinning(false);
    }
  };

  return (
    <div>
      <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-6 mb-4 text-center">
        <div className="flex justify-center gap-5 text-5xl mb-3">
          {spinning ? (
            <span className="text-3xl animate-pulse text-white/20">🎰</span>
          ) : reels ? (
            reels.map((sym, i) => (
              <span key={i} className="drop-shadow-[0_0_8px_rgba(236,72,153,0.3)]">
                {SYMBOL_EMOJIS[sym] || "❓"}
              </span>
            ))
          ) : (
            <span className="text-3xl text-white/20">🎰 🎰 🎰</span>
          )}
        </div>
        {reels && (
          <p className="text-xs font-mono text-white/30 mb-2">
            {reels.map((s) => SYMBOL_NAMES[s] || s).join(" — ")}
          </p>
        )}
        {multiplier > 0 && (
          <p className="text-lg font-mono text-pink-300">{multiplier}x multiplier!</p>
        )}
        {payout > 0 && (
          <p className="text-sm font-mono text-cyan-300 mt-1">+${payout.toLocaleString()}</p>
        )}
      </div>

      <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign size={16} className="text-pink-400" />
          <input type="number" min="100" value={bet}
            onChange={(e) => setBet(e.target.value)}
            placeholder="Bet amount..."
            className="flex-1 bg-black/30 border border-white/10 rounded-sm px-3 py-2 font-mono text-sm text-white/80 placeholder-white/20 outline-none focus:border-pink-500/40"
          />
        </div>
        <button onClick={handleSpin} disabled={spinning || !bet}
          className="w-full py-3 rounded-sm bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 text-pink-300 font-mono text-sm uppercase tracking-wider hover:from-pink-500/30 hover:to-purple-500/30 disabled:opacity-30 transition-all">
          {spinning ? <Loader2 size={16} className="animate-spin mx-auto" /> : "SPIN"}
        </button>
      </div>
    </div>
  );
}

// ─── Ride the Bus ───

function renderGuessButtons(round: number, onGuess: (g: string) => void, loading: boolean) {
  const btn = (guess: string, label: string, color: string) => (
    <button key={guess} onClick={() => onGuess(guess)} disabled={loading}
      className={`px-4 py-2 rounded-sm font-mono text-xs uppercase tracking-wider ${color} disabled:opacity-30 transition-all`}>
      {label}
    </button>
  );

  switch (round) {
    case 1:
      return (
        <div className="flex justify-center gap-3">
          {btn("red", "Red", "bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20")}
          {btn("black", "Black", "bg-gray-500/10 border border-gray-500/30 text-gray-300 hover:bg-gray-500/20")}
        </div>
      );
    case 2:
      return (
        <div className="flex justify-center gap-3">
          {btn("higher", "Higher", "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20")}
          {btn("lower", "Lower", "bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20")}
        </div>
      );
    case 3:
      return (
        <div className="flex justify-center gap-3">
          {btn("inside", "Inside", "bg-green-500/10 border border-green-500/30 text-green-300 hover:bg-green-500/20")}
          {btn("outside", "Outside", "bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20")}
        </div>
      );
    case 4:
      return (
        <div className="flex justify-center gap-2 flex-wrap">
          {btn("hearts", "♥ Hearts", "bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20")}
          {btn("diamonds", "♦ Diamonds", "bg-pink-500/10 border border-pink-500/30 text-pink-300 hover:bg-pink-500/20")}
          {btn("clubs", "♣ Clubs", "bg-gray-500/10 border border-gray-500/30 text-gray-300 hover:bg-gray-500/20")}
          {btn("spades", "♠ Spades", "bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20")}
        </div>
      );
    default:
      return null;
  }
}

function RideTheBusPanel() {
  const { user, refreshUser } = useUser();
  const { showNotification } = useTopNotification();
  const [bet, setBet] = useState("");
  const [gameId, setGameId] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [currentCard, setCurrentCard] = useState<any>(null);
  const [previousCard, setPreviousCard] = useState<any>(null);
  const [secondCard, setSecondCard] = useState<any>(null);
  const [multiplier, setMultiplier] = useState(0);
  const [status, setStatus] = useState<"idle" | "playing" | "won" | "lost">("idle");
  const [payout, setPayout] = useState(0);
  const [loading, setLoading] = useState(false);

  const cardStr = (c: any) => c ? `${c.rank}${c.suit[0].toUpperCase()}` : "?";

  const handleDeal = async () => {
    const val = parseInt(bet);
    if (!val || val < 100) { showNotification("Minimum bet is $100", "error"); return; }
    if ((user?.cash ?? 0) < val) { showNotification("Not enough cash", "error"); return; }
    setLoading(true);
    try {
      const data = await casinoApi.rtbDeal(val);
      setGameId(data.gameId);
      setRound(data.round);
      setCurrentCard(data.currentCard);
      setStatus("playing");
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGuess = async (guess: string) => {
    if (!gameId) return;
    setLoading(true);
    try {
      const data = await casinoApi.rtbAction(gameId, guess);
      if (data.status === "lost") {
        setStatus("lost");
        setPayout(0);
        setGameId(null);
        showNotification("Wrong! Game over.", "error");
      } else if (data.status === "won") {
        setStatus("won");
        setPayout(data.payout);
        setMultiplier(data.multiplier);
        setGameId(null);
        showNotification(`You won $${data.payout}!`, "success");
      } else {
        setRound(data.round);
        setMultiplier(data.multiplier);
        setPreviousCard(data.previousCard);
        setSecondCard(data.secondCard);
        setCurrentCard(data.currentCard);
      }
      await refreshUser();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStatus("idle");
    setBet("");
    setGameId(null);
    setCurrentCard(null);
    setPayout(0);
  };

  const roundLabels = ["", "Red or Black?", "Higher or Lower?", "Inside or Outside?", "Guess the Suit!"];

  // Idle or result state
  if (status === "idle" || status === "won" || status === "lost") {
    return (
      <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4">
        {status === "won" && (
          <div className="text-center mb-4 p-3 rounded-sm bg-pink-500/10 border border-pink-500/30">
            <p className="text-lg font-mono text-pink-300">You won ${payout} ({multiplier}x)!</p>
          </div>
        )}
        {status === "lost" && (
          <div className="text-center mb-4 p-3 rounded-sm bg-white/5">
            <p className="text-sm font-mono text-white/50">Better luck next time.</p>
          </div>
        )}
        <div className="flex items-center gap-3 mb-4">
          <DollarSign size={16} className="text-pink-400" />
          <input type="number" min="100" value={bet}
            onChange={(e) => setBet(e.target.value)}
            placeholder="Enter bet ($100 min)..."
            className="flex-1 bg-black/30 border border-white/10 rounded-sm px-3 py-2 font-mono text-sm text-white/80 placeholder-white/20 outline-none focus:border-pink-500/40"
          />
        </div>
        <button onClick={handleDeal} disabled={loading || !bet}
          className="w-full py-2.5 rounded-sm bg-pink-500/10 border border-pink-500/30 text-pink-300 font-mono text-xs uppercase tracking-wider hover:bg-pink-500/20 disabled:opacity-30 transition-all">
          {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : status !== "idle" ? "Play Again" : "Start Game"}
        </button>
      </div>
    );
  }

  // Playing state
  return (
    <div className="space-y-4">
      {/* Round progress */}
      <div className="flex justify-center gap-2 mb-2">
        {[1, 2, 3, 4].map((r) => (
          <div key={r} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono ${
            r <= round
              ? r < round ? "bg-pink-500/20 text-pink-300 border border-pink-500/30" : "bg-pink-500/30 text-pink-200 border border-pink-500/50"
              : "bg-black/30 text-white/20 border border-white/10"
          }`}>
            {r < round ? (r === 1 ? "♥" : r === 2 ? "♠" : r === 3 ? "♦" : "♣") : r}
          </div>
        ))}
      </div>

      {/* Card display */}
      <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 text-center">
        <p className="text-xs font-mono text-white/30 uppercase tracking-wider mb-3">
          {roundLabels[round]}
        </p>
        <div className="text-3xl mb-2 font-mono">{cardStr(currentCard)}</div>
        {round === 2 && previousCard && (
          <p className="text-xs font-mono text-white/30">Previous card: {cardStr(previousCard)}</p>
        )}
        {round === 3 && previousCard && secondCard && (
          <p className="text-xs font-mono text-white/30">
            Range: {cardStr(previousCard)} to {cardStr(secondCard)}
          </p>
        )}
        {multiplier > 0 && round > 1 && (
          <p className="text-xs font-mono text-cyan-400/60 mt-2">Current streak: {multiplier}x</p>
        )}
      </div>

      {/* Guess buttons */}
      <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4">
        {renderGuessButtons(round, handleGuess, loading)}
      </div>

      {loading && <p className="text-center text-xs font-mono text-white/30">Processing...</p>}
    </div>
  );
}
