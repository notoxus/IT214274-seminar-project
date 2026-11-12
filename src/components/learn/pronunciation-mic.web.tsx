import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ResultStatus = 'correct' | 'close' | 'incorrect';
type SpeechAlternative = { transcript: string; confidence: number };
type BrowserRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<SpeechAlternative> & { isFinal?: boolean }> }) => void) | null;
  start(): void;
  stop(): void;
};
type BrowserRecognitionConstructor = new () => BrowserRecognition;

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

const statusColors: Record<ResultStatus, string> = { correct: '#16834A', close: '#B77908', incorrect: '#C43F45' };
const statusLabels: Record<ResultStatus, string> = {
  correct: 'Matched',
  close: 'Close — try again',
  incorrect: 'Not matched — try again',
};

export function PronunciationMic({
  word,
  size = 76,
  buttonStyle,
}: {
  word: string;
  size?: number;
  buttonStyle?: StyleProp<ViewStyle>;
}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<ResultStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePress = () => {
    const browserWindow = typeof window === 'undefined' ? undefined : window as Window & {
      SpeechRecognition?: BrowserRecognitionConstructor;
      webkitSpeechRecognition?: BrowserRecognitionConstructor;
    };
    if (listening) return;
    const Recognition = browserWindow?.SpeechRecognition ?? browserWindow?.webkitSpeechRecognition;
    if (!Recognition) {
      setErrorMessage('Speech recognition is unavailable in this browser.');
      return;
    }

    setTranscript('');
    setStatus(null);
    setErrorMessage(null);
    const recognition = new Recognition();
    recognition.lang = 'en-GB';
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (event) => {
      setListening(false);
      setErrorMessage(event.error === 'not-allowed'
        ? 'Microphone permission is needed to practice speaking.'
        : event.error === 'no-speech'
          ? 'No speech detected. Tap the mic and try again.'
          : 'Speech recognition is unavailable. Check your microphone and connection.');
    };
    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const result = lastResult?.[0];
      if (!result) return;
      setTranscript(result.transcript);
      if (lastResult.isFinal) {
        const target = normalizeTranscript(word);
        const spoken = normalizeTranscript(result.transcript);
        const distance = editDistance(target, spoken);
        setStatus(target === spoken && (result.confidence < 0 || result.confidence >= 0.45)
          ? 'correct'
          : distance <= (target.length >= 7 ? 2 : 1) ? 'close' : 'incorrect');
      }
    };
    try {
      recognition.start();
    } catch {
      setListening(false);
      setErrorMessage('Could not start speech recognition. Check microphone access.');
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Listening' : `Say ${word}`}
        accessibilityState={{ busy: listening }}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          { width: size, height: size, borderRadius: size / 2 },
          status && { backgroundColor: `${statusColors[status]}22` },
          pressed && styles.pressed,
          buttonStyle,
        ]}
      >
        <Ionicons name={listening ? 'mic' : 'mic'} size={Math.round(size * 0.38)} color={status ? statusColors[status] : '#0F172A'} />
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
