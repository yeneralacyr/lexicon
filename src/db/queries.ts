import type { SQLiteDatabase } from 'expo-sqlite';
import dayjs from 'dayjs';

import type { ThemeMode } from '@/constants/theme';
import type { AppOverview, DashboardSnapshot, StudySettings } from '@/types/db';
import { todayIso } from '@/utils/dates';

const defaultSettings = {
  dailyNewLimit: 10,
  dailyReviewLimit: 20,
  sessionGoalMinutes: 5,
  onboardingCompleted: false,
  notificationsEnabled: false,
  themeMode: 'system',
} satisfies StudySettings;

export async function upsertSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync(
    `
      INSERT INTO app_settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    key,
    value
  );
}

export async function ensureDefaultSettings(db: SQLiteDatabase) {
  const settings = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM app_settings');
  const presentKeys = new Set(settings.map((item) => item.key));

  if (!presentKeys.has('daily_new_limit')) {
    await upsertSetting(db, 'daily_new_limit', String(defaultSettings.dailyNewLimit));
  }
  if (!presentKeys.has('daily_review_limit')) {
    await upsertSetting(db, 'daily_review_limit', String(defaultSettings.dailyReviewLimit));
  }
  if (!presentKeys.has('session_goal_minutes')) {
    await upsertSetting(db, 'session_goal_minutes', String(defaultSettings.sessionGoalMinutes));
  }
  if (!presentKeys.has('onboarding_completed')) {
    await upsertSetting(db, 'onboarding_completed', String(Number(defaultSettings.onboardingCompleted)));
  }
  if (!presentKeys.has('notifications_enabled')) {
    await upsertSetting(db, 'notifications_enabled', String(Number(defaultSettings.notificationsEnabled)));
  }
  if (!presentKeys.has('theme_mode')) {
    await upsertSetting(db, 'theme_mode', defaultSettings.themeMode);
  }
}

export async function getStudySettings(db: SQLiteDatabase): Promise<StudySettings> {
  const settings = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM app_settings');
  const map = new Map(settings.map((item) => [item.key, item.value]));

  return {
    dailyNewLimit: Number(map.get('daily_new_limit') ?? defaultSettings.dailyNewLimit),
    dailyReviewLimit: Number(map.get('daily_review_limit') ?? defaultSettings.dailyReviewLimit),
    sessionGoalMinutes: Number(map.get('session_goal_minutes') ?? defaultSettings.sessionGoalMinutes),
    onboardingCompleted: Boolean(Number(map.get('onboarding_completed') ?? Number(defaultSettings.onboardingCompleted))),
    notificationsEnabled: Boolean(
      Number(map.get('notifications_enabled') ?? Number(defaultSettings.notificationsEnabled))
    ),
    themeMode: (map.get('theme_mode') ?? defaultSettings.themeMode) as ThemeMode,
  };
}

export async function updateStudySettingsQuery(
  db: SQLiteDatabase,
  updates: Partial<StudySettings>
): Promise<StudySettings> {
  if (updates.dailyNewLimit !== undefined) {
    await upsertSetting(db, 'daily_new_limit', String(updates.dailyNewLimit));
  }
  if (updates.dailyReviewLimit !== undefined) {
    await upsertSetting(db, 'daily_review_limit', String(updates.dailyReviewLimit));
  }
  if (updates.sessionGoalMinutes !== undefined) {
    await upsertSetting(db, 'session_goal_minutes', String(updates.sessionGoalMinutes));
  }
  if (updates.onboardingCompleted !== undefined) {
    await upsertSetting(db, 'onboarding_completed', String(Number(updates.onboardingCompleted)));
  }
  if (updates.notificationsEnabled !== undefined) {
    await upsertSetting(db, 'notifications_enabled', String(Number(updates.notificationsEnabled)));
  }
  if (updates.themeMode !== undefined) {
    await upsertSetting(db, 'theme_mode', updates.themeMode);
  }

  return getStudySettings(db);
}

async function getStreakDays(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ date: string }>(
    `
      SELECT date
      FROM daily_stats
      WHERE reviewed_count > 0 OR new_count > 0
      ORDER BY date DESC
      LIMIT 365
    `
  );

  if (rows.length === 0) {
    return 0;
  }

  let streak = 0;
  let pointer = dayjs().startOf('day');

  for (const row of rows) {
    const current = dayjs(row.date).startOf('day');

    if (current.isSame(pointer, 'day')) {
      streak += 1;
      pointer = pointer.subtract(1, 'day');
      continue;
    }

    if (current.isBefore(pointer, 'day')) {
      break;
    }
  }

  return streak;
}

export async function getDashboardSnapshotQuery(db: SQLiteDatabase): Promise<DashboardSnapshot> {
  const settings = await getStudySettings(db);
  const totalWords = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM words');
  const dueToday = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM word_progress
      WHERE next_due_at IS NOT NULL
        AND next_due_at <= ?
        AND is_suspended = 0
    `,
    todayIso()
  );
  const newWords = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM words w
      LEFT JOIN word_progress p ON p.word_id = w.id
      WHERE p.word_id IS NULL
         OR (p.status = 'new' AND COALESCE(p.is_suspended, 0) = 0)
    `
  );
  const studiedWords = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM word_progress
      WHERE status IN ('learning', 'review', 'mastered')
        AND is_suspended = 0
    `
  );
  const learningWords = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM word_progress
      WHERE status IN ('learning', 'review')
        AND is_suspended = 0
    `
  );
  const masteredWords = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM word_progress
      WHERE status = 'mastered'
        AND is_suspended = 0
    `
  );
  const todayStats = await db.getFirstAsync<{
    reviewed_count: number;
    new_count: number;
  }>(
    `
      SELECT reviewed_count, new_count
      FROM daily_stats
      WHERE date = ?
    `,
    todayIso()
  );
  const activeSession = await db.getFirstAsync<{
    id: string;
    status: string;
    phase_completed_items: number;
    phase_total_items: number;
  }>(
    `
      SELECT
        s.id,
        s.status,
        CASE
          WHEN s.status = 'quiz' THEN (
            SELECT COUNT(*)
            FROM session_quiz_items qi
            WHERE qi.session_id = s.id
              AND qi.answered_at IS NOT NULL
          )
          ELSE s.completed_items
        END as phase_completed_items,
        CASE
          WHEN s.status = 'quiz' THEN (
            SELECT COUNT(*)
            FROM session_quiz_items qi
            WHERE qi.session_id = s.id
          )
          ELSE s.total_items
        END as phase_total_items
      FROM sessions s
      WHERE s.status IN ('active', 'quiz')
      ORDER BY started_at DESC
      LIMIT 1
    `
  );
  const totalWordCount = totalWords?.count ?? 0;
  const dueCount = dueToday?.count ?? 0;
  const newWordCount = newWords?.count ?? 0;
  const streakDays = await getStreakDays(db);
  const recommendedCount = activeSession
    ? activeSession.phase_total_items
    : dueCount + Math.min(settings.dailyNewLimit, newWordCount);
  const todayReviewedCount = todayStats?.reviewed_count ?? 0;
  const todayNewCount = todayStats?.new_count ?? 0;

  return {
    totalWords: totalWordCount,
    dueToday: dueCount,
    newWords: newWordCount,
    learningWords: learningWords?.count ?? 0,
    masteredWords: masteredWords?.count ?? 0,
    studiedWords: studiedWords?.count ?? 0,
    recommendedCount,
    estimatedMinutes: Math.max(1, Math.ceil(recommendedCount / 4)),
    streakDays,
    todayReviewedCount,
    todayNewCount,
    completedToday: todayReviewedCount + todayNewCount,
    activeSessionId: activeSession?.id ?? null,
    activeSessionPhase: activeSession ? (activeSession.status === 'quiz' ? 'quiz' : 'study') : null,
    activeSessionCompletedItems: activeSession?.phase_completed_items ?? 0,
    activeSessionTotalItems: activeSession?.phase_total_items ?? 0,
  };
}

export async function getAppOverviewQuery(db: SQLiteDatabase): Promise<AppOverview> {
  const dbVersion = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    'db_version'
  );
  const seedVersion = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    'seed_version'
  );
  const seededAt = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    'seeded_at'
  );
  const wordCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM words');
  const activeSession = await db.getFirstAsync<{ id: string }>(
    `
      SELECT id
      FROM sessions
      WHERE status IN ('active', 'quiz')
      ORDER BY started_at DESC
      LIMIT 1
    `
  );

  return {
    dbVersion: dbVersion?.value ?? '0',
    seedVersion: seedVersion?.value ?? '0',
    wordCount: wordCount?.count ?? 0,
    storageMode: 'sqlite-native',
    seededAt: seededAt?.value ?? null,
    activeSessionId: activeSession?.id ?? null,
  };
}
