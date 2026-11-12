import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/constants';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function TrueFalse({ selected, onSelect, disabled = false }: { selected: string | null; onSelect: (answer: string) => void; disabled?: boolean }) {
  const scheme = useColorScheme();
  const palette = Colors[scheme === 'dark' ? 'dark' : 'light'];
  return (
    <View style={styles.row}>
      {(['true', 'false'] as const).map((answer) => (
        <Pressable key={answer} disabled={disabled} accessibilityRole="radio" accessibilityState={{ checked: selected === answer, disabled }} onPress={() => onSelect(answer)} style={[styles.option, { borderColor: selected === answer ? palette.primary : palette.border }, disabled && { opacity: 0.65 }]}>
          <Text style={{ color: palette.text }}>{answer === 'true' ? 'True' : 'False'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: Spacing.two }, option: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: Spacing.three } });
