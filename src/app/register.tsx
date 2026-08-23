import { useState } from 'react';
import { router } from 'expo-router';
import { AuthScreen, FormField, FormMessage, PrimaryButton, TextLink } from '@/components/auth-form';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';

export default function RegisterScreen() {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmation) {
      setError('Completa todos los campos');
      return;
    }
    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmation) {
      setError('Las contrasenas no coinciden');
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
      setError(registerError instanceof Error ? registerError.message : 'No pudimos crear la cuenta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen title="Crear cuenta" subtitle="Configura tu acceso para comenzar tu perfil personalizado.">
      {error ? <FormMessage type="error">{error}</FormMessage> : null}
      <FormField label="Nombre" value={name} onChangeText={setName} autoComplete="name" autoCapitalize="words" placeholder="Tu nombre" />
      <FormField label="Correo electronico" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" placeholder="nombre@correo.com" />
      <FormField label="Contrasena" value={password} onChangeText={setPassword} autoComplete="new-password" secureTextEntry placeholder="Minimo 6 caracteres" />
      <FormField label="Confirmar contrasena" value={confirmation} onChangeText={setConfirmation} autoComplete="new-password" secureTextEntry placeholder="Repite tu contrasena" onSubmitEditing={handleRegister} />
      <PrimaryButton label="Crear cuenta" loadingLabel="Creando cuenta..." loading={submitting} onPress={handleRegister} />
      <TextLink label="Ya tengo una cuenta" onPress={() => router.replace('/login')} />
    </AuthScreen>
  );
}
