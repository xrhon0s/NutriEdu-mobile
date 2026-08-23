import { useState } from 'react';
import { router } from 'expo-router';
import { AuthScreen, FormField, FormMessage, PrimaryButton, TextLink } from '@/components/auth-form';
import { apiRequest } from '@/services/api';

type ForgotResponse = { message: string };

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRequest = async () => {
    if (!email.trim()) {
      setError('Ingresa tu correo electronico');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const response = await apiRequest<ForgotResponse>('/users/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setSuccess(response.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pudimos enviar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen title="Recuperar acceso" subtitle="Te enviaremos instrucciones si el correo esta registrado.">
      {error ? <FormMessage type="error">{error}</FormMessage> : null}
      {success ? <FormMessage type="success">{success}</FormMessage> : null}
      <FormField label="Correo electronico" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" placeholder="nombre@correo.com" onSubmitEditing={handleRequest} />
      <PrimaryButton label="Enviar instrucciones" loadingLabel="Enviando..." loading={submitting} onPress={handleRequest} />
      <TextLink label="Volver a iniciar sesion" onPress={() => router.replace('/login')} />
    </AuthScreen>
  );
}
