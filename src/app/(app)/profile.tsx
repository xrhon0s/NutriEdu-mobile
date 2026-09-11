import { useCallback, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChoiceField,
  FormField,
  FormSection,
  SaveButton,
  SearchField,
  SelectableRow,
} from '@/components/profile-controls';
import { DateField } from '@/components/date-field';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { theme } from '@/constants/nutriedu-theme';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import {
  ClinicalCondition,
  DietaryRestriction,
  NutritionGoal,
  NutritionTargets,
  ProfileCatalogs,
  ProfileResponse,
  RestrictionsResponse,
  UserProfile,
} from '@/types/api';

type ProfileTab = 'personal' | 'goals' | 'clinical' | 'targets';
type Status = { type: 'success' | 'error'; message: string } | null;

type PersonalForm = {
  fecha_nacimiento: string;
  sexo: string;
  estatura_cm: string;
  peso_kg: string;
  nivel_actividad: string;
  condicion_fisica: string;
  meals_per_day: string;
  eats_out_frequency: string;
  diet_style: string;
  cooking_time: string;
  notas: string;
};

type TargetsForm = Record<keyof Required<NutritionTargets>, string>;

type ProfileData = {
  saved: ProfileResponse;
  catalogs: ProfileCatalogs;
  restrictions: DietaryRestriction[];
  selectedRestrictions: number[];
};

const tabs: {
  id: ProfileTab;
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { id: 'personal', label: 'Personal', description: 'Datos, actividad y habitos', icon: 'person-outline' },
  { id: 'goals', label: 'Objetivos', description: 'Prioridades del proceso', icon: 'flag-outline' },
  { id: 'clinical', label: 'Salud', description: 'Condiciones y restricciones', icon: 'medkit-outline' },
  { id: 'targets', label: 'Metas', description: 'Limites nutricionales', icon: 'options-outline' },
];

const featuredConditionCodes = [
  'diabetes',
  'hypertension',
  'high_cholesterol',
  'obesity',
  'gastritis',
  'lactose_intolerance',
];

const featuredRestrictionNames = ['gluten', 'lactosa', 'azucar', 'frutos secos', 'mariscos', 'huevo'];

const dietStyleInfo = 'Omnivoro incluye alimentos vegetales y animales. Vegetariano evita carnes y pescado, pero puede incluir huevos o lacteos. Vegano excluye productos de origen animal. Pescetariano incluye pescado y mariscos, pero evita otras carnes.';

const emptyPersonal: PersonalForm = {
  fecha_nacimiento: '',
  sexo: '',
  estatura_cm: '',
  peso_kg: '',
  nivel_actividad: '',
  condicion_fisica: '',
  meals_per_day: '',
  eats_out_frequency: '',
  diet_style: '',
  cooking_time: '',
  notas: '',
};

const emptyTargets: TargetsForm = {
  calories_min: '',
  calories_max: '',
  protein_min_g: '',
  protein_max_g: '',
  carbs_min_g: '',
  carbs_max_g: '',
  fat_min_g: '',
  fat_max_g: '',
  saturated_fat_max_g: '',
  sugar_max_g: '',
  fiber_min_g: '',
  sodium_max_mg: '',
  water_min_ml: '',
  notes: '',
};

const targetFields: { key: keyof TargetsForm; label: string; unit: string }[] = [
  { key: 'calories_min', label: 'Calorias minimas diarias', unit: 'kcal' },
  { key: 'calories_max', label: 'Calorias maximas diarias', unit: 'kcal' },
  { key: 'protein_min_g', label: 'Proteina minima diaria', unit: 'g' },
  { key: 'protein_max_g', label: 'Proteina maxima diaria', unit: 'g' },
  { key: 'carbs_min_g', label: 'Carbohidratos minimos diarios', unit: 'g' },
  { key: 'carbs_max_g', label: 'Carbohidratos maximos diarios', unit: 'g' },
  { key: 'fat_min_g', label: 'Grasas minimas diarias', unit: 'g' },
  { key: 'fat_max_g', label: 'Grasas maximas diarias', unit: 'g' },
  { key: 'saturated_fat_max_g', label: 'Grasa saturada maxima diaria', unit: 'g' },
  { key: 'sugar_max_g', label: 'Azucar maxima diaria', unit: 'g' },
  { key: 'fiber_min_g', label: 'Fibra minima diaria', unit: 'g' },
  { key: 'sodium_max_mg', label: 'Sodio maximo diario', unit: 'mg' },
  { key: 'water_min_ml', label: 'Agua minima diaria', unit: 'ml' },
];

