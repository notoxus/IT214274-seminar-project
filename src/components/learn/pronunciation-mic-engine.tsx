import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ExpoSpeechRecognitionModule,
  RecognizerIntentExtraLanguageModel,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

import type { PronunciationMicProps } from '@/components/learn/pronunciation-mic';

type ResultStatus = 'correct' | 'close' | 'incorrect';

function normalizeTranscript(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z\s']/g, '').replace(/\s+/g, ' ').trim();
}

function editDistance(left: string, right: string) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = row[0]!;
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const oldValue = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1));
      previous = oldValue;
    }
  }
  return row[right.length]!;
}

function comparePronunciation(targetWord: string, transcript: string, confidence: number): ResultStatus {
  const target = normalizeTranscript(targetWord);
  const spoken = normalizeTranscript(transcript);
  if (target === spoken) return confidence >= 0 && confidence < 0.45 ? 'close' : 'correct';
  const tolerance = target.length >= 7 ? 2 : 1;
  return editDistance(target, spoken) <= tolerance ? 'close' : 'incorrect';
}

const statusColors: Record<ResultStatus, string> = {
  correct: '#16834A',
  close: '#B77908',
  incorrect: '#C43F45',
};

const statusLabels: Record<ResultStatus, string> = {
  correct: 'Matched',
  close: 'Close — try again',
  incorrect: 'Not matched — try again',
};

export function PronunciationMicEngine({
  word,
  size = 76,
  buttonStyle,
}: PronunciationMicProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<ResultStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useSpeechRecognitionEvent('start', () => {
    setListening(true);
    setErrorMessage(null);
  });
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    const expected = normalizeTranscript(word);
    const result = event.results.find((candidate) => normalizeTranscript(candidate.transcript) === expected)
      ?? event.results[0];
    if (!result) return;
    setTranscript(result.transcript);
    if (event.isFinal) setStatus(comparePronunciation(word, result.transcript, result.confidence));
  });
  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    setStatus(event.error === 'no-speech' ? 'incorrect' : null);
    setErrorMessage(event.error === 'not-allowed'
      ? 'Microphone permission is needed to practice speaking.'
      : event.error === 'language-not-supported'
        ? 'English speech recognition is unavailable on this device.'
        : event.error === 'no-speech' || event.error === 'speech-timeout'
          ? 'No speech detected. Tap the mic and try again.'
          : 'Speech recognition is unavailable. Check your microphone and connection.');
  });

  const handlePress = async () => {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    setTranscript('');
    setStatus(null);
    setErrorMessage(null);
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Microphone permission is needed to practice speaking.');
        return;
      }
      ExpoSpeechRecognitionModule.start({
        lang: 'en-GB',
        interimResults: true,
        continuous: false,
        maxAlternatives: 3,
        androidIntentOptions: {
          EXTRA_LANGUAGE_MODEL: RecognizerIntentExtraLanguageModel.LANGUAGE_MODEL_WEB_SEARCH,
        },
      });
    } catch {
      setListening(false);
      setErrorMessage('Could not start speech recognition. Check microphone access.');
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Stop pronunciation recording' : `Say ${word}`}
        accessibilityState={{ busy: listening }}
        onPress={() => void handlePress()}
        style={({ pressed }) => [
          styles.button,
          { width: size, height: size, borderRadius: size / 2 },
          status && { backgroundColor: `${statusColors[status]}22` },
          pressed && styles.pressed,
          buttonStyle,
        ]}
      >
        <Ionicons name={listening ? 'stop' : 'mic'} size={Math.round(size * 0.38)} color={status ? statusColors[status] : '#0F172A'} />
      </Pressable>
      {listening && <Text style={styles.listening}>Listening…</Text>}
      {!listening && (transcript || errorMessage) && (
        <View accessibilityLiveRegion="polite" style={styles.feedback}>
          {transcript ? <Text style={styles.transcript} numberOfLines={2}>Heard: {transcript}</Text> : null}
          {status ? <Text style={[styles.status, { color: statusColors[status] }]}>{statusLabels[status]}</Text> : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <Text style={styles.note}>Transcript matching is an approximate pronunciation check.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 6 },
  button: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FACC15' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  listening: { color: '#B77908', fontSize: 12, fontWeight: '700' },
  feedback: { maxWidth: 190, alignItems: 'center', gap: 2 },
  transcript: { color: '#64748B', fontSize: 12, textAlign: 'center' },
  status: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  error: { color: '#C43F45', fontSize: 12, textAlign: 'center' },
  note: { color: '#64748B', fontSize: 10, textAlign: 'center' },
});
