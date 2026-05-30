import React, { useState } from "react";
import { 
  Settings, 
  User, 
  Trash2, 
  LogOut, 
  Flame, 
  Sparkles, 
  Check, 
  AlertCircle 
} from "lucide-react";
import StudyAvatar, { AvatarType } from "./StudyAvatar";
import { UserStats } from "../types";

interface SettingsViewProps {
  userName: string;
  userAvatar: AvatarType;
  stats: UserStats;
  dailyXpTarget: number;
  setDailyXpTarget: (target: number) => void;
  onUpdateProfile: (name: string, avatar: AvatarType) => void;
  onLogout: () => void;
  onClearStats: () => void;
  playSound: (type: "bloop" | "success" | "fail" | "pop" | "levelUp") => void;
  addXp: (amount: number, reason: string) => void;
}

export default function SettingsView({
  userName,
  userAvatar,
  stats,
  dailyXpTarget,
  setDailyXpTarget,
  onUpdateProfile,
  onLogout,
  onClearStats,
  playSound,
  addXp
}: SettingsViewProps) {
  const [nameInput, setNameInput] = useState(userName);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarType>(userAvatar);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim();
    if (cleanName) {
      playSound("success");
      onUpdateProfile(cleanName, selectedAvatar);
      setSaveSuccess(true);
      addXp(10, "Updated look in parameters! 🎨");
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      playSound("fail");
    }
  };

  const handleClearTrigger = () => {
    playSound("fail");
    onClearStats();
    setShowClearConfirm(false);
  };

  return (
    <div className="w-full h-full flex flex-col gap-5 overflow-y-auto pr-1">
      {/* Settings Title Banner */}
      <div className="relative bg-gradient-to-r from-slate-100 to-indigo-50 rounded-3xl p-5 border-2 border-indigo-950 shadow-[4px_4px_0px_0px_rgba(30,27,75,1)] flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-display font-black text-indigo-950 flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#7D69EC]" />
            Gizmo Control Room
          </h2>
          <p className="text-xs font-sans font-semibold text-gray-500 mt-0.5">
            Refit your rocket, switch avatars, adjust targets, or manage session parameters.
          </p>
        </div>
        <span className="text-2xl hidden sm:inline">⚙️</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Profile Card Refitting Form */}
        <div className="bg-white rounded-3xl border-2 border-indigo-950 shadow-[4px_4px_0px_0px_rgba(30,27,75,1)] p-5">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-indigo-950/10">
            <User className="w-5 h-5 text-indigo-600" />
            <h3 className="font-display font-black text-indigo-950 text-base">User Character Identity</h3>
          </div>

          <form onSubmit={handleSubmitProfile} className="space-y-4">
            {/* Input name */}
            <div className="space-y-1">
              <label className="text-[10px] font-display font-black text-[#5C509C] uppercase tracking-wider block">
                Edit Moniker:
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={16}
                required
                className="cartoon-input w-full px-4 py-2.5 text-xs font-bold text-indigo-950 border-3 border-indigo-950"
                placeholder="Alter student identity..."
              />
            </div>

            {/* Avatar chooser */}
            <div className="space-y-2">
              <label className="text-[10px] font-display font-black text-[#5C509C] uppercase tracking-wider block">
                Mascot Mascot Buddy:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["student", "robot", "owl", "cat"] as AvatarType[]).map((type) => {
                  const isSelected = selectedAvatar === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { playSound("pop"); setSelectedAvatar(type); }}
                      className={`cartoon-btn p-2 flex flex-col items-center justify-center transition-all bg-white relative capitalize cursor-pointer rounded-xl ${
                        isSelected 
                          ? "bg-[#DFECFF] border-[#7D69EC] scale-[1.03]" 
                          : "hover:bg-slate-50 border-slate-350 opacity-85"
                      }`}
                    >
                      <StudyAvatar type={type} className="w-10 h-10" />
                      <span className="text-[8px] font-display font-black text-indigo-955 mt-1">
                        {type}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="cartoon-btn w-full bg-[#7D69EC] hover:bg-[#6853DF] text-white font-display font-black text-xs py-2.5 cursor-pointer shadow-[2px_2px_0px_0px_rgba(30,27,75,1)] flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Save Moniker Changes ✓
            </button>

            {saveSuccess && (
              <p className="text-center text-xs font-display font-black text-emerald-600 bg-emerald-50 py-1.5 rounded-xl border border-dashed border-emerald-400">
                🚀 Parameters updated successfully!
              </p>
            )}
          </form>
        </div>

        {/* Study Goals Deck (Moved from Dashboard!) */}
        <div className="bg-white rounded-3xl border-2 border-indigo-950 shadow-[4px_4px_0px_0px_rgba(30,27,75,1)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-indigo-950/10">
              <Flame className="w-5 h-5 text-amber-500" />
              <h3 className="font-display font-black text-indigo-950 text-base">Study Target Goals</h3>
            </div>

            <p className="text-xs font-sans text-gray-500 mb-4 leading-relaxed">
              Dynamically recalibrate progress meters and level calculators on your Dashboard. Set higher aims to unlock special badges!
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-display font-black text-[#5C509C] uppercase tracking-wider block">
                    DAILY TARGET GOAL:
                  </label>
                  <span className="text-xs font-display font-black text-indigo-950 bg-amber-100 px-2 py-0.5 rounded">
                    {dailyXpTarget} XP / DAY
                  </span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="1500"
                  step="100"
                  value={dailyXpTarget}
                  onChange={(e) => {
                    playSound("pop");
                    setDailyXpTarget(Number(e.target.value));
                  }}
                  className="w-full accent-[#7D69EC] h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer border border-indigo-950/25"
                />
                <div className="flex justify-between text-[9px] text-gray-400 font-mono">
                  <span>200 XP (Casual)</span>
                  <span>1500 XP (Sigma Lock-in)</span>
                </div>
              </div>

              {/* Progress visual representation in Settings */}
              <div className="p-3 bg-amber-50/50 border-2 border-dashed border-amber-400 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-display font-black text-[#E08F35] block leading-none">ACTIVE XP STATUS:</span>
                  <p className="text-xs font-sans font-bold text-indigo-950 mt-1">
                    Your current score is {stats.xp} XP total.
                  </p>
                </div>
                <div className="w-11 h-11 rounded-full border-2 border-indigo-950 bg-white flex items-center justify-center font-display font-black text-indigo-950 text-xs shadow-[2px_2px_0px_rgba(30,27,75,1)]">
                  {Math.min(100, Math.round((stats.xp / dailyXpTarget) * 100))}%
                </div>
              </div>
            </div>
          </div>

          <p className="text-[10px] font-sans font-semibold text-gray-400 text-center mt-4">
            Gizmo remembers these on this workspace cookie deck automatically.
          </p>
        </div>

      </div>

      {/* Danger Zone Controls */}
      <div className="bg-rose-50/20 border-2 border-dashed border-rose-350 rounded-3xl p-5 mt-2">
        <h4 className="font-display font-black text-rose-700 text-sm mb-1 flex items-center gap-1">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          Terminal Danger Area
        </h4>
        <p className="text-[11px] font-sans text-gray-500 mb-4">
          Actions here are destructive or clear saved sessions. Please utilize with high alert values.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Logout Trigger button */}
          <button
            onClick={() => {
              playSound("fail");
              onLogout();
            }}
            className="cartoon-btn flex-1 bg-white hover:bg-rose-50 text-rose-600 border-rose-600 shadow-[2px_2px_0px_rgba(225,29,72,1)] py-2.5 font-display font-black text-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" /> End Current Student Session
          </button>

          {/* Reset Progress Trigger button */}
          {!showClearConfirm ? (
            <button
              onClick={() => { playSound("pop"); setShowClearConfirm(true); }}
              className="cartoon-btn flex-1 bg-rose-600 hover:bg-rose-700 text-white border-indigo-950 shadow-[2px_2px_0px_rgba(30,27,75,1)] py-2.5 font-display font-black text-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Wipe Entire Study Ledger Data
            </button>
          ) : (
            <div className="flex-1 flex gap-2">
              <button
                onClick={handleClearTrigger}
                className="cartoon-btn flex-1 bg-rose-700 text-white border-black font-display font-black text-[10px] uppercase py-2 cursor-pointer animate-pulse"
              >
                Yes, Wipe EVERYTHING!
              </button>
              <button
                onClick={() => { playSound("bloop"); setShowClearConfirm(false); }}
                className="cartoon-btn flex-1 bg-white hover:bg-gray-100 text-indigo-950 border-indigo-950 font-display font-black text-[10px] py-2 cursor-pointer"
              >
                Abort Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
