import { MedicalDocumentExtraction } from '@/types/api';

export const medicalDocumentReviewFixture: MedicalDocumentExtraction = {
  documentType: 'prescription',
  summary: 'Formula de ejemplo con medicamento, posible condicion e indicacion de sodio.',
  documentDate: '2026-08-20',
  professionalName: 'Profesional de ejemplo',
  medications: [{
    id: 'medication-1',
    name: 'Medicamento de ejemplo',
    dose: '10 mg',
    frequency: 'Una vez al dia',
    instructions: 'Tomar con alimentos',
    confidence: 'high',
  }],
  conditions: [{
    id: 'condition-1',
    name: 'Hipertension posible',
    catalogCode: 'hypertension',
    evidence: 'La formula menciona control de presion arterial.',
    confidence: 'medium',
  }],
  dietaryInstructions: [{
    id: 'diet-1',
    instruction: 'Reducir alimentos altos en sodio.',
    confidence: 'high',
  }],
  nutritionTargets: [{
    id: 'target-1',
    field: 'sodium_max_mg',
    value: 1800,
    unit: 'mg',
    period: 'per_day',
    confidence: 'high',
  }],
  uncertainties: ['El nombre completo del medicamento debe compararse con el documento original.'],
};
