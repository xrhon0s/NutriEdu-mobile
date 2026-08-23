import { useCallback, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { theme } from '@/constants/nutriedu-theme';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { storage } from '@/services/storage';
import { Ingredient } from '@/types/api';

const CHECKED_KEY = 'nutriedu_shopping_checked';

export default function ShoppingScreen() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<Ingredient[]>([]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadList = async () => {
    try {
      setError('');
      setItems(await apiRequest<Ingredient[]>(`/planner/${user?.id}/shopping-list`, { token }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Error consultando la lista');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    Promise.all([
      apiRequest<Ingredient[]>(`/planner/${user?.id}/shopping-list`, { token }),
      storage.get(CHECKED_KEY),
    ])
      .then(([result, saved]) => {
        if (!cancelled) {
          setItems(result);
          if (saved) setChecked(JSON.parse(saved));
        }
      })
      .catch((requestError) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Error consultando la lista'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, user?.id]));

  const completed = useMemo(() => items.filter((item) => checked[item.id]).length, [checked, items]);
  const progress = items.length ? Math.round((completed / items.length) * 100) : 0;

  const toggle = async (id: number) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    await storage.set(CHECKED_KEY, JSON.stringify(next));
  };

  const reset = async () => {
    setChecked({});
    await storage.remove(CHECKED_KEY);
  };

  if (loading) return <LoadingState label="Generando lista de compras..." />;
  if (error && items.length === 0) return <ErrorState message={error} />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadList(); }} tintColor={theme.colors.primary} />}>
        <View style={styles.headerRow}><View><Text style={styles.title}>Lista de compras</Text><Text style={styles.subtitle}>{completed} de {items.length} completados</Text></View>{items.length ? <Pressable accessibilityRole="button" onPress={reset}><Text style={styles.reset}>Reiniciar</Text></Pressable> : null}</View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {items.length ? items.map((item) => {
          const done = Boolean(checked[item.id]);
          return (
            <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: done }} onPress={() => toggle(item.id)} style={({ pressed }) => [styles.item, done && styles.itemDone, pressed && { opacity: 0.75 }]}>
              <Ionicons name={done ? 'checkbox' : 'square-outline'} size={24} color={done ? theme.colors.primary : theme.colors.textMuted} />
              <Text style={[styles.itemText, done && styles.itemTextDone]}>{item.nombre}</Text>
            </Pressable>
          );
        }) : <View style={styles.empty}><Ionicons name="cart-outline" size={28} color={theme.colors.primary} /><Text style={styles.emptyTitle}>Sin ingredientes</Text><Text style={styles.emptyText}>Agrega recetas al plan semanal para generar tu lista.</Text></View>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: 12, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: theme.colors.text, fontSize: 25, fontWeight: '800' },
  subtitle: { color: theme.colors.textMuted, marginTop: 4 },
  reset: { color: theme.colors.primary, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: theme.colors.border, marginBottom: 4 },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
  error: { color: theme.colors.danger, backgroundColor: theme.colors.dangerSurface, borderRadius: theme.radius.small, padding: 12 },
  item: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md },
  itemDone: { backgroundColor: theme.colors.surfaceMuted },
  itemText: { flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  itemTextDone: { color: theme.colors.textMuted, textDecorationLine: 'line-through' },
  empty: { alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: 28 },
  emptyTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
