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
  id: string;
  dueAtQuestionCount: number;
  gapIndex: number;
  active: boolean;
  completed: boolean;
  sessionAnswers: number;
  resolvedWrongCount: number;
  pendingFillers: number;
  fillerDelay: number;
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
  id: string;
  completedLessonIds: string[];
  completedQuizzes: number;
  correctAnswers: number;
  totalQuestions?: number;
  averageScore?: number;
  quizHistory?: QuizAttempt[];
  wrongAnswers?: WrongAnswerRecord[];
  practiceReviews?: Record<string, PracticeReviewProgress>;
  practiceQuestionAnswers?: number;
  favoriteWordIds?: string[];
  // Vocabulary cards that finished a review session without being sent back.
  wordReviewRememberedIds?: string[];
  // Number of finished word-review sessions; 0 means the feature is new.
  wordReviewSessions?: number;
  totalStars?: number;
  streakDays: number;
  lastActiveDate?: string;
  updatedAt?: number;
};
