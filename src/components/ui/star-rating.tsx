import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';

export function StarRating({ stars, size = 32 }: { stars: number; size?: number }) {
  const theme = useTheme();
  const safeStars = Math.max(0, Math.min(3, Math.floor(stars)));

  return (
    <View accessibilityRole="image" accessibilityLabel={`${safeStars} out of 3 stars`} style={styles.row}>
      {[0, 1, 2].map((index) => (
        <Ionicons
          key={index}
          name={index < safeStars ? 'star' : 'star-outline'}
          size={size}
          color={index < safeStars ? '#FACC15' : theme.muted}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 6 } });
