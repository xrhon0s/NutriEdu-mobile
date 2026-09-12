import { PlannedMeal } from '@/types/api';

export type PlanNutrient = 'calories' | 'protein' | 'carbs' | 'fat';
export type PlanNutritionMetric = { total: number; coverage: number };
export type PlanNutritionSummary = Record<PlanNutrient, PlanNutritionMetric>;

const nutrientFields: Record<PlanNutrient, keyof PlannedMeal> = {
  calories: 'calorias',
  protein: 'protein_g',
  carbs: 'carbs_g',
  fat: 'fat_g',
};

export function summarizePlanNutrition(meals: PlannedMeal[]): PlanNutritionSummary {
  const summary: PlanNutritionSummary = {
    calories: { total: 0, coverage: 0 },
    protein: { total: 0, coverage: 0 },
    carbs: { total: 0, coverage: 0 },
    fat: { total: 0, coverage: 0 },
  };

  meals.forEach((meal) => {
    (Object.keys(nutrientFields) as PlanNutrient[]).forEach((nutrient) => {
      const rawValue = meal[nutrientFields[nutrient]];
      if (rawValue === null || rawValue === undefined || rawValue === '') return;
      const value = Number(rawValue);
      if (!Number.isFinite(value) || value < 0) return;
      summary[nutrient].total += value;
      summary[nutrient].coverage += 1;
    });
  });

  return summary;
}