const toText = (value: string | number | null | undefined) => (value == null ? '' : String(value));

const profileToForm = (profile: UserProfile | null): PersonalForm => ({
  fecha_nacimiento: profile?.fecha_nacimiento ? String(profile.fecha_nacimiento).slice(0, 10) : '',
  sexo: profile?.sexo || '',
  estatura_cm: toText(profile?.estatura_cm),
  peso_kg: toText(profile?.peso_kg),
  nivel_actividad: profile?.nivel_actividad || '',
  condicion_fisica: profile?.condicion_fisica || '',
  meals_per_day: toText(profile?.habitos_alimentarios?.meals_per_day),
  eats_out_frequency: profile?.habitos_alimentarios?.eats_out_frequency || '',
  diet_style: profile?.preferencias_alimentarias?.diet_style || '',
  cooking_time: profile?.preferencias_alimentarias?.cooking_time || '',
  notas: profile?.notas || '',
});

const targetsToForm = (targets: NutritionTargets | null): TargetsForm =>
  Object.fromEntries(
    Object.keys(emptyTargets).map((key) => [key, toText(targets?.[key as keyof NutritionTargets])]),
  ) as TargetsForm;

const toggleValue = <T,>(values: T[], value: T) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

export default function ProfileScreen() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [profile, setProfile] = useState<PersonalForm>(emptyPersonal);
  const [targets, setTargets] = useState<TargetsForm>(emptyTargets);
  const [goals, setGoals] = useState<NutritionGoal[]>([]);
  const [conditions, setConditions] = useState<ClinicalCondition[]>([]);
  const [restrictions, setRestrictions] = useState<DietaryRestriction[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedRestrictions, setSelectedRestrictions] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<ProfileTab | null>(null);
  const [fatalError, setFatalError] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const personalSignals = [
    profile.fecha_nacimiento,
    profile.sexo,
    profile.estatura_cm,
    profile.peso_kg,
    profile.nivel_actividad,
    profile.condicion_fisica,
    profile.meals_per_day,
    profile.diet_style,
  ].filter(Boolean).length;
  const targetSignals = targetFields.filter((field) => Boolean(targets[field.key])).length;
  const tabCounts: Record<ProfileTab, string> = {
    personal: `${personalSignals}/8`,
    goals: String(selectedGoals.length),
    clinical: String(selectedConditions.length + selectedRestrictions.length),
    targets: String(targetSignals),
  };
  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  const fetchProfileData = useCallback(async (): Promise<ProfileData> => {
    const [saved, catalogs, allRestrictions, userRestrictions] = await Promise.all([
      apiRequest<ProfileResponse>('/profile', { token }),
      apiRequest<ProfileCatalogs>('/profile/catalogs', { token }),
      apiRequest<RestrictionsResponse>('/users/restrictions', { token }),
      apiRequest<RestrictionsResponse>(`/users/restrictions/${user?.id ?? 0}`, { token }),
    ]);

    return {
      saved,
      catalogs,
      restrictions: allRestrictions.restrictions || [],
      selectedRestrictions: (userRestrictions.restrictions || []).map((item) => Number(item.restriccion_id)),
    };
  }, [token, user]);

  const applyProfileData = useCallback((data: ProfileData) => {
    setProfile(profileToForm(data.saved.profile));
    setTargets(targetsToForm(data.saved.targets));
    setGoals(data.catalogs.goals || []);
    setConditions(data.catalogs.conditions || []);
    setRestrictions(data.restrictions);
    setSelectedGoals(data.saved.goals.map((goal) => goal.code));
    setSelectedConditions(data.saved.conditions.map((condition) => condition.code));
    setSelectedRestrictions(data.selectedRestrictions);
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setFatalError('');
      applyProfileData(await fetchProfileData());
    } catch (requestError) {
      setFatalError(requestError instanceof Error ? requestError.message : 'Error consultando el perfil');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applyProfileData, fetchProfileData]);

  useFocusEffect(useCallback(() => {
    void loadProfile();
  }, [loadProfile]));

  const runSave = async (section: ProfileTab, action: () => Promise<unknown>, successMessage: string) => {
    try {
      setSaving(section);
      setStatus(null);
      await action();
      applyProfileData(await fetchProfileData());
      setStatus({ type: 'success', message: successMessage });
    } catch (requestError) {
      setStatus({
        type: 'error',
        message: requestError instanceof Error ? requestError.message : 'No pudimos guardar los cambios',
      });
    } finally {
      setSaving(null);
    }
  };

  const savePersonal = () => {
    const validationError = validatePersonal(profile);
    if (validationError) return setStatus({ type: 'error', message: validationError });

    return runSave(
      'personal',
      () => apiRequest('/profile', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          fecha_nacimiento: profile.fecha_nacimiento,
          sexo: profile.sexo,
          estatura_cm: profile.estatura_cm,
          peso_kg: profile.peso_kg,
          nivel_actividad: profile.nivel_actividad,
          condicion_fisica: profile.condicion_fisica,
          habitos_alimentarios: {
            meals_per_day: profile.meals_per_day,
            eats_out_frequency: profile.eats_out_frequency,
          },
          preferencias_alimentarias: {
            diet_style: profile.diet_style,
            cooking_time: profile.cooking_time,
          },
          notas: profile.notas,
        }),
      }),
      'Datos personales actualizados',
    );
  };

  const saveGoals = () => runSave(
    'goals',
    () => apiRequest('/profile/goals', { method: 'PUT', token, body: JSON.stringify({ goals: selectedGoals }) }),
    'Objetivos actualizados',
  );

  const saveClinical = () => runSave(
    'clinical',
    () => Promise.all([
      apiRequest('/profile/conditions', {
        method: 'PUT',
        token,
        body: JSON.stringify({ conditions: selectedConditions, source: 'user' }),
      }),
      apiRequest('/users/restrictions', {
        method: 'POST',
        token,
        body: JSON.stringify({ restricciones: selectedRestrictions }),
      }),
    ]),
    'Salud y restricciones actualizadas',
  );

  const saveTargets = () => {
    const validationError = validateTargets(targets);
    if (validationError) return setStatus({ type: 'error', message: validationError });

    return runSave(
      'targets',
      () => apiRequest('/profile/targets', {
        method: 'PUT',
        token,
        body: JSON.stringify({ ...targets, calculation_source: 'manual' }),
      }),
      'Metas nutricionales actualizadas',
    );
  };

  if (loading) return <LoadingState label="Cargando tu perfil..." />;
  if (fatalError) return <ErrorState message={fatalError} onRetry={() => { setLoading(true); void loadProfile(); }} />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProfile(); }} tintColor={theme.colors.primary} />}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>PERFIL DE SALUD</Text>
          <Text style={styles.title}>Hola, {user?.nombre?.split(' ')[0] || 'Usuario'}</Text>
          <Text style={styles.subtitle}>Estas señales se usan para adaptar recetas, alertas y recomendaciones.</Text>
          <View style={styles.signalSummary}>
            <View style={styles.signalSummaryHeader}>
              <View style={styles.signalSummaryIcon}>
                <Ionicons name="sparkles-outline" size={19} color={theme.colors.primaryPressed} />
              </View>
              <View style={styles.signalSummaryCopy}>
                <Text style={styles.signalSummaryTitle}>Perfil de recomendacion</Text>
                <Text style={styles.signalSummaryText}>
                  {selectedGoals.length
                    ? `${selectedGoals.length} objetivo${selectedGoals.length === 1 ? '' : 's'} activo${selectedGoals.length === 1 ? '' : 's'}`
                    : 'Selecciona al menos un objetivo para personalizar mejor tus resultados'}
                </Text>
              </View>
            </View>
            <View style={styles.signalStats}>
              <SignalStat value={`${personalSignals}/8`} label="Datos base" />
              <SignalStat value={String(selectedConditions.length + selectedRestrictions.length)} label="Alertas" />
              <SignalStat value={String(targetSignals)} label="Metas" />
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => { setActiveTab(tab.id); setStatus(null); }}
                style={[styles.tab, active && styles.activeTab]}>
                <View style={styles.tabTopRow}>
                  <Ionicons name={tab.icon} size={18} color={active ? theme.colors.primaryPressed : theme.colors.textMuted} />
                  <Text style={[styles.tabCount, active && styles.activeTabText]}>{tabCounts[tab.id]}</Text>
                </View>
                <Text style={[styles.tabText, active && styles.activeTabText]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.activeSectionHeading}>
          <Text style={styles.activeSectionTitle}>{activeTabConfig.label}</Text>
          <Text style={styles.activeSectionDescription}>{activeTabConfig.description}</Text>
        </View>

        {status ? (
          <View style={[styles.status, status.type === 'error' ? styles.errorStatus : styles.successStatus]}>
            <Text style={status.type === 'error' ? styles.errorStatusText : styles.successStatusText}>{status.message}</Text>
          </View>
        ) : null}

        {activeTab === 'personal' ? <PersonalView form={profile} setForm={setProfile} saving={saving === 'personal'} onSave={savePersonal} /> : null}
        {activeTab === 'goals' ? (
          <GoalsView goals={goals} selected={selectedGoals} onToggle={(code) => setSelectedGoals((current) => toggleValue(current, code))} saving={saving === 'goals'} onSave={saveGoals} />
        ) : null}
        {activeTab === 'clinical' ? (
          <ClinicalView
            conditions={conditions}
            selectedConditions={selectedConditions}
            onToggleCondition={(code) => setSelectedConditions((current) => toggleValue(current, code))}
            restrictions={restrictions}
            selectedRestrictions={selectedRestrictions}
            onToggleRestriction={(id) => setSelectedRestrictions((current) => toggleValue(current, id))}
            saving={saving === 'clinical'}
            onSave={saveClinical}
          />
        ) : null}
        {activeTab === 'targets' ? <TargetsView form={targets} setForm={setTargets} saving={saving === 'targets'} onSave={saveTargets} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SignalStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.signalStat}>
      <Text style={styles.signalStatValue}>{value}</Text>
      <Text style={styles.signalStatLabel}>{label}</Text>
    </View>
  );
}

