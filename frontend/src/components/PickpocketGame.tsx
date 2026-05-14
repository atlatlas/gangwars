"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Hand, Eye, Zap } from "lucide-react";

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

// Easing for sine-wave oscillation
function oscillate(t: number): number {
  return (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2;
}

export default function PickpocketGame({ speed, rewardMin, rewardMax, crimeName, onResult, onClose, difficultyBonus = 0 }: Props) {
  const [phase, setPhase] = useState<"ready" | "playing" | "ended">("ready");
  const [round, setRound] = useState(0);
  const [targetCenter, setTargetCenter] = useState(0.5);
  const [markerPos, setMarkerPos] = useState(0.5);
  const [result, setResult] = useState<{ hit: boolean; accuracy: number } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finalAccuracy, setFinalAccuracy] = useState(0);
  const [targetWidth, setTargetWidth] = useState(0);

  const markerRef = useRef(0.5);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const roundStartRef = useRef(0);
  const roundResultsRef = useRef<number[]>([]);
  const lockedRef = useRef(false);

  const bonus = isFinite(difficultyBonus) ? difficultyBonus : 0;

  // Base oscillation speed: faster with higher speed stat, slower with bonus (skill makes it easier)
  const baseSpeed = 0.4 + speed * 0.15;
  const oscSpeed = Math.max(0.2, baseSpeed * (1 - bonus / 200));

  // Target zone: starts at 30% width, shrinks with each round and speed
  const getTargetWidth = (r: number) => Math.max(8, 30 - r * 2 - speed * 2);

  const startRound = () => {
    lockedRef.current = false;
    setResult(null);
    const cw = getTargetWidth(round);
    setTargetWidth(cw);
    // Random target position (avoiding edges)
    const tc = 0.15 + Math.random() * 0.7;
    setTargetCenter(tc);
    // Start marker at random position
    const mp = Math.random();
    markerRef.current = mp;
    setMarkerPos(mp);
    roundStartRef.current = Date.now();
    startTimeRef.current = Date.now();
  };

  // Start first round when entering playing phase
  useEffect(() => {
    if (phase !== "playing") return;
    roundResultsRef.current = [];
    setRound(0);
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    startRound();
  }, [phase, round]);

  // Animation loop — oscillate marker
  useEffect(() => {
    if (phase !== "playing" || result) return;

    const loop = () => {
      const elapsed = (Date.now() - roundStartRef.current) / 1000;
      const pos = oscillate(elapsed * oscSpeed);
      markerRef.current = pos;
      setMarkerPos(pos);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [phase, result, oscSpeed]);

  const handleGrab = () => {
    if (phase !== "playing" || lockedRef.current || result) return;
    lockedRef.current = true;

    const pos = markerRef.current;
    const tc = targetCenter;
    const tw = getTargetWidth(round) / 100;
    const dist = Math.abs(pos - tc);
    const halfWidth = tw / 2;
    const hit = dist <= halfWidth;

    // Accuracy: 100 at perfect center, 0 at edge of target
    const accuracy = hit ? Math.round((1 - dist / halfWidth) * 100) : 0;
    if (hit) setCorrectCount((c) => c + 1);
    roundResultsRef.current.push(accuracy);
    setResult({ hit, accuracy });

    // Delay then advance
    setTimeout(() => {
      if (round + 1 >= TOTAL_ROUNDS) {
        const avg = roundResultsRef.current.reduce((s, a) => s + a, 0) / TOTAL_ROUNDS;
        setFinalAccuracy(avg);
        setPhase("ended");
      } else {
        setRound((r) => r + 1);
      }
    }, 800);
  };

  // Keyboard handler
  useEffect(() => {
    if (phase !== "playing") return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleGrab();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, result]);

  const handleCollect = () => {
    onResult(finalAccuracy);
  };

  // Keyboard for space on ready/ended too
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (phase === "ready") setPhase("playing");
        else if (phase === "ended") handleCollect();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, finalAccuracy]);

  const content = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-bg-card border border-white/10 rounded-sm w-full max-w-lg mx-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Hand size={16} className="text-amber-400" />
            <span className="text-sm font-mono text-white/80">{crimeName}</span>
          </div>
          {phase !== "playing" && (
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        {/* READY */}
        {phase === "ready" && (
          <div className="py-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-400/20 flex items-center justify-center">
                <Eye size={28} className="text-amber-400" />
              </div>
            </div>
            <h2 className="text-base font-mono text-white/90 mb-2">Steady now...</h2>
            <p className="text-xs font-mono text-white/40 mb-6 max-w-sm mx-auto">
              Watch the gauge and grab at the right moment. Press <span className="text-white/70">Space</span> or click when your hand is in the pocket!
            </p>
            <button
              onClick={() => setPhase("playing")}
              className="px-6 py-2 rounded-sm bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-mono tracking-wider hover:bg-amber-500/30 transition-all"
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
              <span className="flex items-center gap-1"><Zap size={11} className="text-amber-400" /> {correctCount} grabs</span>
              {result && (
                <span className={result.hit ? "text-green-400/80" : "text-red-400/80"}>
                  {result.hit ? `+${result.accuracy}%` : "Missed!"}
                </span>
              )}
            </div>

            {/* Gauge */}
            <div className="relative h-32 bg-black/40 rounded-sm border border-white/5 mb-2 overflow-hidden">
              {/* Target zone highlight */}
              <div
                className={`absolute top-0 bottom-0 rounded-sm transition-colors duration-200 ${
                  result
                    ? result.hit
                      ? "bg-green-500/20 border border-green-400/30"
                      : "bg-red-500/10 border border-red-400/20"
                    : "bg-amber-500/15 border border-amber-400/20"
                }`}
                style={{
                  left: `${(targetCenter - targetWidth / 200) * 100}%`,
                  width: `${targetWidth}%`,
                }}
              >
                {/* Center line */}
                <div className={`absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 ${
                  result && result.hit ? "bg-green-400/50" : "bg-amber-400/40"
                }`} />
              </div>

              {/* Marker (the "hand") */}
              <div
                className={`absolute top-0 bottom-0 w-3 -translate-x-1/2 transition-none ${
                  result?.hit ? "text-green-400" : result && !result.hit ? "text-red-400" : "text-white/80"
                }`}
                style={{ left: `${markerPos * 100}%` }}
              >
                <Hand size={12} className="absolute -top-1 left-1/2 -translate-x-1/2" />
                <div className={`absolute top-3 left-1/2 -translate-x-1/2 w-1 h-[calc(100%-12px)] rounded-full ${
                  result?.hit ? "bg-green-400/70" : result && !result.hit ? "bg-red-400/60" : "bg-white/30"
                }`} />
              </div>
            </div>

            {/* Grab button */}
            <button
              onClick={handleGrab}
              disabled={!!result}
              className={`w-full py-3 rounded-sm text-xs font-mono tracking-wider uppercase transition-all duration-150 ${
                result
                  ? result.hit
                    ? "bg-green-500/10 text-green-400 border border-green-400/20"
                    : "bg-red-500/10 text-red-400 border border-red-400/20"
                  : "bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30 active:scale-[0.99] cursor-pointer"
              }`}
            >
              {result ? (result.hit ? `Grabbed! +${result.accuracy}%` : "Too early!") : "GRAB! (Space)"}
            </button>
          </div>
        )}

        {/* ENDED */}
        {phase === "ended" && (
          <div className="py-6 text-center">
            <Hand size={28} className="mx-auto text-amber-400 mb-3" />
            <h2 className={`text-lg font-mono font-bold tracking-wider mb-1 ${
              finalAccuracy >= 80 ? "text-green-400" :
              finalAccuracy >= 60 ? "text-amber-400" :
              finalAccuracy >= 40 ? "text-cyan-400" :
              "text-red-400"
            }`}>
              {finalAccuracy >= 80 ? "Pickpocket King!" :
               finalAccuracy >= 60 ? "Smooth Lift" :
               finalAccuracy >= 40 ? "Close Call..." :
               "Busted!"}
            </h2>
            <p className="text-xs font-mono text-white/40 mb-1">
              Accuracy: <span className="text-white/70">{Math.round(finalAccuracy)}%</span>
            </p>
            <p className="text-xs font-mono text-white/40 mb-4">
              {correctCount}/{TOTAL_ROUNDS} successful grabs
            </p>
            <p className="text-sm font-mono text-emerald-400 mb-6">
              Reward: ${(rewardMin + Math.floor((rewardMax - rewardMin) * (finalAccuracy / 100))).toLocaleString()}
            </p>
            <button
              onClick={handleCollect}
              className="px-6 py-2 rounded-sm bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-mono tracking-wider hover:bg-amber-500/30 transition-all"
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
