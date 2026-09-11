import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { Alert, ColorValue, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LoadingState } from '@/components/screen-state';
import { useAuth } from '@/context/auth-context';
import { theme } from '@/constants/nutriedu-theme';

const tabIcon = (name: React.ComponentProps<typeof Ionicons>['name']) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };

export default function AuthenticatedLayout() {
  const { token, isLoading, logout } = useAuth();
  const { t } = useTranslation();
  if (isLoading) return <LoadingState />;
  if (!token) return <Redirect href="/login" />;

  const confirmLogout = () => {
    Alert.alert(t('tabs.logoutTitle'), t('tabs.logoutMessage'), [
      { text: t('tabs.cancel'), style: 'cancel' },
      { text: t('tabs.logout'), style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerShadowVisible: false,
        headerTintColor: theme.colors.text,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen name="home" options={{ title: t('tabs.home'), headerShown: false, tabBarIcon: tabIcon('home-outline') }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          href: null,
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel={t('tabs.logout')} onPress={confirmLogout} hitSlop={12} style={{ paddingRight: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="log-out-outline" size={18} color={theme.colors.primary} />
                <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{t('tabs.logout')}</Text>
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="recipes" options={{ title: t('tabs.recipes'), headerShown: false, tabBarIcon: tabIcon('restaurant-outline') }} />
      <Tabs.Screen name="analyze" options={{ title: t('tabs.analyze'), tabBarIcon: tabIcon('camera-outline') }} />
      <Tabs.Screen name="plan" options={{ title: t('tabs.plan'), tabBarIcon: tabIcon('calendar-outline') }} />
      <Tabs.Screen name="shopping" options={{ title: t('tabs.shopping'), tabBarIcon: tabIcon('cart-outline') }} />
      <Tabs.Screen name="medical-documents" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="medical-history" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="privacy-center" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="notifications" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
