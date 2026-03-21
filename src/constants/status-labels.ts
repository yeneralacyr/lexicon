import type { WordStatus } from '@/types/progress';

export const statusLabels: Record<WordStatus, string> = {
  new: 'Yeni',
  learning: 'Öğreniliyor',
  review: 'Tekrar',
  mastered: 'Ustalaştı',
};
