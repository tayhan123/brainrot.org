import { useState, useRef, useEffect, ChangeEvent, DragEvent } from "react";
import { Send, Sparkles, Flame, Paperclip, Image, Mic, Plus, FileText, Check } from "lucide-react";
import StudyAvatar, { AvatarType } from "./StudyAvatar";
import { Note } from "../types";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: {
    mimeType: string;
    data: string; // base64 representation
  };
  generatedImage?: string; // Base64 or image URL
}

interface AIStudyBuddyProps {
  userName: string;
  addXp: (amount: number, reason: string) => void;
  playSound: (type: "bloop" | "success" | "fail" | "pop" | "levelUp") => void;
  onBack: () => void;
  stats: {
    xp: number;
    streak: number;
    level: number;
    totalFocusMinutes: number;
  };
  notes?: Note[];
  attachDiagramToNote?: (noteId: string, diagramBase64: string) => void;
  addNoteWithDiagram?: (title: string, content: string, category: string, diagramBase64: string) => void;
}

// Artisan custom vector of Gizmo the robot companion
export function CuteRobotAvatar({ className = "w-10 h-10 animate-float" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="25" width="70" height="55" rx="25" fill="#7D69EC" stroke="#1E1B4B" strokeWidth="4" />
      <rect x="22" y="32" width="56" height="41" rx="16" fill="white" stroke="#1E1B4B" strokeWidth="4" />
      {/* Eyes */}
      <circle cx="38" cy="50" r="8" fill="#1E1B4B" />
      <circle cx="62" cy="50" r="8" fill="#1E1B4B" />
      {/* Highlights */}
      <circle cx="36" cy="48" r="2.5" fill="white" />
      <circle cx="60" cy="48" r="2.5" fill="white" />
      {/* Cheeks */}
      <circle cx="28" cy="58" r="4" fill="#FFAAAA" fillOpacity="0.8" />
      <circle cx="72" cy="58" r="4" fill="#FFAAAA" fillOpacity="0.8" />
      {/* Cute Smile */}
      <path d="M 44 60 Q 50 65 56 60" stroke="#1E1B4B" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      {/* Antenna */}
      <line x1="50" y1="25" x2="50" y2="12" stroke="#1E1B4B" strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="10" r="6" fill="#FFD6A5" stroke="#1E1B4B" strokeWidth="3.5" />
      {/* Ears / Side lights */}
      <rect x="8" y="42" width="7" height="20" rx="3.5" fill="#FF9A9E" stroke="#1E1B4B" strokeWidth="3" />
      <rect x="85" y="42" width="7" height="20" rx="3.5" fill="#FF9A9E" stroke="#1E1B4B" strokeWidth="3" />
    </svg>
  );
}

