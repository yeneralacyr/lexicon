import { create } from 'zustand';

import type { StudySettings } from '@/types/db';

type SettingsState = StudySettings & {
  hydrate: (settings: StudySettings) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  dailyNewLimit: 7,
  dailyReviewLimit: 20,
  meaningRevealSeconds: 5,
  sessionGoalMinutes: 5,
  onboardingCompleted: false,
  notificationsEnabled: false,
  themeMode: 'dark',
  hydrate: (settings) => set(settings),
}));
