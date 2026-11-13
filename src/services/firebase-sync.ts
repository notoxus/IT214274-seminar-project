import { doc, getDoc, setDoc, type DocumentData, type DocumentSnapshot } from 'firebase/firestore';

import { firestore } from '@/config/firebase';

// Cloud writes/reads must never block learning. If Firebase is disabled, the
// device is offline, or security rules reject the request, we silently fall
// back to the local AsyncStorage copy.
const CLOUD_TIMEOUT_MS = 3500;

const APP_DATA_COLLECTION = 'appData';

function docRef(uid: string, name: string) {
  if (!firestore) return null;
  return doc(firestore, 'users', uid, APP_DATA_COLLECTION, name);
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = setTimeout(() => finish(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        finish(value);
      },
      () => {
        clearTimeout(timer);
        finish(fallback);
      }
    );
  });
}

export async function loadCloudDocument<T>(uid: string, name: string): Promise<T | null> {
  const ref = docRef(uid, name);
  if (!ref) return null;
  try {
    const snapshot = await withTimeout<DocumentSnapshot<DocumentData> | null>(
      getDoc(ref),
      CLOUD_TIMEOUT_MS,
      null
    );
    if (!snapshot || !snapshot.exists()) return null;
    const value = snapshot.data()?.data;
    return (value as T) ?? null;
  } catch (error) {
    console.warn(`[cloud-sync] Could not load "${name}"`, error);
    return null;
  }
}

export async function saveCloudDocument<T>(uid: string, name: string, data: T): Promise<void> {
  const ref = docRef(uid, name);
  if (!ref) return;
  try {
    // Firestore rejects `undefined` field values, and objects built in memory
    // can contain them. Round-tripping through JSON strips them safely.
    const payload = JSON.parse(JSON.stringify(data)) as T;
    await setDoc(ref, { data: payload, updatedAt: Date.now() });
  } catch (error) {
    console.warn(`[cloud-sync] Could not save "${name}"`, error);
  }
}
