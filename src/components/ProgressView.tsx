import { Award, Trophy, Clock, CheckCircle2, Flame, RefreshCw, ArrowLeft } from "lucide-react";
import { UserStats } from "../types";

interface ProgressViewProps {
  stats: UserStats;
  history: Array<{ id: string; title: string; xp: number; timestamp: string }>;
  clearStats: () => void;
  playSound: (type: "bloop" | "success" | "fail" | "pop" | "levelUp") => void;
  onBack: () => void;
}

export default function ProgressView({ stats, history, clearStats, playSound, onBack }: ProgressViewProps) {
  const currentLevelXp = stats.xp % 100;
  const levelTitle =
    stats.level === 1
      ? "Brainrot Noob 🍼"
      : stats.level === 2
      ? "Skibidi Scholar 🎓"
      : stats.level === 3
      ? "Looksmaxxer Learner 💅"
      : stats.level === 4
      ? "Gyatt Genius 🧠"
      : "Sigma Gigachad Sage 👑";

  const achievements = [
    {
      id: "focus_1",
      title: "Silent Mewing 🧘",
      desc: "Finish your first 25-minute Pomodoro study block",
      unlocked: stats.totalFocusMinutes >= 25,
      icon: "🧘"
    },
    {
      id: "quiz_1",
      title: "Mogged MCQ 🚀",
      desc: "Ace or complete at least 1 generator quiz",
      unlocked: stats.totalQuizzesTaken >= 1,
      icon: "🚀"
    },
    {
      id: "xp_100",
      title: "Skibidi Level 2 🎓",
      desc: "Reach learner level 2 or above",
      unlocked: stats.level >= 2,
      icon: "🎈"
    },
    {
      id: "streak_3",
      title: "Rizzler Streak 🔥",
      desc: "Unleash a 3+ day streak block",
      unlocked: stats.streak >= 3,
      icon: "🔥"
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#FAF9FF] relative rounded-2xl">
      {/* Middle Workspace Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-indigo-950/10 gap-3">
        <div>
          <h2 className="text-3xl font-display font-black text-[#1E1B4B] flex items-center gap-2">
            Study Achievements <span className="animate-wiggle inline-block">📊</span>
          </h2>
          <p className="text-xs font-semibold text-gray-500 uppercase mt-0.5 tracking-wider">
            Track your study stats, unlock trophies, and clock your hours!
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => { playSound("fail"); if(confirm("Reset entire high scores?")) clearStats(); }}
            className="cartoon-btn p-2 bg-rose-100 hover:bg-rose-200 text-indigo-950 border-indigo-950 flex items-center justify-center cursor-pointer"
            title="Reset stats"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onBack}
            className="cartoon-btn px-3.5 py-2 bg-white text-indigo-950 font-display font-black text-sm flex items-center gap-1.5 cursor-pointer hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Main scrolling zone matching chat height */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar space-y-6 pb-4 min-h-0">
        
        {/* Level overview badge */}
        <div className="cartoon-card bg-white p-5 border-3 border-indigo-950 rounded-3xl shadow-[4px_4px_0px_0px_#1E1B4B] text-center">
          <span className="text-xs font-display font-black text-[#7D69EC] uppercase tracking-widest block">
            ⭐ GIZMO COGNITIVE RANK ⭐
          </span>
          <p className="font-display font-black text-2xl text-[#1E1B4B] mt-1">
            {levelTitle} (Level {stats.level})
          </p>

          {/* Custom high-contrast progress bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center text-xs font-display font-black text-indigo-950 mb-1.5">
              <span>CURRENT: {currentLevelXp} XP</span>
              <span className="text-[#7D69EC]">{100 - currentLevelXp} XP TO LEVEL UP</span>
            </div>
            <div className="w-full bg-slate-100 border-3 border-indigo-950 h-7 rounded-full overflow-hidden p-0.5 relative shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]">
              <div
                className="bg-[#7D69EC] h-full rounded-full transition-all duration-500 border-r-2 border-indigo-950"
                style={{ width: `${currentLevelXp}%` }}
              />
            </div>
          </div>
        </div>

        {/* Key Game Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="cartoon-card bg-white p-4 border-3 border-indigo-950 rounded-2xl text-center flex flex-col justify-center items-center shadow-[3px_3px_0px_0px_#1E1B4B]">
            <Flame className="w-6 h-6 text-orange-500 fill-orange-500 mb-1" />
            <span className="text-[10px] font-display font-black text-[#7D69EC] uppercase tracking-wider leading-tight">STREAK</span>
            <span className="font-display font-black text-xl text-indigo-950 mt-1 leading-none">{stats.streak} Days</span>
          </div>
          
          <div className="cartoon-card bg-white p-4 border-3 border-indigo-950 rounded-2xl text-center flex flex-col justify-center items-center shadow-[3px_3px_0px_0px_#1E1B4B]">
            <Clock className="w-6 h-6 text-indigo-600 mb-1" />
            <span className="text-[10px] font-display font-black text-[#7D69EC] uppercase tracking-wider leading-tight">FOCUS</span>
            <span className="font-display font-black text-xl text-indigo-950 mt-1 leading-none">{stats.totalFocusMinutes} Min</span>
          </div>

          <div className="cartoon-card bg-white p-4 border-3 border-indigo-950 rounded-2xl text-center col-span-2 md:col-span-1 flex flex-col justify-center items-center shadow-[3px_3px_0px_0px_#1E1B4B]">
            <CheckCircle2 className="w-6 h-6 text-green-500 mb-1" />
            <span className="text-[10px] font-display font-black text-[#7D69EC] uppercase tracking-wider leading-tight">QUIZZES</span>
            <span className="font-display font-black text-xl text-indigo-950 mt-1 leading-none">{stats.totalQuizzesTaken} Played</span>
          </div>
        </div>

        {/* Trophy Cabinet section */}
        <div>
          <h4 className="text-xs font-display font-black text-indigo-950 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            🏆 TROPHY CABINET (UNLOCKED BADGES)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className={`cartoon-card p-4 border-3 text-left flex items-start gap-3 transition-opacity rounded-3xl ${
                  ach.unlocked 
                    ? "bg-white border-indigo-950 shadow-[3px_3px_0px_0px_#1E1B4B]" 
                    : "bg-gray-100/60 border-indigo-950/20 opacity-55"
                }`}
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl border-3 border-indigo-950 shadow-[2px_2px_0px_0px_rgba(30,27,75,1)] ${ach.unlocked ? "bg-yellow-200" : "bg-gray-200"}`}>
                  {ach.icon}
                </div>
                <div>
                  <h5 className="font-display font-black text-sm text-indigo-955 leading-tight">
                    {ach.title}
                  </h5>
                  <p className="text-xs font-sans font-bold text-gray-500 leading-normal mt-0.5">
                    {ach.desc}
                  </p>
                  <p className={`text-[9px] font-display font-black tracking-widest uppercase mt-1.5 ${ach.unlocked ? "text-emerald-600" : "text-gray-400"}`}>
                    {ach.unlocked ? "✨ UNLOCKED" : "🔒 LOCKED"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Activity Log */}
        <div>
          <h4 className="text-xs font-display font-black text-indigo-955 uppercase tracking-widest mb-1.5">
            📋 DAILY CHRONICLES:
          </h4>
          <div className="cartoon-card bg-white p-3 max-h-[140px] overflow-y-auto border-3 border-indigo-950 rounded-xl text-xs space-y-2 pr-1 scrollbar shadow-[3px_3px_0px_0px_#1E1B4B]">
            {history.length === 0 ? (
              <p className="text-center font-sans italic text-gray-400 py-4">No recent history events yet. Study to log some!</p>
            ) : (
              history.map((h) => (
                <div key={h.id} className="flex justify-between items-center py-2 border-b border-indigo-950/10 last:border-b-0">
                  <div className="text-left">
                    <p className="font-display font-bold text-indigo-950">{h.title}</p>
                    <span className="text-[9px] font-mono text-gray-400">{h.timestamp}</span>
                  </div>
                  <span className="font-display font-black text-green-500 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full text-[10px]">
                    +{h.xp} XP
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
