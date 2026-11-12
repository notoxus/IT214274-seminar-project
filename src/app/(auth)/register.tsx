import { AuthForm } from '@/components/auth/auth-form';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';

export default function RegisterScreen() {
  return (
    <Screen>
      <ThemedText type="title" style={{ marginTop: 15 }}>Create account</ThemedText>
      <ThemedText type="small" themeColor="muted">Start building a daily English learning habit.</ThemedText>
      <AuthForm mode="register" />
    </Screen>
  );
}
