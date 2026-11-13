import AsyncStorage from '@react-native-async-storage/async-storage';
import { PROGRESS_STORAGE_KEY } from '@/constants/constants';
import { loadCloudDocument, saveCloudDocument } from '@/services/firebase-sync';
import { getSyncUserId } from '@/services/sync-session';
import type { LearningProgress, PracticeReviewProgress, WrongAnswerRecord } from '@/types/statistic';

const CLOUD_PROGRESS_DOCUMENT = 'progress';

function createEmptyProgress(): LearningProgress {
  return {
  completedLessonIds: [],
  completedQuizzes: 0,
  correctAnswers: 0,
  totalQuestions: 0,
  averageScore: 0,
  quizHistory: [],
  wrongAnswers: [],
  practiceReviews: {},
  practiceQuestionAnswers: 0,
  totalStars: 0,
  streakDays: 0,
  updatedAt: 0,
  };
}

// Each account gets its own local key so switching users on one device does not
// mix progress. Signed-out usage falls back to the original shared key.
function progressStorageKey(uid: string | null) {
  return uid ? `${PROGRESS_STORAGE_KEY}:${uid}` : PROGRESS_STORAGE_KEY;
}

function parseProgress(raw: string | null): LearningProgress {
  if (!raw) return createEmptyProgress();
  try {
    const parsed = JSON.parse(raw) as Partial<LearningProgress>;
    const defaults = createEmptyProgress();
    return {
      ...defaults,
      ...parsed,
      completedLessonIds: Array.isArray(parsed.completedLessonIds) ? parsed.completedLessonIds : [],
      completedQuizzes: Number.isFinite(parsed.completedQuizzes) ? parsed.completedQuizzes ?? 0 : 0,
      correctAnswers: Number.isFinite(parsed.correctAnswers) ? parsed.correctAnswers ?? 0 : 0,
      totalQuestions: Number.isFinite(parsed.totalQuestions) ? parsed.totalQuestions ?? 0 : 0,
      averageScore: Number.isFinite(parsed.averageScore) ? parsed.averageScore ?? 0 : 0,
      quizHistory: Array.isArray(parsed.quizHistory) ? parsed.quizHistory : [],
      wrongAnswers: Array.isArray(parsed.wrongAnswers) ? parsed.wrongAnswers : [],
      practiceReviews: parsed.practiceReviews && typeof parsed.practiceReviews === 'object' ? parsed.practiceReviews : {},
      practiceQuestionAnswers: Number.isFinite(parsed.practiceQuestionAnswers) ? Math.max(0, Math.floor(parsed.practiceQuestionAnswers!)) : 0,
      totalStars: Number.isFinite(parsed.totalStars) ? Math.max(0, Math.floor(parsed.totalStars!)) : 0,
      streakDays: Number.isFinite(parsed.streakDays) ? parsed.streakDays ?? 0 : 0,
      updatedAt: Number.isFinite(parsed.updatedAt) ? Math.max(0, parsed.updatedAt!) : 0,
    };
  } catch {
    return createEmptyProgress();
  }
}

async function readLocalProgress(uid: string | null = getSyncUserId()): Promise<LearningProgress> {
  const raw = await AsyncStorage.getItem(progressStorageKey(uid));
  return parseProgress(raw);
}

async function writeLocalProgress(progress: LearningProgress, uid: string | null = getSyncUserId()) {
  await AsyncStorage.setItem(progressStorageKey(uid), JSON.stringify(progress));
}

function hasMeaningfulProgress(progress: LearningProgress) {
  return (
    (progress.updatedAt ?? 0) > 0 ||
    progress.completedLessonIds.length > 0 ||
    (progress.completedQuizzes ?? 0) > 0 ||
    (progress.quizHistory?.length ?? 0) > 0
  );
}

