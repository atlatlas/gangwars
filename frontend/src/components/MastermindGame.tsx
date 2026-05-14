"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Shield } from "lucide-react";

interface Props {
  speed: number;
  rewardMin: number;
  rewardMax: number;
  crimeName: string;
  onResult: (accuracy: number) => void;
  onClose: () => void;
  difficultyBonus?: number;
}

function evaluateGuess(guess: number[], secret: number[]): { correct: number; wrongPos: number } {
  let correct = 0;
  const secretCount: Record<number, number> = {};
  const guessCount: Record<number, number> = {};

  for (let i = 0; i < 4; i++) {
    if (guess[i] === secret[i]) {
      correct++;
    } else {
      secretCount[secret[i]] = (secretCount[secret[i]] || 0) + 1;
      guessCount[guess[i]] = (guessCount[guess[i]] || 0) + 1;
    }
  }

  let wrongPos = 0;
  for (let d = 1; d <= 6; d++) {
    wrongPos += Math.min(secretCount[d] || 0, guessCount[d] || 0);
  }

  return { correct, wrongPos };
}

export default function MastermindGame({ speed, rewardMin, rewardMax, crimeName, onResult, onClose, difficultyBonus = 0 }: Props) {
  const bonus = isFinite(difficultyBonus) ? difficultyBonus : 0;
  const [secret] = useState(() => Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1));
  const [currentGuess, setCurrentGuess] = useState<number[]>([1, 1, 1, 1]);
  const [guesses, setGuesses] = useState<Array<{ guess: number[]; correct: number; wrongPos: number }>>([]);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [phase, setPhase] = useState<"ready" | "playing" | "ended">("ready");
  const [solved, setSolved] = useState(false);
  const [finalAccuracy, setFinalAccuracy] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const baseAttempts = speed <= 1.0 ? 10 : speed <= 2.0 ? 7 : 5;
  const maxAttempts = baseAttempts + Math.floor(bonus / 5);

  const handleDigitSelect = (digit: number) => {
    if (phase !== "playing") return;
    const next = [...currentGuess];
    next[selectedSlot] = digit;
    setCurrentGuess(next);
  };

  const handleSubmitGuess = () => {
    if (phase !== "playing" || submitting) return;
    setSubmitting(true);

    const result = evaluateGuess(currentGuess, secret);
    const newGuesses = [...guesses, { guess: [...currentGuess], ...result }];
    setGuesses(newGuesses);
    const newAttempts = attemptsUsed + 1;
    setAttemptsUsed(newAttempts);

    if (result.correct === 4) {
      const acc = Math.max(40, 100 - (newAttempts - 1) * 8);
      setSolved(true);
      setFinalAccuracy(acc);
      setPhase("ended");
    } else if (newAttempts >= maxAttempts) {
      const lastGuess = newGuesses[newGuesses.length - 1];
      const acc = Math.round((lastGuess.correct / 4) * 40);
      setFinalAccuracy(acc);
      setPhase("ended");
    } else {
      setSelectedSlot(0);
      setSubmitting(false);
    }
  };

  const handleCollect = () => {
    onResult(finalAccuracy);
  };

  const slotColor = (idx: number) => idx === selectedSlot ? "border-amber-400/60 bg-amber-500/10" : "border-white/10 bg-bg-dark";

  const content = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-bg-card border border-white/10 rounded-sm w-full max-w-lg mx-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-purple-400" />
            <span className="text-sm font-mono text-white/80">{crimeName}</span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* READY */}
        {phase === "ready" && (
          <div className="py-8 text-center">
            <Shield size={28} className="mx-auto text-amber-400/60 mb-3" />
            <h2 className="text-base font-mono text-white/90 mb-2">Crack the Vault</h2>
            <p className="text-xs font-mono text-white/40 mb-2 max-w-sm mx-auto">
              Find the 4-digit code (digits 1-6). Each guess shows how many digits are correct and in the right position.
            </p>
            <p className="text-xs font-mono text-white/30 mb-6">
              Attempts: {maxAttempts}
            </p>
            <button
              onClick={() => setPhase("playing")}
              className="px-6 py-2 rounded-sm bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-mono tracking-wider hover:bg-purple-500/30 transition-all"
            >
              Start
            </button>
          </div>
        )}

        {/* PLAYING */}
        {phase === "playing" && (
          <div>
            {/* Attempts counter */}
            <div className="flex items-center justify-between mb-3 text-xs font-mono text-white/40">
              <span>Attempts: {attemptsUsed}/{maxAttempts}</span>
            </div>

            {/* Guess history */}
            {guesses.length > 0 && (
              <div className="mb-3 max-h-32 overflow-y-auto space-y-1.5">
                {guesses.map((g, gi) => (
                  <div key={gi} className="flex items-center gap-2 text-xs font-mono">
                    <div className="flex gap-0.5">
                      {g.guess.map((d, di) => {
                        const isCorrect = secret[di] === d;
                        const isWrongPos = !isCorrect && secret.includes(d);
                        // For wrong position, check if this digit occurs in wrong positions
                        let showWrongPos = false;
                        if (!isCorrect) {
                          // Count occurrences of this digit in secret vs correct-position uses
                          const secretCount = secret.filter((s) => s === d).length;
                          const correctCount = g.guess.filter((gd, gdi) => gd === d && gdi === secret.indexOf(secret[gdi])).length;
                          // Simple: mark as wrong pos if digit exists in secret but not at this index
                          showWrongPos = true;
                        }
                        return (
                          <span
                            key={di}
                            className={`w-6 h-6 flex items-center justify-center rounded-sm text-xs font-mono ${
                              isCorrect
                                ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                                : secret.includes(d) && g.guess.filter((x, xi) => x === d && xi <= di).length <= secret.filter(x => x === d).length
                                ? "bg-amber-500/30 text-amber-300 border border-amber-500/30"
                                : "bg-bg-deep text-white/20 border border-white/5"
                            }`}
                          >
                            {d}
                          </span>
                        );
                      })}
                    </div>
                    <span className="text-white/30 text-[10px]">
                      {g.correct}✓ {g.wrongPos}◉
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Current guess slots */}
            <div className="flex gap-2 justify-center mb-4">
              {currentGuess.map((digit, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedSlot(idx)}
                  className={`w-12 h-14 rounded-sm border-2 transition-all text-2xl font-mono text-white/90 ${slotColor(idx)}`}
                  style={{ touchAction: "manipulation" }}
                >
                  {digit}
                </button>
              ))}
            </div>

            {/* Digit pad */}
            <div className="grid grid-cols-3 gap-2 mb-4 max-w-[200px] mx-auto">
              {[1, 2, 3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  onClick={() => handleDigitSelect(d)}
                  className="w-full aspect-square rounded-sm border border-white/10 bg-bg-surface text-white/70 hover:bg-white/5 hover:border-white/20 transition-all text-lg font-mono active:scale-95"
                  style={{ touchAction: "manipulation" }}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Guess button */}
            <button
              onClick={handleSubmitGuess}
              disabled={submitting}
              className="w-full py-2 rounded-sm bg-cyan-500/10 text-cyan-400 border border-cyan-400/30 text-xs font-mono tracking-wider uppercase hover:bg-cyan-500/20 transition-all disabled:opacity-40"
            >
              {submitting ? "..." : "Guess"}
            </button>
          </div>
        )}

        {/* ENDED */}
        {phase === "ended" && (
          <div className="py-6 text-center">
            <Shield size={28} className={`mx-auto mb-3 ${solved ? "text-green-400" : "text-red-400"}`} />
            <h2 className={`text-lg font-mono font-bold tracking-wider mb-1 ${
              solved ? "text-green-400" : "text-red-400"
            }`}>
              {solved ? "Safe Cracked!" : "Vault Sealed"}
            </h2>
            <p className="text-xs font-mono text-white/40 mb-1">
              Accuracy: <span className="text-white/70">{finalAccuracy}%</span>
            </p>
            <p className="text-xs font-mono text-white/40 mb-6">
              {solved ? `Solved in ${attemptsUsed} ${attemptsUsed === 1 ? "attempt" : "attempts"}` : "Ran out of attempts"}
            </p>
            <p className="text-xs font-mono text-white/30 mb-4">
              Reward: ${rewardMin + Math.floor((rewardMax - rewardMin) * (finalAccuracy / 100))}
            </p>
            <button
              onClick={handleCollect}
              className="px-6 py-2 rounded-sm bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-mono tracking-wider hover:bg-purple-500/30 transition-all"
            >
              Collect Reward
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(content, document.body);
}
