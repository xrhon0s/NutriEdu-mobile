import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthScreen, FormField, FormMessage, PrimaryButton, TextLink } from '@/components/auth-form';
import { apiRequest } from '@/services/api';
import { rateLimitMessage } from '@/services/api-error';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRequest = async () => {
    if (!email.trim()) {
      setError(t('auth.errors.emailRequired'));
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await apiRequest('/users/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setSuccess(t('auth.forgot.success'));
    } catch (requestError) {
      setError(rateLimitMessage(requestError, t) || t('auth.errors.resetRequestFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')}>
      {error ? <FormMessage type="error">{error}</FormMessage> : null}
      {success ? <FormMessage type="success">{success}</FormMessage> : null}
      <FormField label={t('auth.email')} value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" placeholder={t('auth.emailPlaceholder')} onSubmitEditing={handleRequest} />
      <PrimaryButton label={t('auth.forgot.submit')} loadingLabel={t('auth.forgot.submitting')} loading={submitting} onPress={handleRequest} />
      <TextLink label={t('auth.forgot.backToLogin')} onPress={() => router.replace('/login')} />
    </AuthScreen>
  );
}
