import { AuthForm } from '@/components/auth/auth-form';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { APP_NAME } from '@/constants/constants';

export default function LoginScreen() {
  return (
    <Screen>
      <ThemedText type="title" style={{ marginTop: 15 }}>Welcome back</ThemedText>
      <ThemedText type="small" themeColor="muted">Sign in to continue learning with {APP_NAME}.</ThemedText>
      <AuthForm mode="login" />
    </Screen>
  );
}
