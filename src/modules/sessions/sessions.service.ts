import {
  completeSessionRepository,
  createSessionItemsRepository,
  createSessionRepository,
  getActiveSessionRepository,
  getSessionDetailRepository,
  getSessionSummaryRepository,
  markSessionItemRatedRepository,
  resumeActiveSessionRepository,
  setSessionCompletedItemsRepository,
} from '@/modules/sessions/sessions.repository';

export const createSession = createSessionRepository;
export const createSessionItems = createSessionItemsRepository;
export const getActiveSession = getActiveSessionRepository;
export const resumeActiveSession = resumeActiveSessionRepository;
export const getSessionDetail = getSessionDetailRepository;
export const completeSession = completeSessionRepository;
export const markSessionItemRated = markSessionItemRatedRepository;
export const setSessionCompletedItems = setSessionCompletedItemsRepository;
export const getSessionSummary = getSessionSummaryRepository;
