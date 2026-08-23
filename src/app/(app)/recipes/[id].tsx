import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { theme } from '@/constants/nutriedu-theme';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { Ingredient, Recipe, RecipeAlert, RecipeEvaluation } from '@/types/api';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const { t } = useTranslation();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [evaluation, setEvaluation] = useState<RecipeEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiRequest<Recipe>(`/recipes/${id}`, { token }),
      apiRequest<Ingredient[]>(`/recipes/${id}/ingredients`, { token }),
      apiRequest<RecipeEvaluation>(`/recipes/evaluate/${id}`, { token }),
    ])
      .then(([recipeResult, ingredientResult, evaluationResult]) => {
        if (!cancelled) {
          setRecipe(recipeResult);
          setIngredients(ingredientResult);
          setEvaluation(evaluationResult);
        }
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : t('recipes.detail.error'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, t, token]);

  if (loading) return <LoadingState label={t('recipes.detail.loading')} />;
  if (error || !recipe || !evaluation) return <ErrorState message={error || t('recipes.detail.notFound')} />;

  const status = getStatusContent(evaluation.status, t);
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.eyebrow}>{t('recipes.detail.eyebrow')}</Text>
          <Text style={styles.title}>{recipe.nombre}</Text>
          <Text style={styles.description}>{recipe.descripcion || t('recipes.card.noDescription')}</Text>
        </View>

        <View style={[styles.scorePanel, { backgroundColor: status.background }]}>
          <View>
            <Text style={[styles.status, { color: status.color }]}>{status.label}</Text>
            <Text style={styles.scoreCaption}>{t('recipes.detail.compatibility')}</Text>
          </View>
          <Text style={[styles.score, { color: status.color }]}>{evaluation.score}</Text>
        </View>

        <View style={styles.metrics}>
          <Metric label={t('recipes.detail.calories')} value={recipe.calorias ? `${recipe.calorias} kcal` : t('common.pending')} />
          <Metric label={t('recipes.detail.time')} value={recipe.tiempo_preparacion ? `${recipe.tiempo_preparacion} min` : t('common.pending')} />
          <Metric label={t('recipes.detail.health')} value={`${recipe.nivel_salud}/5`} />
        </View>

        {evaluation.unsafeIngredients.length > 0 && (
          <View style={[styles.section, styles.dangerSection]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.danger }]}>{t('recipes.detail.restrictedIngredients')}</Text>
            {evaluation.unsafeIngredients.map((ingredient) => <Bullet key={ingredient.id} text={ingredient.nombre} danger />)}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('recipes.detail.ingredients')}</Text>
          {ingredients.length ? ingredients.map((ingredient) => <Bullet key={ingredient.id} text={ingredient.nombre} />) : <Text style={styles.empty}>{t('recipes.detail.noIngredients')}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('recipes.detail.alerts')}</Text>
          {evaluation.alerts.length ? evaluation.alerts.map((alert, index) => <AlertRow key={`${alert.source}-${alert.nutrient}-${index}`} alert={alert} />) : <Text style={styles.empty}>{t('recipes.detail.noAlerts')}</Text>}
        </View>

        {!evaluation.context.hasTargets && (
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.warning} />
            <Text style={styles.noticeText}>{t('recipes.detail.targetsNotice')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

function Bullet({ text, danger = false }: { text: string; danger?: boolean }) {
  return <View style={styles.bulletRow}><View style={[styles.bullet, danger && { backgroundColor: theme.colors.danger }]} /><Text style={styles.bulletText}>{text}</Text></View>;
}

function AlertRow({ alert }: { alert: RecipeAlert }) {
  const { t } = useTranslation();
  const danger = alert.severity === 'danger';
  return (
    <View style={styles.alertRow}>
      <Ionicons name={danger ? 'alert-circle-outline' : 'information-circle-outline'} size={20} color={danger ? theme.colors.danger : theme.colors.warning} />
      <View style={styles.alertText}><Text style={styles.alertMessage}>{alert.message}</Text><Text style={styles.alertValue}>{t('recipes.detail.evaluatedValue', { value: alert.value, unit: alert.unit })}</Text></View>
    </View>
  );
}

const getStatusContent = (status: RecipeEvaluation['status'], t: (key: string) => string) => ({
  suitable: { label: t('recipes.detail.status.suitable'), color: theme.colors.primaryPressed, background: theme.colors.surfaceMuted },
  suitable_with_adjustments: { label: t('recipes.detail.status.suitableWithAdjustments'), color: theme.colors.warning, background: theme.colors.warningSurface },
  review_required: { label: t('recipes.detail.status.reviewRequired'), color: theme.colors.danger, background: theme.colors.dangerSurface },
  not_suitable: { label: t('recipes.detail.status.notSuitable'), color: theme.colors.danger, background: theme.colors.dangerSurface },
})[status];

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 44 },
  eyebrow: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  title: { color: theme.colors.text, fontSize: 27, fontWeight: '800', marginTop: theme.spacing.xs },
  description: { color: theme.colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: theme.spacing.sm },
  scorePanel: { minHeight: 92, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: theme.radius.medium, padding: theme.spacing.md },
  status: { fontSize: 17, fontWeight: '800' },
  scoreCaption: { color: theme.colors.textMuted, fontSize: 12, marginTop: 4 },
  score: { fontSize: 38, fontWeight: '900' },
  metrics: { flexDirection: 'row', gap: theme.spacing.sm },
  metric: { flex: 1, minHeight: 72, justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: 10 },
  metricLabel: { color: theme.colors.textMuted, fontSize: 11 },
  metricValue: { color: theme.colors.text, fontSize: 14, fontWeight: '800', marginTop: 4 },
  section: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: theme.spacing.md, gap: 10 },
  dangerSection: { borderColor: '#F4B4AF', backgroundColor: theme.colors.dangerSurface },
  sectionTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800', marginBottom: 2 },
  empty: { color: theme.colors.textMuted, lineHeight: 20 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary },
  bulletText: { flex: 1, color: theme.colors.text, lineHeight: 20 },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 5 },
  alertText: { flex: 1 },
  alertMessage: { color: theme.colors.text, lineHeight: 20 },
  alertValue: { color: theme.colors.textMuted, fontSize: 12, marginTop: 3 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: theme.radius.medium, backgroundColor: theme.colors.warningSurface, padding: theme.spacing.md },
  noticeText: { flex: 1, color: theme.colors.warning, lineHeight: 20 },
});
