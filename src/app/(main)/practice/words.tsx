import { useCallback, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { Flashcard, FlashcardIconButton } from '@/components/learn/flashcard';
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

const SWIPE_THRESHOLD = 110;
const FLIP_DURATION = 140;

export default function LearnedWordsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const [allWords, setAllWords] = useState<LearnedWord[]>([]);
  const [favoriteWords, setFavoriteWords] = useState<LearnedWord[]>([]);
  const [favoriteMode, setFavoriteMode] = useState(false);
  const [sessionWords, setSessionWords] = useState<LearnedWord[]>([]);
  const [deck, setDeck] = useState<LearnedWord[]>([]);
  const [remembered, setRemembered] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBack, setShowBack] = useState(false);

  const [flipValue] = useState(() => new Animated.Value(0));
  const [position] = useState(() => new Animated.ValueXY());
  const [animating, setAnimating] = useState(false);

  const resetCard = useCallback(() => {
    flipValue.setValue(0);
    position.setValue({ x: 0, y: 0 });
    setAnimating(false);
    setShowBack(false);
  }, [flipValue, position]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void getProgress().then((progress) => {
      if (!active) return;
      const lessons = getLessons();
      const completed = lessons.filter((lesson) => progress.completedLessonIds.includes(lesson.id));
      const learnedWords = completed.flatMap((lesson) => lesson.vocabulary.map((word) => ({ lessonTitle: lesson.title, word })));
      const ids = progress.favoriteWordIds ?? [];
      // Favourites come from every lesson, so a hearted word is reviewable
      // even before its lesson is marked complete.
      const hearted = lessons
        .flatMap((lesson) => lesson.vocabulary.map((word) => ({ lessonTitle: lesson.title, word })))
        .filter((item) => ids.includes(item.word.id));
      setAllWords(learnedWords);
      setFavoriteWords(hearted);
      // With no completed lesson yet, start directly on the favourites deck so
      // hearted words are still reviewable.
      const startOnFavorites = learnedWords.length === 0 && hearted.length > 0;
      setFavoriteMode(startOnFavorites);
      setSessionWords(startOnFavorites ? hearted : learnedWords);
      setDeck(startOnFavorites ? hearted : learnedWords);
      setRemembered(0);
      setFinished(false);
      resetCard();
      setLoading(false);
    });
    return () => { active = false; };
  }, [resetCard]));

  const current = deck[0];

  // Right swipe removes the word from the queue; left swipe sends it to the
  // back so another card comes up and the word returns later. The session ends
  // only when every word has been remembered at least once.
  const advance = (wasRemembered: boolean) => {
    if (!current) return;
    if (wasRemembered) {
      const rest = deck.slice(1);
      setDeck(rest);
      setRemembered((value) => value + 1);
      if (rest.length === 0) setFinished(true);
    } else if (deck.length > 1) {
      setDeck([...deck.slice(1), current]);
    }
    resetCard();
  };

  const replay = () => {
    setDeck(sessionWords);
    setRemembered(0);
    setFinished(false);
    resetCard();
  };

  // The heart switches the deck between every learned word and the words
  // hearted on the Learn flashcard.
  const toggleFavoriteMode = () => {
    const nextMode = !favoriteMode;
    const source = nextMode ? favoriteWords : allWords;
    setFavoriteMode(nextMode);
    setSessionWords(source);
    setDeck(source);
    setRemembered(0);
    setFinished(false);
    resetCard();
  };

  // Turns the card edge-on, swaps the face at 90deg, then finishes the flip so
  // the back is never shown mirrored.
  const flipTo = (toBack: boolean) => {
    if (animating) return;
    setAnimating(true);
    Animated.timing(flipValue, { toValue: 0.5, duration: FLIP_DURATION, useNativeDriver: true })
      .start(() => {
        setShowBack(toBack);
        flipValue.setValue(-0.5);
        Animated.timing(flipValue, { toValue: 0, duration: FLIP_DURATION, useNativeDriver: true })
          .start(() => { setAnimating(false); });
      });
  };

  const springBack = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  // dir 1 = "remembered" (swipe right), dir -1 = "review again" (swipe left).
  const swipeAway = (dir: 1 | -1) => {
    if (animating) return;
    setAnimating(true);
    Animated.timing(position, {
      toValue: { x: dir * width * 1.4, y: 0 },
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setAnimating(false);
      advance(dir === 1);
    });
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      showBack && !animating && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => position.setValue({ x: gesture.dx, y: gesture.dy * 0.2 }),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) swipeAway(1);
      else if (gesture.dx < -SWIPE_THRESHOLD) swipeAway(-1);
      else springBack();
    },
    onPanResponderTerminate: springBack,
  });

  const rotate = position.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });
  const rotateY = flipValue.interpolate({
    inputRange: [-0.5, 0, 0.5],
    outputRange: ['-90deg', '0deg', '90deg'],
  });
  const knownOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const againOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Practice" hitSlop={10} onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={23} color={theme.text} />
        </Pressable>
        <ThemedText type="title" style={styles.title}>Word review</ThemedText>
      </View>

      {loading ? null : !favoriteMode && sessionWords.length === 0 ? (
        <AppCard>
          <ThemedText type="subtitle">No learned words yet</ThemedText>
          {favoriteWords.length > 0 ? (
            <>
              <ThemedText type="default" themeColor="muted">
                Complete a lesson in Learn, or review the {favoriteWords.length} word(s) you hearted.
              </ThemedText>
              <AppButton title="Review favorites" onPress={toggleFavoriteMode} />
            </>
          ) : (
            <ThemedText type="default" themeColor="muted">Complete a lesson in Learn to add its vocabulary cards here.</ThemedText>
          )}
        </AppCard>
      ) : favoriteMode && sessionWords.length === 0 ? (
        <AppCard>
          <ThemedText type="subtitle">No favorite words yet</ThemedText>
          <ThemedText type="default" themeColor="muted">Tap the heart on a Learn flashcard, then come back here to review your favorites.</ThemedText>
          <AppButton title="Review all words" onPress={toggleFavoriteMode} />
        </AppCard>
      ) : finished ? (
        <AppCard>
          <ThemedText type="subtitle">Review complete</ThemedText>
          <ThemedText type="default" themeColor="muted">
            {favoriteMode ? 'You remembered all favorite words' : `You remembered all ${sessionWords.length} word(s)`}.
          </ThemedText>
          <AppButton title="Replay" onPress={replay} />
          <AppButton title="Back to Practice" color="#334155" onPress={() => router.back()} />
        </AppCard>
      ) : current ? (
        <>
          <ThemedText type="small" themeColor="muted" style={styles.meta}>
            {favoriteMode ? 'Favorites · ' : ''}{remembered} / {sessionWords.length} remembered · {deck.length} left · {current.lessonTitle}
          </ThemedText>

          <View style={styles.deck}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={favoriteMode ? 'Review all learned words' : 'Review favorite words only'}
              hitSlop={8}
              onPress={toggleFavoriteMode}
              style={[styles.favoriteToggle, favoriteMode && styles.favoriteToggleActive]}
            >
              <Ionicons
                name={favoriteMode ? 'heart' : 'heart-outline'}
                size={20}
                color={favoriteMode ? '#EF4444' : '#0F172A'}
              />
            </Pressable>
            <Animated.View
              style={[
                styles.cardWrap,
                { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] },
              ]}
              {...panResponder.panHandlers}
            >
              <Animated.View style={{ transform: [{ perspective: 900 }, { rotateY }] }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showBack ? 'Flip back to the Vietnamese meaning' : 'Flip the card to reveal the English word'}
                  onPress={() => flipTo(!showBack)}
                >
                  {showBack ? (
                    <Flashcard word={current.word} label={current.lessonTitle}>
                      <View style={styles.backRow}>
                        <FlashcardIconButton
                          icon="volume-high"
                          accessibilityLabel={`Play pronunciation for ${current.word.word}`}
                          onPress={() => speakEnglishWord(current.word.word)}
                        />
                        <ThemedText type="small" themeColor="muted" style={styles.backHint}>
                          Swipe right if you remembered, left to review again
                        </ThemedText>
                      </View>
                    </Flashcard>
                  ) : (
                    <Flashcard
                      word={current.word}
                      face="meaning"
                      label={current.lessonTitle}
                      hint="Chạm để lật thẻ và xem từ tiếng Anh"
                    />
                  )}
                </Pressable>
              </Animated.View>

              <Animated.View pointerEvents="none" style={[styles.badge, styles.badgeKnown, { opacity: knownOpacity }]}>
                <Text style={styles.badgeKnownText}>NHỚ RA</Text>
              </Animated.View>
              <Animated.View pointerEvents="none" style={[styles.badge, styles.badgeAgain, { opacity: againOpacity }]}>
                <Text style={styles.badgeAgainText}>ÔN LẠI</Text>
              </Animated.View>
            </Animated.View>
          </View>

          {showBack ? (
            <View style={styles.actions}>
              <View style={styles.actionSlot}>
                <AppButton title="Chưa nhớ" color="#B45309" onPress={() => swipeAway(-1)} />
              </View>
              <View style={styles.actionSlot}>
                <AppButton title="Nhớ ra" onPress={() => swipeAway(1)} />
              </View>
            </View>
          ) : (
            <AppButton title="Lật thẻ" onPress={() => flipTo(true)} />
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
  meta: { marginTop: 10, marginBottom: 4 },
  deck: { marginTop: 10, marginBottom: 6, minHeight: 300, justifyContent: 'center' },
  favoriteToggle: {
    position: 'absolute',
    top: 0,
    right: 4,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.1)',
  },
  favoriteToggleActive: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  cardWrap: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  badgeKnown: { right: 16, borderColor: '#22C55E', transform: [{ rotate: '-10deg' }] },
  badgeAgain: { left: 16, borderColor: '#F87171', transform: [{ rotate: '10deg' }] },
  badgeKnownText: { color: '#4ADE80', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  badgeAgainText: { color: '#F87171', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  backHint: { flex: 1 },
  actions: { flexDirection: 'row', gap: 10 },
  actionSlot: { flex: 1 },
});
