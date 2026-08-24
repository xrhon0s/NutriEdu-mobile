import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/auth-context';
import { theme } from '@/constants/nutriedu-theme';
import { restoreAppLanguage } from '@/i18n';
import { configureLocalNotificationHandling } from '@/services/local-notifications';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    void restoreAppLanguage().catch(() => undefined);
  }, []);

  useEffect(() => {
    let disposed = false;
    let removeListener: (() => void) | undefined;
    void configureLocalNotificationHandling((destination) => {
      if (destination === '/plan') router.push('/plan');
      else router.push('/shopping');
    }).then((cleanup) => {
      if (disposed) cleanup();
      else removeListener = cleanup;
    }).catch(() => undefined);
    return () => {
      disposed = true;
      removeListener?.();
    };
  }, [router]);

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
