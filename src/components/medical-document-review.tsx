import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChoiceField } from '@/components/profile-controls';
import { theme } from '@/constants/nutriedu-theme';
import {
  MedicalDocumentExtraction,
  MedicalNutritionTargetFinding,
} from '@/types/api';

type MedicalDocumentReviewProps = {
  extraction: MedicalDocumentExtraction;
  acceptedFindingIds: string[];
  reviewing: boolean;
  reviewedCount: number | null;
  onChange: (extraction: MedicalDocumentExtraction) => void;
  onToggleFinding: (findingId: string) => void;
  onReview: () => void;
  onCancel: () => void;
};

const targetDefinitions: Record<MedicalNutritionTargetFinding['field'], {
  label: string;
  unit: MedicalNutritionTargetFinding['unit'];
  maximum: number;
}> = {
  calories_min: { label: 'Calorias minimas', unit: 'kcal', maximum: 20000 },
  calories_max: { label: 'Calorias maximas', unit: 'kcal', maximum: 20000 },
  protein_min_g: { label: 'Proteina minima', unit: 'g', maximum: 5000 },
  protein_max_g: { label: 'Proteina maxima', unit: 'g', maximum: 5000 },
  carbs_min_g: { label: 'Carbohidratos minimos', unit: 'g', maximum: 5000 },
  carbs_max_g: { label: 'Carbohidratos maximos', unit: 'g', maximum: 5000 },
  fat_min_g: { label: 'Grasas minimas', unit: 'g', maximum: 5000 },
  fat_max_g: { label: 'Grasas maximas', unit: 'g', maximum: 5000 },
  saturated_fat_max_g: { label: 'Grasa saturada maxima', unit: 'g', maximum: 5000 },
  sugar_max_g: { label: 'Azucar maxima', unit: 'g', maximum: 5000 },
  fiber_min_g: { label: 'Fibra minima', unit: 'g', maximum: 5000 },
  sodium_max_mg: { label: 'Sodio maximo', unit: 'mg', maximum: 100000 },
  water_min_ml: { label: 'Agua minima', unit: 'ml', maximum: 20000 },
};

const targetChoices = Object.entries(targetDefinitions).map(([value, definition]) => ({
  value,
  label: definition.label,
}));

