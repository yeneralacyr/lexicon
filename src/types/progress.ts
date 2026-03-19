export type WordStatus = 'new' | 'learning' | 'review' | 'mastered';

export type Rating = 'again' | 'hard' | 'good' | 'easy';

export type WordProgressRecord = {
  wordId: number;
  status: WordStatus;
  masteryLevel: number;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  seenCount: number;
  correctCount: number;
  wrongCount: number;
  lastSeenAt: string | null;
  lastReviewedAt: string | null;
  nextDueAt: string | null;
  isFavorite: boolean;
  isSuspended: boolean;
};
