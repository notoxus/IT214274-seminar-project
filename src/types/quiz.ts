// Quiz and question models
export type QuizQuestion =
  | { id: string; prompt: string; type: 'multiple-choice'; options: string[]; answer: string; explanation?: string }
  | { id: string; prompt: string; type: 'fill-blank'; answer: string; explanation?: string }
  | { id: string; prompt: string; type: 'true-false'; answer: 'true' | 'false'; explanation?: string };

export type QuestionType = QuizQuestion['type'];

export type QuizResult = {
  totalQuestions: number;
  correctAnswers: number;
  scorePercent: number;
  completedAt?: string;
};
