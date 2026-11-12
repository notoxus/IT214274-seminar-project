import AsyncStorage from '@react-native-async-storage/async-storage';
import { PROGRESS_STORAGE_KEY } from '@/constants/constants';
import type { LearningProgress, PracticeReviewProgress, QuizAttempt, WrongAnswerRecord } from '@/types/statistic';

const EMPTY_PROGRESS: LearningProgress = {
  completedLessonIds: [],
  completedQuizzes: 0,
  correctAnswers: 0,
  totalQuestions: 0,
  averageScore: 0,
  quizHistory: [],
  wrongAnswers: [],
  streakDays: 0,
};

// Read progress from device storage
export async function getProgress(): Promise<LearningProgress> {
  const raw = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
  if (!raw) return EMPTY_PROGRESS;
  try {
    const parsed = JSON.parse(raw);
    return { ...EMPTY_PROGRESS, ...parsed } as LearningProgress;
  } catch {
    return EMPTY_PROGRESS;
  }
}

// Save progress back to AsyncStorage
export async function saveProgress(progress: LearningProgress) {
  await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}
// Update streak based on today's date vs last active date (mutates progress in-place)
function updateStreakInProgress(progress: LearningProgress) {
  const today = new Date().toISOString().split('T')[0]!;
  const last = progress.lastActiveDate;

  if (!last) {
    // First activity ever
    progress.streakDays = 1;
  } else if (last === today) {
    // Already active today, no change
  } else {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    progress.streakDays = last === yesterday ? (progress.streakDays ?? 0) + 1 : 1;
  }

  progress.lastActiveDate = today;
}

// Mark a lesson as finished
export async function markLessonComplete(lessonId: string) {
  const progress = await getProgress();
  const isNewCompletion = !progress.completedLessonIds.includes(lessonId);
  if (isNewCompletion) {
    progress.completedLessonIds.push(lessonId);
    updateStreakInProgress(progress);
  }
  progress.practiceReviews ??= {};
  if (!progress.practiceReviews[lessonId]) {
    progress.practiceReviews[lessonId] = {
      dueAtLessonCount: progress.completedLessonIds.length,
      gapIndex: 0,
      active: false,
      completed: false,
      firstPassQuestionIds: [],
      firstPassCorrect: 0,
      firstPassIncorrectIds: [],
      retryQuestionIds: [],
      retryCompletedIds: [],
    };
  }
  await saveProgress(progress);
  return progress;
}

const REVIEW_GAPS = [2, 4, 6];

export async function getDuePracticeReviews() {
  const progress = await getProgress();
  const completedCount = progress.completedLessonIds.length;
  const due: string[] = [];
  for (const [lessonIndex, lessonId] of progress.completedLessonIds.entries()) {
    progress.practiceReviews ??= {};
    progress.practiceReviews[lessonId] ??= {
      dueAtLessonCount: lessonIndex + 1,
      gapIndex: 0,
      active: false,
      completed: false,
      firstPassQuestionIds: [],
      firstPassCorrect: 0,
      firstPassIncorrectIds: [],
      retryQuestionIds: [],
      retryCompletedIds: [],
    };
    const review = progress.practiceReviews[lessonId];
    if (review && (review.active || review.dueAtLessonCount <= completedCount)) {
      if (!review.active) {
        if (review.completed) {
          review.firstPassQuestionIds = [];
          review.firstPassCorrect = 0;
          review.firstPassIncorrectIds = [];
          review.retryQuestionIds = [];
          review.retryCompletedIds = [];
          review.completed = false;
        }
        review.active = true;
      }
      due.push(lessonId);
    }
  }
  await saveProgress(progress);
  return due;
}

export async function getPracticeReview(lessonId: string) {
  const progress = await getProgress();
  return progress.practiceReviews?.[lessonId] ?? null;
}

