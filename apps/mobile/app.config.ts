import type { ExpoConfig } from 'expo/config';

// Nazwa z env, żeby zmiana marki nie wymagała zmian w kodzie (domyślnie „Prosto z Roli”).
const name = process.env.EXPO_PUBLIC_APP_NAME ?? 'Prosto z Roli';
const easProjectId = process.env.EAS_PROJECT_ID;

const config: ExpoConfig = {
  name,
  slug: 'prosto-z-roli',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'prostozroli',
  userInterfaceStyle: 'automatic',
  android: {
    package: 'pl.prostozroli.app',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#FAF7F2',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: ['android.permission.ACCESS_COARSE_LOCATION', 'android.permission.ACCESS_FINE_LOCATION'],
    blockedPermissions: ['android.permission.ACCESS_BACKGROUND_LOCATION'],
    predictiveBackGestureEnabled: false,
  },
  ios: {
    bundleIdentifier: 'pl.prostozroli.app',
    supportsTablet: false,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FAF7F2',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
        dark: { backgroundColor: '#15130F' },
      },
    ],
    '@maplibre/maplibre-react-native',
    [
      'expo-image-picker',
      {
        photosPermission: 'Prosto z Roli potrzebuje dostępu do zdjęć, aby dodać je do Twojego ogłoszenia.',
        cameraPermission: 'Prosto z Roli potrzebuje aparatu, aby zrobić zdjęcie do Twojego ogłoszenia.',
        microphonePermission: false,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Prosto z Roli używa Twojej lokalizacji tylko na Twoją prośbę: aby pokazać oferty w pobliżu albo wskazać miejsce ogłoszenia.',
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  ...(easProjectId ? { extra: { eas: { projectId: easProjectId } } } : {}),
};

export default config;
