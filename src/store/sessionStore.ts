import { create } from 'zustand';

type SessionState = {
  activeSessionId: string | null;
  setActiveSessionId: (sessionId: string | null) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  activeSessionId: null,
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
}));
