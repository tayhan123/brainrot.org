import { Award, Flame, Zap, Trophy, Timer, CheckSquare, Target, Sparkles, Star } from "lucide-react";
import { UserStats } from "../types";

interface ProgressTrackerProps {
  stats: UserStats;
  notesCount: number;
}

export default function ProgressTracker({ stats, notesCount }: ProgressTrackerProps) {
  // Experience leveling math
  const xpNeededForNextLevel = 100;
  const xpInCurrentLevel = stats.xp % xpNeededForNextLevel;
  const levelProgressPercent = Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100);

  // Level themed ranks
  const getRankName = (lvl: number) => {
    if (lvl <= 1) return "Baby Skibidi 🍼";
    if (lvl === 2) return "Mewing Novice 🤫";
    if (lvl === 3) return "Focused Rizzler ⚡";
    if (lvl === 4) return "Organic Chem Sigma 🦖";
    return "Brainrot Academic Overlord 🧠👑";
  };

  // Badges lists to trigger based on actions
  const BADGES = [
    {
      id: "first-note",
      title: "Memo Maker",
      desc: "Save custom study sticky note",
      unlocked: notesCount > 0,
      icon: "✍️",
      color: "bg-emerald-100 border-emerald-400 text-emerald-800",
    },
    {
      id: "streak-1",
      title: "Active Locks",
      desc: "Maintain a study streak (> 0 active days)",
      unlocked: stats.streak > 0,
      icon: "🔥",
      color: "bg-orange-100 border-orange-400 text-orange-850",
    },
    {
      id: "focus-expert",
      title: "Pomodoro Giant",
      desc: "Hit 25 mins of fully focused lock-in",
      unlocked: stats.totalFocusMinutes >= 25,
      icon: "🍅",
      color: "bg-rose-100 border-rose-450 text-rose-800",
    },
    {
      id: "quiz-hero",
      title: "Quiz Academic",
      desc: "Resolve at least one interactive game quiz",
      unlocked: stats.totalQuizzesTaken > 0,
      icon: "👑",
      color: "bg-yellow-105 border-yellow-400 text-yellow-900",
    },
    {
      id: "level-expert",
      title: "Supreme Sigma",
      desc: "Climb past level 2 in study expertise",
      unlocked: stats.level >= 2,
      icon: "🐺",
      color: "bg-purple-100 border-purple-400 text-purple-800",
    },
    {
      id: "superstar-xp",
      title: "Infinity XP",
      desc: "Reach over 300 total experience points",
      unlocked: stats.xp >= 300,
      icon: "⭐",
      color: "bg-pink-101 border-pink-400 text-pink-800",
    },
  ];

  const unlockedCount = BADGES.filter((b) => b.unlocked).length;

  return (
    <div className="max-w-3xl mx-auto py-2">
      <div className="cartoon-card p-6 md:p-8 bg-[#fbfbfb]">
        
        {/* Progression Avatar Block */}
        <div className="cartoon-card p-5 bg-gradient-to-r from-purple-100 to-indigo-100 mb-8 border-indigo-950 flex flex-col md:flex-row items-center gap-6 shadow-[4px_4px_0px_0px_#1E1B4B]">
          <div className="relative">
            <div className="w-20 h-20 bg-yellow-300 border-4 border-indigo-950 rounded-full flex items-center justify-center text-4xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-bounce">
              {stats.level >= 3 ? "👾" : "👶"}
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-1.5 justify-center md:justify-start">
              <span className="text-xs uppercase font-display font-black text-purple-700 bg-purple-200 border border-purple-400 px-2 py-0.5 rounded-md w-max mx-auto md:mx-0">
                Lvl: {stats.level}
              </span>
              <h3 className="font-display font-black text-2xl text-indigo-950">{getRankName(stats.level)}</h3>
            </div>
            
            <p className="text-xs text-indigo-950/70 font-semibold mt-1">
              Currently accumulated over {stats.xp} Total XP pts. Streak boosts are active!
            </p>

            {/* Level Slider bar */}
            <div className="mt-4">
              <div className="flex justify-between items-center text-xs font-display font-bold text-indigo-950 mb-1">
                <span>Rank progression progress</span>
                <span>{xpInCurrentLevel} / {xpNeededForNextLevel} XP</span>
              </div>
              <div className="w-full h-5 bg-white border-2 border-indigo-950 rounded-full p-0.5 overflow-hidden shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                <div
                  className="h-full bg-yellow-300 border-r-2 border-indigo-950 rounded-full duration-500 transition-all"
                  style={{ width: `${levelProgressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Multi Stat box cells */}
        <h3 className="font-display font-black text-indigo-950 text-xl mb-4">📊 Brainrot Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="cartoon-card p-4 bg-rose-50 text-center border-indigo-950">
            <Timer className="w-7 h-7 mx-auto text-rose-500 mb-1" />
            <h4 className="font-display font-black text-2xl text-indigo-950">{stats.totalFocusMinutes}m</h4>
            <p className="text-[10px] uppercase font-bold text-gray-500">Focus Minutes</p>
          </div>

          <div className="cartoon-card p-4 bg-orange-50 text-center border-indigo-950">
            <Flame className="w-7 h-7 mx-auto text-orange-500 mb-1 fill-orange-100" />
            <h4 className="font-display font-black text-2xl text-indigo-950">{stats.streak} day</h4>
            <p className="text-[10px] uppercase font-bold text-gray-500">Study Streak</p>
          </div>

          <div className="cartoon-card p-4 bg-emerald-50 text-center border-indigo-950">
            <Trophy className="w-7 h-7 mx-auto text-emerald-500 mb-1" />
            <h4 className="font-display font-black text-2xl text-indigo-950">{stats.totalQuizzesTaken}</h4>
            <p className="text-[10px] uppercase font-bold text-gray-500">Quizzes Faced</p>
          </div>

          <div className="cartoon-card p-4 bg-sky-50 text-center border-indigo-950">
            <Star className="w-7 h-7 mx-auto text-sky-500 mb-1 fill-sky-100" />
            <h4 className="font-display font-black text-2xl text-indigo-950">{notesCount} Note</h4>
            <p className="text-[10px] uppercase font-bold text-gray-500">Saved Memos</p>
          </div>
        </div>

        {/* Gamified study Badges unlocks */}
        <div className="border-t-3 border-dashed border-indigo-950 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-black text-indigo-950 text-xl">🏆 Gaming Merit Badges</h3>
            <span className="text-xs font-display font-black bg-emerald-100 border-2 border-emerald-400 text-emerald-850 px-2.5 py-1 rounded-full uppercase">
              {unlockedCount} / {BADGES.length} Unlocked
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BADGES.map((b) => (
              <div
                key={b.id}
                className={`cartoon-card p-4.5 flex items-center gap-3 border-3 transition-opacity duration-300 ${
                  b.unlocked
                    ? `${b.color} shadow-[3px_3px_0px_0px_#1E1B4B]`
                    : "bg-gray-150 border-gray-300 text-gray-400 grayscale bg-opacity-40"
                }`}
              >
                <div className="text-3xl bg-white/70 w-12 h-12 rounded-xl flex items-center justify-center border-2 border-indigo-950">
                  {b.icon}
                </div>
                <div>
                  <h4 className="font-display font-black text-sm text-indigo-950 leading-tight">
                    {b.title} {b.unlocked ? "✔️" : "🔒"}
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