export function MedicalDocumentReview({
  extraction,
  acceptedFindingIds,
  reviewing,
  reviewedCount,
  onChange,
  onToggleFinding,
  onReview,
  onCancel,
}: MedicalDocumentReviewProps) {
  const [targetDrafts, setTargetDrafts] = useState<Record<string, string>>(() => Object.fromEntries(
    extraction.nutritionTargets.map((target) => [target.id, String(target.value)]),
  ));

  const updateMedication = (id: string, patch: Partial<MedicalDocumentExtraction['medications'][number]>) => {
    onChange({
      ...extraction,
      medications: extraction.medications.map((item) => item.id === id ? { ...item, ...patch } : item),
    });
  };

  const updateCondition = (id: string, patch: Partial<MedicalDocumentExtraction['conditions'][number]>) => {
    onChange({
      ...extraction,
      conditions: extraction.conditions.map((item) => item.id === id ? { ...item, ...patch } : item),
    });
  };

  const updateDietaryInstruction = (id: string, instruction: string) => {
    onChange({
      ...extraction,
      dietaryInstructions: extraction.dietaryInstructions.map((item) => (
        item.id === id ? { ...item, instruction } : item
      )),
    });
  };

  const updateTarget = (id: string, patch: Partial<MedicalNutritionTargetFinding>) => {
    onChange({
      ...extraction,
      nutritionTargets: extraction.nutritionTargets.map((item) => item.id === id ? { ...item, ...patch } : item),
    });
  };

  const updateTargetField = (target: MedicalNutritionTargetFinding, value: string) => {
    const field = value as MedicalNutritionTargetFinding['field'];
    updateTarget(target.id, { field, unit: targetDefinitions[field].unit });
  };

  const updateTargetValue = (target: MedicalNutritionTargetFinding, value: string) => {
    const normalized = value.replace(',', '.').replace(/\s/g, '');
    if (!/^\d*(?:\.\d*)?$/.test(normalized)) return;
    setTargetDrafts((current) => ({ ...current, [target.id]: normalized }));
    if (normalized && normalized !== '.') {
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) updateTarget(target.id, { value: parsed });
    }
  };

  const allFindings = [
    ...extraction.medications,
    ...extraction.conditions,
    ...extraction.dietaryInstructions,
    ...extraction.nutritionTargets,
  ];
  const hasInvalidText = extraction.medications.some((item) => !item.name.trim())
    || extraction.conditions.some((item) => !item.name.trim() || !item.evidence.trim())
    || extraction.dietaryInstructions.some((item) => !item.instruction.trim());
  const hasInvalidTarget = extraction.nutritionTargets.some((target) => {
    const draft = targetDrafts[target.id] ?? '';
    const value = Number(draft);
    return !draft || !Number.isFinite(value) || value < 0 || value > targetDefinitions[target.field].maximum;
  });
  const reviewDisabled = reviewing || hasInvalidText || hasInvalidTarget;

  return (
    <View style={styles.container}>
      <View style={styles.reviewHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver al documento" onPress={onCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={21} color={theme.colors.text} />
        </Pressable>
        <View style={styles.reviewHeaderText}>
          <Text style={styles.eyebrow}>REVISION HUMANA</Text>
          <Text style={styles.title}>Hallazgos del documento</Text>
        </View>
      </View>

      <View style={styles.summaryBand}>
        <Text style={styles.summary}>{extraction.summary || 'Sin resumen disponible.'}</Text>
        <Text style={styles.summaryMeta}>
          {[extraction.documentDate, extraction.professionalName].filter(Boolean).join(' · ') || 'Sin fecha ni profesional confirmado'}
        </Text>
      </View>

      <Text style={styles.selectionCount}>{acceptedFindingIds.length} de {allFindings.length} hallazgos aceptados</Text>

      {extraction.medications.length ? (
        <ReviewSection title="Medicamentos">
          {extraction.medications.map((item) => (
            <Finding key={item.id} title={item.name || 'Medicamento'} confidence={item.confidence} accepted={acceptedFindingIds.includes(item.id)} onToggle={() => onToggleFinding(item.id)}>
              <ReviewField label="Nombre" value={item.name} onChangeText={(name) => updateMedication(item.id, { name })} />
              <View style={styles.fieldPair}>
                <View style={styles.pairedField}><ReviewField label="Dosis" value={item.dose || ''} onChangeText={(dose) => updateMedication(item.id, { dose: dose || null })} /></View>
                <View style={styles.pairedField}><ReviewField label="Frecuencia" value={item.frequency || ''} onChangeText={(frequency) => updateMedication(item.id, { frequency: frequency || null })} /></View>
              </View>
              <ReviewField label="Indicaciones" value={item.instructions || ''} onChangeText={(instructions) => updateMedication(item.id, { instructions: instructions || null })} multiline />
            </Finding>
          ))}
        </ReviewSection>
      ) : null}

      {extraction.conditions.length ? (
        <ReviewSection title="Posibles condiciones">
          {extraction.conditions.map((item) => (
            <Finding key={item.id} title={item.name || 'Condicion'} confidence={item.confidence} accepted={acceptedFindingIds.includes(item.id)} onToggle={() => onToggleFinding(item.id)}>
              <ReviewField label="Nombre" value={item.name} onChangeText={(name) => updateCondition(item.id, { name })} />
              <ReviewField label="Evidencia observada" value={item.evidence} onChangeText={(evidence) => updateCondition(item.id, { evidence })} multiline />
              {item.catalogCode ? <Text style={styles.catalogCode}>Catalogo: {item.catalogCode}</Text> : null}
            </Finding>
          ))}
        </ReviewSection>
      ) : null}

      {extraction.dietaryInstructions.length ? (
        <ReviewSection title="Indicaciones alimentarias">
          {extraction.dietaryInstructions.map((item) => (
            <Finding key={item.id} title="Indicacion" confidence={item.confidence} accepted={acceptedFindingIds.includes(item.id)} onToggle={() => onToggleFinding(item.id)}>
              <ReviewField label="Texto corregido" value={item.instruction} onChangeText={(value) => updateDietaryInstruction(item.id, value)} multiline />
            </Finding>
          ))}
        </ReviewSection>
      ) : null}

      {extraction.nutritionTargets.length ? (
        <ReviewSection title="Metas nutricionales">
          {extraction.nutritionTargets.map((target) => (
            <Finding key={target.id} title={targetDefinitions[target.field].label} confidence={target.confidence} accepted={acceptedFindingIds.includes(target.id)} onToggle={() => onToggleFinding(target.id)}>
              <ChoiceField label="Tipo de meta" value={target.field} choices={targetChoices} onChange={(value) => updateTargetField(target, value)} />
              <View style={styles.targetValueRow}>
                <TextInput
                  accessibilityLabel={`Valor de ${targetDefinitions[target.field].label}`}
                  value={targetDrafts[target.id] ?? String(target.value)}
                  onChangeText={(value) => updateTargetValue(target, value)}
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  style={styles.targetInput}
                />
                <Text style={styles.unit}>{target.unit}</Text>
              </View>
              <View style={styles.periodRow}>
                {(['per_day', 'per_meal'] as const).map((period) => (
                  <Pressable key={period} accessibilityRole="radio" accessibilityState={{ selected: target.period === period }} onPress={() => updateTarget(target.id, { period })} style={[styles.periodOption, target.period === period && styles.periodSelected]}>
                    <Text style={[styles.periodText, target.period === period && styles.periodTextSelected]}>{period === 'per_day' ? 'Por dia' : 'Por comida'}</Text>
                  </Pressable>
                ))}
              </View>
              {hasTargetError(targetDrafts[target.id] ?? '', targetDefinitions[target.field].maximum) ? <Text style={styles.fieldError}>Valor fuera del rango permitido.</Text> : null}
            </Finding>
          ))}
        </ReviewSection>
      ) : null}

      {extraction.uncertainties.length ? (
        <View style={styles.uncertaintyBand}>
          <Text style={styles.uncertaintyTitle}>Incertidumbres</Text>
          {extraction.uncertainties.map((item, index) => <Text key={`${index}-${item}`} style={styles.uncertaintyText}>• {item}</Text>)}
        </View>
      ) : null}

      {reviewedCount !== null ? (
        <View style={styles.reviewedStatus}>
          <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
          <Text style={styles.reviewedText}>{reviewedCount} hallazgos revisados. El perfil no fue modificado.</Text>
        </View>
      ) : null}

      <Text style={styles.auditDisclosure}>Al confirmar se guardan los hallazgos estructurados para auditoria. El archivo original no se conserva y el perfil aun no cambia.</Text>

      <Pressable accessibilityRole="button" disabled={reviewDisabled} onPress={onReview} style={({ pressed }) => [styles.reviewButton, reviewDisabled && styles.disabled, pressed && styles.pressed]}>
        <Ionicons name="shield-checkmark-outline" size={20} color="#FFFFFF" />
        <Text style={styles.reviewButtonText}>{reviewing ? 'Revisando...' : 'Confirmar revision'}</Text>
      </Pressable>
    </View>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function Finding({ title, confidence, accepted, onToggle, children }: {
  title: string;
  confidence: 'low' | 'medium' | 'high';
  accepted: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.finding}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} onPress={onToggle} style={styles.findingHeader}>
        <Ionicons name={accepted ? 'checkbox' : 'square-outline'} size={22} color={theme.colors.primary} />
        <Text style={styles.findingTitle}>{title}</Text>
        <Text style={styles.confidence}>{confidenceLabels[confidence]}</Text>
      </Pressable>
      <View style={styles.findingFields}>{children}</View>
    </View>
  );
}

