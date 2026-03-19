import {
  getLibraryWordsRepository,
  getNewWordCandidatesRepository,
  getWordByIdRepository,
  searchWordsRepository,
} from '@/modules/words/words.repository';

export const getLibraryWords = getLibraryWordsRepository;
export const searchWords = searchWordsRepository;
export const getWordDetail = getWordByIdRepository;
export const getNewWordCandidates = getNewWordCandidatesRepository;
