import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/nutriedu-theme';

export function LoadingState({ label = 'Cargando...' }: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <View style={[styles.container, styles.errorContainer]}>
      <Text style={styles.errorTitle}>No pudimos cargar la informacion</Text>
      <Text style={styles.text}>{message}</Text>
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
    backgroundColor: theme.colors.dangerSurface,
  },
  errorTitle: {
    color: theme.colors.danger,
    fontSize: 17,
    fontWeight: '700',
  },
  text: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
