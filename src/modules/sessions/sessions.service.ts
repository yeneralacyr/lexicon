import {
  completeSessionRepository,
  createSessionItemsRepository,
  createSessionRepository,
  getSessionDetailRepository,
  getSessionSummaryRepository,
  markSessionItemRatedRepository,
  setSessionCompletedItemsRepository,
} from '@/modules/sessions/sessions.repository';

export const createSession = createSessionRepository;
export const createSessionItems = createSessionItemsRepository;
export const getSessionDetail = getSessionDetailRepository;
export const completeSession = completeSessionRepository;
export const markSessionItemRated = markSessionItemRatedRepository;
export const setSessionCompletedItems = setSessionCompletedItemsRepository;
export const getSessionSummary = getSessionSummaryRepository;
