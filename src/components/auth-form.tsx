import Ionicons from '@expo/vector-icons/Ionicons';
import { PropsWithChildren, ReactNode, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/nutriedu-theme';
import { passwordChecks } from '@/services/password-policy';

export function AuthScreen({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle: string }>) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Image source={require('@/assets/images/nutriedu-logo.png')} style={styles.logo} resizeMode="contain" />
            <View>
              <Text style={styles.brandName}>NutriEdu</Text>
              <Text style={styles.brandSubtitle}>{t('auth.brandSubtitle')}</Text>
            </View>
          </View>
          <View style={styles.form}>
            <View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function FormField({ label, secureTextEntry, ...props }: TextInputProps & { label: string }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { t } = useTranslation();
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputShell}>
        <TextInput style={styles.input} placeholderTextColor="#8A9890" autoCapitalize="none" secureTextEntry={Boolean(secureTextEntry) && !passwordVisible} {...props} />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? t('auth.hidePassword') : t('auth.showPassword')}
            onPress={() => setPasswordVisible((current) => !current)}
            hitSlop={8}
            style={styles.passwordToggle}>
            <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={21} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function PasswordRequirements({ password }: { password: string }) {
  const { t } = useTranslation();
  const checks = passwordChecks(password);
  const requirements = [
    ['minLength', checks.minLength],
    ['uppercase', checks.uppercase],
    ['lowercase', checks.lowercase],
    ['number', checks.number],
    ['symbol', checks.symbol],
    ['maxBytes', checks.maxBytes],
  ] as const;

  return (
    <View style={styles.requirements} accessibilityRole="list">
      {requirements.map(([key, met]) => (
        <View key={key} style={styles.requirementRow} accessibilityRole="text">
          <Ionicons name={met ? 'checkmark-circle' : 'ellipse-outline'} size={17} color={met ? theme.colors.primary : theme.colors.textMuted} />
          <Text style={[styles.requirementText, met && styles.requirementMet]}>{t(`auth.passwordRequirements.${key}`)}</Text>
        </View>
      ))}
    </View>
  );
}

export function PrimaryButton({ label, loadingLabel, loading, onPress }: {
  label: string;
  loadingLabel: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}>
      <Text style={styles.buttonText}>{loading ? loadingLabel : label}</Text>
    </Pressable>
  );
}

export function FormMessage({ type, children }: { type: 'error' | 'success' | 'info'; children: ReactNode }) {
  return <Text style={type === 'error' ? styles.error : type === 'success' ? styles.success : styles.info}>{children}</Text>;
}

export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.xl },
  brand: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  logo: { width: 58, height: 58 },
  brandName: { color: theme.colors.primary, fontSize: 24, fontWeight: '800' },
  brandSubtitle: { color: theme.colors.textMuted, fontSize: 13 },
  form: { gap: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: theme.spacing.lg },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: theme.colors.textMuted, fontSize: 15, lineHeight: 21, marginTop: theme.spacing.sm },
  error: { color: theme.colors.danger, backgroundColor: theme.colors.dangerSurface, borderRadius: theme.radius.small, padding: 12 },
  success: { color: theme.colors.primaryPressed, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.small, padding: 12, lineHeight: 20 },
  info: { color: theme.colors.text, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.small, padding: 12, lineHeight: 20 },
  fieldGroup: { gap: theme.spacing.sm },
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  inputShell: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface },
  input: { minHeight: 48, flex: 1, color: theme.colors.text, paddingHorizontal: 14, fontSize: 16 },
  passwordToggle: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  requirements: { gap: 7, marginTop: -4 },
  requirementRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requirementText: { flex: 1, color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  requirementMet: { color: theme.colors.primaryPressed },
  button: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.medium, backgroundColor: theme.colors.primary },
  buttonPressed: { backgroundColor: theme.colors.primaryPressed },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  link: { color: theme.colors.primary, fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
