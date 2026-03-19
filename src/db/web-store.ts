import type { StudySettings } from '@/types/db';
import type { SessionDetail, SessionQueueItem, SessionSummary } from '@/types/session';
import type { SeedWordRow } from '@/types/word';

function unsupported(): never {
  throw new Error('Web is not supported for Lexicon native local database builds.');
}

export function initializeWebStore() {
  return undefined;
}

export function getWebWords(): SeedWordRow[] {
  return unsupported();
}

export function getWebSettings(): StudySettings {
  return unsupported();
}

export function updateWebSettings(_: Partial<StudySettings>): StudySettings {
  return unsupported();
}

export function saveWebSession(_: SessionDetail) {
  unsupported();
}

export function getWebSession(_: string): SessionDetail | null {
  return unsupported();
}

export function getWebSessionSummary(_: string): SessionSummary | null {
  return unsupported();
}

export function completeWebSession(_: string) {
  unsupported();
}

export function createWebSession(
  _: string,
  __: SessionQueueItem[],
  ___: number,
  ____: number,
  _____: number
): SessionDetail {
  return unsupported();
}

export function setWebSessionCompletedItems(_: string, __: number) {
  unsupported();
}

export function markWebSessionItemRated(_: string, __: number, ___: string) {
  unsupported();
}
