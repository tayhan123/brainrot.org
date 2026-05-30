import { useState } from "react";
import { ArrowLeft, Sparkles, Copy, FileText, Check, RotateCw, ChevronLeft, ChevronRight, Layers, Eye } from "lucide-react";

interface SummarizerProps {
  addXp: (amount: number, reason: string) => void;
  playSound: (type: "bloop" | "success" | "fail" | "pop" | "levelUp") => void;
  onBack: () => void;
}

export default function Summarizer({ addXp, playSound, onBack }: SummarizerProps) {
  // Sub-tabs switcher
  const [activeTab, setActiveTab] = useState<"summarize" | "flashcards">("summarize");

  // Speed Digest States
  const [inputText, setInputText] = useState("");
  const [format, setFormat] = useState<"paragraph" | "bullets" | "brainrot">("bullets");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Flashcards States
  const [fcTopic, setFcTopic] = useState("");
  const [fcLoading, setFcLoading] = useState(false);
  const [fcCards, setFcCards] = useState<Array<{ front: string; back: string }>>([
    { front: "What is Mitosis? 🧬", back: "A type of cell division that results in two daughter cells each having the same number and kind of chromosomes as the parent nucleus." },
    { front: "Define Kinetic Energy ⚡", back: "The energy which an object possesses due to its motion, calculated as 1/2 * m * v²." },
    { front: "Solve for x: 3x + 12 = 27 📐", back: "Subtract 12: 3x = 15. Divide by 3: x = 5." }
  ]);
  const [fcIndex, setFcIndex] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);

  // Summarize Handler
  const fetchSummary = async () => {
    if (!inputText.trim() || loading) return;
    playSound("pop");
    setLoading(true);
    setSummary("");

    try {
      const resp = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, format })
      });

      if (!resp.ok) throw new Error("Could not summarize text!");
      const data = await resp.json();
      setSummary(data.summary);
      playSound("success");
      addXp(25, "Summarized text block into speed runs! 📚");
    } catch (e: any) {
      playSound("fail");
      alert(`⚠️ Summarizer error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    playSound("bloop");
    setTimeout(() => setCopied(false), 2000);
  };

  // Flashcard Generator Handler
  const generateFlashcards = async () => {
    if (!fcTopic.trim() || fcLoading) return;
    playSound("pop");
    setFcLoading(true);
    setFcFlipped(false);

    try {
      const resp = await fetch("/api/generate-flashcards-wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: fcTopic })
      });

      if (!resp.ok) throw new Error("Our AI scribes couldn't assemble flashcards.");
      const data = await resp.json();
      
      if (data.cards && Array.isArray(data.cards) && data.cards.length > 0) {
        setFcCards(data.cards);
        setFcIndex(0);
        playSound("success");
        addXp(30, "Molded 5 brand-new AI Study Flashcards! 🎴");
      } else {
        throw new Error("Invalid structure returned.");
      }
    } catch (e: any) {
      playSound("fail");
      alert(`⚠️ Flashcard Builder error: ${e.message}`);
    } finally {
      setFcLoading(false);
    }
  };

  const handlePrevCard = () => {
    playSound("bloop");
    setFcFlipped(false);
    setTimeout(() => {
      setFcIndex((prev) => (prev > 0 ? prev - 1 : fcCards.length - 1));
    }, 150);
  };

  const handleNextCard = () => {
    playSound("bloop");
    setFcFlipped(false);
    setTimeout(() => {
      setFcIndex((prev) => (prev < fcCards.length - 1 ? prev + 1 : 0));
    }, 150);
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF9FF] relative rounded-2xl">
      {/* Top Navigation & Workspace Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-indigo-950/10 gap-3">
        <div>
          <h2 className="text-3xl font-display font-black text-[#1E1B4B] flex items-center gap-2">
            AI Flashcards & Speed Digests <span className="animate-wiggle inline-block">🎴</span>
          </h2>
          <p className="text-xs font-semibold text-gray-500 uppercase mt-0.5 tracking-wider">
            Slay long lectures or auto-generate custom mnemonic revision queues with interactive flip reviews!
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Subtabs controls */}
          <div className="flex bg-indigo-950/5 p-1 rounded-xl border border-indigo-955/10">
            <button
              onClick={() => { playSound("bloop"); setActiveTab("summarize"); }}
              className={`px-3 py-1.5 text-xs font-display font-black rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === "summarize"
                  ? "bg-white border border-indigo-950/20 text-indigo-950 shadow-[1px_1.5px_0px_0px_rgba(30,27,75,1)]"
                  : "text-gray-500 hover:text-indigo-950"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Speed Digests</span>
            </button>
            <button
              onClick={() => { playSound("bloop"); setActiveTab("flashcards"); }}
              className={`px-3 py-1.5 text-xs font-display font-black rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === "flashcards"
                  ? "bg-white border border-indigo-950/20 text-indigo-950 shadow-[1px_1.5px_0px_0px_rgba(30,27,75,1)]"
                  : "text-gray-500 hover:text-indigo-950"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Flashcard Arena</span>
            </button>
          </div>

          <button
            onClick={onBack}
            className="cartoon-btn px-3.5 py-2 bg-white text-indigo-955 font-display font-black text-xs flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 shadow-[2px_2px_0px_0px_#1E1B4B]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Main Container Views */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar min-h-0 pb-4">
        {activeTab === "summarize" ? (
          /* ==================== SPEED DIGEST SUITE ==================== */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch min-h-0">
            
            {/* Left Panel: Input & Settings */}
            <div className="space-y-4 flex flex-col justify-between p-5 bg-white border-3 border-indigo-950 rounded-3xl shadow-[4px_4px_0px_0px_#1E1B4B]">
              <div>
                <label className="text-xs font-display font-black text-[#7D69EC] uppercase tracking-wider mb-2 block">
                  📝 PASTE YOUR CHUNKS OF STUDY TEXT:
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste paragraphs, copy-pasted lectures, or homework questions here..."
                  className="cartoon-input w-full h-44 px-4 py-3 text-sm font-semibold text-indigo-955 placeholder-gray-400 bg-[#FAF9FF] leading-relaxed resize-none focus:outline-none"
                />
              </div>

              {/* Format selecting pills */}
              <div>
                <label className="text-xs font-display font-black text-[#7D69EC] uppercase tracking-wider mb-2 block">
                  ⚡ CHOOSE COMPRESSION MODE:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { playSound("bloop"); setFormat("paragraph"); }}
                    className={`cartoon-btn py-2 px-1 text-xs font-display font-black transition-all cursor-pointer ${
                      format === "paragraph"
                        ? "bg-[#7D69EC] text-white border-indigo-950 shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]"
                        : "bg-white text-indigo-950 border-indigo-950 hover:bg-gray-50"
                    }`}
                  >
                    📝 Paragraph
                  </button>
                  <button
                    type="button"
                    onClick={() => { playSound("bloop"); setFormat("bullets"); }}
                    className={`cartoon-btn py-2 px-1 text-xs font-display font-black transition-all cursor-[pointer] ${
                      format === "bullets"
                        ? "bg-[#7D69EC] text-white border-indigo-950 shadow-[2px_2px_0px_100_rgba(30,27,75,1)] shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]"
                        : "bg-white text-indigo-950 border-indigo-950 hover:bg-gray-50"
                    }`}
                  >
                    📌 Bullets
                  </button>
                  <button
                    type="button"
                    onClick={() => { playSound("bloop"); setFormat("brainrot"); }}
                    className={`cartoon-btn py-2 px-1 text-xs font-display font-black transition-all cursor-[pointer] ${
                      format === "brainrot"
                        ? "bg-[#BDB2FF] text-[#1E1B4B] border-indigo-950 shadow-[2px_2px_0px_0px_rgba(30,27,75,1)] animate-pulse"
                        : "bg-white text-indigo-955 border-indigo-950 hover:bg-gray-50"
                    }`}
                    title="Summarize in hilarious Gen-Z slang!"
                  >
                    🤪 Brainrot
                  </button>
                </div>
              </div>

              {/* Action Trigger Button */}
              <button
                onClick={fetchSummary}
                disabled={loading || !inputText.trim()}
                className="cartoon-btn w-full py-3.5 bg-yellow-300 hover:bg-yellow-400 text-indigo-950 border-indigo-950 font-display font-black text-sm tracking-wide disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]"
              >
                <Sparkles className="w-4 h-4 text-[#7D69EC] animate-spin" />
                <span>{loading ? "Comminuting facts..." : "Make TL;DR Summary!"}</span>
              </button>
            </div>

            {/* Right Panel: Output Brief */}
            <div className="flex flex-col">
              {loading ? (
                <div className="flex-1 flex flex-col justify-center items-center p-8 bg-white border-3 border-indigo-950 rounded-3xl shadow-[4px_4px_0px_0px_#1E1B4B] text-center">
                  <span className="text-5xl animate-bounce mb-3 inline-block">🚀</span>
                  <h4 className="font-display font-black text-lg text-indigo-950">Gizmo is reading your homework...</h4>
                  <p className="text-gray-550 font-sans text-xs mt-1 max-w-xs font-semibold">Running smart NLP summaries. Hang tight!</p>
                </div>
              ) : summary ? (
                <div className="flex-1 cartoon-card bg-white p-5 border-3 border-indigo-950 animate-float flex flex-col justify-between shadow-[4px_4px_0px_0px_#1E1B4B]">
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-dashed border-indigo-950/10">
                      <span className="text-xs font-display font-black text-[#7D69EC] uppercase tracking-wider">
                        {format === "brainrot" ? "🤪 SHOCKING COGNITIVE BRIEF" : "📖 COMPILED STUDY BRIEF"}
                      </span>
                      
                      <button
                        onClick={handleCopy}
                        className="cartoon-btn p-1.5 bg-gray-50 hover:bg-gray-100 text-indigo-955 flex items-center justify-center cursor-pointer"
                        title="Copy summary"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Scrollable text box */}
                    <div className="flex-1 font-sans text-indigo-950 text-sm whitespace-pre-line leading-relaxed overflow-y-auto pr-1 scrollbar max-h-[320px] font-medium">
                      {summary}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1E1B4B]/14 flex justify-between items-center text-[10px] font-display font-black text-emerald-600 uppercase tracking-widest">
                    <span>✨ +25 XP AWARDED ON SAVE!</span>
                    <span>Gizmo Ver 1.4</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center p-8 bg-[#EBE9FE]/30 border-3 border-dashed border-indigo-950/20 rounded-3xl text-center">
                  <span className="text-4xl mb-2.5">🪐</span>
                  <p className="font-display font-black text-indigo-955/60 text-sm">Waiting for Study Input</p>
                  <p className="text-xs text-gray-400 font-semibold max-w-xs mt-0.5">Your bulleted digests or Gen-Z brainrot cheat sheets will generate in real-time here.</p>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* ==================== AI FLASHCARD ARENA ==================== */
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            
            {/* Left Column: Topic Input and Trigger (span 4/12) */}
            <div className="xl:col-span-4 p-5 bg-white border-3 border-indigo-950 rounded-3xl shadow-[4px_4px_0px_0px_#1E1B4B] space-y-4">
              <div className="pb-2.5 border-b-2 border-dashed border-indigo-950/10">
                <h4 className="font-display font-black text-indigo-955 text-sm uppercase tracking-wider flex items-center gap-1.5">
                  🪄 Dynamic Card Builder
                </h4>
                <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                  Let Gizmo's AI compile interactive flashcards on any academic topic!
                </p>
              </div>

              <div>
                <label className="text-[10px] font-display font-black text-[#7D69EC] uppercase tracking-wider mb-2 block">
                  Study Topic:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Krebs Cycle, Solar System, WW1 Alliances"
                  value={fcTopic}
                  onChange={(e) => setFcTopic(e.target.value)}
                  disabled={fcLoading}
                  className="cartoon-input w-full px-3.5 py-2.5 text-xs font-bold text-indigo-955 placeholder-gray-400 bg-[#FAF9FF]"
                />
              </div>

              <button
                onClick={generateFlashcards}
                disabled={fcLoading || !fcTopic.trim()}
                className="cartoon-btn w-full py-3 bg-[#D6C7FF] text-indigo-950 hover:bg-[#C2AFFA] border-indigo-950 text-xs font-display font-black disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-[2px_2px_0px_0px_#1E1B4B]"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#7D69EC] animate-pulse" />
                <span>{fcLoading ? "Forging cards..." : "Forge AI Flashcards!"}</span>
              </button>

              <div className="p-3 bg-purple-50 rounded-xl border border-indigo-950/5 text-[10px] font-sans font-medium text-indigo-910 leading-relaxed">
                💡 <strong>Tip:</strong> Each deck contains exactly 5 highly-targeted front and back card templates for supercharges retention rates.
              </div>
            </div>

            {/* Right Column: Flashcard Flip Board (span 8/12) */}
            <div className="xl:col-span-8 space-y-4">
              {fcCards.length > 0 ? (
                <div className="flex flex-col items-center">
                  
                  {/* Interactive Flip Card Container */}
                  <div 
                    onClick={() => { playSound("pop"); setFcFlipped(!fcFlipped); }}
                    className="w-full max-w-md aspect-[1.6] bg-white border-3 border-indigo-950 rounded-3xl relative cursor-pointer select-none shadow-[6px_6px_0px_0px_rgba(30,27,75,1)] hover:-translate-y-1 transition-transform duration-300 ease-out flex flex-col overflow-hidden"
                  >
                    {/* Progress tag line */}
                    <div className="px-5 py-2.5 bg-indigo-50 border-b-2 border-indigo-950/10 flex justify-between items-center text-[10px] font-display font-black text-[#7D69EC] select-none">
                      <span className="uppercase tracking-widest font-mono">⚡ STUDY CARD {fcIndex + 1} OF {fcCards.length}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {fcFlipped ? "ANSWERS VISIBLE" : "TAP TO FLIP"}
                      </span>
                    </div>

                    {/* Hand-written styled content container */}
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                      {fcFlipped ? (
                        <div className="space-y-2 animate-fadeIn">
                          <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-400/20 uppercase tracking-widest">
                            Explanation / Answer
                          </span>
                          <p className="font-sans font-semibold text-sm sm:text-base text-teal-950 px-4 leading-relaxed">
                            {fcCards[fcIndex]?.back}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 animate-fadeIn">
                          <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-400/20 uppercase tracking-widest">
                            Question / Concept
                          </span>
                          <p className="font-sans font-bold text-base sm:text-lg text-indigo-950 px-4 leading-tight">
                            {fcCards[fcIndex]?.front}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Helper Action Footer */}
                    <div className="px-5 py-2.5 bg-gray-50 border-t-2 border-indigo-950/10 flex justify-center items-center text-[11px] text-[#7D69EC] font-display font-black hover:bg-slate-50 transition-colors select-none">
                      <RotateCw className="w-3.5 h-3.5 mr-1.5 animate-spin-slow" />
                      <span>TAP DECK TO REVEAL FLIP SIDES</span>
                    </div>
                  </div>

                  {/* Tactile controls bar */}
                  <div className="flex items-center gap-4 mt-5">
                    <button
                      onClick={handlePrevCard}
                      className="cartoon-btn p-3 bg-white text-indigo-955 border-indigo-950 rounded-xl hover:bg-gray-50 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      title="Previous Card"
                    >
                      <ChevronLeft className="w-5 h-5 pointer-events-none" />
                    </button>

                    <button
                      onClick={() => { playSound("pop"); setFcFlipped(!fcFlipped); }}
                      className="cartoon-btn px-6 py-2.5 bg-[#FFDEB4] text-amber-955 font-display font-black text-xs cursor-pointer select-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      🔄 Flip Side
                    </button>

                    <button
                      onClick={handleNextCard}
                      className="cartoon-btn p-3 bg-white text-indigo-955 border-indigo-950 rounded-xl hover:bg-gray-50 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      title="Next Card"
                    >
                      <ChevronRight className="w-5 h-5 pointer-events-none" />
                    </button>
                  </div>

                  {/* Complete study checklist table for deck study references */}
                  <div className="w-full mt-6 bg-white border-3 border-indigo-950 rounded-3xl p-5 shadow-[4px_4px_0px_0px_#1E1B4B]">
                    <h5 className="font-display font-black text-[#1E1B4B] text-xs uppercase tracking-wider pb-2 border-b-2 border-indigo-950/10 mb-3 flex items-center gap-1.5">
                      📖 Complete Study Deck Reference (5 cards)
                    </h5>
                    
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar">
                      {fcCards.map((card, idx) => (
                        <div 
                          key={idx}
                          onClick={() => { playSound("bloop"); setFcIndex(idx); setFcFlipped(false); }}
                          className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-2 text-left ${idx === fcIndex ? "bg-indigo-50/50 border-[#7D69EC]" : "bg-white border-indigo-950/10 hover:border-indigo-950/40"}`}
                        >
                          <span className="text-[10px] font-mono font-black text-[#7D69EC] bg-[#FAF9FF] border-2 border-indigo-950/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-indigo-955">{card.front}</p>
                            <p className="text-[11px] font-semibold text-gray-500 line-clamp-1 mt-0.5">{card.back}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="p-12 text-center bg-[#FAF9FF] border-3 border-dashed border-gray-200 rounded-3xl">
                  <span className="text-4xl block mb-2">🔭</span>
                  <p className="font-display font-black text-indigo-955 text-xs">No Flashcard collection active.</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
