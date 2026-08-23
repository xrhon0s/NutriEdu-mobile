import { FoodAnalysisReviewResponse } from '@/types/api';

export const foodAnalysisReviewFixture: FoodAnalysisReviewResponse = {
  requestId: 'development-review-fixture',
  schemaVersion: '1.0',
  status: 'reviewed',
  analysis: {
    isFood: true,
    notFoodReason: null,
    dish: {
      name: 'Arroz con pollo',
      description: 'Plato de ejemplo para revisar la experiencia sin consumir IA.',
      confidence: 'medium',
    },
    ingredients: [
      { name: 'Arroz', estimatedGrams: 180, confidence: 'high', uncertain: false },
      { name: 'Pollo', estimatedGrams: 120, confidence: 'high', uncertain: false },
      { name: 'Vegetales', estimatedGrams: 80, confidence: 'medium', uncertain: true },
    ],
    portion: { description: 'Un plato mediano', estimatedGrams: 420, confidence: 'medium' },
    nutrition: {
      calories: 620,
      protein_g: 38,
      carbs_g: 72,
      fat_g: 18,
      saturated_fat_g: 4,
      sugar_g: 6,
      fiber_g: 7,
      sodium_mg: 540,
      confidence: 'low',
    },
    uncertainties: ['La cantidad de aceite y sal no es visible.'],
  },
  evaluation: {
    score: 88,
    status: 'suitable_with_adjustments',
    unsafeIngredients: [],
    alerts: [{
      source: 'target',
      sourceCode: 'manual',
      nutrient: 'sodium_mg',
      value: 540,
      minValue: null,
      maxValue: 500,
      unit: 'mg_per_meal',
      severity: 'warning',
      message: 'Revisa el sodio estimado segun tu meta personal.',
    }],
    actions: [],
    context: { goals: ['general_health'], conditions: [], hasTargets: true },
  },
};
