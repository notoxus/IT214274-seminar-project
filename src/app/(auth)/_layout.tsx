import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';

export default function AuthLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Redirect href="/(main)/learn" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
