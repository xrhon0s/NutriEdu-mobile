import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MedicalDocumentApplicationPreviewView } from '@/components/medical-document-application-preview';
import { MedicalDocumentReview } from '@/components/medical-document-review';
import { ChoiceField } from '@/components/profile-controls';
import { theme } from '@/constants/nutriedu-theme';
import { useAuth } from '@/context/auth-context';
import { medicalDocumentReviewFixture } from '@/fixtures/medical-document-review';
import { apiRequest } from '@/services/api';
import {
  MedicalDocumentApplicationPreview,
  MedicalDocumentApplicationResponse,
  MedicalDocumentExtraction,
  MedicalDocumentIntakeResponse,
  MedicalDocumentReviewResponse,
  MedicalDocumentType,
} from '@/types/api';

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);

type SelectedDocument = {
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
  source: 'camera' | 'file';
};

const documentChoices = [
  { value: 'prescription', label: 'Formula o receta' },
  { value: 'lab_result', label: 'Laboratorio' },
  { value: 'nutrition_order', label: 'Indicacion nutricional' },
  { value: 'medical_summary', label: 'Resumen clinico' },
  { value: 'other', label: 'Otro' },
];

export default function MedicalDocumentsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [documentType, setDocumentType] = useState<MedicalDocumentType | ''>('');
  const [document, setDocument] = useState<SelectedDocument | null>(null);
  const [consent, setConsent] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [intake, setIntake] = useState<MedicalDocumentIntakeResponse | null>(null);
  const [extraction, setExtraction] = useState<MedicalDocumentExtraction | null>(null);
  const [reviewRequestId, setReviewRequestId] = useState('');
  const [acceptedFindingIds, setAcceptedFindingIds] = useState<string[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [reviewedCount, setReviewedCount] = useState<number | null>(null);
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [applicationPreview, setApplicationPreview] = useState<MedicalDocumentApplicationPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [profileApplied, setProfileApplied] = useState(false);

  const chooseFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    selectDocument({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType || mimeTypeFromName(asset.name),
      size: asset.size ?? null,
      source: 'file',
    });
  };

  const captureDocument = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPermissionDenied(true);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      cameraType: ImagePicker.CameraType.back,
      quality: 0.9,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const normalized = await ImageManipulator.manipulateAsync(
      asset.uri,
      asset.width > 2000 ? [{ resize: { width: 2000 } }] : [],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
    );
    selectDocument({
      uri: normalized.uri,
      name: `medical-document-${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      size: null,
      source: 'camera',
    });
  };

  const selectDocument = (nextDocument: SelectedDocument) => {
    const validationError = validateDocument(nextDocument);
    setPermissionDenied(false);
    setConsent(false);
    setIntake(null);
    setError(validationError);
    setDocument(validationError ? null : nextDocument);
  };

  const clearDocument = () => {
    setDocument(null);
    setConsent(false);
    setIntake(null);
    setError('');
    clearReview();
  };

  const submitDocument = async () => {
    if (!document || !documentType || !consent) return;
    try {
      setUploading(true);
      setError('');
      const body = new FormData();
      body.append('document', {
        uri: document.uri,
        name: document.name,
        type: document.mimeType,
      } as unknown as Blob);
      body.append('source', document.source);
      body.append('documentType', documentType);
      body.append('consent', 'true');
      body.append('consentVersion', '1.0');
      body.append('capturedAt', new Date().toISOString());
      setIntake(await apiRequest<MedicalDocumentIntakeResponse>('/medical-documents/intake', {
        method: 'POST',
        token,
        body,
      }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pudimos validar el documento');
    } finally {
      setUploading(false);
    }
  };

  const submitDisabled = !document || !documentType || !consent || uploading;

  const openDevelopmentReview = () => {
    if (!intake) return;
    setExtraction(medicalDocumentReviewFixture);
    setReviewRequestId(intake.requestId);
    setAcceptedFindingIds([]);
    setReviewedCount(null);
    setError('');
  };

  const updateExtraction = (nextExtraction: MedicalDocumentExtraction) => {
    setExtraction(nextExtraction);
    setReviewedCount(null);
    clearApplication();
  };

  const toggleFinding = (findingId: string) => {
    setAcceptedFindingIds((current) => current.includes(findingId)
      ? current.filter((id) => id !== findingId)
      : [...current, findingId]);
    setReviewedCount(null);
    clearApplication();
  };

  const reviewExtraction = async () => {
    if (!extraction || !reviewRequestId) return;
    try {
      setReviewing(true);
      setError('');
      const response = await apiRequest<MedicalDocumentReviewResponse>('/medical-documents/review', {
        method: 'POST',
        token,
        body: JSON.stringify({
          requestId: reviewRequestId,
          extraction,
          acceptedFindingIds,
        }),
      });
      setExtraction(response.extraction);
      setAcceptedFindingIds(response.acceptedFindingIds);
      setReviewedCount(response.acceptedCount);
      setReviewId(response.reviewId);
      setApplicationPreview(null);
      setProfileApplied(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pudimos revisar los hallazgos');
    } finally {
      setReviewing(false);
    }
  };

  const loadApplicationPreview = async () => {
    if (!reviewId) return;
    try {
      setPreviewing(true);
      setError('');
      setApplicationPreview(await apiRequest<MedicalDocumentApplicationPreview>(
        `/medical-documents/reviews/${reviewId}/preview`,
        { token },
      ));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pudimos preparar los cambios');
    } finally {
      setPreviewing(false);
    }
  };

  const applyProfileChanges = async () => {
    if (!applicationPreview) return;
    try {
      setApplying(true);
      setError('');
      const response = await apiRequest<MedicalDocumentApplicationResponse>(
        `/medical-documents/reviews/${applicationPreview.reviewId}/apply`,
        {
          method: 'POST',
          token,
          body: JSON.stringify({
            previewHash: applicationPreview.previewHash,
            confirmationVersion: applicationPreview.confirmationVersion,
          }),
        },
      );
      setProfileApplied(response.profileUpdated);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pudimos aplicar los cambios');
    } finally {
      setApplying(false);
    }
  };

  function clearReview() {
    setExtraction(null);
    setReviewRequestId('');
    setAcceptedFindingIds([]);
    setReviewedCount(null);
    clearApplication();
  }

  function clearApplication() {
    setReviewId(null);
    setApplicationPreview(null);
    setProfileApplied(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {applicationPreview ? (
          <>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <MedicalDocumentApplicationPreviewView
              preview={applicationPreview}
              applying={applying}
              applied={profileApplied}
              onApply={applyProfileChanges}
              onBack={() => { setApplicationPreview(null); setError(''); }}
            />
          </>
        ) : extraction ? (
          <>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <MedicalDocumentReview
              extraction={extraction}
              acceptedFindingIds={acceptedFindingIds}
              reviewing={reviewing}
              reviewedCount={reviewedCount}
              onChange={updateExtraction}
              onToggleFinding={toggleFinding}
              onReview={reviewExtraction}
              onCancel={clearReview}
            />
            {reviewId && reviewedCount !== null ? (
              <Pressable
                accessibilityRole="button"
                disabled={previewing}
                onPress={loadApplicationPreview}
                style={({ pressed }) => [styles.profilePreviewButton, previewing && styles.disabled, pressed && styles.pressed]}>
                <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
                <Text style={styles.profilePreviewButtonText}>{previewing ? 'Preparando cambios...' : 'Ver cambios del perfil'}</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
        <>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver al perfil" onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>PERFIL CLINICO</Text>
            <Text style={styles.title}>Documento medico</Text>
          </View>
        </View>

        <ChoiceField
          label="Tipo de documento"
          value={documentType}
          choices={documentChoices}
          onChange={(value) => { setDocumentType(value as MedicalDocumentType); setIntake(null); }}
        />

        <View style={styles.actionRow}>
          <DocumentAction icon="camera-outline" label="Tomar foto" onPress={captureDocument} />
          <DocumentAction icon="document-attach-outline" label="Elegir archivo" onPress={chooseFile} />
        </View>

        {permissionDenied ? (
          <View style={styles.warningStatus}>
            <Text style={styles.warningText}>El permiso de camara esta desactivado.</Text>
            <Pressable accessibilityRole="button" onPress={() => Linking.openSettings()} hitSlop={8}>
              <Text style={styles.settingsText}>Abrir ajustes</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {document ? (
          <View style={styles.documentSection}>
            <View style={styles.documentHeader}>
              <View style={styles.documentIdentity}>
                <Ionicons name={document.mimeType === 'application/pdf' ? 'document-text-outline' : 'image-outline'} size={24} color={theme.colors.primary} />
                <View style={styles.documentText}>
                  <Text numberOfLines={2} style={styles.fileName}>{document.name}</Text>
                  <Text style={styles.fileMeta}>{formatBytes(document.size)} · {document.mimeType === 'application/pdf' ? 'PDF' : 'Imagen'}</Text>
                </View>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Quitar documento" onPress={clearDocument} style={styles.removeButton}>
                <Ionicons name="trash-outline" size={19} color={theme.colors.danger} />
              </Pressable>
            </View>
            {document.mimeType !== 'application/pdf' ? <Image source={{ uri: document.uri }} resizeMode="contain" style={styles.preview} /> : null}

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consent }}
              onPress={() => setConsent((current) => !current)}
              style={styles.consentRow}>
              <Ionicons name={consent ? 'checkbox' : 'square-outline'} size={23} color={theme.colors.primary} />
              <Text style={styles.consentText}>Autorizo procesar este documento para extraer datos que revisare. Mi perfil no cambiara sin mi confirmacion.</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={submitDisabled}
              onPress={submitDocument}
              style={({ pressed }) => [styles.submitButton, submitDisabled && styles.disabled, pressed && styles.pressed]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#FFFFFF" />
              <Text style={styles.submitText}>{uploading ? 'Validando documento...' : 'Validar documento'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-lock-outline" size={34} color={theme.colors.primary} />
            <Text style={styles.emptyText}>Sin documento seleccionado</Text>
          </View>
        )}

        {intake ? (
          <View style={styles.successStatus}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
            <View style={styles.successText}>
              <Text style={styles.successTitle}>Documento validado</Text>
              <Text style={styles.successMessage}>No fue almacenado y tu perfil no fue modificado.</Text>
              <Text style={styles.requestId}>Solicitud {intake.requestId.slice(0, 8)}</Text>
            </View>
          </View>
        ) : null}
        {__DEV__ && intake ? (
          <Pressable accessibilityRole="button" onPress={openDevelopmentReview} style={({ pressed }) => [styles.developmentButton, pressed && styles.pressed]}>
            <Ionicons name="eye-outline" size={19} color={theme.colors.primary} />
            <Text style={styles.developmentButtonText}>Abrir extraccion de prueba</Text>
          </Pressable>
        ) : null}
        </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DocumentAction({ icon, label, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={21} color={theme.colors.primary} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const validateDocument = (document: SelectedDocument) => {
  if (!ALLOWED_TYPES.has(document.mimeType)) return 'Usa un documento PDF, JPEG o PNG.';
  if (document.size && document.size > MAX_DOCUMENT_BYTES) return 'El documento supera el limite de 10 MB.';
  return '';
};

const mimeTypeFromName = (name: string) => {
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'png') return 'image/png';
  return 'image/jpeg';
};

const formatBytes = (bytes: number | null) => {
  if (!bytes) return 'Tamano no disponible';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  keyboardArea: { flex: 1 },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, minWidth: 0 },
  eyebrow: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  title: { color: theme.colors.text, fontSize: 25, fontWeight: '800', marginTop: 3 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, paddingHorizontal: 10 },
  actionText: { color: theme.colors.primaryPressed, fontSize: 14, fontWeight: '800' },
  warningStatus: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderLeftWidth: 3, borderLeftColor: theme.colors.warning, backgroundColor: theme.colors.warningSurface, padding: 12 },
  warningText: { flex: 1, color: theme.colors.warning, fontSize: 13, fontWeight: '700' },
  settingsText: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
  error: { color: theme.colors.danger, backgroundColor: theme.colors.dangerSurface, borderRadius: theme.radius.small, padding: 12 },
  documentSection: { gap: theme.spacing.md },
  documentHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  documentIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  documentText: { flex: 1, minWidth: 0 },
  fileName: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  fileMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 3 },
  removeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  preview: { width: '100%', aspectRatio: 3 / 4, maxHeight: 440, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: 12 },
  consentText: { flex: 1, color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 },
  submitButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: theme.radius.medium, backgroundColor: theme.colors.primary, paddingHorizontal: 14 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  emptyState: { minHeight: 190, alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '700' },
  successStatus: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderLeftWidth: 3, borderLeftColor: theme.colors.primary, backgroundColor: theme.colors.surfaceMuted, padding: 12 },
  successText: { flex: 1, minWidth: 0 },
  successTitle: { color: theme.colors.primaryPressed, fontSize: 15, fontWeight: '800' },
  successMessage: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 3 },
  requestId: { color: theme.colors.textMuted, fontSize: 11, marginTop: 5 },
  developmentButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, paddingHorizontal: 14 },
  developmentButtonText: { color: theme.colors.primary, fontSize: 14, fontWeight: '800' },
  profilePreviewButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: theme.radius.medium, backgroundColor: theme.colors.primaryPressed, paddingHorizontal: 14 },
  profilePreviewButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.76 },
});
