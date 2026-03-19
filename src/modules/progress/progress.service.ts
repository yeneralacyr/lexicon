import {
  applyWordRatingRepository,
  getAppOverviewRepository,
  getStudySettingsRepository,
  pushWordToReviewRepository,
  toggleFavoriteRepository,
  toggleSuspendedRepository,
  updateStudySettingsRepository,
} from '@/modules/progress/progress.repository';

export const getAppOverview = getAppOverviewRepository;
export const getSettings = getStudySettingsRepository;
export const updateSettings = updateStudySettingsRepository;
export const applyWordRating = applyWordRatingRepository;
export const toggleFavorite = toggleFavoriteRepository;
export const toggleSuspended = toggleSuspendedRepository;
export const pushWordToReview = pushWordToReviewRepository;
