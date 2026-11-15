import { useState } from 'react';
import { router } from 'expo-router';
import { TextInput } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { authErrorMessage } from '@/services/auth-error';

export default function EditProfileScreen() {
  const { user, updateDisplayName } = useAuth();
  const theme = useTheme();
  const [name, setName] = useState(user?.displayName ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setError('');
    setBusy(true);
    try {
      await updateDisplayName(name);
      router.back();
    } catch (reason) {
      setError(authErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ThemedText type="title">Edit profile</ThemedText>
      <TextInput
        accessibilityLabel="Display name"
        value={name}
        onChangeText={setName}
        placeholder="Display name"
        placeholderTextColor={theme.muted}
        style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, color: theme.text }}
      />
      {!!error && (
        <ThemedText accessibilityRole="alert" themeColor="danger" type="small">
          {error}
        </ThemedText>
      )}
      <AppButton title={busy ? 'Saving…' : 'Save changes'} disabled={busy} onPress={() => void save()} />
    </Screen>
  );
}
