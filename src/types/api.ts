export type Recipe = {
  id: number;
  nombre: string;
  descripcion: string | null;
  calorias: string | number | null;
  tiempo_preparacion: number | null;
  nivel_salud: number;
  protein_g?: string | null;
  carbs_g?: string | null;
  fat_g?: string | null;
  fiber_g?: string | null;
  sodium_mg?: string | null;
  hasUnsafeIngredients?: boolean;
  recommendation?: RecipeRecommendation;
};

export type RecipeRecommendation = {
  score: number;
  status: 'suitable' | 'suitable_with_adjustments' | 'review_required';
  confidence: number;
  reasons: string[];
  warnings: RecipeAlert[];
  missingNutrients: string[];
};

export type RecipeSearchResponse = {
  recipes: Recipe[];
  pagination: {
    limit: number;
    offset: number;
    nextOffset: number | null;
    hasMore: boolean;
    total?: number;
  };
};

export type NotificationCategory = 'meals' | 'weekly_plan' | 'shopping' | 'progress' | 'security';

export type InAppNotification = {
  id: number;
  category: NotificationCategory;
  eventType: string;
  title: string;
  body: string;
  destination: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListResponse = {
  items: InAppNotification[];
  unreadCount: number;
  nextCursor: number | null;
};

export type NotificationPreferences = {
  timezone: string;
  quietStart: string | null;
  quietEnd: string | null;
  mealReminders: boolean;
  weeklyPlan: boolean;
  shopping: boolean;
  progress: boolean;
  security: boolean;
  mealReminderTimes: {
    breakfast: string;
    lunch: string;
    dinner: string;
  };
  weeklyPlanReminderDay: number;
  weeklyPlanReminderTime: string;
  shoppingReminderDay: number;
  shoppingReminderTime: string;
  updatedAt: string;
};

export type Ingredient = { id: number; nombre: string };

export type SafetyIngredient = Ingredient & {
  food_group?: string;
  substitution_group?: string;
};

export type IngredientSubstitution = {
  ingredienteOriginal: string;
  substitutionGroup: string;
  opciones: SafetyIngredient[];
};

export type RecipeSafetyResponse = {
  unsafeIngredients: SafetyIngredient[];
  substitutes: IngredientSubstitution[];
};

export type ShoppingListQuantity = {
  amount: number;
  unit: string;
};

export type ShoppingListItem = Ingredient & {
  foodGroup: string;
  knownAmountG: number | null;
  plannedUses: number;
  missingQuantityUses: number;
  recipeCount: number;
  sourceRecipes: string[];
  quantities: ShoppingListQuantity[];
};

export type DetailedShoppingListResponse = {
  items: ShoppingListItem[];
  planSignature: string;
  plannedMeals: number;
  missingQuantityItems: number;
};

export type RecipeAlert = {
  source: string;
  sourceCode: string;
  nutrient: string;
  value: number;
  minValue: number | null;
  maxValue: number | null;
  unit: string;
  severity: 'info' | 'warning' | 'danger';
  message: string;
};

export type RecipeEvaluation = {
  recipe: Recipe;
  score: number;
  status: 'suitable' | 'suitable_with_adjustments' | 'review_required' | 'not_suitable';
  unsafeIngredients: Ingredient[];
  alerts: RecipeAlert[];
  context: { goals: string[]; conditions: string[]; hasTargets: boolean };
};

export type PlannedMeal = {
  id: number;
  dia_semana: string;
  tipo_comida: string;
  receta_id: number;
  receta_nombre: string;
  descripcion: string | null;
  calorias: string | number | null;
  tiempo_preparacion: number | null;
  nivel_salud: number;
  unsafeIngredients?: SafetyIngredient[];
  hasUnsafeIngredients?: boolean;
};

export type UserProfile = {
  fecha_nacimiento?: string | null;
  sexo?: string | null;
  estatura_cm?: string | number | null;
  peso_kg?: string | number | null;
  nivel_actividad?: string | null;
  condicion_fisica?: string | null;
  habitos_alimentarios?: {
    meals_per_day?: string | number;
    eats_out_frequency?: string;
  } | null;
  preferencias_alimentarias?: {
    diet_style?: string;
    cooking_time?: string;
  } | null;
  notas?: string | null;
};

export type NutritionGoal = {
  id?: number;
  code: string;
  nombre: string;
  descripcion?: string | null;
  prioridad?: number;
};

export type ClinicalCondition = {
  id?: number;
  code: string;
  nombre: string;
  descripcion?: string | null;
  risk_level?: string;
  requires_professional_guidance: boolean;
};

export type NutritionTargets = {
  calories_min?: string | number | null;
  calories_max?: string | number | null;
  protein_min_g?: string | number | null;
  protein_max_g?: string | number | null;
  carbs_min_g?: string | number | null;
  carbs_max_g?: string | number | null;
  fat_min_g?: string | number | null;
  fat_max_g?: string | number | null;
  saturated_fat_max_g?: string | number | null;
  sugar_max_g?: string | number | null;
  fiber_min_g?: string | number | null;
  sodium_max_mg?: string | number | null;
  water_min_ml?: string | number | null;
  notes?: string | null;
};

export type ProfileResponse = {
  profile: UserProfile | null;
  goals: NutritionGoal[];
  conditions: ClinicalCondition[];
  targets: NutritionTargets | null;
};

export type ProfileCatalogs = {
  goals: NutritionGoal[];
  conditions: ClinicalCondition[];
};

export type DietaryRestriction = {
  restriccion_id: number;
  nombre: string;
};

export type RestrictionsResponse = {
  restrictions: DietaryRestriction[];
};

export type FoodImageSource = 'camera' | 'library';

export type FoodImageIntakeResponse = {
  requestId: string;
  schemaVersion: '1.0';
  status: 'validated';
  image: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    source: FoodImageSource;
    capturedAt: string | null;
  };
  retention: {
    retained: false;
    reason: string;
  };
  analysis: null;
  nextStep: 'vision_provider_required';
};

