import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Extract Firebase's APIs key from .env
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
// Check your app config. Does it have 3 necessary key, yet?
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
// Session Persistence / Remember Login
// Saving device's auth token
export const firebaseApp = isFirebaseConfigured
  ? getApps().length ? getApp() : initializeApp(firebaseConfig)
  : null;
//   Or, you can also write like that
//   let firebaseApp;
//   if (!isFirebaseConfigured) {
//     app == null;
//   }
//   if (getApps().length > 0) {
//     // That existed, reuse available
//     app == getApp();
//   } else {
//     // Doesn't have? Initialize a new app
//     app == initializeApp(firebaseConfig);
//   }

// Using mobile platform for auth -> Create
function createAuth() {
  if (!firebaseApp) return null;
  if (Platform.OS === 'web') return getAuth(firebaseApp);
  try {
    return initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(firebaseApp);
  }
}

export const firebaseAuth = createAuth();

// Cloud database used to back up progress, streak and custom lesson content
// so they survive reinstalling the app. Null when Firebase is not configured.
function createFirestore() {
  if (!firebaseApp) return null;
  // The JS SDK's default WebChannel transport is unreliable on React Native;
  // long polling is the documented workaround for mobile.
  if (Platform.OS !== 'web') {
    try {
      return initializeFirestore(firebaseApp, { experimentalForceLongPolling: true });
    } catch {
      // Already initialized (e.g. Fast Refresh) — reuse the existing instance.
    }
  }
  return getFirestore(firebaseApp);
}

export const firestore = createFirestore();
