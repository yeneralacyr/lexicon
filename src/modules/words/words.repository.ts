import { getDatabase } from '@/db';
import type { WordCandidate, WordDetail, WordListItem } from '@/types/word';
import { normalizeSearchText } from '@/utils/normalize';

function sentencesFromRow(row: {
  sentence1: string | null;
  sentence2: string | null;
  sentence3: string | null;
  sentence4: string | null;
  sentence5: string | null;
}) {
  return [row.sentence1, row.sentence2, row.sentence3, row.sentence4, row.sentence5].filter(
    (sentence): sentence is string => Boolean(sentence)
  );
}

export async function getLibraryWordsRepository(limit = 40): Promise<WordListItem[]> {
  const db = await getDatabase();

  return db.getAllAsync<WordListItem>(
    `
      SELECT w.id, w.english, w.turkish, p.status, p.is_favorite as isFavorite
      FROM words w
      LEFT JOIN word_progress p ON p.word_id = w.id
      ORDER BY w.english ASC
      LIMIT ?
    `,
    limit
  );
}

export async function searchWordsRepository(query: string, limit = 20): Promise<WordListItem[]> {
  const db = await getDatabase();
  const normalized = `%${normalizeSearchText(query)}%`;

  return db.getAllAsync<WordListItem>(
    `
      SELECT w.id, w.english, w.turkish, p.status, p.is_favorite as isFavorite
      FROM words w
      LEFT JOIN word_progress p ON p.word_id = w.id
      WHERE w.normalized_english LIKE ?
         OR w.normalized_turkish LIKE ?
      ORDER BY w.english ASC
      LIMIT ?
    `,
    normalized,
    normalized,
    limit
  );
}

export async function getWordByIdRepository(wordId: number): Promise<WordDetail | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<
    WordListItem & {
      sentence1: string | null;
      sentence2: string | null;
      sentence3: string | null;
      sentence4: string | null;
      sentence5: string | null;
      seen_count: number | null;
      correct_count: number | null;
      wrong_count: number | null;
      last_seen_at: string | null;
      next_due_at: string | null;
      is_favorite: number | null;
      is_suspended: number | null;
    }
  >(
    `
      SELECT
        w.id,
        w.english,
        w.turkish,
        p.status,
        w.sentence1,
        w.sentence2,
        w.sentence3,
        w.sentence4,
        w.sentence5,
        p.seen_count,
        p.correct_count,
        p.wrong_count,
        p.last_seen_at,
        p.next_due_at,
        p.is_favorite,
        p.is_suspended
      FROM words w
      LEFT JOIN word_progress p ON p.word_id = w.id
      WHERE w.id = ?
    `,
    wordId
  );

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    english: row.english,
    turkish: row.turkish,
    status: row.status,
    sentences: sentencesFromRow(row),
    seenCount: row.seen_count ?? 0,
    correctCount: row.correct_count ?? 0,
    wrongCount: row.wrong_count ?? 0,
    lastSeenAt: row.last_seen_at ?? null,
    nextDueAt: row.next_due_at ?? null,
    isFavorite: Boolean(row.is_favorite ?? 0),
    isSuspended: Boolean(row.is_suspended ?? 0),
  };
}

export async function getNewWordCandidatesRepository(limit: number): Promise<WordCandidate[]> {
  const db = await getDatabase();

  return db.getAllAsync<WordCandidate>(
    `
      SELECT w.id, w.english, w.turkish, w.sentence1 as sentence
      FROM words w
      LEFT JOIN word_progress p ON p.word_id = w.id
      WHERE p.word_id IS NULL OR p.status = 'new'
      ORDER BY w.id ASC
      LIMIT ?
    `,
    limit
  );
}
