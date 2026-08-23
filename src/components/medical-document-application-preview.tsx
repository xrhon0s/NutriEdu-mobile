import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/nutriedu-theme';
import { MedicalDocumentApplicationPreview } from '@/types/api';

type Props = {
  preview: MedicalDocumentApplicationPreview;
  applying: boolean;
  applied: boolean;
  onApply: () => void;
  onBack: () => void;
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

export function MedicalDocumentApplicationPreviewView({ preview, applying, applied, onApply, onBack }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const disabled = !confirmed || applying || applied || preview.changeCount === 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver a la revision" onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={21} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>CONFIRMACION FINAL</Text>
          <Text style={styles.title}>Cambios en tu perfil</Text>
        </View>
      </View>

      <View style={styles.notice}>
        <Ionicons name="shield-checkmark-outline" size={22} color={theme.colors.primary} />
        <Text style={styles.noticeText}>Nada se aplicara hasta que confirmes esta vista previa.</Text>
      </View>

      {preview.changes.conditions.length ? (
        <PreviewSection title="Condiciones clinicas">
          {preview.changes.conditions.map((condition) => (
            <View key={condition.findingId} style={styles.changeRow}>
              <View style={styles.changeText}>
                <Text style={styles.changeTitle}>{condition.name}</Text>
                <Text style={styles.changeDescription}>{condition.evidence}</Text>
              </View>
              <ChangeBadge action={condition.action} />
            </View>
          ))}
        </PreviewSection>
      ) : null}

      {preview.changes.targets.length ? (
        <PreviewSection title="Metas nutricionales diarias">
          {preview.changes.targets.map((target) => (
            <View key={target.findingId} style={styles.targetRow}>
              <Text style={styles.changeTitle}>{targetLabels[target.field] || target.field}</Text>
              <View style={styles.valueChange}>
                <Text style={styles.previousValue}>{formatValue(target.previousValue, target.unit)}</Text>
                <Ionicons name="arrow-forward" size={17} color={theme.colors.textMuted} />
                <Text style={styles.nextValue}>{formatValue(target.nextValue, target.unit)}</Text>
              </View>
              {target.action === 'keep' ? <Text style={styles.unchangedText}>Ya tiene este valor</Text> : null}
            </View>
          ))}
        </PreviewSection>
      ) : null}

      {preview.changes.excludedFindings.length ? (
        <PreviewSection title="Revisado, sin cambio de perfil">
          {preview.changes.excludedFindings.map((finding) => (
            <View key={finding.id} style={styles.excludedRow}>
              <Ionicons name="remove-circle-outline" size={19} color={theme.colors.textMuted} />
              <View style={styles.changeText}>
                <Text style={styles.changeTitle}>{finding.label}</Text>
                <Text style={styles.changeDescription}>{finding.reason}</Text>
              </View>
            </View>
          ))}
        </PreviewSection>
      ) : null}

      {preview.changeCount === 0 ? (
        <Text style={styles.noChanges}>No hay cambios nuevos para aplicar.</Text>
      ) : null}

      {applied ? (
        <View style={styles.appliedStatus}>
          <Ionicons name="checkmark-circle" size={23} color={theme.colors.primary} />
          <Text style={styles.appliedText}>Perfil actualizado y operacion registrada.</Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: confirmed }}
          onPress={() => setConfirmed((current) => !current)}
          style={styles.confirmationRow}>
          <Ionicons name={confirmed ? 'checkbox' : 'square-outline'} size={23} color={theme.colors.primary} />
          <Text style={styles.confirmationText}>Revise estos cambios y autorizo aplicarlos a mi perfil.</Text>
        </Pressable>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onApply}
        style={({ pressed }) => [styles.applyButton, disabled && styles.disabled, pressed && styles.pressed]}>
        <Ionicons name="checkmark-done-outline" size={20} color="#FFFFFF" />
        <Text style={styles.applyButtonText}>{applying ? 'Aplicando...' : applied ? 'Cambios aplicados' : 'Aplicar cambios al perfil'}</Text>
      </Pressable>
    </View>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function ChangeBadge({ action }: { action: 'add' | 'keep' }) {
  return (
    <View style={[styles.badge, action === 'keep' && styles.keepBadge]}>
      <Text style={[styles.badgeText, action === 'keep' && styles.keepBadgeText]}>{action === 'add' ? 'Agregar' : 'Sin cambio'}</Text>
    </View>
  );
}

const formatValue = (value: number | null, unit: string) => value === null ? 'Sin valor' : `${value} ${unit}`;

const styles = StyleSheet.create({
  container: { gap: theme.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, minWidth: 0 },
  eyebrow: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  title: { color: theme.colors.text, fontSize: 25, fontWeight: '800', marginTop: 3 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 3, borderLeftColor: theme.colors.primary, backgroundColor: theme.colors.surfaceMuted, padding: 12 },
  noticeText: { flex: 1, color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  section: { gap: 10 },
  sectionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
  changeRow: { minHeight: 68, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.small, backgroundColor: theme.colors.surface, padding: 12 },
  changeText: { flex: 1, minWidth: 0 },
  changeTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  changeDescription: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  badge: { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.small, paddingHorizontal: 8, paddingVertical: 5 },
  badgeText: { color: theme.colors.primaryPressed, fontSize: 11, fontWeight: '800' },
  keepBadge: { backgroundColor: theme.colors.background },
  keepBadgeText: { color: theme.colors.textMuted },
  targetRow: { gap: 7, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.small, backgroundColor: theme.colors.surface, padding: 12 },
  valueChange: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 10 },
  previousValue: { color: theme.colors.textMuted, fontSize: 13 },
  nextValue: { color: theme.colors.primaryPressed, fontSize: 14, fontWeight: '800' },
  unchangedText: { color: theme.colors.textMuted, fontSize: 11 },
  excludedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: theme.colors.background, padding: 10 },
  noChanges: { color: theme.colors.warning, backgroundColor: theme.colors.warningSurface, padding: 12, fontSize: 13, fontWeight: '700' },
  confirmationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: 12 },
  confirmationText: { flex: 1, color: theme.colors.text, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  appliedStatus: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: theme.colors.surfaceMuted, padding: 12 },
  appliedText: { flex: 1, color: theme.colors.primaryPressed, fontSize: 13, fontWeight: '800' },
  applyButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: theme.radius.medium, backgroundColor: theme.colors.primary, paddingHorizontal: 14 },
  applyButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.76 },
});
