import {
  getLibraryWordsRepository,
  getLibraryReviewCandidatesRepository,
  getNewWordCandidatesRepository,
  getWordByIdRepository,
  searchWordsRepository,
} from '@/modules/words/words.repository';

export const getLibraryWords = getLibraryWordsRepository;
export const getLibraryReviewCandidates = getLibraryReviewCandidatesRepository;
export const searchWords = searchWordsRepository;
export const getWordDetail = getWordByIdRepository;
export const getNewWordCandidates = getNewWordCandidatesRepository;
