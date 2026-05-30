import React, { useState, useEffect } from "react";
import { Sparkles, Trophy, Flame, User, Key, ArrowRight, UserPlus, Trash2, Shield, Info, Lock } from "lucide-react";
import StudyAvatar, { AvatarType } from "./StudyAvatar";
import { auth, googleProvider, signInWithPopup, getRemoteUserProfile, saveRemoteUserProfile, UserProfileData } from "../firebase";

interface ProfileItem {
  username: string;
  avatar: AvatarType;
  pin?: string;
  xp: number;
  level: number;
  streak: number;
}

interface LoginViewProps {
  onLoginSuccess: (
    username: string,
    avatar: AvatarType,
    googleUser?: { uid: string; email: string }
  ) => void;
  playSound: (type: "bloop" | "success" | "fail" | "pop" | "levelUp") => void;
}

export default function LoginView({ onLoginSuccess, playSound }: LoginViewProps) {
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [usernameInput, setUsernameInput] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarType>("student");
  const [pinInput, setPinInput] = useState("");
  const [setupPin, setSetupPin] = useState(false);
  const [userPinReg, setUserPinReg] = useState("");
  
  // Checking PIN for existing account
  const [verifyingProfile, setVerifyingProfile] = useState<ProfileItem | null>(null);
  const [unlockPin, setUnlockPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const isInIframe = typeof window !== "undefined" && window.self !== window.top;

  const handleGoogleLogin = async () => {
    playSound("bloop");
    setIsGoogleLoading(true);
    
    // Safety timeout because in sandboxed iframes, signInWithPopup may hang indefinitely
    const timeoutId = setTimeout(() => {
      setIsGoogleLoading(false);
      alert(
        "⏳ Google Authentication is taking a long time.\n\n" +
        "This is extremely common because browsers strictly block popup windows and third-party auth cookies " +
        "when applications are loaded inside a sandboxed preview iframe.\n\n" +
        "💡 QUICK REMEDY:\n" +
        "1. Click the 'Open in a new tab' button at the top-right corner of your browser preview.\n" +
        "2. Complete Google Sign-In in the opened full tab.\n" +
        "3. Alternatively, click 'Create Guest Profile' below to start studying offline instantly!"
      );
    }, 8500);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      clearTimeout(timeoutId);
      const user = result.user;
      
      const email = user.email || "";
      const displayName = user.displayName || email.split("@")[0] || "Scholar";
      
      // Check if user has remote profile on Firestore
      let remoteUser = await getRemoteUserProfile(user.uid);
      
      let finalAvatar: AvatarType = "robot"; // Cute cartoon default for Google signups!
      let finalName = displayName;
      
      if (remoteUser) {
        finalAvatar = remoteUser.avatar as AvatarType;
        finalName = remoteUser.username;
      } else {
        // Construct and save a high-quality initial profile document
        const newUserProfile: UserProfileData = {
          uid: user.uid,
          username: displayName,
          avatar: "robot",
          xp: 0,
          level: 1,
          streak: 1,
          totalFocusMinutes: 0,
          completedPomodoros: 0,
          totalQuizzesTaken: 0,
          lastActiveDate: new Date().toISOString().split("T")[0]
        };
        await saveRemoteUserProfile(user.uid, newUserProfile);
      }
      
      playSound("levelUp");
      onLoginSuccess(finalName, finalAvatar, { uid: user.uid, email });
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("Google Auth error:", err);
      playSound("fail");
      const errMsg = err?.message || String(err);
      if (errMsg.includes("iframe") || errMsg.includes("popup") || errMsg.includes("cancelled") || errMsg.includes("closed") || errMsg.includes("storage")) {
        alert(
          "Could not complete Google Sign-In automatically inside the embedded preview iframe.\n\n" +
          "💡 PRO TIP: Browsers frequently restrict cookies or popups when apps are nested in active sandboxed iframes. " +
          "To authenticate correctly:\n" +
          "1. Click the 'Open in a new tab' button at the top-right corner of the browser preview.\n" +
          "2. Complete Google Authentication in the opened full tab.\n" +
          "3. All your notes, XP, levels and streak histories will sync instantly!"
        );
      } else {
        alert(
          `Google Sign-In Error: ${errMsg}\n\n` +
          "Please verify that your browser allows cookies and popups for this site, or try launching the app in a separate browser tab!"
        );
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Load existing profiles from localStorage
  useEffect(() => {
    const cached = localStorage.getItem("gizmoplanet_profiles");
    if (cached) {
      try {
        setProfiles(JSON.parse(cached));
      } catch (e) {
        // Fallback or ignore
      }
    } else {
      // Seed with standard Aryan account to maintain legacy screenshot stats
      const legacyStats = localStorage.getItem("brainrot_stats");
      let initialXp = 650;
      let initialLevel = 1;
      let initialStreak = 7;
      if (legacyStats) {
        try {
          const parsed = JSON.parse(legacyStats);
          initialXp = parsed.xp ?? 650;
          initialLevel = parsed.level ?? 1;
          initialStreak = parsed.streak ?? 7;
        } catch {}
      }
      const initialProfile: ProfileItem = {
        username: "Aryan",
        avatar: "student",
        pin: "", // no PIN initially
        xp: initialXp,
        level: initialLevel,
        streak: initialStreak
      };
      setProfiles([initialProfile]);
      localStorage.setItem("gizmoplanet_profiles", JSON.stringify([initialProfile]));
    }
  }, []);

  // Quick action profiles save helper
  const saveProfiles = (newProfiles: ProfileItem[]) => {
    setProfiles(newProfiles);
    localStorage.setItem("gizmoplanet_profiles", JSON.stringify(newProfiles));
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = usernameInput.trim();
    if (!cleanName) return;

    // Check if profile username already exists
    const duplicate = profiles.find(p => p.username.toLowerCase() === cleanName.toLowerCase());
    if (duplicate) {
      playSound("fail");
      alert(`The username "${cleanName}" already exists! Select it from the cards or pick another moniker.`);
      return;
    }

    const newProfile: ProfileItem = {
      username: cleanName,
      avatar: selectedAvatar,
      pin: setupPin ? userPinReg.trim() : "",
      xp: 0,
      level: 1,
      streak: 1
    };

    const updated = [...profiles, newProfile];
    saveProfiles(updated);
    playSound("levelUp");
    
    // Auto login
    onLoginSuccess(newProfile.username, newProfile.avatar);
  };

  const handleSelectProfileCard = (profile: ProfileItem) => {
    playSound("bloop");
    if (profile.pin) {
      // Must unlock PIN
      setVerifyingProfile(profile);
      setUnlockPin("");
      setPinError(false);
    } else {
      // Free log in
      playSound("success");
      onLoginSuccess(profile.username, profile.avatar);
    }
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingProfile) return;

    if (verifyingProfile.pin === unlockPin) {
      playSound("success");
      onLoginSuccess(verifyingProfile.username, verifyingProfile.avatar);
    } else {
      playSound("fail");
      setPinError(true);
      setTimeout(() => setPinError(false), 600);
      setUnlockPin("");
    }
  };

  const handleDeleteProfile = (e: React.MouseEvent, username: string) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to permanently delete user "${username}"? All Focus records, XP, and history stats of this profile will be gone forever.`)) {
      const filtered = profiles.filter(p => p.username !== username);
      saveProfiles(filtered);
      playSound("fail");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4 selection:bg-[#7D69EC]/30">
      {/* Decorative Grid Pattern Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-15 pointer-events-none" />

      {/* Main Container Layout */}
      <div className="w-full max-w-2xl text-center relative z-10 py-8">
        
        {/* Animated Brand Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-18 h-18 bg-white rounded-3xl flex items-center justify-center border-4 border-indigo-950 shadow-[4px_4px_0px_0px_#1E1B4B] transform hover:rotate-12 transition-transform animate-float duration-3000">
            <svg viewBox="0 0 100 100" className="w-14 h-14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="15" y="25" width="70" height="55" rx="25" fill="#7D69EC" stroke="#1E1B4B" strokeWidth="4" />
              <rect x="22" y="32" width="56" height="41" rx="16" fill="white" stroke="#1E1B4B" strokeWidth="4" />
              <circle cx="38" cy="50" r="8" fill="#1E1B4B" />
              <circle cx="62" cy="50" r="8" fill="#1E1B4B" />
              <circle cx="36" cy="48" r="2.5" fill="white" />
              <circle cx="60" cy="48" r="2.5" fill="white" />
              <path d="M 44 60 Q 50 65 56 60" stroke="#1E1B4B" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <line x1="50" y1="25" x2="50" y2="12" stroke="#1E1B4B" strokeWidth="4" />
              <circle cx="50" cy="10" r="6" fill="#FFD6A5" stroke="#1E1B4B" strokeWidth="3.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-[#1E1B4B] tracking-tight leading-none drop-shadow-sm flex items-center gap-2 justify-center">
              Gizmo <span className="text-[#7D69EC]">Cognitive Lab</span>
            </h1>
            <p className="text-xs md:text-sm font-display font-bold text-[#7D69EC] uppercase tracking-wider mt-2 bg-purple-50 border border-[#7D69EC]/10 px-3.5 py-1 rounded-full inline-block">
              ⚡ GAMIFIED STUDY LOCK-IN NETWORK ⚡
            </p>
          </div>
        </div>

        {/* Dynamic Verification Modals / Interface */}
        {verifyingProfile ? (
          /* Profile PIN Unlock Dialog Card */
          <div className={`cartoon-card max-w-md mx-auto p-6 text-left relative bg-white ${pinError ? "animate-wiggle border-rose-500" : ""}`}>
            <h3 className="font-display font-black text-2xl text-indigo-950 flex items-center gap-2">
              <Lock className="w-6 h-6 text-rose-500" /> Unlock focus vault!
            </h3>
            <p className="text-xs font-semibold text-gray-500 mt-1 leading-relaxed">
              Profile <b className="text-[#1E1B4B]">{verifyingProfile.username}</b> is secured with a focus passcode to protect stats.
            </p>

            <form onSubmit={handleUnlockSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-[10px] font-display font-black text-[#5C509C] uppercase tracking-widest block mb-1.5">
                  ENTER 4-DIGIT PIN:
                </label>
                <input
                  type="password"
                  placeholder="••••"
                  maxLength={4}
                  value={unlockPin}
                  onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, ""))}
                  required
                  autoFocus
                  className="cartoon-input w-full text-center py-3 text-2xl font-mono font-bold tracking-[0.5rem] border-3 text-indigo-950"
                />
              </div>

              {pinError && (
                <p className="text-xs font-display font-black text-rose-600 text-center uppercase tracking-wide">
                  ⚠️ SKILL ISSUE! INCORRECT PIN CODE. RETRY!
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playSound("pop");
                    setVerifyingProfile(null);
                  }}
                  className="cartoon-btn px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-indigo-950 font-display font-black text-sm flex-1 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cartoon-btn px-4 py-2.5 bg-[#7D69EC] hover:bg-[#6550DF] text-white font-display font-black text-sm flex-1 cursor-pointer shadow-[3px_3px_0px_0px_#1E1B4B]"
                >
                  Unlock & Log In
                </button>
              </div>
            </form>
          </div>
        ) : isRegistering ? (
          /* Custom Account Register Card Form */
          <div className="cartoon-card max-w-lg mx-auto p-6 md:p-8 text-left bg-white">
            <div className="flex justify-between items-center pb-3 border-b-2 border-slate-100 mb-5">
              <h3 className="font-display font-black text-2xl text-indigo-950 flex items-center gap-1.5">
                <UserPlus className="w-6 h-6 text-[#7D69EC]" /> Setup Study Persona
              </h3>
              <button
                onClick={() => {
                  playSound("pop");
                  setIsRegistering(false);
                }}
                className="text-xs font-display font-bold text-gray-400 hover:text-indigo-950 cursor-pointer"
              >
                Go Back
              </button>
            </div>

            <form onSubmit={handleCreateProfile} className="space-y-4">
              {/* Username text */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-display font-black text-indigo-950 uppercase tracking-widest block">
                  CHOOSE MONIKER / USERNAME:
                </label>
                <input
                  type="text"
                  placeholder="e.g. ChemPro, SigmaGrind, Aryan"
                  maxLength={16}
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  required
                  className="cartoon-input w-full px-4 py-3 text-sm font-semibold text-indigo-950 border-3"
                />
              </div>

              {/* Avatar Selector Grid */}
              <div className="space-y-2">
                <label className="text-[10px] font-display font-black text-indigo-950 uppercase tracking-widest block">
                  SELECT COMPANION AVATAR:
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {(["student", "robot", "owl", "cat"] as AvatarType[]).map((type) => {
                    const isSelected = selectedAvatar === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          playSound("pop");
                          setSelectedAvatar(type);
                        }}
                        className={`cartoon-btn p-2 flex flex-col items-center justify-center transition-all bg-white relative capitalize cursor-pointer rounded-2xl ${
                          isSelected 
                            ? "bg-[#DFECFF] border-[#7D69EC] scale-[1.05] shadow-[3px_3px_0px_0px_#1E1B4B]" 
                            : "hover:bg-slate-50 border-slate-350 opacity-80"
                        }`}
                      >
                        <StudyAvatar type={type} className="w-12 h-12" />
                        <span className="text-[9px] font-display font-black text-indigo-950 mt-1.5">
                          {type}
                        </span>
                        {isSelected && (
                          <span className="absolute -top-1.5 -right-1 bg-[#7D69EC] text-white rounded-full w-4.5 h-4.5 text-[8px] flex items-center justify-center border border-indigo-950 font-black">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PIN code setup section */}
              <div className="p-4 bg-purple-50/50 rounded-2xl border-2 border-[#7D69EC]/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-[#7D69EC]" />
                    <span className="text-xs font-display font-black text-indigo-955 uppercase tracking-wide">
                      Secure this vault with a PIN?
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    id="setup_pin"
                    checked={setupPin}
                    onChange={(e) => {
                      playSound("pop");
                      setSetupPin(e.target.checked);
                      if (!e.target.checked) setUserPinReg("");
                    }}
                    className="w-4 h-4 text-[#7D69EC] border-indigo-950 rounded focus:ring-purple-600"
                  />
                </div>

                {setupPin && (
                  <div className="space-y-1 pt-1.5 animate-float duration-4000">
                    <p className="text-[9px] font-medium text-gray-500">
                      Creates dynamic focal safety! Set a solid 4-digit PIN lock passcode.
                    </p>
                    <input
                      type="password"
                      placeholder="e.g. 1234"
                      maxLength={4}
                      value={userPinReg}
                      onChange={(e) => setUserPinReg(e.target.value.replace(/\D/g, ""))}
                      required={setupPin}
                      className="cartoon-input text-center font-mono py-2 text-lg font-bold w-full border-2.5 max-w-[140px] block"
                    />
                  </div>
                )}
              </div>

              {/* Submit and CTA code button */}
              <button
                type="submit"
                className="cartoon-btn w-full py-3.5 bg-[#7D69EC] hover:bg-[#6853DF] text-white font-display font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer shadow-[4px_4px_0px_0px_#1E1B4B]"
              >
                <span>Deploy Brain Network</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          /* Profile Selection Grid (Consolish style) */
          <div className="space-y-6">
            {/* Google Authentication Integration Panel */}
            <div className="bg-[#FAF9FF] border-3 border-indigo-950 p-5 rounded-3xl shadow-[4px_4px_0px_0px_#1E1B4B] flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌌</span>
                <p className="text-xs font-display font-black text-indigo-955 tracking-wide">
                  SECURE GOOGLE CLOUD SYNCHRONIZATION:
                </p>
              </div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="cartoon-btn w-full py-3.5 bg-white hover:bg-slate-50 text-indigo-950 font-display font-black text-xs md:text-sm flex items-center justify-center gap-3 cursor-pointer shadow-[3px_3px_0px_0px_#1E1B4B] border-3 border-indigo-950"
              >
                {isGoogleLoading ? (
                  <span className="animate-spin text-lg">⏳</span>
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                  </svg>
                )}
                <span>{isGoogleLoading ? "VERIFYING CREDENTIALS..." : "PROCEED WITH GOOGLE ACCOUNT"}</span>
              </button>

              {isInIframe && (
                <div className="bg-[#FFFCF0] border-2 border-amber-300 text-amber-955 rounded-2xl p-3 text-[10px] sm:text-xs font-sans font-bold leading-normal text-left w-full">
                  ⚠️ <strong>Embedded Sandbox Active:</strong> Some browsers restrict Google popup auth inside standard embedded iframes. If this button hangs, click <strong>&quot;Open in a new tab&quot;</strong> ↗️ at the top-right corner to authenticate instantly and sync your data!
                </div>
              )}

              <p className="text-[10px] font-sans text-gray-400 text-center leading-normal">
                Authenticates safely using official Google Identity. Automatically backs up notes, timeline progress history, and study levels to Cloud Firestore!
              </p>
            </div>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-0.5 bg-indigo-950/10"></div>
              <span className="text-[9px] font-display font-black text-indigo-950/45 uppercase tracking-widest flex-shrink-0">OR GUEST PLAY LOCALLY</span>
              <div className="flex-1 h-0.5 bg-indigo-950/10"></div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <h2 className="text-lg font-display font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2">
                👥 Local Study Profiles:
              </h2>
              <button
                onClick={() => {
                  playSound("pop");
                  setUsernameInput("");
                  setSelectedAvatar("student");
                  setSetupPin(false);
                  setIsRegistering(true);
                }}
                className="cartoon-btn px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-[#7D69EC] font-display font-black text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Guest Profile</span>
              </button>
            </div>

            {/* List cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profiles.map((profile) => (
                <div
                  key={profile.username}
                  onClick={() => handleSelectProfileCard(profile)}
                  className="cartoon-card p-4.5 bg-white border-3 border-indigo-950 rounded-2xl flex items-center justify-between text-left cursor-pointer relative group transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-13 h-13 rounded-2xl bg-slate-50 border-2.5 border-indigo-950 shadow-[2px_2px_0px_0px_#1E1B4B] flex items-center justify-center flex-shrink-0 relative">
                      <StudyAvatar type={profile.avatar} className="w-11 h-11" />
                      {profile.pin && (
                        <span className="absolute -bottom-1 -right-1 bg-rose-500 border border-indigo-950 text-white rounded-full p-0.5 text-[8px]" title="Secured Profile">
                          🔒
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-display font-black text-[#1E1B4B] text-base leading-none mb-1.5 truncate group-hover:text-[#5E4CD4] transition-colors">
                        {profile.username}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 font-display font-bold">
                        <span className="flex items-center gap-0.5 text-amber-500">
                          <Trophy className="w-3 h-3 fill-amber-500" />
                          <span>Lvl {profile.level}</span>
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="flex items-center gap-0.5 text-orange-500">
                          <Flame className="w-3 h-3 fill-orange-500" />
                          <span>{profile.streak} Days</span>
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-indigo-950/50">{profile.xp} XP</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleDeleteProfile(e, profile.username)}
                      className="p-1 px-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-100"
                      title="Delete profile record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ArrowRight className="w-4 h-4 text-[#7D69EC] group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}

              {profiles.length === 0 && (
                <div className="col-span-2 text-center p-8 bg-slate-50 border-3 border-dashed border-indigo-200 rounded-3xl">
                  <Info className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                  <p className="font-sans font-semibold text-gray-400 text-sm">
                    No active study profiles detected on this computer.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Click the "Create New Account" button above to spin up a profile!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Footnotes system metadata details */}
        <p className="text-[10px] font-mono font-medium text-indigo-950/40 text-center mt-12 bg-white/70 backdrop-blur-xs border border-indigo-950/5 px-4 py-2.5 rounded-full inline-block">
          🛡️ Sandbox Local Encryption active. Port: 3000 | State: Syncing Client Storage
        </p>
      </div>
    </div>
  );
}
