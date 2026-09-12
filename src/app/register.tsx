import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthScreen, FormField, FormMessage, PasswordRequirements, PrimaryButton, TextLink } from '@/components/auth-form';
import { useAuth } from '@/context/auth-context';
import { ApiError, apiRequest } from '@/services/api';
import { isPasswordValid } from '@/services/password-policy';

export default function RegisterScreen() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmation) {
      setError(t('auth.errors.requiredFields'));
      return;
    }
    if (!isPasswordValid(password)) {
      setError(t('auth.errors.weakPassword'));
      return;
    }
    if (password !== confirmation) {
      setError(t('auth.errors.passwordMismatch'));
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const normalizedEmail = email.trim().toLowerCase();
      await apiRequest('/users/register', {
        method: 'POST',
        body: JSON.stringify({ nombre: name.trim(), email: normalizedEmail, password }),
      });
      await login(normalizedEmail, password);
      router.replace('/(app)/profile');
    } catch (registerError) {
      setError(registerError instanceof ApiError && registerError.code === 'WEAK_PASSWORD'
        ? t('auth.errors.weakPassword')
        : registerError instanceof ApiError && registerError.status === 400
          ? t('auth.errors.registrationRejected')
          : t('auth.errors.registrationFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen title={t('auth.register.title')} subtitle={t('auth.register.subtitle')}>
      {error ? <FormMessage type="error">{error}</FormMessage> : null}
      <FormField label={t('auth.name')} value={name} onChangeText={setName} autoComplete="name" autoCapitalize="words" placeholder={t('auth.namePlaceholder')} />
      <FormField label={t('auth.email')} value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" placeholder={t('auth.emailPlaceholder')} />
      <FormField label={t('auth.password')} value={password} onChangeText={setPassword} autoComplete="new-password" secureTextEntry placeholder={t('auth.register.passwordPlaceholder')} />
      <PasswordRequirements password={password} />
      <FormField label={t('auth.confirmPassword')} value={confirmation} onChangeText={setConfirmation} autoComplete="new-password" secureTextEntry placeholder={t('auth.register.confirmPlaceholder')} onSubmitEditing={handleRegister} />
      <PrimaryButton label={t('auth.register.submit')} loadingLabel={t('auth.register.submitting')} loading={submitting} onPress={handleRegister} />
      <TextLink label={t('auth.register.haveAccount')} onPress={() => router.replace('/login')} />
    </AuthScreen>
  );
}
