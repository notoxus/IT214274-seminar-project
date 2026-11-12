import { AppCard } from '@/components/ui/app-card';
import { ThemedText } from '@/components/ui/themed-text';
import type { Vocabulary } from '@/types/lesson';

export function VocabularyCard({ word }: { word: Vocabulary }) {
  return (
    <AppCard>
      <ThemedText type="smallBold">{word.word} · {word.pronunciation}</ThemedText>
      <ThemedText type="small" themeColor="muted">{word.meaning}</ThemedText>
    </AppCard>
  );
}
