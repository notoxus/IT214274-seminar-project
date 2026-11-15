import { Pressable, StyleSheet, Text } from 'react-native';

import { Spacing } from '@/constants/constants';
import { useTheme } from '@/hooks/use-theme';

export function AppButton({ 
  title, 
  onPress, 
  disabled, 
  color 
}: { 
  title: string; 
  onPress: () => void; 
  disabled?: boolean;
  color?: string;
}) {
  const theme = useTheme();
  // A caller-supplied background is assumed to be dark, so keep white ink for
  // it; the theme primary flips to a light blue in dark mode and needs dark ink.
  const textColor = color ? '#FFFFFF' : theme.onPrimary;

  return (
    <Pressable 
      accessibilityRole="button" 
      disabled={disabled} 
      onPress={onPress} 
      style={({ pressed }) => [
        styles.button, 
        // Priority input color
        { backgroundColor: color ? color : theme.primary }, 
        pressed && styles.pressed, 
        disabled && styles.disabled
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({ button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingHorizontal: Spacing.four }, text: { fontWeight: '700', fontSize: 16 }, pressed: { opacity: 0.82 }, disabled: { opacity: 0.5 } });
