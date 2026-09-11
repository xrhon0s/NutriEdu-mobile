import { Redirect } from 'expo-router';
import { LoadingState } from '@/components/screen-state';
import { useAuth } from '@/context/auth-context';

export default function IndexScreen() {
  const { token, isLoading } = useAuth();
  if (isLoading) return <LoadingState label="Preparando NutriEdu..." />;
  return <Redirect href={token ? '/(app)/home' : '/login'} />;
}
