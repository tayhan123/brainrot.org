import { useState } from "react";
import { ArrowLeft, Sparkles, AlertCircle, CheckCircle2, ChevronRight, HelpCircle } from "lucide-react";
import { Quiz, QuizQuestion } from "../types";

interface QuizViewProps {
  addXp: (amount: number, reason: string) => void;
  incrementQuizCount: () => void;
  playSound: (type: "bloop" | "success" | "fail" | "pop" | "levelUp") => void;
  onBack: () => void;
}

export default function QuizView({ addXp, incrementQuizCount, playSound, onBack }: QuizViewProps) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  
  // Game states
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);

  const presetTopics = [
    "Photosynthesis 🌿",
    "Newtonian Physics 🍎",
    "Ancient Roman Empire 🏛️",
    "JavaScript Closures 💻",
    "Human Brain Anatomy 🧠"
  ];

  const fetchQuiz = async (searchTopic: string) => {
    if (!searchTopic.trim() || loading) return;
    playSound("pop");
    setLoading(true);
    setQuiz(null);
    setCurrentIdx(0);
    setSelectedIdx(null);
    setIsAnswered(false);
    setScore(0);
    setQuizComplete(false);

    try {
      const resp = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: searchTopic })
      });

      if (!resp.ok) throw new Error("Our quiz server didn't respond!");
      const data = await resp.json();
      setQuiz(data);
      playSound("success");
    } catch (e: any) {
      playSound("fail");
      alert(`⚠️ Quiz generation error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswered || quizComplete) return;
    setSelectedIdx(idx);
    setIsAnswered(true);

    const isCorrect = idx === quiz?.questions[currentIdx].answerIndex;
    if (isCorrect) {
      playSound("success");
      setScore((s) => s + 1);
      addXp(15, `Correct Quiz Answer! +15 XP 🎯`);
    } else {
      playSound("fail");
    }
  };

  const handleNextQuestion = () => {
    if (!quiz) return;
    playSound("pop");
    
    if (currentIdx + 1 < quiz.questions.length) {
      setCurrentIdx((c) => c + 1);
      setSelectedIdx(null);
      setIsAnswered(false);
    } else {
      setQuizComplete(true);
      incrementQuizCount();
      const bonusXp = score * 10;
      addXp(bonusXp + 20, `Completed Quiz: "${quiz.quizTitle}"! 🏆`);
    }
  };

  const resetGame = () => {
    playSound("bloop");
    setQuiz(null);
    setCurrentIdx(0);
    setSelectedIdx(null);
    setIsAnswered(false);
    setScore(0);
    setQuizComplete(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF9FF] relative rounded-2xl">
      {/* Middle Workspace Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-indigo-950/10 gap-3">
        <div>
          <h2 className="text-3xl font-display font-black text-[#1E1B4B] flex items-center gap-2">
            Pop Quiz Arena <span className="animate-wiggle inline-block">❓</span>
          </h2>
          <p className="text-xs font-semibold text-gray-500 uppercase mt-0.5 tracking-wider">
            Test your key skills against Gizmo's custom generator!
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {quiz && !quizComplete && (
            <button
              onClick={resetGame}
              className="cartoon-btn px-4 py-2 bg-yellow-300 text-indigo-950 font-display font-black text-sm cursor-pointer hover:bg-yellow-400"
            >
              Change Topic
            </button>
          )}

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
      <div className="flex-1 overflow-y-auto pr-1 scrollbar space-y-4 pb-4 min-h-0">
        
        {/* Phase 1: Setup & Topic Selection */}
        {!loading && !quiz && !quizComplete && (
          <div className="space-y-6 max-w-xl mx-auto py-4">
            <div className="text-center">
              <span className="text-6xl block mb-2 animate-bounce">🧠</span>
              <h3 className="font-display font-black text-2xl text-indigo-950">MCQ Generator</h3>
              <p className="text-[#5C509C] font-display font-black text-xs mt-1.5 tracking-wide leading-relaxed">
                Gizmo converts any educational subject into interactive, multiple-choice questions in real-time!
              </p>
            </div>

            <div className="space-y-2.5">
              <label className="text-xs font-display font-black text-[#1E1B4B] uppercase tracking-widest block font-display font-black">
                CHOOSE A CUSTOM STUDY TOPIC:
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis, Ancient Rome, Chemistry, JavaScript"
                  className="cartoon-input flex-1 px-4 py-3 text-sm font-bold text-indigo-950 bg-white"
                />
                <button
                  onClick={() => fetchQuiz(topic)}
                  className="cartoon-btn px-6 py-3 bg-[#7D69EC] font-display font-black text-sm text-white hover:bg-[#6853DF] cursor-pointer"
                >
                  Generate Quiz!
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="p-5 bg-white border-3 border-indigo-950 rounded-3xl shadow-[4px_4px_0px_0px_#1E1B4B]">
              <p className="text-xs font-display font-black text-[#1E1B4B] mb-3 uppercase tracking-wider font-display font-black">
                ⚡ SPEEDRUN POPULAR PRESETS:
              </p>
              <div className="flex flex-wrap gap-2.5">
                {presetTopics.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setTopic(item.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "").trim());
                      fetchQuiz(item);
                    }}
                    className="cartoon-btn px-3.5 py-2.5 bg-yellow-55 hover:bg-yellow-102 border-3 border-indigo-955 text-[#1E1B4B] font-display font-black text-xs cursor-pointer shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading Phase */}
        {loading && (
          <div className="text-center max-w-sm mx-auto py-12 space-y-4 animate-float">
            <div className="inline-block text-6xl animate-bounce">🧪</div>
            <h4 className="font-display font-black text-xl text-indigo-950">Gizmo is cooking questions...</h4>
            <p className="text-gray-500 text-xs font-bold leading-relaxed">
              Generating trivia questions and smart explanations tailored to your studies!
            </p>
            <div className="w-16 h-16 border-t-4 border-b-4 border-[#7D69EC] rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* Phase 2: Play MCQ Trivia */}
        {quiz && !quizComplete && (
          <div className="max-w-xl mx-auto py-1 space-y-4">
            {/* Score & Progress */}
            <div className="flex justify-between items-center text-xs font-display font-black text-[#1E1B4B] bg-white px-4 py-3.5 border-3 border-indigo-950 rounded-2xl shadow-[3px_3px_0px_0px_rgba(30,27,75,1)]">
              <span className="flex items-center gap-1.5 truncate">
                <span>Quiz:</span>
                <b className="text-[#7D69EC] truncate font-black">{quiz.quizTitle}</b>
              </span>
              <span className="flex-shrink-0 bg-[#EBE9FE] px-2.5 py-1 rounded-lg border-2 border-indigo-950 text-[#7D69EC]">
                Q {currentIdx + 1} of {quiz.questions.length}
              </span>
            </div>

            {/* Question text card */}
            <div className="cartoon-card bg-white p-6 border-3 border-[#1E1B4B] shadow-[4px_4px_0px_0px_#1E1B4B]">
              <span className="text-xs font-display font-black text-[#7D69EC] uppercase flex items-center gap-1.5 mb-1 tracking-wider">
                <HelpCircle className="w-4 h-4" /> PROBLEM BRIEF {currentIdx + 1}
              </span>
              <p className="font-display font-black text-base md:text-lg text-indigo-950 mt-1 leading-snug">
                {quiz.questions[currentIdx].question}
              </p>
            </div>

            {/* Options lists */}
            <div className="space-y-3">
              {quiz.questions[currentIdx].options.map((option, idx) => {
                let optionStyle = "bg-white hover:bg-[#FAF9FF] border-3 border-indigo-950 text-[#1E1B4B] shadow-[3px_3px_0px_0px_#1E1B4B]";
                let checkIcon = null;

                if (isAnswered) {
                  const isCorrect = idx === quiz.questions[currentIdx].answerIndex;
                  const isSelected = idx === selectedIdx;

                  if (isCorrect) {
                    optionStyle = "bg-[#D8F3DC] text-[#1B4332] border-3 border-emerald-600 font-extrabold scale-[1.01] shadow-[3px_3px_0px_0px_#1B4332]";
                    checkIcon = <CheckCircle2 className="w-4 h-4 text-emerald-700 font-extrabold" />;
                  } else if (isSelected) {
                    optionStyle = "bg-[#FFCCD5] text-[#800F2F] border-3 border-rose-500 font-extrabold shadow-[3px_3px_0px_0px_#800F2F]";
                    checkIcon = <AlertCircle className="w-4 h-4 text-rose-700 font-extrabold" />;
                  } else {
                    optionStyle = "bg-white opacity-40 border-3 border-indigo-950/20 text-[#1E1B4B]/40 shadow-[1px_1px_0px_0px_rgba(30,27,75,1)]";
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(idx)}
                    className={`cartoon-btn w-full px-5 py-3.5 text-left font-display font-black text-xs sm:text-sm flex justify-between items-center transition-all cursor-pointer ${optionStyle}`}
                  >
                    <span>{option}</span>
                    {checkIcon}
                  </button>
                );
              })}
            </div>

            {/* Explanation / Footer Next step */}
            {isAnswered && (
              <div className="mt-5 p-5 bg-yellow-50 border-3 border-indigo-950 rounded-3xl animate-float space-y-3.5 shadow-[4px_4px_0px_0px_#1E1B4B]">
                <p className={`font-display font-black text-sm md:text-base flex items-center gap-1.5 ${
                  selectedIdx === quiz.questions[currentIdx].answerIndex ? "text-emerald-700" : "text-[#800F2F]"
                }`}>
                  {selectedIdx === quiz.questions[currentIdx].answerIndex ? "🎉 Correct! Outstanding brain maxxing" : "❌ Skill issue! Gizmo breaks it down below:"}
                </p>
                <div className="font-sans font-semibold text-indigo-950 text-xs md:text-sm leading-relaxed border-t-2 border-indigo-150 pt-2.5">
                  <b className="font-display font-black text-xs text-[#5C509C] uppercase block mb-1 tracking-wider">LEARNING EXPLANATION:</b>
                  {quiz.questions[currentIdx].explanation}
                </div>
                
                <button
                  onClick={handleNextQuestion}
                  className="cartoon-btn w-full mt-2 py-3 bg-[#7D69EC] text-white font-display font-black text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_0px_rgba(30,27,75,1)] hover:bg-[#6853DF]"
                >
                  <span>Next Question</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Phase 3: Final Score Cards */}
        {quizComplete && quiz && (
          <div className="text-center max-w-md mx-auto py-6 space-y-6">
            <span className="text-6xl animate-wiggle inline-block">🏆</span>
            <div>
              <h3 className="font-display font-black text-2xl text-[#1E1B4B]">Quiz Completed!</h3>
              <p className="text-[#5C509C] font-display font-black text-xs mt-1.5 tracking-wide">You've finished your MCQ evaluation cycle!</p>
            </div>

            {/* Score circle report card */}
            <div className="cartoon-card bg-white p-6 border-3 border-indigo-950 flex justify-around items-center gap-4 shadow-[4px_4px_0px_0px_#1E1B4B]">
              <div className="text-left font-display">
                <span className="text-[10px] font-black text-[#5C509C] uppercase tracking-wider block">STUDIED MODULE:</span>
                <p className="font-black text-sm text-[#1E1B4B] leading-tight mt-0.5">{quiz.quizTitle}</p>
                
                <span className="text-[10px] font-black text-[#5C509C] uppercase tracking-wider block mt-3">XP REWARD:</span>
                <p className="font-black text-green-600 text-lg">+{score * 10 + 20} XP</p>
              </div>
              <div className="w-24 h-24 bg-yellow-100 rounded-full border-3 border-indigo-955 flex flex-col justify-center items-center shadow-[3px_3px_0px_0px_#1E1B4B] flex-shrink-0 animate-pulse">
                <span className="font-display font-black text-2xl text-indigo-950 leading-none">{score} / {quiz.questions.length}</span>
                <span className="text-[9px] font-display font-black text-[#5C509C] tracking-tighter uppercase mt-0.5">SCORE</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => fetchQuiz(topic || "General Trivia")}
                className="cartoon-btn flex-1 py-3 bg-yellow-300 hover:bg-yellow-400 text-indigo-950 font-display font-black text-sm cursor-pointer shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]"
              >
                Retry Topic
              </button>
              <button
                onClick={resetGame}
                className="cartoon-btn flex-1 py-3 bg-[#7D69EC] hover:bg-[#6853DF] text-white font-display font-black text-sm cursor-pointer shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]"
              >
                Other Topics
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
