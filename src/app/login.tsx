import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AuthScreen, FormField, FormMessage, PrimaryButton, TextLink } from '@/components/auth-form';
import { useAuth } from '@/context/auth-context';
import { theme } from '@/constants/nutriedu-theme';
import { ApiError } from '@/services/api';

export default function LoginScreen() {
  const { login, notice, clearNotice } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError(t('auth.errors.requiredCredentials'));
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      clearNotice();
      await login(email, password);
      router.replace('/(app)/profile');
    } catch (loginError) {
      setError(loginError instanceof ApiError && loginError.status === 401
        ? t('auth.errors.invalidCredentials')
        : t('auth.errors.loginFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen title={t('auth.login.title')} subtitle={t('auth.login.subtitle')}>
      {error ? <FormMessage type="error">{error}</FormMessage> : null}
      {!error && notice ? <FormMessage type="info">{t(`auth.notices.${notice}`)}</FormMessage> : null}
      <FormField label={t('auth.email')} value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" placeholder={t('auth.emailPlaceholder')} />
      <FormField label={t('auth.password')} value={password} onChangeText={setPassword} autoComplete="current-password" secureTextEntry placeholder={t('auth.login.passwordPlaceholder')} onSubmitEditing={handleLogin} />
      <PrimaryButton label={t('auth.login.submit')} loadingLabel={t('auth.login.submitting')} loading={submitting} onPress={handleLogin} />
      <View style={{ gap: theme.spacing.md }}>
        <TextLink label={t('auth.login.forgotPassword')} onPress={() => router.push('/forgot-password')} />
        <TextLink label={t('auth.login.createAccount')} onPress={() => router.push('/register')} />
      </View>
    </AuthScreen>
  );
}
