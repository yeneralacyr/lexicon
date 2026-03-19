import {
  applyWordRatingRepository,
  getAppOverviewRepository,
  getDueWordCandidatesRepository,
  getStudySettingsRepository,
  pushWordToReviewRepository,
  toggleFavoriteRepository,
  toggleSuspendedRepository,
  updateStudySettingsRepository,
} from '@/modules/progress/progress.repository';

export const getAppOverview = getAppOverviewRepository;
export const getSettings = getStudySettingsRepository;
export const updateSettings = updateStudySettingsRepository;
export const getDueWordCandidates = getDueWordCandidatesRepository;
export const applyWordRating = applyWordRatingRepository;
export const toggleFavorite = toggleFavoriteRepository;
export const toggleSuspended = toggleSuspendedRepository;
export const pushWordToReview = pushWordToReviewRepository;