// Newest write wins. A fresh install has no data, so the Firestore copy
// automatically restores the account's progress after reinstalling.
function pickNewerProgress(local: LearningProgress, remote: LearningProgress | null) {
  if (!remote) return local;
  const localHasData = hasMeaningfulProgress(local);
  const remoteHasData = hasMeaningfulProgress(remote);
  if (remoteHasData && !localHasData) return remote;
  if (localHasData && !remoteHasData) return local;
  const localTime = local.updatedAt ?? 0;
  const remoteTime = remote.updatedAt ?? 0;
  if (remoteTime > localTime) return remote;
  if (localTime > remoteTime) return local;
  // Tie (e.g. legacy data saved without a timestamp): prefer data over nothing.
  return localHasData ? local : remote;
}

let initialSync: Promise<void> = Promise.resolve();
let syncedUserId: string | null = null;

// Called by the auth layer whenever the signed-in user changes. Starts a
// one-time restore/merge from Firestore; getProgress() waits for it so screens
// never render an empty snapshot while the backup is still loading.
export function setProgressSyncUser(uid: string | null) {
  if (uid === syncedUserId) return;
  syncedUserId = uid;
  initialSync = uid ? initializeProgressForUser(uid) : Promise.resolve();
}

export function waitForProgressSync() {
  return initialSync;
}

async function initializeProgressForUser(uid: string) {
  try {
    const userKey = progressStorageKey(uid);
    const [userRaw, legacyRaw] = await Promise.all([
      AsyncStorage.getItem(userKey),
      AsyncStorage.getItem(PROGRESS_STORAGE_KEY),
    ]);
    // Migrate progress recorded before per-account keys existed.
    if (!userRaw && legacyRaw) {
      await AsyncStorage.setItem(userKey, legacyRaw);
    }
    const local = parseProgress(userRaw ?? legacyRaw);
    const remote = await loadCloudDocument<LearningProgress>(uid, CLOUD_PROGRESS_DOCUMENT);
    const winner = pickNewerProgress(local, remote);
    // Make sure anything we keep carries a timestamp, otherwise a future
    // fresh install cannot tell this copy apart from empty data.
    const toStore: LearningProgress =
      (winner.updatedAt ?? 0) > 0 ? winner : { ...winner, updatedAt: Date.now() };
    if (toStore !== local) {
      await writeLocalProgress(toStore, uid);
    }
    if (
      hasMeaningfulProgress(toStore) &&
      (!remote || (toStore.updatedAt ?? 0) > (remote.updatedAt ?? 0))
    ) {
      await saveCloudDocument(uid, CLOUD_PROGRESS_DOCUMENT, toStore);
    }
  } catch (error) {
    // Offline or misconfigured Firebase: keep using the device copy.
    console.warn('[progress] Cloud restore failed, using local data', error);
  }
}

// Read progress from device storage (cloud restore already merged on login)
export async function getProgress(): Promise<LearningProgress> {
  await initialSync;
  return readLocalProgress();
}

// Save progress locally and mirror it to Firestore for the signed-in user
export async function saveProgress(progress: LearningProgress) {
  const next: LearningProgress = { ...progress, updatedAt: Date.now() };
  await writeLocalProgress(next);
  const uid = getSyncUserId();
  if (uid) {
    void saveCloudDocument(uid, CLOUD_PROGRESS_DOCUMENT, next);
  }
}
// Update streak based on today's date vs last active date (mutates progress in-place)
function updateStreakInProgress(progress: LearningProgress) {
  const today = localDateKey(new Date());
  const last = progress.lastActiveDate;

  if (!last) {
    // First activity ever
    progress.streakDays = 1;
  } else if (last === today) {
    // Already active today, no change
  } else {
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = localDateKey(yesterdayDate);
    progress.streakDays = last === yesterday ? (progress.streakDays ?? 0) + 1 : 1;
  }

  progress.lastActiveDate = today;
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
      dueAtQuestionCount: progress.practiceQuestionAnswers ?? 0,
      gapIndex: 0,
      active: false,
      completed: false,
      firstPassQuestionIds: [],
      firstPassCorrectIds: [],
      firstPassCorrect: 0,
      firstPassIncorrectIds: [],
      retryQuestionIds: [],
      retryCompletedIds: [],
      retryDueAtQuestionCount: {},
      retryGapIndexByQuestion: {},
      retryBatchSize: 1,
      retryBatchQuestionIds: [],
      fillerCursor: 0,
    };
  }
  await saveProgress(progress);
  return progress;
}

