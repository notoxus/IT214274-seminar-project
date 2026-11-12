import { Redirect } from 'expo-router';

import AppTabs from '@/components/ui/app-tabs';
import { useAuth } from '@/hooks/use-auth';

export default function MainLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  return <AppTabs />;
}

