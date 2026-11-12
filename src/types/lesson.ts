import type { QuizQuestion } from '@/types/quiz';

export type Vocabulary = {
  id: string;
  word: string;
  pronunciation: string;
  meaning: string;
  audioUrl?: string;
};

export type GrammarItem = {
  title: string;
  explanation: string;
  example: string;
};

export type Lesson = {
  id: string;
  title: string;
  level: string;
  description: string;
  vocabulary: Vocabulary[];
  grammar?: GrammarItem[];
  questions: QuizQuestion[];
  supplementalQuestions?: QuizQuestion[];
};

// Re-export types for backward compatibility
export type { QuizQuestion } from '@/types/quiz';
export type { LearningProgress } from '@/types/statistic';
