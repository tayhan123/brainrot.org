import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Flame, 
  Volume2, 
  VolumeX, 
  BookOpen, 
  Clock, 
  Target, 
  Sparkles, 
  Check, 
  ChevronDown, 
  Coffee, 
  Trash2, 
  Sliders, 
  Music, 
  HelpCircle,
  TrendingUp
} from "lucide-react";
import { Note } from "../types";

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
  notes?: Note[];
}

interface SessionLog {
  id: string;
  type: "study" | "break" | "longBreak";
  durationMinutes: number;
  time: string;
  focusGoal: string;
  xpEarned: number;
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
  setCycleCount,
  notes = []
}: PomodoroProps) {

  // Retrieve customized times or default them
  const [durationStudy, setDurationStudy] = useState(() => {
    return Number(localStorage.getItem("gizmo_pref_study") || 25);
  });
  const [durationBreak, setDurationBreak] = useState(() => {
    return Number(localStorage.getItem("gizmo_pref_break") || 5);
  });
  const [durationLongBreak, setDurationLongBreak] = useState(() => {
    return Number(localStorage.getItem("gizmo_pref_long") || 15);
  });

  // State options
  const [focusGoal, setFocusGoal] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("General Study");
  const [soundStyle, setSoundStyle] = useState<"none" | "binaural" | "rain" | "tick">("none");
  const [volume, setVolume] = useState(0.4);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>(() => {
    const cached = localStorage.getItem("gizmo_study_logs");
    return cached ? JSON.parse(cached) : [];
  });

  // UI state overlays
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showSoundsMenu, setShowSoundsMenu] = useState(false);

  // Web Audio Context & Node Pools for Ambient Focus synthesizers
  const audioContextRef = useRef<AudioContext | null>(null);
  const binauralNodesRef = useRef<{ oscL: OscillatorNode; oscR: OscillatorNode; gainL: GainNode; gainR: GainNode; pannerL: StereoPannerNode; pannerR: StereoPannerNode } | null>(null);
  const rainNodesRef = useRef<{ source: AudioBufferSourceNode; filter: BiquadFilterNode; lfo: OscillatorNode; lfoGain: GainNode } | null>(null);
  const synthMasterGainRef = useRef<GainNode | null>(null);

  // Extract unique categories from user's synced notes
  const noteCategories = Array.from(new Set(notes.map((n) => n.category))).filter(Boolean);

  // Sync log array with LocalStorage
  useEffect(() => {
    localStorage.setItem("gizmo_study_logs", JSON.stringify(sessionLogs));
  }, [sessionLogs]);

  // Persist customized timer presets
  useEffect(() => {
    localStorage.setItem("gizmo_pref_study", String(durationStudy));
    localStorage.setItem("gizmo_pref_break", String(durationBreak));
    localStorage.setItem("gizmo_pref_long", String(durationLongBreak));
  }, [durationStudy, durationBreak, durationLongBreak]);

  // Lazy initialize core Web Audio API
  const getAudioContext = (): AudioContext => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // Sound effects synthesizer
  const playSound = (type: "bloop" | "success" | "tick") => {
    try {
      const ctx = getAudioContext();
      if (type === "bloop") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(640, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === "success") {
        // Grand arpeggio of productivity success
        const freqs = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.4);
          osc.start(ctx.currentTime + i * 0.08);
          osc.stop(ctx.currentTime + i * 0.08 + 0.4);
        });
      } else if (type === "tick") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
        osc.start();
        osc.stop(ctx.currentTime + 0.03);
      }
    } catch {
      // Audio context blocked temporarily
    }
  };

  // Soft clock ticking metronome linked to state tick ticks
  useEffect(() => {
    if (isActive && soundStyle === "tick") {
      playSound("tick");
    }
  }, [timeLeft, isActive, soundStyle]);

  // Master volume modifier
  useEffect(() => {
    if (synthMasterGainRef.current) {
      synthMasterGainRef.current.gain.setValueAtTime(volume, getAudioContext().currentTime);
    }
  }, [volume]);

  // Ambient sound synthesizer lifecycle management
  useEffect(() => {
    if (!isActive) {
      stopAmbientSynthesizers();
      return;
    }

    if (soundStyle === "none") {
      stopAmbientSynthesizers();
      return;
    }

    // Start appropriate generator
    try {
      const ctx = getAudioContext();
      
      // Setup Master Synthesizer Gain
      if (!synthMasterGainRef.current) {
        synthMasterGainRef.current = ctx.createGain();
        synthMasterGainRef.current.connect(ctx.destination);
      }
      synthMasterGainRef.current.gain.setValueAtTime(volume, ctx.currentTime);

      stopAmbientSynthesizers(false); // Stop other channels but keep Master gain

      if (soundStyle === "binaural") {
        // Gamma Brain Wave Focus (40Hz Differential beats on left and right ears)
        const oscL = ctx.createOscillator();
        const oscR = ctx.createOscillator();
        const gainL = ctx.createGain();
        const gainR = ctx.createGain();

        // 3D panning nodes for binary separation
        const pannerL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        const pannerR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

        oscL.type = "sine";
        oscL.frequency.value = 200; // Left ear base frequency

        oscR.type = "sine";
        oscR.frequency.value = 240; // Right ear (Diff 40Hz)

        gainL.gain.value = 0.5;
        gainR.gain.value = 0.5;

        if (pannerL && pannerR) {
          pannerL.pan.value = -1; // Far left
          pannerR.pan.value = 1;  // Far right

          oscL.connect(gainL).connect(pannerL).connect(synthMasterGainRef.current);
          oscR.connect(gainR).connect(pannerR).connect(synthMasterGainRef.current);
        } else {
          // Fallback mono beat
          oscL.connect(gainL).connect(synthMasterGainRef.current);
          oscR.connect(gainR).connect(synthMasterGainRef.current);
        }

        oscL.start();
        oscR.start();

        binauralNodesRef.current = { oscL, oscR, gainL, gainR, pannerL: pannerL as any, pannerR: pannerR as any };
      } 
      else if (soundStyle === "rain") {
        // falling rain and soft wind synthesizers using dynamic swept white noise formula
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "peaking";
        filter.Q.value = 1.0;
        filter.frequency.value = 400; // Deep sound

        // LFO sweeps the filter parameters to simulate randomized blowing wind and heavy rain drips
        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.15; // Extremely slow (7.5s cycle)

        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 180; // Sweeping range 400hz +- 180hs

        lfo.connect(lfoGain).connect(filter.frequency);
        source.connect(filter).connect(synthMasterGainRef.current);

        lfo.start();
        source.start();

        rainNodesRef.current = { source, filter, lfo, lfoGain };
      }
    } catch (e) {
      console.warn("Could not initial focus sound synthesis:", e);
    }

    return () => {
      // Avoid leaving raw oscillators alive when tab reloads
      stopAmbientSynthesizers();
    };
  }, [soundStyle, isActive]);

  const stopAmbientSynthesizers = (stopMaster = true) => {
    // 1. Teardown Binaural
    if (binauralNodesRef.current) {
      try {
        binauralNodesRef.current.oscL.disconnect();
        binauralNodesRef.current.oscR.disconnect();
        binauralNodesRef.current.gainL.disconnect();
        binauralNodesRef.current.gainR.disconnect();
        if (binauralNodesRef.current.pannerL) binauralNodesRef.current.pannerL.disconnect();
        if (binauralNodesRef.current.pannerR) binauralNodesRef.current.pannerR.disconnect();
        binauralNodesRef.current.oscL.stop();
        binauralNodesRef.current.oscR.stop();
      } catch {}
      binauralNodesRef.current = null;
    }

    // 2. Teardown Rain
    if (rainNodesRef.current) {
      try {
        rainNodesRef.current.source.disconnect();
        rainNodesRef.current.filter.disconnect();
        rainNodesRef.current.lfoGain.disconnect();
        rainNodesRef.current.lfo.disconnect();
        rainNodesRef.current.source.stop();
        rainNodesRef.current.lfo.stop();
      } catch {}
      rainNodesRef.current = null;
    }

    if (stopMaster && synthMasterGainRef.current) {
      try { synthMasterGainRef.current.disconnect(); } catch {}
      synthMasterGainRef.current = null;
    }
  };

  const handleStart = () => {
    getAudioContext(); // Wake audio context on click interaction
    playSound("bloop");
    setIsActive(true);
  };

  const handlePause = () => {
    playSound("bloop");
    setIsActive(false);
  };

  const handleReset = () => {
    playSound("bloop");
    setIsActive(false);
    const mMax = mode === "study" ? durationStudy : mode === "break" ? durationBreak : durationLongBreak;
    setTimeLeft(mMax * 60);
  };

  const selectMode = (newMode: "study" | "break" | "longBreak") => {
    playSound("bloop");
    setIsActive(false);
    setMode(newMode);
    const defaultMins = newMode === "study" ? durationStudy : newMode === "break" ? durationBreak : durationLongBreak;
    setTimeLeft(defaultMins * 60);
  };

  // Fast apply presets
  const applyPresetConfig = (st: number, bk: number, lg: number) => {
    playSound("bloop");
    setDurationStudy(st);
    setDurationBreak(bk);
    setDurationLongBreak(lg);
    setIsActive(false);

    const mMax = mode === "study" ? st : mode === "break" ? bk : lg;
    setTimeLeft(mMax * 60);
    setShowSettingsDrawer(false);
  };

  // Add customized notes to a finished study cycle
  const recordSessionCompleted = (type: "study" | "break" | "longBreak", durationMins: number) => {
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const xpReward = type === "study" ? 40 : 15;
    
    // Create new timeline log object
    const newLog: SessionLog = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      durationMinutes: durationMins,
      time: timeString,
      focusGoal: type === "study" 
        ? `${selectedCategory} focus: ${focusGoal || "Deep learning interval"}`
        : "Mental recharge break",
      xpEarned: xpReward
    };

    setSessionLogs(prev => [newLog, ...prev.slice(0, 19)]);
  };

  // Monitor background completion ticks to record to productivity log
  // Normally the full completion is managed by App.tsx, but having localized interactive journal adds insane details!
  useEffect(() => {
    if (timeLeft === 0 && !isActive) {
      // Completed!
      const currentMaxMins = mode === "study" ? durationStudy : mode === "break" ? durationBreak : durationLongBreak;
      recordSessionCompleted(mode, currentMaxMins);
    }
  }, [timeLeft, isActive, mode]);

  const removeLog = (id: string) => {
    playSound("bloop");
    setSessionLogs(prev => prev.filter(l => l.id !== id));
  };

  const cleanAllLogs = () => {
    playSound("bloop");
    setSessionLogs([]);
  };

  const formatDisplayTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remSecs.toString().padStart(2, "0")}`;
  };

  // Calculate current progress percentages
  const maxTimeSeconds = (mode === "study" ? durationStudy : mode === "break" ? durationBreak : durationLongBreak) * 60;
  const progressPercent = maxTimeSeconds > 0 ? ((maxTimeSeconds - timeLeft) / maxTimeSeconds) * 100 : 0;

  // Liquid Height proportional to time remaining
  const liquidFillHeight = 100 - progressPercent;

  return (
    <div id="study-timer-station" className="flex flex-col h-full bg-[#FAF9FF] relative rounded-2xl p-1">
      
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-indigo-950/10 gap-3">
        <div>
          <h2 className="text-3xl font-display font-black text-[#1E1B4B] flex items-center gap-2">
            Study Timer Station <span className="animate-wiggle inline-block text-2xl">⏳</span>
          </h2>
          <p className="text-xs font-semibold text-gray-500 uppercase mt-0.5 tracking-wider">
            Enhanced Cognitive Pomodoro system with binaural frequencies & productivity audio synthesizers
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Sounds menu toggle */}
          <div className="relative">
            <button
              onClick={() => { playSound("bloop"); setShowSoundsMenu(!showSoundsMenu); }}
              className={`cartoon-btn px-3 py-2 text-xs font-display font-black flex items-center gap-1.5 transition-all ${
                soundStyle !== "none" ? "bg-[#7D69EC] text-white" : "bg-white text-indigo-950"
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Ambient: {soundStyle === "none" ? "OFF" : soundStyle.toUpperCase()}</span>
            </button>

            {showSoundsMenu && (
              <div className="absolute right-0 top-11 bg-white border-3 border-indigo-950 rounded-2xl w-60 py-3 px-4 shadow-[4px_4px_0px_0px_#1E1B4B] z-30 space-y-3">
                <div className="border-b border-indigo-950/10 pb-2">
                  <h5 className="font-display font-black text-xs text-indigo-950 tracking-wider">AUDIO MIXER</h5>
                  <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Synthesized purely on-device</p>
                </div>

                <div className="space-y-1.5">
                  <button
                    onClick={() => { setSoundStyle("none"); setShowSoundsMenu(false); }}
                    className={`w-full text-left font-display font-black text-xs px-2.5 py-1.5 rounded-lg border-2 transition-all flex justify-between items-center ${
                      soundStyle === "none" ? "bg-amber-100 border-indigo-950 text-indigo-950" : "bg-gray-50 border-transparent text-gray-500"
                    }`}
                  >
                    <span>🔇 Silent Study</span>
                    {soundStyle === "none" && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => { setSoundStyle("binaural"); setShowSoundsMenu(false); }}
                    className={`w-full text-left font-display font-black text-xs px-2.5 py-1.5 rounded-lg border-2 transition-all flex justify-between items-center ${
                      soundStyle === "binaural" ? "bg-indigo-100 border-indigo-950 text-indigo-950" : "bg-gray-50 border-transparent text-gray-500"
                    }`}
                  >
                    <span>🧠 Binaural Waves (40Hz)</span>
                    {soundStyle === "binaural" && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => { setSoundStyle("rain"); setShowSoundsMenu(false); }}
                    className={`w-full text-left font-display font-black text-xs px-2.5 py-1.5 rounded-lg border-2 transition-all flex justify-between items-center ${
                      soundStyle === "rain" ? "bg-indigo-100 border-indigo-950 text-indigo-950" : "bg-gray-50 border-transparent text-gray-500"
                    }`}
                  >
                    <span>🌧️ Sweeping Summer Rain</span>
                    {soundStyle === "rain" && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => { setSoundStyle("tick"); setShowSoundsMenu(false); }}
                    className={`w-full text-left font-display font-black text-xs px-2.5 py-1.5 rounded-lg border-2 transition-all flex justify-between items-center ${
                      soundStyle === "tick" ? "bg-indigo-100 border-indigo-950 text-indigo-950" : "bg-gray-50 border-transparent text-gray-500"
                    }`}
                  >
                    <span>⏱️ Metronome Click Tick</span>
                    {soundStyle === "tick" && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {soundStyle !== "none" && (
                  <div className="space-y-1 pt-2 border-t border-indigo-950/10">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500">
                      <span>MIXER VOLUME</span>
                      <span>{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-full accent-[#7D69EC] h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick presets config */}
          <button
            onClick={() => { playSound("bloop"); setShowSettingsDrawer(!showSettingsDrawer); }}
            className="cartoon-btn px-3 py-2 bg-[#FAF0D7] text-[#1E1B4B] text-xs font-display font-black flex items-center gap-1.5 cursor-pointer hover:bg-amber-100"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Customize Preset</span>
          </button>

          {/* Master reset */}
          <button
            onClick={handleReset}
            title="Reset active block"
            className="cartoon-btn px-3 py-2 bg-white text-indigo-950 font-display font-black text-xs flex items-center justify-center cursor-pointer hover:bg-gray-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Settings customization modal drawer */}
      {showSettingsDrawer && (
        <div className="fixed inset-0 bg-indigo-950/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-3 border-indigo-950 rounded-3xl w-full max-w-md p-6 shadow-[8px_8px_0px_0px_#1E1B4B] animate-popIn">
            <div className="flex justify-between items-start pb-3 border-b border-indigo-950/10">
              <div>
                <h3 className="font-display font-black text-xl text-indigo-950">Timer Presets config</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">Custom focus pacing parameters</p>
              </div>
              <button
                onClick={() => { playSound("bloop"); setShowSettingsDrawer(false); }}
                className="font-display font-black text-gray-400 hover:text-indigo-950 cursor-pointer text-lg px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 py-5">
              {/* Study slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-display font-black text-indigo-950">
                  <span className="flex items-center gap-1">🍅 Study Block Interval</span>
                  <span className="text-[#5E4CD4] bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{durationStudy} mins</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="90"
                  step="5"
                  value={durationStudy}
                  onChange={(e) => setDurationStudy(Number(e.target.value))}
                  className="w-full h-2.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-rose-455"
                />
              </div>

              {/* Break slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-display font-black text-indigo-950">
                  <span className="flex items-center gap-1">🥤 Break Block Interval</span>
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{durationBreak} mins</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={durationBreak}
                  onChange={(e) => setDurationBreak(Number(e.target.value))}
                  className="w-full h-2.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-505"
                />
              </div>

              {/* Long Break slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-display font-black text-indigo-950">
                  <span className="flex items-center gap-1">🛌 Long Break Block Interval</span>
                  <span className="text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-100">{durationLongBreak} mins</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={durationLongBreak}
                  onChange={(e) => setDurationLongBreak(Number(e.target.value))}
                  className="w-full h-2.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-cyan-505"
                />
              </div>

              {/* Presets bundle buttons */}
              <div className="pt-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">QUICK ENGINE CONCORD PRESETS</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => applyPresetConfig(25, 5, 15)}
                    className="cartoon-btn py-2 text-[10px] font-sans font-extrabold bg-[#FAF9FF] border-2 text-indigo-950"
                  >
                    Classic (25m / 5m)
                  </button>
                  <button
                    onClick={() => applyPresetConfig(50, 10, 20)}
                    className="cartoon-btn py-2 text-[10px] font-sans font-extrabold bg-[#FAF9FF] border-2 text-indigo-950"
                  >
                    Extended (50m / 10m)
                  </button>
                  <button
                    onClick={() => applyPresetConfig(15, 3, 10)}
                    className="cartoon-btn py-2 text-[10px] font-sans font-extrabold bg-[#FAF9FF] border-2 text-indigo-950"
                  >
                    Sprint (15m / 3m)
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => { playSound("bloop"); setShowSettingsDrawer(false); }}
              className="w-full cartoon-btn text-white bg-[#5E4CD4] font-display font-black py-3 rounded-2xl cursor-pointer hover:bg-indigo-600"
            >
              Apply Configurations 🎯
            </button>
          </div>
        </div>
      )}

      {/* 2. Interactive Body Layout */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar space-y-5 pb-4 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-0">
          
          {/* LEFT 7/12: Central interactive visual countdown circle & controllers */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 bg-white border-3 border-indigo-950 rounded-3xl shadow-[4px_4px_0px_0px_#1E1B4B]">
            
            {/* Mode selection tablets */}
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-[#F1EFFF] border-3 border-indigo-950 rounded-2xl mb-6 w-full max-w-sm shadow-[2px_2px_0px_0px_#1E1B4B]">
              <button
                onClick={() => selectMode("study")}
                className={`font-display text-xs font-black py-2 px-1 rounded-xl border-2 transition-all cursor-pointer ${
                  mode === "study"
                    ? "bg-[#7D69EC] text-white border-indigo-950 shadow-[1px_1px_0px_0px_rgba(30,27,75,1)]"
                    : "border-transparent text-indigo-955 hover:bg-white/50"
                }`}
              >
                🍅 Study ({durationStudy}m)
              </button>
              <button
                onClick={() => selectMode("break")}
                className={`font-display text-xs font-black py-2 px-1 rounded-xl border-2 transition-all cursor-pointer ${
                  mode === "break"
                    ? "bg-emerald-400 text-[#0F341F] border-indigo-950 shadow-[1px_1px_0px_0px_rgba(30,27,75,1)]"
                    : "border-transparent text-indigo-955 hover:bg-white/50"
                }`}
              >
                🥤 Break ({durationBreak}m)
              </button>
              <button
                onClick={() => selectMode("longBreak")}
                className={`font-display text-xs font-black py-2 px-1 rounded-xl border-2 transition-all cursor-pointer ${
                  mode === "longBreak"
                    ? "bg-cyan-400 text-indigo-955 border-indigo-950 shadow-[1px_1px_0px_0px_rgba(30,27,75,1)]"
                    : "border-transparent text-indigo-955 hover:bg-white/50"
                }`}
              >
                🛌 Long ({durationLongBreak}m)
              </button>
            </div>

            {/* Premium Animated Progress Ring containing fluid wave interior backdrop */}
            <div className="relative inline-flex items-center justify-center w-56 h-56 sm:w-64 sm:h-64 mb-6 select-none group">
              
              {/* Solid thick outer border framing */}
              <div className="absolute inset-0 border-3 border-indigo-950 rounded-full bg-white overflow-hidden shadow-inner">
                
                {/* Simulated Wave Liquid Liquid filling proportional to timer values */}
                <div 
                  className={`absolute bottom-0 left-0 right-0 w-full transition-all duration-1000 ease-in-out origin-bottom ${
                    mode === "study"
                      ? "bg-rose-100 text-rose-500"
                      : mode === "break"
                      ? "bg-emerald-100 text-emerald-500"
                      : "bg-cyan-100 text-cyan-500"
                  }`}
                  style={{ height: `${liquidFillHeight}%` }}
                >
                  {/* Rippling top water wave animation vector using inline SVGs */}
                  <div className="absolute top-0 left-0 right-0 h-4 -mt-3.5 fill-current">
                    <svg viewBox="0 0 120 28" className="w-full h-4 text-inherit overflow-visible animate-wiggle">
                      <path d="M0 15 Q 30 0, 60 15 T 120 15 L 120 28 L 0 28 Z" />
                    </svg>
                  </div>
                </div>

                {/* Pulsing focal aura inside glass if running */}
                {isActive && (
                  <div className={`absolute inset-3 border-4 border-dashed rounded-full animate-spin-slow opacity-20 ${
                    mode === "study" ? "border-rose-500" : mode === "break" ? "border-emerald-500" : "border-cyan-500"
                  }`} />
                )}
              </div>

              {/* High precision SVG ring overlays overlaying the fluid bounds */}
              <svg className="w-full h-full transform -rotate-90 z-10 pointers-events-none">
                <circle
                  cx="50%"
                  cy="50%"
                  r="44%"
                  className="stroke-indigo-950/20 fill-none"
                  strokeWidth="8"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="44%"
                  className={`fill-none transition-all duration-300 ${
                    mode === "study"
                      ? "stroke-rose-520 text-rose-500"
                      : mode === "break"
                      ? "stroke-emerald-480 text-emerald-500"
                      : "stroke-cyan-480 text-cyan-500"
                  }`}
                  strokeWidth="8"
                  strokeDasharray="302"
                  strokeDashoffset={302 - (302 * progressPercent) / 100}
                  strokeLinecap="round"
                />
              </svg>

              {/* Absolute core content centering */}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <div className="transition-all duration-300 group-hover:scale-110">
                  {mode === "study" ? (
                    <span className="text-4xl animate-float">🛡️</span>
                  ) : mode === "break" ? (
                    <span className="text-4xl animate-float">🥤</span>
                  ) : (
                    <span className="text-4xl animate-float">🛌</span>
                  )}
                </div>

                <span className="font-display text-[46px] sm:text-[52px] font-black text-indigo-950 tracking-wider font-mono mt-1 leading-none drop-shadow-sm">
                  {formatDisplayTime(timeLeft)}
                </span>

                <div className="flex items-center gap-1 text-[9px] font-display font-black uppercase text-indigo-950 bg-white/80 border border-indigo-950 px-2 py-0.5 rounded-full mt-2 tracking-widest shadow-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500 animate-ping" : "bg-gray-400"}`} />
                  <span>{isActive ? "SESSION ACTIVE" : "AT REST"}</span>
                </div>
              </div>
            </div>

            {/* Controls start/pause buttons */}
            <div className="flex gap-3 w-full max-w-sm justify-center">
              {isActive ? (
                <button
                  onClick={handlePause}
                  className="cartoon-btn flex-1 flex items-center justify-center gap-2 bg-yellow-300 text-indigo-955 font-display font-black py-3 px-4 cursor-pointer hover:bg-yellow-400 shadow-[3px_3px_0px_0px_rgba(30,27,75,1)]"
                >
                  <Pause className="w-4 h-4 fill-indigo-955" />
                  <span>Pause Session</span>
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  className={`cartoon-btn flex-1 flex items-center justify-center gap-2 text-white font-display font-black py-3 px-4 cursor-pointer shadow-[3px_3px_0px_0px_rgba(30,27,75,1)] ${
                    mode === "study"
                      ? "bg-rose-500 hover:bg-rose-600"
                      : mode === "break"
                      ? "bg-emerald-500 hover:bg-emerald-600"
                      : "bg-cyan-500 hover:bg-cyan-600"
                  }`}
                >
                  <Play className="w-4 h-4 fill-white animate-pulse" />
                  <span>Start Focus Duration</span>
                </button>
              )}
            </div>

            {/* Active objective summary bar */}
            <div className="w-full mt-5 bg-indigo-50/50 border-2 border-indigo-950/10 rounded-2xl p-3 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
              <div className="flex items-center gap-2 text-[#5E4CD4]">
                <Target className="w-4 h-4 shrink-0" />
                <span className="font-display font-black">ACTIVE SUBJECT:</span>
              </div>
              <div className="font-sans font-bold text-indigo-950 text-right">
                {selectedCategory} — <span className="opacity-75 italic">{focusGoal || "No custom subgoal specified"}</span>
              </div>
            </div>

          </div>

          {/* RIGHT 5/12: Subject & Goal selectors + Live Session Journal Timeline */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            
            {/* Goal Targeting Panel */}
            <div className="p-5 bg-white border-3 border-indigo-950 rounded-3xl shadow-[4px_4px_0px_0px_#1E1B4B]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-yellow-300 rounded-xl border-2 border-indigo-950">
                  <BookOpen className="w-4 h-4 text-[#1E1B4B] fill-[#1E1B4B]" />
                </div>
                <div>
                  <h4 className="font-display font-black text-[#1E1B4B] text-sm leading-none">Task Targeting</h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1">Tag timer blocks with your current study folders</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Subject picker dropdown */}
                <div>
                  <label className="block text-[10px] font-display font-black text-indigo-950 uppercase tracking-widest mb-1">
                    Select Subject Folder
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-white border-2 border-[#1E1B4B] text-[11px] sm:text-xs font-sans font-bold rounded-lg p-2 focus:outline-hidden"
                  >
                    <option value="General Studies">🏫 General Studies</option>
                    <option value="Language Arts">📖 Language Arts & Lit</option>
                    <option value="Advanced Calculus">📐 Mathematics / Calc</option>
                    <option value="Social Inquiry">🌍 History & Social Studies</option>
                    {noteCategories.map((cat) => (
                      <option key={cat} value={cat}>📁 {cat}</option>
                    ))}
                  </select>
                </div>

                {/* Sub-goal custom visual input field */}
                <div>
                  <label className="block text-[10px] font-display font-black text-indigo-950 uppercase tracking-widest mb-1">
                    Custom Focus Goal / Subtask
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Practicing React state, Reading page 44..."
                      value={focusGoal}
                      onChange={(e) => setFocusGoal(e.target.value)}
                      className="w-full bg-[#FAF9FF] border-2 border-[#1E1B4B] rounded-lg py-1.5 px-3 pl-8 text-xs font-sans font-semibold focus:ring-1 focus:ring-indigo-950 focus:outline-hidden"
                    />
                    <Target className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Session Journal / Productivity Timeline */}
            <div className="p-5 bg-white border-3 border-indigo-950 rounded-3xl shadow-[4px_4px_0px_0px_#1E1B4B] flex-1 flex flex-col min-h-64">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-550" />
                  <div>
                    <h4 className="font-display font-black text-[#1E1B4B] text-xs leading-none">Session Block Logs</h4>
                    <span className="text-[8px] text-gray-400 font-bold uppercase">Journal entries during active session</span>
                  </div>
                </div>

                {sessionLogs.length > 0 && (
                  <button
                    onClick={cleanAllLogs}
                    className="text-[9px] font-display font-black text-rose-500 hover:underline flex items-center gap-0.5"
                  >
                    <Trash2 className="w-3 h-3" /> Clear Journal
                  </button>
                )}
              </div>

              {/* Logs visual timeline list */}
              <div className="flex-1 overflow-y-auto max-h-56 scrollbar pr-1 text-left space-y-3 pb-2">
                {sessionLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 py-8 border-2 border-dashed border-indigo-950/10 rounded-2xl bg-gray-50/50">
                    <Sparkles className="w-6 h-6 text-indigo-300 animate-pulse mb-1.5" />
                    <p className="font-display font-black text-[11px] text-indigo-950">Ready to lock-in?</p>
                    <p className="text-[9px] text-gray-400 font-medium max-w-[200px] leading-relaxed mt-0.5">
                      Your completed study focus sessions and milestone intervals automatically log here!
                    </p>
                  </div>
                ) : (
                  <div className="relative border-l border-indigo-100 pl-3 ml-1.5 space-y-4 pt-1">
                    {sessionLogs.map((log) => (
                      <div key={log.id} className="relative group/item">
                        {/* Dot indicator */}
                        <div className={`absolute -left-[16px] top-1.5 w-2 h-2 rounded-full border-2 border-white ring-4 ${
                          log.type === "study" 
                            ? "bg-rose-400 ring-rose-50" 
                            : "bg-emerald-400 ring-emerald-50"
                        }`} />

                        <div className="flex items-start justify-between gap-1.5 p-2 bg-[#F1EFFF]/40 border border-indigo-950/10 rounded-xl hover:border-indigo-950/30 transition-all">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-sans font-extrabold text-[#7D69EC]">{log.time}</span>
                              <span className="text-[8px] text-gray-400 font-semibold uppercase">{log.type.toUpperCase()} ({log.durationMinutes}m)</span>
                            </div>
                            <p className="font-sans font-bold text-indigo-950 text-xs text-left leading-snug">
                              {log.focusGoal}
                            </p>
                            <span className="inline-flex items-center gap-0.5 text-[8px] font-display font-black text-rose-500 bg-rose-50 px-1 rounded border border-rose-100/50">
                              ⭐ +{log.xpEarned} XP
                            </span>
                          </div>

                          <button 
                            onClick={() => removeLog(log.id)}
                            className="text-gray-400 hover:text-rose-500 shrink-0 p-1 rounded-sm opacity-50 hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Streak multiplier status footer inside log */}
              <div className="mt-4 pt-3 border-t border-indigo-950/10 flex items-center justify-between text-xs font-display font-black text-indigo-950">
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
                  <span>Focus Block Level:</span>
                </div>
                <span className="text-rose-500 font-mono text-sm bg-rose-50 border border-rose-150 px-2 py-0.5 rounded-md">
                  {cycleCount} Completed
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
