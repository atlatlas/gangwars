import { Router, Response } from "express";
import { db, schema } from "../db";
import { eq, sql } from "drizzle-orm";
import { authMiddleware, AuthRequest, hpCheck } from "../middleware/auth";
import { logActivityEvent } from "./activityEvents";

export const casinoRouter = Router();

// ─── Card Helpers ───

const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;

interface Card {
  suit: string;
  rank: string;
  value: number;
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      let value: number;
      if (rank === "A") value = 11;
      else if (["J", "Q", "K"].includes(rank)) value = 10;
      else value = parseInt(rank);
      deck.push({ suit, rank, value });
    }
  }
  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function drawCard(deck: Card[]): { card: Card; deck: Card[] } {
  const card = deck[0];
  return { card, deck: deck.slice(1) };
}

function handValue(hand: Card[]): number {
  const total = hand.reduce((sum, c) => sum + c.value, 0);
  const aces = hand.filter((c) => c.rank === "A").length;
  let v = total;
  let a = aces;
  while (v > 21 && a > 0) {
    v -= 10;
    a--;
  }
  return v;
}

function cardRankValue(rank: string): number {
  if (rank === "A") return 14;
  if (["K", "Q", "J"].includes(rank)) return 10 + ["J", "Q", "K"].indexOf(rank) + 1;
  return parseInt(rank);
}

function generateGameId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function dealerShouldHit(dealerHand: Card[]): boolean {
  const v = handValue(dealerHand);
  if (v < 17) return true;
  if (v > 17) return false;
  // 17 — only hit on soft 17 (hand has an ace counted as 11)
  const aces = dealerHand.filter(c => c.rank === "A").length;
  if (aces === 0) return false;
  const sumWithAllAces11 = dealerHand.reduce((s, c) => s + c.value, 0);
  return sumWithAllAces11 - 10 * (aces - 1) <= 21;
}

function playDealerHand(bs: BlackjackState): void {
  let dd = bs.deck;
  while (dealerShouldHit(bs.dealerHand)) {
    const { card, deck: nd } = drawCard(dd);
    bs.dealerHand.push(card);
    dd = nd;
  }
  bs.deck = dd;
}

// ─── Blackjack State ───

interface BlackjackState {
  gameId: string;
  userId: number;
  bet: number;
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  playerDone: boolean;
}

const blackjackGames = new Map<string, BlackjackState>();

function resolveBlackjack(bs: BlackjackState): { status: string; payout: number; playerValue: number; dealerValue: number } {
  const pv = handValue(bs.playerHand);
  const dv = handValue(bs.dealerHand);
  if (dv > 21) return { status: "dealer_bust", payout: bs.bet * 2, playerValue: pv, dealerValue: dv };
  if (pv > dv) return { status: "player_win", payout: bs.bet * 2, playerValue: pv, dealerValue: dv };
  if (pv === dv) return { status: "push", payout: bs.bet, playerValue: pv, dealerValue: dv };
  return { status: "dealer_win", payout: 0, playerValue: pv, dealerValue: dv };
}

// ─── Blackjack Deal ───

