import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Flame, 
  Check, 
  Heart,
  Volume2, 
  VolumeX, 
  Settings, 
  Activity, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Brain,
  Layers,
  ArrowRight
} from "lucide-react";
import { UserStats, Note } from "../types";
import StudyAvatar, { AvatarType } from "./StudyAvatar";

interface DashboardViewProps {
  stats: UserStats;
  notes: Note[];
  userName: string;
  userAvatar: AvatarType;
  addXp: (amount: number, reason: string) => void;
  playSound: (type: "bloop" | "success" | "fail" | "pop" | "levelUp") => void;
  setCurrentTab: (tab: any) => void;
  dailyXpTarget: number;
}

export default function DashboardView({
  stats,
  notes,
  userName,
  userAvatar,
  addXp,
  playSound,
  setCurrentTab,
  dailyXpTarget
}: DashboardViewProps) {
  // AI Uplink status states
  const [uplinkDiagnostic, setUplinkDiagnostic] = useState<{
    isLoading: boolean;
    hasRun: boolean;
    configured: boolean;
    status: string;
    model: string;
    latencyMs?: number;
    message: string;
  }>({
    isLoading: false,
    hasRun: false,
    configured: false,
    status: "Unknown",
    model: "Offline Fallback Mode",
    message: "Diagnostic uplink sweep has not been initiated yet."
  });

  // Companion Plant/Sprout States (Replacing Dashboard Settings)
  const [plantProgress, setPlantProgress] = useState<number>(() => {
    return Number(localStorage.getItem("gizmoplanet_plant_progress") || "20");
  });
  
  const [plantStage, setPlantStage] = useState<number>(() => {
    return Number(localStorage.getItem("gizmoplanet_plant_stage") || "1"); // 0 to 4
  });

  const [petStatus, setPetStatus] = useState<string>("GigaSprout is dreaming about school homework...");

  // Quick Study Buddy interactive bubble states
  const [quickInput, setQuickInput] = useState("");
  const [quickAnswer, setQuickAnswer] = useState<string>("");
  const [isQuickLoading, setIsQuickLoading] = useState(false);

  // Vibe sound machine ref and states
  const [activeVibe, setActiveVibe] = useState<"none" | "lofi" | "rain" | "cyber" | "campfire">("none");
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Keep track of active audio nodes so we can stop them cleanly of course
  const noiseNodeRef = useRef<AudioNode | null>(null);
  const oscillatorRefs = useRef<OscillatorNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const timerIdRef = useRef<number | null>(null);

  // Safe lazy-init of AudioContext (Web Audio must run inside client click handlers)
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

  // Synthesize procedural noises for beautiful study focus atmosphere!
  const stopAllProceduralNotes = () => {
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    try {
      if (noiseNodeRef.current) {
        (noiseNodeRef.current as any).disconnect();
        noiseNodeRef.current = null;
      }
    } catch {}
    oscillatorRefs.current.forEach(osc => {
      try { osc.stop(); osc.disconnect(); } catch {}
    });
    oscillatorRefs.current = [];
    try {
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
    } catch {}
  };

  const playVibeSound = (vibe: "none" | "lofi" | "rain" | "cyber" | "campfire") => {
    stopAllProceduralNotes();
    if (vibe === "none") {
      setActiveVibe("none");
      return;
    }

    try {
      const ctx = getAudioContext();
      setActiveVibe(vibe);

      // Create main output master gain
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.08, ctx.currentTime);
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;

      // 1. Generate core backdrop color noise (White/Pink/Brown simulated filtering for natural flow)
      const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise buffer
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (vibe === "rain") {
          // Brownish soft rumbling noise for rain attic feel
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 4.5; // Gain scaling for soft noise
        } else if (vibe === "lofi") {
          // Low fidelity crackling sound pattern
          output[i] = (lastOut + (0.07 * white)) / 1.07;
          lastOut = output[i];
          // Occasional record vinyl sparks
          if (Math.random() > 0.9995) {
            output[i] += (Math.random() > 0.5 ? 0.75 : -0.75);
          }
          output[i] *= 1.8;
        } else if (vibe === "campfire") {
          // Campfire snaps
          output[i] = (lastOut + (0.05 * white)) / 1.05;
          lastOut = output[i];
          if (Math.random() > 0.9982) {
            output[i] += (Math.random() > 0.5 ? 0.9 : -0.9);
          }
          output[i] *= 1.4;
        } else {
          // Cyber space hum base noise
          output[i] = (lastOut + (0.01 * white)) / 1.01;
          lastOut = output[i];
          output[i] *= 1.1;
        }
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      // Create standard lowpass filters for that cozy muffled warmth
      const biquadFilter = ctx.createBiquadFilter();
      biquadFilter.type = "lowpass";
      
      if (vibe === "rain") {
        biquadFilter.frequency.setValueAtTime(650, ctx.currentTime);
      } else if (vibe === "lofi") {
        biquadFilter.frequency.setValueAtTime(800, ctx.currentTime);
      } else if (vibe === "campfire") {
        biquadFilter.frequency.setValueAtTime(950, ctx.currentTime);
      } else if (vibe === "cyber") {
        biquadFilter.frequency.setValueAtTime(400, ctx.currentTime);
      }

      noiseNode.connect(biquadFilter);
      biquadFilter.connect(masterGain);
      noiseNode.start();
      noiseNodeRef.current = noiseNode;

      // 2. Synthesize melodic vibe components purely procedurally!
      if (vibe === "lofi") {
        // Slow warm background keyboard chord sequence generated live (Cmaj9 -> Am9)
        const playLofiNote = () => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const noteGain = ctx.createGain();

          osc1.type = "sine";
          osc2.type = "triangle";

          // Frequency mappings
          const chordArr = Math.random() > 0.5 
            ? [130.81, 164.81, 196.00, 246.94, 293.66] // C major 9 chords (C3, E3, G3, B3, D4)
            : [110.00, 130.81, 164.81, 196.00, 220.00]; // A minor 7/9 (A2, C3, E3, G3, A3)
          
          const freq = chordArr[Math.floor(Math.random() * chordArr.length)];
          osc1.frequency.setValueAtTime(freq, ctx.currentTime);
          osc2.frequency.setValueAtTime(freq * 1.01, ctx.currentTime); // detuned

          noteGain.gain.setValueAtTime(0, ctx.currentTime);
          noteGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1.2);
          noteGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 4.5);

          osc1.connect(noteGain);
          osc2.connect(noteGain);
          noteGain.connect(masterGain);

          osc1.start();
          osc2.start();
          oscillatorRefs.current.push(osc1, osc2);

          setTimeout(() => {
            try { osc1.stop(); osc2.stop(); } catch {}
          }, 5000);
        };
        
        // Tick every 4 seconds to trigger ambient chord notes
        playLofiNote();
        timerIdRef.current = window.setInterval(playLofiNote, 4200);

      } else if (vibe === "cyber") {
        // Futuristic lab beeps and space pads
        const playCyberBeep = () => {
          const osc = ctx.createOscillator();
          const synthGain = ctx.createGain();

          osc.type = "sine";
          // High futuristic frequency
          const freqList = [880, 1046, 1318, 1760];
          const freq = freqList[Math.floor(Math.random() * freqList.length)];
          
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          synthGain.gain.setValueAtTime(0, ctx.currentTime);
          synthGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.05);
          synthGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);

          osc.connect(synthGain);
          synthGain.connect(masterGain);

          osc.start();
          oscillatorRefs.current.push(osc);

          setTimeout(() => {
            try { osc.stop(); } catch {}
          }, 1000);
        };

        timerIdRef.current = window.setInterval(() => {
          if (Math.random() > 0.4) playCyberBeep();
        }, 1600);
      } else if (vibe === "campfire") {
        // Deep warm fireplace crackle bursts
        const playFlamePop = () => {
          const osc = ctx.createOscillator();
          const popGain = ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(60 + Math.random() * 40, ctx.currentTime);
          
          popGain.gain.setValueAtTime(0.06, ctx.currentTime);
          popGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

          osc.connect(popGain);
          popGain.connect(masterGain);
          osc.start();
          setTimeout(() => {
            try { osc.stop(); } catch {}
          }, 200);
        };

        timerIdRef.current = window.setInterval(() => {
          if (Math.random() > 0.3) playFlamePop();
        }, 250);
      }

    } catch (err) {
      console.warn("Could not play procedural focus audio: Ensure browser permission is allowed.", err);
    }
  };

  useEffect(() => {
    // Keep clean on dismantle
    return () => {
      stopAllProceduralNotes();
    };
  }, []);

  // Live diagnose tester that queries the real backend /api/ai-status
  const checkAIUplinkStatus = async () => {
    playSound("bloop");
    setUplinkDiagnostic({
      isLoading: true,
      hasRun: true,
      configured: false,
      status: "Aligning Laser Uplink...",
      model: "Offline Fallback Mode",
      message: "Sending ping packets down to the Cloud Run server..."
    });

    try {
      const startTime = Date.now();
      const response = await fetch("/api/ai-status");
      const data = await response.json();
      
      setUplinkDiagnostic({
        isLoading: false,
        hasRun: true,
        configured: data.configured ?? false,
        status: data.status || "Active ✅",
        model: data.model || "gemini-3.5-flash",
        latencyMs: Date.now() - startTime,
        message: data.message || "Connection secure and active!"
      });
      
      if (data.configured) {
        playSound("success");
        addXp(15, "Diagnostics clear! Configured Gemini Uplink Connected! 🤖");
      } else {
        playSound("fail");
      }
    } catch (e: any) {
      setUplinkDiagnostic({
        isLoading: false,
        hasRun: true,
        configured: false,
        status: "Error Connection Failed ❌",
        model: "Offline Fallback Mode",
        message: e.message || "Failed to call backend route. Confirm server is running correctly."
      });
      playSound("fail");
    }
  };

  // Quick Dashboard chat query directly with Gizmo AI inside the dashboard!
  const handleQuickChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    playSound("pop");
    setIsQuickLoading(true);
    const userQuery = quickInput;
    setQuickInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: `(Keep your response very short, ideal for a cartoon speech widget under 3 sentences): ${userQuery}` }
          ]
        })
      });
      const data = await response.json();
      setQuickAnswer(data.content || "I couldn't write an answer right now! Let's get back on lock-in study!");
      addXp(10, `Asked Gizmo a dashboard quick prompt! 💡`);
      playSound("success");
    } catch (err: any) {
      console.error(err);
      setQuickAnswer("Whoops, looks like I couldn't reach my brainwaves right now! Tweak settings to ensure my developer keys are configured correctly!");
      playSound("fail");
    } finally {
      setIsQuickLoading(false);
    }
  };

  const getMotivationalQuote = () => {
    switch (userAvatar) {
      case "robot":
        return "Beep boop! Microchip lock-in activated. 100% of processors aligned to studying! 🤖🚀";
      case "owl":
        return "Wise decision to open our study materials today, superstar! Let's conquer this quest. 🦉📚";
      case "cat":
        return "Meow-gnificent focus level detected today! Ready to make some magical study notes? 🐈✨";
      case "student":
      default:
        return "You're a star in the making. Let's conquer these subjects and secure the highest levels! 🎓💯";
    }
  };

  // Interactive Plant Actions
  const handleWaterPlant = () => {
    playSound("pop");
    let nextProgress = plantProgress + 20;
    let nextStage = plantStage;
    if (nextProgress >= 100) {
      if (plantStage < 4) {
        nextStage = plantStage + 1;
        nextProgress = 0;
        playSound("levelUp");
        setPetStatus(`✨ GigaSprout evolved to STAGE ${nextStage}! Awesome focus! 🎉`);
      } else {
        nextProgress = 100;
        setPetStatus("GigaSprout is at absolute stellar max height! 🌳🌟");
      }
    } else {
      const comments = [
        "Mmm, study water is delicious! 💧",
        "Slurrrrp! Growth levels rising!",
        "GigaSprout leaf wiggles in sheer refreshment!",
        "Drip drip! Cellular structure locked in!"
      ];
      setPetStatus(comments[Math.floor(Math.random() * comments.length)]);
    }
    setPlantProgress(nextProgress);
    setPlantStage(nextStage);
    localStorage.setItem("gizmoplanet_plant_progress", String(nextProgress));
    localStorage.setItem("gizmoplanet_plant_stage", String(nextStage));
    addXp(15, "Watered the Study GigaSprout! 🌱💧");
  };

  const handleSunshinePlant = () => {
    playSound("pop");
    let nextProgress = plantProgress + 25;
    let nextStage = plantStage;
    if (nextProgress >= 100) {
      if (plantStage < 4) {
        nextStage = plantStage + 1;
        nextProgress = 0;
        playSound("levelUp");
        setPetStatus(`☀️ Solar alignment complete! Evolved to STAGE ${nextStage}!`);
      } else {
        nextProgress = 100;
        setPetStatus("Fully photo-synthesized! Radiant galaxy bonsai!");
      }
    } else {
      const sunQuotes = [
        "Warm school ray photons received! ☀️",
        "Aromatic focus solar beams, so cozy!",
        "GigaSprout is charging its leaf batteries!",
        "Photosynthesis equations in real timeline!"
      ];
      setPetStatus(sunQuotes[Math.floor(Math.random() * sunQuotes.length)]);
    }
    setPlantProgress(nextProgress);
    setPlantStage(nextStage);
    localStorage.setItem("gizmoplanet_plant_progress", String(nextProgress));
    localStorage.setItem("gizmoplanet_plant_stage", String(nextStage));
    addXp(20, "Synthesized study sunshine onto GigaSprout! ☀️🌱");
  };

  const handlePetPlant = () => {
    playSound("bloop");
    const replies = [
      "GigaSprout giggles enthusiastically! 🌱✨",
      "GigaSprout purrs like a cozy desktop generator!",
      "Tickles checked! Green leaves waving safely!",
      "Beep: Mascot love level elevated in logs! 🤖❤️",
      "GigaSprout releases a warm oxygen puff!"
    ];
    setPetStatus(replies[Math.floor(Math.random() * replies.length)]);
    addXp(5, "Petted the GigaSprout study companion! 🌱");
  };

  const getPlantGraphic = () => {
    switch (plantStage) {
      case 0:
        return { emoji: "🥜", name: "Dormant Study Seeds", color: "text-amber-700" };
      case 1:
        return { emoji: "🌱", name: "Tiny GigaSprout Sprout", color: "text-emerald-500" };
      case 2:
        return { emoji: "🍀", name: "Lush Concentrated Vine", color: "text-teal-500" };
      case 3:
        return { emoji: "🌸", name: "Magical Focus Blossom", color: "text-pink-500" };
      case 4:
      default:
        return { emoji: "🌳", name: "Stellar Cosmic Bonsai", color: "text-indigo-600 font-extrabold animate-bounce" };
    }
  };

  const plantInfo = getPlantGraphic();
  const currentDailyProgress = Math.min(100, Math.round((stats.xp / dailyXpTarget) * 100));

  return (
    <div className="w-full h-full flex flex-col gap-5 overflow-y-auto pr-1">
      
      {/* 1. Header Greeting Card Banner with colorful cartoon gradients */}
      {/* BUGFIX: Added flex-shrink-0 and min-h to completely eliminate any horizontal/vertical squishing */}
      <div className="relative bg-gradient-to-r from-[#DFEAFF] via-[#E4EBFF] to-[#ECE8FE] rounded-3xl p-5 md:p-6 border-2 border-indigo-950 shadow-[4px_4px_0px_0px_rgba(30,27,75,1)] flex flex-col md:flex-row items-center gap-6 overflow-hidden flex-shrink-0 min-h-[140px] md:min-h-[115px]">
        
        {/* Floating background decorative stars */}
        <div className="absolute right-4 top-4 text-purple-400 opacity-60 text-2xl animate-spin" style={{ animationDuration: "12s" }}>✨</div>
        <div className="absolute left-8 bottom-4 text-[#7D69EC] opacity-40 text-xl animate-bounce">⚡</div>

        {/* Character study avatar representation */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 bg-white border-2 border-indigo-950 rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(30,27,75,1)] overflow-hidden">
            <StudyAvatar type={userAvatar} className="w-18 h-18" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-indigo-950 text-white font-mono font-black text-xs px-2 py-0.5 rounded-md">
            Lv.{stats.level}
          </div>
        </div>

        {/* User name & status summary */}
        <div className="flex-1 text-center md:text-left min-w-0">
          <p className="text-[10px] bg-indigo-950 text-amber-300 font-display font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full inline-block mb-1.5 leading-tight">
            STUDENT LAUNCHPAD HUBS
          </p>
          <h2 className="text-2xl md:text-3xl font-display font-black leading-none mb-1 text-indigo-950">
            Welcome back, {userName}! 👋
          </h2>
          <p className="text-xs font-sans font-semibold text-indigo-950/60 italic leading-relaxed">
            "{getMotivationalQuote()}"
          </p>
        </div>

        {/* User live daily XP stats ring */}
        <div className="flex-shrink-0 bg-white border-2 border-indigo-950 p-3.5 rounded-2xl shadow-[3px_3px_0px_0px_rgba(30,27,75,1)] flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-orange-50 border-2 border-[#FFA200] flex items-center justify-center">
            <Flame className="w-6 h-6 text-[#FFA200] fill-current animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-sans font-semibold text-gray-400 leading-none">STREAK WEEK</p>
            <p className="text-lg font-display font-black text-indigo-950 leading-tight">
              {stats.streak} Days Live!
            </p>
            <span className="text-[9px] font-display font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              Active lock-in
            </span>
          </div>
        </div>
      </div>

      {/* 1.5. Visual Progress Tracker for Daily XP Goals */}
      <div 
        id="daily-xp-progress-tracker" 
        className="bg-[#FFFDF9] rounded-3xl p-5 border-2 border-indigo-950 shadow-[4px_4px_0px_0px_rgba(30,27,75,1)] flex flex-col md:flex-row items-center justify-between gap-5 flex-shrink-0"
      >
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border-2 border-indigo-950 flex items-center justify-center text-2xl flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]">
            🎯
          </div>
          <div>
            <h3 className="font-display font-black text-indigo-950 text-base flex items-center gap-2">
              Daily XP Target Progress
              <span className="text-xs font-mono font-black text-[#7D69EC] bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-950/10">
                Goal: {dailyXpTarget} XP
              </span>
            </h3>
            <p className="text-xs font-sans font-semibold text-gray-500 mt-0.5">
              {currentDailyProgress >= 100 
                ? "🎉 Daily target reached! You operate at maximum learning frequency overdrive today! 🚀" 
                : `🔥 Completed ${currentDailyProgress}% of today's target. Finish ${Math.max(0, dailyXpTarget - stats.xp)} more XP to secure the daily lock-in!`
              }
            </p>
          </div>
        </div>

        <div className="w-full md:w-[350px] flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs font-display font-black text-indigo-950">
            <span>Progress: {stats.xp} / {dailyXpTarget} XP</span>
            <span className="text-[#7D69EC] font-mono">{currentDailyProgress}%</span>
          </div>
          
          {/* Custom Styled responsive progress bar */}
          <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden p-0.5 relative border-2 border-indigo-950 shadow-inner flex items-center">
            <div
              className="bg-gradient-to-r from-[#7D69EC] to-amber-400 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2.5 relative"
              style={{ width: `${currentDailyProgress}%` }}
            >
              {currentDailyProgress >= 15 && (
                <span className="text-[10px] font-mono font-black text-white drop-shadow-[1px_1px_0px_rgba(30,27,75,0.7)] select-none">
                  ⚡
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout of Widgets & Interactive Blocks */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-shrink-0">
        
        {/* WIDGET A: Interactive Mascot Quick Chat Dialogue Box (xl:col-span-7) */}
        <div className="xl:col-span-7 bg-white rounded-3xl border-2 border-indigo-950 shadow-[4px_4px_0px_0px_rgba(30,27,75,1)] p-5 flex flex-col justify-between min-h-[310px]">
          <div>
            <div className="flex justify-between items-center mb-3 border-b-2 border-indigo-950/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <h3 className="font-display font-black text-indigo-950 text-base">Quick Mascot Chat Link</h3>
              </div>
              <button 
                onClick={() => setCurrentTab("chat")}
                className="text-xs font-display font-black text-[#5E4CD4] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Open Full Lab <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speach bubble container */}
            <div className="bg-[#FAF9FF] border-2 border-indigo-950 p-4 rounded-2xl min-h-[140px] relative">
              <span className="absolute -left-2 top-6 w-3 h-3 bg-[#FAF9FF] border-l-2 border-b-2 border-indigo-950 rotate-45" />
              
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 border border-indigo-950/15 bg-white rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 animate-bounce">
                  <StudyAvatar type={userAvatar} className="w-8 h-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-display font-black text-[#7D69EC] uppercase tracking-wide">
                    {userAvatar === "robot" ? "GIZMO THE BOT" : userAvatar.toUpperCase()} REPLIES:
                  </p>
                  
                  {isQuickLoading ? (
                    <div className="flex items-center gap-2 mt-1.5 py-1">
                      <div className="w-2.5 h-2.5 bg-[#7D69EC] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2.5 h-2.5 bg-[#7D69EC] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2.5 h-2.5 bg-[#7D69EC] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      <span className="text-[11px] font-mono text-gray-400 ml-1">Sparking brainwaves...</span>
                    </div>
                  ) : quickAnswer ? (
                    <p className="text-xs font-sans font-semibold text-indigo-950 mt-1 leading-relaxed select-text whitespace-pre-wrap">
                      {quickAnswer}
                    </p>
                  ) : (
                    <p className="text-xs font-sans font-semibold text-gray-400 mt-1 italic leading-relaxed">
                      "I'm powered by real Gemini intelligence! Type any speedy query below (e.g. 'explain kinetic energy' or 'quiz me on anatomy in one sentence') to test my real knowledge core spark!"
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleQuickChatSubmit} className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="Ask Gizmo anything right now! (e.g., Explain osmosis...)"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              disabled={isQuickLoading}
              className="cartoon-input flex-1 px-4 py-2.5 text-xs font-bold text-indigo-950 border-3 border-indigo-950"
            />
            <button
              type="submit"
              disabled={isQuickLoading || !quickInput.trim()}
              className="cartoon-btn bg-[#7D69EC] hover:bg-[#6853DF] text-white font-display font-black text-xs px-4.5 py-2.5 cursor-pointer shadow-[2px_2px_0px_0px_rgba(30,27,75,1)] disabled:opacity-50"
            >
              Ask! ➔
            </button>
          </form>
        </div>

        {/* WIDGET B: Atmospheric Study Vibe Soundboard (xl:col-span-5) */}
        <div className="xl:col-span-5 bg-[#FAF9FF] rounded-3xl border-2 border-indigo-950 shadow-[4px_4px_0px_0px_rgba(30,27,75,1)] p-5 flex flex-col justify-between min-h-[310px]">
          <div>
            <div className="flex justify-between items-center mb-1 bg-white ring-1 ring-black/5 p-2 rounded-xl mb-3">
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-orange-500" />
                <h3 className="font-display font-black text-indigo-950 text-xs">Acoustic Vibe Atmosphere</h3>
              </div>
              <span className="text-xs font-mono font-black text-indigo-955 bg-indigo-50 px-1.5 py-0.5 rounded">
                Procedural Player
              </span>
            </div>
            <p className="text-[10px] font-sans font-semibold text-gray-500 mb-3 leading-tight">
              Toggle live synthesized audio focus background tracks. Generates audio waves in real-time.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "none", label: "Silent Desk", desc: "Pure silence", icon: "🔇" },
                { id: "lofi", label: "Cozy Lofi Hum", desc: "Simulated lofi chords", icon: "☕" },
                { id: "rain", label: "Rainy Window", desc: "White noise rain", icon: "🌧️" },
                { id: "cyber", label: "Cyber Synth Lab", desc: "Futuristic beeps", icon: "📡" },
                { id: "campfire", label: "Fire Crackle", desc: "Warm cozy fireplace", icon: "🔥" }
              ].map((item) => {
                const isSelected = activeVibe === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      playSound("pop");
                      playVibeSound(item.id as any);
                    }}
                    className={`cartoon-btn p-2 text-left bg-white transition-all hover:bg-indigo-50/50 cursor-pointer ${
                      isSelected 
                        ? "border-[#7D69EC] bg-[#EEECFF] scale-[1.01]" 
                        : "opacity-85 border-indigo-950"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base flex-shrink-0">{item.icon}</span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-display font-black text-indigo-950 truncate">{item.label}</p>
                        <p className="text-[8.5px] font-sans text-gray-400 truncate leading-none mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 bg-white p-2.5 rounded-xl border border-indigo-950/10 flex items-center justify-between">
            <span className="text-[10px] font-display font-black text-indigo-950/70">
              {activeVibe === "none" ? "🔇 Playback Paused" : `🎵 Synthesizing: ${activeVibe.toUpperCase()}`}
            </span>
            <button 
              onClick={() => playVibeSound("none")}
              className="cartoon-btn px-2 py-1 text-[9px] bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-600 shadow-[1px_1px_0px_rgba(30,27,75,1)]"
            >
              Turn Off Audio
            </button>
          </div>
        </div>

      </div>

      {/* Lower Row Grid of Diagnostics & Settings Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-shrink-0 pb-4">
        
        {/* WIDGET C: REAL-WORLD AI CORE CONFIG & TEST diagnostics (xl:col-span-6) */}
        <div className="xl:col-span-6 bg-white rounded-3xl border-2 border-indigo-950 shadow-[4px_4px_0px_0px_rgba(30,27,75,1)] p-5 flex flex-col justify-between min-h-[330px]">
          <div>
            <div className="flex items-center justify-between border-b-2 border-indigo-950/10 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                <h3 className="font-display font-black text-indigo-950 text-base">Gizmo Core Uplink & Diagnostics</h3>
              </div>
              <span className="text-[9px] font-mono font-black text-[#5C509C] bg-purple-50 px-2 py-0.5 rounded-md uppercase">
                UPLINK CONTROL
              </span>
            </div>

            <p className="text-xs font-sans text-gray-500 mb-4 leading-relaxed">
              Verify real-time communication channel integrity with our **Gemini 3.5 Flash** engines running on server. Test latency to make sure the AI is responsive.
            </p>

            <div className="bg-[#FAF9FF] border-2 border-indigo-950 rounded-2xl p-4 space-y-3 mb-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-display font-black text-[#5C509C]">LASER Uplink Status:</span>
                <span className={`font-mono font-black px-2 py-0.5 rounded ${
                  uplinkDiagnostic.isLoading 
                    ? "bg-amber-100 text-amber-700 animate-pulse" 
                    : uplinkDiagnostic.configured 
                      ? "bg-emerald-100 text-emerald-700" 
                      : uplinkDiagnostic.hasRun 
                        ? "bg-rose-100 text-rose-700" 
                        : "bg-slate-100 text-slate-700"
                }`}>
                  {uplinkDiagnostic.isLoading ? "Probing Uplink..." : uplinkDiagnostic.status}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="font-display font-black text-[#5C509C]">Active AI Mind:</span>
                <span className="font-mono font-bold text-indigo-950">
                  {uplinkDiagnostic.model}
                </span>
              </div>

              {uplinkDiagnostic.latencyMs !== undefined && (
                <div className="flex justify-between items-center text-xs">
                  <span className="font-display font-black text-[#5C509C]">API Roundtrip Latency:</span>
                  <span className="font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {uplinkDiagnostic.latencyMs} ms
                  </span>
                </div>
              )}

              <div className="border-t border-indigo-950/10 pt-2 text-xs font-sans font-semibold text-gray-500 leading-relaxed select-text">
                {uplinkDiagnostic.message}
              </div>
            </div>
          </div>

          <button
            onClick={checkAIUplinkStatus}
            disabled={uplinkDiagnostic.isLoading}
            className="cartoon-btn w-full bg-[#7D69EC] hover:bg-[#6853DF] text-white font-display font-black text-xs py-2.5 cursor-pointer shadow-[2px_2px_0px_0px_rgba(30,27,75,1)] disabled:opacity-50 mt-1"
          >
            {uplinkDiagnostic.isLoading ? "SWEEPING FREQUENCIES..." : "Run Core AI Uplink Diagnostic ✓"}
          </button>
        </div>

        {/* NEW WIDGET D: STUDY COMPANION GROWING PLANT (REPLACING SETTINGS!) (xl:col-span-6) */}
        <div className="xl:col-span-6 bg-[#FFFDF9] rounded-3xl border-2 border-indigo-950 shadow-[4px_4px_0px_0px_rgba(30,27,75,1)] p-5 flex flex-col justify-between min-h-[330px]">
          
          <div>
            <div className="flex items-center justify-between border-b-2 border-indigo-950/10 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌱</span>
                <h3 className="font-display font-black text-indigo-950 text-base">GigaSprout Study Oasis</h3>
              </div>
              <span className="text-[9px] font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                Virtual Pet
              </span>
            </div>

            <p className="text-xs font-sans text-gray-500 mb-3 leading-relaxed">
              Feed and water your virtual GigaSprout desktop buddy. Focus sessions earn you custom energies. Expand it through 5 magical stages of space biology!
            </p>

            {/* Interactive Stage & Growth View */}
            <div className="bg-white border-2 border-indigo-950 p-3 rounded-2xl flex items-center gap-4 shadow-sm mb-3.5 relative">
              
              {/* Plant Visual Center */}
              <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-amber-50 to-emerald-50 border-2 border-indigo-950 flex flex-col items-center justify-center text-3xl shadow-inner relative overflow-hidden flex-shrink-0">
                <span className={`transform transition-all active:scale-125 duration-300 ${plantStage === 4 ? "animate-pulse" : "hover:rotate-12"}`}>
                  {plantInfo.emoji}
                </span>
                <div className="absolute bottom-0 inset-x-0 h-2 bg-amber-800/10" />
              </div>

              {/* Stats and text */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-display font-black text-[#5C509C] uppercase tracking-wide">
                  STAGE {plantStage} COMPANION:
                </p>
                <h4 className={`text-sm font-display font-black text-indigo-955 truncate leading-tight ${plantInfo.color}`}>
                  {plantInfo.name}
                </h4>
                
                {/* Growth progress bar */}
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 relative border border-indigo-950/20 text-center flex items-center">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${plantProgress}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono font-black text-emerald-600 flex-shrink-0">
                    {plantProgress}% Growth
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Speech Balloon */}
            <div className="bg-[#FAF9FC] border border-indigo-950/15 p-2 rounded-xl text-[10.5px] font-semibold text-indigo-950/80 italic leading-relaxed text-center mb-3">
              "{petStatus}"
            </div>
          </div>

          {/* Plant Controls awarding real app XP */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleWaterPlant}
              className="cartoon-btn bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-400 py-1.5 font-display font-black text-[10px] flex flex-col items-center justify-center cursor-pointer shadow-[1px_1px_0px_rgba(30,27,75,1)]"
            >
              <span>💧 Water Dew</span>
              <span className="text-[8px] opacity-75 font-mono mt-0.5">+15 XP</span>
            </button>

            <button
              onClick={handleSunshinePlant}
              className="cartoon-btn bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-400 py-1.5 font-display font-black text-[10px] flex flex-col items-center justify-center cursor-pointer shadow-[1px_1px_0px_rgba(30,27,75,1)]"
            >
              <span>☀️ Sunshine</span>
              <span className="text-[8px] opacity-75 font-mono mt-0.5">+20 XP</span>
            </button>

            <button
              onClick={handlePetPlant}
              className="cartoon-btn bg-pink-50 hover:bg-pink-100 text-pink-600 border-pink-400 py-1.5 font-display font-black text-[10px] flex flex-col items-center justify-center cursor-pointer shadow-[1px_1px_0px_rgba(30,27,75,1)]"
            >
              <span>❤️ Pet Sprout</span>
              <span className="text-[8px] opacity-75 font-mono mt-0.5">+5 XP</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
