"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Music } from "lucide-react";

interface Props {
  speed: number;
  rewardMin: number;
  rewardMax: number;
  crimeName: string;
  onResult: (accuracy: number) => void;
  onClose: () => void;
}

const LANE_COUNT = 4;
const LANE_KEYS = ["1", "2", "3", "4"];
const LANE_KEY_CODES = ["Digit1", "Digit2", "Digit3", "Digit4"];
const GAME_DURATION = 15;
const LEAD_TIME = 2; // seconds from note appearing to reaching target
const HIT_WINDOW = 0.25; // seconds before/after perfect hit time

const LANE_COLORS = [
  { bg: "bg-rose-500/15", border: "border-rose-500/30", active: "bg-rose-500/30", note: "bg-rose-400", glow: "rgba(244,63,94,0.5)" },
  { bg: "bg-sky-500/15", border: "border-sky-500/30", active: "bg-sky-500/30", note: "bg-sky-400", glow: "rgba(56,189,248,0.5)" },
  { bg: "bg-emerald-500/15", border: "border-emerald-500/30", active: "bg-emerald-500/30", note: "bg-emerald-400", glow: "rgba(52,211,153,0.5)" },
  { bg: "bg-amber-500/15", border: "border-amber-500/30", active: "bg-amber-500/30", note: "bg-amber-400", glow: "rgba(251,191,36,0.5)" },
];

// Note frequencies for each lane (C4, E4, G4, C5) — guitar chord-ish
const LANE_FREQS = [261.63, 329.63, 392.00, 523.25];

interface Note {
  lane: number;
  time: number;
  hit: boolean;
  missed: boolean;
  accuracy: number;
}

function generateNotes(speed: number): Note[] {
  const notes: Note[] = [];
  const avgGap = Math.max(0.25, 0.7 - (speed - 1) * 0.15);
  let time = 0.5 + Math.random() * 0.3;

  while (time < GAME_DURATION - 0.3) {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const jitter = (Math.random() - 0.5) * avgGap * 0.6;
    notes.push({ lane, time: Math.max(time + jitter, 0.3), hit: false, missed: false, accuracy: 0 });
    time += avgGap + (Math.random() - 0.5) * avgGap * 0.4;
  }

  return notes;
}

// Web Audio helpers
let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch { return null; }
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playPluck(freq: number) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}

function playMissSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(80, ctx.currentTime);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

