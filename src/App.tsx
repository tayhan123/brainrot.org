import React, { useState, useEffect } from "react";
import {
  Trophy,
  Flame,
  MessageSquare,
  Sparkles,
  BookOpen,
  FileText,
  Clock,
  Plus,
  ArrowRight,
  Pin,
  Check,
  ChevronRight,
  Share2,
  Trash2,
  Settings,
  X,
  Play,
  Pause,
  RotateCcw
} from "lucide-react";

import { AppTab, UserStats, Note, QuizHistoryItem } from "./types";
import Pomodoro from "./components/Pomodoro";
import AIStudyBuddy, { CuteRobotAvatar } from "./components/AIStudyBuddy";
import QuizView from "./components/QuizView";
import Summarizer from "./components/Summarizer";
import NotesView from "./components/NotesView";
import ProgressView from "./components/ProgressView";
import StudyAvatar, { AvatarType } from "./components/StudyAvatar";
import LoginView from "./components/LoginView";
import DashboardView from "./components/DashboardView";
import SettingsView from "./components/SettingsView";
import { onAuthStateChanged } from "firebase/auth";
import { 
  getRemoteUserProfile, 
  saveRemoteUserProfile, 
  getRemoteNotes, 
  saveRemoteNote, 
  deleteRemoteNote, 
  getRemoteHistory, 
  saveRemoteHistoryItem, 
  signOut, 
  auth 
} from "./firebase";

interface ProfileItem {
  username: string;
  avatar: AvatarType;
  pin?: string;
  xp: number;
  level: number;
  streak: number;
}