casinoRouter.post("/blackjack/deal", authMiddleware, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const bet = Math.floor(req.body?.bet ?? 0);
    if (bet < 100) { res.status(400).json({ error: "Minimum bet is $100" }); return; }

    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.userId!) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    if (user.jailUntil && new Date(user.jailUntil) > new Date()) {
      res.status(400).json({ error: "You're in jail!" }); return;
    }

    if (user.cash < bet) { res.status(400).json({ error: "Not enough cash" }); return; }

    const deck = shuffleDeck(createDeck());
    let d = deck;

    // Deal
    const { card: pc1, deck: d2 } = drawCard(d);
    const { card: dc1, deck: d3 } = drawCard(d2);
    const { card: pc2, deck: d4 } = drawCard(d3);
    const { card: dc2, deck: d5 } = drawCard(d4);

    const playerHand = [pc1, pc2];
    const dealerHand = [dc1, dc2];
    d = d5;

    // Deduct bet
    db.run(sql`
      UPDATE ${schema.users}
      SET cash = cash - ${bet}
      WHERE id = ${user.id}
    `);

    // Check natural blackjack
    const pv = handValue(playerHand);
    const dv = handValue(dealerHand);

    if (pv === 21 && dv === 21) {
      // Both blackjack — push
      db.run(sql`UPDATE ${schema.users} SET cash = cash + ${bet} WHERE id = ${user.id}`);
      res.json({ gameId: null, playerHand, dealerHand, status: "push", payout: bet, playerValue: 21, dealerValue: 21 });
      return;
    }

    if (pv === 21) {
      // Player blackjack — 2.5x
      const payout = Math.floor(bet * 2.5);
      db.run(sql`UPDATE ${schema.users} SET cash = cash + ${payout} WHERE id = ${user.id}`);
      logActivityEvent(user.id, "casino_jackpot_blackjack", `Hit natural blackjack and won $${payout.toLocaleString()}!`, { bet, payout });
      res.json({ gameId: null, playerHand, dealerHand, status: "blackjack", payout, playerValue: 21, dealerValue: dv });
      return;
    }

    const gameId = generateGameId();
    blackjackGames.set(gameId, { gameId, userId: user.id, bet, deck: d, playerHand, dealerHand, playerDone: false });

    res.json({
      gameId,
      playerHand,
      dealerUpcard: dc1,
      status: "active",
      payout: 0,
      playerValue: pv,
    });
  } catch (err) {
    console.error("Blackjack deal error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Blackjack Action ───

casinoRouter.post("/blackjack/action", authMiddleware, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const { gameId, action } = req.body;
    if (!gameId || !["hit", "stand", "double"].includes(action)) {
      res.status(400).json({ error: "Invalid request" }); return;
    }

    const bs = blackjackGames.get(gameId);
    if (!bs) { res.status(400).json({ error: "Game not found or expired" }); return; }
    if (bs.userId !== req.userId) { res.status(403).json({ error: "Not your game" }); return; }
    if (bs.playerDone) { res.status(400).json({ error: "Hand already resolved" }); return; }

    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.userId!) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    if (action === "double") {
      if (bs.playerHand.length !== 2) {
        res.status(400).json({ error: "Can only double on your first two cards" }); return;
      }
      if (user.cash < bs.bet) {
        res.status(400).json({ error: "Not enough cash to double down" }); return;
      }

      // Deduct additional bet
      db.run(sql`UPDATE ${schema.users} SET cash = cash - ${bs.bet} WHERE id = ${user.id}`);
      bs.bet = bs.bet * 2;

      // Draw exactly 1 card
      const { card, deck: nd } = drawCard(bs.deck);
      bs.playerHand.push(card);
      bs.deck = nd;
      bs.playerDone = true;

      const pv = handValue(bs.playerHand);
      if (pv > 21) {
        blackjackGames.delete(gameId);
        res.json({
          playerHand: bs.playerHand, dealerHand: bs.dealerHand,
          status: "player_bust", payout: 0, playerValue: pv, dealerValue: handValue(bs.dealerHand),
        });
        return;
      }

      // Not bust — dealer plays then resolve
      playDealerHand(bs);
      const result = resolveBlackjack(bs);
      if (result.payout > 0) {
        db.run(sql`UPDATE ${schema.users} SET cash = cash + ${result.payout} WHERE id = ${user.id}`);
      }
      blackjackGames.delete(gameId);
      res.json({
        playerHand: bs.playerHand, dealerHand: bs.dealerHand,
        status: result.status, payout: result.payout,
        playerValue: result.playerValue, dealerValue: result.dealerValue,
      });
      return;
    }

    if (action === "hit") {
      const { card, deck: nd } = drawCard(bs.deck);
      bs.playerHand.push(card);
      bs.deck = nd;

      const pv = handValue(bs.playerHand);
      if (pv > 21) {
        bs.playerDone = true;
        blackjackGames.delete(gameId);
        res.json({ playerHand: bs.playerHand, dealerHand: bs.dealerHand, status: "player_bust", payout: 0, playerValue: pv, dealerValue: handValue(bs.dealerHand) });
        return;
      }

      res.json({ playerHand: bs.playerHand, dealerHand: bs.dealerHand, dealerUpcard: bs.dealerHand[0], status: "active", payout: 0, playerValue: pv });
      return;
    }

    // Stand — dealer plays
    bs.playerDone = true;
    playDealerHand(bs);

    const result = resolveBlackjack(bs);
    if (result.payout > 0) {
      db.run(sql`UPDATE ${schema.users} SET cash = cash + ${result.payout} WHERE id = ${user.id}`);
    }
    blackjackGames.delete(gameId);

    res.json({
      playerHand: bs.playerHand,
      dealerHand: bs.dealerHand,
      status: result.status,
      payout: result.payout,
      playerValue: result.playerValue,
      dealerValue: result.dealerValue,
    });
  } catch (err) {
    console.error("Blackjack action error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Slot Machine ───

const SLOT_SYMBOLS = [
  { symbol: "cherry", weight: 25, payout3: 5, payout2: 1.5 },
  { symbol: "lemon", weight: 20, payout3: 3, payout2: 1.2 },
  { symbol: "orange", weight: 18, payout3: 4, payout2: 1.3 },
  { symbol: "grape", weight: 15, payout3: 6, payout2: 1.5 },
  { symbol: "bell", weight: 10, payout3: 10, payout2: 2 },
  { symbol: "diamond", weight: 7, payout3: 20, payout2: 3 },
  { symbol: "seven", weight: 3, payout3: 50, payout2: 5 },
  { symbol: "skull", weight: 2, payout3: 100, payout2: 10 },
];

function weightedPick(): string {
  const total = SLOT_SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
  let roll = Math.random() * total;
  for (const sym of SLOT_SYMBOLS) {
    roll -= sym.weight;
    if (roll <= 0) return sym.symbol;
  }
  return "cherry";
}

casinoRouter.post("/slots/spin", authMiddleware, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const bet = Math.floor(req.body?.bet ?? 0);
    if (bet < 100) { res.status(400).json({ error: "Minimum bet is $100" }); return; }

    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.userId!) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    if (user.jailUntil && new Date(user.jailUntil) > new Date()) {
      res.status(400).json({ error: "You're in jail!" }); return;
    }

    if (user.cash < bet) { res.status(400).json({ error: "Not enough cash" }); return; }

    const r1 = weightedPick();
    const r2 = weightedPick();
    const r3 = weightedPick();
    const reels = [r1, r2, r3];

    let multiplier = 0;
    if (r1 === r2 && r2 === r3) {
      const sym = SLOT_SYMBOLS.find((s) => s.symbol === r1)!;
      multiplier = sym.payout3;
    } else if (r1 === r2 || r2 === r3) {
      const match = r2; // middle matched with something
      const sym = SLOT_SYMBOLS.find((s) => s.symbol === match)!;
      multiplier = sym.payout2;
    }

    const payout = Math.floor(bet * multiplier);

    db.run(sql`
      UPDATE ${schema.users}
      SET cash = cash - ${bet} + ${payout}
      WHERE id = ${user.id}
    `);

    if (multiplier >= 100) {
      logActivityEvent(user.id, "casino_jackpot_slots", `Hit ${multiplier}x slots jackpot and won $${payout.toLocaleString()}!`, { bet, multiplier, payout, reels });
    }

    res.json({ reels, payout, multiplier });
  } catch (err) {
    console.error("Slots spin error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Ride the Bus State ───

interface RideTheBusState {
  gameId: string;
  userId: number;
  bet: number;
  round: number; // 1-4
  deck: Card[];
  previousCard: Card;
  currentCard: Card | null;
  secondCard: Card | null;
}

const rtbGames = new Map<string, RideTheBusState>();

const RTB_PAYOUTS = [1, 2, 4, 10];

// ─── Ride the Bus Deal ───

casinoRouter.post("/ride-the-bus/deal", authMiddleware, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const bet = Math.floor(req.body?.bet ?? 0);
    if (bet < 100) { res.status(400).json({ error: "Minimum bet is $100" }); return; }

    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.userId!) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    if (user.jailUntil && new Date(user.jailUntil) > new Date()) {
      res.status(400).json({ error: "You're in jail!" }); return;
    }

    if (user.cash < bet) { res.status(400).json({ error: "Not enough cash" }); return; }

    const deck = shuffleDeck(createDeck());
    const { card, deck: remaining } = drawCard(deck);

    // Deduct bet
    db.run(sql`
      UPDATE ${schema.users}
      SET cash = cash - ${bet}
      WHERE id = ${user.id}
    `);

    const gameId = generateGameId();
    rtbGames.set(gameId, { gameId, userId: user.id, bet, round: 1, deck: remaining, previousCard: card, currentCard: card, secondCard: null });

    res.json({ gameId, round: 1, currentCard: card });
  } catch (err) {
    console.error("RTB deal error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Ride the Bus Action ───

casinoRouter.post("/ride-the-bus/action", authMiddleware, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const { gameId, guess } = req.body;
    if (!gameId || !guess) { res.status(400).json({ error: "Invalid request" }); return; }

    const gs = rtbGames.get(gameId);
    if (!gs) { res.status(400).json({ error: "Game not found or expired" }); return; }
    if (gs.userId !== req.userId) { res.status(403).json({ error: "Not your game" }); return; }

    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.userId!) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const round = gs.round;
    let correct = false;

    if (round === 1) {
      // Red or black
      const isRed = gs.currentCard!.suit === "hearts" || gs.currentCard!.suit === "diamonds";
      correct = (guess === "red" && isRed) || (guess === "black" && !isRed);
    } else if (round === 2) {
      // Higher or lower vs previous card
      const prevVal = cardRankValue(gs.previousCard.rank);
      const currVal = cardRankValue(gs.currentCard!.rank);
      if (prevVal === currVal) {
        correct = false;
      } else if (guess === "higher") {
        correct = currVal > prevVal;
      } else {
        correct = currVal < prevVal;
      }
    } else if (round === 3) {
      // Inside or outside
      const val1 = cardRankValue(gs.previousCard.rank);
      const val2 = cardRankValue(gs.secondCard!.rank);
      const low = Math.min(val1, val2);
      const high = Math.max(val1, val2);
      const currVal = cardRankValue(gs.currentCard!.rank);

      if (guess === "inside") {
        correct = currVal > low && currVal < high;
      } else {
        correct = currVal < low || currVal > high;
      }
    } else if (round === 4) {
      // Guess the suit
      correct = guess === gs.currentCard!.suit;
    }

    if (!correct) {
      // Game over — lose bet
      rtbGames.delete(gameId);
      res.json({ round, correct: false, status: "lost", payout: 0, multiplier: 0 });
      return;
    }

    if (round === 4) {
      // Won all 4 rounds — 10x payout
      const payout = gs.bet * RTB_PAYOUTS[3];
      db.run(sql`UPDATE ${schema.users} SET cash = cash + ${payout} WHERE id = ${user.id}`);
      logActivityEvent(user.id, "casino_jackpot_rtb", `Won Ride the Bus 10x jackpot and won $${payout.toLocaleString()}!`, { bet: gs.bet, payout });
      rtbGames.delete(gameId);
      res.json({
        round: 4, correct: true, status: "won", payout,
        multiplier: RTB_PAYOUTS[3],
        currentCard: gs.currentCard,
      });
      return;
    }

    // Advance to next round
    const nextRound = round + 1;
    const { card, deck: remaining } = drawCard(gs.deck);

    const prevState = {
      previousCard: gs.previousCard,
      secondCard: gs.secondCard,
      currentCard: gs.currentCard,
    };

    if (nextRound === 3) {
      // Set second reference card for inside/outside
      gs.secondCard = gs.currentCard;
    }

    gs.previousCard = gs.currentCard!;
    gs.currentCard = card;
    gs.deck = remaining;
    gs.round = nextRound;

    res.json({
      round: nextRound,
      correct: true,
      status: "active",
      previousCard: nextRound === 2 ? prevState.previousCard : null,
      secondCard: nextRound === 3 ? prevState.currentCard : (nextRound === 4 ? gs.secondCard : null),
      currentCard: card,
      multiplier: RTB_PAYOUTS[round - 1], // Payout so far if they cash out (not used, just info)
      payoutSoFar: gs.bet * RTB_PAYOUTS[round - 1],
    });
  } catch (err) {
    console.error("RTB action error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
