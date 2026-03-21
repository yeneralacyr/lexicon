import type { AdsPrivacyState } from '@/ads/types';

const defaultPrivacyState: AdsPrivacyState = {
  isAvailable: false,
  isInitialized: false,
  canRequestAds: false,
  consentStatus: 'unknown',
  privacyOptionsRequired: false,
  requestNonPersonalizedAdsOnly: false,
  lastError: null,
};

export async function bootstrapAds() {
  return defaultPrivacyState;
}

export function getAdsPrivacyStatus() {
  return defaultPrivacyState;
}

export function subscribeAdsPrivacyStatus(listener: (status: AdsPrivacyState) => void) {
  listener(defaultPrivacyState);

  return () => undefined;
}

export async function openAdsPrivacyOptions() {
  return false;
}

export async function primeExtraNewWordsRewardedAd() {
  return false;
}

export async function maybeShowExtraNewWordsRewardedAd(_: number = 5) {
  return false;
}
