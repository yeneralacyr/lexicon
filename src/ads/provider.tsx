import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  getAdsPrivacyStatus,
  openAdsPrivacyOptions,
  setupAdsLifecycle,
  subscribeAdsPrivacyStatus,
} from '@/ads/service';
import type { AdsPrivacyState } from '@/ads/types';

type AdsContextValue = {
  privacyStatus: AdsPrivacyState;
  openPrivacyOptions: () => Promise<boolean>;
};

const AdsContext = createContext<AdsContextValue | null>(null);

export function AdsProvider({ children }: { children: React.ReactNode }) {
  const [privacyStatus, setPrivacyStatus] = useState<AdsPrivacyState>(() => getAdsPrivacyStatus());

  useEffect(() => {
    const unsubscribeStatus = subscribeAdsPrivacyStatus(setPrivacyStatus);
    const teardownLifecycle = setupAdsLifecycle();

    return () => {
      unsubscribeStatus();
      teardownLifecycle();
    };
  }, []);

  const value = useMemo<AdsContextValue>(
    () => ({
      privacyStatus,
      openPrivacyOptions: openAdsPrivacyOptions,
    }),
    [privacyStatus]
  );

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAds() {
  const context = useContext(AdsContext);

  if (!context) {
    throw new Error('useAds must be used within AdsProvider.');
  }

  return context;
}
