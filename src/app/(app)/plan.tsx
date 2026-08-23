import { useCallback, useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RecipePickerModal } from '@/components/recipe-picker-modal';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { theme } from '@/constants/nutriedu-theme';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { PlannedMeal, Recipe } from '@/types/api';

const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const mealTypes = ['Desayuno', 'Almuerzo', 'Cena'];

type ActiveSlot = { day: string; mealType: string } | null;
type SaveStatus = { type: 'success' | 'error'; message: string } | null;

export default function PlanScreen() {
  const { token, user } = useAuth();
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
      const [savedPlan, safeRecipes] = await Promise.all([
        apiRequest<PlannedMeal[]>(`/planner/${user?.id}`, { token }),
        apiRequest<Recipe[]>(`/recipes/safe/${user?.id}`, { token }),
      ]);
      setMeals(savedPlan);
      setRecipes(safeRecipes);
      setDirty(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Error consultando el plan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

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
    };

    setMeals((currentMeals) => [
      ...currentMeals.filter((meal) => !(normalizeDay(meal.dia_semana) === normalizeDay(activeSlot.day) && meal.tipo_comida === activeSlot.mealType)),
      nextMeal,
    ]);
    setDirty(true);
    setStatus(null);
    setActiveSlot(null);
  };

  const removeMeal = (day: string, mealType: string) => {
    setMeals((current) => current.filter(
      (meal) => !(normalizeDay(meal.dia_semana) === normalizeDay(day) && meal.tipo_comida === mealType),
    ));
    setDirty(true);
    setStatus(null);
  };

  const savePlan = async () => {
    try {
      setSaving(true);
      setStatus(null);
      await apiRequest('/planner', {
        method: 'POST',
        token,
        body: JSON.stringify({
          plan: meals.map((meal) => ({
            recetaId: meal.receta_id,
            diaSemana: canonicalDay(meal.dia_semana),
            tipoComida: meal.tipo_comida,
          })),
        }),
      });
      await loadPlan();
      setStatus({ type: 'success', message: 'Plan guardado. La lista de compras ya esta actualizada.' });
    } catch (requestError) {
      setStatus({
        type: 'error',
        message: requestError instanceof Error ? requestError.message : 'No pudimos guardar el plan',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Cargando tu plan semanal..." />;
  if (error && meals.length === 0) return <ErrorState message={error} />;

  const selectedMeal = activeSlot ? getMeal(activeSlot.day, activeSlot.mealType) : undefined;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPlan(); }} tintColor={theme.colors.primary} />}>
        <View>
          <Text style={styles.title}>Plan semanal</Text>
          <Text style={styles.subtitle}>{meals.length} de 21 espacios planificados</Text>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, Math.round((meals.length / 21) * 100))}%` }]} /></View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {status ? (
          <Text style={[styles.status, status.type === 'error' ? styles.errorStatus : styles.successStatus]}>{status.message}</Text>
        ) : null}

        {days.map((day) => (
          <View key={day} style={styles.daySection}>
            <Text style={styles.dayTitle}>{day}</Text>
            {mealTypes.map((mealType) => {
              const meal = getMeal(day, mealType);
              return (
                <View key={mealType} style={styles.mealRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${mealType}, ${meal?.receta_nombre || 'sin receta'}`}
                    onPress={() => setActiveSlot({ day, mealType })}
                    style={({ pressed }) => [styles.mealSelection, pressed && styles.pressed]}>
                    <View style={styles.mealIcon}><Ionicons name={meal ? 'restaurant-outline' : 'add'} size={18} color={theme.colors.primary} /></View>
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealType}>{mealType}</Text>
                      <Text style={[styles.mealName, !meal && styles.emptyMeal]} numberOfLines={2}>{meal?.receta_nombre || 'Agregar receta'}</Text>
                    </View>
                    {meal ? <Text style={styles.calories}>{meal.calorias ?? '--'} kcal</Text> : <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />}
                  </Pressable>
                  {meal ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${meal.receta_nombre}`} hitSlop={8} onPress={() => removeMeal(day, mealType)} style={styles.removeButton}>
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
          disabled={!dirty || saving}
          onPress={savePlan}
          style={({ pressed }) => [styles.saveButton, (!dirty || saving) && styles.disabledButton, pressed && dirty && styles.pressed]}>
          <Ionicons name="save-outline" size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : dirty ? 'Guardar plan semanal' : 'Plan guardado'}</Text>
        </Pressable>
      </ScrollView>

      <RecipePickerModal
        visible={Boolean(activeSlot)}
        slotLabel={activeSlot ? `${activeSlot.day} · ${activeSlot.mealType}` : ''}
        recipes={recipes}
        selectedRecipeId={selectedMeal?.receta_id}
        onClose={() => setActiveSlot(null)}
        onSelect={assignRecipe}
      />
    </SafeAreaView>
  );
}

const normalizeDay = (day: string) => day.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const canonicalDay = (day: string) => days.find((candidate) => normalizeDay(candidate) === normalizeDay(day)) || day;

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
  daySection: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: theme.spacing.md, gap: 8 },
  dayTitle: { color: theme.colors.primaryPressed, fontSize: 17, fontWeight: '800', marginBottom: 2 },
  mealRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 4 },
  mealSelection: { flex: 1, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  mealIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.small, backgroundColor: theme.colors.surfaceMuted },
  mealInfo: { flex: 1, minWidth: 0 },
  mealType: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  mealName: { color: theme.colors.text, fontSize: 14, fontWeight: '700', marginTop: 2 },
  emptyMeal: { color: theme.colors.primary },
  calories: { color: theme.colors.textMuted, fontSize: 12 },
  removeButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  saveButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: theme.radius.medium, backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.md },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  disabledButton: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
});