export default function App() {
  const [googleUser, setGoogleUser] = useState<{ uid: string; email: string } | null>(() => {
    const cachedUid = localStorage.getItem("brainrot_google_user_uid");
    const cachedEmail = localStorage.getItem("brainrot_google_user_email");
    if (cachedUid && cachedEmail) {
      return { uid: cachedUid, email: cachedEmail };
    }
    return null;
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("brainrot_is_logged_in") === "true";
  });

  const [userAvatar, setUserAvatar] = useState<AvatarType>(() => {
    return (localStorage.getItem("brainrot_avatar") as AvatarType) || "student";
  });

  const [tempAvatar, setTempAvatar] = useState<AvatarType>("student");

  const [currentTab, setCurrentTab] = useState<AppTab>("dashboard");
  
  // Custom user name state (default "Aryan" from screenshot)
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("brainrot_username") || "Aryan";
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  // Stats State
  const [stats, setStats] = useState<UserStats>(() => {
    const cached = localStorage.getItem("brainrot_stats");
    if (cached) {
      try { return JSON.parse(cached); } catch { /* ignore */ }
    }
    return {
      xp: 650, // Initializer matching the 650/1000 from the screenshot
      streak: 7,
      level: 1,
      totalFocusMinutes: 25,
      completedPomodoros: 1,
      totalQuizzesTaken: 0,
      lastActiveDate: new Date().toISOString().split("T")[0]
    };
  });

  // Shared daily target study goals (moved from dashboard widgets of course)
  const [dailyXpTarget, setDailyXpTarget] = useState<number>(() => {
    return Number(localStorage.getItem("brainrot_daily_xp_target") || "500");
  });

  const handleUpdateDailyXpTarget = (target: number) => {
    setDailyXpTarget(target);
    localStorage.setItem("brainrot_daily_xp_target", String(target));
  };

  // Notes state
  const [notes, setNotes] = useState<Note[]>(() => {
    const cached = localStorage.getItem("brainrot_notes");
    if (cached) {
      try { return JSON.parse(cached); } catch { /* ignore */ }
    }
    return [
      {
        id: "n1",
        title: "Photosynthesis Essentials 🌿",
        content: "Plants convert sunlight, carbon dioxide (CO2), and water (H2O) into glucose food and release Oxygen (O2)! Safe fr fr, no cap.",
        category: "Biology",
        createdAt: "Today, 10:31 AM",
        isPinned: true
      },
      {
        id: "n2",
        title: "Newton's laws of motion 🍎",
        content: "1. Inertia (stays still unless pushed)\n2. F = ma (Force equals mass times acceleration)\n3. Equal opposite reaction. Sigma rules of gravity!",
        category: "Physics",
        createdAt: "Yesterday, 8:45 PM",
        isPinned: true
      }
    ];
  });

  // Toast array for gamified XP gain popups
  const [xpToasts, setXpToasts] = useState<Array<{ id: string; amount: number; text: string }>>([]);
  
  // Local history of accomplishments
  const [history, setHistory] = useState<Array<{ id: string; title: string; xp: number; timestamp: string }>>(() => {
    const cached = localStorage.getItem("brainrot_history");
    if (cached) {
      try { return JSON.parse(cached); } catch { /* ignore */ }
    }
    return [
      { id: "h1", title: "Finished Photosynthesis Note", xp: 15, timestamp: "Today, 10:30 AM" },
      { id: "h2", title: "Finished break lock-in 🥤", xp: 15, timestamp: "Today, 10:45 AM" }
    ];
  });

  // Save changes to local storage helper
  useEffect(() => {
    if (isLoggedIn && userName) {
      localStorage.setItem(`gizmoplanet_stats_${userName}`, JSON.stringify(stats));
      localStorage.setItem("brainrot_stats", JSON.stringify(stats)); // legacy fallback

      // Update high level profiles overview
      const cached = localStorage.getItem("gizmoplanet_profiles");
      if (cached) {
        try {
          const profilesList: ProfileItem[] = JSON.parse(cached);
          const idx = profilesList.findIndex(p => p.username === userName);
          if (idx !== -1) {
            profilesList[idx].xp = stats.xp;
            profilesList[idx].level = stats.level;
            profilesList[idx].streak = stats.streak;
            localStorage.setItem("gizmoplanet_profiles", JSON.stringify(profilesList));
          }
        } catch {}
      }
    }
  }, [stats, userName, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && userName) {
      localStorage.setItem(`gizmoplanet_notes_${userName}`, JSON.stringify(notes));
      localStorage.setItem("brainrot_notes", JSON.stringify(notes)); // legacy fallback
    }
  }, [notes, userName, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && userName) {
      localStorage.setItem(`gizmoplanet_history_${userName}`, JSON.stringify(history));
      localStorage.setItem("brainrot_history", JSON.stringify(history)); // legacy fallback
    }
  }, [history, userName, isLoggedIn]);

  // Synchronize user profile updates automatically to Firestore when logging stats in cloud
  useEffect(() => {
    if (isLoggedIn && googleUser && userName) {
      saveRemoteUserProfile(googleUser.uid, {
        uid: googleUser.uid,
        username: userName,
        avatar: userAvatar,
        xp: stats.xp,
        level: stats.level,
        streak: stats.streak,
        totalFocusMinutes: stats.totalFocusMinutes,
        completedPomodoros: stats.completedPomodoros,
        totalQuizzesTaken: stats.totalQuizzesTaken,
        lastActiveDate: stats.lastActiveDate
      }).catch(err => console.error("Cloud Profile synchronization failed:", err));
    }
  }, [stats, userName, userAvatar, isLoggedIn, googleUser]);

  // Set up Firebase auth observer to correctly track and restore sessions
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const gUser = { uid: user.uid, email: user.email || "" };
        setGoogleUser(gUser);
        localStorage.setItem("brainrot_google_user_uid", user.uid);
        localStorage.setItem("brainrot_google_user_email", user.email || "");
        localStorage.setItem("brainrot_is_logged_in", "true");
        setIsLoggedIn(true);

        try {
          const profile = await getRemoteUserProfile(user.uid);
          if (profile) {
            setStats({
              xp: profile.xp,
              streak: profile.streak,
              level: profile.level,
              totalFocusMinutes: profile.totalFocusMinutes,
              completedPomodoros: profile.completedPomodoros,
              totalQuizzesTaken: profile.totalQuizzesTaken,
              lastActiveDate: profile.lastActiveDate,
            });
            setUserName(profile.username);
            setUserAvatar(profile.avatar as AvatarType);
          }
          
          const remoteNotes = await getRemoteNotes(user.uid);
          if (remoteNotes && remoteNotes.length > 0) {
            setNotes(remoteNotes);
          }
          
          const remoteHistory = await getRemoteHistory(user.uid);
          if (remoteHistory && remoteHistory.length > 0) {
            setHistory(remoteHistory);
          }
        } catch (err) {
          console.error("[Auth Sync] Loader failed to pull Firestore data:", err);
        }
      } else {
        // Clear session if a Google session was active but got terminated on Firebase
        if (localStorage.getItem("brainrot_google_user_uid")) {
          setGoogleUser(null);
          localStorage.removeItem("brainrot_google_user_uid");
          localStorage.removeItem("brainrot_google_user_email");
          localStorage.setItem("brainrot_is_logged_in", "false");
          setIsLoggedIn(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (
    name: string,
    avatar: AvatarType,
    gUser?: { uid: string; email: string }
  ) => {
    setUserName(name);
    setUserAvatar(avatar);
    localStorage.setItem("brainrot_username", name);
    localStorage.setItem("brainrot_avatar", avatar);
    
    if (gUser) {
      setGoogleUser(gUser);
      localStorage.setItem("brainrot_google_user_uid", gUser.uid);
      localStorage.setItem("brainrot_google_user_email", gUser.email);
    } else {
      setGoogleUser(null);
      localStorage.removeItem("brainrot_google_user_uid");
      localStorage.removeItem("brainrot_google_user_email");
      
      // Load stats
      const loadedStats = localStorage.getItem(`gizmoplanet_stats_${name}`);
      if (loadedStats) {
        try { setStats(JSON.parse(loadedStats)); } catch {}
      } else if (name === "Aryan") {
        const fallbackStats = localStorage.getItem("brainrot_stats");
        if (fallbackStats) {
          try { setStats(JSON.parse(fallbackStats)); } catch {}
        }
      } else {
        setStats({
          xp: 0,
          streak: 1,
          level: 1,
          totalFocusMinutes: 0,
          completedPomodoros: 0,
          totalQuizzesTaken: 0,
          lastActiveDate: new Date().toISOString().split("T")[0]
        });
      }

      // Load notes
      const loadedNotes = localStorage.getItem(`gizmoplanet_notes_${name}`);
      if (loadedNotes) {
        try { setNotes(JSON.parse(loadedNotes)); } catch {}
      } else if (name === "Aryan") {
        const fallbackNotes = localStorage.getItem("brainrot_notes");
        if (fallbackNotes) {
          try { setNotes(JSON.parse(fallbackNotes)); } catch {}
        }
      } else {
        setNotes([]);
      }

      // Load history
      const loadedHistory = localStorage.getItem(`gizmoplanet_history_${name}`);
      if (loadedHistory) {
        try { setHistory(JSON.parse(loadedHistory)); } catch {}
      } else if (name === "Aryan") {
        const fallbackHistory = localStorage.getItem("brainrot_history");
        if (fallbackHistory) {
          try { setHistory(JSON.parse(fallbackHistory)); } catch {}
        }
      } else {
        setHistory([]);
      }
    }

    setIsLoggedIn(true);
    localStorage.setItem("brainrot_is_logged_in", "true");
  };

  const handleLogout = async () => {
    playSound("fail");
    setIsLoggedIn(false);
    localStorage.setItem("brainrot_is_logged_in", "false");
    setGoogleUser(null);
    localStorage.removeItem("brainrot_google_user_uid");
    localStorage.removeItem("brainrot_google_user_email");
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Sign out failure:", e);
    }
  };

  // Trigger audio feedback (synthesized using Web Audio API)
  const playSound = (type: "bloop" | "success" | "fail" | "pop" | "levelUp") => {
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
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === "success") {
        const notesList = [261.63, 329.63, 392.00, 523.25]; // C chord arpeggio
        notesList.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.08 + 0.2);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.2);
        });
      } else if (type === "levelUp") {
        const fanfare = [392.00, 523.25, 659.25, 783.99, 1046.5];
        fanfare.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.3);
          osc.start(ctx.currentTime + idx * 0.1);
          osc.stop(ctx.currentTime + idx * 0.1 + 0.3);
        });
      } else if (type === "fail") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "pop") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.07);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07);
        osc.start();
        osc.stop(ctx.currentTime + 0.07);
      }
    } catch { /* AudioContext fails on user action block and that's okay */ }
  };

  // Gamified XP allocator with level scaling
  const addXp = (amount: number, reason: string) => {
    playSound("pop");
    
    // Create toast banner notification
    const toastId = Math.random().toString();
    setXpToasts((prev) => [...prev, { id: toastId, amount, text: reason }]);
    setTimeout(() => {
      setXpToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 3800);

    setStats((prev) => {
      const newXp = prev.xp + amount;
      const newLevel = Math.floor(newXp / 1000) + 1; // scaled to 1000 for realistic study leveling
      const leveledUp = newLevel > prev.level;

      if (leveledUp) {
        setTimeout(() => {
          playSound("levelUp");
        }, 150);
      }

      return {
        ...prev,
        xp: newXp,
        level: newLevel
      };
    });

    const historyItem = {
      id: Math.random().toString(),
      title: reason,
      xp: amount,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Update log timeline
    setHistory((prev) => [historyItem, ...prev]);

    if (googleUser) {
      saveRemoteHistoryItem(googleUser.uid, historyItem).catch(err => console.error("Cloud history write failed:", err));
    }
  };

  const handleUpdateNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTempName = tempName.trim();
    if (cleanTempName) {
      const prevName = userName;
      setUserName(cleanTempName);
      setUserAvatar(tempAvatar);
      localStorage.setItem("brainrot_username", cleanTempName);
      localStorage.setItem("brainrot_avatar", tempAvatar);

      // Save user-keyed stats, notes, and history under the NEW username
      if (prevName !== cleanTempName) {
        localStorage.setItem(`gizmoplanet_stats_${cleanTempName}`, JSON.stringify(stats));
        localStorage.setItem(`gizmoplanet_notes_${cleanTempName}`, JSON.stringify(notes));
        localStorage.setItem(`gizmoplanet_history_${cleanTempName}`, JSON.stringify(history));
      } else {
        localStorage.setItem(`gizmoplanet_stats_${cleanTempName}`, JSON.stringify(stats));
      }

      // Update the profile registry so that the login page displays saved avatar & name
      const cached = localStorage.getItem("gizmoplanet_profiles");
      if (cached) {
        try {
          const profilesList: ProfileItem[] = JSON.parse(cached);
          const idx = profilesList.findIndex(p => p.username === prevName);
          if (idx !== -1) {
            profilesList[idx].username = cleanTempName;
            profilesList[idx].avatar = tempAvatar;
            profilesList[idx].xp = stats.xp;
            profilesList[idx].level = stats.level;
            profilesList[idx].streak = stats.streak;
            localStorage.setItem("gizmoplanet_profiles", JSON.stringify(profilesList));
          }
        } catch {}
      }

      setIsEditingName(false);
      playSound("success");
    }
  };

  const handleUpdateProfile = (name: string, avatar: AvatarType) => {
    const prevName = userName;
    setUserName(name);
    setUserAvatar(avatar);
    localStorage.setItem("brainrot_username", name);
    localStorage.setItem("brainrot_avatar", avatar);

    // Save user-keyed stats, notes, and history under the NEW username
    if (prevName !== name) {
      localStorage.setItem(`gizmoplanet_stats_${name}`, JSON.stringify(stats));
      localStorage.setItem(`gizmoplanet_notes_${name}`, JSON.stringify(notes));
      localStorage.setItem(`gizmoplanet_history_${name}`, JSON.stringify(history));
    } else {
      localStorage.setItem(`gizmoplanet_stats_${name}`, JSON.stringify(stats));
    }

    // Update the profile registry so that the login page displays saved avatar & name
    const cached = localStorage.getItem("gizmoplanet_profiles");
    if (cached) {
      try {
        const profilesList: ProfileItem[] = JSON.parse(cached);
        const idx = profilesList.findIndex(p => p.username === prevName);
        if (idx !== -1) {
          profilesList[idx].username = name;
          profilesList[idx].avatar = avatar;
          profilesList[idx].xp = stats.xp;
          profilesList[idx].level = stats.level;
          profilesList[idx].streak = stats.streak;
          localStorage.setItem("gizmoplanet_profiles", JSON.stringify(profilesList));
        }
      } catch {}
    }
  };

  // POMODORO DIRECT IN-GRID WIDGET ACTIONS & TICK ENGINE
  const [pMonoTime, setPMonoTime] = useState(25 * 60);
  const [pMonoActive, setPMonoActive] = useState(false);
  const [pMonoMode, setPMonoMode] = useState<"study" | "break">("study");

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (pMonoActive) {
      interval = setInterval(() => {
        setPMonoTime((prev) => {
          if (prev <= 1) {
            setPMonoActive(false);
            playSound("success");
            if (pMonoMode === "study") {
              addXp(40, "Completed Pomodoro study session! 🍅");
              setStats((s) => ({
                ...s,
                totalFocusMinutes: s.totalFocusMinutes + 25,
                completedPomodoros: s.completedPomodoros + 1
              }));
              setPMonoMode("break");
              return 5 * 60;
            } else {
              addXp(15, "Finished break block! Locker lock on!");
              setPMonoMode("study");
              return 25 * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [pMonoActive, pMonoMode]);

  // Shared full Pomodoro station timer states
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(25 * 60);
  const [pomodoroIsActive, setPomodoroIsActive] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState<"study" | "break" | "longBreak">("study");
  const [pomodoroCycleCount, setPomodoroCycleCount] = useState(0);

  useEffect(() => {
    let timerInterval: NodeJS.Timeout | null = null;
    if (pomodoroIsActive) {
      timerInterval = setInterval(() => {
        setPomodoroTimeLeft((prev) => {
          if (prev <= 1) {
            setTimeout(() => {
              setPomodoroIsActive(false);
              playSound("success");

              if (pomodoroMode === "study") {
                addXp(40, "Finished Pomodoro study block! 🍅");
                setStats((s) => ({
                  ...s,
                  totalFocusMinutes: s.totalFocusMinutes + 25,
                  completedPomodoros: s.completedPomodoros + 1
                }));
                const nextCycle = pomodoroCycleCount + 1;
                setPomodoroCycleCount(nextCycle);

                // Transition to break
                if (nextCycle % 4 === 0) {
                  setPomodoroMode("longBreak");
                  setPomodoroTimeLeft(15 * 60);
                } else {
                  setPomodoroMode("break");
                  setPomodoroTimeLeft(5 * 60);
                }
              } else {
                addXp(15, "Finished break block! Ready to lock in! ⚡");
                setPomodoroMode("study");
                setPomodoroTimeLeft(25 * 60);
              }
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [pomodoroIsActive, pomodoroMode, pomodoroCycleCount]);

  // Note actions
  const handleAddNewNote = (title: string, content: string, category: string) => {
    const newNote: Note = {
      id: Math.random().toString(),
      title,
      content,
      category,
      createdAt: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      isPinned: false
    };
    setNotes((prev) => [newNote, ...prev]);
    addXp(20, `Created New Note: "${title}" 📓`);
    if (googleUser) {
      saveRemoteNote(googleUser.uid, newNote).catch(err => console.error("Cloud note save failed:", err));
    }
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
    if (googleUser) {
      deleteRemoteNote(googleUser.uid, id).catch(err => console.error("Cloud note delete failed:", err));
    }
  };

  const handleTogglePin = (id: string) => {
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id === id) {
          const updated = { ...note, isPinned: !note.isPinned };
          if (googleUser) {
            saveRemoteNote(googleUser.uid, updated).catch(err => console.error("Cloud list pin failed:", err));
          }
          return updated;
        }
        return note;
      })
    );
  };

  const handleAttachDiagramToNote = (noteId: string, diagramBase64: string) => {
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id === noteId) {
          const updated = { ...note, attachedDiagram: diagramBase64 };
          if (googleUser) {
            saveRemoteNote(googleUser.uid, updated).catch(err => console.error("Cloud note attachment failed:", err));
          }
          return updated;
        }
        return note;
      })
    );
    addXp(15, "Attached AI Study Diagram to Note! 🎨");
  };

  const handleAddNoteWithDiagram = (title: string, content: string, category: string, diagramBase64: string) => {
    const newNote: Note = {
      id: Math.random().toString(),
      title,
      content,
      category,
      createdAt: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      isPinned: false,
      attachedDiagram: diagramBase64
    };
    setNotes((prev) => [newNote, ...prev]);
    addXp(30, `Created New Note: "${title}" with attached AI Diagram! 🎨📓`);
    if (googleUser) {
      saveRemoteNote(googleUser.uid, newNote).catch(err => console.error("Cloud note save failed:", err));
    }
  };

  const handleDetachDiagram = (id: string) => {
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id === id) {
          const updated = { ...note };
          delete updated.attachedDiagram;
          if (googleUser) {
            saveRemoteNote(googleUser.uid, updated).catch(err => console.error("Cloud note detachment failed:", err));
          }
          return updated;
        }
        return note;
      })
    );
    addXp(5, "Detached study diagram from note 🎐");
  };

  if (!isLoggedIn) {
    return <LoginView onLoginSuccess={handleLoginSuccess} playSound={playSound} />;
  }

  return (
    <div className="w-full h-screen bg-[#FAF8F5] p-3 lg:p-4 flex flex-col lg:flex-row gap-4 font-sans text-indigo-950 select-none lg:overflow-hidden relative">
      
      {/* Floating XP Toasts overlay drawer */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
        {xpToasts.map((t) => (
          <div
            key={t.id}
            className="cartoon-card p-3 bg-emerald-400 border-indigo-950 font-display font-extrabold text-indigo-950 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(30,27,75,1)] animate-bounce"
          >
            <span className="text-xl">✨</span>
            <div>
              <p className="text-xs">{t.text}</p>
              <p className="text-sm font-black tracking-wider text-[#1E1B4B]">+{t.amount} XP RECEIVED!</p>
            </div>
          </div>
        ))}
      </div>

      {/* 1. LEFT SIDEBAR NAVIGATION PANEL (PERSISTENT & FULL VERTICAL HEIGHT) */}
      <aside className="w-full lg:w-[250px] xl:w-[280px] bg-[#EAE8FE] border border-indigo-950/10 rounded-[2rem] flex flex-col justify-between p-5 text-indigo-950 shadow-sm flex-shrink-0 lg:h-full overflow-y-auto">
        
        <div>
          {/* Branding matching screenshot */}
          <div className="flex items-center gap-3 mb-6 px-1">
            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center border border-indigo-950/15 shadow-xs transform hover:rotate-6 transition-transform">
              <CuteRobotAvatar className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-black leading-none text-[#5E4CD4]">
                Gizmo
              </h1>
              <p className="text-[10px] font-display font-bold text-[#7D69EC] uppercase tracking-widest mt-0.5">
                AI STUDY BUDDY ❤️
              </p>
            </div>
          </div>

          {/* Navigation links matching screenshot exactly */}
          <nav className="space-y-1.5">
            {[
              { tab: "dashboard", label: "Dashboard", icon: "🏠" },
              { tab: "chat", label: "Chat", icon: "💬" },
              { tab: "notes", label: "Notes", icon: "📝" },
              { tab: "summarize", label: "Flashcards", icon: "🗂️" },
              { tab: "quiz", label: "Quizzes", icon: "❓" },
              { tab: "pomodoro", label: "Study Timer", icon: "⏱️" },
              { tab: "progress", label: "Progress", icon: "📊" },
              { tab: "bookmarks", label: "Bookmarks", icon: "🔖" },
              { tab: "settings", label: "Settings", icon: "⚙️" }
            ].map((item) => {
              const isActive = currentTab === item.tab || (item.tab === "bookmarks" && currentTab === "notes");
              return (
                <button
                  key={item.tab}
                  onClick={() => {
                    playSound("bloop");
                    if (item.tab === "bookmarks") {
                      setCurrentTab("notes");
                      addXp(5, "Showing pinned bookmarks! 🔖");
                    } else {
                      setCurrentTab(item.tab as AppTab);
                    }
                  }}
                  className={`w-full text-left font-display font-black text-sm px-4 py-2.5 rounded-2xl transition-all duration-150 flex items-center gap-3 cursor-pointer ${
                    isActive
                      ? "bg-[#5E4CD4] text-white shadow-xs font-bold font-display"
                      : "text-indigo-950/70 hover:bg-[#5E4CD4]/10 hover:text-indigo-950"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Lower Decor Bubble & Profile of Sidebar matching layout */}
        <div className="mt-8 space-y-4">
          
          {/* Speech dialogue card balloon */}
          <div className="hidden lg:flex flex-col bg-white border border-indigo-950/10 rounded-2xl p-3.5 shadow-xs relative animate-float">
            <div className="absolute bottom-[-6px] left-8 w-3 h-3 bg-white border-r border-b border-indigo-950/10 rotate-45" />
            <p className="text-[11px] font-semibold text-indigo-950/80 leading-relaxed">
              "Learning is an adventure. Let's explore together!" 🚀
            </p>
          </div>

          {/* Character profile summary card with custom avatar support */}
          <button
            onClick={() => {
              setTempName(userName);
              setTempAvatar(userAvatar);
              setIsEditingName(true);
              playSound("pop");
            }}
            className="w-full bg-white hover:bg-[#FAF9FF] border border-indigo-950/10 p-2.5 rounded-2xl flex items-center justify-between transition-colors text-left cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 border border-indigo-950/10 bg-[#FFFDF9] rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                <StudyAvatar type={userAvatar} className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs font-display font-black text-indigo-950 leading-none mb-0.5">
                  Hey, {userName}! 👋
                </p>
                <p className="text-[10px] font-semibold text-indigo-950/40">
                  Keep going, superstar!
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

        </div>
      </aside>

      {/* 2. MIDDLE ACTIVE WORKSPACE COLUMN (CHAT, NOTES, POMODORO, QUIZZES, ETC.) */}
      <main className="flex-1 bg-white rounded-[2rem] p-5 md:p-6 border border-indigo-950/10 flex flex-col relative shadow-sm overflow-hidden h-[620px] lg:h-full">
        {currentTab === "dashboard" && (
          <DashboardView
            stats={stats}
            notes={notes}
            userName={userName}
            userAvatar={userAvatar}
            addXp={addXp}
            playSound={playSound}
            setCurrentTab={setCurrentTab}
            dailyXpTarget={dailyXpTarget}
          />
        )}

        {currentTab === "chat" && (
          <AIStudyBuddy
            userName={userName}
            addXp={addXp}
            playSound={playSound}
            onBack={() => setCurrentTab("chat")}
            stats={stats}
            notes={notes}
            attachDiagramToNote={handleAttachDiagramToNote}
            addNoteWithDiagram={handleAddNoteWithDiagram}
          />
        )}

        {currentTab === "pomodoro" && (
          <Pomodoro
            addXp={addXp}
            incrementFocusMinutes={(mins) =>
              setStats((s) => ({ ...s, totalFocusMinutes: s.totalFocusMinutes + mins }))
            }
            timeLeft={pomodoroTimeLeft}
            setTimeLeft={setPomodoroTimeLeft}
            isActive={pomodoroIsActive}
            setIsActive={setPomodoroIsActive}
            mode={pomodoroMode}
            setMode={setPomodoroMode}
            cycleCount={pomodoroCycleCount}
            setCycleCount={setPomodoroCycleCount}
            notes={notes}
          />
        )}

        {currentTab === "quiz" && (
          <QuizView
            addXp={addXp}
            incrementQuizCount={() => setStats((s) => ({ ...s, totalQuizzesTaken: s.totalQuizzesTaken + 1 }))}
            playSound={playSound}
            onBack={() => setCurrentTab("chat")}
          />
        )}

        {currentTab === "summarize" && (
          <Summarizer
            addXp={addXp}
            playSound={playSound}
            onBack={() => setCurrentTab("chat")}
          />
        )}

        {currentTab === "notes" && (
          <NotesView
            notes={notes}
            addNote={handleAddNewNote}
            deleteNote={handleDeleteNote}
            togglePin={handleTogglePin}
            detachDiagram={handleDetachDiagram}
            playSound={playSound}
            onBack={() => setCurrentTab("chat")}
          />
        )}

        {currentTab === "progress" && (
          <ProgressView
            stats={stats}
            history={history}
            clearStats={() => {
              setStats({
                xp: 0,
                streak: 1,
                level: 1,
                totalFocusMinutes: 0,
                completedPomodoros: 0,
                totalQuizzesTaken: 0,
                lastActiveDate: new Date().toISOString().split("T")[0]
              });
              setHistory([]);
            }}
            playSound={playSound}
            onBack={() => setCurrentTab("chat")}
          />
        )}

        {currentTab === "settings" && (
          <SettingsView
            userName={userName}
            userAvatar={userAvatar}
            stats={stats}
            dailyXpTarget={dailyXpTarget}
            setDailyXpTarget={handleUpdateDailyXpTarget}
            onUpdateProfile={handleUpdateProfile}
            onLogout={handleLogout}
            onClearStats={() => {
              setStats({
                xp: 0,
                streak: 1,
                level: 1,
                totalFocusMinutes: 0,
                completedPomodoros: 0,
                totalQuizzesTaken: 0,
                lastActiveDate: new Date().toISOString().split("T")[0]
              });
              setHistory([]);
            }}
            playSound={playSound}
            addXp={addXp}
          />
        )}
      </main>

      {/* 3. RIGHT SIDEBAR WIDGET COLUMN (Persistent stack mimicking live screen view) */}
      <aside className="w-full lg:w-80 flex flex-col gap-4 flex-shrink-0 lg:h-full overflow-y-auto py-1">
        
        {/* Widget A: Study Tools */}
        <div className="bg-[#FFF9F2] p-5 rounded-3xl border border-indigo-950/10 shadow-xs relative">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-display font-black text-indigo-950 text-base">Study Tools</h3>
            <span className="text-xl">🎒</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { playSound("bloop"); setCurrentTab("notes"); }}
              className="bg-white hover:bg-orange-50/50 border border-indigo-950/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-0.5 cursor-pointer shadow-xs group"
            >
              <div className="w-10 h-10 rounded-full bg-[#FFF0E2] text-[#E08F35] flex items-center justify-center text-lg mb-1.5 group-hover:scale-105 transition-transform">
                📔
              </div>
              <span className="text-xs font-display font-black text-indigo-950 tracking-tight">Notes</span>
            </button>

            <button
              onClick={() => { playSound("bloop"); setCurrentTab("summarize"); }}
              className="bg-white hover:bg-[#FAF9FF] border border-indigo-950/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-0.5 cursor-pointer shadow-xs group"
            >
              <div className="w-10 h-10 rounded-full bg-[#ECE9FF] text-[#695ECB] flex items-center justify-center text-lg mb-1.5 group-hover:scale-105 transition-transform">
                🎴
              </div>
              <span className="text-xs font-display font-black text-indigo-950 tracking-tight">Flashcards</span>
            </button>

            <button
              onClick={() => { playSound("bloop"); setCurrentTab("quiz"); }}
              className="bg-white hover:bg-orange-50/50 border border-indigo-950/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-0.5 cursor-pointer shadow-xs group"
            >
              <div className="w-10 h-10 rounded-full bg-[#ECE9FF] text-[#695ECB] flex items-center justify-center text-lg mb-1.5 group-hover:scale-105 transition-transform">
                ❓
              </div>
              <span className="text-xs font-display font-black text-indigo-950 tracking-tight">Quizzes</span>
            </button>

            <button
              onClick={() => { playSound("bloop"); setCurrentTab("progress"); }}
              className="bg-white hover:bg-orange-50/50 border border-indigo-950/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-0.5 cursor-pointer shadow-xs group"
            >
              <div className="w-10 h-10 rounded-full bg-[#E6F8FF] text-[#4198BC] flex items-center justify-center text-lg mb-1.5 group-hover:scale-105 transition-transform">
                🧠
              </div>
              <span className="text-xs font-display font-black text-indigo-950 tracking-tight">Mind Map</span>
            </button>
          </div>
        </div>

        {/* Widget B: Recent Notes with exact items from snapshot */}
        <div className="bg-white p-5 rounded-3xl border border-indigo-950/10 shadow-xs flex-1 flex flex-col min-h-[220px]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-display font-black text-indigo-950 text-base">Recent Notes</h3>
            <button
              onClick={() => { playSound("pop"); setCurrentTab("notes"); }}
              className="text-xs font-display font-bold text-[#7D69EC] hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 max-h-[240px]">
            {notes.map((note, idx) => {
              let noteIcon = "🌿";
              let iconColor = "bg-emerald-50 text-emerald-600";
              if (idx === 1) {
                noteIcon = "🍎";
                iconColor = "bg-rose-50 text-rose-600";
              } else if (idx === 2) {
                noteIcon = "📐";
                iconColor = "bg-sky-50 text-sky-600";
              } else if (idx > 2) {
                noteIcon = "🧬";
                iconColor = "bg-purple-50 text-purple-600";
              }

              return (
                <div
                  key={note.id}
                  onClick={() => { playSound("bloop"); setCurrentTab("notes"); }}
                  className="p-3 bg-[#FAF9FF] hover:bg-purple-50/50 rounded-2xl border border-indigo-950/5 flex items-center justify-between transition-colors duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${iconColor} flex-shrink-0`}>
                      {noteIcon}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-display font-black text-indigo-950 line-clamp-1 leading-tight">
                        {note.title}
                      </h4>
                      <p className="text-[10px] font-sans font-semibold text-gray-400 capitalize mt-0.5 leading-none">
                        {note.createdAt}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playSound("pop");
                      handleTogglePin(note.id);
                    }}
                    className={`p-1 flex-shrink-0 ${
                      note.isPinned ? "text-[#7D69EC]" : "text-gray-300 hover:text-[#7D69EC]"
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              );
            })}

            {notes.length === 0 && (
              <p className="text-center font-sans text-xs italic text-gray-400 py-6">No saved notes yet!</p>
            )}
          </div>
        </div>

        {/* Widget C: XP Progress Tracker with celebrated student */}
        <div className="bg-[#DFEDFE] p-4 px-4.5 rounded-3xl border border-indigo-950/10 flex items-center justify-between relative overflow-hidden shadow-xs min-h-[110px] flex-shrink-0">
          <div className="flex-1 pr-16 relative z-10">
            <h4 className="font-display font-black text-indigo-950 text-[13px] leading-tight">
              You're doing great, {userName}! 💪
            </h4>
            
            <div className="mt-2 text-left">
              <div className="flex justify-between items-center text-[10px] font-display font-black text-indigo-950 mb-1 leading-none">
                <span className="bg-[#7D69EC] text-white px-2 py-0.5 rounded-full text-[8.5px]">XP</span>
                <span>{stats.xp} / 1000 XP</span>
              </div>
              <div className="w-full bg-[#CCE2FC] h-3.5 rounded-full overflow-hidden p-0.5 relative border border-indigo-950/5 text-center flex items-center shadow-inner">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (stats.xp / 1000) * 100)}%` }}
                />
                <span className="absolute inset-0 text-[8px] font-mono font-black text-indigo-955 flex items-center justify-center">
                  {Math.round((stats.xp / 1000) * 100)}% Progress
                </span>
              </div>
            </div>
          </div>

          {/* Celebrative vector boy overlapping on bottom right */}
          <div className="flex-shrink-0">
            <CheeringStudent className="w-18 h-18" />
          </div>
        </div>

      </aside>

      {/* Username & Avatar Customizer Dialog Overlay + Logout */}
      {isEditingName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 animate-fade-in animate-float duration-3000">
          <div className="cartoon-card bg-white p-6 max-w-sm w-full relative">
            <button
              onClick={() => setIsEditingName(false)}
              className="absolute top-4 right-4 p-1 rounded-full border-2 border-indigo-950 text-indigo-950 hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-display font-black text-xl text-[#1E1B4B] mb-1">Profile Dashboard 👑</h3>
            <p className="text-gray-500 font-sans text-xs mb-4">Set your own hero moniker and study mascot!</p>
            
            <form onSubmit={handleUpdateNameSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-display font-black text-[#5C509C] uppercase tracking-wider block">EDIT USERNAME:</label>
                <input
                  type="text"
                  placeholder="e.g. Aryan, Skibidi Sigma, Queen"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  maxLength={16}
                  required
                  className="cartoon-input w-full px-4 py-2 text-sm font-bold text-indigo-950 border-3"
                />
              </div>

              {/* Avatar switches inside settings */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-display font-black text-[#5C509C] uppercase tracking-wider block">CHOOSE MASCOT COMPANION:</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["student", "robot", "owl", "cat"] as AvatarType[]).map((type) => {
                    const isSelected = tempAvatar === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => { playSound("pop"); setTempAvatar(type); }}
                        className={`cartoon-btn p-1.5 flex flex-col items-center justify-center transition-all bg-white relative capitalize cursor-pointer rounded-xl ${
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

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  className="cartoon-btn w-full bg-[#7D69EC] hover:bg-[#6853DF] text-white font-display font-black text-xs py-2.5 cursor-pointer shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]"
                >
                  Save Settings ✓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingName(false);
                    handleLogout();
                  }}
                  className="cartoon-btn w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-display font-black text-xs py-2.5 cursor-pointer flex items-center justify-center gap-1 border-3 border-rose-600 shadow-[2px_2px_0px_0px_rgba(225,29,72,1)]"
                >
                  <span>Log Out of Session 🚪</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// 4. Custom Happy Mascot vector on XP bar
export function CheeringStudent({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head & Neck */}
      <circle cx="50" cy="45" r="22" fill="#FFD6A5" stroke="#1E1B4B" strokeWidth="3" />
      {/* Hair */}
      <path d="M 28 42 C 32 15, 68 15, 72 42 C 68 30, 32 30, 28 42 Z" fill="#3D3A60" stroke="#1E1B4B" strokeWidth="2.5" />
      <path d="M 28 32 Q 50 12 72 32" stroke="#1E1B4B" strokeWidth="3" fill="none" />
      {/* Eyes */}
      <circle cx="42" cy="45" r="3.5" fill="#1E1B4B" />
      <circle cx="58" cy="45" r="3.5" fill="#1E1B4B" />
      {/* Cheeks */}
      <circle cx="36" cy="51" r="2.5" fill="#FFADAD" />
      <circle cx="64" cy="51" r="2.5" fill="#FFADAD" />
      {/* Big Open Mouth Smile */}
      <path d="M 43 51 Q 50 59 57 51 Z" fill="#FF8B94" stroke="#1E1B4B" strokeWidth="2.5" />
      {/* Body with Purple Shirt */}
      <path d="M 24 85 C 32 70, 68 70, 76 85" fill="#7D69EC" stroke="#1E1B4B" strokeWidth="3.5" />
      <path d="M 50 67 L 50 72" stroke="#1E1B4B" strokeWidth="3" />
      {/* Arms Up in Air Celebrating */}
      <path d="M 24 75 Q 12 55 14 50" stroke="#1E1B4B" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="14" cy="48" r="4.5" fill="#FFD6A5" stroke="#1E1B4B" strokeWidth="2.5" />
      <path d="M 76 75 Q 88 55 86 50" stroke="#1E1B4B" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="86" cy="48" r="4.5" fill="#FFD6A5" stroke="#1E1B4B" strokeWidth="2.5" />
    </svg>
  );
}
