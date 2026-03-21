# AdMob Integration Notes

## Placement

- V1 placement only: `Today -> reklam izle -> +5 yeni kelime aç`
- Study session, onboarding, quiz, library, search, word detail, and home remain ad-free

## Required build configuration

Fill these env variables before a production build:

- `ADMOB_ANDROID_APP_ID`
- `ADMOB_IOS_APP_ID`
- `ADMOB_REWARDED_EXTRA_NEW_WORDS_ANDROID`
- `ADMOB_REWARDED_EXTRA_NEW_WORDS_IOS`

Optional:

- `APP_ENV=development|production`
- `ADMOB_TEST_DEVICE_IDS=device_id_1,device_id_2`

In development, the app falls back to Google sample app IDs and `TestIds.REWARDED`.

## Native build requirement

`react-native-google-mobile-ads` is not supported in Expo Go. Use one of:

- `npx expo prebuild && npx expo run:ios`
- `npx expo prebuild && npx expo run:android`
- EAS development / production builds

If you install the package after already creating a dev build, rebuild the native app. A stale binary without `RNGoogleMobileAdsModule` will keep ads disabled.

## Privacy

- Consent is requested on app launch through Google UMP via `AdsConsent.gatherConsent()`
- App measurement is delayed until consent-aware initialization
- Privacy options can be reopened from Settings
- If consent is unavailable or ads cannot be requested, monetization remains disabled and the study flow continues normally

## AdMob console follow-up

- Register Android and iOS apps in AdMob
- Create one rewarded ad unit for each platform for the `extra new words` placement
- Configure Privacy & Messaging for GDPR and ATT messaging
- Update App Store privacy labels and Play Console ads/data safety declarations before release