export type FoodConfidence = 'low' | 'medium' | 'high';

export type MedicalDocumentType = 'prescription' | 'lab_result' | 'nutrition_order' | 'medical_summary' | 'other';

export type MedicalDocumentIntakeResponse = {
  requestId: string;
  schemaVersion: '1.0';
  status: 'validated';
  document: {
    fileName: string;
    mimeType: 'application/pdf' | 'image/jpeg' | 'image/jpg' | 'image/png';
    sizeBytes: number;
    source: 'camera' | 'file';
    documentType: MedicalDocumentType;
    capturedAt: string | null;
  };
  consent: {
    granted: true;
    version: '1.0';
    purpose: 'medical_document_extraction';
  };
  retention: { retained: false; reason: string };
  extraction: null;
  profileUpdated: false;
  nextStep: 'document_extraction_provider_required';
};

export type MedicalConfidence = 'low' | 'medium' | 'high';

export type MedicalMedicationFinding = {
  id: string;
  name: string;
  dose: string | null;
  frequency: string | null;
  instructions: string | null;
  confidence: MedicalConfidence;
};

export type MedicalConditionFinding = {
  id: string;
  name: string;
  catalogCode: string | null;
  evidence: string;
  confidence: MedicalConfidence;
};

export type MedicalDietaryFinding = {
  id: string;
  instruction: string;
  confidence: MedicalConfidence;
};

export type MedicalNutritionTargetFinding = {
  id: string;
  field: keyof Omit<NutritionTargets, 'calculation_source' | 'notes'>;
  value: number;
  unit: 'kcal' | 'g' | 'mg' | 'ml';
  period: 'per_day' | 'per_meal';
  confidence: MedicalConfidence;
};

export type MedicalDocumentExtraction = {
  documentType: MedicalDocumentType;
  summary: string;
  documentDate: string | null;
  professionalName: string | null;
  medications: MedicalMedicationFinding[];
  conditions: MedicalConditionFinding[];
  dietaryInstructions: MedicalDietaryFinding[];
  nutritionTargets: MedicalNutritionTargetFinding[];
  uncertainties: string[];
};

export type MedicalDocumentReviewResponse = {
  reviewId: number;
  requestId: string;
  schemaVersion: '1.0';
  status: 'reviewed';
  extraction: MedicalDocumentExtraction;
  acceptedFindingIds: string[];
  acceptedFindings: {
    medications: MedicalMedicationFinding[];
    conditions: MedicalConditionFinding[];
    dietaryInstructions: MedicalDietaryFinding[];
    nutritionTargets: MedicalNutritionTargetFinding[];
  };
  acceptedCount: number;
  auditReady: true;
  profileUpdated: false;
  reviewedAt: string;
  nextStep: 'explicit_profile_apply_required';
};

export type MedicalDocumentApplicationPreview = {
  reviewId: number;
  requestId: string;
  status: 'ready_to_apply';
  changes: {
    conditions: {
      findingId: string;
      code: string;
      name: string;
      riskLevel: 'low' | 'medium' | 'high';
      requiresProfessionalGuidance: boolean;
      evidence: string;
      action: 'add' | 'keep';
    }[];
    targets: {
      findingId: string;
      field: MedicalNutritionTargetFinding['field'];
      previousValue: number | null;
      nextValue: number;
      unit: MedicalNutritionTargetFinding['unit'];
      period: 'per_day';
      action: 'update' | 'keep';
    }[];
    excludedFindings: {
      id: string;
      type: 'medication' | 'dietary_instruction';
      label: string;
      reason: string;
    }[];
  };
  changeCount: number;
  profileUpdated: false;
  confirmationVersion: '1.0';
  previewHash: string;
};

