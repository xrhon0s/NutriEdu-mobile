import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '@/constants/nutriedu-theme';
import { FoodAnalysisEvaluation, FoodVisionAnalysis } from '@/types/api';

type FoodAnalysisReviewProps = {
  analysis: FoodVisionAnalysis;
  evaluation: FoodAnalysisEvaluation;
  dirty: boolean;
  reviewing: boolean;
  onChange: (analysis: FoodVisionAnalysis) => void;
  onReview: () => void;
};

type NutrientKey = Exclude<keyof FoodVisionAnalysis['nutrition'], 'confidence'>;

const nutritionFields: { key: NutrientKey; label: string; unit: string; maximum: number }[] = [
  { key: 'calories', label: 'Calorias', unit: 'kcal', maximum: 20000 },
  { key: 'protein_g', label: 'Proteina', unit: 'g', maximum: 5000 },
  { key: 'carbs_g', label: 'Carbohidratos', unit: 'g', maximum: 5000 },
  { key: 'fat_g', label: 'Grasas', unit: 'g', maximum: 5000 },
  { key: 'saturated_fat_g', label: 'Grasa saturada', unit: 'g', maximum: 5000 },
  { key: 'sugar_g', label: 'Azucar', unit: 'g', maximum: 5000 },
  { key: 'fiber_g', label: 'Fibra', unit: 'g', maximum: 5000 },
  { key: 'sodium_mg', label: 'Sodio', unit: 'mg', maximum: 100000 },
];