export async function recordPracticeAnswer(lessonId: string, questionId: string, correct: boolean, totalQuestions: number) {
  const progress = await getProgress();
  progress.practiceReviews ??= {};
  const review = progress.practiceReviews[lessonId];
  if (!review) return null;

  if (review.retryQuestionIds.includes(questionId)) {
    if (correct && !review.retryCompletedIds.includes(questionId)) review.retryCompletedIds.push(questionId);
    const retriesDone = review.retryQuestionIds.every((id) => review.retryCompletedIds.includes(id));
    if (retriesDone) finishPracticeReview(progress, lessonId, review);
  } else if (!review.firstPassQuestionIds.includes(questionId)) {
    review.firstPassQuestionIds.push(questionId);
    if (correct) review.firstPassCorrect += 1;
    else review.firstPassIncorrectIds.push(questionId);

    if (review.firstPassQuestionIds.length >= totalQuestions) {
      if (review.firstPassIncorrectIds.length >= Math.ceil(totalQuestions / 2)) {
        review.retryQuestionIds = [...review.firstPassIncorrectIds];
      } else {
        finishPracticeReview(progress, lessonId, review);
      }
    }
  }

  await saveProgress(progress);
  return review;
}

function finishPracticeReview(progress: LearningProgress, lessonId: string, review: PracticeReviewProgress) {
  const nextGapIndex = review.gapIndex + 1;
  review.gapIndex = nextGapIndex;
  review.dueAtLessonCount = progress.completedLessonIds.length + REVIEW_GAPS[Math.min(nextGapIndex, REVIEW_GAPS.length - 1)]!;
  review.active = false;
  review.completed = true;
  review.firstPassQuestionIds = [];
  review.firstPassCorrect = 0;
  review.firstPassIncorrectIds = [];
  review.retryQuestionIds = [];
  review.retryCompletedIds = [];
  progress.practiceReviews![lessonId] = review;
}

// Save detailed quiz result, update statistics, history and wrong answers
export async function saveQuizResultDetailed(
  lessonId: string | undefined,
  totalQuestions: number,
  correctAnswers: number,
  wrongRecords: WrongAnswerRecord[] = []
) {
  const progress = await getProgress();

  // 1. Update basic counters (Xử lý an toàn tránh undefined)
  progress.completedQuizzes = (progress.completedQuizzes || 0) + 1;
  progress.correctAnswers = (progress.correctAnswers || 0) + correctAnswers; 
  progress.totalQuestions = (progress.totalQuestions || 0) + totalQuestions;

  // 2. Calculate score percentage for this attempt
  const scorePercent = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  // 3. Add to quiz history
  const attempt: QuizAttempt = {
    id: Date.now().toString(),
    lessonId,
    totalQuestions,
    correctAnswers,
    scorePercent,
    completedAt: new Date().toISOString(),
  };

  if (!progress.quizHistory) {
    progress.quizHistory = [];
  }
  progress.quizHistory.push(attempt);

  // 4. Calculate overall average score
  const totalScoreSum = progress.quizHistory.reduce((sum, item) => sum + item.scorePercent, 0);
  progress.averageScore = Math.round(totalScoreSum / progress.quizHistory.length);

  // 5. Update wrong answers list (add new or update attempts if question already exists)
  if (!progress.wrongAnswers) {
    progress.wrongAnswers = [];
  }

  for (const newWrong of wrongRecords) {
    const existingIndex = progress.wrongAnswers.findIndex(
      (item) => item.questionId === newWrong.questionId
    );
    if (existingIndex >= 0) {
      // Update existing wrong answer record
      progress.wrongAnswers[existingIndex] = {
        ...progress.wrongAnswers[existingIndex],
        selectedAnswer: newWrong.selectedAnswer,
        attempts: (progress.wrongAnswers[existingIndex].attempts || 1) + 1,
        lastAttemptAt: new Date().toISOString(),
      };
    } else {
      // Add new wrong answer record
      progress.wrongAnswers.push({
        ...newWrong,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        attempts: 1,
        lastAttemptAt: new Date().toISOString(),
      });
    }
  }

  await saveProgress(progress);
  return progress;
}

// Backward compatible basic saveQuizResult function
export async function saveQuizResult(correctAnswers: number) {
  const progress = await getProgress();
  updateStreakInProgress(progress);
  await saveProgress(progress);
  return saveQuizResultDetailed(undefined, 0, correctAnswers, []);
}

// Record alias
export const recordQuiz = saveQuizResult;

// Remove a wrong answer when user answers it correctly during review/retry
export async function removeWrongAnswer(questionId: string) {
  const progress = await getProgress();
  if (progress.wrongAnswers) {
    progress.wrongAnswers = progress.wrongAnswers.filter(
      (item: WrongAnswerRecord) => item.questionId !== questionId
    );
    await saveProgress(progress);
  }
  return progress;
}