export type MedicalDocumentApplicationResponse = {
  reviewId: number;
  applicationId: number;
  status: 'applied';
  changes: MedicalDocumentApplicationPreview['changes'];
  changeCount: number;
  profileUpdated: true;
  appliedAt: string;
};

export type MedicalDocumentRetentionPolicy = {
  version: '1.0';
  unappliedReviewDays: number;
  originalFileRetained: false;
  appliedAuditRetention: 'until_account_deletion';
  userCanDelete: 'unapplied_reviews';
};

export type MedicalDocumentHistoryItem = {
  reviewId: number;
  requestId: string;
  documentType: MedicalDocumentType;
  status: 'reviewed' | 'applied';
  summary: string;
  documentDate: string | null;
  professionalName: string | null;
  acceptedCount: number;
  applicationId: number | null;
  reviewedAt: string;
  appliedAt: string | null;
  retention: {
    policyVersion: string;
    expiresAt: string | null;
    canDelete: boolean;
  };
};

export type MedicalDocumentHistoryResponse = {
  items: MedicalDocumentHistoryItem[];
  nextCursor: number | null;
  retentionPolicy: MedicalDocumentRetentionPolicy;
};

export type MedicalDocumentHistoryDetail = {
  reviewId: number;
  requestId: string;
  documentType: MedicalDocumentType;
  status: 'reviewed' | 'applied';
  extraction: MedicalDocumentExtraction;
  acceptedFindingIds: string[];
  acceptedFindings: MedicalDocumentReviewResponse['acceptedFindings'];
  application: {
    applicationId: number;
    changes: MedicalDocumentApplicationPreview['changes'];
    appliedAt: string;
  } | null;
  retention: {
    policyVersion: string;
    expiresAt: string | null;
    canDelete: boolean;
  };
  reviewedAt: string;
  updatedAt: string;
};

export type AccountDeletionResponse = {
  status: 'deleted';
  accountDeleted: true;
  deletedAt: string;
};

export type DetectedFoodIngredient = {
  name: string;
  estimatedGrams: number | null;
  confidence: FoodConfidence;
  uncertain: boolean;
};

export type FoodVisionAnalysis = {
  isFood: boolean;
  notFoodReason: string | null;
  dish: {
    name: string;
    description: string;
    confidence: FoodConfidence;
  };
  ingredients: DetectedFoodIngredient[];
  portion: {
    description: string;
    estimatedGrams: number | null;
    confidence: FoodConfidence;
  };
  nutrition: {
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
    saturated_fat_g: number | null;
    sugar_g: number | null;
    fiber_g: number | null;
    sodium_mg: number | null;
    confidence: FoodConfidence;
  };
  uncertainties: string[];
};

export type FoodAnalysisEvaluation = {
  score: number | null;
  status: 'suitable' | 'suitable_with_adjustments' | 'review_required' | 'not_suitable' | 'not_food';
  unsafeIngredients: {
    id: number;
    nombre: string;
    matchedIngredient: string;
    confidence: FoodConfidence;
    uncertain: boolean;
  }[];
  alerts: RecipeAlert[];
  actions: {
    type: 'remove_or_replace';
    ingredient: string;
    message: string;
  }[];
  context: { goals: string[]; conditions: string[]; hasTargets: boolean };
};

export type VisionProviderStatus = {
  configured: boolean;
  provider: string | null;
  model: string | null;
  schemaVersion: '1.0';
  quota: VisionQuota | null;
};

export type VisionQuota = {
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
  resetsAt: string;
};

export type VisionUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

export type FoodAnalysisResponse = {
  requestId: string;
  schemaVersion: '1.0';
  status: 'review_required' | 'not_food';
  provider: { name: string; model: string };
  image: FoodImageIntakeResponse['image'];
  retention: {
    retainedByNutriEdu: false;
    externalProcessing: true;
  };
  analysis: FoodVisionAnalysis;
  evaluation: FoodAnalysisEvaluation;
  usage: VisionUsage;
  quota: VisionQuota;
};

export type FoodAnalysisReviewResponse = {
  requestId: string;
  schemaVersion: '1.0';
  status: 'reviewed';
  analysis: FoodVisionAnalysis;
  evaluation: FoodAnalysisEvaluation;
};
