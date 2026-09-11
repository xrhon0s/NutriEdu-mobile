import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { AuthScreen, FormField, FormMessage, PrimaryButton, TextLink } from '@/components/auth-form';
import { useAuth } from '@/context/auth-context';
import { theme } from '@/constants/nutriedu-theme';

export default function LoginScreen() {
  const { login, notice, clearNotice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contrasena');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      clearNotice();
      await login(email, password);
      router.replace('/(app)/profile');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No pudimos iniciar sesion');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen title="Iniciar sesion" subtitle="Consulta tu perfil, recetas y plan desde el movil.">
      {error ? <FormMessage type="error">{error}</FormMessage> : null}
      {!error && notice ? <FormMessage type="info">{notice}</FormMessage> : null}
      <FormField label="Correo electronico" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" placeholder="nombre@correo.com" />
      <FormField label="Contrasena" value={password} onChangeText={setPassword} autoComplete="current-password" secureTextEntry placeholder="Tu contrasena" onSubmitEditing={handleLogin} />
      <PrimaryButton label="Ingresar" loadingLabel="Ingresando..." loading={submitting} onPress={handleLogin} />
      <View style={{ gap: theme.spacing.md }}>
        <TextLink label="Olvide mi contrasena" onPress={() => router.push('/forgot-password')} />
        <TextLink label="Crear una cuenta" onPress={() => router.push('/register')} />
      </View>
    </AuthScreen>
  );
}
