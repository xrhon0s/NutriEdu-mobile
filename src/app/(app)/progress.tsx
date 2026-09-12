import { useCallback, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChoiceField, FormField, FormSection, SaveButton } from '@/components/profile-controls';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { theme } from '@/constants/nutriedu-theme';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { ProgressEntry, ProgressResponse, ProgressSummary } from '@/types/api';

const PAGE_SIZE = 10;
const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({ recordedOn: today(), weightKg: '', waistCm: '', bodyFatPct: '', adherencePct: '', energyLevel: '', notes: '' });

export default function ProgressScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<ProgressEntry[]>([]);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async (offset = 0) => {
    const response = await apiRequest<ProgressResponse>(`/profile/progress?limit=${PAGE_SIZE}&offset=${offset}`, { token });
    setItems((current) => offset ? [...current, ...response.items] : response.items);
    setSummary(response.summary);
    setHasMore(response.pagination.hasMore);
  }, [token]);

  const refresh = useCallback(async () => {
    try { setError(''); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No pudimos cargar el seguimiento'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [load]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const save = async () => {
    try {
      setSaving(true); setError(''); setMessage('');
      await apiRequest('/profile/progress', { method: 'POST', token, body: JSON.stringify(form) });
      setForm(emptyForm());
      setMessage('Medicion guardada. Tu peso actual se sincroniza desde el registro mas reciente.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pudimos guardar la medicion');
    } finally { setSaving(false); }
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    try { setLoadingMore(true); await load(items.length); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No pudimos cargar mas mediciones'); }
    finally { setLoadingMore(false); }
  };

  const remove = (entry: ProgressEntry) => Alert.alert('Eliminar medicion', `Se eliminara el registro del ${String(entry.recorded_on).slice(0, 10)}.`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: async () => {
      try {
        setError('');
        await apiRequest(`/profile/progress/${entry.id}`, { method: 'DELETE', token });
        await load();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'No pudimos eliminar la medicion');
      }
    } },
  ]);

  if (loading) return <LoadingState label="Cargando seguimiento..." />;
  if (error && !items.length) return <ErrorState message={error} onRetry={() => { setLoading(true); void refresh(); }} />;

  const update = (field: keyof ReturnType<typeof emptyForm>, value: string) => setForm((current) => ({ ...current, [field]: value }));
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void refresh(); }} tintColor={theme.colors.primary} />}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Volver al perfil" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color={theme.colors.text} /></Pressable>
            <View style={styles.headerCopy}><Text style={styles.eyebrow}>EVOLUCION PERSONAL</Text><Text style={styles.title}>Seguimiento de progreso</Text></View>
          </View>
          <Text style={styles.subtitle}>Registra datos comparables en condiciones similares. Estas medidas orientan tu perfil, no reemplazan una evaluacion profesional.</Text>

          {summary?.entries ? <Summary summary={summary} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.success}>{message}</Text> : null}

          <View style={styles.panel}>
            <FormSection title="Nueva medicion" description="Puedes completar solo las variables disponibles.">
              <FormField label="Fecha" value={form.recordedOn} placeholder="AAAA-MM-DD" onChangeText={(value) => update('recordedOn', value)} />
              <View style={styles.pair}>
                <View style={styles.flex}><FormField label="Peso" unit="kg" keyboardType="decimal-pad" value={form.weightKg} onChangeText={(value) => update('weightKg', value)} /></View>
                <View style={styles.flex}><FormField label="Cintura" unit="cm" keyboardType="decimal-pad" value={form.waistCm} onChangeText={(value) => update('waistCm', value)} /></View>
              </View>
              <View style={styles.pair}>
                <View style={styles.flex}><FormField label="Grasa corporal" unit="%" keyboardType="decimal-pad" value={form.bodyFatPct} onChangeText={(value) => update('bodyFatPct', value)} /></View>
                <View style={styles.flex}><FormField label="Adherencia al plan" unit="%" keyboardType="decimal-pad" value={form.adherencePct} onChangeText={(value) => update('adherencePct', value)} /></View>
              </View>
              <ChoiceField label="Energia percibida" value={form.energyLevel} onChange={(value) => update('energyLevel', value)} choices={[1,2,3,4,5].map((value) => ({ value: String(value), label: String(value) }))} />
              <FormField label="Notas" value={form.notes} multiline onChangeText={(value) => update('notes', value)} />
            </FormSection>
            <SaveButton label="Guardar medicion" saving={saving} onPress={save} />
          </View>

          <FormSection title="Historial" description={summary ? `${summary.entries} mediciones registradas` : undefined}>
            {items.length ? items.map((item) => <ProgressRow key={item.id} item={item} onDelete={() => remove(item)} />) : <View style={styles.empty}><Ionicons name="analytics-outline" size={30} color={theme.colors.primary} /><Text style={styles.emptyTitle}>Todavia no hay mediciones</Text><Text style={styles.emptyText}>Tu primera medicion sera la linea base para comparar cambios.</Text></View>}
          </FormSection>
          {hasMore ? <Pressable accessibilityRole="button" disabled={loadingMore} onPress={loadMore} style={styles.more}><Text style={styles.moreText}>{loadingMore ? 'Cargando...' : 'Cargar mas'}</Text></Pressable> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Summary({ summary }: { summary: ProgressSummary }) {
  const metrics = [
    ['Peso', summary.latest?.weight_kg, summary.change?.weightKg, 'kg'],
    ['Cintura', summary.latest?.waist_cm, summary.change?.waistCm, 'cm'],
    ['Grasa corporal', summary.latest?.body_fat_pct, summary.change?.bodyFatPct, '%'],
  ] as const;
  return <View style={styles.summary}>{metrics.map(([label, value, change, unit]) => <View key={label} style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value == null ? 'Sin dato' : `${value} ${unit}`}</Text><Text style={styles.metricChange}>{change == null ? 'Sin comparacion' : `${change > 0 ? '+' : ''}${change} ${unit} desde el inicio`}</Text></View>)}</View>;
}

