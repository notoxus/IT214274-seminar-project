import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadCloudDocument, saveCloudDocument } from '@/services/firebase-sync';
import { getSyncUserId } from '@/services/sync-session';
import type { GrammarItem, Lesson, Vocabulary } from '@/types/lesson';

const CUSTOM_LESSON_STORAGE_KEY = '@learning-english/custom-lessons';
const CLOUD_LESSON_DOCUMENT = 'lessonContent';

type CustomLessonContent = {
  vocabulary: Vocabulary[];
  grammar: GrammarItem[];
};

let customContent: Record<string, CustomLessonContent> = {};
let hydration: Promise<void> | null = null;

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

function isVocabulary(value: unknown): value is Vocabulary {
  const item = value as Partial<Vocabulary> | null;
  return !!item && typeof item.id === 'string' && typeof item.word === 'string' && typeof item.meaning === 'string';
}

function isGrammar(value: unknown): value is GrammarItem {
  const item = value as Partial<GrammarItem> | null;
  return !!item && typeof item.title === 'string' && typeof item.explanation === 'string';
}

function parseCustomContent(raw: string | null): Record<string, CustomLessonContent> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, Partial<CustomLessonContent> | null>;
    if (!parsed || typeof parsed !== 'object') return {};
    const result: Record<string, CustomLessonContent> = {};
    for (const [lessonId, value] of Object.entries(parsed)) {
      if (!value || typeof value !== 'object') continue;
      result[lessonId] = {
        vocabulary: Array.isArray(value.vocabulary) ? value.vocabulary.filter(isVocabulary) : [],
        grammar: Array.isArray(value.grammar) ? value.grammar.filter(isGrammar) : [],
      };
    }
    return result;
  } catch {
    return {};
  }
}

function mergeCustomContent(
  base: Record<string, CustomLessonContent>,
  incoming: Record<string, CustomLessonContent>
): Record<string, CustomLessonContent> {
  const merged: Record<string, CustomLessonContent> = { ...base };
  for (const [lessonId, extra] of Object.entries(incoming)) {
    const current = merged[lessonId] ?? { vocabulary: [], grammar: [] };
    const vocabIds = new Set(current.vocabulary.map((item) => item.id));
    const grammarKeys = new Set(current.grammar.map((item) => `${item.title}\u0000${item.explanation}\u0000${item.example}`));
    const vocabulary = [...current.vocabulary];
    for (const item of extra.vocabulary) {
      if (!vocabIds.has(item.id)) {
        vocabIds.add(item.id);
        vocabulary.push(item);
      }
    }
    const grammar = [...current.grammar];
    for (const item of extra.grammar) {
      const key = `${item.title}\u0000${item.explanation}\u0000${item.example}`;
      if (!grammarKeys.has(key)) {
        grammarKeys.add(key);
        grammar.push(item);
      }
    }
    merged[lessonId] = { vocabulary, grammar };
  }
  return merged;
}

function withCustomContent(lesson: Lesson): Lesson {
  const extra = customContent[lesson.id];
  if (!extra || (extra.vocabulary.length === 0 && extra.grammar.length === 0)) {
    return lesson;
  }
  const existingVocabIds = new Set(lesson.vocabulary.map((item) => item.id));
  return {
    ...lesson,
    vocabulary: [...lesson.vocabulary, ...extra.vocabulary.filter((item) => !existingVocabIds.has(item.id))],
    grammar: [...(lesson.grammar ?? []), ...extra.grammar],
  };
}

// Loads locally-added vocabulary/grammar from the device. Called once when the
// app boots so the first render already includes custom content.
export function loadCustomLessonContent(): Promise<void> {
  hydration ??= hydrateCustomContent();
  return hydration;
}

async function hydrateCustomContent() {
  try {
    customContent = parseCustomContent(await AsyncStorage.getItem(CUSTOM_LESSON_STORAGE_KEY));
  } catch {
    customContent = {};
  }
  // The cloud merge can run in the background: the local copy already renders.
  void syncCustomLessonContent();
}

// Pulls custom content from Firestore once the user is signed in, unions it
// with the local copy (custom content only grows), then writes both back.
export async function syncCustomLessonContent() {
  const uid = getSyncUserId();
  if (!uid) return;
  try {
    const remote = await loadCloudDocument<Record<string, CustomLessonContent>>(uid, CLOUD_LESSON_DOCUMENT);
    if (!remote) {
      if (Object.keys(customContent).length > 0) {
        await saveCloudDocument(uid, CLOUD_LESSON_DOCUMENT, customContent);
      }
      return;
    }
    const merged = mergeCustomContent(customContent, parseCustomContent(JSON.stringify(remote)));
    customContent = merged;
    await AsyncStorage.setItem(CUSTOM_LESSON_STORAGE_KEY, JSON.stringify(merged));
    await saveCloudDocument(uid, CLOUD_LESSON_DOCUMENT, merged);
  } catch (error) {
    console.warn('[lesson-content] Cloud sync failed, keeping local content', error);
  }
}

async function persistCustomContent(next: Record<string, CustomLessonContent>) {
  await AsyncStorage.setItem(CUSTOM_LESSON_STORAGE_KEY, JSON.stringify(next));
  const uid = getSyncUserId();
  if (uid) {
    // Local write is what the user is waiting for; cloud backup can finish later.
    void saveCloudDocument(uid, CLOUD_LESSON_DOCUMENT, next);
  }
}

export function getLessons() { return lessons.map(withCustomContent); }
export function getLesson(id: string) {
  const lesson = lessons.find((item) => item.id === id);
  return lesson ? withCustomContent(lesson) : undefined;
}

// Create a whole new lesson topic (used if the home screen ever needs one)
export function addNewLesson(newLesson: Lesson) {
  lessons.push(newLesson);
}

// Add a vocabulary entry to an existing lesson
export async function addVocabularyToLesson(lessonId: string, newVocab: Vocabulary) {
  if (!lessons.some((item) => item.id === lessonId)) return false;
  const current = customContent[lessonId] ?? { vocabulary: [], grammar: [] };
  const next: Record<string, CustomLessonContent> = {
    ...customContent,
    [lessonId]: { ...current, vocabulary: [...current.vocabulary, newVocab] },
  };
  await persistCustomContent(next);
  customContent = next;
  return true;
}

// Add a grammar point to an existing lesson
export async function addGrammarToLesson(lessonId: string, newGrammar: GrammarItem) {
  if (!lessons.some((item) => item.id === lessonId)) return false;
  const current = customContent[lessonId] ?? { vocabulary: [], grammar: [] };
  const next: Record<string, CustomLessonContent> = {
    ...customContent,
    [lessonId]: { ...current, grammar: [...current.grammar, newGrammar] },
  };
  await persistCustomContent(next);
  customContent = next;
  return true;
}
