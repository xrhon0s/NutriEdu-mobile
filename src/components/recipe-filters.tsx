import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '@/constants/nutriedu-theme';
import { Recipe } from '@/types/api';
import { useTranslation } from 'react-i18next';

export type HealthFilter = 'all' | 'muy_saludable' | 'saludable' | 'moderada';

export type RecipeFilters = {
  query: string;
  health: HealthFilter;
  caloriesMin: string;
  caloriesMax: string;
};

export const emptyRecipeFilters: RecipeFilters = {
  query: '',
  health: 'all',
  caloriesMin: '',
  caloriesMax: '',
};

const healthOptions: { value: HealthFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'recipes.filters.all' },
  { value: 'muy_saludable', labelKey: 'recipes.filters.veryHealthy' },
  { value: 'saludable', labelKey: 'recipes.filters.healthy' },
  { value: 'moderada', labelKey: 'recipes.filters.moderate' },
];

type RecipeFilterControlsProps = {
  value: RecipeFilters;
  onChange: (filters: RecipeFilters) => void;
  autoFocus?: boolean;
};

export function RecipeFilterControls({ value, onChange, autoFocus = false }: RecipeFilterControlsProps) {
  const { t } = useTranslation();
  const update = <Key extends keyof RecipeFilters>(key: Key, nextValue: RecipeFilters[Key]) => {
    onChange({ ...value, [key]: nextValue });
  };
  const activeCount = countActiveRecipeFilters(value);
  const validationError = validateRecipeFilters(value, t('recipes.filters.invalidCalories'));

  return (
    <View style={styles.container}>
      <View style={styles.searchShell}>
        <Ionicons name="search-outline" size={20} color={theme.colors.textMuted} />
        <TextInput
          autoFocus={autoFocus}
          value={value.query}
          onChangeText={(text) => update('query', text)}
          placeholder={t('recipes.filters.searchPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {value.query ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('recipes.filters.clearSearch')} hitSlop={8} onPress={() => update('query', '')}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterHeader}>
        <Text style={styles.label}>{t('recipes.filters.healthLevel')}</Text>
        {activeCount ? (
          <Pressable accessibilityRole="button" onPress={() => onChange(emptyRecipeFilters)} style={styles.clearButton}>
            <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.clearText}>{t('recipes.filters.clear', { count: activeCount })}</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segments}>
        {healthOptions.map((option) => {
          const selected = value.health === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => update('health', option.value)}
              style={[styles.segment, selected && styles.selectedSegment]}>
              <Text style={[styles.segmentText, selected && styles.selectedSegmentText]}>{t(option.labelKey)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.calorieRow}>
        <View style={styles.calorieField}>
          <Text style={styles.label}>{t('recipes.filters.caloriesMin')}</Text>
          <TextInput
            value={value.caloriesMin}
            onChangeText={(text) => update('caloriesMin', numericText(text))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.calorieInput}
          />
        </View>
        <View style={styles.calorieField}>
          <Text style={styles.label}>{t('recipes.filters.caloriesMax')}</Text>
          <TextInput
            value={value.caloriesMax}
            onChangeText={(text) => update('caloriesMax', numericText(text))}
            keyboardType="number-pad"
            placeholder={t('common.noLimit')}
            placeholderTextColor={theme.colors.textMuted}
            style={styles.calorieInput}
          />
        </View>
      </View>
      {validationError ? <Text style={styles.validation}>{validationError}</Text> : null}
    </View>
  );
}

export function filterRecipes(recipes: Recipe[], filters: RecipeFilters) {
  const query = normalize(filters.query);
  const minimum = filters.caloriesMin ? Number(filters.caloriesMin) : null;
  const maximum = filters.caloriesMax ? Number(filters.caloriesMax) : null;

  return recipes.filter((recipe) => {
    if (query && !normalize(`${recipe.nombre} ${recipe.descripcion || ''}`).includes(query)) return false;
    if (!matchesHealth(recipe.nivel_salud, filters.health)) return false;
    const calories = recipe.calorias == null ? null : Number(recipe.calorias);
    if (minimum !== null && (calories === null || calories < minimum)) return false;
    if (maximum !== null && (calories === null || calories > maximum)) return false;
    return true;
  });
}

export function validateRecipeFilters(filters: RecipeFilters, errorMessage = 'Las calorias minimas no pueden superar las maximas.') {
  if (filters.caloriesMin && filters.caloriesMax && Number(filters.caloriesMin) > Number(filters.caloriesMax)) {
    return errorMessage;
  }
  return '';
}

export function countActiveRecipeFilters(filters: RecipeFilters) {
  return Number(Boolean(filters.query.trim()))
    + Number(filters.health !== 'all')
    + Number(Boolean(filters.caloriesMin))
    + Number(Boolean(filters.caloriesMax));
}

const matchesHealth = (level: number, health: HealthFilter) => {
  if (health === 'muy_saludable') return level >= 5;
  if (health === 'saludable') return level >= 3 && level < 5;
  if (health === 'moderada') return level < 3;
  return true;
};

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const numericText = (value: string) => value.replace(/\D/g, '');

const styles = StyleSheet.create({
  container: { gap: 12 },
  searchShell: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, paddingHorizontal: 14 },
  searchInput: { flex: 1, minHeight: 48, color: theme.colors.text, fontSize: 15 },
  filterHeader: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
  clearButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  segments: { gap: 8 },
  segment: { minHeight: 38, justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.small, backgroundColor: theme.colors.surface, paddingHorizontal: 12 },
  selectedSegment: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surfaceMuted },
  segmentText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
  selectedSegmentText: { color: theme.colors.primaryPressed },
  calorieRow: { flexDirection: 'row', gap: 10 },
  calorieField: { flex: 1, minWidth: 0, gap: 6 },
  calorieInput: { minHeight: 46, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, color: theme.colors.text, fontSize: 15, paddingHorizontal: 12 },
  validation: { color: theme.colors.danger, fontSize: 12, lineHeight: 17 },
});
