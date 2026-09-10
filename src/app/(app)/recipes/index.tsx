import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RecipeCard } from '@/components/recipe-card';
import {
  emptyRecipeFilters,
  countActiveRecipeFilters,
  RecipeFilterControls,
  RecipeFilters,
  validateRecipeFilters,
} from '@/components/recipe-filters';
import { LoadingState } from '@/components/screen-state';
import { theme } from '@/constants/nutriedu-theme';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { Recipe, RecipeSearchResponse, RecommendationProfileContext } from '@/types/api';

const PAGE_SIZE = 12;

export default function RecipesScreen() {
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filters, setFilters] = useState<RecipeFilters>(emptyRecipeFilters);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [recommendationContext, setRecommendationContext] = useState<RecommendationProfileContext | null>(null);
  const [error, setError] = useState('');
  const requestSequence = useRef(0);

  const search = useCallback(async (
    currentFilters: RecipeFilters,
    options: { offset?: number; append?: boolean; signal?: AbortSignal } = {},
  ) => {
    const { offset = 0, append = false, signal } = options;
    const validationError = validateRecipeFilters(currentFilters, t('recipes.filters.invalidCalories'));
    if (validationError) {
      setLoading(false);
      setSearching(false);
      setRefreshing(false);
      setLoadingMore(false);
      setNextOffset(null);
      return;
    }

    const requestId = ++requestSequence.current;
    try {
      setError('');
      if (append) setLoadingMore(true);
      else setSearching(true);
      const result = await apiRequest<RecipeSearchResponse>(buildRecipesPath(user?.id, currentFilters, offset), { token, signal });
      if (requestId !== requestSequence.current) return;
      setRecipes((current) => append ? mergeRecipes(current, result.recipes) : result.recipes);
      setNextOffset(result.pagination.nextOffset);
      if (!append) setRecommendationContext(result.profileContext || null);
    } catch (requestError) {
      if (requestError instanceof Error && requestError.name === 'AbortError') return;
      if (requestId === requestSequence.current) {
        setError(requestError instanceof Error ? requestError.message : t('recipes.searchingError'));
      }
    } finally {
      if (!signal?.aborted && requestId === requestSequence.current) {
        setLoading(false);
        setSearching(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [t, token, user]);

  useEffect(() => {
    requestSequence.current += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => search(filters, { signal: controller.signal }), 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filters, search]);

  const refresh = () => {
    setRefreshing(true);
    search(filters);
  };

  const loadMore = () => {
    if (nextOffset === null || loadingMore || searching) return;
    search(filters, { offset: nextOffset, append: true });
  };

  if (loading) return <LoadingState label={t('recipes.loading')} />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FlatList
        data={recipes}
        keyExtractor={(item) => String(item.id)}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
        ListHeaderComponent={(
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{countActiveRecipeFilters(filters) === 0 ? t('recipes.recommendedTitle') : t('recipes.exploreTitle')}</Text>
              <Text style={styles.subtitle}>{countActiveRecipeFilters(filters) === 0 ? t('recipes.recommendedSubtitle') : t('recipes.exploreSubtitle')}</Text>
            </View>
            {countActiveRecipeFilters(filters) === 0 && recommendationContext?.clinicalReviewRequired ? (
              <Text style={styles.warning}>{t('recipes.clinicalReview')}</Text>
            ) : null}
            {countActiveRecipeFilters(filters) === 0 && recommendationContext?.missingFactors?.includes('profile') ? (
              <Text style={styles.notice}>{t('recipes.incompleteProfile')}</Text>
            ) : null}
            <RecipeFilterControls value={filters} onChange={setFilters} />
            <View style={styles.resultRow}>
              <Text style={styles.resultCount}>{t('recipes.loaded', { count: recipes.length })}</Text>
              {searching ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        )}
        renderItem={({ item }) => (
          <RecipeCard recipe={item} onPress={() => router.push({ pathname: '/(app)/recipes/[id]', params: { id: item.id } })} />
        )}
        ListEmptyComponent={!searching ? <Text style={styles.empty}>{t('recipes.empty')}</Text> : null}
        ListFooterComponent={nextOffset !== null ? (
          <Pressable
            accessibilityRole="button"
            disabled={loadingMore}
            onPress={loadMore}
            style={({ pressed }) => [styles.loadMoreButton, pressed && styles.pressed, loadingMore && styles.disabled]}>
            {loadingMore ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
            <Text style={styles.loadMoreText}>{loadingMore ? t('recipes.loadingMore') : t('recipes.loadMore')}</Text>
          </Pressable>
        ) : null}
      />
    </SafeAreaView>
  );
}

const buildRecipesPath = (userId: number | undefined, filters: RecipeFilters, offset: number) => {
  if (countActiveRecipeFilters(filters) === 0) {
    return `/recipes/recommendations?limit=${PAGE_SIZE}&offset=${offset}`;
  }
  const params = [`query=${encodeURIComponent(filters.query.trim())}`, 'safe_only=true', 'paginated=true', `limit=${PAGE_SIZE}`, `offset=${offset}`];
  if (filters.health !== 'all') params.push(`nivel_salud=${filters.health}`);
  if (filters.caloriesMin) params.push(`calorias_min=${filters.caloriesMin}`);
  if (filters.caloriesMax) params.push(`calorias_max=${filters.caloriesMax}`);
  return `/recipes/search/${userId}?${params.join('&')}`;
};

const mergeRecipes = (current: Recipe[], incoming: Recipe[]) => {
  const byId = new Map(current.map((recipe) => [recipe.id, recipe]));
  incoming.forEach((recipe) => byId.set(recipe.id, recipe));
  return Array.from(byId.values());
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: 40 },
  header: { gap: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: 25, fontWeight: '800' },
  subtitle: { color: theme.colors.textMuted, fontSize: 15, lineHeight: 21, marginTop: theme.spacing.xs },
  resultRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultCount: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
  error: { color: theme.colors.danger, backgroundColor: theme.colors.dangerSurface, borderRadius: theme.radius.small, padding: 12 },
  warning: { color: theme.colors.warning, backgroundColor: theme.colors.warningSurface, borderRadius: theme.radius.small, padding: 12, lineHeight: 19, fontWeight: '700' },
  notice: { color: theme.colors.text, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.small, padding: 12, lineHeight: 19 },
  empty: { color: theme.colors.textMuted, textAlign: 'center', lineHeight: 20, paddingVertical: 48 },
  loadMoreButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, marginTop: theme.spacing.sm, paddingHorizontal: 14 },
  loadMoreText: { color: theme.colors.primary, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.6 },
});
