import type { Rating } from '@/types/progress';

export type PromptType = 'recall' | 'mcq_meaning' | 'fill_blank';
export type SessionDecision = 'memorized_now' | 'show_again' | 'already_knew';
export type SessionPhase = 'study' | 'quiz';

export type SessionQueueItem = {
  id: number;
  wordId: number;
  english: string;
  turkish: string;
  sentence: string | null;
  sentences: string[];
  selectedSentenceIndex: number | null;
  orderIndex: number;
  promptType: PromptType;
  resultRating?: Rating | null;
  durationMs: number | null;
};

export type SessionDetail = {
  id: string;
  status: string;
  phase: SessionPhase;
  sessionType: string;
  startedAt: string;
  endedAt: string | null;
  totalItems: number;
  completedItems: number;
  newItems: number;
  reviewItems: number;
  items: SessionQueueItem[];
};

export type SessionQuizItem = {
  wordId: number;
  english: string;
  turkish: string;
  normalizedTurkish: string;
  orderIndex: number;
  options: string[];
  userAnswer: string | null;
  normalizedAnswer: string | null;
  isCorrect: boolean | null;
  durationMs: number | null;
  answeredAt: string | null;
};

export type SessionQuizDetail = {
  id: string;
  phase: 'quiz';
  status: string;
  totalItems: number;
  answeredItems: number;
  items: SessionQuizItem[];
};

export type SessionSummary = {
  id: string;
  status: string;
  totalItems: number;
  completedItems: number;
  uniqueWords: number;
  newItems: number;
  reviewItems: number;
  tomorrowCount: number;
  durationSeconds: number | null;
};

export type ActiveSession = {
  id: string;
  phase: SessionPhase;
  sessionType: string;
  startedAt: string;
  totalItems: number;
  completedItems: number;
  newItems: number;
  reviewItems: number;
};
