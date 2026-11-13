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
  {
    id: 'animals',
    title: 'Animals & wildlife',
    level: 'Beginner · 8 min',
    description: 'Talk about animals, their homes, and the fight to protect them.',
    vocabulary: [
      { id: 'animal-v1', word: 'mammal', pronunciation: '/ˈmæməl/', meaning: 'động vật có vú' },
      { id: 'animal-v2', word: 'reptile', pronunciation: '/ˈreptaɪl/', meaning: 'động vật bò sát' },
      { id: 'animal-v3', word: 'predator', pronunciation: '/ˈpredətə(r)/', meaning: 'động vật săn mồi' },
      { id: 'animal-v4', word: 'prey', pronunciation: '/preɪ/', meaning: 'con mồi' },
      { id: 'animal-v5', word: 'habitat', pronunciation: '/ˈhæbɪtæt/', meaning: 'môi trường sống tự nhiên' },
      { id: 'animal-v6', word: 'species', pronunciation: '/ˈspiːʃiːz/', meaning: 'loài' },
      { id: 'animal-v7', word: 'endangered', pronunciation: '/ɪnˈdeɪndʒəd/', meaning: 'có nguy cơ tuyệt chủng' },
      { id: 'animal-v8', word: 'extinct', pronunciation: '/ɪkˈstɪŋkt/', meaning: 'tuyệt chủng' },
      { id: 'animal-v9', word: 'wildlife', pronunciation: '/ˈwaɪldlaɪf/', meaning: 'động vật hoang dã' },
      { id: 'animal-v10', word: 'domesticate', pronunciation: '/dəˈmestɪkeɪt/', meaning: 'thuần hóa' },
      { id: 'animal-v11', word: 'livestock', pronunciation: '/ˈlaɪvstɒk/', meaning: 'gia súc, vật nuôi' },
      { id: 'animal-v12', word: 'migrate', pronunciation: '/maɪˈɡreɪt/', meaning: 'di cư' },
    ],
    grammar: [
      {
        title: 'So sánh hơn: -er / more + adjective',
        explanation: 'Thêm -er vào tính từ ngắn và dùng more với tính từ dài để so sánh hai sự vật.',
        example: 'An elephant is bigger than a cat. A tiger is more dangerous than a rabbit.',
      },
    ],
    questions: [
      { id: 'animals-q1', type: 'multiple-choice', prompt: 'Which animal is a mammal?', options: ['dolphin', 'snake', 'frog'], answer: 'dolphin', explanation: 'Dolphins breathe air and feed their babies milk, so they are mammals.' },
      { id: 'animals-q2', type: 'fill-blank', prompt: 'Complete: "A ___ hunts other animals for food."', answer: 'predator', explanation: 'A predator catches and eats other animals; the animal it hunts is its prey.' },
      { id: 'animals-q3', type: 'true-false', prompt: 'An endangered species is at risk of becoming extinct.', answer: 'true', explanation: '“Endangered” describes a species with very few individuals left.' },
      { id: 'animals-q4', type: 'multiple-choice', prompt: 'What does “habitat” mean?', options: ['the natural home of an animal', 'the food an animal eats', 'a baby animal'], answer: 'the natural home of an animal', explanation: 'A habitat is the place where a plant or animal naturally lives.' },
      { id: 'animals-q5', type: 'fill-blank', prompt: 'Complete: "Many birds ___ south for the winter."', answer: 'migrate', explanation: 'To migrate means to travel to another place when the seasons change.' },
      { id: 'animals-q6', type: 'multiple-choice', prompt: 'Choose the correct comparative: "An elephant is ___ than a cat."', options: ['bigger', 'more big', 'biggest'], answer: 'bigger', explanation: 'Short adjectives take -er: big → bigger. Use “than” after the comparative.' },
      { id: 'animals-q7', type: 'true-false', prompt: '“Extinct” means a species no longer exists.', answer: 'true', explanation: 'Dinosaurs are extinct: no living members of the species remain.' },
      { id: 'animals-q8', type: 'multiple-choice', prompt: 'Which word means animals kept on a farm?', options: ['livestock', 'wildlife', 'prey'], answer: 'livestock', explanation: 'Livestock are farm animals such as cows, sheep, and chickens.' },
      { id: 'animals-q9', type: 'fill-blank', prompt: 'Complete: "The giant panda is an ___ species."', answer: 'endangered', explanation: 'The giant panda is protected because its population is at risk.' },
      { id: 'animals-q10', type: 'true-false', prompt: 'A predator is the animal that is hunted.', answer: 'false', explanation: 'The predator does the hunting; the animal being hunted is the prey.' },
    ],
    supplementalQuestions: [
      { id: 'animals-extra-1', type: 'fill-blank', prompt: 'Complete: "A ___ is a cold-blooded animal covered in scales."', answer: 'reptile', explanation: 'Snakes, lizards, and crocodiles are reptiles.' },
      { id: 'animals-extra-2', type: 'multiple-choice', prompt: 'What is “wildlife”?', options: ['animals living naturally in the wild', 'animals kept as pets', 'plants grown on farms'], answer: 'animals living naturally in the wild', explanation: 'Wildlife refers to animals and plants living freely in nature.' },
      { id: 'animals-extra-3', type: 'true-false', prompt: 'Dogs were domesticated from wild wolves.', answer: 'true', explanation: 'Domestication is the long process of taming wild animals for human use.' },
    ],
  },
  {
    id: 'culture',
    title: 'Culture & traditions',
    level: 'Intermediate · 9 min',
    description: 'Explore heritage, festivals, and the customs that shape a community.',
    vocabulary: [
      { id: 'culture-v1', word: 'heritage', pronunciation: '/ˈherɪtɪdʒ/', meaning: 'di sản' },
      { id: 'culture-v2', word: 'tradition', pronunciation: '/trəˈdɪʃn/', meaning: 'truyền thống' },
      { id: 'culture-v3', word: 'custom', pronunciation: '/ˈkʌstəm/', meaning: 'phong tục, tập quán' },
      { id: 'culture-v4', word: 'ritual', pronunciation: '/ˈrɪtʃuəl/', meaning: 'nghi lễ' },
      { id: 'culture-v5', word: 'ancestor', pronunciation: '/ˈænsestə(r)/', meaning: 'tổ tiên' },
      { id: 'culture-v6', word: 'folklore', pronunciation: '/ˈfəʊklɔː(r)/', meaning: 'văn hóa dân gian' },
      { id: 'culture-v7', word: 'festival', pronunciation: '/ˈfestɪvl/', meaning: 'lễ hội' },
      { id: 'culture-v8', word: 'cuisine', pronunciation: '/kwɪˈziːn/', meaning: 'ẩm thực' },
      { id: 'culture-v9', word: 'identity', pronunciation: '/aɪˈdentəti/', meaning: 'bản sắc' },
      { id: 'culture-v10', word: 'generation', pronunciation: '/ˌdʒenəˈreɪʃn/', meaning: 'thế hệ' },
      { id: 'culture-v11', word: 'multicultural', pronunciation: '/ˌmʌltiˈkʌltʃərəl/', meaning: 'đa văn hóa' },
      { id: 'culture-v12', word: 'preserve', pronunciation: '/prɪˈzɜːv/', meaning: 'gìn giữ, bảo tồn' },
    ],
    grammar: [
      {
        title: 'Mệnh đề quan hệ: who / which / where',
        explanation: 'Dùng who cho người, which cho vật, và where cho nơi chốn để bổ sung thông tin cho danh từ.',
        example: 'This is the festival which takes place in spring. She is the artist who paints folk scenes.',
      },
    ],
    questions: [
      { id: 'culture-q1', type: 'multiple-choice', prompt: '___ is the traditional food of a country or region.', options: ['Cuisine', 'Custom', 'Folklore'], answer: 'Cuisine', explanation: 'Cuisine refers to a style of cooking, especially of a particular country.' },
      { id: 'culture-q2', type: 'fill-blank', prompt: 'Complete: "A ___ is a ceremony that follows a fixed pattern."', answer: 'ritual', explanation: 'A ritual is a set of actions performed in a traditional ceremony.' },
      { id: 'culture-q3', type: 'true-false', prompt: 'Heritage can include buildings, traditions, and language.', answer: 'true', explanation: 'Heritage is everything valuable passed down from earlier generations.' },
      { id: 'culture-q4', type: 'multiple-choice', prompt: '“Ancestors” are...', options: ['family members from long ago', 'young children', 'people from other countries'], answer: 'family members from long ago', explanation: 'Your ancestors are the people in your family who lived before you.' },
      { id: 'culture-q5', type: 'fill-blank', prompt: 'Complete: "Tết is the most important ___ in Vietnam."', answer: 'festival', explanation: 'A festival is a public celebration with special activities and food.' },
      { id: 'culture-q6', type: 'multiple-choice', prompt: 'Choose the correct relative clause: "This is the festival ___ takes place in spring."', options: ['which', 'who', 'whose'], answer: 'which', explanation: 'Use “which” for things; “who” is used for people.' },
      { id: 'culture-q7', type: 'true-false', prompt: 'Folklore includes traditional stories and songs.', answer: 'true', explanation: 'Folklore is the traditional stories, beliefs, and music of a community.' },
      { id: 'culture-q8', type: 'multiple-choice', prompt: 'A sense of ___ connects people to their culture.', options: ['identity', 'cuisine', 'generation'], answer: 'identity', explanation: 'Cultural identity is the feeling of belonging to a particular culture.' },
      { id: 'culture-q9', type: 'fill-blank', prompt: 'Complete: "We should ___ old buildings for future generations."', answer: 'preserve', explanation: 'To preserve something is to keep it in good condition so it is not lost.' },
      { id: 'culture-q10', type: 'true-false', prompt: 'A multicultural society has people from many different cultures.', answer: 'true', explanation: 'The prefix “multi-” means many, so multicultural means many cultures together.' },
    ],
    supplementalQuestions: [
      { id: 'culture-extra-1', type: 'fill-blank', prompt: 'Complete: "A ___ is a traditional way of behaving in a society."', answer: 'custom', explanation: 'Customs are usual behaviours that a group of people follow.' },
      { id: 'culture-extra-2', type: 'multiple-choice', prompt: 'People of the same ___ are born around the same time.', options: ['generation', 'ancestor', 'festival'], answer: 'generation', explanation: 'A generation is all the people born at about the same time.' },
      { id: 'culture-extra-3', type: 'true-false', prompt: 'The word “heritage” relates to traditions passed down over time.', answer: 'true', explanation: 'Heritage comes from the past and is passed on to future generations.' },
    ],
  },
  {
    id: 'environment',
    title: 'Environment & climate',
    level: 'Intermediate · 10 min',
    description: 'Learn the words you need to talk about climate change and protecting nature.',
    vocabulary: [
      { id: 'environment-v1', word: 'sustainable', pronunciation: '/səˈsteɪnəbl/', meaning: 'bền vững' },
      { id: 'environment-v2', word: 'pollution', pronunciation: '/pəˈluːʃn/', meaning: 'sự ô nhiễm' },
      { id: 'environment-v3', word: 'emission', pronunciation: '/ɪˈmɪʃn/', meaning: 'khí thải' },
      { id: 'environment-v4', word: 'renewable', pronunciation: '/rɪˈnjuːəbl/', meaning: 'có thể tái tạo' },
      { id: 'environment-v5', word: 'deforestation', pronunciation: '/ˌdiːˌfɒrɪˈsteɪʃn/', meaning: 'nạn phá rừng' },
      { id: 'environment-v6', word: 'biodiversity', pronunciation: '/ˌbaɪəʊdaɪˈvɜːsəti/', meaning: 'đa dạng sinh học' },
      { id: 'environment-v7', word: 'conservation', pronunciation: '/ˌkɒnsəˈveɪʃn/', meaning: 'sự bảo tồn' },
      { id: 'environment-v8', word: 'climate', pronunciation: '/ˈklaɪmət/', meaning: 'khí hậu' },
      { id: 'environment-v9', word: 'drought', pronunciation: '/draʊt/', meaning: 'hạn hán' },
      { id: 'environment-v10', word: 'recycle', pronunciation: '/ˌriːˈsaɪkl/', meaning: 'tái chế' },
      { id: 'environment-v11', word: 'ecosystem', pronunciation: '/ˈiːkəʊsɪstəm/', meaning: 'hệ sinh thái' },
      { id: 'environment-v12', word: 'carbon footprint', pronunciation: '/ˌkɑːbən ˈfʊtprɪnt/', meaning: 'dấu chân carbon' },
    ],
    grammar: [
      {
        title: 'Câu điều kiện loại 1: If + hiện tại đơn, will + verb',
        explanation: 'Dùng để nói về một kết quả có thể xảy ra trong tương lai nếu điều kiện hiện tại được thỏa mãn.',
        example: 'If we plant more trees, the air will be cleaner.',
      },
    ],
    questions: [
      { id: 'environment-q1', type: 'multiple-choice', prompt: '___ energy comes from the sun and wind.', options: ['Renewable', 'Endangered', 'Digital'], answer: 'Renewable', explanation: 'Renewable energy sources are naturally replaced, unlike coal or oil.' },
      { id: 'environment-q2', type: 'fill-blank', prompt: 'Complete: "Air ___ is a major problem in big cities."', answer: 'pollution', explanation: 'Pollution is the damage caused by harmful substances in the air, water, or land.' },
      { id: 'environment-q3', type: 'true-false', prompt: 'Deforestation means cutting down forests.', answer: 'true', explanation: 'Deforestation is the large-scale removal of trees from an area.' },
      { id: 'environment-q4', type: 'multiple-choice', prompt: 'What is “biodiversity”?', options: ['the variety of living things', 'the amount of rain', 'a type of pollution'], answer: 'the variety of living things', explanation: 'Biodiversity measures how many different species live in a place.' },
      { id: 'environment-q5', type: 'fill-blank', prompt: 'Complete: "We should ___ paper and plastic instead of throwing them away."', answer: 'recycle', explanation: 'To recycle is to process waste so it can be used again.' },
      { id: 'environment-q6', type: 'multiple-choice', prompt: 'Choose the first conditional: "If we ___ less, the air will be cleaner."', options: ['drive', 'will drive', 'drove'], answer: 'drive', explanation: 'After “if”, use the present simple; use “will + verb” in the result clause.' },
      { id: 'environment-q7', type: 'true-false', prompt: 'A drought is a long period with very little rain.', answer: 'true', explanation: 'Droughts dry out the land and can damage crops.' },
      { id: 'environment-q8', type: 'multiple-choice', prompt: 'Which gas is a common “emission” from cars?', options: ['carbon dioxide', 'oxygen', 'water vapour'], answer: 'carbon dioxide', explanation: 'Burning fuel in cars releases carbon dioxide, a greenhouse gas.' },
      { id: 'environment-q9', type: 'fill-blank', prompt: 'Complete: "___ development meets today needs without harming the future."', answer: 'sustainable', explanation: 'Sustainable development balances present needs with protecting the planet.' },
      { id: 'environment-q10', type: 'true-false', prompt: 'Conservation helps protect the natural environment.', answer: 'true', explanation: 'Conservation is the protection and careful management of nature.' },
    ],
    supplementalQuestions: [
      { id: 'environment-extra-1', type: 'fill-blank', prompt: 'Complete: "The ___ is the usual weather of a place over time."', answer: 'climate', explanation: 'Climate describes long-term weather patterns, not one day of weather.' },
      { id: 'environment-extra-2', type: 'multiple-choice', prompt: 'What is an “ecosystem”?', options: ['living things and their environment', 'a type of car', 'a weather report'], answer: 'living things and their environment', explanation: 'An ecosystem includes plants, animals, and the environment they share.' },
      { id: 'environment-extra-3', type: 'true-false', prompt: 'Your carbon footprint is the carbon dioxide your actions produce.', answer: 'true', explanation: 'Diet, travel, and electricity all add to your carbon footprint.' },
    ],
  },
  {
    id: 'technology',
    title: 'Technology & innovation',
    level: 'Intermediate · 9 min',
    description: 'Build the vocabulary to discuss devices, software, and artificial intelligence.',
    vocabulary: [
      { id: 'technology-v1', word: 'innovation', pronunciation: '/ˌɪnəˈveɪʃn/', meaning: 'sự đổi mới, sáng kiến' },
      { id: 'technology-v2', word: 'artificial intelligence', pronunciation: '/ˌɑːtɪfɪʃl ɪnˈtelɪdʒəns/', meaning: 'trí tuệ nhân tạo' },
      { id: 'technology-v3', word: 'algorithm', pronunciation: '/ˈælɡərɪðəm/', meaning: 'thuật toán' },
      { id: 'technology-v4', word: 'automate', pronunciation: '/ˈɔːtəmeɪt/', meaning: 'tự động hóa' },
      { id: 'technology-v5', word: 'device', pronunciation: '/dɪˈvaɪs/', meaning: 'thiết bị' },
      { id: 'technology-v6', word: 'digital', pronunciation: '/ˈdɪdʒɪtl/', meaning: 'kỹ thuật số' },
      { id: 'technology-v7', word: 'software', pronunciation: '/ˈsɒftweə(r)/', meaning: 'phần mềm' },
      { id: 'technology-v8', word: 'hardware', pronunciation: '/ˈhɑːdweə(r)/', meaning: 'phần cứng' },
      { id: 'technology-v9', word: 'network', pronunciation: '/ˈnetwɜːk/', meaning: 'mạng lưới, mạng máy tính' },
      { id: 'technology-v10', word: 'cybersecurity', pronunciation: '/ˌsaɪbəsɪˈkjʊərəti/', meaning: 'an ninh mạng' },
      { id: 'technology-v11', word: 'virtual', pronunciation: '/ˈvɜːtʃuəl/', meaning: 'ảo, mô phỏng trên máy tính' },
      { id: 'technology-v12', word: 'upgrade', pronunciation: '/ˈʌpɡreɪd/', meaning: 'nâng cấp' },
    ],
    grammar: [
      {
        title: 'Thì hiện tại hoàn thành với already / yet',
        explanation: 'Dùng have/has + quá khứ phân từ để nói việc đã xảy ra; already dùng trong câu khẳng định, yet dùng trong phủ định và câu hỏi.',
        example: 'She has already installed the update. Have you finished the task yet?',
      },
    ],
    questions: [
      { id: 'technology-q1', type: 'multiple-choice', prompt: '___ is the ability of machines to learn and think.', options: ['Artificial intelligence', 'A network', 'Hardware'], answer: 'Artificial intelligence', explanation: 'Artificial intelligence (AI) lets machines perform tasks that normally need human intelligence.' },
      { id: 'technology-q2', type: 'fill-blank', prompt: 'Complete: "A set of steps a computer follows is called an ___."', answer: 'algorithm', explanation: 'An algorithm is a precise sequence of instructions for solving a problem.' },
      { id: 'technology-q3', type: 'true-false', prompt: 'Software is the physical part of a computer.', answer: 'false', explanation: 'Software is the programs; hardware is the physical equipment.' },
      { id: 'technology-q4', type: 'multiple-choice', prompt: 'What does “automate” mean?', options: ['make a process work by machine', 'repair a screen', 'delete a file'], answer: 'make a process work by machine', explanation: 'Automation lets machines do work with little or no human effort.' },
      { id: 'technology-q5', type: 'fill-blank', prompt: 'Complete: "You can ___ the app when a new version is available."', answer: 'upgrade', explanation: 'To upgrade is to replace something with a newer or better version.' },
      { id: 'technology-q6', type: 'multiple-choice', prompt: 'Choose the present perfect: "She ___ already installed the update."', options: ['has', 'have', 'is'], answer: 'has', explanation: 'Use “has” with he, she, or it: she has installed.' },
      { id: 'technology-q7', type: 'true-false', prompt: 'Cybersecurity protects computers and data from attacks.', answer: 'true', explanation: 'Cybersecurity covers the tools and practices used to keep systems safe.' },
      { id: 'technology-q8', type: 'multiple-choice', prompt: 'Which word means programs that run on a computer?', options: ['software', 'hardware', 'device'], answer: 'software', explanation: 'Apps, operating systems, and games are all software.' },
      { id: 'technology-q9', type: 'fill-blank', prompt: 'Complete: "A ___ is a machine or tool made for a particular purpose."', answer: 'device', explanation: 'Phones, tablets, and laptops are everyday devices.' },
      { id: 'technology-q10', type: 'true-false', prompt: 'A virtual meeting happens online rather than in person.', answer: 'true', explanation: '“Virtual” describes something created by computer rather than physically present.' },
    ],
    supplementalQuestions: [
      { id: 'technology-extra-1', type: 'fill-blank', prompt: 'Complete: "The internet is a global ___ that connects computers."', answer: 'network', explanation: 'A network is a group of connected computers or devices.' },
      { id: 'technology-extra-2', type: 'multiple-choice', prompt: 'What is “innovation”?', options: ['a new idea or method', 'an old machine', 'a type of cable'], answer: 'a new idea or method', explanation: 'Innovation is the introduction of new ideas, products, or ways of doing things.' },
      { id: 'technology-extra-3', type: 'true-false', prompt: 'Digital information is stored as numbers.', answer: 'true', explanation: 'Digital data is encoded as binary numbers, usually 0s and 1s.' },
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
