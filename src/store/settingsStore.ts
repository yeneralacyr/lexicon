import { create } from 'zustand';

import type { StudySettings } from '@/types/db';

type SettingsState = StudySettings & {
  hydrate: (settings: StudySettings) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  dailyNewLimit: 10,
  dailyReviewLimit: 20,
  sessionGoalMinutes: 5,
  onboardingCompleted: false,
  notificationsEnabled: false,
  hydrate: (settings) => set(settings),
}));
