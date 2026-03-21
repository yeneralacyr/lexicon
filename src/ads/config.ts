/**
 * AdMob Runtime Configuration
 *
 * Required EAS secrets for production builds:
 *   ADMOB_ANDROID_APP_ID        — Android AdMob app ID (ca-app-pub-xxx)
 *   ADMOB_IOS_APP_ID            — iOS AdMob app ID (ca-app-pub-xxx)
 *   ADMOB_REWARDED_EXTRA_NEW_WORDS_ANDROID — Rewarded ad unit ID for Android
 *   ADMOB_REWARDED_EXTRA_NEW_WORDS_IOS     — Rewarded ad unit ID for iOS
 *
 * Optional:
 *   ADMOB_TEST_DEVICE_IDS       — Comma-separated test device IDs
 *
 * These are read by app.config.ts and injected into `extra.admob`.
 * Verify with: `eas secret:list` before submitting a production build.
 */
import Constants from 'expo-constants';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

import type { AdMobRuntimeConfig } from '@/ads/types';

type RawAdMobConfig = {
  appEnv?: string;
  isEnabled?: boolean;
  isProduction?: boolean;
  androidAppId?: string;
  iosAppId?: string;
  rewardedExtraNewWordsAndroid?: string;
  rewardedExtraNewWordsIos?: string;
  testDeviceIds?: string[];
};

const raw = (Constants.expoConfig?.extra?.admob ?? {}) as RawAdMobConfig;
const isExpoGo = Constants.appOwnership === 'expo';
const isNativePlatform = Platform.OS === 'ios' || Platform.OS === 'android';
const hasGoogleMobileAdsNativeModule = Boolean(
  NativeModules.RNGoogleMobileAdsModule ||
    NativeModules.RNGoogleMobileAdsConsentModule ||
    TurboModuleRegistry.get?.('RNGoogleMobileAdsModule') ||
    TurboModuleRegistry.get?.('RNGoogleMobileAdsConsentModule')
);

export const admobConfig: AdMobRuntimeConfig = {
  appEnv: raw.appEnv ?? 'development',
  isEnabled: Boolean(raw.isEnabled),
  isProduction: Boolean(raw.isProduction),
  isTestMode: !raw.isProduction && Boolean(raw.isEnabled),
  isNativeSupported: Boolean(raw.isEnabled) && isNativePlatform && !isExpoGo && hasGoogleMobileAdsNativeModule,
  androidAppId: raw.androidAppId ?? '',
  iosAppId: raw.iosAppId ?? '',
  testDeviceIds: raw.testDeviceIds ?? [],
  units: {
    extraNewWordsRewarded: {
      android: raw.rewardedExtraNewWordsAndroid || null,
      ios: raw.rewardedExtraNewWordsIos || null,
    },
  },
};

export function getPlacementUnitId(placement: 'extra_new_words_rewarded') {
  if (placement !== 'extra_new_words_rewarded') {
    return null;
  }

  return Platform.OS === 'ios'
    ? admobConfig.units.extraNewWordsRewarded.ios
    : admobConfig.units.extraNewWordsRewarded.android;
}
