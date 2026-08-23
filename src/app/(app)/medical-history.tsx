import { useCallback, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { theme } from '@/constants/nutriedu-theme';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import {
  MedicalDocumentHistoryDetail,
  MedicalDocumentHistoryItem,
  MedicalDocumentHistoryResponse,
  MedicalDocumentType,
} from '@/types/api';

const documentLabels: Record<MedicalDocumentType, string> = {
  prescription: 'Formula o receta',
  lab_result: 'Laboratorio',
  nutrition_order: 'Indicacion nutricional',
  medical_summary: 'Resumen clinico',
  other: 'Otro documento',
};

const targetLabels: Record<string, string> = {
  calories_min: 'Calorias minimas',
  calories_max: 'Calorias maximas',
  protein_min_g: 'Proteina minima',
  protein_max_g: 'Proteina maxima',
  carbs_min_g: 'Carbohidratos minimos',
  carbs_max_g: 'Carbohidratos maximos',
  fat_min_g: 'Grasas minimas',
  fat_max_g: 'Grasas maximas',
  saturated_fat_max_g: 'Grasa saturada maxima',
  sugar_max_g: 'Azucar maxima',
  fiber_min_g: 'Fibra minima',
  sodium_max_mg: 'Sodio maximo',
  water_min_ml: 'Agua minima',
};

export default function MedicalHistoryScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [items, setItems] = useState<MedicalDocumentHistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, MedicalDocumentHistoryDetail>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async (cursor?: number) => {
    const response = await apiRequest<MedicalDocumentHistoryResponse>(
      `/medical-documents/history${cursor ? `?cursor=${cursor}` : ''}`,
      { token },
    );
    setItems((current) => cursor ? [...current, ...response.items] : response.items);
    setNextCursor(response.nextCursor);
  }, [token]);

  const refresh = useCallback(async () => {
    try {
      setError('');
      await loadHistory();
      setDetails({});
      setExpandedId(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pudimos consultar el historial');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadHistory]);

  useFocusEffect(useCallback(() => {
    refresh();
  }, [refresh]));

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    try {
      setLoadingMore(true);
      setError('');
      await loadHistory(nextCursor);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pudimos cargar mas revisiones');
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleDetail = async (reviewId: number) => {
    if (expandedId === reviewId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(reviewId);
    if (details[reviewId]) return;
    try {
      setLoadingDetailId(reviewId);
      setError('');
      const detail = await apiRequest<MedicalDocumentHistoryDetail>(
        `/medical-documents/history/${reviewId}`,
        { token },
      );
      setDetails((current) => ({ ...current, [reviewId]: detail }));
    } catch (requestError) {
      setExpandedId(null);
      setError(requestError instanceof Error ? requestError.message : 'No pudimos abrir esta revision');
    } finally {
      setLoadingDetailId(null);
    }
  };

  const requestDelete = (item: MedicalDocumentHistoryItem) => {
    Alert.alert(
      'Eliminar revision',
      'Se eliminaran los hallazgos estructurados de esta revision. El perfil no cambiara.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteReview(item.reviewId) },
      ],
    );
  };

  const deleteReview = async (reviewId: number) => {
    try {
      setError('');
      await apiRequest(`/medical-documents/history/${reviewId}`, { method: 'DELETE', token });
      setItems((current) => current.filter((item) => item.reviewId !== reviewId));
      setDetails((current) => {
        const next = { ...current };
        delete next[reviewId];
        return next;
      });
      if (expandedId === reviewId) setExpandedId(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pudimos eliminar la revision');
    }
  };

  if (loading) return <LoadingState label="Cargando historial medico..." />;
  if (error && items.length === 0) return <ErrorState message={error} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refresh(); }} tintColor={theme.colors.primary} />}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver al perfil" onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>PRIVACIDAD Y CONTROL</Text>
            <Text style={styles.title}>Historial medico</Text>
          </View>
        </View>

        <View style={styles.policyBand}>
          <Ionicons name="shield-outline" size={23} color={theme.colors.primary} />
          <Text style={styles.policyText}>Los archivos originales no se guardan. Las revisiones sin aplicar expiran a los 30 dias.</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {items.length ? items.map((item) => (
          <HistoryItem
            key={item.reviewId}
            item={item}
            detail={details[item.reviewId]}
            expanded={expandedId === item.reviewId}
            loadingDetail={loadingDetailId === item.reviewId}
            onToggle={() => toggleDetail(item.reviewId)}
            onDelete={() => requestDelete(item)}
          />
        )) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={34} color={theme.colors.primary} />
            <Text style={styles.emptyTitle}>Sin revisiones guardadas</Text>
            <Text style={styles.emptyText}>Los documentos revisados apareceran aqui.</Text>
          </View>
        )}

        {nextCursor ? (
          <Pressable accessibilityRole="button" disabled={loadingMore} onPress={loadMore} style={({ pressed }) => [styles.loadMoreButton, pressed && styles.pressed]}>
            <Text style={styles.loadMoreText}>{loadingMore ? 'Cargando...' : 'Cargar mas'}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function HistoryItem({ item, detail, expanded, loadingDetail, onToggle, onDelete }: {
  item: MedicalDocumentHistoryItem;
  detail?: MedicalDocumentHistoryDetail;
  expanded: boolean;
  loadingDetail: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.historyItem}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggle} style={({ pressed }) => [styles.itemHeader, pressed && styles.pressed]}>
        <View style={styles.itemText}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemTitle}>{documentLabels[item.documentType]}</Text>
            <View style={[styles.statusBadge, item.status === 'applied' && styles.appliedBadge]}>
              <Text style={[styles.statusText, item.status === 'applied' && styles.appliedStatusText]}>{item.status === 'applied' ? 'Aplicado' : 'Revisado'}</Text>
            </View>
          </View>
          <Text numberOfLines={expanded ? undefined : 2} style={styles.summary}>{item.summary}</Text>
          <Text style={styles.meta}>{formatDate(item.reviewedAt)} · {item.acceptedCount} hallazgos</Text>
          {item.retention.expiresAt ? <Text style={styles.expiration}>Expira {formatDate(item.retention.expiresAt)}</Text> : null}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textMuted} />
      </Pressable>

      {expanded ? (
        <View style={styles.detailArea}>
          {loadingDetail ? <Text style={styles.detailLoading}>Cargando hallazgos...</Text> : null}
          {detail ? <FindingSummary detail={detail} /> : null}
          {item.retention.canDelete ? (
            <Pressable accessibilityRole="button" onPress={onDelete} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
              <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
              <Text style={styles.deleteText}>Eliminar revision</Text>
            </Pressable>
          ) : (
            <Text style={styles.auditText}>Registro aplicado: se conserva hasta eliminar la cuenta.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

function FindingSummary({ detail }: { detail: MedicalDocumentHistoryDetail }) {
  const findings = detail.acceptedFindings;
  return (
    <View style={styles.findings}>
      {findings.medications.map((item) => <FindingLine key={item.id} icon="medical-outline" text={[item.name, item.dose, item.frequency].filter(Boolean).join(' · ')} />)}
      {findings.conditions.map((item) => <FindingLine key={item.id} icon="pulse-outline" text={item.name} />)}
      {findings.dietaryInstructions.map((item) => <FindingLine key={item.id} icon="nutrition-outline" text={item.instruction} />)}
      {findings.nutritionTargets.map((item) => <FindingLine key={item.id} icon="speedometer-outline" text={`${targetLabel(item.field)}: ${item.value} ${item.unit} por dia`} />)}
    </View>
  );
}

function FindingLine({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return <View style={styles.findingLine}><Ionicons name={icon} size={18} color={theme.colors.primary} /><Text style={styles.findingText}>{text}</Text></View>;
}

const targetLabel = (field: string) => targetLabels[field] || field;

const formatDate = (value: string) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value));

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, minWidth: 0 },
  eyebrow: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  title: { color: theme.colors.text, fontSize: 25, fontWeight: '800', marginTop: 3 },
  policyBand: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderLeftWidth: 3, borderLeftColor: theme.colors.primary, backgroundColor: theme.colors.surfaceMuted, padding: 12 },
  policyText: { flex: 1, color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  error: { color: theme.colors.danger, backgroundColor: theme.colors.dangerSurface, borderRadius: theme.radius.small, padding: 12 },
  historyItem: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, overflow: 'hidden' },
  itemHeader: { minHeight: 110, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
  itemText: { flex: 1, minWidth: 0, gap: 5 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTitle: { flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  statusBadge: { borderRadius: theme.radius.small, backgroundColor: theme.colors.background, paddingHorizontal: 8, paddingVertical: 4 },
  appliedBadge: { backgroundColor: theme.colors.surfaceMuted },
  statusText: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '800' },
  appliedStatusText: { color: theme.colors.primaryPressed },
  summary: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  meta: { color: theme.colors.textMuted, fontSize: 11 },
  expiration: { color: theme.colors.warning, fontSize: 11, fontWeight: '700' },
  detailArea: { gap: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, padding: 14 },
  detailLoading: { color: theme.colors.textMuted, fontSize: 13 },
  findings: { gap: 10 },
  findingLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  findingText: { flex: 1, color: theme.colors.text, fontSize: 13, lineHeight: 18 },
  deleteButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: theme.colors.danger, borderRadius: theme.radius.small },
  deleteText: { color: theme.colors.danger, fontSize: 13, fontWeight: '800' },
  auditText: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
  emptyState: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface },
  emptyTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
  emptyText: { color: theme.colors.textMuted, fontSize: 13 },
  loadMoreButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.primary, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface },
  loadMoreText: { color: theme.colors.primary, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.76 },
});
