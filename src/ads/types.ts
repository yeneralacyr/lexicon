export type AdPlacement = 'extra_new_words_rewarded';

export type AdsPrivacyState = {
  isAvailable: boolean;
  isInitialized: boolean;
  canRequestAds: boolean;
  consentStatus: 'unknown' | 'required' | 'not_required' | 'obtained';
  privacyOptionsRequired: boolean;
  requestNonPersonalizedAdsOnly: boolean;
  lastError: string | null;
};

export type AdMobRuntimeConfig = {
  appEnv: string;
  isEnabled: boolean;
  isProduction: boolean;
  isTestMode: boolean;
  isNativeSupported: boolean;
  androidAppId: string;
  iosAppId: string;
  testDeviceIds: string[];
  units: {
    extraNewWordsRewarded: {
      android: string | null;
      ios: string | null;
    };
  };
};
