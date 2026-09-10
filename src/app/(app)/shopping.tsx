import { useCallback, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { theme } from '@/constants/nutriedu-theme';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { storage } from '@/services/storage';
import { DetailedShoppingListResponse, ShoppingListItem } from '@/types/api';

const CHECKED_KEY = 'nutriedu_shopping_checked';

const categoryDefinitions = {
  protein: { order: 1, icon: 'nutrition-outline' },
  vegetable: { order: 2, icon: 'leaf-outline' },
  fruit: { order: 3, icon: 'nutrition-outline' },
  carbohydrate: { order: 4, icon: 'restaurant-outline' },
  legume: { order: 5, icon: 'ellipse-outline' },
  dairy: { order: 6, icon: 'water-outline' },
  fat: { order: 7, icon: 'water-outline' },
  seasoning: { order: 8, icon: 'flask-outline' },
  beverage: { order: 9, icon: 'cafe-outline' },
  other: { order: 10, icon: 'basket-outline' },
} as const;

type Category = keyof typeof categoryDefinitions;
type ListMode = 'all' | 'pending';
type CheckedState = Record<number, boolean>;
type StoredProgress = { planSignature: string; checked: CheckedState };

const emptyShoppingData: DetailedShoppingListResponse = {
  items: [],
  planSignature: '',
  plannedMeals: 0,
  missingQuantityItems: 0,
};

function parseStoredProgress(value: string | null, data: DetailedShoppingListResponse): CheckedState {
  if (!value) return {};

  try {
    const saved = JSON.parse(value) as StoredProgress;
    if (saved.planSignature !== data.planSignature || !saved.checked) return {};

    const validIds = new Set(data.items.map((item) => item.id));
    return Object.fromEntries(
      Object.entries(saved.checked).filter(([id, isChecked]) => isChecked && validIds.has(Number(id))),
    );
  } catch {
    return {};
  }
}

function normalizeCategory(foodGroup: string): Category {
  return foodGroup in categoryDefinitions ? foodGroup as Category : 'other';
}

function formatNumber(value: number, language?: string) {
  return new Intl.NumberFormat(language === 'en' ? 'en-US' : 'es-CO', {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function ShoppingScreen() {
  const { token, user } = useAuth();
  const { t, i18n } = useTranslation();
  const [shoppingData, setShoppingData] = useState(emptyShoppingData);
  const [checked, setChecked] = useState<CheckedState>({});
  const [mode, setMode] = useState<ListMode>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const progressKey = `${CHECKED_KEY}:${user?.id ?? 'guest'}`;

  const fetchList = useCallback(async () => {
    if (!user?.id) throw new Error(t('shopping.loadError'));

    const [result, saved] = await Promise.all([
      apiRequest<DetailedShoppingListResponse>(`/planner/${user.id}/shopping-list?detailed=true`, { token }),
      storage.get(`${CHECKED_KEY}:${user.id}`),
    ]);

    return { result, saved: parseStoredProgress(saved, result) };
  }, [t, token, user?.id]);

  const applyList = useCallback(({ result, saved }: { result: DetailedShoppingListResponse; saved: CheckedState }) => {
    setShoppingData(result);
    setChecked(saved);
    setError('');
  }, []);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    setLoading(true);

    fetchList()
      .then((data) => { if (!cancelled) applyList(data); })
      .catch((requestError) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : t('shopping.loadError'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [applyList, fetchList, t]));

  const refresh = async () => {
    setRefreshing(true);
    try {
      applyList(await fetchList());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('shopping.loadError'));
    } finally {
      setRefreshing(false);
    }
  };

  const completed = useMemo(
    () => shoppingData.items.filter((item) => checked[item.id]).length,
    [checked, shoppingData.items],
  );
  const progress = shoppingData.items.length
    ? Math.round((completed / shoppingData.items.length) * 100)
    : 0;

  const groupedItems = useMemo(() => {
    const groups = new Map<Category, ShoppingListItem[]>();
    const visibleItems = mode === 'all'
      ? shoppingData.items
      : shoppingData.items.filter((item) => !checked[item.id]);

    visibleItems.forEach((item) => {
      const category = normalizeCategory(item.foodGroup);
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category)?.push(item);
    });

    return Array.from(groups.entries()).sort(
      ([left], [right]) => categoryDefinitions[left].order - categoryDefinitions[right].order,
    );
  }, [checked, mode, shoppingData.items]);

  const persistProgress = useCallback((next: CheckedState) => {
    if (!shoppingData.planSignature) return;
    void storage.set(progressKey, JSON.stringify({
      planSignature: shoppingData.planSignature,
      checked: next,
    } satisfies StoredProgress));
  }, [progressKey, shoppingData.planSignature]);

  const toggleItem = (id: number) => {
    setChecked((current) => {
      const next = { ...current, [id]: !current[id] };
      if (!next[id]) delete next[id];
      persistProgress(next);
      return next;
    });
  };

  const resetProgress = () => {
    Alert.alert(t('shopping.resetTitle'), t('shopping.resetMessage'), [
      { text: t('shopping.cancel'), style: 'cancel' },
      {
        text: t('shopping.confirmReset'),
        style: 'destructive',
        onPress: () => {
          setChecked({});
          persistProgress({});
        },
      },
    ]);
  };

  if (loading) return <LoadingState label={t('shopping.loading')} />;
  if (error && shoppingData.items.length === 0) return <ErrorState message={error} />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />
        )}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{t('shopping.title')}</Text>
            <Text style={styles.subtitle}>{t('shopping.subtitle')}</Text>
          </View>
          {completed > 0 ? (
            <Pressable accessibilityRole="button" onPress={resetProgress} hitSlop={8}>
              <Text style={styles.reset}>{t('shopping.reset')}</Text>
            </Pressable>
          ) : null}
        </View>

        {shoppingData.items.length ? (
          <>
            <View style={styles.progressPanel}>
              <View style={styles.progressHeader}>
                <View>
                  <Text style={styles.progressLabel}>
                    {t('shopping.completed', { completed, total: shoppingData.items.length })}
                  </Text>
                  <Text style={styles.mealCount}>
                    {t('shopping.plannedMeals', { count: shoppingData.plannedMeals })}
                  </Text>
                </View>
                <Text style={styles.progressPercent}>{progress}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>

            <View accessibilityRole="tablist" style={styles.segmentedControl}>
              {(['all', 'pending'] as ListMode[]).map((option) => {
                const selected = mode === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => setMode(option)}
                    style={[styles.segment, selected && styles.segmentSelected]}
                  >
                    <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                      {t(`shopping.${option}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {shoppingData.missingQuantityItems > 0 ? (
          <View style={styles.warning}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.warning} />
            <Text style={styles.warningText}>
              {t('shopping.incompleteQuantity', { count: shoppingData.missingQuantityItems })}
            </Text>
          </View>
        ) : null}

        {groupedItems.length ? groupedItems.map(([category, items]) => (
          <ShoppingGroup
            key={category}
            category={category}
            items={items}
            checked={checked}
            language={i18n.resolvedLanguage}
            onToggle={toggleItem}
          />
        )) : (
          <View style={styles.empty}>
            <Ionicons
              name={shoppingData.items.length ? 'checkmark-circle-outline' : 'cart-outline'}
              size={32}
              color={theme.colors.primary}
            />
            <Text style={styles.emptyTitle}>
              {t(shoppingData.items.length ? 'shopping.pendingEmptyTitle' : 'shopping.emptyTitle')}
            </Text>
            <Text style={styles.emptyText}>
              {t(shoppingData.items.length ? 'shopping.pendingEmptyText' : 'shopping.emptyText')}
            </Text>
            {shoppingData.items.length ? (
              <Pressable accessibilityRole="button" onPress={() => setMode('all')} style={styles.emptyAction}>
                <Text style={styles.emptyActionText}>{t('shopping.showCompleted')}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ShoppingGroup({
  category,
  items,
  checked,
  language,
  onToggle,
}: {
  category: Category;
  items: ShoppingListItem[];
  checked: CheckedState;
  language?: string;
  onToggle: (id: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <View style={styles.groupTitleRow}>
          <Ionicons name={categoryDefinitions[category].icon} size={19} color={theme.colors.primary} />
          <Text style={styles.groupTitle}>{t(`shopping.groups.${category}`)}</Text>
        </View>
        <Text style={styles.groupCount}>{t('shopping.groupCount', { count: items.length })}</Text>
      </View>

      {items.map((item, index) => {
        const done = Boolean(checked[item.id]);
        const origin = item.sourceRecipes.length
          ? `${t('shopping.use', { count: item.plannedUses })} · ${item.sourceRecipes.join(', ')}`
          : t('shopping.noRecipeOrigin');

        return (
          <Pressable
            key={item.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            onPress={() => onToggle(item.id)}
            style={({ pressed }) => [
              styles.item,
              index > 0 && styles.itemBorder,
              done && styles.itemDone,
              pressed && styles.itemPressed,
            ]}
          >
            <Ionicons
              name={done ? 'checkbox' : 'square-outline'}
              size={24}
              color={done ? theme.colors.primary : theme.colors.textMuted}
            />
            <View style={styles.itemCopy}>
              <Text style={[styles.itemText, done && styles.itemTextDone]}>{item.nombre}</Text>
              <Text style={styles.itemOrigin} numberOfLines={1}>{origin}</Text>
            </View>
            <Text style={styles.quantity}>{formatQuantity(item, language, t)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function formatQuantity(
  item: ShoppingListItem,
  language: string | undefined,
  t: ReturnType<typeof useTranslation>['t'],
) {
  const parts: string[] = [];
  const knownGrams = Number(item.knownAmountG);
  let totalGrams = item.knownAmountG !== null && Number.isFinite(knownGrams) ? knownGrams : null;

  item.quantities.forEach((quantity) => {
    const amount = Number(quantity.amount);
    const unit = String(quantity.unit || (language === 'en' ? 'unit' : 'unidad'));
    if (!Number.isFinite(amount)) return;

    if (['g', 'gramo', 'gramos', 'gram', 'grams'].includes(unit.toLowerCase())) {
      totalGrams = (totalGrams || 0) + amount;
      return;
    }
    parts.push(`${formatNumber(amount, language)} ${unit}`);
  });

  if (totalGrams !== null) parts.unshift(`${formatNumber(totalGrams, language)} g`);
  if (item.missingQuantityUses > 0) {
    parts.push(parts.length ? t('shopping.additionalMissingQuantity') : t('shopping.missingQuantity'));
  }

  return parts.join(' + ') || t('shopping.missingQuantity');
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: 14, paddingBottom: 48 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1 },
  title: { color: theme.colors.text, fontSize: 25, fontWeight: '800' },
  subtitle: { color: theme.colors.textMuted, marginTop: 4, lineHeight: 20 },
  reset: { color: theme.colors.primary, fontWeight: '700', paddingTop: 7 },
  progressPanel: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: theme.spacing.md, gap: 12 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  progressLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  mealCount: { color: theme.colors.textMuted, fontSize: 12, marginTop: 3 },
  progressPercent: { color: theme.colors.primary, fontSize: 18, fontWeight: '800' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: theme.colors.border },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
  segmentedControl: { flexDirection: 'row', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: 3 },
  segment: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.small },
  segmentSelected: { backgroundColor: theme.colors.surfaceMuted },
  segmentText: { color: theme.colors.textMuted, fontWeight: '700' },
  segmentTextSelected: { color: theme.colors.primary },
  error: { color: theme.colors.danger, backgroundColor: theme.colors.dangerSurface, borderRadius: theme.radius.small, padding: 12 },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: theme.colors.warningSurface, borderRadius: theme.radius.medium, padding: 12 },
  warningText: { flex: 1, color: theme.colors.warning, lineHeight: 19 },
  group: { overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface },
  groupHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: theme.colors.surfaceMuted, paddingHorizontal: theme.spacing.md },
  groupTitleRow: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupTitle: { flex: 1, color: theme.colors.text, fontWeight: '800' },
  groupCount: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
  item: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: theme.spacing.md, paddingVertical: 11 },
  itemBorder: { borderTopWidth: 1, borderTopColor: theme.colors.border },
  itemDone: { backgroundColor: '#F7FBF8' },
  itemPressed: { opacity: 0.72 },
  itemCopy: { minWidth: 0, flex: 1 },
  itemText: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  itemTextDone: { color: theme.colors.textMuted, textDecorationLine: 'line-through' },
  itemOrigin: { color: theme.colors.textMuted, fontSize: 11, marginTop: 4 },
  quantity: { maxWidth: 112, color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', textAlign: 'right', lineHeight: 17 },
  empty: { alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: 28 },
  emptyTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyAction: { minHeight: 42, justifyContent: 'center', paddingHorizontal: theme.spacing.md, marginTop: 4 },
  emptyActionText: { color: theme.colors.primary, fontWeight: '700' },
});
