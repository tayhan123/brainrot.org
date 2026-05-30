import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, MessageCircle, RefreshCw, ThumbsUp, ArrowRight } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
}

interface ChatAssistantProps {
  addXp: (amount: number, reason: string) => void;
}

export default function ChatAssistant({ addXp }: ChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "Hey, study champ! I'm Gizmo, your AI Study Buddy! ✨ Ready to locks-maxx your brain? You can ask me to explain any complex topic simply, write a roadmap, or test you!",
      time: "10:30 AM",
    }
  ]);
  const [inputVal, setInputVal] = useState("");
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
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      content: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsLoading(true);
    playChime("bubble");

    try {
      // Build proper chat context history
      // Keep only key fields matching { role, content }
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        throw new Error("Gizmo took too long or is asleep.");
      }

      const data = await res.json();
      const assistantMsg: Message = {
        id: Math.random().toString(),
        role: "assistant",
        content: data.content,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

  return (
    <div className="max-w-3xl mx-auto py-2">
      <div className="cartoon-card bg-[#FBF7F0] p-4 md:p-6 flex flex-col h-[600px] relative overflow-hidden">
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
                <div>
                  <div
                    className={`p-3 md:p-4 border-3 border-indigo-950 rounded-2xl text-sm font-sans ${
                      isGizmo
                        ? "bg-white text-indigo-950 rounded-tl-none shadow-[3px_3px_0px_0px_rgba(30,27,75,1)]"
                        : "bg-indigo-100 text-indigo-950 rounded-tr-none shadow-[3px_3px_0px_0px_rgba(30,27,75,1)]"
                    }`}
                  >
                    {/* Preserve rich typography linebreaks */}
                    <p className="whitespace-pre-wrap leading-relaxed inline-block">{msg.content}</p>
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 font-mono mt-1 block px-1">
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
                onClick={() => handleQuickPrompt("Explain photosynthesis in simple terms") }
                className="text-[11px] font-display font-bold px-3 py-1 bg-yellow-200 border-2 border-indigo-950 rounded-xl hover:bg-yellow-300 active:translate-y-0.5 transition-all"
              >
                🌱 Photosynthesis Simple
              </button>
              <button
                onClick={() => handleQuickPrompt("Explain Newton's laws with an exciting analogy") }
                className="text-[11px] font-display font-bold px-3 py-1 bg-pink-200 border-2 border-indigo-950 rounded-xl hover:bg-pink-300 active:translate-y-0.5 transition-all"
              >
                🍎 Newton's Laws
              </button>
              <button
                onClick={() => handleQuickPrompt("Give me a cheat sheet map for calculus integrals") }
                className="text-[11px] font-display font-bold px-3 py-1 bg-sky-200 border-2 border-indigo-950 rounded-xl hover:bg-sky-300 active:translate-y-0.5 transition-all"
              >
                📐 Integral Cheat Sheet
              </button>
            </div>
          </div>
        )}

        {/* Input area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputVal);
          }}
          className="flex gap-2.5 items-center mt-auto bg-white p-1 rounded-2xl border-3 border-indigo-950 shadow-[4px_4px_0px_0px_rgba(30,27,75,1)]"
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isLoading}
            placeholder="Ask anything, Gizmo will breakdown..."
            className="flex-1 font-sans text-sm py-3 px-4 focus:outline-none rounded-xl"
          />
          <button
            type="submit"
            disabled={isLoading || !inputVal.trim()}
            className="cartoon-btn p-3 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 disabled:opacity-50 text-white flex items-center justify-center mr-1"
          >
            <Send className="w-5 h-5 fill-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
