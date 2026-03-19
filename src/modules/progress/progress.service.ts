import {
  applyWordRatingRepository,
  exportProgressSnapshotRepository,
  getAppOverviewRepository,
  getDueWordCandidatesRepository,
  getStudySettingsRepository,
  pushWordToReviewRepository,
  recordDailyStatsRepository,
  resetUserDataRepository,
  toggleFavoriteRepository,
  toggleSuspendedRepository,
  updateStudySettingsRepository,
} from '@/modules/progress/progress.repository';

export const getAppOverview = getAppOverviewRepository;
export const getSettings = getStudySettingsRepository;
export const updateSettings = updateStudySettingsRepository;
export const getDueWordCandidates = getDueWordCandidatesRepository;
export const applyWordRating = applyWordRatingRepository;
export const recordDailyStats = recordDailyStatsRepository;
export const toggleFavorite = toggleFavoriteRepository;
export const toggleSuspended = toggleSuspendedRepository;
export const pushWordToReview = pushWordToReviewRepository;
export const exportProgressSnapshot = exportProgressSnapshotRepository;
export const resetUserData = resetUserDataRepository;
