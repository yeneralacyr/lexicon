import type { AppOverview, DailyUnlocks, ProgressExportPayload, StudySettings } from '@/types/db';
import type { Rating, WordProgressRecord } from '@/types/progress';
import type { WordCandidate } from '@/types/word';

function unsupported(): never {
  throw new Error('Lexicon is supported on native builds only.');
}

export async function getAppOverview(): Promise<AppOverview> {
  unsupported();
}

export async function getSettings(): Promise<StudySettings> {
  unsupported();
}

export async function updateSettings(_: Partial<StudySettings>): Promise<StudySettings> {
  unsupported();
}

export async function getDueWordCandidates(_: number): Promise<WordCandidate[]> {
  unsupported();
}

export async function getTodayDailyUnlocks(): Promise<DailyUnlocks> {
  unsupported();
}

export async function grantRewardedNewWords(_: number): Promise<DailyUnlocks> {
  unsupported();
}

export async function applyWordRating(_: number, __: Rating): Promise<WordProgressRecord> {
  unsupported();
}

export async function recordDailyStats() {
  unsupported();
}

export async function toggleFavorite(_: number): Promise<boolean> {
  unsupported();
}

export async function toggleSuspended(_: number): Promise<boolean> {
  unsupported();
}

export async function pushWordToReview(_: number) {
  unsupported();
}

export async function exportProgressSnapshot(): Promise<ProgressExportPayload> {
  unsupported();
}

export async function resetUserData(): Promise<StudySettings> {
  unsupported();
}
