"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Terminal } from "lucide-react";

interface Props {
  speed: number;
  rewardMin: number;
  rewardMax: number;
  crimeName: string;
  onResult: (accuracy: number) => void;
  onClose: () => void;
  difficultyBonus?: number;
}

const BINARY_POOL = [
  "01101001", "10111000", "11000110", "10010101", "00111011",
  "01010011", "11100010", "00011101", "10100110", "11001010",
  "00101101", "10001110", "01011001", "11101000", "00010111",
  "10110010", "01110001", "11010010", "00111001", "01001110",
];

const WORDS_PER_GAME = 11;
const BIT_LENGTH = 8;

function countMatches(a: string, b: string): number {
  let count = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) count++;
  }
  return count;
}

export default function TerminalHackGame({ speed, rewardMin, rewardMax, crimeName, onResult, onClose, difficultyBonus = 0 }: Props) {
  const bonus = isFinite(difficultyBonus) ? difficultyBonus : 0;
  const [phase, setPhase] = useState<"ready" | "playing" | "ended">("ready");

  const [gameData] = useState(() => {
    const shuffled = [...BINARY_POOL].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, WORDS_PER_GAME);
    const pwdIndex = Math.floor(Math.random() * WORDS_PER_GAME);
    return { words: selected, password: selected[pwdIndex] };
  });

  const [attempts, setAttempts] = useState<Array<{ word: string; matches: number }>>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [finalAccuracy, setFinalAccuracy] = useState(0);

  const baseAttempts = speed <= 1.0 ? 6 : speed <= 2.0 ? 4 : 3;
  const maxAttempts = baseAttempts + Math.floor(bonus / 5);
  const baseTimeLimit: number | null = speed <= 1.0 ? null : speed <= 2.0 ? 45 : 30;
  const timeLimit = baseTimeLimit !== null ? baseTimeLimit + Math.floor(bonus / 2) : null;

  // Timer effect
  useEffect(() => {
    if (phase !== "playing" || timeLimit === null) return;
    setTimeLeft(timeLimit);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (phase === "playing") {
            // End game on timeout
            endGame(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLimit]);

  const endGame = (solvedFlag: boolean) => {
    if (solvedFlag) {
      // solved - calculate anyway
    }
    // This is called from setTimeout inside setTimeLeft callback,
    // so we need to handle it differently
    setSolved(solvedFlag);
    if (solvedFlag) {
      // accuracy already set in handleWordSelect
    } else {
      // Not solved - compute accuracy from best match
      if (attempts.length === 0) {
        setFinalAccuracy(0);
      } else {
        const bestMatch = Math.max(...attempts.map((a) => a.matches), 0);
        setFinalAccuracy(Math.round((bestMatch / BIT_LENGTH) * 40));
      }
    }
    setPhase("ended");
  };

  const handleWordSelect = (word: string) => {
    if (phase !== "playing") return;
    if (attempts.some((a) => a.word === word)) return;

    const matches = countMatches(word, gameData.password);
    const newAttempts = [...attempts, { word, matches }];
    setAttempts(newAttempts);
    setSelectedWord(word);
    setTimeout(() => setSelectedWord(null), 400);

    if (matches === BIT_LENGTH) {
      const acc = Math.max(50, 100 - (newAttempts.length - 1) * 10);
      setSolved(true);
      setFinalAccuracy(acc);
      setPhase("ended");
    } else if (newAttempts.length >= maxAttempts) {
      const bestMatch = Math.max(...newAttempts.map((a) => a.matches), 0);
      setFinalAccuracy(Math.round((bestMatch / BIT_LENGTH) * 40));
      setPhase("ended");
    }
  };

  const handleCollect = () => {
    onResult(finalAccuracy);
  };

  const timerColor = timeLimit !== null && timeLeft !== null
    ? timeLeft <= 5 ? "text-red-400" : timeLeft <= 15 ? "text-amber-400" : "text-emerald-400"
    : "text-emerald-400";

  const timerWidth = timeLimit !== null && timeLeft !== null
    ? (timeLeft / timeLimit) * 100
    : 100;

  const content = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-bg-card border border-white/10 rounded-sm w-full max-w-lg mx-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-emerald-400" />
            <span className="text-sm font-mono text-white/80">{crimeName}</span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* READY */}
        {phase === "ready" && (
          <div className="py-8 text-center">
            <Terminal size={28} className="mx-auto text-emerald-400/60 mb-3" />
            <h2 className="text-base font-mono text-white/90 mb-2">Access Server</h2>
            <p className="text-xs font-mono text-white/40 mb-2 max-w-sm mx-auto">
              Find the correct 8-bit binary sequence. Select a sequence to see how many bits match the target.
            </p>
            <p className="text-xs font-mono text-white/30 mb-6">
              Attempts: {maxAttempts}{timeLimit ? ` | Time: ${timeLimit}s` : ""}
            </p>
            <button
              onClick={() => setPhase("playing")}
              className="px-6 py-2 rounded-sm bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-mono tracking-wider hover:bg-emerald-500/30 transition-all"
            >
              Start
            </button>
          </div>
        )}

        {/* PLAYING */}
        {phase === "playing" && (
          <div>
            {/* Timer bar */}
            {timeLimit !== null && (
              <div className="mb-3">
                <div className="w-full h-1 bg-bg-dark rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      timeLeft !== null && timeLeft <= 5 ? "bg-red-400" :
                      timeLeft !== null && timeLeft <= 15 ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                    style={{ width: `${timerWidth}%` }}
                  />
                </div>
                <div className={`text-[10px] font-mono mt-1 ${timerColor}`}>
                  TIME REMAINING: {timeLeft ?? 0}s
                </div>
              </div>
            )}

            {/* Info bar */}
            <div className="flex items-center justify-between mb-3 text-xs font-mono text-white/40">
              <span>ATTEMPTS: {attempts.length}/{maxAttempts}</span>
              <span className="text-emerald-400/60">SELECT SEQUENCE</span>
            </div>

            {/* Binary grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {gameData.words.map((word) => {
                const attempted = attempts.find((a) => a.word === word);
                const isSelected = selectedWord === word;
                const isSolved = solved && attempted && attempted.matches === BIT_LENGTH;

                return (
                  <button
                    key={word}
                    onClick={() => handleWordSelect(word)}
                    disabled={!!attempted || solved}
                    className={`font-mono text-xs tracking-wider py-2.5 px-2 rounded-sm border transition-all ${
                      isSolved
                        ? "bg-emerald-500/30 border-emerald-400 text-emerald-200"
                        : attempted
                        ? "bg-bg-deep text-white/20 border-white/5 cursor-not-allowed"
                        : isSelected
                        ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-300"
                        : "bg-bg-surface/60 text-emerald-400/80 border-emerald-500/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 cursor-pointer"
                    }`}
                    style={{ touchAction: "manipulation" }}
                  >
                    {word}
                    {attempted && (
                      <span className="block text-[10px] mt-0.5 opacity-60">{attempted.matches}/{BIT_LENGTH}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Attempt log */}
            {attempts.length > 0 && (
              <div className="bg-[#0a0a0a] border border-emerald-500/10 rounded-sm p-3 max-h-28 overflow-y-auto">
                <div className="text-[10px] font-mono text-emerald-500/50 mb-1">// ATTEMPT LOG</div>
                {attempts.map((a, i) => (
                  <div key={i} className="text-xs font-mono text-emerald-400/70 leading-relaxed">
                    <span className="text-emerald-500/50">&gt;</span> {a.word} <span className="text-emerald-500/50">→</span> {a.matches}/{BIT_LENGTH} MATCH
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ENDED */}
        {phase === "ended" && (
          <div className="py-6 text-center">
            <Terminal size={28} className={`mx-auto mb-3 ${solved ? "text-emerald-400" : "text-red-400"}`} />
            <h2 className={`text-lg font-mono font-bold tracking-wider mb-1 ${
              solved ? "text-emerald-400" : "text-red-400"
            }`}>
              {solved ? "ACCESS GRANTED" : "ACCESS DENIED"}
            </h2>
            <p className="text-xs font-mono text-white/40 mb-1">
              Accuracy: <span className="text-white/70">{finalAccuracy}%</span>
            </p>
            {solved && (
              <p className="text-xs font-mono text-white/40 mb-6">
                Solved in {attempts.length} {attempts.length === 1 ? "attempt" : "attempts"}
              </p>
            )}
            {!solved && (
              <p className="text-xs font-mono text-white/40 mb-6">
                Password was: <span className="text-emerald-400/80">{gameData.password}</span>
              </p>
            )}
            <p className="text-xs font-mono text-white/30 mb-4">
              Reward: ${rewardMin + Math.floor((rewardMax - rewardMin) * (finalAccuracy / 100))}
            </p>
            <button
              onClick={handleCollect}
              className="px-6 py-2 rounded-sm bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-mono tracking-wider hover:bg-emerald-500/30 transition-all"
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
