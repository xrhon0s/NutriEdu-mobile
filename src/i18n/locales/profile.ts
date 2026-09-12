export const profileEs = {
  loading: 'Cargando tu perfil...', eyebrow: 'PERFIL DE SALUD', greeting: 'Hola, {{name}}', userFallback: 'Usuario',
  subtitle: 'Estas señales se usan para adaptar recetas, alertas y recomendaciones.',
  tabs: {
    personal: { label: 'Personal', description: 'Datos, actividad y habitos' }, goals: { label: 'Objetivos', description: 'Prioridades del proceso' },
    clinical: { label: 'Salud', description: 'Condiciones y restricciones' }, targets: { label: 'Metas', description: 'Limites nutricionales' },
  },
  summary: { title: 'Perfil de recomendacion', activeGoals_one: '{{count}} objetivo activo', activeGoals_other: '{{count}} objetivos activos', noGoals: 'Selecciona al menos un objetivo para personalizar mejor tus resultados', baseData: 'Datos base', alerts: 'Alertas', targets: 'Metas' },
  controls: { infoAbout: 'Informacion sobre {{label}}', clearSearch: 'Limpiar busqueda', saving: 'Guardando...' },
  messages: { personalSaved: 'Datos personales actualizados', goalsSaved: 'Objetivos actualizados', clinicalSaved: 'Salud y restricciones actualizadas', targetsSaved: 'Metas nutricionales actualizadas' },
  errors: { load: 'Error consultando el perfil', save: 'No pudimos guardar los cambios' },
  validation: {
    date: 'La fecha debe usar el formato AAAA-MM-DD', positive: 'Revisa el valor de {{field}}', target: 'Revisa {{field}}', range: 'El minimo de {{field}} no puede superar el maximo',
    fields: { height: 'estatura', weight: 'peso', meals: 'comidas por dia', calories: 'calorias', protein: 'proteina', carbs: 'carbohidratos', fat: 'grasas' },
  },
  personal: {
    personalData: 'Datos personales', birthDate: 'Fecha de nacimiento', birthDatePlaceholder: 'AAAA-MM-DD', sex: 'Sexo',
    sexOptions: { female: 'Femenino', male: 'Masculino', other: 'Otro', preferNotToSay: 'Prefiero no indicarlo' },
    height: 'Estatura', weight: 'Peso actual', activitySection: 'Actividad y condicion fisica', activityLevel: 'Nivel de actividad',
    activityOptions: { sedentary: 'Sedentario', light: 'Ligera', moderate: 'Moderada', high: 'Alta', athlete: 'Intensa' },
    physicalCondition: 'Condicion fisica actual', conditionOptions: { starting: 'Iniciando', active: 'Activo', trained: 'Entrenado', limited: 'Limitada', recovery: 'Recuperacion' },
    eatingHabits: 'Habitos alimentarios', mealsPerDay: 'Comidas por dia', eatingOut: 'Comidas fuera de casa',
    eatingOutOptions: { rarely: 'Casi nunca', weekly: '1 a 2 por semana', frequent: '3 o mas por semana', daily: 'Todos los dias' },
    dietStyle: 'Estilo alimentario', dietStyleInfo: 'Omnivoro incluye alimentos vegetales y animales. Vegetariano evita carnes y pescado, pero puede incluir huevos o lacteos. Vegano excluye productos de origen animal. Pescetariano incluye pescado y mariscos, pero evita otras carnes.',
    dietOptions: { omnivore: 'Omnivoro', vegetarian: 'Vegetariano', vegan: 'Vegano', pescatarian: 'Pescetariano' }, cookingTime: 'Tiempo disponible para cocinar',
    cookingOptions: { short: 'Menos de 20 min', medium: '20 a 45 min', long: 'Mas de 45 min' }, notes: 'Notas adicionales', save: 'Guardar datos personales',
    account: 'Cuenta y preferencias', accountDescription: 'Configuraciones que no cambian tus datos clinicos.', notifications: 'Notificaciones', notificationsDescription: 'Bandeja, categorias y horas silenciosas', privacy: 'Privacidad y cuenta', privacyDescription: 'Retencion de datos y eliminacion de cuenta',
  },
  goals: { title: 'Objetivos prioritarios', priority: 'Prioridad {{number}}', selected_one: '{{count}} objetivo seleccionado', selected_other: '{{count}} objetivos seleccionados', save: 'Guardar objetivos' },
  clinical: {
    guidance: 'Registra condiciones confirmadas. Las marcadas requieren seguimiento profesional.', records: 'Expediente', recordsDescription: 'Documentos y cambios que requieren revision del usuario.', documents: 'Documentos medicos', documentsDescription: 'Subir formula, laboratorio o indicacion nutricional', history: 'Historial medico', historyDescription: 'Revisiones, cambios aplicados y retencion', conditions: 'Condiciones clinicas', searchCondition: 'Buscar condicion', frequentConditions: 'Condiciones frecuentes', restrictions: 'Restricciones alimentarias', searchRestriction: 'Buscar restriccion', frequentRestrictions: 'Restricciones frecuentes', results_one: '{{count}} resultado', results_other: '{{count}} resultados', followUp: 'SEGUIMIENTO', noConditions: 'No encontramos condiciones con ese nombre.', noRestrictions: 'No encontramos restricciones con ese nombre.', save: 'Guardar salud y restricciones',
  },
  targets: {
    guidance: 'Usa valores definidos con un profesional. Los campos vacios no generan alertas.', title: 'Metas y limites diarios', notes: 'Notas de las metas', save: 'Guardar metas nutricionales',
    fields: { calories_min: 'Calorias minimas diarias', calories_max: 'Calorias maximas diarias', protein_min_g: 'Proteina minima diaria', protein_max_g: 'Proteina maxima diaria', carbs_min_g: 'Carbohidratos minimos diarios', carbs_max_g: 'Carbohidratos maximos diarios', fat_min_g: 'Grasas minimas diarias', fat_max_g: 'Grasas maximas diarias', saturated_fat_max_g: 'Grasa saturada maxima diaria', sugar_max_g: 'Azucar maxima diaria', fiber_min_g: 'Fibra minima diaria', sodium_max_mg: 'Sodio maximo diario', water_min_ml: 'Agua minima diaria', notes: 'Notas de las metas' },
  },
};

