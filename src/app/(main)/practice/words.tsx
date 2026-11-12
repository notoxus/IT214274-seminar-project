import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { getLessons } from '@/services/lesson-service';
import { getProgress } from '@/services/storage-service';
import { speakEnglishWord } from '@/services/speech-service';
import type { Vocabulary } from '@/types/lesson';

type LearnedWord = { lessonTitle: string; word: Vocabulary };

export default function LearnedWordsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [words, setWords] = useState<LearnedWord[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [retryWords, setRetryWords] = useState<LearnedWord[]>([]);
  const [secondPass, setSecondPass] = useState(false);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    void getProgress().then((progress) => {
      if (!active) return;
      const completed = getLessons().filter((lesson) => progress.completedLessonIds.includes(lesson.id));
      const learnedWords = completed.flatMap((lesson) => lesson.vocabulary.map((word) => ({ lessonTitle: lesson.title, word })));
      setWords(learnedWords);
      setTotalWords(learnedWords.length);
      setIndex(0);
      setRevealed(false);
      setRetryWords([]);
      setSecondPass(false);
      setFinished(false);
      setLoading(false);
    });
    return () => { active = false; };
  }, []));

  const current = words[index];

  const advance = (retry: boolean) => {
    const nextRetryWords = retry && !secondPass && current ? [...retryWords, current] : retryWords;
    if (retry && !secondPass && current) {
      setRetryWords(nextRetryWords);
    }
    setRevealed(false);
    if (index + 1 < words.length) {
      setIndex((value) => value + 1);
    } else if (!secondPass && nextRetryWords.length > 0) {
      setWords(nextRetryWords);
      setRetryWords([]);
      setSecondPass(true);
      setIndex(0);
    } else {
      setFinished(true);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Practice" hitSlop={10} onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={23} color={theme.text} />
        </Pressable>
        <ThemedText type="title" style={styles.title}>Word review</ThemedText>
      </View>

      {loading ? null : words.length === 0 ? (
        <AppCard>
          <ThemedText type="subtitle">No learned words yet</ThemedText>
          <ThemedText type="default" themeColor="muted">Complete a lesson in Learn to add its vocabulary cards here.</ThemedText>
        </AppCard>
      ) : finished ? (
        <AppCard>
          <ThemedText type="subtitle">Review complete</ThemedText>
          <ThemedText type="default" themeColor="muted">You reviewed {totalWords} learned word(s).</ThemedText>
          <AppButton title="Back to Practice" onPress={() => router.back()} />
        </AppCard>
      ) : current ? (
        <>
          <ThemedText type="small" themeColor="muted">
            {secondPass ? 'Review once more' : `${index + 1} / ${words.length}`} · {current.lessonTitle}
          </ThemedText>
          <AppCard>
            <View style={styles.wordRow}>
              <View style={styles.wordCopy}>
                <ThemedText type="title" style={styles.word}>{current.word.word}</ThemedText>
                <ThemedText type="default" style={styles.pronunciation}>{current.word.pronunciation}</ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Play pronunciation for ${current.word.word}`}
                onPress={() => speakEnglishWord(current.word.word)}
                style={styles.speakerButton}
              >
                <Ionicons name="volume-high" size={21} color={theme.text} />
              </Pressable>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            {revealed ? (
              <>
                <ThemedText type="smallBold" themeColor="muted">NGHĨA TIẾNG VIỆT</ThemedText>
                <ThemedText type="subtitle">{current.word.meaning}</ThemedText>
              </>
            ) : (
              <AppButton title="Show meaning" onPress={() => setRevealed(true)} />
            )}
          </AppCard>
          {revealed && (
            <View style={styles.actions}>
              <AppButton title={secondPass ? 'Next word' : 'I knew this word'} onPress={() => advance(false)} />
              {!secondPass && <AppButton title="Review again" color="#A16207" onPress={() => advance(true)} />}
            </View>
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 15 },
  word: { fontSize: 42, marginTop: 8 },
  wordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordCopy: { flex: 1, gap: 2 },
  speakerButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  pronunciation: { color: '#2DD4BF', fontSize: 20 },
  divider: { height: 1, width: '100%', marginVertical: 12 },
  actions: { gap: 10 },
});
