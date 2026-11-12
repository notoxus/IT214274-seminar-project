import { Redirect } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';

export default function IndexRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Redirect href={user ? '/(main)/learn' : '/(auth)/login'} />;
}
