import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { LessonCard } from '@/components/learn/lesson-card';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/constants';
import { useTheme } from '@/hooks/use-theme';
import { getLessons } from '@/services/lesson-service';
import { getProgress } from '@/services/storage-service';

export default function LearnScreen() {
  const theme = useTheme();
  const [streakCount, setStreakCount] = useState(0);

  // Auto check progress in that day
  useFocusEffect(
    useCallback(() => {
      void getProgress().then((p) => {
        setStreakCount(p.streakDays ?? 0);
      });
    }, [])
  );

  const hasStreak = streakCount > 0;

  return (
    <Screen>
      <View style={styles.topBar}>
        {/* App logo */}
        <ThemedText style={styles.logoText}>LearningEnglish App</ThemedText>

        {/* Streak */}
        <View
          style={[
            styles.streakBadge,
            { backgroundColor: hasStreak ? 'rgba(255, 59, 48, 0.12)' : 'transparent' },
          ]}
        >
          <Ionicons
            name={hasStreak ? 'flame' : 'flame-outline'}
            size={28}
            color={hasStreak ? '#FF3B30' : (theme.muted as string)}
          />
          <Text
            style={[
              styles.streakCount,
              { color: hasStreak ? '#FF3B30' : theme.muted },
            ]}
          >
            {streakCount}
          </Text>
        </View>
      </View>

      {/* Title */}
      <ThemedText type="title" style={styles.mainTitle}>
        What would you like to learn?
      </ThemedText>
      <ThemedText type="default" themeColor="muted">
        Short lessons to help you practise a little every day.
      </ThemedText>

      {/* Lesson list */}
      {getLessons().map((lesson) => (
        <LessonCard key={lesson.id} lesson={lesson} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
    marginBottom: Spacing.two,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  streakCount: {
    fontSize: 16,
    fontWeight: '800',
  },
  mainTitle: {
    marginTop: Spacing.one, 
  },
});
