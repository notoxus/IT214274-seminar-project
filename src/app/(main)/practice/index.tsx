import { useCallback, useRef, useState } from 'react';
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
import { getLessons } from '@/services/lesson-service';
import { activatePracticeReview, getDuePracticeReviews, getPracticeReview, getProgress, recordPracticeAnswer } from '@/services/storage-service';
import type { LearningProgress, PracticeReviewProgress } from '@/types/statistic';

export default function PracticeScreen() {
  const router = useRouter();
  const lessons = getLessons();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [dueIds, setDueIds] = useState<string[]>([]);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [review, setReview] = useState<PracticeReviewProgress | null>(null);
  const [shownQuestionId, setShownQuestionId] = useState<string | null>(null);
  const [shownMode, setShownMode] = useState<'first-pass' | 'retry' | 'filler' | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [saveError, setSaveError] = useState(false);
  const submitting = useRef(false);
  const [wordPulse] = useState(() => new Animated.Value(0));

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
    const due = await getDuePracticeReviews();
    const stored = await getProgress();
    setProgress(stored);
    setDueIds(due);
    setLessonId(null);
    setReview(null);
    setShownQuestionId(null);
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
    setLessonId(id);
    setReview(activeReview);
    setShownQuestionId(null);
    setShownMode(null);
    setAnswer(null);
    setChecked(null);
    submitting.current = false;
  };

  const beginDueReview = async () => {
    const id = dueIds[0];
    if (!id) return;
    setLessonId(id);
    setReview(await getPracticeReview(id));
    setShownQuestionId(null);
    setShownMode(null);
    setAnswer(null);
    setChecked(null);
  };

  const lesson = lessons.find((item) => item.id === lessonId);
  const queuedQuestion = (() => {
    if (!lesson || !review) return null;
    const questions = [...lesson.questions, ...(lesson.supplementalQuestions ?? [])];
    const nextFirstPass = lesson.questions.find((item) => !review.firstPassQuestionIds.includes(item.id));
    if (nextFirstPass) return nextFirstPass;
    const nextRetryId = review.retryBatchQuestionIds[0];
    if (nextRetryId) return questions.find((item) => item.id === nextRetryId) ?? null;
    const knownCorrectIds = review.firstPassCorrectIds.length > 0
      ? review.firstPassCorrectIds
      : review.firstPassQuestionIds.filter((id) => !review.firstPassIncorrectIds.includes(id));
    const fillerIds = [...knownCorrectIds, ...(lesson.supplementalQuestions ?? []).map((item) => item.id)];
    if (fillerIds.length === 0) return null;
    return questions.find((item) => item.id === fillerIds[review.fillerCursor % fillerIds.length]) ?? null;
  })();
  const allQuestions = lesson ? [...lesson.questions, ...(lesson.supplementalQuestions ?? [])] : [];
  const question = (shownQuestionId && allQuestions.find((item) => item.id === shownQuestionId)) || queuedQuestion;
  const computedMode = !question || !review
    ? null
    : review.retryBatchQuestionIds.includes(question.id)
      ? 'retry'
      : review.firstPassQuestionIds.includes(question.id) || lesson?.supplementalQuestions?.some((item) => item.id === question.id)
        ? 'filler'
        : 'first-pass';
  const questionMode = shownMode ?? computedMode;
  const isKnownFiller = !!question && !!review?.firstPassCorrectIds.includes(question.id);
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
      const updated = await recordPracticeAnswer(lesson.id, question.id, correct, lesson.questions.length, questionMode ?? 'first-pass', wrongDetails);
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
    return (
      <Screen>
        <ThemedText type="title" style={styles.title}>Practice · {lesson.title}</ThemedText>
        {review.completed && !review.active ? (
          <AppCard>
            <ThemedText type="subtitle">Level complete</ThemedText>
            <StarRating stars={review.lastStars ?? review.bestStars ?? 1} />
            <AppButton title="Back to levels" onPress={() => void loadHome()} />
          </AppCard>
        ) : !question ? (
          <AppCard>
            <ThemedText type="subtitle">Level complete</ThemedText>
            <ThemedText type="default" themeColor="muted">You finished all questions for {lesson.title}.</ThemedText>
            <AppButton title="Back to levels" onPress={() => void loadHome()} />
          </AppCard>
        ) : (
          <AppCard>
            <ThemedText type="default" themeColor="muted">
              {questionMode === 'retry'
                ? `Spaced review · ${Math.max(0, review.retryQuestionIds.length)} missed question(s)`
                : questionMode === 'filler'
                  ? isKnownFiller ? 'Review gap · practice a question you already know' : 'Review gap · extra practice question'
                  : `Question ${review.firstPassQuestionIds.length + 1} of ${lesson.questions.length}`}
            </ThemedText>
            <ThemedText type="default">{question.prompt}</ThemedText>
            {question.type === 'multiple-choice' ? (
              <MultipleChoice question={question} selected={answer} onSelect={setAnswer} disabled={checked !== null} />
            ) : question.type === 'fill-blank' ? (
              <FillBlank value={answer ?? ''} onChangeText={setAnswer} editable={checked === null} />
            ) : (
              <TrueFalse selected={answer} onSelect={setAnswer} disabled={checked !== null} />
            )}
            {checked !== null && (
              <Text accessibilityRole="alert" style={{ color: checked ? '#27845A' : '#C43F45', fontWeight: '600' }}>
                {checked ? questionMode === 'retry' ? 'Correct — remembered!' : 'Correct!'
                  : `Not quite. ${question.explanation ?? 'Review the correct answer and try to remember it next time.'} Correct answer: ${question.answer}`}
              </Text>
            )}
            {saveError && <ThemedText type="small" themeColor="muted">Couldn’t save this answer. Please try again.</ThemedText>}
            {checked === null
              ? <AppButton title="Check answer" disabled={!answer?.trim()} onPress={() => void checkAnswer()} />
              : <AppButton title="Next question" onPress={advance} />}
          </AppCard>
        )}
      </Screen>
    );
  }

  const dueLesson = lessons.find((item) => dueIds.includes(item.id));
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

      {dueLesson && (
        <AppCard>
          <ThemedText type="subtitle">Spaced review is ready</ThemedText>
          <ThemedText type="default" themeColor="muted">Continue reviewing missed questions from {dueLesson.title}.</ThemedText>
          <AppButton title="Continue review" onPress={() => void beginDueReview()} />
        </AppCard>
      )}

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
});
