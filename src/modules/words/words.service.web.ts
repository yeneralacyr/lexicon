import type { LibraryPage, LibraryQuery, WordCandidate, WordDetail, WordListItem } from '@/types/word';

function unsupported(): never {
  throw new Error('Lexicon is supported on native builds only.');
}

export async function getLibraryWords(_: LibraryQuery): Promise<LibraryPage> {
  unsupported();
}

export async function getLibraryReviewCandidates(): Promise<WordCandidate[]> {
  unsupported();
}

export async function searchWords(_: string, __ = 20): Promise<WordListItem[]> {
  unsupported();
}

export async function getWordDetail(_: number): Promise<WordDetail | null> {
  unsupported();
}

export async function getNewWordCandidates(_: number): Promise<WordCandidate[]> {
  unsupported();
}
