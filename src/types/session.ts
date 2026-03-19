import type { Rating } from '@/types/progress';

export type PromptType = 'recall' | 'mcq_meaning' | 'fill_blank';

export type SessionQueueItem = {
  id: number;
  wordId: number;
  english: string;
  turkish: string;
  sentence: string | null;
  selectedSentenceIndex: number | null;
  orderIndex: number;
  promptType: PromptType;
  resultRating?: Rating | null;
  durationMs: number | null;
};

export type SessionDetail = {
  id: string;
  status: string;
  sessionType: string;
  startedAt: string;
  endedAt: string | null;
  totalItems: number;
  completedItems: number;
  newItems: number;
  reviewItems: number;
  items: SessionQueueItem[];
};

export type SessionSummary = {
  id: string;
  status: string;
  totalItems: number;
  completedItems: number;
  newItems: number;
  reviewItems: number;
  tomorrowCount: number;
  durationSeconds: number | null;
};

export type ActiveSession = {
  id: string;
  sessionType: string;
  startedAt: string;
  totalItems: number;
  completedItems: number;
  newItems: number;
  reviewItems: number;
};
