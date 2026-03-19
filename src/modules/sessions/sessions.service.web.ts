import {
  completeWebSession,
  getWebSession,
  getWebSessionSummary,
  markWebSessionItemRated,
  setWebSessionCompletedItems,
} from '@/db/web-store';

export async function getSessionDetail(sessionId: string) {
  return getWebSession(sessionId);
}

export async function completeSession(sessionId: string) {
  completeWebSession(sessionId);
}

export async function markSessionItemRated(sessionItemId: number, rating: Parameters<typeof markWebSessionItemRated>[2]) {
  return { sessionItemId, rating };
}

export async function setSessionCompletedItems(sessionId: string, completedItems: number) {
  setWebSessionCompletedItems(sessionId, completedItems);
}

export async function getSessionSummary(sessionId: string) {
  return getWebSessionSummary(sessionId);
}
