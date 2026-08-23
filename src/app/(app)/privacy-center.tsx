import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/nutriedu-theme';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { AccountDeletionResponse, MedicalDocumentRetentionPolicy } from '@/types/api';

export default function PrivacyCenterScreen() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const [policy, setPolicy] = useState<MedicalDocumentRetentionPolicy | null>(null);
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<MedicalDocumentRetentionPolicy>('/medical-documents/retention-policy', { token })
      .then(setPolicy)
      .catch(() => setPolicy(null));
  }, [token]);

  const requestAccountDeletion = () => {
    if (!password || !confirmed || deleting) return;
    Alert.alert(
      'Eliminar cuenta definitivamente',
      'Se eliminaran tu perfil, objetivos, condiciones, restricciones, plan, auditorias medicas y datos asociados. Esta accion no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar cuenta', style: 'destructive', onPress: deleteAccount },
      ],
    );
  };

  const deleteAccount = async () => {
    try {
      setDeleting(true);
      setError('');
      await apiRequest<AccountDeletionResponse>('/users/account', {
        method: 'DELETE',
        token,
        body: JSON.stringify({ password, confirmation: 'DELETE_MY_ACCOUNT' }),
      });
      await logout();
      router.replace('/login');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pudimos eliminar la cuenta');
    } finally {
      setDeleting(false);
    }
  };

  const deletionDisabled = !password || !confirmed || deleting;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Volver al perfil" onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>CONTROL DE DATOS</Text>
              <Text style={styles.title}>Privacidad y cuenta</Text>
            </View>
          </View>

          <View style={styles.policyBand}>
            <Ionicons name="document-lock-outline" size={24} color={theme.colors.primary} />
            <View style={styles.policyTextArea}>
              <Text style={styles.policyTitle}>Documentos medicos</Text>
              <Text style={styles.policyText}>Los archivos originales no se almacenan. Las revisiones no aplicadas expiran despues de {policy?.unappliedReviewDays ?? 30} dias.</Text>
            </View>
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push('/medical-history')} style={({ pressed }) => [styles.historyLink, pressed && styles.pressed]}>
            <Ionicons name="time-outline" size={22} color={theme.colors.primary} />
            <View style={styles.linkText}>
              <Text style={styles.linkTitle}>Historial medico</Text>
              <Text style={styles.linkDescription}>Consulta revisiones, cambios y fechas de retencion</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </Pressable>

          <View style={styles.dataSection}>
            <Text style={styles.sectionTitle}>Al eliminar tu cuenta</Text>
            <DataLine icon="person-outline" text="Se elimina tu cuenta y perfil personal" />
            <DataLine icon="fitness-outline" text="Se eliminan objetivos, condiciones y metas" />
            <DataLine icon="calendar-outline" text="Se eliminan plan semanal y restricciones" />
            <DataLine icon="shield-outline" text="Se eliminan revisiones y auditorias medicas" />
          </View>

          <View style={styles.dangerSection}>
            <Text style={styles.dangerTitle}>Eliminar cuenta</Text>
            <Text style={styles.dangerDescription}>Confirma tu identidad con la contrasena actual. La eliminacion es permanente.</Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.field}>
              <Text style={styles.label}>Contrasena actual</Text>
              <TextInput
                accessibilityLabel="Contrasena actual para eliminar la cuenta"
                autoCapitalize="none"
                autoComplete="current-password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={styles.input}
              />
            </View>

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: confirmed }}
              onPress={() => setConfirmed((current) => !current)}
              style={styles.confirmationRow}>
              <Ionicons name={confirmed ? 'checkbox' : 'square-outline'} size={23} color={theme.colors.danger} />
              <Text style={styles.confirmationText}>Entiendo que esta accion elimina permanentemente mis datos y no se puede deshacer.</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={deletionDisabled}
              onPress={requestAccountDeletion}
              style={({ pressed }) => [styles.deleteButton, deletionDisabled && styles.disabled, pressed && styles.pressed]}>
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
              <Text style={styles.deleteButtonText}>{deleting ? 'Eliminando...' : 'Eliminar mi cuenta'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DataLine({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return <View style={styles.dataLine}><Ionicons name={icon} size={19} color={theme.colors.textMuted} /><Text style={styles.dataText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  keyboardArea: { flex: 1 },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, minWidth: 0 },
  eyebrow: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  title: { color: theme.colors.text, fontSize: 25, fontWeight: '800', marginTop: 3 },
  policyBand: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderLeftWidth: 3, borderLeftColor: theme.colors.primary, backgroundColor: theme.colors.surfaceMuted, padding: 12 },
  policyTextArea: { flex: 1, minWidth: 0 },
  policyTitle: { color: theme.colors.primaryPressed, fontSize: 14, fontWeight: '800' },
  policyText: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 3 },
  historyLink: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: 12 },
  linkText: { flex: 1, minWidth: 0 },
  linkTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  linkDescription: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  dataSection: { gap: 11 },
  sectionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  dataLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  dataText: { flex: 1, color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  dangerSection: { gap: 13, borderTopWidth: 2, borderTopColor: theme.colors.danger, paddingTop: 16 },
  dangerTitle: { color: theme.colors.danger, fontSize: 18, fontWeight: '800' },
  dangerDescription: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  error: { color: theme.colors.danger, backgroundColor: theme.colors.dangerSurface, borderRadius: theme.radius.small, padding: 12 },
  field: { gap: 7 },
  label: { color: theme.colors.text, fontSize: 13, fontWeight: '800' },
  input: { minHeight: 50, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.small, backgroundColor: theme.colors.surface, color: theme.colors.text, paddingHorizontal: 13, fontSize: 15 },
  confirmationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: theme.colors.danger, borderRadius: theme.radius.medium, backgroundColor: theme.colors.dangerSurface, padding: 12 },
  confirmationText: { flex: 1, color: theme.colors.text, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  deleteButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: theme.radius.medium, backgroundColor: theme.colors.danger, paddingHorizontal: 14 },
  deleteButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.76 },
});
