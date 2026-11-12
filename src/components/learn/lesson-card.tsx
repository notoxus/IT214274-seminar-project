import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AppCard } from '@/components/ui/app-card';
import { Colors, Spacing } from '@/constants/constants';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Lesson } from '@/types/lesson';

export function LessonCard({ lesson }: { lesson: Lesson }) {
  const scheme = useColorScheme();
  const palette = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Link href={{ pathname: '/(main)/learn/[id]', params: { id: lesson.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.cardWrapper, pressed && { opacity: 0.75 }]}
      >
        <AppCard>
          <Text style={[styles.title, { color: palette.text }]}>{lesson.title}</Text>
          <Text style={{ color: palette.muted }}>{lesson.level}</Text>
          <Text style={{ color: palette.text }}>{lesson.description}</Text>
        </AppCard>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: '90%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
});
