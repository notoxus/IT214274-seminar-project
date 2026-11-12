import { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { StatCard } from '@/components/statistic/stat-card';
import { ProgressChart } from '@/components/statistic/progress-chart';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { getLessons } from '@/services/lesson-service';
import { getProgress } from '@/services/storage-service';
import type { LearningProgress } from '@/types/statistic';

const EMPTY: LearningProgress = {
  completedLessonIds: [],
  completedQuizzes: 0,
  correctAnswers: 0,
  totalQuestions: 0,
  averageScore: 0,
  quizHistory: [],
  wrongAnswers: [],
  streakDays: 0
};

export default function StatisticScreen() {
  const [progress, setProgress] = useState<LearningProgress>(EMPTY);

  // Load progress whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      void getProgress().then((data) => {
        if (isActive) setProgress(data);
      });
      return () => {
        isActive = false;
      };
    }, [])
  );

  return (
    <Screen>
      <View style={styles.container}>
        <ThemedText type="title" style={styles.title}>Your Learning Statistics</ThemedText>

        {/* Progress Chart / Overview */}
        <ProgressChart completed={progress.completedLessonIds.length} total={getLessons().length} />

        {/* Stat Cards Grid */}
        <View style={styles.row}>
          <StatCard label="Lessons Completed" value={progress.completedLessonIds.length} />
          <StatCard label="Quizzes Done" value={progress.completedQuizzes} />
        </View>

        <View style={styles.row}>
          <StatCard label="Correct Answers" value={progress.correctAnswers} />
          <StatCard label="Avg Score (%)" value={`${progress.averageScore || 0}%`} />
        </View>

        {/* Wrong Answers Section Summary */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Review Incorrect Questions</ThemedText>
          {progress.wrongAnswers && progress.wrongAnswers.length > 0 ? (
            <ThemedText style={styles.sectionSub}>
              You have {progress.wrongAnswers.length} question(s) saved for review.
            </ThemedText>
          ) : (
            <ThemedText style={styles.sectionSub}>
              Great job! No incorrect answers recorded yet.
            </ThemedText>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
    gap: 16,
  },
  title: {
    marginTop: 15,
    marginBottom: 5,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  section: {
    marginTop: 10,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 14,
    opacity: 0.7,
  },
});
