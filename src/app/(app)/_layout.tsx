import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { ColorValue, Pressable, Text } from 'react-native';
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
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: tabIcon('person-outline'),
          headerRight: () => (
            <Pressable accessibilityRole="button" onPress={logout} hitSlop={12} style={{ paddingRight: 16 }}>
              <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{t('tabs.logout')}</Text>
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
