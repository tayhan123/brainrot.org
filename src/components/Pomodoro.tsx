import React from "react";
import { Play, Pause, RotateCcw, Hourglass, Flame } from "lucide-react";

interface PomodoroProps {
  addXp: (amount: number, reason: string) => void;
  incrementFocusMinutes: (minutes: number) => void;
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  isActive: boolean;
  setIsActive: (active: boolean) => void;
  mode: "study" | "break" | "longBreak";
  setMode: (mode: "study" | "break" | "longBreak") => void;
  cycleCount: number;
  setCycleCount: React.Dispatch<React.SetStateAction<number>>;
}

export default function Pomodoro({
  addXp,
  incrementFocusMinutes,
  timeLeft,
  setTimeLeft,
  isActive,
  setIsActive,
  mode,
  setMode,
  cycleCount,
  setCycleCount
}: PomodoroProps) {

  // Play synthetic sound effect using HTML Web Audio API
  const playSound = (type: "bloop" | "success" | "tick") => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === "bloop") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "success") {
        // Melodic alarm chime
        const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
        frequencies.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.3);
          osc.start(ctx.currentTime + idx * 0.1);
          osc.stop(ctx.currentTime + idx * 0.1 + 0.3);
        });
      } else if (type === "tick") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (e) {
      console.warn("Audio Context blocked / unsupported", e);
    }
  };

  const startTimer = () => {
    playSound("bloop");
    setIsActive(true);
  };

  const pauseTimer = () => {
    playSound("bloop");
    setIsActive(false);
  };

  const resetTimer = () => {
    playSound("bloop");
    setIsActive(false);
    if (mode === "study") {
      setTimeLeft(25 * 60);
    } else if (mode === "break") {
      setTimeLeft(5 * 60);
    } else {
      setTimeLeft(15 * 60);
    }
  };

  const switchMode = (newMode: "study" | "break" | "longBreak") => {
    playSound("bloop");
    setIsActive(false);
    setMode(newMode);
    if (newMode === "study") {
      setTimeLeft(25 * 60);
    } else if (newMode === "break") {
      setTimeLeft(5 * 60);
    } else {
      setTimeLeft(15 * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Percentage for progress ring (out of 100)
  const maxTime = mode === "study" ? 25 * 60 : mode === "break" ? 5 * 60 : 15 * 60;
  const progressPercent = ((maxTime - timeLeft) / maxTime) * 100;

  return (
    <div className="flex flex-col h-full bg-[#FAF9FF] relative rounded-2xl">
      {/* Middle Workspace Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-indigo-950/10 gap-3">
        <div>
          <h2 className="text-3xl font-display font-black text-[#1E1B4B] flex items-center gap-2">
            Focus Station <span className="animate-wiggle inline-block">🍅</span>
          </h2>
          <p className="text-xs font-semibold text-gray-500 uppercase mt-0.5 tracking-wider">
            Block out all cognitive distractions, lock in, and level up your XP!
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-300 font-display font-black rounded-lg border-2 border-indigo-950 text-xs text-indigo-950">
            <Hourglass className="w-3.5 h-3.5 text-[#7D69EC]" />
            <span>STATION: ONLINE</span>
          </div>

          <button
            onClick={resetTimer}
            title="Reset timer"
            className="cartoon-btn px-3 py-2 bg-white text-indigo-950 font-display font-black text-sm flex items-center justify-center cursor-pointer hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Split Focus Panels */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar space-y-5 pb-4 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch min-h-0">
          
          {/* Column 1 (Left 7/12): Big Tomato Circular Timer */}
          <div className="md:col-span-7 flex flex-col items-center justify-center p-6 bg-white border-3 border-indigo-950 rounded-3xl shadow-[4px_4px_0px_0px_#1E1B4B]">
            
            {/* Mode selector tab pills */}
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-[#eff0fe] border-3 border-indigo-950 rounded-2xl mb-6 w-full max-w-sm shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]">
              <button
                onClick={() => switchMode("study")}
                className={`font-display text-xs font-black py-2 px-1 rounded-xl border-2 transition-all cursor-pointer ${
                  mode === "study"
                    ? "bg-[#7D69EC] text-white border-indigo-950 shadow-[1px_1px_0px_0px_rgba(30,27,75,1)]"
                    : "border-transparent text-gray-500 hover:text-indigo-950"
                }`}
              >
                🍅 Study
              </button>
              <button
                onClick={() => switchMode("break")}
                className={`font-display text-xs font-black py-2 px-1 rounded-xl border-2 transition-all cursor-pointer ${
                  mode === "break"
                    ? "bg-emerald-400 text-indigo-955 border-indigo-950 shadow-[1px_1px_0px_0px_rgba(30,27,75,1)]"
                    : "border-transparent text-gray-500 hover:text-indigo-950"
                }`}
              >
                🥤 Break
              </button>
              <button
                onClick={() => switchMode("longBreak")}
                className={`font-display text-xs font-black py-2 px-1 rounded-xl border-2 transition-all cursor-pointer ${
                  mode === "longBreak"
                    ? "bg-cyan-400 text-indigo-955 border-indigo-950 shadow-[1px_1px_0px_0px_rgba(30,27,75,1)]"
                    : "border-transparent text-gray-500 hover:text-indigo-950"
                }`}
              >
                🛌 Long
              </button>
            </div>

            {/* Big circular display */}
            <div className="relative inline-flex items-center justify-center w-52 h-52 sm:w-56 sm:h-56 mb-6 select-none">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="43%"
                  className="stroke-indigo-950 fill-white"
                  strokeWidth="12"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="43%"
                  className={`fill-none transition-all duration-300 ${
                    mode === "study"
                      ? "stroke-rose-450 text-rose-400"
                      : mode === "break"
                      ? "stroke-emerald-400"
                      : "stroke-cyan-400"
                  }`}
                  strokeWidth="8"
                  strokeDasharray="276"
                  strokeDashoffset={276 - (276 * progressPercent) / 100}
                  strokeLinecap="round"
                />
              </svg>

              {/* Centered text state */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {mode === "study" ? (
                  <span className="text-4xl animate-float">🍅</span>
                ) : mode === "break" ? (
                  <span className="text-4xl animate-float">🥤</span>
                ) : (
                  <span className="text-4xl animate-float">🛌</span>
                )}
                <span className="font-display text-[42px] sm:text-[48px] font-black text-indigo-950 tracking-wider font-mono mt-1 leading-none">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-[10px] font-display font-black uppercase text-[#7D69EC] tracking-widest mt-1.5">
                  {isActive ? "locks locked!" : "at rest"}
                </span>
              </div>
            </div>

            {/* Controls start/pause */}
            <div className="flex gap-3 w-full max-w-sm justify-center">
              {isActive ? (
                <button
                  onClick={pauseTimer}
                  className="cartoon-btn flex-1 flex items-center justify-center gap-1.5 bg-yellow-300 text-indigo-955 font-display font-black py-3 px-4 cursor-pointer hover:bg-yellow-400 shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]"
                >
                  <Pause className="w-4 h-4 fill-indigo-955" />
                  <span>Pause Timer</span>
                </button>
              ) : (
                <button
                  onClick={startTimer}
                  className={`cartoon-btn flex-1 flex items-center justify-center gap-1.5 text-white font-display font-black py-3 px-4 cursor-pointer shadow-[2px_2px_0px_0px_rgba(30,27,75,1)] ${
                    mode === "study"
                      ? "bg-rose-500 hover:bg-rose-600"
                      : mode === "break"
                      ? "bg-emerald-500 hover:bg-emerald-600"
                      : "bg-cyan-500 hover:bg-cyan-600"
                  }`}
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Focus</span>
                </button>
              )}
            </div>

          </div>

          {/* Column 2 (Right 5/12): Dashboard Logs */}
          <div className="md:col-span-5 space-y-4 flex flex-col justify-between">
            
            {/* Study Flame Streaks card */}
            <div className="p-5 bg-white border-3 border-indigo-950 rounded-3xl shadow-[4px_4px_0px_0px_#1E1B4B]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-yellow-300 rounded-xl border-2 border-indigo-950">
                  <Flame className="w-5 h-5 fill-orange-500 text-orange-505" />
                </div>
                <div>
                  <h4 className="font-display font-black text-[#1E1B4B] text-base leading-none">Streaks & Logs</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Boost daily cognitive stats</p>
                </div>
              </div>

              <div className="mt-5 space-y-3 pt-4 border-t border-indigo-950/10">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-display font-black text-indigo-950">Completed Sessions:</span>
                  <span className="font-display font-black text-rose-500 text-sm bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                    {cycleCount} / 4 Blocks
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-display font-black text-indigo-950">Active Multiplier:</span>
                  <span className="font-display font-black text-emerald-650 text-sm bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    +{cycleCount >= 1 ? "1.5x XP" : "1.0x XP"}
                  </span>
                </div>
                <div className="text-[10px] font-sans font-bold text-gray-400 leading-normal border-t border-indigo-950/5 pt-2">
                  Complete 4 study blocks to gain a long break and unlock a grand +40 XP reward milestone!
                </div>
              </div>
            </div>

            {/* Quick adjusters helper card */}
            <div className="p-5 bg-[#EBE9FE]/30 border-3 border-dashed border-indigo-950/20 rounded-3xl text-center space-y-2 flex-1 flex flex-col justify-center">
              <span className="text-3xl">☕</span>
              <p className="font-display font-black text-indigo-950 text-sm">Distraction Shields: ACTIVATED</p>
              <p className="text-xs text-gray-500 font-medium max-w-xs mx-auto leading-relaxed">
                While focused, avoid reloading the workspace or changing modules to avoid cracking study streaks. Enjoy the ambient haptic tick chimes!
              </p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