function ReviewField({ label, value, onChangeText, multiline = false }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.fieldInput, multiline && styles.multilineInput]} />
    </View>
  );
}

const hasTargetError = (value: string, maximum: number) => {
  const parsed = Number(value);
  return !value || !Number.isFinite(parsed) || parsed < 0 || parsed > maximum;
};

const confidenceLabels = { low: 'Baja', medium: 'Media', high: 'Alta' } as const;

const styles = StyleSheet.create({
  container: { gap: theme.spacing.lg },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  reviewHeaderText: { flex: 1, minWidth: 0 },
  eyebrow: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  title: { color: theme.colors.text, fontSize: 23, fontWeight: '800', marginTop: 3 },
  summaryBand: { borderLeftWidth: 3, borderLeftColor: theme.colors.primary, backgroundColor: theme.colors.surfaceMuted, padding: 12 },
  summary: { color: theme.colors.text, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  summaryMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 5 },
  selectionCount: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
  section: { gap: theme.spacing.md },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  finding: { gap: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: theme.spacing.md },
  findingHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9 },
  findingTitle: { flex: 1, minWidth: 0, color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  confidence: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  findingFields: { gap: 10, paddingLeft: 31 },
  field: { gap: 5 },
  fieldLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
  fieldInput: { minHeight: 46, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, color: theme.colors.text, fontSize: 14, paddingHorizontal: 12 },
  multilineInput: { minHeight: 82, paddingTop: 11, paddingBottom: 11 },
  fieldPair: { flexDirection: 'row', gap: 8 },
  pairedField: { flex: 1, minWidth: 0 },
  catalogCode: { color: theme.colors.textMuted, fontSize: 11 },
  targetValueRow: { width: 190, minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, paddingHorizontal: 12 },
  targetInput: { flex: 1, minWidth: 0, color: theme.colors.text, fontSize: 15, fontWeight: '800', paddingVertical: 9 },
  unit: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodOption: { minHeight: 40, justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.small, backgroundColor: theme.colors.surface, paddingHorizontal: 12 },
  periodSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surfaceMuted },
  periodText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
  periodTextSelected: { color: theme.colors.primaryPressed },
  fieldError: { color: theme.colors.danger, fontSize: 11 },
  uncertaintyBand: { borderLeftWidth: 3, borderLeftColor: theme.colors.warning, backgroundColor: theme.colors.warningSurface, padding: 12, gap: 5 },
  uncertaintyTitle: { color: theme.colors.warning, fontSize: 14, fontWeight: '800' },
  uncertaintyText: { color: theme.colors.warning, fontSize: 13, lineHeight: 18 },
  reviewedStatus: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: theme.colors.surfaceMuted, padding: 12 },
  reviewedText: { flex: 1, color: theme.colors.primaryPressed, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  auditDisclosure: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 },
  reviewButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: theme.radius.medium, backgroundColor: theme.colors.primary, paddingHorizontal: 14 },
  reviewButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.76 },
});
