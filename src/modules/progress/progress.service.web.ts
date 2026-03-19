import { getWebSettings, getWebWords, updateWebSettings } from '@/db/web-store';
import type { AppOverview } from '@/types/db';

export async function getAppOverview(): Promise<AppOverview> {
  return {
    dbVersion: 'web',
    seedVersion: '1',
    wordCount: getWebWords().length,
  };
}

export async function getSettings() {
  return getWebSettings();
}

export async function updateSettings(updates: Parameters<typeof updateWebSettings>[0]) {
  return updateWebSettings(updates);
}

export async function applyWordRating() {
  return null;
}

export async function toggleFavorite() {
  return false;
}

export async function toggleSuspended() {
  return false;
}

export async function pushWordToReview() {
  return null;
}
