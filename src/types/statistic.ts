// User learning progress & statistics models



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
  completedAt: string;

};



export type LearningProgress = {

  completedLessonIds: string[];
  completedQuizzes: number;
  correctAnswers: number;

  // Additional statistics
  totalQuestions?: number;
  averageScore?: number;
  quizHistory?: QuizAttempt[];
  wrongAnswers?: WrongAnswerRecord[];
  practiceReviews?: Record<string, PracticeReviewProgress>;
  // Day-based streak
  streakDays: number;
  lastActiveDate?: string; // ISO date "YYYY-MM-DD"
  streakDays?: number;
  
  lastActiveDate?: string;
};
};

export type PracticeReviewProgress = {
  dueAtLessonCount: number;
  gapIndex: number;
  active: boolean;
  completed: boolean;
  firstPassQuestionIds: string[];
  firstPassCorrect: number;
  firstPassIncorrectIds: string[];
  retryQuestionIds: string[];
  retryCompletedIds: string[];
};

