import { createContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { firebaseAuth, isFirebaseConfigured } from '@/config/firebase';
import { observeAuth, register, signIn, signOutUser, updateDisplayName } from '@/services/auth-service';
import { syncCustomLessonContent } from '@/services/lesson-service';
import { setProgressSyncUser } from '@/services/storage-service';
import { setSyncUserId } from '@/services/sync-session';
import type { AppUser, AuthCredentials } from '@/types/auth';

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  signIn: (credentials: AuthCredentials) => Promise<void>;
  register: (credentials: AuthCredentials, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
};

// Global auth state for the entire app
export const AuthContext = createContext<AuthContextValue | null>(null);

// Point both local storage and cloud sync at the current account.
function beginUserSync(user: AppUser | null) {
  setSyncUserId(user?.id ?? null);
  setProgressSyncUser(user?.id ?? null);
  if (user) void syncCustomLessonContent();
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AppUser | null>(null);
  // If Firebase is configured, wait for existing session check (loading = true)
  const [loading, setLoading] = useState(isFirebaseConfigured);

  // Subscribe to auth state on app start (auto sign-in if token exists)
  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseAuth) {
      return;
    }
    return observeAuth((nextUser) => {
      beginUserSync(nextUser);
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  // Memoize actions & state to avoid unnecessary re-renders
  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    signIn: async (credentials) => {
      const nextUser = await signIn(credentials);
      beginUserSync(nextUser);
      setUser(nextUser);
    },
    register: async (credentials, displayName) => {
      const nextUser = await register(credentials, displayName);
      beginUserSync(nextUser);
      setUser(nextUser);
    },
    signOut: async () => {
      await signOutUser();
      beginUserSync(null);
      setUser(null);
    },
    updateDisplayName: async (name) => { setUser(await updateDisplayName(name)); },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
