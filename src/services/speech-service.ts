import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

let availableVoicesRequest: ReturnType<typeof Speech.getAvailableVoicesAsync> | null = null;

export function speakEnglishWord(word: string) {
  const speak = (voice?: Awaited<ReturnType<typeof Speech.getAvailableVoicesAsync>>[number]) =>
    Speech.speak(word, {
      language: voice?.language ?? 'en-GB',
      ...(voice ? { voice: voice.identifier } : {}),
      rate: 0.85,
    });

  if (Platform.OS === 'web') {
    const synthesis = typeof window === 'undefined' ? undefined : window.speechSynthesis;
    if (!synthesis || typeof synthesis.speak !== 'function' || typeof SpeechSynthesisUtterance === 'undefined') return;
    if (typeof synthesis.cancel === 'function') synthesis.cancel();
    speak();
    return;
  }

  availableVoicesRequest ??= Speech.getAvailableVoicesAsync().catch(() => []);
  void availableVoicesRequest.then(async (voices) => {
    const englishVoices = voices.filter((voice) => voice.language.toLowerCase().startsWith('en'));
    const selectedVoice = englishVoices.find((voice) => voice.language.toLowerCase().startsWith('en-gb'))
      ?? englishVoices.find((voice) => voice.language.toLowerCase().startsWith('en-us'))
      ?? englishVoices[0];
    await Speech.stop().catch(() => undefined);
    speak(selectedVoice);
  }).catch(() => speak());
}
