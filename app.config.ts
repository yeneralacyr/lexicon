import type { ConfigContext, ExpoConfig } from 'expo/config';

const APP_ENV = process.env.APP_ENV ?? 'development';
const IS_PRODUCTION = APP_ENV === 'production';

const ANDROID_SAMPLE_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const IOS_SAMPLE_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

const androidAppId = process.env.ADMOB_ANDROID_APP_ID ?? (IS_PRODUCTION ? '' : ANDROID_SAMPLE_APP_ID);
const iosAppId = process.env.ADMOB_IOS_APP_ID ?? (IS_PRODUCTION ? '' : IOS_SAMPLE_APP_ID);
const sessionCompleteInterstitialAndroid =
  process.env.ADMOB_INTERSTITIAL_SESSION_COMPLETE_ANDROID ?? '';
const sessionCompleteInterstitialIos =
  process.env.ADMOB_INTERSTITIAL_SESSION_COMPLETE_IOS ?? '';
const testDeviceIds = (process.env.ADMOB_TEST_DEVICE_IDS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (IS_PRODUCTION) {
  const missingKeys = [
    !androidAppId && 'ADMOB_ANDROID_APP_ID',
    !iosAppId && 'ADMOB_IOS_APP_ID',
    !sessionCompleteInterstitialAndroid && 'ADMOB_INTERSTITIAL_SESSION_COMPLETE_ANDROID',
    !sessionCompleteInterstitialIos && 'ADMOB_INTERSTITIAL_SESSION_COMPLETE_IOS',
  ].filter(Boolean);

  if (missingKeys.length > 0) {
    throw new Error(`Missing required AdMob production env vars: ${missingKeys.join(', ')}`);
  }
}

const skAdNetworkItems = [
  'cstr6suwn9.skadnetwork',
  '4fzdc2evr5.skadnetwork',
  '2fnua5tdw4.skadnetwork',
  'ydx93a7ass.skadnetwork',
  'p78axxw29g.skadnetwork',
  'v72qych5uu.skadnetwork',
  'ludvb6z3bs.skadnetwork',
  'cp8zw746q7.skadnetwork',
  '3sh42y64q3.skadnetwork',
  'c6k4g5qg8m.skadnetwork',
  's39g8k73mm.skadnetwork',
  'wg4vff78zm.skadnetwork',
  '3qy4746246.skadnetwork',
  'f38h382jlk.skadnetwork',
  'hs6bdukanm.skadnetwork',
  'mlmmfzh3r3.skadnetwork',
  'v4nxqhlyqp.skadnetwork',
  'wzmmz9fp6w.skadnetwork',
  'su67r6k2v3.skadnetwork',
  'yclnxrl5pm.skadnetwork',
  't38b2kh725.skadnetwork',
  '7ug5zh24hu.skadnetwork',
  'gta9lk7p23.skadnetwork',
  'vutu7akeur.skadnetwork',
  'y5ghdn5j9k.skadnetwork',
  'v9wttpbfk9.skadnetwork',
  'n38lu8286q.skadnetwork',
  '47vhws6wlr.skadnetwork',
  'kbd757ywx3.skadnetwork',
  '9t245vhmpl.skadnetwork',
  'a2p9lx4jpn.skadnetwork',
  '22mmun2rn5.skadnetwork',
  '44jx6755aq.skadnetwork',
  'k674qkevps.skadnetwork',
  '4468km3ulz.skadnetwork',
  '2u9pt9hc89.skadnetwork',
  '8s468mfl3y.skadnetwork',
  'klf5c3l5u5.skadnetwork',
  'ppxm28t8ap.skadnetwork',
  'kbmxgpxpgc.skadnetwork',
  'uw77j35x4d.skadnetwork',
  '578prtvx9j.skadnetwork',
  '4dzt52r2t5.skadnetwork',
  'tl55sbb4fm.skadnetwork',
  'c3frkrj4fj.skadnetwork',
  'e5fvkxwrpn.skadnetwork',
  '8c4e2ghe7u.skadnetwork',
  '3rd42ekr43.skadnetwork',
  '97r2b46745.skadnetwork',
  '3qcr597p9d.skadnetwork',
] as const;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Lexicon',
  slug: 'lexicon',
  owner: 'yeneralacyr',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/app_icon.png',
  scheme: 'lexicon',
  userInterfaceStyle: 'light',
  ios: {
    icon: './assets/app_icon.png',
  },
  android: {
    package: 'com.lexicon.app',
    adaptiveIcon: {
      backgroundColor: '#000000',
      foregroundImage: './assets/app_icon.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F4F1EA',
        android: {
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      },
    ],
    'expo-sqlite',
    'expo-font',
    'expo-sharing',
    [
      'expo-build-properties',
      {
        android: {
          extraProguardRules: '-keep class com.google.android.gms.internal.consent_sdk.** { *; }',
        },
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: androidAppId,
        iosAppId: iosAppId,
        delayAppMeasurementInit: true,
        userTrackingUsageDescription:
          'This identifier will be used to deliver personalized ads and measure ad performance in Lexicon.',
        skAdNetworkItems,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: '758deb35-b346-45db-9410-e49f26ec7af7',
    },
    admob: {
      appEnv: APP_ENV,
      isProduction: IS_PRODUCTION,
      androidAppId,
      iosAppId,
      interstitialSessionCompleteAndroid: sessionCompleteInterstitialAndroid,
      interstitialSessionCompleteIos: sessionCompleteInterstitialIos,
      testDeviceIds,
    },
  },
});
