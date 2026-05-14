"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, User, Wallet, Check, X as XIcon } from "lucide-react";

interface Props {
  speed: number;
  rewardMin: number;
  rewardMax: number;
  crimeName: string;
  onResult: (accuracy: number) => void;
  onClose: () => void;
  difficultyBonus?: number;
}

const TOTAL_ROUNDS = 10;

export default function ShellGame({ speed, rewardMin, rewardMax, crimeName, onResult, onClose, difficultyBonus = 0 }: Props) {
  const [phase, setPhase] = useState<"ready" | "playing" | "ended">("ready");
  const [round, setRound] = useState(0);
  const [roundPhase, setRoundPhase] = useState<"reveal" | "shuffling" | "choosing" | "result">("reveal");
  const [positions, setPositions] = useState<number[]>([0, 1, 2]);
  const [walletMark] = useState(() => Math.floor(Math.random() * 3));
  const [correctCount, setCorrectCount] = useState(0);
  const [lastResult, setLastResult] = useState<boolean | null>(null);
  const [finalAccuracy, setFinalAccuracy] = useState(0);

  const shuffleCountRef = useRef(0);
  const shuffleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bonus = isFinite(difficultyBonus) ? difficultyBonus : 0;
  const baseReveal = Math.max(600, 2000 - (speed - 1) * 500);
  const revealDuration = Math.max(600, baseReveal * (1 + bonus / 100));
  const baseShuffleInterval = Math.max(80, 500 - (speed - 1) * 120);
  const shuffleInterval = Math.max(80, baseShuffleInterval * (1 + bonus / 100));
  const baseShuffles = 3 + Math.floor(speed * 2);
  const numShuffles = Math.max(3, baseShuffles - Math.floor(bonus / 10));

  // Reveal phase: show which mark has the wallet
  useEffect(() => {
    if (phase !== "playing" || roundPhase !== "reveal") return;
    setPositions([0, 1, 2]);
    revealTimeoutRef.current = setTimeout(() => {
      setRoundPhase("shuffling");
    }, revealDuration);
    return () => { if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current); };
  }, [phase, roundPhase, revealDuration]);

  // Shuffling phase: swap positions at interval
  useEffect(() => {
    if (phase !== "playing" || roundPhase !== "shuffling") return;
    shuffleCountRef.current = 0;
    shuffleIntervalRef.current = setInterval(() => {
      shuffleCountRef.current++;
      setPositions((prev) => {
        const next = [...prev];
        const a = Math.floor(Math.random() * 3);
        let b = Math.floor(Math.random() * 3);
        while (b === a) b = Math.floor(Math.random() * 3);
        [next[a], next[b]] = [next[b], next[a]];
        return next;
      });
      if (shuffleCountRef.current >= numShuffles) {
        if (shuffleIntervalRef.current) clearInterval(shuffleIntervalRef.current);
        setRoundPhase("choosing");
      }
    }, shuffleInterval);
    // Safety timeout: force-advance if shuffle takes too long
    const safetyTimeout = setTimeout(() => {
      if (shuffleIntervalRef.current) clearInterval(shuffleIntervalRef.current);
      setRoundPhase("choosing");
    }, Math.max(shuffleInterval * numShuffles * 2, 5000));
    return () => {
      if (shuffleIntervalRef.current) clearInterval(shuffleIntervalRef.current);
      clearTimeout(safetyTimeout);
    };
  }, [phase, roundPhase, shuffleInterval, numShuffles]);

  // Result phase: show result then advance
  useEffect(() => {
    if (phase !== "playing" || roundPhase !== "result") return;
    resultTimeoutRef.current = setTimeout(() => {
      if (round + 1 >= TOTAL_ROUNDS) {
        const acc = Math.round((correctCount / TOTAL_ROUNDS) * 100);
        setFinalAccuracy(acc);
        setPhase("ended");
      } else {
        setRound((r) => r + 1);
        setRoundPhase("reveal");
      }
    }, 1200);
    return () => { if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current); };
  }, [phase, roundPhase, round, correctCount]);

  const handlePick = (slotIndex: number) => {
    if (roundPhase !== "choosing") return;
    const picked = positions[slotIndex];
    const correct = picked === walletMark;
    setLastResult(correct);
    if (correct) setCorrectCount((c) => c + 1);
    setRoundPhase("result");
  };

  const handleCollect = () => {
    onResult(finalAccuracy);
  };

  const content = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-bg-card border border-white/10 rounded-sm w-full max-w-lg mx-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-purple-400" />
            <span className="text-sm font-mono text-white/80">{crimeName}</span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* READY */}
        {phase === "ready" && (
          <div className="py-8 text-center">
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-20 h-24 rounded-sm border border-white/10 bg-bg-surface/60 flex flex-col items-center justify-center gap-2">
                  <User size={24} className="text-white/30" />
                  <span className="text-[10px] font-mono text-white/20">MARK {i + 1}</span>
                </div>
              ))}
            </div>
            <h2 className="text-base font-mono text-white/90 mb-2">Ready to work the crowd?</h2>
            <p className="text-xs font-mono text-white/40 mb-6 max-w-sm mx-auto">
              Watch carefully — one of these marks has a wallet. Follow it through the shuffle!
            </p>
            <button
              onClick={() => { setPhase("playing"); }}
              className="px-6 py-2 rounded-sm bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-mono tracking-wider hover:bg-purple-500/30 transition-all"
            >
              Start
            </button>
          </div>
        )}

        {/* PLAYING */}
        {phase === "playing" && (
          <div>
            <div className="flex items-center justify-between mb-3 text-xs font-mono text-white/40">
              <span>Round {round + 1}/{TOTAL_ROUNDS}</span>
              <span>Correct: {correctCount}</span>
              {roundPhase === "reveal" && <span className="text-amber-400/60">Watch...</span>}
              {roundPhase === "shuffling" && <span className="text-cyan-400/60">Shuffling...</span>}
              {roundPhase === "choosing" && <span className="text-purple-400/60">Pick one!</span>}
              {roundPhase === "result" && (lastResult ? (
                <span className="text-green-400/80">Got it!</span>
              ) : (
                <span className="text-red-400/80">Wrong!</span>
              ))}
            </div>

            <div className="flex gap-3 justify-center">
              {[0, 1, 2].map((slotIndex) => {
                const markId = positions[slotIndex];
                const isWallet = markId === walletMark;
                const showWallet = roundPhase === "reveal" && isWallet;
                const isResultRound = roundPhase === "result";
                const pickedCorrect = isResultRound && lastResult && markId === walletMark;
                const pickedWrong = isResultRound && lastResult === false && markId === walletMark;
                const showResult = isResultRound && (pickedCorrect || pickedWrong);

                return (
                  <button
                    key={slotIndex}
                    onClick={() => handlePick(slotIndex)}
                    disabled={roundPhase !== "choosing"}
                    className={`flex-1 aspect-[3/4] rounded-sm border transition-all duration-150 flex flex-col items-center justify-center gap-2 ${
                      roundPhase === "choosing"
                        ? "border-white/15 bg-bg-surface/60 hover:border-purple-400/40 hover:bg-purple-500/10 cursor-pointer active:scale-95"
                        : showWallet || pickedCorrect
                        ? "border-amber-400/40 bg-amber-500/15"
                        : pickedWrong
                        ? "border-red-400/30 bg-red-500/10"
                        : "border-white/5 bg-bg-surface/40"
                    }`}
                    style={{ touchAction: "manipulation" }}
                  >
                    <User size={28} className={showWallet || pickedCorrect ? "text-amber-300" : pickedWrong ? "text-red-400" : "text-white/30"} />
                    {showWallet && <Wallet size={16} className="text-amber-400 absolute" />}
                    {pickedCorrect && <Check size={16} className="text-green-400" />}
                    {pickedWrong && <XIcon size={16} className="text-red-400" />}
                    <span className="text-[10px] font-mono text-white/20">MARK {slotIndex + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ENDED */}
        {phase === "ended" && (
          <div className="py-6 text-center">
            <Wallet size={28} className="mx-auto text-purple-400 mb-3" />
            <h2 className={`text-lg font-mono font-bold tracking-wider mb-1 ${
              finalAccuracy >= 80 ? "text-green-400" :
              finalAccuracy >= 60 ? "text-amber-400" :
              finalAccuracy >= 40 ? "text-cyan-400" :
              "text-red-400"
            }`}>
              {finalAccuracy >= 80 ? "Street Shark!" :
               finalAccuracy >= 60 ? "Smooth Lift" :
               finalAccuracy >= 40 ? "Close Call..." :
               "Busted!"}
            </h2>
            <p className="text-xs font-mono text-white/40 mb-1">
              Accuracy: <span className="text-white/70">{finalAccuracy}%</span>
            </p>
            <p className="text-xs font-mono text-white/40 mb-6">
              {correctCount}/{TOTAL_ROUNDS} correct picks
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