function ProfileLink({
  icon,
  title,
  description,
  onPress,
  divider = true,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  onPress: () => void;
  divider?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.documentLink, !divider && styles.documentLinkLast, pressed && styles.pressed]}>
      <View style={styles.linkIcon}>
        <Ionicons name={icon} size={21} color={theme.colors.primary} />
      </View>
      <View style={styles.documentLinkText}>
        <Text style={styles.documentLinkTitle}>{title}</Text>
        <Text style={styles.documentLinkDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
    </Pressable>
  );
}

function PersonalView({ form, setForm, saving, onSave }: {
  form: PersonalForm;
  setForm: React.Dispatch<React.SetStateAction<PersonalForm>>;
  saving: boolean;
  onSave: () => void;
}) {
  const router = useRouter();
  const update = (key: keyof PersonalForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <View style={styles.panel}>
      <FormSection title="Datos personales">
        <DateField label="Fecha de nacimiento" value={form.fecha_nacimiento} onChange={(value) => update('fecha_nacimiento', value)} />
        <ChoiceField label="Sexo" value={form.sexo} onChange={(value) => update('sexo', value)} choices={[
          { value: 'female', label: 'Femenino' },
          { value: 'male', label: 'Masculino' },
          { value: 'other', label: 'Otro' },
          { value: 'prefer_not_to_say', label: 'Prefiero no indicarlo' },
        ]} />
        <View style={styles.fieldPair}>
          <View style={styles.pairedField}><FormField label="Estatura" value={form.estatura_cm} unit="cm" keyboardType="decimal-pad" onChangeText={(value) => update('estatura_cm', value)} /></View>
          <View style={styles.pairedField}><FormField label="Peso actual" value={form.peso_kg} unit="kg" keyboardType="decimal-pad" onChangeText={(value) => update('peso_kg', value)} /></View>
        </View>
      </FormSection>

      <FormSection title="Actividad y condicion fisica">
        <ChoiceField label="Nivel de actividad" value={form.nivel_actividad} onChange={(value) => update('nivel_actividad', value)} choices={[
          { value: 'sedentary', label: 'Sedentario' },
          { value: 'light', label: 'Ligera' },
          { value: 'moderate', label: 'Moderada' },
          { value: 'high', label: 'Alta' },
          { value: 'athlete', label: 'Intensa' },
        ]} />
        <ChoiceField label="Condicion fisica actual" value={form.condicion_fisica} onChange={(value) => update('condicion_fisica', value)} choices={[
          { value: 'starting', label: 'Iniciando' },
          { value: 'active', label: 'Activo' },
          { value: 'trained', label: 'Entrenado' },
          { value: 'limited', label: 'Limitada' },
          { value: 'recovery', label: 'Recuperacion' },
        ]} />
      </FormSection>

      <FormSection title="Habitos alimentarios">
        <FormField label="Comidas por dia" value={form.meals_per_day} keyboardType="number-pad" onChangeText={(value) => update('meals_per_day', value)} />
        <ChoiceField label="Comidas fuera de casa" value={form.eats_out_frequency} onChange={(value) => update('eats_out_frequency', value)} choices={[
          { value: 'rarely', label: 'Casi nunca' },
          { value: 'weekly', label: '1 a 2 por semana' },
          { value: 'frequent', label: '3 o mas por semana' },
          { value: 'daily', label: 'Todos los dias' },
        ]} />
        <ChoiceField label="Estilo alimentario" value={form.diet_style} info={dietStyleInfo} onChange={(value) => update('diet_style', value)} choices={[
          { value: 'omnivore', label: 'Omnivoro' },
          { value: 'vegetarian', label: 'Vegetariano' },
          { value: 'vegan', label: 'Vegano' },
          { value: 'pescatarian', label: 'Pescetariano' },
        ]} />
        <ChoiceField label="Tiempo disponible para cocinar" value={form.cooking_time} onChange={(value) => update('cooking_time', value)} choices={[
          { value: 'short', label: 'Menos de 20 min' },
          { value: 'medium', label: '20 a 45 min' },
          { value: 'long', label: 'Mas de 45 min' },
        ]} />
        <FormField label="Notas adicionales" value={form.notas} multiline onChangeText={(value) => update('notas', value)} />
      </FormSection>
      <SaveButton label="Guardar datos personales" saving={saving} onPress={onSave} />
      <FormSection title="Cuenta y preferencias" description="Configuraciones que no cambian tus datos clinicos.">
        <View style={styles.linkGroup}>
          <ProfileLink icon="notifications-outline" title="Notificaciones" description="Bandeja, categorias y horas silenciosas" onPress={() => router.push('/notifications')} />
          <ProfileLink icon="shield-checkmark-outline" title="Privacidad y cuenta" description="Retencion de datos y eliminacion de cuenta" onPress={() => router.push('/privacy-center')} divider={false} />
        </View>
      </FormSection>
    </View>
  );
}

