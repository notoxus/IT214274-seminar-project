export type WrongAnswerRecord = {
  id: string;
  lessonId: string;
  questionId: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  selectedAnswer: string;
  attempts: number;
  lastAttemptAt: string;
};

export type QuizAttempt = {
  id: string;
  lessonId?: string;
  totalQuestions: number;
  correctAnswers: number;
  scorePercent: number;
  stars?: number;
  completedAt: string;
};

export type PracticeReviewProgress = {
  dueAtQuestionCount: number;
  gapIndex: number;
  active: boolean;
  completed: boolean;
  // Answers given during the current practice session. Drives the progress bar:
  // percent = sessionAnswers / (sessionAnswers + remaining new + pending retries).
  sessionAnswers: number;
  // Number of missed questions already answered correctly after coming due.
  resolvedWrongCount: number;
  // Extra questions still owed: +1 after a retry is answered correctly, +2 after
  // a retry is missed. fillerDelay pushes them one question further out.
  pendingFillers: number;
  fillerDelay: number;
  // Extra (supplemental) questions already used as fillers.
  extraServedIds: string[];
  firstPassQuestionIds: string[];
  firstPassCorrectIds: string[];
  firstPassCorrect: number;
  firstPassIncorrectIds: string[];
  retryQuestionIds: string[];
  retryCompletedIds: string[];
  retryDueAtQuestionCount: Record<string, number>;
  retryGapIndexByQuestion: Record<string, number>;
  retryBatchSize: number;
  retryBatchQuestionIds: string[];
  fillerCursor: number;
  lastScorePercent?: number;
  lastStars?: number;
  bestStars?: number;
};

export type LearningProgress = {
  completedLessonIds: string[];
  completedQuizzes: number;
  correctAnswers: number;
  totalQuestions?: number;
  averageScore?: number;
  quizHistory?: QuizAttempt[];
  wrongAnswers?: WrongAnswerRecord[];
  practiceReviews?: Record<string, PracticeReviewProgress>;
  practiceQuestionAnswers?: number;
  totalStars?: number;
  streakDays: number;
  lastActiveDate?: string;
  // Milliseconds since epoch of the last local/cloud write. Used to decide
  // which copy wins when merging a device with its Firestore backup.
  updatedAt?: number;
};