function ProgressRow({ item, onDelete }: { item: ProgressEntry; onDelete: () => void }) {
  const values = [item.weight_kg != null ? `${item.weight_kg} kg` : null, item.waist_cm != null ? `${item.waist_cm} cm cintura` : null, item.body_fat_pct != null ? `${item.body_fat_pct}% grasa` : null].filter(Boolean);
  return <View style={styles.row}><View style={styles.rowIcon}><Ionicons name="pulse-outline" size={19} color={theme.colors.primary} /></View><View style={styles.flex}><Text style={styles.rowDate}>{String(item.recorded_on).slice(0,10)}</Text><Text style={styles.rowValues}>{values.join(' · ') || 'Medicion de bienestar'}</Text>{item.adherence_pct != null || item.energy_level != null ? <Text style={styles.rowMeta}>{item.adherence_pct != null ? `Adherencia ${item.adherence_pct}%` : ''}{item.adherence_pct != null && item.energy_level != null ? ' · ' : ''}{item.energy_level != null ? `Energia ${item.energy_level}/5` : ''}</Text> : null}</View><Pressable accessibilityRole="button" accessibilityLabel="Eliminar medicion" onPress={onDelete} hitSlop={8} style={styles.delete}><Ionicons name="trash-outline" size={19} color={theme.colors.danger} /></Pressable></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 56 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 9 }, back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, headerCopy: { flex: 1 }, eyebrow: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' }, title: { color: theme.colors.text, fontSize: 24, fontWeight: '800', marginTop: 2 }, subtitle: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
  summary: { flexDirection: 'row', gap: 8 }, metric: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: 11, gap: 4 }, metricLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' }, metricValue: { color: theme.colors.text, fontSize: 16, fontWeight: '800' }, metricChange: { color: theme.colors.textMuted, fontSize: 10, lineHeight: 14 },
  panel: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: theme.spacing.md, gap: theme.spacing.lg }, pair: { flexDirection: 'row', gap: 10 }, flex: { flex: 1, minWidth: 0 },
  error: { color: theme.colors.danger, backgroundColor: theme.colors.dangerSurface, padding: 12, borderRadius: theme.radius.small }, success: { color: theme.colors.primaryPressed, backgroundColor: theme.colors.surfaceMuted, padding: 12, borderRadius: theme.radius.small },
  row: { flexDirection: 'row', gap: 11, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: 13 }, rowIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.small }, rowDate: { color: theme.colors.text, fontWeight: '800' }, rowValues: { color: theme.colors.text, fontSize: 13, marginTop: 4 }, rowMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 4 },
  delete: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface }, emptyTitle: { color: theme.colors.text, fontWeight: '800' }, emptyText: { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 }, more: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.primary, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface }, moreText: { color: theme.colors.primary, fontWeight: '800' },
});
