import { useLocalSearchParams, Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '@/components/ui/app-button';
import { VocabularyCard } from '@/components/learn/vocabulary-card';
import { Flashcard, FlashcardButtons, FlashcardIconButton } from '@/components/learn/flashcard';
import { PronunciationMic } from '@/components/learn/pronunciation-mic';
import { GrammarPoint } from '@/components/learn/grammar-point';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { getProgress, markLessonComplete, toggleFavoriteWord } from '@/services/storage-service';
import { speakEnglishWord } from '@/services/speech-service';
import {
  getLesson,
  addVocabularyToLesson,
  addGrammarToLesson,
} from '@/services/lesson-service';
import type { Vocabulary, GrammarItem } from '@/types/lesson';

let vocabularyIdSequence = 0;

function createVocabularyId() {
  vocabularyIdSequence += 1;
  return `v_${Date.now()}_${vocabularyIdSequence}`;
}

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const lesson = getLesson(id);

  // Lesson completion state (kept from the original project logic)
  const [done, setDone] = useState(false);

  // Memrise-style study card state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // Forces a re-render right after vocabulary/grammar is added
  const [, setRefreshKey] = useState(0);

  // State for the "add lesson content" modal
  const [modalVisible, setModalVisible] = useState(false);
  const [addType, setAddType] = useState<'vocab' | 'grammar'>('vocab');

  // Inputs for the new vocabulary entry
  const [word, setWord] = useState('');
  const [pronunciation, setPronunciation] = useState('');
  const [meaning, setMeaning] = useState('');

  // Inputs for the new grammar entry
  const [grammarTitle, setGrammarTitle] = useState('');
  const [grammarExplanation, setGrammarExplanation] = useState('');
  const [grammarExample, setGrammarExample] = useState('');

  useEffect(() => {
    void getProgress().then((progress) => {
      setDone(progress.completedLessonIds.includes(id));
      setFavoriteIds(progress.favoriteWordIds ?? []);
    });
  }, [id]);

  if (!lesson) {
    return (
      <Screen>
        <ThemedText type="title">Lesson not found</ThemedText>
        <Link href="/(main)/learn" style={{ color: '#5EEAD4', marginTop: 12 }}>
          Back to lessons
        </Link>
      </Screen>
    );
  }

  const vocabList = lesson.vocabulary;
  const currentVocab = vocabList[currentIndex] || vocabList[0];
  const progressPercent =
    vocabList.length > 0 ? ((currentIndex + 1) / vocabList.length) * 100 : 0;
  const isFavorite = currentVocab ? favoriteIds.includes(currentVocab.id) : false;

  const handleToggleFavorite = async () => {
    if (!currentVocab) return;
    try {
      const next = await toggleFavoriteWord(currentVocab.id);
      setFavoriteIds(next);
    } catch {
      Alert.alert('Không lưu được', 'Không thể cập nhật từ yêu thích. Vui lòng thử lại.');
    }
  };

  // Move to the next vocabulary card (Memrise style)
  const handleNextCard = () => {
    if (currentIndex < vocabList.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      Alert.alert(
        'Đã xem hết thẻ từ vựng!',
        'Bạn có thể ôn lại danh sách bên dưới hoặc bấm hoàn thành bài học.'
      );
      setCurrentIndex(0);
    }
  };

  // Persist the new entry through lesson-service.ts (AsyncStorage + Firestore)
  const handleSaveNewContent = async () => {
    if (addType === 'vocab') {
      if (!word.trim() || !meaning.trim()) {
        Alert.alert('Thiếu thông tin', 'Vui lòng nhập từ tiếng Anh và nghĩa.');
        return;
      }
      const newVocab: Vocabulary = {
        id: createVocabularyId(),
        word: word.trim(),
        pronunciation: pronunciation.trim() || '/.../',
        meaning: meaning.trim(),
      };
      try {
        await addVocabularyToLesson(lesson.id, newVocab);
      } catch {
        Alert.alert('Không lưu được', 'Không thể lưu từ vựng mới. Vui lòng thử lại.');
        return;
      }
      setCurrentIndex(lesson.vocabulary.length); // Jump to the vocabulary just added
      setWord('');
      setPronunciation('');
      setMeaning('');
    } else {
      if (!grammarTitle.trim() || !grammarExplanation.trim()) {
        Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề và giải thích ngữ pháp.');
        return;
      }
      const newGrammar: GrammarItem = {
        title: grammarTitle.trim(),
        explanation: grammarExplanation.trim(),
        example: grammarExample.trim() || 'No example provided.',
      };
      try {
        await addGrammarToLesson(lesson.id, newGrammar);
      } catch {
        Alert.alert('Không lưu được', 'Không thể lưu ngữ pháp mới. Vui lòng thử lại.');
        return;
      }
      setGrammarTitle('');
      setGrammarExplanation('');
      setGrammarExample('');
    }

    setRefreshKey((prev) => prev + 1);
    setModalVisible(false);
  };

  return (
    <Screen>
      {/* TITLE BAR & PROGRESS, MEMRISE STYLE */}
      <View style={styles.memriseHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
          <Ionicons name="close" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {lesson.title}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* Button that opens the add lesson content modal */}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.headerIconBtn}
        >
          <Ionicons name="add-circle" size={26} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ThemedText type="small" themeColor="muted" style={styles.descriptionText}>
        {lesson.description}
      </ThemedText>

      {/* LARGE STUDY CARD AREA, MEMRISE STYLE */}
      {currentVocab && (
        <Flashcard
          word={currentVocab}
          label={`THẺ HỌC (${currentIndex + 1}/${vocabList.length})`}
        >
          {/* Round action buttons plus the yellow mic button, Memrise style */}
          <View style={styles.actionRow}>
            <View style={styles.circleGroup}>
              <FlashcardIconButton
                icon="volume-high"
                accessibilityLabel={`Phát âm ${currentVocab.word}`}
                onPress={() => speakEnglishWord(currentVocab.word)}
              />
              <FlashcardIconButton
                icon={isFavorite ? 'heart' : 'heart-outline'}
                color={isFavorite ? '#EF4444' : '#0F172A'}
                onPress={() => void handleToggleFavorite()}
              />
            </View>

            <PronunciationMic word={currentVocab.word} size={48} buttonStyle={styles.micBtn} />
          </View>

          {/* The two navigation buttons that are characteristic of Memrise */}
          <FlashcardButtons
            knownLabel="Tôi đã biết từ này"
            onKnown={handleNextCard}
            nextLabel="Tiếp tục"
            onNext={handleNextCard}
          />
        </Flashcard>
      )}

      {/* VOCABULARY LIST (reuses the existing VocabularyCard component) */}
      <View style={styles.sectionHeaderRow}>
        <ThemedText type="subtitle">Vocabulary ({lesson.vocabulary.length})</ThemedText>
        <TouchableOpacity onPress={() => { setAddType('vocab'); setModalVisible(true); }}>
          <Text style={styles.addLinkText}>+ Thêm từ</Text>
        </TouchableOpacity>
      </View>

      {lesson.vocabulary.map((item) => (
        <VocabularyCard key={item.id || item.word} word={item} />
      ))}

      {/* GRAMMAR SECTION (reuses the existing GrammarPoint component) */}
      <View style={styles.sectionHeaderRow}>
        <ThemedText type="subtitle">
          Grammar ({lesson.grammar?.length || 0})
        </ThemedText>
        <TouchableOpacity onPress={() => { setAddType('grammar'); setModalVisible(true); }}>
          <Text style={styles.addLinkText}>+ Thêm ngữ pháp</Text>
        </TouchableOpacity>
      </View>

      {lesson.grammar && lesson.grammar.length > 0 ? (
        lesson.grammar.map((g, index) => (
          <GrammarPoint
            key={`${g.title}-${index}`}
            title={g.title}
            explanation={g.explanation}
            example={g.example}
          />
        ))
      ) : (
        <ThemedText type="small" themeColor="muted" style={styles.emptyText}>
          Chưa có điểm ngữ pháp nào cho bài học này.
        </ThemedText>
      )}

      {/* EXISTING "COMPLETE LESSON" BUTTON */}
      <View style={{ marginTop: 16, marginBottom: 32 }}>
        <AppButton
          title={done ? 'Lesson completed' : 'Mark lesson complete'}
          disabled={done}
          onPress={() => {
            void markLessonComplete(lesson.id).then(() => setDone(true));
          }}
        />
      </View>

      {/* MODAL FOR ADDING NEW VOCABULARY / GRAMMAR */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>Viết thêm nội dung bài học</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Tabs that switch between adding vocabulary and grammar */}
            <View style={styles.tabSwitch}>
              <TouchableOpacity
                style={[styles.tabBtn, addType === 'vocab' && styles.tabBtnActive]}
                onPress={() => setAddType('vocab')}
              >
                <Text style={[styles.tabText, addType === 'vocab' && styles.tabTextActive]}>
                  Từ vựng mới
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, addType === 'grammar' && styles.tabBtnActive]}
                onPress={() => setAddType('grammar')}
              >
                <Text style={[styles.tabText, addType === 'grammar' && styles.tabTextActive]}>
                  Ngữ pháp mới
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input form for the selected tab */}
            {addType === 'vocab' ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Từ tiếng Anh (vd: let's go!)"
                  placeholderTextColor="#64748B"
                  value={word}
                  onChangeText={setWord}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phiên âm (vd: /lets ɡoʊ/)"
                  placeholderTextColor="#64748B"
                  value={pronunciation}
                  onChangeText={setPronunciation}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nghĩa tiếng Việt (vd: đi thôi!)"
                  placeholderTextColor="#64748B"
                  value={meaning}
                  onChangeText={setMeaning}
                />
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Tiêu đề cấu trúc (vd: S + usually + V)"
                  placeholderTextColor="#64748B"
                  value={grammarTitle}
                  onChangeText={setGrammarTitle}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Giải thích cách dùng"
                  placeholderTextColor="#64748B"
                  value={grammarExplanation}
                  onChangeText={setGrammarExplanation}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Câu ví dụ minh họa"
                  placeholderTextColor="#64748B"
                  value={grammarExample}
                  onChangeText={setGrammarExample}
                />
              </>
            )}

            {/* Save button */}
            <TouchableOpacity style={styles.saveBtn} onPress={() => void handleSaveNewContent()}>
              <Text style={styles.saveBtnText}>Lưu vào bài học</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  memriseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5EEAD4',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 10,
  },
  headerIconBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0F172A',
  },
  descriptionText: {
    fontSize: 14,
    marginTop: 10,
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },
  circleGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  micBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FACC15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  addLinkText: {
    color: '#5EEAD4',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyText: {
    fontStyle: 'italic',
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  modalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#334155',
  },
  tabText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#5EEAD4',
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#5EEAD4',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
});

