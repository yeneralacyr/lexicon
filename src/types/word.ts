import type { WordStatus } from '@/types/progress';

export type SeedWordRow = {
  id: number;
  english: string;
  turkish: string;
  sentence1?: string | null;
  sentence2?: string | null;
  sentence3?: string | null;
  sentence4?: string | null;
  sentence5?: string | null;
};

export type WordListItem = {
  id: number;
  english: string;
  turkish: string;
  status: WordStatus | null;
  isFavorite: boolean;
};

export type WordCandidate = {
  id: number;
  english: string;
  turkish: string;
  sentences: string[];
};

export type LibraryFilter = 'learned' | 'learning' | 'review' | 'mastered' | 'favorites';

export type LibraryQuery = {
  filter: LibraryFilter;
  offset: number;
  limit: number;
};

export type LibraryPage = {
  items: WordListItem[];
  totalCount: number;
  totalWords: number;
  learnedCount: number;
  nextOffset: number | null;
};

export type WordDetail = WordListItem & {
  sentences: string[];
  seenCount: number;
  correctCount: number;
  wrongCount: number;
  lastSeenAt: string | null;
  nextDueAt: string | null;
  isSuspended: boolean;
};
