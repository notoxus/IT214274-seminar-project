import { useCallback, useRef, useState, useMemo } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FillBlank } from '@/components/practice/fill-blank';
import { MultipleChoice } from '@/components/practice/multiple-choice';
import { TrueFalse } from '@/components/practice/true-false';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { Screen } from '@/components/ui/screen';
import { StarRating } from '@/components/ui/star-rating';
import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { getLessons } from '@/services/lesson-service';
import { activatePracticeReview, getProgress, recordPracticeAnswer } from '@/services/storage-service';
import type { QuizQuestion } from '@/types/quiz';
import type { LearningProgress, PracticeReviewProgress } from '@/types/statistic';

type QuestionMode = 'first-pass' | 'retry' | 'filler';
// Suffle question
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};
export default function PracticeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const lessons = getLessons();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [review, setReview] = useState<PracticeReviewProgress | null>(null);
  const [shownQuestionId, setShownQuestionId] = useState<string | null>(null);
  const [shownMode, setShownMode] = useState<QuestionMode | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [saveError, setSaveError] = useState(false);
  const submitting = useRef(false);
  const [wordPulse] = useState(() => new Animated.Value(0));
  const [shuffledQuestionIds, setShuffledQuestionIds] = useState<string[]>([]);

  useFocusEffect(useCallback(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(wordPulse, { toValue: 1, duration: 850, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(wordPulse, { toValue: 0, duration: 850, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      Animated.delay(1300),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [wordPulse]));

  const loadHome = useCallback(async () => {
    setLoading(true);
    const stored = await getProgress();
    setProgress(stored);
    setLessonId(null);
    setReview(null);
    setShownQuestionId(null);
    setShuffledQuestionIds([]);
    setShownMode(null);
    setAnswer(null);
    setChecked(null);
    setSaveError(false);
    submitting.current = false;
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { void loadHome(); }, [loadHome]));

  const beginLesson = async (id: string) => {
    const activeReview = await activatePracticeReview(id);
    if (!activeReview) return;
    // suffle when new lesson begun
    const targetLesson = lessons.find((item) => item.id === id);
    if (targetLesson) {
      setShuffledQuestionIds(shuffleArray(targetLesson.questions.map(q => q.id)));
    }
    setLessonId(id);
    setReview(activeReview);
    setShownQuestionId(null);
    setShownMode(null);
    setAnswer(null);
    setChecked(null);
    submitting.current = false;
  };

  const lesson = lessons.find((item) => item.id === lessonId);
  const allQuestions: QuizQuestion[] = lesson
    ? [...lesson.questions, ...(lesson.supplementalQuestions ?? [])]
    : [];

  const queued = useMemo((): { question: QuizQuestion; mode: QuestionMode; isExtra: boolean } | null => {
    if (!lesson || !review || !review.active) return null;
    // Add filler to reuse
    const pickFiller = (current: PracticeReviewProgress) => {
      const pending = new Set(current.retryQuestionIds);
      const served = new Set(current.extraServedIds);
      // Except recent question
      const extras = (lesson?.supplementalQuestions ?? []).filter(
        (item) => !pending.has(item.id) && !served.has(item.id) && item.id !== shownQuestionId
      );
      // Random
      if (extras.length > 0) {
        const randomExtra = extras[Math.floor(Math.random() * extras.length)];
        return { question: randomExtra!, isExtra: true };
      }
      // Known filter
      const known = (lesson?.questions ?? []).filter(
        (item) =>
          !pending.has(item.id) &&
          (current.firstPassCorrectIds.includes(item.id) || current.retryCompletedIds.includes(item.id)) &&
          item.id !== shownQuestionId
      );
      const pool = known.length > 0 ? known : (lesson?.questions ?? []).filter(
        (item) => !pending.has(item.id) && item.id !== shownQuestionId
      );
      if (pool.length === 0) return null;
      const filler = pool[Math.floor(Math.random() * pool.length)];
      return filler ? { question: filler, isExtra: false } : null;
    };

    // Priority 1: Filler
    if (review.pendingFillers > 0 && review.fillerDelay <= 0) {
      const filler = pickFiller(review);
      if (filler) return { question: filler.question, mode: 'filler', isExtra: filler.isExtra };
    }

    // Priority 2: Retry with your mistake
    const nextRetryId = review.retryBatchQuestionIds.find(id => id !== shownQuestionId);
    if (nextRetryId) {
      const nextRetry = allQuestions.find((item) => item.id === nextRetryId);
      if (nextRetry) return { question: nextRetry, mode: 'retry', isExtra: false };
    }

    // Priority 3: Next question
    const nextFirstPassId = shuffledQuestionIds.find((id) => !review.firstPassQuestionIds.includes(id));
    if (nextFirstPassId) {
      const nextFirstPass = lesson.questions.find(item => item.id === nextFirstPassId);
      if (nextFirstPass) return { question: nextFirstPass, mode: 'first-pass', isExtra: false };
    }

    // If lessons weren't completed, filler -> mistake (force)
    if (review.retryQuestionIds.length > 0 || review.pendingFillers > 0) {
      const filler = pickFiller(review);
      if (filler) return { question: filler.question, mode: 'filler', isExtra: filler.isExtra };

      const forcedId = review.retryQuestionIds.find(id => id !== shownQuestionId) || review.retryQuestionIds[0];
      const forced = forcedId ? allQuestions.find((item) => item.id === forcedId) : undefined;
      if (forced) return { question: forced, mode: 'retry', isExtra: false };
    }

    return null;
  }, [lesson, review, allQuestions, shownQuestionId, shuffledQuestionIds]);


  const question = (shownQuestionId && allQuestions.find((item) => item.id === shownQuestionId)) || queued?.question || null;
  const questionMode: QuestionMode | null = shownMode ?? queued?.mode ?? null;

  // Progress bar that reference from Duolingo-style
  const progressPercent = useMemo(() => {
    if (!lesson || !review) return 0;
    if (review.completed) return 100;
    const remainingNew = Math.max(0, lesson.questions.length - review.firstPassQuestionIds.length);
    const answers = review.sessionAnswers ?? 0;
    const total = answers + remainingNew + review.retryQuestionIds.length;
    if (total <= 0) return 0;
    return Math.min(99, Math.round((answers / total) * 100));
  }, [lesson, review]);

  const unlockedIds = progress?.completedLessonIds ?? [];

  const checkAnswer = async () => {
    if (!lesson || !question || answer === null || checked !== null || submitting.current) return;
    submitting.current = true;
    const correct = answer.trim().toLowerCase() === question.answer.trim().toLowerCase();
    const wrongDetails = correct ? undefined : {
      lessonId: lesson.id,
      questionId: question.id,
      prompt: question.prompt,
      options: question.type === 'multiple-choice' ? question.options : question.type === 'true-false' ? ['true', 'false'] : [],
      correctAnswer: question.answer,
      selectedAnswer: answer,
    };
    try {
      const updated = await recordPracticeAnswer(lesson.id, question.id, correct, lesson.questions.length, questionMode ?? 'first-pass', wrongDetails, queued?.isExtra ?? false);
      if (!updated) {
        submitting.current = false;
        return;
      }
      setReview(updated);
      setShownQuestionId(question.id);
      setShownMode(questionMode);
      setChecked(correct);
      setSaveError(false);
    } catch {
      submitting.current = false;
      setSaveError(true);
    }
  };

  const advance = () => {
    setAnswer(null);
    setChecked(null);
    setShownQuestionId(null);
    setShownMode(null);
    submitting.current = false;
    setSaveError(false);
  };

  if (loading) {
    return <Screen><ActivityIndicator /></Screen>;
  }

  if (lessonId && review && lesson) {
    const finished = review.completed && !review.active;
    return (
      <Screen>
        <ThemedText type="title" style={styles.title}>Practice · {lesson.title}</ThemedText>
        {finished || !question ? (
          <AppCard>
            <ThemedText type="subtitle">Level complete</ThemedText>
            <StarRating stars={review.lastStars ?? review.bestStars ?? 1} />
            <AppButton title="Back to levels" onPress={() => void loadHome()} />
          </AppCard>
        ) : (
          <AppCard>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <ThemedText type="default">{question.prompt}</ThemedText>
            {question.type === 'multiple-choice' ? (
              <MultipleChoice question={question} selected={answer} onSelect={setAnswer} disabled={checked !== null} />
            ) : question.type === 'fill-blank' ? (
              <FillBlank value={answer ?? ''} onChangeText={setAnswer} editable={checked === null} />
            ) : (
              <TrueFalse selected={answer} onSelect={setAnswer} disabled={checked !== null} />
            )}
            {checked !== null && (
              <Text accessibilityRole="alert" style={{ color: checked ? theme.success : '#C43F45', fontWeight: '600' }}>
                {checked
                  ? 'Correct!'
                  : `Not quite. ${question.explanation ?? 'Review the correct answer and try to remember it next time.'} Correct answer: ${question.answer}`}
              </Text>
            )}
            {saveError && <ThemedText type="small" themeColor="muted">Couldn’t save this answer. Please try again.</ThemedText>}
            {checked === null
              ? <AppButton title="Check answer" disabled={!answer?.trim()} onPress={() => void checkAnswer()} />
              : <AppButton title="Continue" onPress={advance} />}
          </AppCard>
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.titleRow}>
        <ThemedText type="title" style={styles.title}>Practice</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Review learned words"
          hitSlop={10}
          onPress={() => router.push('/(main)/practice/words')}
          style={({ pressed }) => [styles.wordReviewButton, pressed && styles.wordReviewButtonPressed]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.wordReviewPulse,
              {
                opacity: wordPulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] }),
                transform: [{ scale: wordPulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.35] }) }],
              },
            ]}
          />
          <Ionicons name="albums-outline" size={23} color="#B77908" />
          <Ionicons name="sparkles" size={11} color="#F59E0B" style={styles.wordReviewSparkle} />
        </Pressable>
      </View>
      <ThemedText type="default" themeColor="muted">Choose a word review or continue through your practice levels.</ThemedText>

      {lessons.map((item, index) => {
        const unlocked = unlockedIds.includes(item.id);
        const stars = progress?.practiceReviews?.[item.id]?.bestStars ?? 0;
        return (
          <AppCard key={item.id}>
            <ThemedText type="small" themeColor="muted">Level {index + 1} · {item.level}</ThemedText>
            <ThemedText type="subtitle">{item.title}</ThemedText>
            <ThemedText type="default" themeColor="muted">{item.description}</ThemedText>
            <StarRating stars={stars} />
            <AppButton
              title={unlocked ? stars ? 'Play level again' : 'Start level' : 'Complete lesson to unlock'}
              disabled={!unlocked}
              onPress={() => void beginLesson(item.id)}
            />
          </AppCard>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordReviewButton: { width: 46, height: 46, marginTop: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF3C7' },
  wordReviewButtonPressed: { opacity: 0.75, transform: [{ scale: 0.94 }] },
  wordReviewPulse: { position: 'absolute', width: 46, height: 46, borderRadius: 16, backgroundColor: '#FBBF24' },
  wordReviewSparkle: { position: 'absolute', top: 7, right: 7 },
  progressTrack: { height: 10, borderRadius: 5, backgroundColor: 'rgba(53, 104, 212, 0.15)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: '#3568D4' },
});
