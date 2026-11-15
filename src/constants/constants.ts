export const APP_NAME = 'English Steps';
export const PROGRESS_STORAGE_KEY = '@learning-english/progress';

export const Colors = {
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    // Recessed surface: icon buttons, tab tracks, inputs.
    subtle: '#F1F5F9',
    text: '#172033',
    muted: '#65718A',
    primary: '#3568D4',
    // Ink that sits on top of `primary`.
    onPrimary: '#FFFFFF',
    border: '#E1E7F0',
    success: '#27845A',
    // Brand teal used by the Memrise-style lesson header.
    accent: '#5EEAD4',
    // Ink that sits on top of `accent` and `warning`.
    onAccent: '#0F172A',
    warning: '#FACC15',
    danger: '#DC2626',
    dangerSoft: '#FEE2E2',
  },
  dark: {
    background: '#101827',
    surface: '#1B2638',
    subtle: '#243044',
    text: '#F2F5FA',
    muted: '#A7B1C2',
    primary: '#8EAEFF',
    onPrimary: '#0F172A',
    border: '#344155',
    success: '#77D5A6',
    accent: '#5EEAD4',
    onAccent: '#0F172A',
    warning: '#FACC15',
    danger: '#F87171',
    dangerSoft: '#3B1F26',
  },
} as const;

export type ThemeName = keyof typeof Colors;
export type ThemeColors = (typeof Colors)[ThemeName];
export type ThemeColor = keyof ThemeColors;
export const Spacing = { one: 4, two: 8, three: 12, four: 16, five: 24, six: 32 } as const;
export const MaxContentWidth = 720;
export const Fonts = { mono: 'monospace' };
