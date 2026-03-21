import type { AdsConsentInfo, RewardedAd } from 'react-native-google-mobile-ads';

import { admobConfig, getPlacementUnitId } from '@/ads/config';
import type { AdsPrivacyState } from '@/ads/types';
import { grantRewardedNewWordsRepository } from '@/modules/progress/progress.repository';

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
let rewardedAd: RewardedAd | null = null;
let rewardedLoaded = false;
let rewardedLoading = false;
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

function createRewardedRequestOptions() {
  return {
    requestNonPersonalizedAdsOnly: adsPrivacyState.requestNonPersonalizedAdsOnly,
  };
}

async function attachRewardedListeners(ad: RewardedAd) {
  const { AdEventType, RewardedAdEventType } = await getMobileAdsModule();

  ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
    rewardedLoaded = true;
    rewardedLoading = false;
  });

  ad.addAdEventListener(AdEventType.ERROR, (error) => {
    rewardedLoaded = false;
    rewardedLoading = false;
    rewardedAd = null;
    setPrivacyState({
      lastError: error?.message ?? 'Ödüllü reklam yüklenemedi.',
    });
    setTimeout(() => {
      void primeExtraNewWordsRewardedAd();
    }, 1500);
  });

  ad.addAdEventListener(AdEventType.CLOSED, () => {
    rewardedLoaded = false;
    rewardedLoading = false;
    rewardedAd = null;
    void primeExtraNewWordsRewardedAd();
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

export async function primeExtraNewWordsRewardedAd() {
  if (!admobConfig.isNativeSupported || !adsPrivacyState.canRequestAds) {
    return;
  }

  if (rewardedLoaded || rewardedLoading) {
    return;
  }

  const mobileAdsModule = await getMobileAdsModule();
  const adUnitId = admobConfig.isTestMode
    ? mobileAdsModule.TestIds.REWARDED
    : getPlacementUnitId('extra_new_words_rewarded');

  if (!adUnitId) {
    return;
  }

  rewardedAd = mobileAdsModule.RewardedAd.createForAdRequest(adUnitId, createRewardedRequestOptions());
  await attachRewardedListeners(rewardedAd);
  rewardedLoading = true;
  rewardedAd.load();
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
          await primeExtraNewWordsRewardedAd();
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
      rewardedAd = null;
      rewardedLoaded = false;
      rewardedLoading = false;
      await ensureMobileAdsInitialized();
      await primeExtraNewWordsRewardedAd();
    }

    return true;
  } catch (error) {
    setPrivacyState({
      lastError: error instanceof Error ? error.message : 'Gizlilik seçenekleri açılamadı.',
    });
    return false;
  }
}

export async function maybeShowExtraNewWordsRewardedAd(amount = 5) {
  if (!admobConfig.isNativeSupported || !adsPrivacyState.canRequestAds) {
    return false;
  }

  await primeExtraNewWordsRewardedAd();

  if (!rewardedAd || !rewardedLoaded) {
    return false;
  }

  const { AdEventType, RewardedAdEventType } = await getMobileAdsModule();

  return new Promise<boolean>((resolve) => {
    let settled = false;
    let rewardGranted = false;
    let rewardPromise: Promise<void> | null = null;

    const cleanup = () => {
      unsubscribeClosed();
      unsubscribeError();
      unsubscribeRewarded();
    };

    const finish = (value: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(value);
    };

    const unsubscribeRewarded = rewardedAd!.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        rewardPromise = grantRewardedNewWordsRepository(amount)
          .then(() => {
            rewardGranted = true;
          })
          .catch((error) => {
            setPrivacyState({
              lastError: error instanceof Error ? error.message : 'Ödüllü yeni kelime hakkı kaydedilemedi.',
            });
            rewardGranted = false;
          });
      }
    );

    const unsubscribeClosed = rewardedAd!.addAdEventListener(AdEventType.CLOSED, () => {
      if (rewardPromise) {
        void rewardPromise.finally(() => {
          finish(rewardGranted);
        });
        return;
      }

      finish(false);
    });

    const unsubscribeError = rewardedAd!.addAdEventListener(AdEventType.ERROR, () => {
      finish(false);
    });

    try {
      rewardedAd!.show();
    } catch (error) {
      setPrivacyState({
        lastError: error instanceof Error ? error.message : 'Ödüllü reklam gösterilemedi.',
      });
      finish(false);
    }
  });
}
