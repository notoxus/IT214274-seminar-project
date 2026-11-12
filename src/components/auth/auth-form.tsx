import { useState } from 'react';
import { Link } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Colors, Spacing } from '@/constants/constants';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { signIn, register } = useAuth();
  const scheme = useColorScheme();
  const palette = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await signIn({ email, password });
      else await register({ email, password }, name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not complete your request.');
    } finally {
      setBusy(false);
    }
  }

  return <View style={styles.form}>
    {mode === 'register' && <TextInput accessibilityLabel="Name" autoCapitalize="words" placeholder="Your name" placeholderTextColor={palette.muted} value={name} onChangeText={setName} style={[styles.input, { color: palette.text, borderColor: palette.border }]} />}
    <TextInput accessibilityLabel="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email address" placeholderTextColor={palette.muted} value={email} onChangeText={setEmail} style={[styles.input, { color: palette.text, borderColor: palette.border }]} />
    <TextInput accessibilityLabel="Password" autoCapitalize="none" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} secureTextEntry placeholder="Password" placeholderTextColor={palette.muted} value={password} onChangeText={setPassword} style={[styles.input, { color: palette.text, borderColor: palette.border }]} />
    {!!error && <Text accessibilityRole="alert" style={{ color: '#C43F45' }}>{error}</Text>}
    {busy ? (
      <View accessibilityLiveRegion="polite" style={styles.busy}>
        <ActivityIndicator color={palette.primary} />
        <Text style={[styles.busyText, { color: palette.muted }]}>
          {mode === 'login' ? 'Logging in…' : 'Creating account…'}
        </Text>
      </View>
    ) : (
      <>
        <AppButton title={mode === 'login' ? 'Sign in' : 'Create account'} onPress={submit} />
        <Link href={mode === 'login' ? '/(auth)/register' : '/(auth)/login'} style={{ color: palette.primary, textAlign: 'center' }}>
          {mode === 'login' ? 'Create an account' : 'I already have an account'}
        </Link>
      </>
    )}
  </View>;
}

const styles = StyleSheet.create({ form: { gap: Spacing.three }, busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, minHeight: 48 }, busyText: { fontSize: 16 }, input: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: Spacing.four, fontSize: 16 } });
