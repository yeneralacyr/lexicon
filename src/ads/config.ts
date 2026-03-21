import Constants from 'expo-constants';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

import type { AdMobRuntimeConfig } from '@/ads/types';

type RawAdMobConfig = {
  appEnv?: string;
  isEnabled?: boolean;
  isProduction?: boolean;
  androidAppId?: string;
  iosAppId?: string;
  interstitialSessionCompleteAndroid?: string;
  interstitialSessionCompleteIos?: string;
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
    sessionCompleteInterstitial: {
      android: raw.interstitialSessionCompleteAndroid || null,
      ios: raw.interstitialSessionCompleteIos || null,
    },
  },
  thresholds: {
    minimumUniqueWords: 8,
    minimumCompletedSessions: 3,
    cooldownMinutes: 20,
  },
};

export function getPlacementUnitId(placement: 'session_complete_interstitial') {
  if (placement !== 'session_complete_interstitial') {
    return null;
  }

  return Platform.OS === 'ios'
    ? admobConfig.units.sessionCompleteInterstitial.ios
    : admobConfig.units.sessionCompleteInterstitial.android;
}