export function FoodAnalysisReview({ analysis, evaluation, dirty, reviewing, onChange, onReview }: FoodAnalysisReviewProps) {
  const [newIngredient, setNewIngredient] = useState('');
  const [portionGrams, setPortionGrams] = useState(() => numberInputValue(analysis.portion.estimatedGrams));
  const [nutritionDrafts, setNutritionDrafts] = useState(() => nutritionInputValues(analysis));
  const [previousAnalysis, setPreviousAnalysis] = useState(analysis);

  if (!dirty && analysis !== previousAnalysis) {
    setPreviousAnalysis(analysis);
    setPortionGrams(numberInputValue(analysis.portion.estimatedGrams));
    setNutritionDrafts(nutritionInputValues(analysis));
  }

  const updateIngredient = (index: number, name: string) => {
    onChange({
      ...analysis,
      ingredients: analysis.ingredients.map((ingredient, currentIndex) => (
        currentIndex === index ? { ...ingredient, name } : ingredient
      )),
    });
  };

  const removeIngredient = (index: number) => {
    onChange({
      ...analysis,
      ingredients: analysis.ingredients.filter((_, currentIndex) => currentIndex !== index),
    });
  };

  const addIngredient = () => {
    const name = newIngredient.trim();
    if (!name) return;
    onChange({
      ...analysis,
      ingredients: [...analysis.ingredients, {
        name,
        estimatedGrams: null,
        confidence: 'high',
        uncertain: false,
      }],
    });
    setNewIngredient('');
  };

  const updatePortionGrams = (draft: string) => {
    const sanitized = sanitizeNumberInput(draft);
    if (sanitized === null) return;
    setPortionGrams(sanitized);
    onChange({
      ...analysis,
      portion: { ...analysis.portion, estimatedGrams: numberFromInput(sanitized) },
    });
  };

  const updateNutrition = (key: NutrientKey, draft: string) => {
    const sanitized = sanitizeNumberInput(draft);
    if (sanitized === null) return;
    setNutritionDrafts((current) => ({ ...current, [key]: sanitized }));
    onChange({
      ...analysis,
      nutrition: { ...analysis.nutrition, [key]: numberFromInput(sanitized) },
    });
  };

  const hasInvalidNumbers = numberInputError(portionGrams, 10000) !== ''
    || nutritionFields.some((field) => numberInputError(nutritionDrafts[field.key], field.maximum) !== '');
  const reviewDisabled = reviewing || hasInvalidNumbers
    || analysis.ingredients.some((ingredient) => !ingredient.name.trim());

  const status = dirty
    ? { label: 'Pendiente', color: theme.colors.warning, background: theme.colors.warningSurface }
    : evaluationStatus[evaluation.status];

  return (
    <View style={styles.container}>
      <View style={styles.resultHeader}>
        <View style={styles.resultHeaderText}>
          <Text style={styles.eyebrow}>RESULTADO PARA REVISAR</Text>
          <Text style={styles.dishName}>{analysis.dish.name || 'Plato no identificado'}</Text>
          <Text style={styles.description}>{analysis.dish.description}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {analysis.isFood ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredientes detectados</Text>
            {analysis.ingredients.map((ingredient, index) => (
              <View key={`ingredient-${index}`} style={styles.ingredientRow}>
                <TextInput
                  accessibilityLabel={`Ingrediente ${index + 1}`}
                  value={ingredient.name}
                  onChangeText={(name) => updateIngredient(index, name)}
                  style={styles.ingredientInput}
                />
                <Text style={styles.confidence}>{confidenceLabel[ingredient.confidence]}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${ingredient.name}`} hitSlop={8} onPress={() => removeIngredient(index)} style={styles.iconButton}>
                  <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                </Pressable>
              </View>
            ))}
            <View style={styles.addRow}>
              <TextInput
                value={newIngredient}
                onChangeText={setNewIngredient}
                placeholder="Agregar ingrediente"
                placeholderTextColor={theme.colors.textMuted}
                returnKeyType="done"
                onSubmitEditing={addIngredient}
                style={styles.addInput}
              />
              <Pressable accessibilityRole="button" accessibilityLabel="Agregar ingrediente" disabled={!newIngredient.trim()} onPress={addIngredient} style={styles.addButton}>
                <Ionicons name="add" size={20} color={theme.colors.primary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Porcion revisada</Text>
            <TextInput
              accessibilityLabel="Descripcion de la porcion"
              value={analysis.portion.description}
              onChangeText={(description) => onChange({
                ...analysis,
                portion: { ...analysis.portion, description },
              })}
              maxLength={200}
              placeholder="Ej. Un plato mediano"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.textField}
            />
            <View style={styles.numberFieldRow}>
              <TextInput
                accessibilityLabel="Peso estimado de la porcion en gramos"
                value={portionGrams}
                onChangeText={updatePortionGrams}
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholder="Sin dato"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.numberInput}
              />
              <Text style={styles.unit}>g</Text>
            </View>
            {numberInputError(portionGrams, 10000) ? <Text style={styles.fieldError}>Usa un valor entre 0 y 10000 g.</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estimacion nutricional revisada</Text>
            <View style={styles.nutritionGrid}>
              {nutritionFields.map((field) => (
                <View key={field.key} style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>{field.label}</Text>
                  <View style={styles.nutritionInputRow}>
                    <TextInput
                      accessibilityLabel={`${field.label} en ${field.unit}`}
                      value={nutritionDrafts[field.key]}
                      onChangeText={(draft) => updateNutrition(field.key, draft)}
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                      placeholder="--"
                      placeholderTextColor={theme.colors.textMuted}
                      style={styles.nutritionInput}
                    />
                    <Text style={styles.nutritionUnit}>{field.unit}</Text>
                  </View>
                  {numberInputError(nutritionDrafts[field.key], field.maximum) ? <Text style={styles.fieldError}>Valor fuera de rango</Text> : null}
                </View>
              ))}
            </View>
            <Text style={styles.approximation}>Valores aproximados · Confianza {confidenceLabel[analysis.nutrition.confidence].toLowerCase()}</Text>
          </View>

          {analysis.uncertainties.length ? (
            <View style={styles.uncertaintySection}>
              <Text style={styles.uncertaintyTitle}>Incertidumbres</Text>
              {analysis.uncertainties.map((item, index) => <Text key={`${index}-${item}`} style={styles.uncertaintyText}>• {item}</Text>)}
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.evaluationHeader}>
              <Text style={styles.sectionTitle}>Evaluacion personalizada</Text>
              {!dirty && evaluation.score !== null ? <Text style={styles.score}>{evaluation.score}/100</Text> : null}
            </View>
            {dirty ? <Text style={styles.pendingMessage}>Reevalua las correcciones para actualizar el score y las alertas.</Text> : (
              <>
                {evaluation.unsafeIngredients.map((ingredient) => (
                  <Text key={`${ingredient.id}-${ingredient.nombre}`} style={styles.dangerMessage}>Revisar: {ingredient.nombre}</Text>
                ))}
                {evaluation.alerts.map((alert, index) => (
                  <Text key={`${alert.nutrient}-${index}`} style={styles.alertMessage}>{alert.message}</Text>
                ))}
                {!evaluation.unsafeIngredients.length && !evaluation.alerts.length ? (
                  <Text style={styles.safeMessage}>No se detectaron conflictos con el perfil actual.</Text>
                ) : null}
              </>
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={reviewDisabled}
            onPress={onReview}
            style={({ pressed }) => [styles.reviewButton, reviewDisabled && styles.disabled, pressed && styles.pressed]}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#FFFFFF" />
            <Text style={styles.reviewButtonText}>{reviewing ? 'Reevaluando...' : 'Reevaluar correcciones'}</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.notFood}>{analysis.notFoodReason || 'No se identifico comida en la imagen.'}</Text>
      )}
    </View>
  );
}

const confidenceLabel = { low: 'Baja', medium: 'Media', high: 'Alta' } as const;
const evaluationStatus = {
  suitable: { label: 'Adecuado', color: theme.colors.primaryPressed, background: theme.colors.surfaceMuted },
  suitable_with_adjustments: { label: 'Con ajustes', color: theme.colors.warning, background: theme.colors.warningSurface },
  review_required: { label: 'Revisar', color: theme.colors.danger, background: theme.colors.dangerSurface },
  not_suitable: { label: 'No adecuado', color: theme.colors.danger, background: theme.colors.dangerSurface },
  not_food: { label: 'Sin comida', color: theme.colors.textMuted, background: theme.colors.surfaceMuted },
};
const numberInputValue = (value: number | null) => value == null ? '' : String(value);
const nutritionInputValues = (analysis: FoodVisionAnalysis): Record<NutrientKey, string> => Object.fromEntries(
  nutritionFields.map((field) => [field.key, numberInputValue(analysis.nutrition[field.key])])
) as Record<NutrientKey, string>;
const sanitizeNumberInput = (value: string) => {
  const normalized = value.replace(',', '.').replace(/\s/g, '');
  return /^\d*(?:\.\d*)?$/.test(normalized) ? normalized : null;
};
const numberFromInput = (value: string) => {
  if (!value || value === '.') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const numberInputError = (value: string, maximum: number) => {
  if (!value) return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= maximum ? '' : 'invalid';
};

const styles = StyleSheet.create({
  container: { gap: theme.spacing.lg },
  resultHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  resultHeaderText: { flex: 1, minWidth: 0 },
  eyebrow: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  dishName: { color: theme.colors.text, fontSize: 22, fontWeight: '800', marginTop: 4 },
  description: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 5 },
  statusBadge: { borderRadius: theme.radius.small, paddingHorizontal: 9, paddingVertical: 6 },
  statusText: { fontSize: 11, fontWeight: '800' },
  section: { gap: 10 },
  sectionTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  ingredientRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  ingredientInput: { flex: 1, minWidth: 0, minHeight: 46, color: theme.colors.text, fontSize: 15 },
  confidence: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  iconButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addInput: { flex: 1, minWidth: 0, minHeight: 46, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, color: theme.colors.text, paddingHorizontal: 12 },
  addButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface },
  textField: { minHeight: 48, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, color: theme.colors.text, fontSize: 15, paddingHorizontal: 12 },
  numberFieldRow: { width: 180, minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, paddingHorizontal: 12 },
  numberInput: { flex: 1, minWidth: 0, color: theme.colors.text, fontSize: 15, fontWeight: '700', paddingVertical: 10 },
  unit: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
  nutritionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nutritionItem: { width: '48%', minWidth: 128, borderLeftWidth: 2, borderLeftColor: theme.colors.primary, backgroundColor: theme.colors.surface, padding: 10 },
  nutritionLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  nutritionInputRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  nutritionInput: { flex: 1, minWidth: 0, color: theme.colors.text, fontSize: 15, fontWeight: '800', paddingVertical: 7 },
  nutritionUnit: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  fieldError: { color: theme.colors.danger, fontSize: 10, lineHeight: 14 },
  approximation: { color: theme.colors.textMuted, fontSize: 11 },
  uncertaintySection: { borderLeftWidth: 3, borderLeftColor: theme.colors.warning, backgroundColor: theme.colors.warningSurface, padding: 12, gap: 5 },
  uncertaintyTitle: { color: theme.colors.warning, fontSize: 14, fontWeight: '800' },
  uncertaintyText: { color: theme.colors.warning, fontSize: 13, lineHeight: 18 },
  evaluationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  score: { color: theme.colors.primaryPressed, fontSize: 15, fontWeight: '800' },
  dangerMessage: { color: theme.colors.danger, backgroundColor: theme.colors.dangerSurface, padding: 10, borderRadius: theme.radius.small, fontWeight: '700' },
  alertMessage: { color: theme.colors.warning, backgroundColor: theme.colors.warningSurface, padding: 10, borderRadius: theme.radius.small, lineHeight: 18 },
  pendingMessage: { color: theme.colors.warning, backgroundColor: theme.colors.warningSurface, padding: 10, borderRadius: theme.radius.small, lineHeight: 18, fontWeight: '700' },
  safeMessage: { color: theme.colors.primaryPressed, backgroundColor: theme.colors.surfaceMuted, padding: 10, borderRadius: theme.radius.small, fontWeight: '700' },
  reviewButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: theme.radius.medium, backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.md },
  reviewButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
  notFood: { color: theme.colors.textMuted, backgroundColor: theme.colors.surface, padding: theme.spacing.md, lineHeight: 20 },
});
