import wordsSeed from '@/assets/data/words.json';
import type { StudySettings } from '@/types/db';
import type { Rating } from '@/types/progress';
import type { SessionDetail, SessionQueueItem, SessionSummary } from '@/types/session';
import type { SeedWordRow } from '@/types/word';

type WebState = {
  initialized: boolean;
  words: SeedWordRow[];
  settings: StudySettings;
  sessions: Map<string, SessionDetail>;
};

const defaultSettings: StudySettings = {
  dailyNewLimit: 10,
  dailyReviewLimit: 20,
  sessionGoalMinutes: 5,
  onboardingCompleted: false,
  notificationsEnabled: false,
};

const state: WebState = {
  initialized: false,
  words: wordsSeed as SeedWordRow[],
  settings: defaultSettings,
  sessions: new Map<string, SessionDetail>(),
};

export function initializeWebStore() {
  state.initialized = true;
}

export function getWebWords() {
  return state.words;
}

export function getWebSettings() {
  return state.settings;
}

export function updateWebSettings(updates: Partial<StudySettings>) {
  state.settings = {
    ...state.settings,
    ...updates,
  };

  return state.settings;
}

export function saveWebSession(session: SessionDetail) {
  state.sessions.set(session.id, session);
}

export function getWebSession(sessionId: string) {
  return state.sessions.get(sessionId) ?? null;
}

export function getWebSessionSummary(sessionId: string): SessionSummary | null {
  const session = state.sessions.get(sessionId);
  if (!session) {
    return null;
  }

  return {
    id: session.id,
    totalItems: session.totalItems,
    completedItems: session.completedItems,
    newItems: session.newItems,
    reviewItems: session.reviewItems,
    tomorrowCount: 0,
  };
}

export function completeWebSession(sessionId: string) {
  const session = state.sessions.get(sessionId);
  if (!session) {
    return;
  }

  state.sessions.set(sessionId, {
    ...session,
    status: 'completed',
    completedItems: session.totalItems,
  });
}

export function createWebSession(
  sessionId: string,
  items: SessionQueueItem[],
  totalItems: number,
  newItems: number,
  reviewItems: number
) {
  const session: SessionDetail = {
    id: sessionId,
    status: 'active',
    totalItems,
    completedItems: 0,
    newItems,
    reviewItems,
    items,
  };

  saveWebSession(session);

  return session;
}

export function setWebSessionCompletedItems(sessionId: string, completedItems: number) {
  const session = state.sessions.get(sessionId);
  if (!session) {
    return;
  }

  state.sessions.set(sessionId, {
    ...session,
    completedItems,
  });
}

export function markWebSessionItemRated(sessionId: string, sessionItemId: number, rating: Rating) {
  const session = state.sessions.get(sessionId);
  if (!session) {
    return;
  }

  state.sessions.set(sessionId, {
    ...session,
    items: session.items.map((item) => (item.id === sessionItemId ? { ...item, resultRating: rating } : item)),
  });
}
