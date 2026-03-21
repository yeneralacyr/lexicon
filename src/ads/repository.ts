import dayjs from 'dayjs';

import { getDatabase } from '@/db';
import { nowIso } from '@/utils/dates';

const LAST_SESSION_COMPLETE_INTERSTITIAL_AT = 'ads_last_session_complete_interstitial_at';

async function getAppMetaValue(key: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    key
  );

  return row?.value ?? null;
}

async function setAppMetaValue(key: string, value: string) {
  const db = await getDatabase();
  await db.runAsync(
    `
      INSERT INTO app_meta (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    key,
    value
  );
}

export async function getCompletedSessionCountRepository() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM sessions
      WHERE status = 'completed'
    `
  );

  return row?.count ?? 0;
}

export async function getLastSessionCompleteInterstitialAtRepository() {
  return getAppMetaValue(LAST_SESSION_COMPLETE_INTERSTITIAL_AT);
}

export async function setLastSessionCompleteInterstitialAtRepository(timestamp = nowIso()) {
  await setAppMetaValue(LAST_SESSION_COMPLETE_INTERSTITIAL_AT, timestamp);
}

export async function isSessionCompleteInterstitialCooldownPassedRepository(cooldownMinutes: number) {
  const lastShownAt = await getLastSessionCompleteInterstitialAtRepository();

  if (!lastShownAt) {
    return true;
  }

  return dayjs().diff(dayjs(lastShownAt), 'minute', true) >= cooldownMinutes;
}
