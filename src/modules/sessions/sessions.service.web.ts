import type { ActiveSession, SessionDetail, SessionSummary } from '@/types/session';

function unsupported(): never {
  throw new Error('Lexicon is supported on native builds only.');
}

export async function createSession() {
  unsupported();
}

export async function createSessionItems() {
  unsupported();
}

export async function getActiveSession(): Promise<ActiveSession | null> {
  unsupported();
}

export async function getActiveStudySession(): Promise<ActiveSession | null> {
  unsupported();
}

export async function getActiveLibraryReviewSession(): Promise<ActiveSession | null> {
  unsupported();
}

export async function resumeActiveSession(): Promise<SessionDetail | null> {
  unsupported();
}

export async function getSessionDetail(_: string): Promise<SessionDetail | null> {
  unsupported();
}

export async function completeSession(_: string) {
  unsupported();
}

export async function markSessionItemRated() {
  unsupported();
}

export async function setSessionCompletedItems() {
  unsupported();
}

export async function getSessionSummary(_: string): Promise<SessionSummary | null> {
  unsupported();
}
