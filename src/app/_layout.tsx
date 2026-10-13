import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Unbounded_700Bold } from '@expo-google-fonts/unbounded';
import { DarkTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';

import { BlocksProvider } from '@/state/blocks';
import { CallsProvider } from '@/state/calls';
import { consumeReopenSettings, LanguageProvider } from '@/state/language';
import { MarketProvider } from '@/state/market';
import { SessionProvider, useSession } from '@/state/session';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.accent },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Unbounded_700Bold,
  });

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <SessionProvider>
          <MarketProvider>
            <CallsProvider>
              <BlocksProvider>
                {/* Re-mount the UI when the language changes so every screen re-reads its strings. */}
                <LanguageProvider>{(language) => <RootStack key={language} />}</LanguageProvider>
              </BlocksProvider>
            </CallsProvider>
          </MarketProvider>
        </SessionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/** First launch: onboarding → welcome → app. Afterwards straight to the app (or welcome if signed out). */
function RootStack() {
  const { ready, onboarded, signedIn } = useSession();

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync();
    if (consumeReopenSettings()) setTimeout(() => router.navigate('/settings'), 0);
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'ios_from_right',
        animationDuration: 320,
        gestureEnabled: true,
      }}>
      <Stack.Protected guard={!signedIn && !onboarded}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="auth" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="coin/[id]" />
        <Stack.Screen name="group/[id]" />
        <Stack.Screen name="post/[id]" />
        <Stack.Screen
          name="post/new"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureDirection: 'vertical' }}
        />
        <Stack.Screen
          name="group/new"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureDirection: 'vertical' }}
        />
        <Stack.Screen
          name="call/new"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureDirection: 'vertical' }}
        />
      </Stack.Protected>
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/language" />
      <Stack.Screen name="settings/blocked" />
      <Stack.Screen name="legal" />
    </Stack>
  );
}