export default function TimingGame({ speed, rewardMin, rewardMax, crimeName, onResult, onClose }: Props) {
  const [phase, setPhase] = useState<"ready" | "playing" | "ended">("ready");
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeLanes, setActiveLanes] = useState<boolean[]>([false, false, false, false]);
  const [hitCount, setHitCount] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [finalAccuracy, setFinalAccuracy] = useState(0);

  const notesRef = useRef<Note[]>([]);
  const startTimeRef = useRef(0);
  const animRef = useRef<number | null>(null);
  const hitCountRef = useRef(0);
  const missCountRef = useRef(0);

  // Generate notes on mount
  useEffect(() => {
    const generated = generateNotes(speed);
    notesRef.current = generated;
    setNotes(generated);
  }, [speed]);

  // Game loop
  useEffect(() => {
    if (phase !== "playing") return;

    startTimeRef.current = Date.now();
    let elapsed = 0;

    const loop = () => {
      elapsed = (Date.now() - startTimeRef.current) / 1000;
      setCurrentTime(elapsed);

      // Check for missed notes (passed the hit window)
      let missed = false;
      notesRef.current.forEach((n) => {
        if (!n.hit && !n.missed && elapsed > n.time + HIT_WINDOW) {
          n.missed = true;
          missed = true;
          missCountRef.current++;
          setMissCount(missCountRef.current);
        }
      });
      if (missed) playMissSound();

      if (elapsed >= GAME_DURATION) {
        endGame();
        return;
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [phase]);

  const endGame = useCallback(() => {
    const allNotes = notesRef.current;
    let totalAccuracy = 0;
    let hitNotes = 0;
    for (const n of allNotes) {
      if (n.hit) {
        totalAccuracy += n.accuracy;
        hitNotes++;
      }
    }
    const avgAccuracy = allNotes.length > 0 ? totalAccuracy / allNotes.length : 0;
    setFinalAccuracy(avgAccuracy);
    setPhase("ended");

    // Play ending chord
    setTimeout(() => {
      for (const f of LANE_FREQS) playPluck(f);
    }, 100);
  }, []);

  const hitNote = useCallback((lane: number) => {
    if (phase !== "playing") return;

    const elapsed = (Date.now() - startTimeRef.current) / 1000;

    // Find the closest unhit note in this lane within the hit window
    let bestNote: Note | null = null;
    let bestDist = Infinity;
    for (const n of notesRef.current) {
      if (n.lane !== lane || n.hit || n.missed) continue;
      const dist = Math.abs(elapsed - n.time);
      if (dist < HIT_WINDOW && dist < bestDist) {
        bestDist = dist;
        bestNote = n;
      }
    }

    // Flash the lane
    setActiveLanes((prev) => { const n = [...prev]; n[lane] = true; return n; });
    setTimeout(() => setActiveLanes((prev) => { const n = [...prev]; n[lane] = false; return n; }), 100);

    if (bestNote) {
      bestNote.hit = true;
      bestNote.accuracy = Math.max(0, Math.round((1 - bestDist / HIT_WINDOW) * 100));
      hitCountRef.current++;
      setHitCount(hitCountRef.current);
      playPluck(LANE_FREQS[lane]);
    }
  }, [phase]);

  // Keyboard handler
  useEffect(() => {
    if (phase !== "playing") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const idx = LANE_KEY_CODES.indexOf(e.code);
      if (idx >= 0) {
        e.preventDefault();
        hitNote(idx);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, hitNote]);

  const startGame = () => {
    startTimeRef.current = Date.now();
    setPhase("playing");
  };

  const handleCollect = () => {
    if (finalAccuracy > 0) onResult(finalAccuracy);
    else onResult(0);
  };

  // Calculate note positions
  const getNoteY = (note: Note): number => {
    const normalized = (currentTime - note.time + LEAD_TIME) / LEAD_TIME;
    return normalized * 85; // 0-85% of track fills the scroll area
  };

  const isInHitZone = (note: Note): boolean => {
    const normalized = (currentTime - note.time + LEAD_TIME) / LEAD_TIME;
    return normalized >= 0.85 && normalized <= 1.15;
  };

  const totalNotes = notes.length;
  const accuracy = notes.length > 0
    ? Math.round(notes.reduce((s, n) => s + (n.hit ? n.accuracy : 0), 0) / notes.length)
    : 0;
  const timeLeft = Math.max(0, GAME_DURATION - currentTime);

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-bg-card border border-white/10 rounded-sm w-full max-w-lg mx-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Music size={15} className="text-purple-400" />
            <span className="text-sm font-mono text-white/90 uppercase tracking-wider">Crime Wave</span>
          </div>
          {phase !== "playing" && (
            <button onClick={onClose} className="text-white/20 hover:text-white/60 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        {phase === "ready" && (
          <div className="text-center py-8">
            <div className="text-2xl font-mono text-white/80 mb-2">Ready to pull the job?</div>
            <p className="text-xs font-mono text-white/40 mb-6 max-w-xs mx-auto">
              Press <span className="text-white/70">1 2 3 4</span> or click the lanes when notes hit the target zone!
            </p>
            <div className="flex gap-2 justify-center mb-6">
              {LANE_KEYS.map((k, i) => (
                <div key={i} className={`w-10 h-10 flex items-center justify-center rounded-sm border ${LANE_COLORS[i].border} ${LANE_COLORS[i].bg} text-xs font-mono text-white/60`}>
                  {k}
                </div>
              ))}
            </div>
            <button
              onClick={startGame}
              className="text-xs font-mono tracking-wider uppercase px-8 py-2.5 rounded-sm border border-purple-400/40 text-purple-400 bg-purple-400/5 hover:bg-purple-400/10 hover:border-purple-400/60 active:scale-95 transition-all duration-150"
            >
              Start
            </button>
          </div>
        )}

        {phase === "playing" && (
          <>
            {/* Score bar */}
            <div className="flex items-center justify-between mb-2 text-[11px] font-mono">
              <span className="text-white/60">Score: <span className="text-white/90">{accuracy}%</span></span>
              <span className="text-white/40">Notes: <span className="text-white/70">{hitCount}/{totalNotes}</span></span>
              <span className={`font-mono ${timeLeft <= 3 ? "text-red-400" : "text-white/60"}`}>
                {timeLeft.toFixed(1)}s
              </span>
            </div>

            {/* Game track */}
            <div className="relative h-72 bg-bg-dark/60 border border-white/5 rounded-sm overflow-hidden">
              {/* Lanes */}
              <div className="absolute inset-0 flex">
                {Array.from({ length: LANE_COUNT }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 border-r last:border-r-0 border-white/5 cursor-pointer transition-colors duration-75 ${
                      activeLanes[i] ? LANE_COLORS[i].active : ""
                    }`}
                    onClick={() => hitNote(i)}
                  />
                ))}
              </div>

              {/* Lane divider labels */}
              {Array.from({ length: LANE_COUNT }).map((_, i) => (
                <div
                  key={`label-${i}`}
                  className={`absolute bottom-1 text-[10px] font-mono text-white/15 pointer-events-none`}
                  style={{ left: `${(i / LANE_COUNT) * 100 + 8}%` }}
                >
                  {LANE_KEYS[i]}
                </div>
              ))}

              {/* Target zone */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-amber-400/10 border-t border-amber-400/30 flex items-center justify-center">
                <div className="w-full h-0.5 bg-amber-400/40" />
              </div>
              <div className="absolute bottom-10 left-0 right-0 text-[9px] font-mono text-amber-400/30 text-center -mb-3">
                TARGET
              </div>

              {/* Notes */}
              {notes.map((note, i) => {
                const y = getNoteY(note);
                // Only render visible notes (on screen or slightly off)
                if (y < -8 || y > 100) return null;
                if (note.hit || note.missed) return null;

                const inZone = isInHitZone(note);
                const laneLeft = (note.lane / LANE_COUNT) * 100;
                const color = LANE_COLORS[note.lane];

                return (
                  <div
                    key={i}
                    className={`absolute w-6 h-6 rounded-full ${color.note} ${
                      inZone ? "shadow-[0_0_12px_var(--glow)]" : ""
                    } transition-shadow duration-100`}
                    style={{
                      left: `calc(${laneLeft}% + ${50 / LANE_COUNT}% - 12px)`,
                      top: `${y}%`,
                      transform: `translateY(-50%)`,
                      boxShadow: inZone ? `0 0 12px ${color.glow}` : "none",
                      opacity: inZone ? 1 : 0.7,
                    }}
                  />
                );
              })}
            </div>

            <p className="text-[10px] font-mono text-white/20 text-center mt-2">
              Press 1 2 3 4 or click the lanes
            </p>
          </>
        )}

        {phase === "ended" && (
          <div className="text-center py-6">
            <div className={`text-xl font-mono mb-1 ${
              finalAccuracy >= 80 ? "text-amber-300" :
              finalAccuracy >= 60 ? "text-emerald-400" :
              finalAccuracy >= 40 ? "text-blue-400" : "text-red-400"
            }`}>
              {finalAccuracy >= 80 ? "Smooth Criminal!" :
               finalAccuracy >= 60 ? "Clean Getaway!" :
               finalAccuracy >= 40 ? "Shaky Job..." :
               "Busted!"}
            </div>
            <div className="text-xs font-mono text-white/60 mb-4">
              Accuracy: <span className="text-white/90">{Math.round(finalAccuracy)}%</span>
              <span className="mx-2 text-white/20">|</span>
              Hits: <span className="text-white/90">{hitCount}/{totalNotes}</span>
              <span className="mx-2 text-white/20">|</span>
              Missed: <span className="text-red-400">{missCount}</span>
            </div>
            <div className="text-sm font-mono text-emerald-400 mb-6">
              Reward: ${(rewardMin + Math.floor((rewardMax - rewardMin) * (finalAccuracy / 100))).toLocaleString()}
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={handleCollect}
                className="text-xs font-mono tracking-wider uppercase px-6 py-2 rounded-sm border border-purple-400/40 text-purple-400 bg-purple-400/5 hover:bg-purple-400/10 hover:border-purple-400/60 active:scale-95 transition-all duration-150"
              >
                Collect Reward
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
