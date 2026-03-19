import type { PromptType } from '@/types/session';

const promptOrder: PromptType[] = ['recall', 'mcq_meaning', 'fill_blank'];

export function createSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function pickPromptType(index: number) {
  return promptOrder[index % promptOrder.length];
}
