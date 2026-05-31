import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, MessageCircle, RefreshCw, ThumbsUp, ArrowRight, Image as ImageIcon, Paperclip, X, Download } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  attachedImage?: string; // base64 representation of attached image
  generatedImage?: string; // base64 or URL representation of assistant's drawing
}

interface ChatAssistantProps {
  addXp: (amount: number, reason: string) => void;
}

export default function ChatAssistant({ addXp }: ChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "Hey, study champ! I'm Gizmo, your AI Study Buddy! ✨ Ready to locks-maxx your brain? You can ask me to explain any complex topic simply, write a roadmap, test you, or generate/view visual drawings & diagrams! Or ask me to solve any math formula by uploading an image!",
      time: "10:30 AM",
    }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const playChime = (style: "bubble" | "pop") => {
    try {
      const isAudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!isAudioContext) return;
      const ctx = new isAudioContext();
      if (style === "bubble") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else {
        // Pop sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.setValueAtTime(300, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch (_) {}
  };

  const handleSendMessage = async (textToSend: string) => {
    if ((!textToSend.trim() && !selectedImage) || isLoading) return;

    const base64Attached = selectedImage ? selectedImage.data : undefined;

    const userMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      content: textToSend.trim() || "What does this image show? Solve or explain it to me nicely, Gizmo!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedImage: base64Attached,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setSelectedImage(null);
    setIsLoading(true);
    playChime("bubble");

    try {
      // Build proper chat context history
      const history = [...messages, userMsg].map((m) => {
        const mapped: any = {
          role: m.role,
          content: m.content,
        };
        if (m.attachedImage) {
          const match = m.attachedImage.match(/^data:(image\/[a-zA-Z+.-]+);base64,/);
          const mimeType = match ? match[1] : "image/png";
          mapped.image = {
            data: m.attachedImage,
            mimeType: mimeType
          };
        }
        return mapped;
      });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        let errMsg = "Gizmo took too long or is asleep.";
        try {
          const errData = await res.json();
          if (errData && (errData.error || errData.message)) {
            errMsg = errData.error || errData.message;
          }
        } catch {
          try {
            const txt = await res.text();
            if (txt && txt.length < 200) errMsg = txt;
          } catch {}
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      const assistantMsg: Message = {
        id: Math.random().toString(),
        role: "assistant",
        content: data.content,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        generatedImage: data.generatedImage,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      playChime("pop");
      addXp(10, "Brain cells unlocked with study assistant! 🧠");
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "assistant",
          content: "Oops! My antennas are static-y. Please make sure the Gemini API key is valid in Settings > Secrets fr fr! No cap. Else try a fresh message!",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    if (isLoading) return;
    handleSendMessage(promptText);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, WebP), study mate! 🖼️");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage({
        data: reader.result as string,
        mimeType: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-2">
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="cartoon-card bg-[#FBF7F0] p-4 md:p-6 flex flex-col h-[600px] relative overflow-hidden"
      >
        {/* Hidden File Picker */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange}
          accept="image/*" 
          className="hidden" 
        />

        {/* Drag Over Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-indigo-500/10 backdrop-blur-xs border-4 border-dashed border-indigo-500 rounded-3xl flex flex-col items-center justify-center z-50 pointer-events-none">
            <div className="bg-[#FAF6F0] p-6 rounded-3xl border-4 border-indigo-950 shadow-[4px_4px_0px_0px_rgba(30,27,75,1)] flex flex-col items-center gap-2">
              <span className="text-4xl animate-bounce">📥</span>
              <p className="font-display font-black text-indigo-950">Drop Study Photo to solve!</p>
            </div>
          </div>
        )}

        {/* Chat Header matching the cartoon mockup theme */}
        <div className="flex items-center justify-between border-b-4 border-indigo-950 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 bg-purple-300 rounded-full border-3 border-indigo-950 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]">
                <span className="text-3xl animate-bounce">🤖</span>
              </div>
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-lime-400 border-2 border-indigo-950 rounded-full"></div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-display font-black text-xl text-indigo-950">Gizmo</h3>
                <span className="px-1.5 py-0.5 bg-rose-200 text-rose-700 text-[10px] uppercase font-bold rounded-lg border border-rose-400 font-sans tracking-wide">
                  Study Buddy 💖
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">Ready to explain anything, no cap</p>
            </div>
          </div>
          <button
            onClick={() => {
              setMessages([
                {
                  id: "clear-ref",
                  role: "assistant",
                  content: "Hey, study mate! Our memory is cleared! What are we locking-in on today?",
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ]);
            }}
            title="Wipe Chat History"
            className="cartoon-btn p-2 bg-pink-100 hover:bg-pink-200 text-indigo-950"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Area Scrollable */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
          {messages.map((msg) => {
            const isGizmo = msg.role === "assistant";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${isGizmo ? "mr-auto text-left" : "ml-auto flex-row-reverse text-right"}`}
              >
                {/* Micro avatar */}
                <div className="flex-shrink-0">
                  {isGizmo ? (
                    <div className="w-9 h-9 bg-purple-200 rounded-full border-2 border-indigo-950 flex items-center justify-center text-xl shadow-[1px_1px_0px_0px_rgba(30,27,75,1)]">
                      🤖
                    </div>
                  ) : (
                    <div className="w-9 h-9 bg-amber-200 rounded-full border-2 border-indigo-950 flex items-center justify-center text-xl shadow-[1px_1px_0px_0px_rgba(30,27,75,1)]">
                      🎓
                    </div>
                  )}
                </div>

                {/* Bubble card */}
                <div className="flex flex-col items-start gap-1">
                  <div
                    className={`p-3 md:p-4 border-3 border-indigo-950 rounded-2xl text-sm font-sans ${
                      isGizmo
                        ? "bg-white text-indigo-950 rounded-tl-none shadow-[3px_3px_0px_0px_rgba(30,27,75,1)]"
                        : "bg-indigo-100 text-indigo-950 rounded-tr-none shadow-[3px_3px_0px_0px_rgba(30,27,75,1)]"
                    }`}
                  >
                    {/* Preserve rich typography linebreaks */}
                    <p className="whitespace-pre-wrap leading-relaxed inline-block">{msg.content}</p>

                    {/* Image from user (uploaded) */}
                    {!isGizmo && msg.attachedImage && (
                      <div className="mt-2.5 max-w-xs rounded-xl overflow-hidden border-3 border-indigo-950 shadow-[2px_2px_0px_0px_rgba(30,27,75,1)] bg-white">
                        <img 
                          src={msg.attachedImage} 
                          alt="Attached problem/formula sketch" 
                          className="max-h-48 w-full object-cover select-none"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {/* Image from Gizmo (generated/drawn code concept flowchart) */}
                    {isGizmo && msg.generatedImage && (
                      <div className="mt-3 max-w-sm rounded-xl overflow-hidden border-3 border-indigo-950 shadow-[3px_3px_0px_0px_rgba(30,27,75,1)] bg-white">
                        <div className="bg-indigo-950 text-white px-2.5 py-1 text-[10px] font-display font-black tracking-wide flex justify-between items-center border-b-2 border-indigo-950">
                          <span>🎨 GIZMO VISUAL SKETCH</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = document.createElement("a");
                              link.href = msg.generatedImage!;
                              link.download = `gizmo-diagram-${msg.id || "export"}.png`;
                              if (msg.generatedImage!.startsWith("data:image/svg")) {
                                link.download = `gizmo-diagram-${msg.id || "export"}.svg`;
                              }
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-1.5 py-0.5 rounded text-[9px] font-bold border border-white flex items-center gap-1 leading-none shadow-[1px_1px_0px_0px_white]"
                          >
                            <Download className="w-2.5 h-2.5" /> Save
                          </button>
                        </div>
                        <div className="p-1 bg-gray-50 flex items-center justify-center">
                          <img 
                            src={msg.generatedImage} 
                            alt="Gizmo educational diagram drawing" 
                            className="max-h-60 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold text-gray-500 font-mono mt-0.5 block px-1 ${!isGizmo ? "self-end" : ""}`}>
                    {msg.time}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 mr-auto items-center max-w-[85%]">
              <div className="w-9 h-9 bg-purple-200 rounded-full border-2 border-indigo-950 flex items-center justify-center text-xl animate-spin">
                ⚙️
              </div>
              <div className="p-3 bg-white text-indigo-950 border-3 border-indigo-950 rounded-2xl rounded-tl-none shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce delay-75"></span>
                  <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce delay-150"></span>
                  <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce delay-300"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Help suggestions from Gizmo if chat is blank / low stats */}
        {messages.length < 5 && (
          <div className="mb-3">
            <span className="text-xs font-display font-black text-indigo-950 mr-2 uppercase block md:inline mb-1 md:mb-0">
              Quick Study Helpers:
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <button
                onClick={() => handleQuickPrompt("Draw an educational diagram showing how photosynthesis transforms solar energy!") }
                className="text-[11px] font-display font-medium px-3 py-1 bg-yellow-200 border-2 border-indigo-950 rounded-xl hover:bg-yellow-300 active:translate-y-0.5 transition-all"
              >
                🎨 Draw Photosynthesis
              </button>
              <button
                onClick={() => handleQuickPrompt("Draw a cool physics gravity diagram illustrating objects orbiting a star!") }
                className="text-[11px] font-display font-medium px-3 py-1 bg-pink-200 border-2 border-indigo-950 rounded-xl hover:bg-pink-300 active:translate-y-0.5 transition-all"
              >
                🪐 Draw Orbits
              </button>
              <button
                onClick={triggerFileSelect}
                type="button"
                className="text-[11px] font-display font-medium px-3 py-1 bg-emerald-200 border-2 border-indigo-950 rounded-xl hover:bg-emerald-300 active:translate-y-0.5 transition-all inline-flex items-center gap-1.5"
              >
                📷 Upload Scan / Math Eq
              </button>
            </div>
          </div>
        )}

        {/* Attachment preview */}
        {selectedImage && (
          <div className="mb-2.5 p-2 bg-indigo-50 border-3 border-indigo-950 rounded-xl flex items-center justify-between gap-3 animate-fade-in shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]">
            <div className="flex items-center gap-2 overflow-hidden">
              <img 
                src={selectedImage.data} 
                alt="Upload preview" 
                className="w-10 h-10 object-cover rounded-lg border-2 border-indigo-950" 
                referrerPolicy="no-referrer"
              />
              <div className="text-left overflow-hidden">
                <p className="text-xs font-bold text-indigo-950 truncate max-w-[200px]">{selectedImage.name}</p>
                <p className="text-[10px] text-gray-500 font-mono font-bold">Image ready & attached for scanner!</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="p-1 bg-rose-200 hover:bg-rose-300 text-rose-800 rounded-full border-2 border-indigo-950 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputVal);
          }}
          className="flex gap-2 items-center mt-auto bg-white p-1.5 rounded-2xl border-3 border-indigo-950 shadow-[4px_4px_0px_0px_rgba(30,27,75,1)]"
        >
          {/* File attachment button icon */}
          <button
            type="button"
            title="Attach a scan, diagram or formula"
            onClick={triggerFileSelect}
            className="p-2.5 bg-indigo-100 hover:bg-indigo-200 rounded-xl border-2 border-indigo-950 text-indigo-950 transition-all flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(30,27,75,1)] hover:-translate-y-0.5"
          >
            <ImageIcon className="w-5 h-5 animate-pulse" />
          </button>

          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isLoading}
            placeholder={selectedImage ? "Describe this image or click send..." : "Ask Gizmo anything, drag images here, or click 📷..."}
            className="flex-1 font-sans text-sm py-2.5 px-3 focus:outline-none rounded-xl"
          />
          <button
            type="submit"
            disabled={isLoading || (!inputVal.trim() && !selectedImage)}
            className="cartoon-btn p-3 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 disabled:opacity-50 text-white flex items-center justify-center"
          >
            <Send className="w-4 h-4 fill-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