export default function AIStudyBuddy({
  userName,
  addXp,
  playSound,
  stats,
  notes = [],
  attachDiagramToNote,
  addNoteWithDiagram
}: AIStudyBuddyProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hey ${userName}! 🤖 I'm Gizmo, your study buddy. Drop any school topic here and I'll break it down easily fr fr! Ask me about Photosynthesis to see me explain with graphics. You can also upload or drag an image of a math calculation problem and I will explain the solution!`
    },
    {
      role: "user",
      content: "Hey Gizmo! Can you explain photosynthesis in a simple way?"
    },
    {
      role: "assistant",
      content: `Hey ${userName}! 🌿\n\nPhotosynthesis is how plants make their own food! Here's the simple idea:\n\n• ☀️ Sunlight gives energy\n• 💨 Plants take in carbon dioxide (CO₂)\n• 💧 They absorb water (H₂O)\n• 🌬️ And release Oxygen (O₂)!\n\nIt happens inside leaves using chlorophyll (the green pigment)!`
    }
  ]);
  
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // States for attaching diagrams to notes
  const [attachingDiagram, setAttachingDiagram] = useState<string | null>(null);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState("General");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Dynamic user chosen avatar from local storage
  const activeAvatar = (localStorage.getItem("brainrot_avatar") as AvatarType) || "student";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file! Gizmo scans drawings, diagrams, and math equations inside images.");
      playSound("fail");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        const commaIndex = result.indexOf(",");
        const base64Data = result.substring(commaIndex + 1);
        setAttachedImage({
          mimeType: file.type || "image/png",
          data: base64Data
        });
        playSound("success");
      }
    };
    reader.readAsDataURL(file);
  };

  const removeAttachedImage = () => {
    setAttachedImage(null);
    playSound("pop");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleSendMessage = async (text: string, withImageOverride?: { mimeType: string; data: string } | null) => {
    const activeImage = withImageOverride !== undefined ? withImageOverride : attachedImage;
    if (!text.trim() && !activeImage) return;
    playSound("pop");
    
    const userMsg: Message = { 
      role: "user", 
      content: text 
    };

    if (activeImage) {
      userMsg.image = activeImage;
    }

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setAttachedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages })
      });

      if (!response.ok) throw new Error("Gizmo went offline momentarily!");
      const data = await response.json();
      
      const assistantMsg: Message = { 
        role: "assistant", 
        content: data.content 
      };
      
      if (data.generatedImage) {
        assistantMsg.generatedImage = data.generatedImage;
      }

      setMessages((prev) => [...prev, assistantMsg]);
      playSound("bloop");

      // Give XP
      addXp(15, "Consulted Gizmo Study Companion! 🧠");
    } catch (error: any) {
      playSound("fail");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `🚨 My antennas crossed: ${error.message}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col h-full bg-[#FAF9FF] relative rounded-2xl transition-all duration-200 ${isDragging ? "ring-4 ring-[#7D69EC] ring-dashed bg-indigo-50/20" : ""}`}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 rounded-2xl bg-[#7D69EC]/10 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-[#7D69EC] border-dashed pointer-events-none animate-pulse">
          <span className="text-4xl">📥</span>
          <span className="font-display font-black text-lg text-[#1E1B4B] mt-2">
            Drop your Math / Science image here!
          </span>
          <span className="font-sans font-bold text-xs text-indigo-750/70 mt-1">
            Gizmo will scan and solve it instantly!
          </span>
        </div>
      )}
      
      {/* Middle Workspace Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b-2 border-indigo-950/10 gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-display font-black text-[#1E1B4B] flex items-center gap-2 tracking-tight">
            Gizmo's Lab <span className="animate-wiggle inline-block">🤖</span>
          </h2>
          <p className="text-xs font-display font-black text-[#5C509C] uppercase mt-1 tracking-wider">
            Your interactive learning companion & smart study buddy!
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Flame streak badge matching layout */}
          <div className="flex items-center gap-1.5 bg-yellow-50 px-3.5 py-1.5 border-3 border-indigo-950 rounded-2xl font-display font-black text-xs text-[#1E1B4B] shadow-[3px_3px_0px_0px_rgba(30,27,75,1)]">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-400 animate-pulse" />
            <span>STREAK: {stats.streak} DAYS</span>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-100 px-3.5 py-1.5 border-3 border-indigo-950 rounded-2xl font-display font-black text-xs text-[#1E1B4B] shadow-[3px_3px_0px_0px_rgba(30,27,75,1)]">
            <Sparkles className="w-4 h-4 text-emerald-600 animate-spin duration-3000" />
            <span>LVL {stats.level}</span>
          </div>
        </div>
      </div>

      {/* Messages Log Panel inside clean inset comic sandbox console */}
      <div className="flex-1 min-h-[280px] max-h-[480px] flex flex-col bg-[#F3F1FE] border-3 border-indigo-950 rounded-3xl p-4.5 shadow-[inset_0_4px_12px_rgba(30,27,75,0.08)] relative mb-3.5 overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-1.5 space-y-5 scrollbar">
          {messages.map((msg, idx) => {
            const isGizmo = msg.role === "assistant";
            const isPhotosynthesisReply = isGizmo && idx === 2;

            return (
              <div
                key={idx}
                className={`flex gap-3.5 items-start ${isGizmo ? "justify-start" : "justify-end"}`}
              >
                {isGizmo ? (
                  <div className="w-10 h-10 rounded-2xl bg-white border-2.5 border-indigo-950 shadow-[2px_2px_0px_0px_#1E1B4B] flex items-center justify-center flex-shrink-0">
                    <CuteRobotAvatar className="w-9 h-9" />
                  </div>
                ) : null}

                <div className="flex flex-col max-w-[85%]">
                  <div
                    className={`px-4 py-3.5 border-3 border-indigo-950 rounded-2xl text-sm leading-relaxed ${
                      isGizmo
                        ? "bg-white text-indigo-950 shadow-[3px_3px_0px_0px_#1E1B4B] rounded-tl-none"
                        : "bg-[#EBE9FE] text-indigo-950 rounded-tr-none shadow-[3px_3px_0px_0px_#1E1B4B]"
                    }`}
                  >
                    {isGizmo ? (
                      <div className="flex justify-between items-center mb-2 pb-1.5 border-b-2 border-indigo-50">
                        <span className="text-[10px] font-display font-black text-[#7D69EC] uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          GIZMO AI COMPANION
                        </span>
                        <span className="text-[9px] font-mono font-black text-[#5C509C]/45 uppercase tracking-wide">
                          ONLINE
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center mb-2 pb-1.5 border-b-2 border-indigo-50">
                        <span className="text-[10px] font-display font-black text-indigo-950/60 uppercase tracking-widest leading-none">
                          STUDENT: {userName}
                        </span>
                        <span className="text-[9px] font-mono font-black text-indigo-950/30">
                          YOU
                        </span>
                      </div>
                    )}
                    
                    <div className="whitespace-pre-line font-display font-black text-xs md:text-sm tracking-wide text-indigo-950 leading-relaxed">
                      {msg.content}
                    </div>

                    {/* Displays user attached math or formula image inline inside user's chat card */}
                    {msg.image && (
                      <div className="mt-3.5 max-w-xs sm:max-w-md rounded-xl overflow-hidden border-3 border-indigo-950 shadow-[2.5px_2.5px_0px_0px_#1E1B4B] bg-white">
                        <img
                          src={`data:${msg.image.mimeType};base64,${msg.image.data}`}
                          alt="User Attached Math File"
                          className="max-h-56 object-contain w-full"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {/* Displays AI custom generated study image aid with premium decorative caption */}
                    {msg.generatedImage && (
                      <div className="mt-4 border-3 border-indigo-950 rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_#1E1B4B] bg-white max-w-sm">
                        <div className="bg-[#FFEAA5] border-b-3 border-indigo-950 px-3.5 py-1.5 flex justify-between items-center overflow-hidden">
                          <span className="text-[10px] font-display font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1">
                            🎨 GIZMO VISUAL STUDY AID
                          </span>
                          <span className="text-[8px] font-mono font-black text-indigo-950/40">IMAGEN v2.5</span>
                        </div>
                        <img
                          src={msg.generatedImage}
                          alt="Generated educational illustration"
                          className="w-full object-cover aspect-square hover:scale-[1.02] transition-transform duration-300 pointer-events-auto"
                          referrerPolicy="no-referrer"
                        />
                        <div className="p-2.5 bg-[#FAF9FF] border-t-2 border-indigo-950/10 text-center flex flex-col gap-2">
                          <span className="text-[9.5px] font-display font-semibold text-gray-500 block mb-1">
                            Download or drag this graphic helper!
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              playSound("pop");
                              if (attachingDiagram === msg.generatedImage) {
                                setAttachingDiagram(null);
                              } else {
                                setAttachingDiagram(msg.generatedImage || null);
                              }
                            }}
                            className="cartoon-btn w-full py-1.5 bg-[#C2AFFA] hover:bg-[#B19AF7] text-indigo-950 font-display font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-[#1E1B4B]"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>📎 Attach to Scrawl Note</span>
                          </button>

                          {attachingDiagram === msg.generatedImage && (
                            <div className="mt-2.5 p-3 bg-white border-2 border-[#1E1B4B] rounded-xl text-left text-xs animate-float space-y-3">
                              <div className="flex justify-between items-center">
                                <p className="font-display font-black text-[#1E1B4B] uppercase tracking-wide text-[10.5px]">
                                  Select Scrawl Note to pin diagram:
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setAttachingDiagram(null)}
                                  className="text-gray-400 hover:text-red-500 font-extrabold px-1 text-xs"
                                >
                                  ×
                                </button>
                              </div>
                              
                              {notes.length === 0 ? (
                                <p className="text-[10px] font-semibold text-gray-400 italic">No notes found! Create a new one below.</p>
                              ) : (
                                <div className="max-h-28 overflow-y-auto pr-1 scrollbar space-y-1.5">
                                  {notes.map((note) => (
                                    <button
                                      key={note.id}
                                      type="button"
                                      onClick={() => {
                                        if (attachDiagramToNote) {
                                          attachDiagramToNote(note.id, msg.generatedImage!);
                                          playSound("success");
                                          setAttachingDiagram(null);
                                        }
                                      }}
                                      className="w-full text-left p-2 rounded-lg bg-[#FAF9FF] hover:bg-violet-50 hover:text-violet-700 transition-all font-bold border border-indigo-950/10 flex items-center justify-between text-[11px] cursor-pointer"
                                    >
                                      <span className="truncate flex-1 max-w-[190px]">{note.title}</span>
                                      {note.attachedDiagram ? (
                                        <span className="text-[8px] bg-amber-100 text-amber-700 border border-amber-200 px-1 py-0.5 rounded font-sans uppercase font-black">
                                          Has Diagram
                                        </span>
                                      ) : (
                                        <Plus className="w-3 h-3 text-gray-400" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Create new note quick section */}
                              <div className="border-t-2 border-dashed border-indigo-950/10 pt-2.5 space-y-2">
                                <p className="font-display font-black text-[#1E1B4B] uppercase tracking-wide text-[10.5px]">
                                  Or Create a New Note:
                                </p>
                                
                                <input
                                  type="text"
                                  placeholder="Enter Note Title"
                                  value={newNoteTitle}
                                  onChange={(e) => setNewNoteTitle(e.target.value)}
                                  className="cartoon-input w-full px-2.5 py-1.5 text-[11px] font-bold bg-[#FAF9FF]"
                                />

                                <div className="flex flex-wrap gap-1">
                                  {(() => {
                                    const cached = localStorage.getItem("brainrot_custom_categories");
                                    let loaded = ["Biology 🧬", "History 🏛️", "Physics ⚡", "Language 📝", "General 🎒"];
                                    if (cached) {
                                      try {
                                        const parsed = JSON.parse(cached);
                                        if (Array.isArray(parsed) && parsed.length > 0) {
                                          loaded = parsed;
                                        }
                                      } catch (e) {
                                        console.error(e);
                                      }
                                    }
                                    return loaded.map(cat => cat.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "").trim());
                                  })().map((cat) => (
                                    <button
                                      key={cat}
                                      type="button"
                                      onClick={() => setNewNoteCategory(cat)}
                                      className={`px-2 py-0.5 rounded text-[9px] font-display font-black border transition-all cursor-pointer ${
                                        newNoteCategory === cat
                                          ? "bg-indigo-650 text-white border-indigo-950"
                                          : "bg-white text-gray-500 border-[#1E1B4B]"
                                      }`}
                                    >
                                      {cat}
                                    </button>
                                  ))}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!newNoteTitle.trim()) {
                                      alert("Please provide a note title!");
                                      return;
                                    }
                                    if (addNoteWithDiagram) {
                                      addNoteWithDiagram(
                                        newNoteTitle.trim(),
                                        "✨ Custom study diagram generated using Google Gemini 2.5 on Gizmo's classroom whiteboard.",
                                        newNoteCategory,
                                        msg.generatedImage!
                                      );
                                      playSound("success");
                                      setNewNoteTitle("");
                                      setAttachingDiagram(null);
                                    }
                                  }}
                                  className="w-full py-1.5 bg-[#FFF275] border-2 border-[#1E1B4B] rounded-lg font-display font-black text-[11px] text-[#1E1B4B] text-center shadow-[1.5px_1.5px_0px_0px_#1E1B4B] hover:bg-[#FFE359] cursor-pointer"
                                >
                                  Create Note & Attach 📓⚡
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Highly polished diagram for Biology photosynthesis mockup */}
                    {isPhotosynthesisReply && (
                      <div className="mt-5 p-5 bg-[#FFEAA5]/20 border-3 border-indigo-950 rounded-2xl relative overflow-hidden shadow-[3px_3px_0px_0px_#1E1B4B]">
                        
                        {/* Decorative background grid and sun light */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-100/30 rounded-full blur-xl pointer-events-none" />

                        <div className="flex justify-between items-center mb-4 pb-2 border-b-2 border-indigo-950/15">
                          <span className="text-xs font-display font-black uppercase tracking-widest text-[#7D69EC] flex items-center gap-1">
                            🌱 STUDY CHART: PHOTOSYNTHESIS
                          </span>
                          <span className="text-[8px] font-mono font-black text-indigo-950/50">COGNITIVE LABS v2</span>
                        </div>

                        {/* Interactive diagram grid */}
                        <div className="grid grid-cols-12 gap-3.5 items-center text-center">
                          
                          {/* Inputs */}
                          <div className="col-span-4 flex flex-col gap-3">
                            <div className="bg-yellow-101 border-2.5 border-indigo-950 rounded-2xl p-2 flex flex-col items-center justify-center shadow-[2px_2px_0px_0px_#1E1B4B] transform hover:scale-[1.03] transition-transform">
                              <span className="text-base">☀️</span>
                              <span className="font-display font-black text-[9px] text-[#1E1B4B] uppercase tracking-wider leading-none mt-1">Sunlight</span>
                              <span className="text-[7.5px] font-medium text-[#1E1B4B]/60 leading-none mt-0.5">Energy In</span>
                            </div>
                            <div className="bg-[#DFECFF] border-2.5 border-indigo-950 rounded-2xl p-2 flex flex-col items-center justify-center shadow-[2px_2px_0px_0px_#1E1B4B] transform hover:scale-[1.03] transition-transform">
                              <span className="text-base">💨</span>
                              <span className="font-display font-black text-[9px] text-[#1E1B4B] uppercase tracking-wider leading-none mt-1">CO₂</span>
                              <span className="text-[7.5px] font-medium text-[#1E1B4B]/60 leading-none mt-0.5">Carbon Dioxide</span>
                            </div>
                            <div className="bg-[#EBF7FF] border-2.5 border-indigo-950 rounded-2xl p-2 flex flex-col items-center justify-center shadow-[2px_2px_0px_0px_#1E1B4B] transform hover:scale-[1.03] transition-transform">
                              <span className="text-base">💧</span>
                              <span className="font-display font-black text-[9px] text-[#1E1B4B] uppercase tracking-wider leading-none mt-1">H₂O</span>
                              <span className="text-[7.5px] font-medium text-[#1E1B4B]/60 leading-none mt-0.5">Water / Soil</span>
                            </div>
                          </div>

                          {/* Action Direction */}
                          <div className="col-span-1 flex flex-col gap-6 items-center justify-center">
                            <span className="text-indigo-950 font-display font-black text-sm md:text-base animate-pulse">➔</span>
                            <span className="text-indigo-950 font-display font-black text-sm md:text-base animate-pulse">➔</span>
                            <span className="text-indigo-950 font-display font-black text-sm md:text-base animate-pulse">➔</span>
                          </div>

                          {/* Reaction Vessel (Chlorophyll Pot) */}
                          <div className="col-span-3 flex flex-col items-center justify-center p-2 bg-[#D8F3DC] border-3 border-indigo-950 rounded-full w-20 h-20 md:w-22 md:h-22 mx-auto shadow-[3px_3px_0px_0px_#1E1B4B] animate-wiggle">
                            <span className="text-3xl">🪴</span>
                            <span className="text-[8px] font-display font-black text-emerald-800 uppercase tracking-widest leading-none mt-1.5">
                              CHLOROPHYLL
                            </span>
                          </div>

                          {/* Product Out Direction */}
                          <div className="col-span-1 flex flex-col gap-5 items-center justify-center">
                            <span className="text-indigo-950 font-display font-black text-sm md:text-base">➔</span>
                            <span className="text-indigo-950 font-display font-black text-sm md:text-base">➔</span>
                          </div>

                          {/* Outputs */}
                          <div className="col-span-3 flex flex-col gap-3">
                            <div className="bg-emerald-100 border-2.5 border-indigo-950 rounded-2xl p-2 flex flex-col items-center justify-center shadow-[2px_2px_0px_0px_#1E1B4B] transform hover:scale-[1.03] transition-transform">
                              <span className="text-base">🌬️</span>
                              <span className="font-display font-black text-[9px] text-[#1e1b4b] uppercase tracking-wider leading-none mt-1">O₂ Gas</span>
                              <span className="text-[7.5px] font-medium text-emerald-750/70 leading-none mt-0.5">Oxygen Out</span>
                            </div>
                            <div className="bg-rose-100 border-2.5 border-indigo-950 rounded-2xl p-2 flex flex-col items-center justify-center shadow-[2px_2px_0px_0px_#1E1B4B] transform hover:scale-[1.03] transition-transform">
                              <span className="text-base">🍒</span>
                              <span className="font-display font-black text-[9px] text-rose-950 uppercase tracking-wider leading-none mt-1">GLUCOSE</span>
                              <span className="text-[7.5px] font-medium text-rose-850/70 leading-none mt-0.5">Sugar Storage</span>
                            </div>
                          </div>

                        </div>

                        <div className="mt-4 p-2.5 bg-white/60 border-2 border-indigo-950/10 rounded-xl">
                          <p className="text-[10px] leading-relaxed font-display font-semibold text-indigo-950/85 text-center">
                            💡 <b>Insight</b>: Sunlight power is captured by the green Chlorophyll engine within plant cells, splitting water molecules to cook glucose and release exhaust oxygen!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-2 text-[9px] font-mono font-bold text-[#5C509C]/60 px-1.5 self-start">
                    <span>10:31 AM</span>
                    {!isGizmo && <span className="text-[#7D69EC] text-xs font-black">✓✓</span>}
                  </div>
                </div>

                {!isGizmo ? (
                  <div className="w-10 h-10 rounded-2xl bg-white border-2.5 border-indigo-950 shadow-[2px_2px_0px_0px_#1E1B4B] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <StudyAvatar type={activeAvatar} className="w-8 h-8" />
                  </div>
                ) : null}
              </div>
            );
          })}
          {loading && (
            <div className="flex gap-3.5 items-start justify-start">
              <div className="w-10 h-10 rounded-2xl bg-white border-2.5 border-indigo-950 shadow-[2px_2px_0px_0px_#1E1B4B] flex items-center justify-center flex-shrink-0 animate-spin">
                <CuteRobotAvatar className="w-9 h-9" />
              </div>
              <div className="px-4.5 py-3.5 bg-white border-3 border-indigo-950 rounded-2xl rounded-tl-none font-display font-black text-xs text-indigo-950 shadow-[3px_3px_0px_0px_#1E1B4B] flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7D69EC]"></span>
                </span>
                <span>Gizmo is calculating response...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggestion Chips underneath list */}
      <div className="pb-3 flex flex-wrap gap-2">
        <button
          onClick={() => handleSendMessage("Can you give me a real life example of how photosynthesis feeds trees?")}
          className="cartoon-btn px-3 py-2 bg-white hover:bg-yellow-55 text-indigo-950 font-display font-black text-xs cursor-pointer shadow-[2px_2px_0px_0px_#1E1B4B]"
        >
          Give photosynthesis example 🌿
        </button>
        <button
          onClick={() => handleSendMessage("Please solve the math equation shown on my attached image! Can we break it down?", attachedImage)}
          disabled={!attachedImage}
          className={`cartoon-btn px-3 py-2 font-display font-black text-xs cursor-pointer shadow-[2px_2px_0px_0px_#1E1B4B] transition-all duration-200 ${
            attachedImage 
              ? "bg-[#C4FAF8] text-teal-950 hover:bg-[#A3F6F4] border-indigo-950" 
              : "bg-gray-100 text-gray-400 border-gray-300 opacity-50 cursor-not-allowed shadow-none"
          }`}
        >
          Solve math on image 📐
        </button>
        <button
          onClick={() => handleSendMessage("Can you teach me how a solar system orbit works by generating a study diagram for it?")}
          className="cartoon-btn px-3 py-2 bg-[#FFFDF0] hover:bg-yellow-50 text-[#7D69EC] font-display font-black text-xs cursor-pointer shadow-[2px_2px_0px_0px_#1E1B4B]"
        >
          Teach Orbits with drawing 🪐
        </button>
        <button
          onClick={() => {
            playSound("pop");
            handleSendMessage("Quiz me on photosynthesis!");
          }}
          className="cartoon-btn px-3 py-2 bg-[#FFFDF0] hover:bg-yellow-50 text-[#7D69EC] font-display font-black text-xs cursor-pointer shadow-[2px_2px_0px_0px_#1E1B4B]"
        >
          Quiz me on this! ❓
        </button>
      </div>

      {/* Selected Image Thumbnail Preview Area */}
      {attachedImage && (
        <div className="mb-2.5 p-2 bg-[#E6FFFE] border-3 border-indigo-950 rounded-2xl flex items-center gap-3 animate-fade-in shadow-[2px_2px_0px_0px_#1E1B4B] max-w-sm self-start">
          <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-indigo-950 bg-white relative flex-shrink-0">
            <img 
              src={`data:${attachedImage.mimeType};base64,${attachedImage.data}`} 
              alt="Attached preview" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-display font-black text-indigo-950 truncate">
              Attached Math Problem File
            </p>
            <p className="text-[8.5px] font-mono font-bold text-gray-400 capitalize pt-0.5">
              {(attachedImage.mimeType.split("/")[1] || "Image")} • Ready to solve
            </p>
          </div>
          <button
            type="button"
            onClick={removeAttachedImage}
            className="w-6 h-6 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-600 border-2 border-indigo-950 flex items-center justify-center font-display font-black text-xs cursor-pointer active:scale-90 transition-transform flex-shrink-0"
            title="Remove file"
          >
            ×
          </button>
        </div>
      )}

      {/* Input component matching reference mock */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(input);
        }}
        className="mt-auto flex items-center bg-white border-3 border-indigo-950 rounded-2xl px-4 py-2.5 shadow-[3px_3px_0px_0px_#1E1B4B]"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        <div className="flex items-center gap-1 text-indigo-950/70 mr-3 border-r-3 border-indigo-950/10 pr-2">
          <button
            type="button"
            onClick={() => { playSound("pop"); fileInputRef.current?.click(); }}
            className="p-1.5 hover:bg-indigo-50 active:scale-95 transition-all rounded-lg cursor-pointer duration-100"
            title="Attach Math Drawing"
          >
            <Paperclip className="w-4 h-4 text-indigo-950" />
          </button>
          <button
            type="button"
            onClick={() => { playSound("pop"); fileInputRef.current?.click(); }}
            className="p-1.5 hover:bg-indigo-50 active:scale-95 transition-all rounded-lg cursor-pointer duration-100"
            title="Insert Math Image"
          >
            <Image className="w-4 h-4 text-indigo-950" />
          </button>
          <button
            type="button"
            onClick={() => playSound("pop")}
            className="p-1.5 hover:bg-indigo-50 active:scale-95 transition-all rounded-lg cursor-pointer duration-100 animate-pulse"
            title="Drag & Drop images directly anywhere on the screen!"
          >
            <Mic className="w-4 h-4 text-emerald-500" />
          </button>
        </div>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={attachedImage ? "File attached! Describe the math question to solve..." : "Ask Gizmo anything, or drag an image here to solve..."}
          className="flex-grow bg-transparent text-xs sm:text-sm focus:outline-none text-[#1E1B4B] font-display font-black leading-none py-1.5 tracking-wide placeholder-slate-400"
        />

        <button
          type="submit"
          className="cartoon-btn ml-2 px-4 py-2 bg-[#7D69EC] hover:bg-[#6853DF] text-white font-display font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_0px_#1E1B4B]"
          title="Send"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
        </button>
      </form>

    </div>
  );
}
