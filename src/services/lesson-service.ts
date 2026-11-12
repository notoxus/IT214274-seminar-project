import type { GrammarItem, Lesson, Vocabulary } from '@/types/lesson';

const lessons: Lesson[] = [
  {
    id: 'introductions',
    title: 'Making introductions',
    level: 'Beginner · 5 min',
    description: 'Learn a few friendly phrases for meeting someone for the first time.',
    vocabulary: [
      { id: 'v1', word: 'pleased', pronunciation: '/pliːzd/', meaning: 'vui, hài lòng' },
      { id: 'v2', word: 'currently', pronunciation: '/ˈkɜːrəntli/', meaning: 'hiện tại, vào lúc này' },
    ],
grammar: [
  { 
    title: 'Pleased to + Verb (nguyên mẫu)',
    explanation: 'Dùng để diễn tả sự vui mừng hoặc hài lòng khi làm điều gì đó lần đầu.',
    example: 'I am very pleased to meet you today.' 
  },
],
questions: [
  { id: 'intro-q1', type: 'multiple-choice', prompt: '"Nice to meet you" is used when...', options: ['meeting someone new', 'saying goodbye', 'asking for directions'], answer: 'meeting someone new', explanation: 'This is a greeting used when you are introduced to someone for the first time.' },
  { id: 'intro-q2', type: 'fill-blank', prompt: 'Complete: "Pleased ___ meet you."', answer: 'to', explanation: 'Use “pleased to” before a verb: “Pleased to meet you.”' },
  { id: 'intro-q3', type: 'true-false', prompt: '"Nice to meet you" is commonly said when you first meet someone.', answer: 'true', explanation: 'This phrase is a polite response when meeting someone for the first time.' },
  { id: 'intro-q4', type: 'multiple-choice', prompt: 'Which is a polite way to introduce yourself?', options: ['Hi, I\'m Mai.', 'Go away,', 'currently'], answer: 'Hi, I\'m Mai.', explanation: '“Hi, I’m …” is a friendly, natural way to say your name.' },
  { id: 'intro-q5', type: 'fill-blank', prompt: 'Complete: "I ___ live in Hanoi."', answer: 'currently', explanation: '“Currently” means at the present time, so it fits before “live”.' },
  { id: 'intro-q6', type: 'multiple-choice', prompt: 'What does "currently" mean?', options: ['at the present time', 'next year', 'never'], answer: 'at the present time', explanation: '“Currently” describes what is true now.' },
  { id: 'intro-q7', type: 'true-false', prompt: '"Pleased to meet you" is a formal greeting.', answer: 'true', explanation: 'It is a polite, slightly formal phrase used at an introduction.' },
  { id: 'intro-q8', type: 'multiple-choice', prompt: 'Choose a natural response to "Nice to meet you."', options: ['Nice to meet you too.', 'I am fine.', 'Goodbye.'], answer: 'Nice to meet you too.', explanation: '“Too” means you feel the same way: it is nice for you as well.' },
  { id: 'intro-q9', type: 'fill-blank', prompt: 'Complete: "Where ___ you from?"', answer: 'are', explanation: 'Use “are” with “you” in the question “Where are you from?”' },
  { id: 'intro-q10', type: 'true-false', prompt: 'You can say "I\'m from Vietnam" to tell someone where you are from.', answer: 'true', explanation: '“I’m from …” is the standard pattern for saying your country or hometown.' },
],
supplementalQuestions: [
  { id: 'intro-extra-1', type: 'fill-blank', prompt: 'Complete: "It is nice ___ meet you."', answer: 'to', explanation: 'Use “to” before the verb “meet” in this phrase.' },
  { id: 'intro-extra-2', type: 'multiple-choice', prompt: 'Choose the correct introduction.', options: ['My name is Linh.', 'Name me Linh.', 'I name Linh.'], answer: 'My name is Linh.', explanation: '“My name is …” is a common pattern for introducing your name.' },
  { id: 'intro-extra-3', type: 'true-false', prompt: 'You can ask “Where are you from?” to learn someone’s hometown or country.', answer: 'true', explanation: 'This question asks about a person’s place of origin.' },
],
  },
  {
    id: 'daily-routines',
    title: 'Daily routines',
    level: 'Beginner · 7 min',
    description: 'Talk about the things you do every day.',
    vocabulary: [
      { id: 'v3', word: 'commute', pronunciation: '/kəˈmjuːt/', meaning: 'đi lại hằng ngày giữa nhà và nơi làm việc hoặc trường học'},
      { id: 'v4', word: 'usually', pronunciation: '/ˈjuːʒuəli/', meaning: 'thường, thông thường'},
    ],
    grammar: [
      { title: 'Usually + Verb (nguyên mẫu)',
        explanation: 'Dùng để diễn tả hành động xảy ra thường xuyên.',
        example: 'I usually wake up early.' },
    ],
    questions: [
      { id: 'routine-q1', type: 'multiple-choice', prompt: 'Choose the natural sentence.', options: ['I usually wake up early.', 'I wake usually up early.', 'Usually I up wake early.'], answer: 'I usually wake up early.', explanation: 'Frequency adverbs like “usually” normally come before the main verb.' },
      { id: 'routine-q2', type: 'fill-blank', prompt: 'Complete: “I ___ breakfast at seven.”', answer: 'have', explanation: 'English commonly uses “have breakfast” to talk about eating breakfast.' },
      { id: 'routine-q3', type: 'true-false', prompt: '“Usually” means something happens in most cases.', answer: 'true', explanation: '“Usually” describes something that happens most of the time.' },
      { id: 'routine-q4', type: 'multiple-choice', prompt: 'What does “commute” mean?', options: ['travel regularly to work or school', 'cook dinner', 'go to sleep'], answer: 'travel regularly to work or school', explanation: 'A commute is the regular journey between home and work or school.' },
      { id: 'routine-q5', type: 'fill-blank', prompt: 'Complete: “I commute ___ bus.”', answer: 'by', explanation: 'Use “by” with a form of transport: by bus, by train, by car.' },
      { id: 'routine-q6', type: 'multiple-choice', prompt: 'Choose the correct word order.', options: ['She often walks to work.', 'She walks often to work.', 'Often she to work walks.'], answer: 'She often walks to work.', explanation: '“Often” usually goes before the main verb “walks”.' },
      { id: 'routine-q7', type: 'true-false', prompt: '“I usually have breakfast at seven” describes a routine.', answer: 'true', explanation: '“Usually” and a regular time describe a repeated daily habit.' },
      { id: 'routine-q8', type: 'fill-blank', prompt: 'Complete: “He ___ to work every morning.”', answer: 'goes', explanation: 'Use “goes” with “he” in the present simple.' },
      { id: 'routine-q9', type: 'multiple-choice', prompt: 'Which phrase tells how often?', options: ['every day', 'at the station', 'a sandwich'], answer: 'every day', explanation: '“Every day” tells how frequently something happens.' },
      { id: 'routine-q10', type: 'true-false', prompt: '“I wake up usually early” is the most natural word order.', answer: 'false', explanation: '“Usually” normally comes before the main verb: “I usually wake up early.”' },
    ],
    supplementalQuestions: [
      { id: 'routine-extra-1', type: 'fill-blank', prompt: 'Complete: “She ___ goes jogging before work.”', answer: 'often', explanation: '“Often” is a frequency adverb and comes before “goes”.' },
      { id: 'routine-extra-2', type: 'multiple-choice', prompt: 'Choose a phrase for a daily habit.', options: ['every morning', 'last summer', 'right now only'], answer: 'every morning', explanation: '“Every morning” describes something repeated each day.' },
      { id: 'routine-extra-3', type: 'true-false', prompt: '“He takes the train to work” can describe his commute.', answer: 'true', explanation: 'A commute is regular travel to work; taking the train is one way to commute.' },
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
