import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FillBlank } from '@/components/practice/fill-blank';
import { MultipleChoice } from '@/components/practice/multiple-choice';
import { TrueFalse } from '@/components/practice/true-false';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { Screen } from '@/components/ui/screen';
import { StarRating } from '@/components/ui/star-rating';
import { ThemedText } from '@/components/ui/themed-text';
import { getLessons } from '@/services/lesson-service';
import { getDuePracticeReviews, getPracticeReview, recordPracticeAnswer } from '@/services/storage-service';
import type { PracticeReviewProgress } from '@/types/statistic';

export default function PracticeScreen() {
  const [loading, setLoading] = useState(true);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [review, setReview] = useState<PracticeReviewProgress | null>(null);
  const [shownQuestionId, setShownQuestionId] = useState<string | null>(null);
  const [shownMode, setShownMode] = useState<'first-pass' | 'retry' | 'filler' | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [saveError, setSaveError] = useState(false);
  const submitting = useRef(false);

  const loadDueReview = useCallback(async () => {
    setLoading(true);
    const dueIds = await getDuePracticeReviews();
    const nextId = dueIds[0] ?? null;
    setLessonId(nextId);
    setReview(nextId ? await getPracticeReview(nextId) : null);
    setShownQuestionId(null);
    setShownMode(null);
    setAnswer(null);
    setChecked(null);
    setSaveError(false);
    submitting.current = false;
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { void loadDueReview(); }, [loadDueReview]));

  const lesson = getLessons().find((item) => item.id === lessonId);
  const queuedQuestion = useMemo(() => {
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
    const fillerId = fillerIds[review.fillerCursor % fillerIds.length];
    return questions.find((item) => item.id === fillerId) ?? null;
  }, [lesson, review]);
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

  return (
    <Screen>
      <ThemedText type="title" style={{ marginTop: 15 }}>Practice</ThemedText>
      <ThemedText type="default" themeColor="muted">Short reviews help you remember what you learned.</ThemedText>

      {loading ? <ActivityIndicator /> : !lesson || !review ? (
        <AppCard>
          <ThemedText type="subtitle">No reviews due</ThemedText>
          <ThemedText type="default" themeColor="muted">Complete a lesson in Learn to unlock its questions. Missed questions return after 2, then 4, then 6 other answers.</ThemedText>
        </AppCard>
      ) : review.completed && !review.active ? (
        <AppCard>
          <ThemedText type="subtitle">Review complete</ThemedText>
          <StarRating stars={review.lastStars ?? review.bestStars ?? 1} />
          <ThemedText type="default" themeColor="muted">{lesson.title}</ThemedText>
          <AppButton title="Done" onPress={() => void loadDueReview()} />
        </AppCard>
      ) : !question ? (
        <AppCard>
          <ThemedText type="subtitle">Review complete</ThemedText>
          <ThemedText type="default" themeColor="muted">You finished all questions for {lesson.title}.</ThemedText>
          <AppButton title="Done" onPress={() => void loadDueReview()} />
        </AppCard>
      ) : (
        <AppCard>
          <ThemedText type="subtitle">{lesson.title}</ThemedText>
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
              {checked
                ? questionMode === 'retry' ? 'Correct — remembered!' : 'Correct!'
                : `Not quite. ${question.explanation ?? 'Review the correct answer and try to remember it next time.'} Correct answer: ${question.answer}`}
            </Text>
          )}
          {saveError && <ThemedText type="small" themeColor="muted">Couldn’t save this answer. Please try again.</ThemedText>}
          {checked === null ? (
            <AppButton title="Check answer" disabled={!answer?.trim()} onPress={() => void checkAnswer()} />
          ) : (
            <AppButton title="Next question" onPress={advance} />
          )}
          {review.retryQuestionIds.length > 0 && questionMode !== 'retry' && (
            <View><ThemedText type="default" themeColor="muted">Missed questions return after other questions, so you can review the explanation first.</ThemedText></View>
          )}
        </AppCard>
      )}
    </Screen>
  );
}
