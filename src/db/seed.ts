import type { SQLiteDatabase } from 'expo-sqlite';
import { z } from 'zod';

import wordsSeedRaw from '@/assets/data/words.json';
import { WORDS_SEED_VERSION } from '@/db/schema';
import { normalizeSearchText } from '@/utils/normalize';

const seedWordSchema = z.object({
  id: z.number(),
  english: z.string(),
  turkish: z.string(),
  sentence1: z.string().nullable().optional(),
  sentence2: z.string().nullable().optional(),
  sentence3: z.string().nullable().optional(),
  sentence4: z.string().nullable().optional(),
  sentence5: z.string().nullable().optional(),
});

const seedWords = z.array(seedWordSchema).parse(wordsSeedRaw);

async function getSeedVersion(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    'seed_version'
  );

  return row?.value ? Number(row.value) : 0;
}

export async function ensureSeedData(db: SQLiteDatabase) {
  const currentVersion = await getSeedVersion(db);

  if (currentVersion >= WORDS_SEED_VERSION) {
    return { seeded: false, wordCount: seedWords.length };
  }

  await db.execAsync('BEGIN');

  try {
    for (const word of seedWords) {
      await db.runAsync(
        `
          INSERT INTO words (
            id,
            english,
            turkish,
            sentence1,
            sentence2,
            sentence3,
            sentence4,
            sentence5,
            normalized_english,
            normalized_turkish
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            english = excluded.english,
            turkish = excluded.turkish,
            sentence1 = excluded.sentence1,
            sentence2 = excluded.sentence2,
            sentence3 = excluded.sentence3,
            sentence4 = excluded.sentence4,
            sentence5 = excluded.sentence5,
            normalized_english = excluded.normalized_english,
            normalized_turkish = excluded.normalized_turkish
        `,
        word.id,
        word.english,
        word.turkish,
        word.sentence1 ?? null,
        word.sentence2 ?? null,
        word.sentence3 ?? null,
        word.sentence4 ?? null,
        word.sentence5 ?? null,
        normalizeSearchText(word.english),
        normalizeSearchText(word.turkish)
      );
    }

    await db.runAsync(
      `
        INSERT INTO app_meta (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `,
      'seed_version',
      String(WORDS_SEED_VERSION)
    );

    await db.runAsync(
      `
        INSERT INTO app_meta (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `,
      'seeded_at',
      new Date().toISOString()
    );

    await db.execAsync('COMMIT');

    return { seeded: true, wordCount: seedWords.length };
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}
