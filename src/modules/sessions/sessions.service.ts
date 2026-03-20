import {
  beginSessionQuizRepository,
  completeSessionRepository,
  createSessionItemsRepository,
  createSessionRepository,
  getActiveSessionRepository,
  getSessionDetailRepository,
  getSessionQuizDetailRepository,
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
export const getSessionQuizDetail = getSessionQuizDetailRepository;
export const beginSessionQuiz = beginSessionQuizRepository;
export const completeSession = completeSessionRepository;
export const markSessionItemRated = markSessionItemRatedRepository;
export const setSessionCompletedItems = setSessionCompletedItemsRepository;
export const getSessionSummary = getSessionSummaryRepository;
