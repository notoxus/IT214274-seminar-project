import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/constants';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { QuizQuestion } from '@/types/lesson';

export function MultipleChoice({ question, selected, onSelect, disabled = false }: { question: Extract<QuizQuestion, { type: 'multiple-choice' }>; selected: string | null; onSelect: (answer: string) => void; disabled?: boolean }) {
  const scheme = useColorScheme();
  const palette = Colors[scheme === 'dark' ? 'dark' : 'light'];
  return <View style={styles.container}>{question.options.map((option) => <Pressable key={option} disabled={disabled} accessibilityRole="radio" accessibilityState={{ checked: selected === option, disabled }} onPress={() => onSelect(option)} style={[styles.option, { borderColor: selected === option ? palette.primary : palette.border }, disabled && { opacity: 0.65 }]}><Text style={{ color: palette.text }}>{option}</Text></Pressable>)}</View>;
}

const styles = StyleSheet.create({ container: { gap: Spacing.two }, option: { borderWidth: 1, borderRadius: 12, padding: Spacing.three } });
