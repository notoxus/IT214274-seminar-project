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
import { getProgress, recordWordReviewSession } from '@/services/storage-service';
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
  const [rememberedIds, setRememberedIds] = useState<string[]>([]);
  const [favoriteMode, setFavoriteMode] = useState(false);
  const [sessionWords, setSessionWords] = useState<LearnedWord[]>([]);
  const [deck, setDeck] = useState<LearnedWord[]>([]);
  const [remembered, setRemembered] = useState(0);
  // Menu → session → menu. `justCompleted` only changes the menu wording.
  const [sessionActive, setSessionActive] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBack, setShowBack] = useState(false);  // Words that were sent back with "Chưa nhớ" during the current session.
  const [missedIds, setMissedIds] = useState<string[]>([]);
  // Cards swiped right without being missed in this session: their favourites
  // count drops straight away, matching what will be persisted on completion.
  const [sessionCleanIds, setSessionCleanIds] = useState<string[]>([]);

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
      setRememberedIds(progress.wordReviewRememberedIds ?? []);
      // First run: jump straight into the full deck so the feature shows what
      // it does before asking the learner to choose a deck.
      const firstRun = (progress.wordReviewSessions ?? 0) === 0 && learnedWords.length > 0;
      setFavoriteMode(false);
      setSessionWords(firstRun ? learnedWords : []);
      setDeck(firstRun ? learnedWords : []);
      setRemembered(0);
      setSessionActive(firstRun);
      setJustCompleted(false);
      setMissedIds([]);
      setSessionCleanIds([]);
      resetCard();
      setLoading(false);
    });
    return () => { active = false; };
  }, [resetCard]));

  const current = deck[0];
  const notRememberedWords = allWords.filter((item) => !rememberedIds.includes(item.word.id));
  const rememberedCount = allWords.length - notRememberedWords.length;
  const unrememberedFavorites = favoriteWords.filter((item) => !rememberedIds.includes(item.word.id));
  const favoriteRemainingCount = unrememberedFavorites.filter((item) => !sessionCleanIds.includes(item.word.id)).length;

  // A right swipe removes the word from the queue; a left swipe sends it to the
  // back so another card comes up and the word returns later. The session ends
  // only when every card has been swiped right at least once.
  const advance = (wasRemembered: boolean) => {
    if (!current) return;
    if (wasRemembered) {
      const rest = deck.slice(1);
      setDeck(rest);
      setRemembered((value) => value + 1);
      if (!missedIds.includes(current.word.id)) {
        setSessionCleanIds((prev) => (prev.includes(current.word.id) ? prev : [...prev, current.word.id]));
      }
      if (rest.length === 0) void completeSession();
    } else {
      setMissedIds((prev) => (prev.includes(current.word.id) ? prev : [...prev, current.word.id]));
      if (deck.length > 1) setDeck([...deck.slice(1), current]);
    }
    resetCard();
  };

  // Finishing a session persists mastery: a word that was never sent back is
  // "remembered", so it drops out of Play not remembered next time. A word that
  // was missed stays (or goes back) in the not-remembered deck.
  const completeSession = async () => {
    const sessionIds = sessionWords.map((item) => item.word.id);
    try {
      const next = await recordWordReviewSession(sessionIds, missedIds);
      setRememberedIds(next);
    } catch {
      // The session still ends; the state will be retried next time.
    }
    setSessionActive(false);
    setJustCompleted(true);
    setFavoriteMode(false);
    setDeck([]);
    setRemembered(0);
    setMissedIds([]);
    setSessionCleanIds([]);
    resetCard();
  };

  const startSession = (source: LearnedWord[], favorites: boolean) => {
    setMissedIds([]);
    setSessionCleanIds([]);
    setFavoriteMode(favorites);
    setSessionWords(source);
    setDeck(source);
    setRemembered(0);
    setSessionActive(true);
    setJustCompleted(false);
    resetCard();
  };

  const startAll = () => startSession(allWords, false);
  const startNotRemembered = () => startSession(notRememberedWords, false);
  const startFavorites = () => startSession(unrememberedFavorites, true);
  const replayAllFavorites = () => startSession(favoriteWords, true);

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
        <ThemedText type="title" style={styles.title} numberOfLines={1}>Word review</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            favoriteMode
              ? 'Show all learned words'
              : `Review ${favoriteRemainingCount} favorite word${favoriteRemainingCount === 1 ? '' : 's'} left`
          }
          onPress={favoriteMode ? startAll : startFavorites}
          hitSlop={8}
          style={({ pressed }) => [
            styles.favoritePill,
            {
              backgroundColor: favoriteMode ? theme.dangerSoft : theme.subtle,
              borderColor: favoriteMode ? theme.danger : theme.border,
            },
            pressed && styles.favoritePillPressed,
          ]}
        >
          <Ionicons
            name={favoriteMode ? 'heart' : 'heart-outline'}
            size={17}
            color={favoriteMode ? theme.danger : theme.muted}
          />
          <Text style={[styles.favoritePillText, { color: favoriteMode ? theme.danger : theme.text }]}>
            {favoriteRemainingCount}
          </Text>
        </Pressable>
      </View>

      {loading ? null : favoriteMode && sessionWords.length === 0 ? (
        <AppCard>
          <ThemedText type="subtitle">
            {favoriteWords.length === 0 ? 'No favorite words yet' : 'All favorite words remembered'}
          </ThemedText>
          <ThemedText type="default" themeColor="muted">
            {favoriteWords.length === 0
              ? 'Tap the heart on a Learn flashcard, then come back here to review your favorites.'
              : `You remembered all ${favoriteWords.length} favorite word(s). You can play the whole set again any time.`}
          </ThemedText>
          {favoriteWords.length > 0 ? (
            <AppButton title="Play all favorites" onPress={replayAllFavorites} />
          ) : allWords.length > 0 ? (
            <AppButton title="Review all words" onPress={startAll} />
          ) : null}
        </AppCard>
      ) : allWords.length === 0 && !sessionActive ? (
        <AppCard>
          <ThemedText type="subtitle">No learned words yet</ThemedText>
          {favoriteWords.length > 0 ? (
            <>
              <ThemedText type="default" themeColor="muted">
                Complete a lesson in Learn, or review the {favoriteWords.length} word(s) you hearted.
              </ThemedText>
              <AppButton title="Review favorites" onPress={startFavorites} />
            </>
          ) : (
            <ThemedText type="default" themeColor="muted">Complete a lesson in Learn to add its vocabulary cards here.</ThemedText>
          )}
        </AppCard>
      ) : !sessionActive ? (
        <AppCard>
          <ThemedText type="subtitle">{justCompleted ? 'Review complete' : 'Ready to review'}</ThemedText>
          <ThemedText type="default" themeColor="muted">
            {justCompleted
              ? `You finished a session of ${sessionWords.length} word(s).`
              : `${rememberedCount} / ${allWords.length} word(s) marked as remembered.`}
          </ThemedText>
          <AppButton title={`Play again · ${allWords.length} word(s)`} onPress={startAll} />
          <AppButton
            title={`Play not remembered · ${notRememberedWords.length} word(s)`}
            color="#B45309"
            disabled={notRememberedWords.length === 0}
            onPress={startNotRemembered}
          />
          {notRememberedWords.length === 0 && (
            <ThemedText type="small" themeColor="muted">
              Every learned word is marked as remembered. Learn a lesson or heart a word to add more cards.
            </ThemedText>
          )}
        </AppCard>
      ) : current ? (
        <>
          <ThemedText type="small" themeColor="muted" style={styles.meta}>
            {favoriteMode ? 'Favorites · ' : ''}{remembered} / {sessionWords.length} remembered · {deck.length} left · {current.lessonTitle}
          </ThemedText>

          <View style={styles.deck}>
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
                <Text style={styles.badgeKnownText}>ĐÃ NHỚ</Text>
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
                <AppButton title="Đã nhớ" onPress={() => swipeAway(1)} />
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
  backButton: { width: 42, height: 42, marginTop: 15, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 15, flexShrink: 1, fontSize: 26, lineHeight: 32, fontWeight: '700' },
  favoritePill: {
    marginLeft: 'auto',
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
  },
  favoritePillPressed: { opacity: 0.7 },
  favoritePillText: { fontSize: 14, fontWeight: '700' },
  meta: { marginTop: 10, marginBottom: 4 },
  deck: { marginTop: 10, marginBottom: 6, minHeight: 300, justifyContent: 'center' },
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
