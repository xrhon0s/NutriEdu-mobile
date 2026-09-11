import { useCallback, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RecipePickerModal } from '@/components/recipe-picker-modal';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { theme } from '@/constants/nutriedu-theme';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { PlannedMeal, Recipe } from '@/types/api';

const days = [
  { value: 'Lunes', labelKey: 'monday' },
  { value: 'Martes', labelKey: 'tuesday' },
  { value: 'Miércoles', labelKey: 'wednesday' },
  { value: 'Jueves', labelKey: 'thursday' },
  { value: 'Viernes', labelKey: 'friday' },
  { value: 'Sábado', labelKey: 'saturday' },
  { value: 'Domingo', labelKey: 'sunday' },
] as const;
const mealTypes = [
  { value: 'Desayuno', labelKey: 'breakfast' },
  { value: 'Almuerzo', labelKey: 'lunch' },
  { value: 'Cena', labelKey: 'dinner' },
] as const;

type ActiveSlot = { day: string; mealType: string } | null;
type SaveStatus = { type: 'success' | 'error'; message: string } | null;

export default function PlanScreen() {
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [meals, setMeals] = useState<PlannedMeal[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeSlot, setActiveSlot] = useState<ActiveSlot>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<SaveStatus>(null);

  const loadPlan = useCallback(async () => {
    try {
      setError('');
      if (!user?.id) throw new Error(t('planner.loadError'));
      const [savedPlan, safeRecipes] = await Promise.all([
        apiRequest<PlannedMeal[]>(`/planner/${user.id}`, { token }),
        apiRequest<Recipe[]>(`/recipes/safe/${user.id}`, { token }),
      ]);
      const safeRecipeIds = new Set(safeRecipes.map((recipe) => recipe.id));
      setMeals(savedPlan.map((meal) => ({
        ...meal,
        hasUnsafeIngredients: !safeRecipeIds.has(meal.receta_id),
      })));
      setRecipes(safeRecipes);
      setDirty(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('planner.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, token, user]);

  useFocusEffect(useCallback(() => {
    if (!dirty) void loadPlan();
  }, [dirty, loadPlan]));

  const getMeal = (day: string, mealType: string) => meals.find(
    (meal) => normalizeDay(meal.dia_semana) === normalizeDay(day) && meal.tipo_comida === mealType,
  );

  const assignRecipe = (recipe: Recipe) => {
    if (!activeSlot) return;
    const current = getMeal(activeSlot.day, activeSlot.mealType);
    const nextMeal: PlannedMeal = {
      id: current?.id ?? -Date.now(),
      dia_semana: activeSlot.day,
      tipo_comida: activeSlot.mealType,
      receta_id: recipe.id,
      receta_nombre: recipe.nombre,
      descripcion: recipe.descripcion,
      calorias: recipe.calorias,
      tiempo_preparacion: recipe.tiempo_preparacion,
      nivel_salud: recipe.nivel_salud,
      hasUnsafeIngredients: false,
    };

    setMeals((currentMeals) => [
      ...currentMeals.filter((meal) => !(normalizeDay(meal.dia_semana) === normalizeDay(activeSlot.day) && meal.tipo_comida === activeSlot.mealType)),
      nextMeal,
    ]);
    setDirty(true);
    setStatus({ type: 'success', message: t('planner.assigned') });
    setActiveSlot(null);
  };

  const removeMeal = (day: string, mealType: string) => {
    setMeals((current) => current.filter(
      (meal) => !(normalizeDay(meal.dia_semana) === normalizeDay(day) && meal.tipo_comida === mealType),
    ));
    setDirty(true);
    setStatus({ type: 'success', message: t('planner.removed') });
  };

  const savePlan = async () => {
    const unsafeCount = meals.filter((meal) => meal.hasUnsafeIngredients).length;
    if (unsafeCount > 0) {
      setStatus({ type: 'error', message: t('planner.removeUnsafe') });
      return;
    }

    try {
      setSaving(true);
      setStatus(null);
      await apiRequest('/planner', {
        method: 'POST',
        token,
        body: JSON.stringify({
          plan: meals.map((meal) => ({
            recetaId: meal.receta_id,
            diaSemana: meal.dia_semana,
            tipoComida: meal.tipo_comida,
          })),
        }),
      });
      setDirty(false);
      setStatus({ type: 'success', message: t('planner.saved') });
    } catch (requestError) {
      setStatus({
        type: 'error',
        message: requestError instanceof Error ? requestError.message : t('planner.saveError'),
      });
    } finally {
      setSaving(false);
    }
  };

  const refreshPlan = () => {
    if (!dirty) {
      setRefreshing(true);
      void loadPlan();
      return;
    }

    Alert.alert(t('planner.discardTitle'), t('planner.discardMessage'), [
      { text: t('planner.cancel'), style: 'cancel' },
      {
        text: t('planner.discard'),
        style: 'destructive',
        onPress: () => {
          setRefreshing(true);
          void loadPlan();
        },
      },
    ]);
  };

  if (loading) return <LoadingState label={t('planner.loading')} />;
  if (error && meals.length === 0) return <ErrorState message={error} onRetry={() => { setLoading(true); void loadPlan(); }} />;

  const selectedMeal = activeSlot ? getMeal(activeSlot.day, activeSlot.mealType) : undefined;
  const unsafeCount = meals.filter((meal) => meal.hasUnsafeIngredients).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshPlan} tintColor={theme.colors.primary} />}>
        <View>
          <Text style={styles.title}>{t('planner.title')}</Text>
          <Text style={styles.subtitle}>{t('planner.progress', { count: meals.length })}</Text>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, Math.round((meals.length / 21) * 100))}%` }]} /></View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {status ? (
          <Text style={[styles.status, status.type === 'error' ? styles.errorStatus : styles.successStatus]}>{status.message}</Text>
        ) : null}
        {unsafeCount > 0 ? (
          <View style={styles.unsafeNotice}>
            <Ionicons name="warning-outline" size={21} color={theme.colors.danger} />
            <Text style={styles.unsafeNoticeText}>{t('planner.unsafe', { count: unsafeCount })}</Text>
          </View>
        ) : null}

        {days.map((day) => (
          <View key={day.value} style={styles.daySection}>
            <Text style={styles.dayTitle}>{t(`planner.days.${day.labelKey}`)}</Text>
            {mealTypes.map((mealType) => {
              const meal = getMeal(day.value, mealType.value);
              const unsafe = Boolean(meal?.hasUnsafeIngredients);
              return (
                <View key={mealType.value} style={[styles.mealRow, unsafe && styles.unsafeMealRow]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t(`planner.meals.${mealType.labelKey}`)}, ${meal?.receta_nombre || t('planner.emptyAccessibility')}`}
                    onPress={() => setActiveSlot({ day: day.value, mealType: mealType.value })}
                    style={({ pressed }) => [styles.mealSelection, pressed && styles.pressed]}>
                    <View style={[styles.mealIcon, unsafe && styles.unsafeMealIcon]}>
                      <Ionicons name={unsafe ? 'warning-outline' : meal ? 'restaurant-outline' : 'add'} size={18} color={unsafe ? theme.colors.danger : theme.colors.primary} />
                    </View>
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealType}>{t(`planner.meals.${mealType.labelKey}`)}</Text>
                      <Text style={[styles.mealName, !meal && styles.emptyMeal, unsafe && styles.unsafeMealName]} numberOfLines={2}>{meal?.receta_nombre || t('planner.emptySlot')}</Text>
                    </View>
                    {meal ? <Text style={styles.calories}>{meal.calorias !== null ? `${meal.calorias} kcal` : t('planner.caloriesPending')}</Text> : <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />}
                  </Pressable>
                  {unsafe && meal ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={t('planner.reviewRecipe', { recipe: meal.receta_nombre })} onPress={() => router.push(`/recipes/${meal.receta_id}`)} style={styles.reviewButton}>
                      <Text style={styles.reviewButtonText}>{t('planner.review')}</Text>
                    </Pressable>
                  ) : null}
                  {meal ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={t('planner.remove', { recipe: meal.receta_nombre })} hitSlop={8} onPress={() => removeMeal(day.value, mealType.value)} style={styles.removeButton}>
                      <Ionicons name="trash-outline" size={19} color={theme.colors.danger} />
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          disabled={!dirty || saving || unsafeCount > 0}
          onPress={savePlan}
          style={({ pressed }) => [styles.saveButton, (!dirty || saving || unsafeCount > 0) && styles.disabledButton, pressed && dirty && styles.pressed]}>
          <Ionicons name="save-outline" size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>{saving ? t('planner.saving') : dirty ? t('planner.save') : t('planner.savedButton')}</Text>
        </Pressable>
      </ScrollView>

      <RecipePickerModal
        visible={Boolean(activeSlot)}
        slotLabel={activeSlot ? `${dayLabel(activeSlot.day, t)} · ${mealLabel(activeSlot.mealType, t)}` : ''}
        recipes={recipes}
        selectedRecipeId={selectedMeal?.receta_id}
        onClose={() => setActiveSlot(null)}
        onSelect={assignRecipe}
      />
    </SafeAreaView>
  );
}

