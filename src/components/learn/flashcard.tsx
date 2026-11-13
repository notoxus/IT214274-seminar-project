import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '@/components/ui/app-button';
import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Vocabulary } from '@/types/lesson';

// The Memrise-style study card shell. Learn shows the "word" face; Practice
// reuses the same frame with a "meaning" face so recall starts from Vietnamese.
export function Flashcard({
  word,
  label,
  face = 'word',
  hint,
  revealed = true,
  onReveal,
  children,
}: {
  word: Vocabulary;
  label?: string;
  face?: 'word' | 'meaning';
  hint?: string;
  revealed?: boolean;
  onReveal?: () => void;
  children?: ReactNode;
}) {
  const theme = useTheme();

  if (face === 'meaning') {
    return (
      <View style={[styles.stage, styles.meaningStage, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {label ? (
          <ThemedText themeColor="muted" style={styles.label}>
            {label}
          </ThemedText>
        ) : null}
        <ThemedText themeColor="muted" style={[styles.label, styles.meaningLabel]}>
          NGHĨA TIẾNG VIỆT
        </ThemedText>
        <ThemedText themeColor="text" style={styles.meaning}>
          {word.meaning}
        </ThemedText>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.stage, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {label ? (
        <ThemedText themeColor="muted" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
      <ThemedText themeColor="text" style={styles.word}>
        {word.word}
      </ThemedText>
      <Text style={styles.pronunciation}>{word.pronunciation}</Text>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <ThemedText themeColor="muted" style={styles.label}>
        NGHĨA TIẾNG VIỆT
      </ThemedText>
      {revealed ? (
        <ThemedText themeColor="text" style={styles.meaning}>
          {word.meaning}
        </ThemedText>
      ) : (
        <AppButton title="Show meaning" onPress={() => onReveal?.()} />
      )}

      {children}
    </View>
  );
}

// Round white icon button used for speaker / favourite actions on the card.
export function FlashcardIconButton({
  icon,
  color = '#0F172A',
  onPress,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <TouchableOpacity
      style={styles.circleBtn}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
    >
      <Ionicons name={icon} size={18} color={color} />
    </TouchableOpacity>
  );
}

// "I knew this word" (white) + optional primary action (yellow) buttons.
export function FlashcardButtons({
  knownLabel,
  knownIcon = 'checkmark-circle-outline',
  onKnown,
  nextLabel,
  onNext,
}: {
  knownLabel: string;
  knownIcon?: keyof typeof Ionicons.glyphMap;
  onKnown: () => void;
  nextLabel?: string;
  onNext?: () => void;
}) {
  return (
    <View style={styles.buttons}>
      <TouchableOpacity style={styles.knownBtn} onPress={onKnown}>
        <Ionicons name={knownIcon} size={20} color="#0F172A" />
        <Text style={styles.knownBtnText}>{knownLabel}</Text>
      </TouchableOpacity>
      {nextLabel && onNext ? (
        <TouchableOpacity style={styles.nextBtn} onPress={onNext}>
          <Text style={styles.nextBtnText}>{nextLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  meaningStage: {
    justifyContent: 'center',
    minHeight: 240,
  },
  meaningLabel: {
    marginTop: 18,
  },
  hint: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  word: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    marginTop: 4,
  },
  pronunciation: {
    fontSize: 15,
    color: '#5EEAD4',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  meaning: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    marginTop: 4,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttons: {
    marginTop: 16,
    gap: 10,
  },
  knownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  knownBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  nextBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FACC15',
    paddingVertical: 13,
    borderRadius: 10,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
});
