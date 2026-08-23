import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/nutriedu-theme';

export default function RecipesLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: theme.colors.surface }, headerShadowVisible: false, headerTintColor: theme.colors.text }}>
      <Stack.Screen name="index" options={{ title: t('recipes.stackTitle') }} />
      <Stack.Screen name="[id]" options={{ title: t('recipes.detailTitle') }} />
    </Stack>
  );
}