const normalizeDay = (day: string) => day.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const dayLabel = (day: string, t: ReturnType<typeof useTranslation>['t']) => {
  const item = days.find((candidate) => normalizeDay(candidate.value) === normalizeDay(day));
  return item ? t(`planner.days.${item.labelKey}`) : day;
};
const mealLabel = (meal: string, t: ReturnType<typeof useTranslation>['t']) => {
  const item = mealTypes.find((candidate) => candidate.value === meal);
  return item ? t(`planner.meals.${item.labelKey}`) : meal;
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: 40 },
  title: { color: theme.colors.text, fontSize: 25, fontWeight: '800' },
  subtitle: { color: theme.colors.textMuted, marginTop: 4 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: theme.colors.border },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
  error: { color: theme.colors.danger, backgroundColor: theme.colors.dangerSurface, borderRadius: theme.radius.small, padding: 12 },
  status: { borderWidth: 1, borderRadius: theme.radius.small, padding: 12, fontWeight: '700' },
  errorStatus: { color: theme.colors.danger, borderColor: '#F5B7B1', backgroundColor: theme.colors.dangerSurface },
  successStatus: { color: theme.colors.primaryPressed, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted },
  unsafeNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: '#F4B4AF', borderRadius: theme.radius.medium, backgroundColor: theme.colors.dangerSurface, padding: 12 },
  unsafeNoticeText: { flex: 1, color: theme.colors.danger, lineHeight: 20, fontWeight: '600' },
  daySection: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: theme.spacing.md, gap: 8 },
  dayTitle: { color: theme.colors.primaryPressed, fontSize: 17, fontWeight: '800', marginBottom: 2 },
  mealRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 4 },
  unsafeMealRow: { borderRadius: theme.radius.small, backgroundColor: theme.colors.dangerSurface, paddingLeft: 6 },
  mealSelection: { flex: 1, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  mealIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.small, backgroundColor: theme.colors.surfaceMuted },
  unsafeMealIcon: { backgroundColor: '#FFFFFF' },
  mealInfo: { flex: 1, minWidth: 0 },
  mealType: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  mealName: { color: theme.colors.text, fontSize: 14, fontWeight: '700', marginTop: 2 },
  emptyMeal: { color: theme.colors.primary },
  unsafeMealName: { color: theme.colors.danger },
  calories: { color: theme.colors.textMuted, fontSize: 12 },
  removeButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  reviewButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 7 },
  reviewButtonText: { color: theme.colors.danger, fontSize: 11, fontWeight: '800' },
  saveButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: theme.radius.medium, backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.md },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  disabledButton: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
});
