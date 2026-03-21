import type { AdsConsentInfo, InterstitialAd } from 'react-native-google-mobile-ads';

import { admobConfig, getPlacementUnitId } from '@/ads/config';
import {
  getCompletedSessionCountRepository,
  isSessionCompleteInterstitialCooldownPassedRepository,
  setLastSessionCompleteInterstitialAtRepository,
} from '@/ads/repository';
import type { AdsPrivacyState } from '@/ads/types';
import type { SessionSummary } from '@/types/session';

const defaultPrivacyState: AdsPrivacyState = {
  isAvailable: admobConfig.isNativeSupported,
  isInitialized: false,
  canRequestAds: false,
  consentStatus: 'unknown',
  privacyOptionsRequired: false,
  requestNonPersonalizedAdsOnly: false,
  lastError: null,
};

let adsPrivacyState = defaultPrivacyState;
let bootstrapPromise: Promise<AdsPrivacyState> | null = null;
let mobileAdsInitialized = false;
let interstitial: InterstitialAd | null = null;
let interstitialLoaded = false;
let interstitialLoading = false;
let mobileAdsModulePromise: Promise<typeof import('react-native-google-mobile-ads')> | null = null;

const listeners = new Set<(status: AdsPrivacyState) => void>();

function emitPrivacyStatus() {
  for (const listener of listeners) {
    listener(adsPrivacyState);
  }
}

function setPrivacyState(nextPartial: Partial<AdsPrivacyState>) {
  adsPrivacyState = {
    ...adsPrivacyState,
    ...nextPartial,
  };
  emitPrivacyStatus();
}

async function getMobileAdsModule() {
  if (!mobileAdsModulePromise) {
    mobileAdsModulePromise = import('react-native-google-mobile-ads');
  }

  return mobileAdsModulePromise;
}

async function mapConsentStatus(status: string): Promise<AdsPrivacyState['consentStatus']> {
  const { AdsConsentStatus } = await getMobileAdsModule();

  switch (status) {
    case AdsConsentStatus.REQUIRED:
      return 'required';
    case AdsConsentStatus.NOT_REQUIRED:
      return 'not_required';
    case AdsConsentStatus.OBTAINED:
      return 'obtained';
    case AdsConsentStatus.UNKNOWN:
    default:
      return 'unknown';
  }
}

function createInterstitialRequestOptions() {
  return {
    requestNonPersonalizedAdsOnly: adsPrivacyState.requestNonPersonalizedAdsOnly,
  };
}

async function attachInterstitialListeners(ad: InterstitialAd) {
  const { AdEventType } = await getMobileAdsModule();

  ad.addAdEventListener(AdEventType.LOADED, () => {
    interstitialLoaded = true;
    interstitialLoading = false;
  });

  ad.addAdEventListener(AdEventType.ERROR, (error) => {
    interstitialLoaded = false;
    interstitialLoading = false;
    interstitial = null;
    setPrivacyState({
      lastError: error?.message ?? 'Interstitial yüklenemedi.',
    });
    setTimeout(() => {
      void primeSessionCompleteInterstitial();
    }, 1500);
  });

  ad.addAdEventListener(AdEventType.OPENED, () => {
    void setLastSessionCompleteInterstitialAtRepository();
  });

  ad.addAdEventListener(AdEventType.CLOSED, () => {
    interstitialLoaded = false;
    interstitialLoading = false;
    interstitial = null;
    void primeSessionCompleteInterstitial();
  });
}

async function ensureMobileAdsInitialized() {
  if (!admobConfig.isNativeSupported || mobileAdsInitialized) {
    return;
  }

  const mobileAdsModule = await getMobileAdsModule();

  await mobileAdsModule.default().setRequestConfiguration({
    maxAdContentRating: mobileAdsModule.MaxAdContentRating.PG,
    testDeviceIdentifiers: admobConfig.isTestMode
      ? admobConfig.testDeviceIds.length > 0
        ? admobConfig.testDeviceIds
        : ['EMULATOR']
      : undefined,
  });

  await mobileAdsModule.default().initialize();
  mobileAdsInitialized = true;
  setPrivacyState({ isInitialized: true });
}

async function syncConsentState(consentInfo: AdsConsentInfo) {
  const mobileAdsModule = await getMobileAdsModule();
  let requestNonPersonalizedAdsOnly = false;

  if (consentInfo.canRequestAds) {
    const userChoices = await mobileAdsModule.AdsConsent.getUserChoices().catch(() => null);
    requestNonPersonalizedAdsOnly = userChoices ? !userChoices.selectPersonalisedAds : false;
  }

  setPrivacyState({
    canRequestAds: consentInfo.canRequestAds,
    consentStatus: await mapConsentStatus(consentInfo.status),
    privacyOptionsRequired:
      consentInfo.privacyOptionsRequirementStatus ===
      mobileAdsModule.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
    requestNonPersonalizedAdsOnly,
    lastError: null,
  });
}

