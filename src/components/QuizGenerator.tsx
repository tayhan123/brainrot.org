import React, { useState } from "react";
import { BookOpen, Sparkles, AlertCircle, ArrowRight, CheckCircle2, XCircle, Award, RefreshCcw } from "lucide-react";
import { Quiz, QuizQuestion } from "../types";

interface QuizGeneratorProps {
  addXp: (amount: number, reason: string) => void;
  incrementQuizStats: (score: number, total: number) => void;
}

export default function QuizGenerator({ addXp, incrementQuizStats }: QuizGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [docText, setDocText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  
  // Game running state variables
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Play game sounds synthesized through Audio Context
  const playSfx = (type: "correct" | "wrong" | "finish" | "click") => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === "correct") {
        // High upbeat interval chime (C6 -> G6)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc1.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.35);
      } else if (type === "wrong") {
        // Buzz sound down-slid
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "finish") {
        // Grand fanfare chime
        const frequencies = [261.63, 329.63, 392.00, 523.25]; // C4-E4-G4-C5
        frequencies.forEach((f, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(f, ctx.currentTime + index * 0.08);
          gain.gain.setValueAtTime(0.08, ctx.currentTime + index * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + index * 0.08 + 0.4);
          osc.start(ctx.currentTime + index * 0.08);
          osc.stop(ctx.currentTime + index * 0.08 + 0.4);
        });
      } else if (type === "click") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      }
    } catch (_) {}
  };

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() && !docText.trim()) return;

    setIsLoading(true);
    setQuiz(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswerIndex(null);
    setHasSubmittedAnswer(false);
    setScore(0);
    setQuizCompleted(false);

    try {
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, docText }),
      });

      if (!response.ok) {
        throw new Error("Could not construct custom quiz questions.");
      }

      const data = (await response.json()) as Quiz;
      setQuiz(data);
      addXp(15, "Generated custom interactive quiz! 📝");
      playSfx("finish");
    } catch (error) {
      console.error(error);
      alert("Uh oh! Gemini couldn't craft this quiz. Please verify the Gemini key is configured properly.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = (optionIndex: number) => {
    if (hasSubmittedAnswer) return;
    playSfx("click");
    setSelectedAnswerIndex(optionIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswerIndex === null || hasSubmittedAnswer) return;
    setHasSubmittedAnswer(true);

    const question = quiz!.questions[currentQuestionIndex];
    if (selectedAnswerIndex === question.answerIndex) {
      setScore((prev) => prev + 1);
      playSfx("correct");
    } else {
      playSfx("wrong");
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswerIndex(null);
    setHasSubmittedAnswer(false);

    if (currentQuestionIndex + 1 < quiz!.questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Quiz finished completely
      setQuizCompleted(true);
      playSfx("finish");
      
      const xpMultiplier = 20;
      const totalEarnedXp = score * xpMultiplier;
      incrementQuizStats(score, quiz!.questions.length);

      if (score > 0) {
        addXp(totalEarnedXp, `Completed ${quiz!.quizTitle} quiz with ${score}/${quiz!.questions.length} correct! 🎓🏆`);
      } else {
        addXp(5, "Took the quiz! Keep reviewing and try again! 📚");
      }
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswerIndex(null);
    setHasSubmittedAnswer(false);
    setScore(0);
    setQuizCompleted(false);
  };

  const handleCloseQuiz = () => {
    setQuiz(null);
    setTopic("");
    setDocText("");
  };

  // Helper evaluation slogan for final results card
  const getSlogan = (currentScore: number, totalQuestions: number) => {
    const ratio = currentScore / totalQuestions;
    if (ratio === 1) return { text: "SIGMA BRAIN UNLOCKED! 🧠👑", sub: "Absolute flawless study rizz. Proud of you, genius!", bg: "bg-yellow-100 border-yellow-400" };
    if (ratio >= 0.6) return { text: "DECENT KNOWLEDGE RIZZ! 🔥", sub: "You locked-in fr fr. Excellent study work!", bg: "bg-purple-100 border-purple-400" };
    return { text: "SEVERE BRAINROT ENCOUNTERED! 👾", sub: "Mewing won't save your grades. Review with Gizmo and try again! No cap.", bg: "bg-rose-100 border-rose-400" };
  };

  // Setup prompt topic suggestions
  const handleQuickTopic = (suggestedTopic: string) => {
    setTopic(suggestedTopic);
    setDocText("");
  };

  return (
    <div className="max-w-2xl mx-auto py-2">
      {/* 1. QUIZ SETTINGS INPUT CARD */}
      {!quiz && (
        <div className="cartoon-card p-6 md:p-8 bg-sky-50">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl animate-bounce">🎒</span>
            <div>
              <h2 className="font-display text-3xl font-black text-indigo-950">Quiz Maker 5000</h2>
              <p className="text-sm text-gray-500 font-sans mt-0.5">Translate raw documents or topics into gaming trivia!</p>
            </div>
          </div>

          <form onSubmit={handleGenerateQuiz} className="space-y-5">
            <div>
              <label className="block text-sm font-display font-black text-indigo-950 mb-1.5">
                🎯 STUDY TOPIC / KEY PHRASE
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Photosynthesis, Newton's Laws, Civil War, JavaScript Promises"
                className="w-full cartoon-input p-3.5 font-sans text-sm h-12"
              />
            </div>

            <div>
              <label className="block text-sm font-display font-black text-indigo-950 mb-1.5 flex items-center justify-between">
                <span>📝 PASTE STUDY NOTES / DOCUMENT TEXT (OPTIONAL)</span>
                <span className="text-[10px] bg-sky-200 text-sky-800 px-2 py-0.5 font-bold rounded-lg border border-sky-450 uppercase font-sans">
                  Best matching MCQs
                </span>
              </label>
              <textarea
                value={docText}
                onChange={(e) => setDocText(e.target.value)}
                placeholder="Paste some textbook chapters, meeting summarizations, or rough notes here to let Gizmo extract custom test questions..."
                rows={4}
                className="w-full cartoon-input p-3.5 font-sans text-sm resize-none"
              />
            </div>

            {/* Quick topics recommendation */}
            <div>
              <span className="text-xs font-display font-bold text-indigo-950 block mb-2">Recommended Gaming Topics to Quiz:</span>
              <div className="flex flex-wrap gap-2">
                {["Photosynthesis Simple", "Quantum Physics Analogy", "Genetics Basics", "World War I Causes"].map(
                  (t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleQuickTopic(t)}
                      className="text-[11px] font-display font-bold px-3 py-1 bg-white border-2 border-indigo-950 rounded-xl hover:bg-yellow-200 transition-all cursor-pointer"
                    >
                      💡 {t}
                    </button>
                  )
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || (!topic.trim() && !docText.trim())}
              className="w-full cartoon-btn bg-yellow-300 hover:bg-yellow-400 text-indigo-950 font-display font-extrabold py-3.5 px-4 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                  Coding custom MCQ locks...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-indigo-950 fill-indigo-950" />
                  Deploy Instant Quiz (+15 XP)
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* 2. LIVE QUIZ INTERACTIVE GAME BOARD */}
      {quiz && !quizCompleted && (
        <div className="cartoon-card p-6 md:p-8 bg-purple-50">
          {/* Header section with question progress */}
          <div className="flex justify-between items-center border-b-3 border-dashed border-indigo-950 pb-4 mb-6">
            <div>
              <span className="text-xs font-bold text-purple-700 bg-purple-200 border border-purple-400 px-2.5 py-1 rounded-full uppercase font-sans tracking-wide">
                Trivia Arena
              </span>
              <h3 className="font-display text-xl font-bold text-indigo-950 mt-1">{quiz.quizTitle}</h3>
            </div>
            <div className="text-right">
              <p className="font-display font-black text-indigo-950 text-xl">
                Q: {currentQuestionIndex + 1} / {quiz.questions.length}
              </p>
              <p className="text-xs text-gray-500 font-sans">Score: {score} Correct</p>
            </div>
          </div>

          {/* Question Text Box */}
          <div className="cartoon-card p-5 bg-white mb-6 border-indigo-950 shadow-[3px_3px_0px_0px_rgba(30,27,75,1)]">
            <p className="font-display text-lg font-black text-indigo-950 leading-relaxed">
              {quiz.questions[currentQuestionIndex].question}
            </p>
          </div>

          {/* Choices Selection Options */}
          <div className="space-y-3 mb-6">
            {quiz.questions[currentQuestionIndex].options.map((option, idx) => {
              const question = quiz.questions[currentQuestionIndex];
              const isSelected = selectedAnswerIndex === idx;
              
              // Styling dynamic evaluation
              let optionStyles = "bg-white text-indigo-950 border-indigo-950 hover:bg-indigo-50";
              
              if (hasSubmittedAnswer) {
                if (idx === question.answerIndex) {
                  optionStyles = "bg-emerald-300 text-indigo-950 border-indigo-950 shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]";
                } else if (isSelected) {
                  optionStyles = "bg-rose-300 text-indigo-950 border-indigo-950 shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]";
                } else {
                  optionStyles = "bg-gray-100 text-gray-400 border-gray-300 opacity-60";
                }
              } else if (isSelected) {
                optionStyles = "bg-yellow-300 text-indigo-950 border-indigo-950 shadow-[3px_3px_0px_0px_rgba(30,27,75,1)] translate-x-1";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  disabled={hasSubmittedAnswer}
                  className={`w-full text-left font-display font-bold p-4 border-3 rounded-2xl transition-all duration-150 flex items-center justify-between ${optionStyles}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-indigo-950 text-white flex items-center justify-center font-black mr-2">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{option}</span>
                  </span>
                  {hasSubmittedAnswer && idx === question.answerIndex && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-800" />
                  )}
                  {hasSubmittedAnswer && isSelected && idx !== question.answerIndex && (
                    <XCircle className="w-5 h-5 text-rose-800" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Friendly mini explanation display */}
          {hasSubmittedAnswer && (
            <div className="cartoon-card p-4 bg-white border-indigo-950 mb-6 shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]">
              <h4 className="font-display font-black text-rose-950 text-sm mb-1 uppercase tracking-wide flex items-center gap-1.5">
                🤖 GIZMO EXPLAINS:
              </h4>
              <p className="font-serif text-sm text-gray-700 italic">
                {quiz.questions[currentQuestionIndex].explanation}
              </p>
            </div>
          )}

          {/* Control navigation */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleCloseQuiz}
              className="cartoon-btn px-4 py-2 bg-gray-100 font-display font-bold text-gray-600 border-indigo-950"
            >
              Forfeit Test
            </button>
            
            {!hasSubmittedAnswer ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswerIndex === null}
                className="cartoon-btn px-6 py-2 bg-indigo-950 text-white font-display font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
              >
                Lock Option
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="cartoon-btn px-6 py-2 bg-yellow-300 text-indigo-950 font-display font-extrabold shadow-[2px_2px_0px_0px_rgba(30,27,75,1)] flex items-center gap-1.5"
              >
                {currentQuestionIndex + 1 === quiz.questions.length ? "Finish Arena" : "Next Question"}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. FINAL RESULTS SCORE SHEET */}
      {quizCompleted && quiz && (
        <div className="cartoon-card p-6 md:p-8 bg-yellow-50 text-center">
          <div className="w-20 h-20 bg-yellow-300 rounded-full border-4 border-indigo-950 mx-auto flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(30,27,75,1)] mb-5 animate-bounce">
            <Award className="w-10 h-10 text-indigo-950 fill-indigo-950" />
          </div>

          <h3 className="font-display text-3xl font-black text-indigo-950">Quiz Complete!</h3>
          <p className="text-gray-500 font-sans text-sm mb-4">You battled through "{quiz.quizTitle}"</p>

          <div className="inline-block px-8 py-4 bg-white border-3 border-indigo-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(30,27,75,1)] mb-6">
            <span className="font-display font-black text-4xl block text-indigo-950">
              {score} / {quiz.questions.length}
            </span>
            <span className="text-xs uppercase font-extrabold text-[#7C3AED] tracking-wider block mt-1">QUESTIONS CORRECT</span>
          </div>

          {/* Slogan details */}
          <div className={`p-4 border-3 border-indigo-950 rounded-2xl max-w-md mx-auto mb-8 shadow-[3px_3px_0px_0px_rgba(30,27,75,1)] ${getSlogan(score, quiz.questions.length).bg}`}>
            <h4 className="font-display font-black text-indigo-950 text-base mb-1">
              {getSlogan(score, quiz.questions.length).text}
            </h4>
            <p className="text-sm text-gray-700 italic">
              {getSlogan(score, quiz.questions.length).sub}
            </p>
          </div>

          {/* Rewards claim display */}
          <div className="mb-6 p-3 bg-emerald-100 border-2 border-emerald-400 rounded-xl max-w-sm mx-auto flex items-center justify-center gap-2">
            <span className="text-xs font-display font-bold text-emerald-800">
              XP GRANTED: <b className="text-emerald-950 font-black">+{score * 20} XP</b>
            </span>
          </div>

          {/* Game navigation footer */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRestartQuiz}
              className="cartoon-btn px-5 py-2.5 bg-indigo-950 text-white font-display font-bold flex items-center gap-1.5"
            >
              <RefreshCcw className="w-4 h-4" />
              Retake Quiz
            </button>
            <button
              onClick={handleCloseQuiz}
              className="cartoon-btn px-5 py-2.5 bg-white font-display font-bold text-indigo-950"
            >
              Create New Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
