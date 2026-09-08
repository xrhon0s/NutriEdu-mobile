import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/nutriedu-theme';
import { Recipe } from '@/types/api';

export function RecipeCard({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  const { t } = useTranslation();
  const health = getHealthLabel(recipe.nivel_salud, t);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.header}>
        <View style={styles.iconBox}><Ionicons name="nutrition-outline" size={22} color={theme.colors.primary} /></View>
        <View style={styles.badges}>
          {recipe.recommendation ? <View style={styles.matchBadge}><Text style={styles.matchText}>{t('recipes.card.match', { score: recipe.recommendation.score })}</Text></View> : null}
          <View style={styles.healthBadge}><Text style={styles.healthText}>{health}</Text></View>
        </View>
      </View>
      <Text style={styles.name}>{recipe.nombre}</Text>
      <Text style={styles.description} numberOfLines={2}>{recipe.descripcion || t('recipes.card.noDescription')}</Text>
      <View style={styles.metrics}>
        <Text style={styles.metric}>{recipe.calorias ?? '--'} kcal</Text>
        <Text style={styles.metric}>{recipe.tiempo_preparacion ? `${recipe.tiempo_preparacion} min` : t('recipes.card.timePending')}</Text>
      </View>
      {recipe.recommendation?.confidence != null && recipe.recommendation.confidence < 0.5 ? <Text style={styles.dataNotice}>{t('recipes.card.limitedData')}</Text> : null}
      <View style={styles.action}><Text style={styles.actionText}>{t('recipes.card.evaluation')}</Text><Ionicons name="chevron-forward" size={16} color={theme.colors.primary} /></View>
    </Pressable>
  );
}

const getHealthLabel = (level: number, t: (key: string) => string) => level >= 5 ? t('recipes.filters.veryHealthy') : level >= 3 ? t('recipes.filters.healthy') : t('recipes.filters.moderate');

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: theme.spacing.md, gap: 10 },
  pressed: { opacity: 0.75 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 },
  matchBadge: { borderRadius: theme.radius.small, backgroundColor: theme.colors.surfaceMuted, paddingHorizontal: 8, paddingVertical: 5 },
  matchText: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  iconBox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.medium, backgroundColor: theme.colors.surfaceMuted },
  healthBadge: { borderRadius: theme.radius.small, backgroundColor: theme.colors.surfaceMuted, paddingHorizontal: 8, paddingVertical: 5 },
  healthText: { color: theme.colors.primaryPressed, fontSize: 11, fontWeight: '700' },
  name: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  description: { minHeight: 40, color: theme.colors.textMuted, lineHeight: 20 },
  metrics: { flexDirection: 'row', gap: 12 },
  metric: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  dataNotice: { color: theme.colors.warning, fontSize: 12, fontWeight: '700' },
  action: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 2, paddingTop: 4 },
  actionText: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },
});
