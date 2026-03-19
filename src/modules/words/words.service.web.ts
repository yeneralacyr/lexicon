import { getWebWords } from '@/db/web-store';
import type { WordDetail, WordListItem } from '@/types/word';
import { normalizeSearchText } from '@/utils/normalize';

function toWordListItem(word: (typeof getWebWords extends () => (infer T)[] ? T : never)): WordListItem {
  return {
    id: word.id,
    english: word.english,
    turkish: word.turkish,
    status: 'new',
  };
}

export async function getLibraryWords(limit = 40): Promise<WordListItem[]> {
  return getWebWords().slice(0, limit).map(toWordListItem);
}

export async function searchWords(query: string, limit = 20): Promise<WordListItem[]> {
  const normalized = normalizeSearchText(query);

  return getWebWords()
    .filter((word) => {
      const english = normalizeSearchText(word.english);
      const turkish = normalizeSearchText(word.turkish);

      return english.includes(normalized) || turkish.includes(normalized);
    })
    .slice(0, limit)
    .map(toWordListItem);
}

export async function getWordDetail(wordId: number): Promise<WordDetail | null> {
  const word = getWebWords().find((item) => item.id === wordId);

  if (!word) {
    return null;
  }

  return {
    ...toWordListItem(word),
    sentences: [word.sentence1, word.sentence2, word.sentence3, word.sentence4, word.sentence5].filter(
      (sentence): sentence is string => Boolean(sentence)
    ),
    seenCount: 0,
    correctCount: 0,
    wrongCount: 0,
  };
}

export async function getNewWordCandidates(limit: number) {
  return getWebWords()
    .slice(0, limit)
    .map((word) => ({
      id: word.id,
      english: word.english,
      turkish: word.turkish,
    }));
}
