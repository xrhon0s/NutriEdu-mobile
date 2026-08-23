import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FoodAnalysisReview } from '@/components/food-analysis-review';
import { theme } from '@/constants/nutriedu-theme';
import { useAuth } from '@/context/auth-context';
import { foodAnalysisReviewFixture } from '@/fixtures/food-analysis-review';
import { apiRequest } from '@/services/api';
import {
  FoodAnalysisResponse,
  FoodAnalysisReviewResponse,
  FoodImageIntakeResponse,
  FoodImageSource,
  FoodVisionAnalysis,
  VisionProviderStatus,
} from '@/types/api';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

type PermissionIssue = { message: string } | null;

export default function AnalyzeScreen() {
  const { token } = useAuth();
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [source, setSource] = useState<FoodImageSource | null>(null);
  const [permissionIssue, setPermissionIssue] = useState<PermissionIssue>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewDirty, setReviewDirty] = useState(false);
  const [consent, setConsent] = useState(false);
  const [intake, setIntake] = useState<FoodImageIntakeResponse | null>(null);
  const [visionStatus, setVisionStatus] = useState<VisionProviderStatus | null>(null);
  const [result, setResult] = useState<FoodAnalysisResponse | FoodAnalysisReviewResponse | null>(null);
  const quotaExhausted = visionStatus?.quota?.dailyRemaining === 0;

  useEffect(() => {
    let active = true;
    apiRequest<VisionProviderStatus>('/food-analysis/status', { token })
      .then((status) => { if (active) setVisionStatus(status); })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'No pudimos consultar el proveedor visual');
      });
    return () => { active = false; };
  }, [token]);

  const capturePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPermissionIssue({ message: 'El permiso de camara esta desactivado.' });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      cameraType: ImagePicker.CameraType.back,
      quality: 0.85,
    });
    if (!result.canceled) chooseAsset(result.assets[0], 'camera');
  };

  const selectPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPermissionIssue({ message: 'El permiso para acceder a fotos esta desactivado.' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled) chooseAsset(result.assets[0], 'library');
  };

  const chooseAsset = (nextAsset: ImagePicker.ImagePickerAsset, nextSource: FoodImageSource) => {
    const validationError = validateAsset(nextAsset);
    setPermissionIssue(null);
    setIntake(null);
    setResult(null);
    setReviewDirty(false);
    setConsent(false);
    setError(validationError);
    if (!validationError) {
      setAsset(nextAsset);
      setSource(nextSource);
    }
  };

  const clearAsset = () => {
    setAsset(null);
    setSource(null);
    setIntake(null);
    setResult(null);
    setReviewDirty(false);
    setConsent(false);
    setError('');
  };

  const prepareAnalysis = async () => {
    if (!asset || !source) return;
    if (visionStatus?.configured && !consent) return;

    try {
      setUploading(true);
      setError('');
      const prepared = visionStatus?.configured ? await normalizeForVision(asset) : {
        uri: asset.uri,
        fileName: asset.fileName || `food-${Date.now()}.${extensionFor(asset.mimeType)}`,
        mimeType: asset.mimeType || mimeTypeFor(asset.fileName || ''),
      };
      const body = new FormData();
      body.append('image', { uri: prepared.uri, name: prepared.fileName, type: prepared.mimeType } as unknown as Blob);
      body.append('source', source);
      body.append('capturedAt', new Date().toISOString());
      if (visionStatus?.configured) {
        body.append('consent', 'true');
        body.append('consentVersion', '1.0');
        const analysisResponse = await apiRequest<FoodAnalysisResponse>('/food-analysis/analyze', {
          method: 'POST', token, body,
        });
        setResult(analysisResponse);
        setVisionStatus((current) => current ? { ...current, quota: analysisResponse.quota } : current);
        setReviewDirty(false);
        setIntake(null);
      } else {
        setIntake(await apiRequest<FoodImageIntakeResponse>('/food-analysis/intake', {
          method: 'POST', token, body,
        }));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pudimos preparar la imagen');
    } finally {
      setUploading(false);
    }
  };

  const updateAnalysis = (analysis: FoodVisionAnalysis) => {
    setResult((current) => current ? { ...current, analysis } : current);
    setReviewDirty(true);
  };

  const reevaluate = async () => {
    if (!result) return;
    try {
      setReviewing(true);
      setError('');
      setResult(await apiRequest<FoodAnalysisReviewResponse>('/food-analysis/review', {
        method: 'POST',
        token,
        body: JSON.stringify({ requestId: result.requestId, analysis: result.analysis }),
      }));
      setReviewDirty(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pudimos reevaluar las correcciones');
    } finally {
      setReviewing(false);
    }
  };

  const openDevelopmentReview = () => {
    setIntake(null);
    setResult(foodAnalysisReviewFixture);
    setReviewDirty(false);
    setError('');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.eyebrow}>CAPTURA MOBILE</Text>
          <Text style={styles.title}>Analizar plato</Text>
        </View>

        {visionStatus?.configured && visionStatus.quota ? (
          <View style={styles.quotaStatus}>
            <Ionicons name="speedometer-outline" size={19} color={theme.colors.primary} />
            <Text style={styles.quotaText}>
              {visionStatus.quota.dailyRemaining} de {visionStatus.quota.dailyLimit} analisis disponibles hoy
            </Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <CaptureButton icon="camera-outline" label="Tomar foto" onPress={capturePhoto} />
          <CaptureButton icon="images-outline" label="Elegir foto" onPress={selectPhoto} />
        </View>

        {permissionIssue ? (
          <View style={styles.permissionStatus}>
            <View style={styles.statusText}>
              <Text style={styles.permissionTitle}>Permiso requerido</Text>
              <Text style={styles.permissionMessage}>{permissionIssue.message}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => Linking.openSettings()} style={styles.settingsButton}>
              <Ionicons name="settings-outline" size={17} color={theme.colors.primary} />
              <Text style={styles.settingsText}>Ajustes</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {asset ? (
          <View style={styles.previewSection}>
            <View style={styles.previewHeader}>
              <Text style={styles.sectionTitle}>Imagen seleccionada</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Quitar imagen" hitSlop={8} onPress={clearAsset} style={styles.removeButton}>
                <Ionicons name="trash-outline" size={19} color={theme.colors.danger} />
              </Pressable>
            </View>
            <Image source={{ uri: asset.uri }} resizeMode="cover" style={styles.preview} />
            <View style={styles.metadataRow}>
              <Text style={styles.metadata}>{source === 'camera' ? 'Camara' : 'Galeria'}</Text>
              <Text style={styles.metadata}>{formatBytes(asset.fileSize)}</Text>
              <Text style={styles.metadata}>{asset.width} x {asset.height}</Text>
            </View>

            {visionStatus?.configured ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: consent }}
                onPress={() => setConsent((current) => !current)}
                style={styles.consentRow}>
                <Ionicons name={consent ? 'checkbox' : 'square-outline'} size={23} color={theme.colors.primary} />
                <Text style={styles.consentText}>Autorizo enviar esta imagen al proveedor externo para obtener una estimacion visual. NutriEdu no almacenara la foto.</Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={uploading || !visionStatus || quotaExhausted || Boolean(visionStatus.configured && !consent)}
              onPress={prepareAnalysis}
              style={({ pressed }) => [styles.primaryButton, (uploading || !visionStatus || quotaExhausted || Boolean(visionStatus.configured && !consent)) && styles.disabled, pressed && styles.pressed]}>
              <Ionicons name="scan-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>{uploading ? 'Procesando imagen...' : quotaExhausted ? 'Limite diario alcanzado' : visionStatus?.configured ? 'Analizar imagen' : 'Validar imagen'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyPreview}>
            <Ionicons name="image-outline" size={32} color={theme.colors.primary} />
            <Text style={styles.emptyTitle}>Sin imagen seleccionada</Text>
          </View>
        )}

        {intake ? (
          <View style={styles.validatedStatus}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
            <View style={styles.statusText}>
              <Text style={styles.validatedTitle}>Imagen validada</Text>
              <Text style={styles.validatedText}>Solicitud {intake.requestId.slice(0, 8)} · {formatBytes(intake.image.sizeBytes)}</Text>
              <Text style={styles.validatedText}>La imagen no fue almacenada. Configura un proveedor de vision para generar resultados.</Text>
            </View>
          </View>
        ) : null}
        {__DEV__ && intake ? (
          <Pressable
            accessibilityRole="button"
            onPress={openDevelopmentReview}
            style={({ pressed }) => [styles.previewResultButton, pressed && styles.pressed]}>
            <Ionicons name="eye-outline" size={19} color={theme.colors.primary} />
            <Text style={styles.previewResultText}>Abrir resultado de prueba</Text>
          </Pressable>
        ) : null}
        {result ? (
          <FoodAnalysisReview
            analysis={result.analysis}
            evaluation={result.evaluation}
            dirty={reviewDirty}
            reviewing={reviewing}
            onChange={updateAnalysis}
            onReview={reevaluate}
          />
        ) : null}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CaptureButton({ icon, label, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.captureButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={22} color={theme.colors.primary} />
      <Text style={styles.captureButtonText}>{label}</Text>
    </Pressable>
  );
}

const validateAsset = (asset: ImagePicker.ImagePickerAsset) => {
  if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) return 'La imagen supera el limite de 8 MB.';
  if (asset.mimeType && !ALLOWED_IMAGE_TYPES.has(asset.mimeType)) return 'Usa una imagen JPEG, PNG, WebP o HEIC.';
  return '';
};

const extensionFor = (mimeType?: string | null) => {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/heic' || mimeType === 'image/heif') return 'heic';
  return 'jpg';
};

const mimeTypeFor = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'heic') return 'image/heic';
  if (extension === 'heif') return 'image/heif';
  return 'image/jpeg';
};

const formatBytes = (bytes?: number | null) => {
  if (!bytes) return 'Tamano no disponible';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const normalizeForVision = async (asset: ImagePicker.ImagePickerAsset) => {
  const actions: ImageManipulator.Action[] = asset.width > 1600 ? [{ resize: { width: 1600 } }] : [];
  const normalized = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    compress: 0.82,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return {
    uri: normalized.uri,
    fileName: `food-${Date.now()}.jpg`,
    mimeType: 'image/jpeg',
  };
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  keyboardArea: { flex: 1 },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 44 },
  eyebrow: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  title: { color: theme.colors.text, fontSize: 27, fontWeight: '800', marginTop: theme.spacing.xs },
  quotaStatus: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderLeftWidth: 3, borderLeftColor: theme.colors.primary, backgroundColor: theme.colors.surfaceMuted, paddingHorizontal: 12 },
  quotaText: { flex: 1, color: theme.colors.primaryPressed, fontSize: 13, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10 },
  captureButton: { flex: 1, minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface },
  captureButtonText: { color: theme.colors.primaryPressed, fontSize: 14, fontWeight: '800' },
  permissionStatus: { flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 3, borderLeftColor: theme.colors.warning, backgroundColor: theme.colors.warningSurface, padding: 12 },
  statusText: { flex: 1, minWidth: 0 },
  permissionTitle: { color: theme.colors.warning, fontSize: 14, fontWeight: '800' },
  permissionMessage: { color: theme.colors.warning, fontSize: 13, lineHeight: 18, marginTop: 3 },
  settingsButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8 },
  settingsText: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
  error: { color: theme.colors.danger, backgroundColor: theme.colors.dangerSurface, borderRadius: theme.radius.small, padding: 12 },
  previewSection: { gap: 12 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  removeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surfaceMuted },
  metadataRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metadata: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: 12 },
  consentText: { flex: 1, color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 },
  primaryButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: theme.radius.medium, backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.md },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.75 },
  emptyPreview: { minHeight: 210, alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface },
  emptyTitle: { color: theme.colors.textMuted, fontSize: 15, fontWeight: '700' },
  validatedStatus: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surfaceMuted, padding: theme.spacing.md },
  validatedTitle: { color: theme.colors.primaryPressed, fontSize: 16, fontWeight: '800' },
  validatedText: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  previewResultButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md },
  previewResultText: { color: theme.colors.primary, fontSize: 14, fontWeight: '800' },
});
