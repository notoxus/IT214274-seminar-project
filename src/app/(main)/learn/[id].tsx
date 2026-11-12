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
import { GrammarPoint } from '@/components/learn/grammar-point';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { getProgress, markLessonComplete } from '@/services/storage-service';
import {
  getLesson,
  addVocabularyToLesson,
  addGrammarToLesson,
} from '@/services/lesson-service';
import type { Vocabulary, GrammarItem } from '@/types/lesson';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const lesson = getLesson(id);

  // State tiến độ hoàn thành bài học (giữ nguyên logic gốc của dự án)
  const [done, setDone] = useState(false);

  // State điều khiển thẻ học kiểu Memrise
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  // State ép giao diện cập nhật lại ngay sau khi thêm từ vựng/ngữ pháp vào RAM
  const [, setRefreshKey] = useState(0);

  // State cho Modal thêm bài học / từ vựng / ngữ pháp mới
  const [modalVisible, setModalVisible] = useState(false);
  const [addType, setAddType] = useState<'vocab' | 'grammar'>('vocab');

  // Input cho Từ vựng mới
  const [word, setWord] = useState('');
  const [pronunciation, setPronunciation] = useState('');
  const [meaning, setMeaning] = useState('');

  // Input cho Ngữ pháp mới
  const [grammarTitle, setGrammarTitle] = useState('');
  const [grammarExplanation, setGrammarExplanation] = useState('');
  const [grammarExample, setGrammarExample] = useState('');

  useEffect(() => {
    void getProgress().then((progress) =>
      setDone(progress.completedLessonIds.includes(id))
    );
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

  // Chuyển sang thẻ từ vựng tiếp theo (phong cách Memrise)
  const handleNextCard = () => {
    if (currentIndex < vocabList.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFavorite(false);
    } else {
      Alert.alert(
        'Đã xem hết thẻ từ vựng!',
        'Bạn có thể ôn lại danh sách bên dưới hoặc bấm hoàn thành bài học.'
      );
      setCurrentIndex(0);
    }
  };

  // Xử lý lưu nội dung mới vào lesson-service.ts (RAM)
  const handleSaveNewContent = () => {
    if (addType === 'vocab') {
      if (!word.trim() || !meaning.trim()) {
        Alert.alert('Thiếu thông tin', 'Vui lòng nhập từ tiếng Anh và nghĩa.');
        return;
      }
      const newVocab: Vocabulary = {
        id: `v_${Date.now()}`,
        word: word.trim(),
        pronunciation: pronunciation.trim() || '/.../',
        meaning: meaning.trim(),
      };
      addVocabularyToLesson(lesson.id, newVocab);
      setCurrentIndex(lesson.vocabulary.length - 1); // Nhảy tới từ vừa thêm
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
      addGrammarToLesson(lesson.id, newGrammar);
      setGrammarTitle('');
      setGrammarExplanation('');
      setGrammarExample('');
    }

    setRefreshKey((prev) => prev + 1);
    setModalVisible(false);
  };

  return (
    <Screen>
      {/* THANH TIÊU ĐỀ & TIẾN ĐỘ PHONG CÁCH MEMRISE */}
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

        {/* Nút mở khung viết thêm bài học / từ vựng mới */}
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

      {/* KHU VỰC HỌC TỪNG THẺ LỚN KIỂU MEMRISE */}
      {currentVocab && (
        <View style={[styles.memriseStage, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ThemedText themeColor="muted" style={styles.stageLabel}>
            THẺ HỌC ({currentIndex + 1}/{vocabList.length})
          </ThemedText>
          <ThemedText themeColor="text" style={styles.stageWord}>{currentVocab.word}</ThemedText>
          <Text style={styles.stagePronun}>{currentVocab.pronunciation}</Text>

          <View style={styles.stageDivider} />

          <ThemedText themeColor="muted" style={styles.stageLabel}>NGHĨA TIẾNG VIỆT</ThemedText>
          <ThemedText themeColor="text" style={styles.stageMeaning}>{currentVocab.meaning}</ThemedText>

          {/* Cụm nút tròn chức năng + Nút Mic vàng giống Memrise */}
          <View style={styles.actionRow}>
            <View style={styles.circleGroup}>
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={() => Alert.alert('Phát âm', `Đang đọc: ${currentVocab.word}`)}
              >
                <Ionicons name="volume-high" size={18} color="#0F172A" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={() => setIsFavorite(!isFavorite)}
              >
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={18}
                  color={isFavorite ? '#EF4444' : '#0F172A'}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.micBtn}
              onPress={() => Alert.alert('Luyện nói', `Hãy phát âm từ "${currentVocab.word}"`)}
            >
              <Ionicons name="mic" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* 2 nút điều hướng đặc trưng của Memrise */}
          <View style={styles.memriseButtons}>
            <TouchableOpacity style={styles.knownBtn} onPress={handleNextCard}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#0F172A" />
              <Text style={styles.knownBtnText}>Tôi đã biết từ này</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.nextBtn} onPress={handleNextCard}>
              <Text style={styles.nextBtnText}>Tiếp tục</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* KHUNG CHỨA DANH SÁCH TỪ VỰNG (Dùng component VocabularyCard có sẵn) */}
      <View style={styles.sectionHeaderRow}>
        <ThemedText type="subtitle">Vocabulary ({lesson.vocabulary.length})</ThemedText>
        <TouchableOpacity onPress={() => { setAddType('vocab'); setModalVisible(true); }}>
          <Text style={styles.addLinkText}>+ Thêm từ</Text>
        </TouchableOpacity>
      </View>

      {lesson.vocabulary.map((item) => (
        <VocabularyCard key={item.id || item.word} word={item} />
      ))}

      {/* KHUNG CHỨA ĐIỂM NGỮ PHÁP (Dùng component GrammarPoint có sẵn) */}
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

      {/* NÚT HOÀN THÀNH BÀI HỌC CÓ SẴN CỦA DỰ ÁN */}
      <View style={{ marginTop: 16, marginBottom: 32 }}>
        <AppButton
          title={done ? 'Lesson completed' : 'Mark lesson complete'}
          disabled={done}
          onPress={() => {
            void markLessonComplete(lesson.id).then(() => setDone(true));
          }}
        />
      </View>

      {/* MODAL VIẾT THÊM TỪ VỰNG / NGỮ PHÁP MỚI */}
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

                        {/* Tab chuyển đổi giữa Thêm Từ Vựng và Thêm Ngữ Pháp */}
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

            {/* Form nhập liệu tương ứng với Tab đang chọn */}
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

            {/* Nút lưu nội dung mới */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveNewContent}>
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
  memriseStage: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  stageLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stageWord: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    marginTop: 4,
  },
  stagePronun: {
    fontSize: 15,
    color: '#5EEAD4',
    marginTop: 2,
  },
  stageDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 14,
  },
  stageMeaning: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    marginTop: 4,
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
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FACC15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memriseButtons: {
    marginTop: 16,
    gap: 10,
  },
  knownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  knownBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  nextBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FACC15',
    paddingVertical: 13,
    borderRadius: 10,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
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

