import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AuthProvider } from '@/context/auth-context';
import { loadCustomLessonContent } from '@/services/lesson-service';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Custom vocabulary/grammar is read from AsyncStorage before the first render
  // so lessons do not flash without the user's own content.
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    let active = true;
    void loadCustomLessonContent().finally(() => {
      if (active) setContentReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!contentReady) return null;

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
