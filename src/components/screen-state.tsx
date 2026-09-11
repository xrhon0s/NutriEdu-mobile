import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/nutriedu-theme';

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.text}>{label || t('common.loading')}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.container, styles.errorContainer]}>
      <View style={styles.errorIcon}>
        <Ionicons name="cloud-offline-outline" size={28} color={theme.colors.danger} />
      </View>
      <Text style={styles.errorTitle}>{t('common.loadErrorTitle')}</Text>
      <Text style={styles.text}>{message}</Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
          <Ionicons name="refresh-outline" size={19} color="#FFFFFF" />
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  errorContainer: {
    backgroundColor: theme.colors.background,
  },
  errorIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: theme.colors.dangerSurface },
  errorTitle: {
    color: theme.colors.danger,
    fontSize: 17,
    fontWeight: '700',
  },
  text: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  retryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: theme.radius.small, backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.lg },
  retryText: { color: '#FFFFFF', fontWeight: '800' },
  pressed: { opacity: 0.76 },
});