const REVIEW_GAPS = [2, 4, 6];

function createPracticeReview(dueAtQuestionCount: number): PracticeReviewProgress {
  return {
    dueAtQuestionCount,
    gapIndex: 0,
    active: false,
    completed: false,
    firstPassQuestionIds: [],
    firstPassCorrectIds: [],
    firstPassCorrect: 0,
    firstPassIncorrectIds: [],
    retryQuestionIds: [],
    retryCompletedIds: [],
    retryDueAtQuestionCount: {},
    retryGapIndexByQuestion: {},
    retryBatchSize: 1,
    retryBatchQuestionIds: [],
    fillerCursor: 0,
  };
}

export async function getDuePracticeReviews() {
  const progress = await getProgress();
  const questionCount = progress.practiceQuestionAnswers ?? 0;
  const due: string[] = [];
  for (const lessonId of progress.completedLessonIds) {
    progress.practiceReviews ??= {};
    progress.practiceReviews[lessonId] ??= createPracticeReview(questionCount);
    const review = progress.practiceReviews[lessonId];
    review.firstPassCorrectIds ??= [];
    review.firstPassQuestionIds ??= [];
    review.firstPassIncorrectIds ??= [];
    review.retryQuestionIds ??= [];
    review.retryCompletedIds ??= [];
    review.retryDueAtQuestionCount ??= {};
    review.retryGapIndexByQuestion ??= {};
    review.retryBatchSize ??= 1;
    review.retryBatchQuestionIds ??= [];
    review.fillerCursor ??= 0;
    for (const questionId of review.retryQuestionIds) {
      review.retryDueAtQuestionCount[questionId] ??= questionCount;
      review.retryGapIndexByQuestion[questionId] ??= 0;
    }
    // Migrate persisted lesson-based schedules to question-based intervals.
    const legacyReview = review as PracticeReviewProgress & { dueAtLessonCount?: number };
    if (!Number.isFinite(legacyReview.dueAtQuestionCount)) {
      const safeGapIndex = Number.isFinite(legacyReview.gapIndex)
        ? Math.max(0, Math.floor(legacyReview.gapIndex))
        : 0;
      legacyReview.dueAtQuestionCount = legacyReview.completed
        ? questionCount + REVIEW_GAPS[Math.min(safeGapIndex, REVIEW_GAPS.length - 1)]!
        : questionCount;
      delete legacyReview.dueAtLessonCount;
    }
    if (review.active || review.dueAtQuestionCount <= questionCount) {
      if (!review.active) {
        if (review.completed) {
          review.firstPassQuestionIds = [];
          review.firstPassCorrectIds = [];
          review.firstPassCorrect = 0;
          review.firstPassIncorrectIds = [];
          review.retryQuestionIds = [];
          review.retryCompletedIds = [];
          review.retryDueAtQuestionCount = {};
          review.retryGapIndexByQuestion = {};
          review.retryBatchSize = 1;
          review.retryBatchQuestionIds = [];
          review.fillerCursor = 0;
          review.completed = false;
        }
        review.active = true;
      }
      prepareRetryBatch(review, questionCount);
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

export async function activatePracticeReview(lessonId: string) {
  const progress = await getProgress();
  if (!progress.completedLessonIds.includes(lessonId)) return null;
  progress.practiceReviews ??= {};
  const review = progress.practiceReviews[lessonId] ?? createPracticeReview(progress.practiceQuestionAnswers ?? 0);
  if (review.completed) {
    review.firstPassQuestionIds = [];
    review.firstPassCorrectIds = [];
    review.firstPassCorrect = 0;
    review.firstPassIncorrectIds = [];
    review.retryQuestionIds = [];
    review.retryCompletedIds = [];
    review.retryDueAtQuestionCount = {};
    review.retryGapIndexByQuestion = {};
    review.retryBatchSize = 1;
    review.retryBatchQuestionIds = [];
    review.fillerCursor = 0;
  }
  review.active = true;
  review.completed = false;
  progress.practiceReviews[lessonId] = review;
  await saveProgress(progress);
  return review;
}

export async function recordPracticeAnswer(
  lessonId: string,
  questionId: string,
  correct: boolean,
  totalQuestions: number,
  mode: 'first-pass' | 'retry' | 'filler',
  wrongDetails?: Omit<WrongAnswerRecord, 'id' | 'attempts' | 'lastAttemptAt'>
) {
  const progress = await getProgress();
  progress.practiceReviews ??= {};
  const review = progress.practiceReviews[lessonId];
  if (!review || !review.active || totalQuestions <= 0) return null;

  if (mode === 'first-pass' && !review.firstPassQuestionIds.includes(questionId)) {
    progress.practiceQuestionAnswers = (progress.practiceQuestionAnswers ?? 0) + 1;
    updateStreakInProgress(progress);
    review.firstPassQuestionIds.push(questionId);
    if (correct) {
      review.firstPassCorrect += 1;
      review.firstPassCorrectIds.push(questionId);
      progress.wrongAnswers = (progress.wrongAnswers ?? []).filter(
        (item) => item.lessonId !== lessonId || item.questionId !== questionId
      );
    } else {
      review.firstPassIncorrectIds.push(questionId);
      if (wrongDetails) upsertWrongAnswer(progress, wrongDetails);
    }

    if (review.firstPassQuestionIds.length >= totalQuestions) {
      if (review.firstPassIncorrectIds.length >= Math.ceil(totalQuestions / 2)) {
        review.retryQuestionIds = [...review.firstPassIncorrectIds];
        const answerCount = progress.practiceQuestionAnswers ?? 0;
        review.retryQuestionIds.forEach((id, index) => {
          const intervalIndex = Math.min(index, REVIEW_GAPS.length - 1);
          review.retryDueAtQuestionCount[id] = answerCount + REVIEW_GAPS[intervalIndex]!;
          review.retryGapIndexByQuestion[id] = Math.min(intervalIndex + 1, REVIEW_GAPS.length - 1);
        });
        prepareRetryBatch(review, answerCount);
      } else {
        finishPracticeReview(progress, lessonId, review, totalQuestions);
      }
    }
  } else if (mode === 'retry' && review.retryQuestionIds.includes(questionId)) {
    if (review.retryCompletedIds.includes(questionId) || !review.retryBatchQuestionIds.includes(questionId)) return review;
    progress.practiceQuestionAnswers = (progress.practiceQuestionAnswers ?? 0) + 1;
    updateStreakInProgress(progress);
    review.retryBatchQuestionIds = review.retryBatchQuestionIds.filter((id) => id !== questionId);
    if (correct) {
      review.retryCompletedIds.push(questionId);
      review.retryQuestionIds = review.retryQuestionIds.filter((id) => id !== questionId);
      delete review.retryDueAtQuestionCount[questionId];
      progress.wrongAnswers = (progress.wrongAnswers ?? []).filter(
        (item) => item.lessonId !== lessonId || item.questionId !== questionId
      );
    } else {
      if (wrongDetails) upsertWrongAnswer(progress, wrongDetails);
      const gapIndex = review.retryGapIndexByQuestion[questionId] ?? 0;
      const nextGap = REVIEW_GAPS[Math.min(gapIndex, REVIEW_GAPS.length - 1)]!;
      review.retryDueAtQuestionCount[questionId] = (progress.practiceQuestionAnswers ?? 0) + nextGap;
      review.retryGapIndexByQuestion[questionId] = gapIndex + 1;
      review.retryBatchSize = Math.min(review.retryQuestionIds.length, review.retryBatchSize + 1);

      // Grow the next repeat batch by one missed question after another failed retry.
      const nextMissedQuestion = review.retryQuestionIds.find(
        (id) => id !== questionId && (review.retryDueAtQuestionCount[id] ?? Number.MAX_SAFE_INTEGER) > (progress.practiceQuestionAnswers ?? 0)
      );
      if (nextMissedQuestion) {
        review.retryDueAtQuestionCount[nextMissedQuestion] = review.retryDueAtQuestionCount[questionId]!;
        review.retryGapIndexByQuestion[nextMissedQuestion] = Math.max(
          review.retryGapIndexByQuestion[nextMissedQuestion] ?? 0,
          Math.min(gapIndex + 1, REVIEW_GAPS.length - 1)
        );
      }
    }
    if (review.retryQuestionIds.length === 0) finishPracticeReview(progress, lessonId, review, totalQuestions);
    else prepareRetryBatch(review, progress.practiceQuestionAnswers ?? 0);
  } else if (mode === 'filler') {
    progress.practiceQuestionAnswers = (progress.practiceQuestionAnswers ?? 0) + 1;
    updateStreakInProgress(progress);
    review.fillerCursor += 1;
    if (!correct && !review.retryQuestionIds.includes(questionId)) {
      review.firstPassCorrectIds = review.firstPassCorrectIds.filter((id) => id !== questionId);
      review.retryQuestionIds.push(questionId);
      review.retryDueAtQuestionCount[questionId] = (progress.practiceQuestionAnswers ?? 0) + 2;
      review.retryGapIndexByQuestion[questionId] = 1;
      if (wrongDetails) upsertWrongAnswer(progress, wrongDetails);
    }
    prepareRetryBatch(review, progress.practiceQuestionAnswers ?? 0);
  }

  await saveProgress(progress);
  return review;
}

function prepareRetryBatch(review: PracticeReviewProgress, answerCount: number) {
  if (review.retryBatchQuestionIds.length > 0) return;
  const dueQuestions = review.retryQuestionIds.filter(
    (id) => (review.retryDueAtQuestionCount[id] ?? Number.MAX_SAFE_INTEGER) <= answerCount
  );
  if (dueQuestions.length === 0) return;
  review.retryBatchQuestionIds = dueQuestions.slice(0, Math.max(1, review.retryBatchSize));
  for (const delayedId of dueQuestions.slice(review.retryBatchQuestionIds.length)) {
    review.retryDueAtQuestionCount[delayedId] = answerCount + 2;
  }
}

function finishPracticeReview(progress: LearningProgress, lessonId: string, review: PracticeReviewProgress, totalQuestions: number) {
  const scorePercent = totalQuestions > 0 ? Math.round((review.firstPassCorrect / totalQuestions) * 100) : 0;
  const stars = scorePercent >= 90 ? 3 : scorePercent >= 70 ? 2 : 1;
  review.lastScorePercent = scorePercent;
  review.lastStars = stars;
  const previousBest = review.bestStars ?? 0;
  if (stars > previousBest) {
    progress.totalStars = (progress.totalStars ?? 0) + (stars - previousBest);
    review.bestStars = stars;
  }
  recordQuizAttemptInProgress(progress, lessonId, totalQuestions, review.firstPassCorrect, stars);
  // Repetition happens inside this review on question intervals. Completing it
  // must not schedule the whole lesson again after another few answers.
  review.dueAtQuestionCount = Number.MAX_SAFE_INTEGER;
  review.active = false;
  review.completed = true;
  review.firstPassQuestionIds = [];
  review.firstPassCorrectIds = [];
  review.firstPassCorrect = 0;
  review.firstPassIncorrectIds = [];
  review.retryQuestionIds = [];
  review.retryCompletedIds = [];
  review.retryDueAtQuestionCount = {};
  review.retryGapIndexByQuestion = {};
  review.retryBatchSize = 1;
  review.retryBatchQuestionIds = [];
  review.fillerCursor = 0;
  progress.practiceReviews![lessonId] = review;
}

function recordQuizAttemptInProgress(progress: LearningProgress, lessonId: string | undefined, totalQuestions: number, correctAnswers: number, stars?: number) {
  if (totalQuestions <= 0) return;
  const scorePercent = Math.round((correctAnswers / totalQuestions) * 100);
  progress.completedQuizzes = (progress.completedQuizzes ?? 0) + 1;
  progress.correctAnswers = (progress.correctAnswers ?? 0) + correctAnswers;
  progress.totalQuestions = (progress.totalQuestions ?? 0) + totalQuestions;
  progress.quizHistory ??= [];
  progress.quizHistory.push({
    id: `${Date.now()}-${progress.quizHistory.length}`,
    lessonId,
    totalQuestions,
    correctAnswers,
    scorePercent,
    stars,
    completedAt: new Date().toISOString(),
  });
  const totalScore = progress.quizHistory.reduce((sum, attempt) => sum + attempt.scorePercent, 0);
  progress.averageScore = Math.round(totalScore / progress.quizHistory.length);
}

function upsertWrongAnswer(progress: LearningProgress, wrong: Omit<WrongAnswerRecord, 'id' | 'attempts' | 'lastAttemptAt'>) {
  progress.wrongAnswers ??= [];
  const existing = progress.wrongAnswers.find(
    (item) => item.lessonId === wrong.lessonId && item.questionId === wrong.questionId
  );
  if (existing) {
    existing.selectedAnswer = wrong.selectedAnswer;
    existing.attempts = (existing.attempts || 0) + 1;
    existing.lastAttemptAt = new Date().toISOString();
  } else {
    progress.wrongAnswers.push({
      ...wrong,
      id: `${wrong.lessonId}:${wrong.questionId}`,
      attempts: 1,
      lastAttemptAt: new Date().toISOString(),
    });
  }
}

// Save detailed quiz result, update statistics, history and wrong answers
export async function saveQuizResultDetailed(
  lessonId: string | undefined,
  totalQuestions: number,
  correctAnswers: number,
  wrongRecords: WrongAnswerRecord[] = []
) {
  const progress = await getProgress();
  if (!Number.isFinite(totalQuestions) || totalQuestions <= 0) return progress;
  const safeTotalQuestions = Math.floor(totalQuestions);
  if (safeTotalQuestions <= 0) return progress;
  const normalizedCorrectAnswers = Number.isFinite(correctAnswers) ? Math.floor(correctAnswers) : 0;
  const safeCorrectAnswers = Math.min(safeTotalQuestions, Math.max(0, normalizedCorrectAnswers));
  updateStreakInProgress(progress);
  recordQuizAttemptInProgress(progress, lessonId, safeTotalQuestions, safeCorrectAnswers);
  for (const newWrong of wrongRecords) {
    upsertWrongAnswer(progress, newWrong);
  }

  await saveProgress(progress);
  return progress;
}

// Backward compatible basic saveQuizResult function
export async function saveQuizResult(correctAnswers: number) {
  return saveQuizResultDetailed(undefined, 1, Math.min(1, Math.max(0, correctAnswers)), []);
}

// Record alias
export const recordQuiz = saveQuizResult;

// Remove a wrong answer when user answers it correctly during review/retry
export async function removeWrongAnswer(questionId: string) {
  const progress = await getProgress();
  if (progress.wrongAnswers) {
    progress.wrongAnswers = progress.wrongAnswers.filter((item) => item.questionId !== questionId);
    await saveProgress(progress);
  }
  return progress;
}
