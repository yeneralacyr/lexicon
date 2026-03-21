import type { SessionPhase, SessionType } from '@/types/session';

export function resolveSessionRoute(input: {
  id: string;
  phase: SessionPhase;
  sessionType: SessionType;
}) {
  if (input.phase === 'quiz') {
    return `/session/quiz/${input.id}` as const;
  }

  if (input.sessionType === 'library_review') {
    return `/session/library-review/${input.id}` as const;
  }

  return `/session/${input.id}` as const;
}