async function primeSessionCompleteInterstitial() {
  if (!admobConfig.isNativeSupported || !adsPrivacyState.canRequestAds) {
    return;
  }

  if (interstitialLoaded || interstitialLoading) {
    return;
  }

  const mobileAdsModule = await getMobileAdsModule();
  const adUnitId = admobConfig.isTestMode
    ? mobileAdsModule.TestIds.INTERSTITIAL
    : getPlacementUnitId('session_complete_interstitial');

  if (!adUnitId) {
    return;
  }

  interstitial = mobileAdsModule.InterstitialAd.createForAdRequest(
    adUnitId,
    createInterstitialRequestOptions()
  );
  await attachInterstitialListeners(interstitial);
  interstitialLoading = true;
  interstitial.load();
}

export async function bootstrapAds() {
  if (!admobConfig.isNativeSupported) {
    return adsPrivacyState;
  }

  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        const mobileAdsModule = await getMobileAdsModule();
        const consentInfo = await mobileAdsModule.AdsConsent.gatherConsent({
          testDeviceIdentifiers: admobConfig.isTestMode ? admobConfig.testDeviceIds : undefined,
        });

        await syncConsentState(consentInfo);

        if (consentInfo.canRequestAds) {
          await ensureMobileAdsInitialized();
          await primeSessionCompleteInterstitial();
        }

        return adsPrivacyState;
      } catch (error) {
        setPrivacyState({
          lastError: error instanceof Error ? error.message : 'Ads bootstrap başarısız.',
        });

        return adsPrivacyState;
      }
    })();
  }

  return bootstrapPromise;
}

export function getAdsPrivacyStatus() {
  return adsPrivacyState;
}

export function subscribeAdsPrivacyStatus(listener: (status: AdsPrivacyState) => void) {
  listeners.add(listener);
  listener(adsPrivacyState);

  return () => {
    listeners.delete(listener);
  };
}

export async function openAdsPrivacyOptions() {
  if (!admobConfig.isNativeSupported) {
    return false;
  }

  try {
    const mobileAdsModule = await getMobileAdsModule();
    const consentInfo = await mobileAdsModule.AdsConsent.showPrivacyOptionsForm();
    await syncConsentState(consentInfo);

    if (consentInfo.canRequestAds) {
      interstitial = null;
      interstitialLoaded = false;
      interstitialLoading = false;
      await ensureMobileAdsInitialized();
      await primeSessionCompleteInterstitial();
    }

    return true;
  } catch (error) {
    setPrivacyState({
      lastError: error instanceof Error ? error.message : 'Gizlilik seçenekleri açılamadı.',
    });
    return false;
  }
}

export async function maybeShowSessionCompleteInterstitial(summary: SessionSummary | null) {
  if (!summary || !admobConfig.isNativeSupported || !adsPrivacyState.canRequestAds) {
    return false;
  }

  if (summary.uniqueWords < admobConfig.thresholds.minimumUniqueWords) {
    return false;
  }

  const completedSessions = await getCompletedSessionCountRepository();

  if (completedSessions < admobConfig.thresholds.minimumCompletedSessions) {
    return false;
  }

  const cooldownPassed = await isSessionCompleteInterstitialCooldownPassedRepository(
    admobConfig.thresholds.cooldownMinutes
  );

  if (!cooldownPassed) {
    return false;
  }

  await primeSessionCompleteInterstitial();

  if (!interstitial || !interstitialLoaded) {
    return false;
  }

  const { AdEventType } = await getMobileAdsModule();

  return new Promise<boolean>((resolve) => {
    let settled = false;

    const cleanup = () => {
      unsubscribeClosed();
      unsubscribeError();
    };

    const finish = (value: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(value);
    };

    const unsubscribeClosed = interstitial!.addAdEventListener(AdEventType.CLOSED, () => {
      finish(true);
    });

    const unsubscribeError = interstitial!.addAdEventListener(AdEventType.ERROR, () => {
      finish(false);
    });

    try {
      interstitial!.show();
    } catch (error) {
      setPrivacyState({
        lastError: error instanceof Error ? error.message : 'Interstitial gösterilemedi.',
      });
      finish(false);
    }
  });
}
