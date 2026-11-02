import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AuthProvider } from '@/lib/auth';
import { useThemeColors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = useThemeColors();
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }),
  );

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <ThemeProvider
        value={{
          ...base,
          colors: { ...base.colors, primary: c.primary, background: c.background, card: c.surface, text: c.text, border: c.border },
        }}>
        <Stack screenOptions={{ headerTintColor: c.text, headerStyle: { backgroundColor: c.surface } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="ogloszenie/[id]" options={{ title: 'Ogłoszenie' }} />
          <Stack.Screen name="konto/logowanie" options={{ title: 'Logowanie' }} />
          <Stack.Screen name="konto/rejestracja" options={{ title: 'Rejestracja' }} />
          <Stack.Screen name="konto/weryfikacja" options={{ title: 'Potwierdzenie e-maila' }} />
          <Stack.Screen name="konto/reset-hasla" options={{ title: 'Reset hasła' }} />
          <Stack.Screen name="konto/zmiana-hasla" options={{ title: 'Zmiana hasła' }} />
          <Stack.Screen name="konto/dane-konta" options={{ title: 'Dane konta' }} />
          <Stack.Screen name="konto/usun-konto" options={{ title: 'Usuń konto' }} />
          <Stack.Screen name="konto/prywatnosc" options={{ title: 'Polityka prywatności' }} />
          <Stack.Screen name="konto/regulamin" options={{ title: 'Regulamin' }} />
          <Stack.Screen name="moje/index" options={{ title: 'Moje ogłoszenia' }} />
          <Stack.Screen name="moje/edytuj/[id]" options={{ title: 'Edycja ogłoszenia' }} />
          <Stack.Screen name="kreator/pozycja" options={{ title: 'Pozycja ogłoszenia', presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