export const profileEn = {
  ...profileEs,
  loading: 'Loading your profile...', eyebrow: 'HEALTH PROFILE', greeting: 'Hello, {{name}}', userFallback: 'User', subtitle: 'These signals adapt recipes, alerts, and recommendations.',
  tabs: { personal: { label: 'Personal', description: 'Details, activity, and habits' }, goals: { label: 'Goals', description: 'Your process priorities' }, clinical: { label: 'Health', description: 'Conditions and restrictions' }, targets: { label: 'Targets', description: 'Nutritional limits' } },
  summary: { title: 'Recommendation profile', activeGoals_one: '{{count}} active goal', activeGoals_other: '{{count}} active goals', noGoals: 'Select at least one goal to better personalize your results', baseData: 'Base data', alerts: 'Alerts', targets: 'Targets' },
  controls: { infoAbout: 'Information about {{label}}', clearSearch: 'Clear search', saving: 'Saving...' },
  messages: { personalSaved: 'Personal details updated', goalsSaved: 'Goals updated', clinicalSaved: 'Health and restrictions updated', targetsSaved: 'Nutritional targets updated' },
  errors: { load: 'Unable to load your profile', save: 'We could not save the changes' },
  validation: { date: 'The date must use YYYY-MM-DD format', positive: 'Check the value for {{field}}', target: 'Check {{field}}', range: 'The minimum for {{field}} cannot exceed its maximum', fields: { height: 'height', weight: 'weight', meals: 'meals per day', calories: 'calories', protein: 'protein', carbs: 'carbohydrates', fat: 'fat' } },
  personal: {
    ...profileEs.personal, personalData: 'Personal details', birthDate: 'Date of birth', birthDatePlaceholder: 'YYYY-MM-DD', sex: 'Sex', sexOptions: { female: 'Female', male: 'Male', other: 'Other', preferNotToSay: 'Prefer not to say' }, height: 'Height', weight: 'Current weight', activitySection: 'Activity and physical condition', activityLevel: 'Activity level', activityOptions: { sedentary: 'Sedentary', light: 'Light', moderate: 'Moderate', high: 'High', athlete: 'Intense' }, physicalCondition: 'Current physical condition', conditionOptions: { starting: 'Starting', active: 'Active', trained: 'Trained', limited: 'Limited', recovery: 'Recovery' }, eatingHabits: 'Eating habits', mealsPerDay: 'Meals per day', eatingOut: 'Meals away from home', eatingOutOptions: { rarely: 'Rarely', weekly: '1 to 2 per week', frequent: '3 or more per week', daily: 'Every day' }, dietStyle: 'Eating style', dietStyleInfo: 'Omnivore includes plant and animal foods. Vegetarian avoids meat and fish but may include eggs or dairy. Vegan excludes animal products. Pescatarian includes fish and seafood but avoids other meats.', dietOptions: { omnivore: 'Omnivore', vegetarian: 'Vegetarian', vegan: 'Vegan', pescatarian: 'Pescatarian' }, cookingTime: 'Available cooking time', cookingOptions: { short: 'Less than 20 min', medium: '20 to 45 min', long: 'More than 45 min' }, notes: 'Additional notes', save: 'Save personal details', account: 'Account and preferences', accountDescription: 'Settings that do not change your clinical data.', notifications: 'Notifications', notificationsDescription: 'Inbox, categories, and quiet hours', privacy: 'Privacy and account', privacyDescription: 'Data retention and account deletion',
  },
  goals: { title: 'Priority goals', priority: 'Priority {{number}}', selected_one: '{{count}} goal selected', selected_other: '{{count}} goals selected', save: 'Save goals' },
  clinical: { guidance: 'Record confirmed conditions. Flagged conditions require professional follow-up.', records: 'Medical record', recordsDescription: 'Documents and changes that require user review.', documents: 'Medical documents', documentsDescription: 'Upload a prescription, lab result, or nutrition order', history: 'Medical history', historyDescription: 'Reviews, applied changes, and retention', conditions: 'Clinical conditions', searchCondition: 'Search conditions', frequentConditions: 'Common conditions', restrictions: 'Dietary restrictions', searchRestriction: 'Search restrictions', frequentRestrictions: 'Common restrictions', results_one: '{{count}} result', results_other: '{{count}} results', followUp: 'FOLLOW-UP', noConditions: 'No conditions match that name.', noRestrictions: 'No restrictions match that name.', save: 'Save health and restrictions' },
  targets: { guidance: 'Use values defined with a professional. Empty fields do not generate alerts.', title: 'Daily targets and limits', notes: 'Target notes', save: 'Save nutritional targets', fields: { calories_min: 'Minimum daily calories', calories_max: 'Maximum daily calories', protein_min_g: 'Minimum daily protein', protein_max_g: 'Maximum daily protein', carbs_min_g: 'Minimum daily carbohydrates', carbs_max_g: 'Maximum daily carbohydrates', fat_min_g: 'Minimum daily fat', fat_max_g: 'Maximum daily fat', saturated_fat_max_g: 'Maximum daily saturated fat', sugar_max_g: 'Maximum daily sugar', fiber_min_g: 'Minimum daily fiber', sodium_max_mg: 'Maximum daily sodium', water_min_ml: 'Minimum daily water', notes: 'Target notes' } },
};
