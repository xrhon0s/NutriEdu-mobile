import { useCallback, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RecipeCard } from '@/components/recipe-card';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { theme } from '@/constants/nutriedu-theme';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { NotificationListResponse, PlannedMeal, ProfileResponse, Recipe, RecipeSearchResponse, RestrictionsResponse } from '@/types/api';

const weekdays = [
  { value: 'Domingo', labelKey: 'sunday' },
  { value: 'Lunes', labelKey: 'monday' },
  { value: 'Martes', labelKey: 'tuesday' },
  { value: 'Miércoles', labelKey: 'wednesday' },
  { value: 'Jueves', labelKey: 'thursday' },
  { value: 'Viernes', labelKey: 'friday' },
  { value: 'Sábado', labelKey: 'saturday' },
] as const;
const mealTypes = [
  { value: 'Desayuno', labelKey: 'breakfast' },
  { value: 'Almuerzo', labelKey: 'lunch' },
  { value: 'Cena', labelKey: 'dinner' },
] as const;

export default function HomeScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [recommendation, setRecommendation] = useState<Recipe | null>(null);
  const [plan, setPlan] = useState<PlannedMeal[]>([]);
  const [restrictionCount, setRestrictionCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [partialError, setPartialError] = useState('');

  const loadHome = useCallback(async () => {
    const requests = await Promise.allSettled([
      apiRequest<ProfileResponse>('/profile', { token }),
      apiRequest<RecipeSearchResponse>('/recipes/recommendations?limit=1&offset=0', { token }),
      apiRequest<PlannedMeal[]>(`/planner/${user?.id ?? 0}`, { token }),
      apiRequest<RestrictionsResponse>(`/users/restrictions/${user?.id ?? 0}`, { token }),
      apiRequest<NotificationListResponse>('/notifications', { token }),
    ]);
    const [profileResult, recipeResult, planResult, restrictionResult, notificationResult] = requests;
    const successfulCoreRequests = [profileResult, recipeResult, planResult].filter((result) => result.status === 'fulfilled').length;
    if (successfulCoreRequests === 0) {
      const failure = requests.find((result) => result.status === 'rejected');
      throw failure?.status === 'rejected' ? failure.reason : new Error(t('home.loadError'));
    }
    if (profileResult.status === 'fulfilled') setProfile(profileResult.value);
    if (recipeResult.status === 'fulfilled') setRecommendation(recipeResult.value.recipes[0] ?? null);
    if (planResult.status === 'fulfilled') setPlan(planResult.value);
    if (restrictionResult.status === 'fulfilled') setRestrictionCount(restrictionResult.value.restrictions.length);
    if (notificationResult.status === 'fulfilled') setUnreadCount(notificationResult.value.unreadCount);
    setPartialError(requests.some((result) => result.status === 'rejected') ? t('home.partialError') : '');
  }, [t, token, user]);

  const refresh = useCallback(async () => {
    try {
      setError('');
      setPartialError('');
      await loadHome();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('home.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadHome, t]);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  if (loading) return <LoadingState label={t('home.loading')} />;
  if (error && !profile && plan.length === 0 && !recommendation) {
    return <ErrorState message={error} onRetry={() => { setLoading(true); void refresh(); }} />;
  }

  const today = weekdays[new Date().getDay()];
  const todaysMeals = mealTypes.map((mealType) => ({
    mealType,
    meal: plan.find((item) => item.dia_semana === today.value && item.tipo_comida === mealType.value),
  }));
  const planProgress = Math.min(100, Math.round((plan.length / 21) * 100));
  const profileSignalCount = countProfileSignals(profile) + restrictionCount;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void refresh(); }} tintColor={theme.colors.primary} />}>
        <View style={styles.topBar}>
          <View style={styles.brandMark}><Ionicons name="leaf-outline" size={21} color="#FFFFFF" /></View>
          <Text style={styles.brand}>NutriEdu</Text>
          <View style={styles.topActions}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('home.notifications')} onPress={() => router.push('/notifications')} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <Ionicons name="notifications-outline" size={22} color={theme.colors.text} />
              {unreadCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{Math.min(unreadCount, 9)}{unreadCount > 9 ? '+' : ''}</Text></View> : null}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('home.openProfile')} onPress={() => router.push('/profile')} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <Ionicons name="person-outline" size={22} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{t('home.eyebrow')}</Text>
          <Text style={styles.title}>{t('home.greeting', { name: user?.nombre?.split(' ')[0] || t('home.userFallback') })}</Text>
          <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
        </View>

        {partialError ? <Text style={styles.partialError}>{partialError}</Text> : null}

        <View style={styles.summary}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>{t('home.weeklyPlan')}</Text>
              <Text style={styles.summaryValue}>{t('home.plannedMeals', { count: plan.length })}</Text>
            </View>
            <Text style={styles.progressValue}>{planProgress}%</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${planProgress}%` }]} /></View>
          <View style={styles.summaryMeta}>
            <Text style={styles.summaryMetaText}>{t('home.profileSignals', { count: profileSignalCount })}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/plan')} hitSlop={8}><Text style={styles.textAction}>{t('home.openPlan')}</Text></Pressable>
          </View>
        </View>

        <View style={styles.quickActions}>
          <QuickAction icon="camera-outline" label={t('home.analyzeFood')} onPress={() => router.push('/analyze')} primary />
          <QuickAction icon="person-outline" label={t('home.completeProfile')} onPress={() => router.push('/profile')} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View><Text style={styles.sectionTitle}>{t('home.today')}</Text><Text style={styles.sectionSubtitle}>{t(`planner.days.${today.labelKey}`)}</Text></View>
            <Pressable accessibilityRole="button" onPress={() => router.push('/plan')} hitSlop={8}><Text style={styles.textAction}>{t('home.edit')}</Text></Pressable>
          </View>
          <View style={styles.mealList}>
            {todaysMeals.map(({ mealType, meal }, index) => (
              <View key={mealType.value} style={[styles.mealRow, index === todaysMeals.length - 1 && styles.lastRow]}>
                <View style={styles.mealIcon}><Ionicons name="restaurant-outline" size={18} color={theme.colors.primary} /></View>
                <View style={styles.mealText}>
                  <Text style={styles.mealType}>{t(`planner.meals.${mealType.labelKey}`)}</Text>
                  <Text style={[styles.mealName, !meal && styles.emptyMeal]} numberOfLines={1}>{meal?.receta_nombre || t('home.emptyMeal')}</Text>
                </View>
                {meal?.calorias ? <Text style={styles.calories}>{meal.calorias} kcal</Text> : null}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderCopy}><Text style={styles.sectionTitle}>{t('home.recommended')}</Text><Text style={styles.sectionSubtitle}>{t('home.recommendedSubtitle')}</Text></View>
            <Pressable accessibilityRole="button" onPress={() => router.push('/recipes')} hitSlop={8}><Text style={styles.textAction}>{t('home.viewAll')}</Text></Pressable>
          </View>
          {recommendation ? (
            <RecipeCard recipe={recommendation} onPress={() => router.push({ pathname: '/(app)/recipes/[id]', params: { id: recommendation.id } })} />
          ) : (
            <View style={styles.emptyRecommendation}><Ionicons name="nutrition-outline" size={24} color={theme.colors.textMuted} /><Text style={styles.emptyRecommendationText}>{t('home.noRecommendation')}</Text></View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, onPress, primary = false }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.quickAction, primary && styles.primaryAction, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={primary ? '#FFFFFF' : theme.colors.primary} />
      <Text style={[styles.quickActionText, primary && styles.primaryActionText]}>{label}</Text>
    </Pressable>
  );
}

function countProfileSignals(profile: ProfileResponse | null) {
  if (!profile) return 0;
  const personal = profile.profile;
  const personalSignals = [personal?.fecha_nacimiento, personal?.sexo, personal?.estatura_cm, personal?.peso_kg, personal?.nivel_actividad, personal?.condicion_fisica].filter(Boolean).length;
  const targets = profile.targets ? Object.entries(profile.targets).filter(([key, value]) => key !== 'notes' && value !== null && value !== '').length : 0;
  return personalSignals + profile.goals.length + profile.conditions.length + targets;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 48 },
  topBar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.small, backgroundColor: theme.colors.primary },
  brand: { flex: 1, color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  topActions: { flexDirection: 'row', gap: theme.spacing.sm },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface },
  badge: { position: 'absolute', top: 3, right: 3, minWidth: 17, height: 17, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: theme.colors.danger, paddingHorizontal: 3 },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  hero: { gap: theme.spacing.xs },
  eyebrow: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: theme.colors.textMuted, fontSize: 15, lineHeight: 21 },
  partialError: { color: theme.colors.warning, borderLeftWidth: 3, borderLeftColor: theme.colors.warning, backgroundColor: theme.colors.warningSurface, padding: 12, lineHeight: 18 },
  summary: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: theme.spacing.md, gap: 12 },
  summaryHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  sectionEyebrow: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '800' },
  summaryValue: { color: theme.colors.text, fontSize: 18, fontWeight: '800', marginTop: 3 },
  progressValue: { color: theme.colors.primaryPressed, fontSize: 20, fontWeight: '800' },
  progressTrack: { height: 8, overflow: 'hidden', borderRadius: 4, backgroundColor: theme.colors.border },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
  summaryMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  summaryMetaText: { flex: 1, color: theme.colors.textMuted, fontSize: 12 },
  textAction: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
  quickActions: { flexDirection: 'row', gap: theme.spacing.sm },
  quickAction: { flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, paddingHorizontal: 10 },
  primaryAction: { backgroundColor: theme.colors.primary },
  quickActionText: { color: theme.colors.primary, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  primaryActionText: { color: '#FFFFFF' },
  section: { gap: 12 },
  sectionHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  sectionHeaderCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { color: theme.colors.text, fontSize: 19, fontWeight: '800' },
  sectionSubtitle: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  mealList: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, paddingHorizontal: 13 },
  mealRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  lastRow: { borderBottomWidth: 0 },
  mealIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.small, backgroundColor: theme.colors.surfaceMuted },
  mealText: { flex: 1, minWidth: 0 },
  mealType: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  mealName: { color: theme.colors.text, fontSize: 14, fontWeight: '700', marginTop: 2 },
  emptyMeal: { color: theme.colors.primary },
  calories: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
  emptyRecommendation: { minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface },
  emptyRecommendationText: { color: theme.colors.textMuted, textAlign: 'center', fontSize: 13 },
  pressed: { opacity: 0.74 },
});
