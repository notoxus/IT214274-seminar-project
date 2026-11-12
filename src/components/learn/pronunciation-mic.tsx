import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isRunningInExpoGo, requireOptionalNativeModule } from 'expo';

export type PronunciationMicProps = {
  word: string;
  size?: number;
  buttonStyle?: StyleProp<ViewStyle>;
};

// expo-speech-recognition has native code, so it is not bundled in Expo Go, and a
// freshly added config plugin needs a new development build. Importing the library
// there throws "Cannot find native module 'ExpoSpeechRecognition'" while the route is
// being loaded, which crashes the whole screen. Check first and load the real
// implementation lazily so the rest of the app keeps working either way.
const hasSpeechRecognition = requireOptionalNativeModule('ExpoSpeechRecognition') != null;

function loadSpeechRecognitionMic() {
  if (!hasSpeechRecognition) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const engine = require('./pronunciation-mic-engine') as typeof import('./pronunciation-mic-engine');
  return engine.PronunciationMicEngine;
}

const SpeechRecognitionMic = loadSpeechRecognitionMic();

export function PronunciationMic(props: PronunciationMicProps) {
  if (SpeechRecognitionMic) return <SpeechRecognitionMic {...props} />;
  return <UnavailableMic {...props} />;
}

function UnavailableMic({ word, size = 76, buttonStyle }: PronunciationMicProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Say ${word}`}
        accessibilityHint="Speech recognition is unavailable in this build"
        onPress={() => setShowHelp(true)}
        style={({ pressed }) => [
          styles.button,
          { width: size, height: size, borderRadius: size / 2 },
          pressed && styles.pressed,
          buttonStyle,
        ]}
      >
        <Ionicons name="mic-off" size={Math.round(size * 0.38)} color="#64748B" />
      </Pressable>
      {showHelp && (
        <View accessibilityLiveRegion="polite" style={styles.feedback}>
          <Text style={styles.error}>
            {isRunningInExpoGo()
              ? 'Speech practice is not available in Expo Go.'
              : 'Speech practice needs a development build.'}
          </Text>
          <Text style={styles.note}>
            Run `npx expo run:android` or `npx expo run:ios` to build the app with the speech recognition module.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 6 },
  button: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2E8F0' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  feedback: { maxWidth: 190, alignItems: 'center', gap: 2 },
  error: { color: '#C43F45', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  note: { color: '#64748B', fontSize: 10, textAlign: 'center' },
});