function GoalsView({ goals, selected, onToggle, saving, onSave }: {
  goals: NutritionGoal[];
  selected: string[];
  onToggle: (code: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <View style={styles.panel}>
      <FormSection title="Objetivos prioritarios">
        {goals.map((goal) => {
          const priority = selected.indexOf(goal.code);
          return <SelectableRow key={goal.code} title={goal.nombre} description={goal.descripcion} selected={priority >= 0} detail={priority >= 0 ? `Prioridad ${priority + 1}` : undefined} onPress={() => onToggle(goal.code)} />;
        })}
      </FormSection>
      <Text style={styles.selectionCount}>{selected.length} objetivos seleccionados</Text>
      <SaveButton label="Guardar objetivos" saving={saving} onPress={onSave} />
    </View>
  );
}

function ClinicalView({ conditions, selectedConditions, onToggleCondition, restrictions, selectedRestrictions, onToggleRestriction, saving, onSave }: {
  conditions: ClinicalCondition[];
  selectedConditions: string[];
  onToggleCondition: (code: string) => void;
  restrictions: DietaryRestriction[];
  selectedRestrictions: number[];
  onToggleRestriction: (id: number) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const router = useRouter();
  const [conditionQuery, setConditionQuery] = useState('');
  const [restrictionQuery, setRestrictionQuery] = useState('');
  const visibleConditions = visibleCatalogItems(
    conditions,
    conditionQuery,
    (condition) => selectedConditions.includes(condition.code),
    (condition) => featuredConditionCodes.indexOf(condition.code),
    (condition) => `${condition.nombre} ${condition.descripcion || ''}`,
  );
  const visibleRestrictions = visibleCatalogItems(
    restrictions,
    restrictionQuery,
    (restriction) => selectedRestrictions.includes(Number(restriction.restriccion_id)),
    (restriction) => featuredRestrictionNames.indexOf(normalizeSearch(restriction.nombre)),
    (restriction) => restriction.nombre,
  );

  return (
    <View style={styles.panel}>
      <View style={styles.guidance}><Text style={styles.guidanceText}>Registra condiciones confirmadas. Las marcadas requieren seguimiento profesional.</Text></View>
      <FormSection title="Expediente" description="Documentos y cambios que requieren revision del usuario.">
        <View style={styles.linkGroup}>
          <ProfileLink icon="document-lock-outline" title="Documentos medicos" description="Subir formula, laboratorio o indicacion nutricional" onPress={() => router.push('/medical-documents')} />
          <ProfileLink icon="time-outline" title="Historial medico" description="Revisiones, cambios aplicados y retencion" onPress={() => router.push('/medical-history')} divider={false} />
        </View>
      </FormSection>
      <FormSection title="Condiciones clinicas">
        <SearchField value={conditionQuery} onChangeText={setConditionQuery} placeholder="Buscar condicion" />
        <Text style={styles.listMeta}>{conditionQuery ? `${visibleConditions.length} resultados` : 'Condiciones frecuentes'}</Text>
        {visibleConditions.map((condition) => (
          <SelectableRow key={condition.code} title={condition.nombre} description={condition.descripcion} selected={selectedConditions.includes(condition.code)} detail={condition.requires_professional_guidance ? 'SEGUIMIENTO' : undefined} onPress={() => onToggleCondition(condition.code)} />
        ))}
        {!visibleConditions.length ? <Text style={styles.emptyResults}>No encontramos condiciones con ese nombre.</Text> : null}
      </FormSection>
      <FormSection title="Restricciones alimentarias">
        <SearchField value={restrictionQuery} onChangeText={setRestrictionQuery} placeholder="Buscar restriccion" />
        <Text style={styles.listMeta}>{restrictionQuery ? `${visibleRestrictions.length} resultados` : 'Restricciones frecuentes'}</Text>
        {visibleRestrictions.map((restriction) => (
          <SelectableRow key={restriction.restriccion_id} title={restriction.nombre} selected={selectedRestrictions.includes(Number(restriction.restriccion_id))} onPress={() => onToggleRestriction(Number(restriction.restriccion_id))} />
        ))}
        {!visibleRestrictions.length ? <Text style={styles.emptyResults}>No encontramos restricciones con ese nombre.</Text> : null}
      </FormSection>
      <SaveButton label="Guardar salud y restricciones" saving={saving} onPress={onSave} />
    </View>
  );
}

function TargetsView({ form, setForm, saving, onSave }: {
  form: TargetsForm;
  setForm: React.Dispatch<React.SetStateAction<TargetsForm>>;
  saving: boolean;
  onSave: () => void;
}) {
  const update = (key: keyof TargetsForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <View style={styles.panel}>
      <View style={styles.guidance}><Text style={styles.guidanceText}>Usa valores definidos con un profesional. Los campos vacios no generan alertas.</Text></View>
      <FormSection title="Metas y limites diarios">
        {targetFields.map((field) => (
          <FormField key={field.key} label={field.label} value={form[field.key]} unit={field.unit} keyboardType="decimal-pad" onChangeText={(value) => update(field.key, value)} />
        ))}
        <FormField label="Notas de las metas" value={form.notes} multiline onChangeText={(value) => update('notes', value)} />
      </FormSection>
      <SaveButton label="Guardar metas nutricionales" saving={saving} onPress={onSave} />
    </View>
  );
}

function validatePersonal(form: PersonalForm) {
  if (form.fecha_nacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(form.fecha_nacimiento)) return 'La fecha debe usar el formato AAAA-MM-DD';

  for (const [value, label] of [[form.estatura_cm, 'estatura'], [form.peso_kg, 'peso'], [form.meals_per_day, 'comidas por dia']]) {
    if (value && (!Number.isFinite(Number(value)) || Number(value) <= 0)) return `Revisa el valor de ${label}`;
  }
  return '';
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function visibleCatalogItems<T>(
  items: T[],
  query: string,
  isSelected: (item: T) => boolean,
  featuredIndex: (item: T) => number,
  searchText: (item: T) => string,
) {
  const normalizedQuery = normalizeSearch(query);
  if (normalizedQuery) return items.filter((item) => normalizeSearch(searchText(item)).includes(normalizedQuery));

  const selected = items.filter(isSelected);
  const featured = items
    .filter((item) => !isSelected(item) && featuredIndex(item) >= 0)
    .sort((first, second) => featuredIndex(first) - featuredIndex(second));

  return selected.length >= 6 ? selected : [...selected, ...featured].slice(0, 6);
}

function validateTargets(form: TargetsForm) {
  for (const field of targetFields) {
    const value = form[field.key];
    if (value && (!Number.isFinite(Number(value)) || Number(value) < 0)) return `Revisa ${field.label.toLowerCase()}`;
  }

  const ranges: [keyof TargetsForm, keyof TargetsForm, string][] = [
    ['calories_min', 'calories_max', 'calorias'],
    ['protein_min_g', 'protein_max_g', 'proteina'],
    ['carbs_min_g', 'carbs_max_g', 'carbohidratos'],
    ['fat_min_g', 'fat_max_g', 'grasas'],
  ];
  for (const [minKey, maxKey, label] of ranges) {
    if (form[minKey] && form[maxKey] && Number(form[minKey]) > Number(form[maxKey])) return `El minimo de ${label} no puede superar el maximo`;
  }
  return '';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  keyboardArea: { flex: 1 },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 56 },
  hero: { gap: theme.spacing.sm },
  eyebrow: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800', marginTop: theme.spacing.xs },
  subtitle: { color: theme.colors.textMuted, fontSize: 15, lineHeight: 21 },
  signalSummary: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: theme.spacing.md, gap: theme.spacing.md, marginTop: theme.spacing.sm },
  signalSummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  signalSummaryIcon: { width: 38, height: 38, borderRadius: theme.radius.small, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceMuted },
  signalSummaryCopy: { flex: 1, minWidth: 0, gap: 2 },
  signalSummaryTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  signalSummaryText: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
  signalStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12 },
  signalStat: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
  signalStatValue: { color: theme.colors.primaryPressed, fontSize: 17, fontWeight: '800' },
  signalStatLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  tabs: { gap: theme.spacing.sm },
  tab: { width: 104, minHeight: 70, justifyContent: 'space-between', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: 11 },
  activeTab: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surfaceMuted },
  tabTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tabCount: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '800' },
  tabText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '700' },
  activeTabText: { color: theme.colors.primaryPressed },
  activeSectionHeading: { gap: 3 },
  activeSectionTitle: { color: theme.colors.text, fontSize: 21, fontWeight: '800' },
  activeSectionDescription: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  status: { borderRadius: theme.radius.medium, borderWidth: 1, padding: 13 },
  successStatus: { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted },
  errorStatus: { borderColor: '#F5B7B1', backgroundColor: theme.colors.dangerSurface },
  successStatusText: { color: theme.colors.primaryPressed, fontWeight: '700' },
  errorStatusText: { color: theme.colors.danger, fontWeight: '700' },
  panel: { gap: theme.spacing.xl },
  fieldPair: { flexDirection: 'row', gap: theme.spacing.sm },
  pairedField: { flex: 1, minWidth: 0 },
  selectionCount: { color: theme.colors.textMuted, textAlign: 'center', fontSize: 13 },
  listMeta: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
  emptyResults: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20, paddingVertical: theme.spacing.sm },
  guidance: { borderLeftWidth: 3, borderLeftColor: theme.colors.warning, backgroundColor: theme.colors.warningSurface, padding: 12 },
  guidanceText: { color: theme.colors.warning, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  linkGroup: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, paddingHorizontal: 13 },
  documentLink: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingVertical: 10 },
  documentLinkLast: { borderBottomWidth: 0 },
  linkIcon: { width: 36, height: 36, borderRadius: theme.radius.small, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceMuted },
  documentLinkText: { flex: 1, minWidth: 0 },
  documentLinkTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  documentLinkDescription: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  pressed: { opacity: 0.76 },
});
