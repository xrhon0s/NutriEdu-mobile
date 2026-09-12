import { describe, expect, it } from 'vitest';
import { PlannedMeal } from '@/types/api';
import { summarizePlanNutrition } from './plan-nutrition';

const meal = (overrides: Partial<PlannedMeal>): PlannedMeal => ({
  id: 1,
  dia_semana: 'Lunes',
  tipo_comida: 'Almuerzo',
  receta_id: 1,
  receta_nombre: 'Receta',
  descripcion: null,
  calorias: null,
  tiempo_preparacion: null,
  nivel_salud: 4,
  ...overrides,
});

describe('summarizePlanNutrition', () => {
  it('adds known nutrients and reports coverage independently', () => {
    const result = summarizePlanNutrition([
      meal({ calorias: 500, protein_g: 30, carbs_g: '55.5', fat_g: 15 }),
      meal({ id: 2, calorias: '350', protein_g: null, carbs_g: 40, fat_g: 10 }),
    ]);

    expect(result.calories).toEqual({ total: 850, coverage: 2 });
    expect(result.protein).toEqual({ total: 30, coverage: 1 });
    expect(result.carbs).toEqual({ total: 95.5, coverage: 2 });
    expect(result.fat).toEqual({ total: 25, coverage: 2 });
  });

  it('ignores missing, invalid, and negative values', () => {
    const result = summarizePlanNutrition([
      meal({ calorias: '', protein_g: 'invalid', carbs_g: -2, fat_g: undefined }),
    ]);

    expect(result).toEqual({
      calories: { total: 0, coverage: 0 },
      protein: { total: 0, coverage: 0 },
      carbs: { total: 0, coverage: 0 },
      fat: { total: 0, coverage: 0 },
    });
  });
});
