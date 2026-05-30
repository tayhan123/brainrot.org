export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  category: string;
  isPinned?: boolean;
  attachedDiagram?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface Quiz {
  quizTitle: string;
  questions: QuizQuestion[];
}

export interface QuizHistoryItem {
  id: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  xpEarned: number;
}

export interface UserStats {
  xp: number;
  streak: number;
  level: number;
  totalFocusMinutes: number;
  completedPomodoros: number;
  totalQuizzesTaken: number;
  lastActiveDate: string; // YYYY-MM-DD
}

export type AppTab = "dashboard" | "pomodoro" | "chat" | "quiz" | "summarize" | "notes" | "progress" | "settings";
