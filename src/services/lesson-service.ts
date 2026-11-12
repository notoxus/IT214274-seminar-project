import type { GrammarItem, Lesson, Vocabulary } from '@/types/lesson';

const lessons: Lesson[] = [
  {
    id: 'introductions',
    title: 'Making introductions',
    level: 'Beginner · 5 min',
    description: 'Learn a few friendly phrases for meeting someone for the first time.',
    vocabulary: [
      { id: 'v1', word: 'pleased', pronunciation: '/pliːzd/', meaning: 'happy about something' },
      { id: 'v2', word: 'currently', pronunciation: '/ˈkɜːrəntli/', meaning: 'at the present time' },
    ],
grammar: [
  { 
    title: 'Pleased to + Verb (nguyên mẫu)',
    explanation: 'Dùng để diễn tả sự vui mừng hoặc hài lòng khi làm điều gì đó lần đầu.',
    example: 'I am very pleased to meet you today.' 
  },
],
questions: [
  { id: 'intro-q1', type: 'multiple-choice', prompt: '"Nice to meet you" is used when...', options: ['meeting someone new', 'saying goodbye', 'asking for directions'], answer: 'meeting someone new' },
  { id: 'intro-q2', type: 'fill-blank', prompt: 'Complete: "Pleased ___ meet you."', answer: 'to' },
  { id: 'intro-q3', type: 'true-false', prompt: '"Nice to meet you" is commonly said when you first meet someone.', answer: 'true' },
  { id: 'intro-q4', type: 'multiple-choice', prompt: 'Which is a polite way to introduce yourself?', options: ['Hi, I\'m Mai.', 'Go away,', 'currently'], answer: 'Hi, I\'m Mai.' },
  { id: 'intro-q5', type: 'fill-blank', prompt: 'Complete: "I ___ live in Hanoi."', answer: 'currently' },
  { id: 'intro-q6', type: 'multiple-choice', prompt: 'What does "currently" mean?', options: ['at the present time', 'next year', 'never'], answer: 'at the present time' },
  { id: 'intro-q7', type: 'true-false', prompt: '"Pleased to meet you" is a formal greeting.', answer: 'true' },
  { id: 'intro-q8', type: 'multiple-choice', prompt: 'Choose a natural response to "Nice to meet you."', options: ['Nice to meet you too.', 'I am fine.', 'Goodbye.'], answer: 'Nice to meet you too.' },
  { id: 'intro-q9', type: 'fill-blank', prompt: 'Complete: "Where ___ you from?"', answer: 'are' },
  { id: 'intro-q10', type: 'true-false', prompt: 'You can say "I\'m from Vietnam" to tell someone where you are from.', answer: 'true' },
],
  },
  {
    id: 'daily-routines',
    title: 'Daily routines',
    level: 'Beginner · 7 min',
    description: 'Talk about the things you do every day.',
    vocabulary: [
      { id: 'v3', word: 'commute', pronunciation: '/kəˈmjuːt/', meaning: 'travel regularly to work or school'},
      { id: 'v4', word: 'usually', pronunciation: '/ˈjuːʒuəli/', meaning: 'in most cases'},
    ],
    grammar: [
      { title: 'Usually + Verb (nguyên mẫu)',
        explanation: 'Dùng để diễn tả hành động xảy ra thường xuyên.',
        example: 'I usually wake up early.' },
    ],
    questions: [
      { id: 'routine-q1', type: 'multiple-choice', prompt: 'Choose the natural sentence.', options: ['I usually wake up early.', 'I wake usually up early.', 'Usually I up wake early.'], answer: 'I usually wake up early.' },
      { id: 'routine-q2', type: 'fill-blank', prompt: 'Complete: “I ___ breakfast at seven.”', answer: 'have' },
      { id: 'routine-q3', type: 'true-false', prompt: '“Usually” means something happens in most cases.', answer: 'true' },
      { id: 'routine-q4', type: 'multiple-choice', prompt: 'What does “commute” mean?', options: ['travel regularly to work or school', 'cook dinner', 'go to sleep'], answer: 'travel regularly to work or school' },
      { id: 'routine-q5', type: 'fill-blank', prompt: 'Complete: “I commute ___ bus.”', answer: 'by' },
      { id: 'routine-q6', type: 'multiple-choice', prompt: 'Choose the correct word order.', options: ['She often walks to work.', 'She walks often to work.', 'Often she to work walks.'], answer: 'She often walks to work.' },
      { id: 'routine-q7', type: 'true-false', prompt: '“I usually have breakfast at seven” describes a routine.', answer: 'true' },
      { id: 'routine-q8', type: 'fill-blank', prompt: 'Complete: “He ___ to work every morning.”', answer: 'goes' },
      { id: 'routine-q9', type: 'multiple-choice', prompt: 'Which phrase tells how often?', options: ['every day', 'at the station', 'a sandwich'], answer: 'every day' },
      { id: 'routine-q10', type: 'true-false', prompt: '“I wake up usually early” is the most natural word order.', answer: 'false' },
    ],
  },
];

export function getLessons() { return lessons; }
export function getLesson(id: string) { return lessons.find((lesson) => lesson.id === id); }

// Hàm tạo hẳn 1 chủ đề bài học mới (nếu cần thêm ở Trang chủ)
export function addNewLesson(newLesson: Lesson) {
  lessons.push(newLesson);
}

// Hàm thêm 1 từ vựng mới vào đúng bài học có sẵn
export function addVocabularyToLesson(lessonId: string, newVocab: Vocabulary) {
  const lesson = lessons.find((item) => item.id === lessonId);
  if (lesson) {
    lesson.vocabulary.push(newVocab);
  }
}

//Hàm thêm 1 ngữ pháp mới vào đúng bài học có sẵn
export function addGrammarToLesson(lessonId: string, newGrammar: GrammarItem) {
  const lesson = lessons.find((item) => item.id === lessonId);
  if (lesson) {
    if (!lesson.grammar) {
      lesson.grammar = [];
    }
    lesson.grammar.push(newGrammar);
  }
}
