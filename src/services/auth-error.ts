// Firebase Auth throws errors whose `message` is a developer string such as
// "Firebase: Error (auth/invalid-email)." — never show that to a learner.
// `code` is the stable machine value, so map it to plain English and keep the
// raw message only as a last resort.

const AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Invalid email',
  'auth/missing-email': 'Enter your email',
  'auth/missing-password': 'Enter your password',
  'auth/wrong-password': 'Incorrect password',
  'auth/invalid-credential': 'Incorrect email or password',
  'auth/invalid-login-credentials': 'Incorrect email or password',
  'auth/user-not-found': 'No account found for this email',
  'auth/user-disabled': 'This account has been disabled',
  'auth/email-already-in-use': 'This email is already registered',
  'auth/credential-already-in-use': 'This email is already registered',
  'auth/account-exists-with-different-credential': 'This email is linked to a different sign-in method',
  'auth/weak-password': 'Password must be at least 6 characters',
  'auth/too-many-requests': 'Too many attempts. Try again later',
  'auth/network-request-failed': 'Network error. Check your connection',
  'auth/operation-not-allowed': 'Email sign-in is not enabled for this project',
  'auth/admin-restricted-operation': 'This operation is disabled',
  'auth/requires-recent-login': 'Please sign in again to continue',
  'auth/no-current-user': 'You need to sign in first',
  'auth/popup-closed-by-user': 'Sign-in was cancelled',
  'auth/cancelled-popup-request': 'Sign-in was cancelled',
  'auth/code-expired': 'That code has expired',
  'auth/invalid-verification-code': 'Incorrect verification code',
  'auth/invalid-verification-id': 'Verification failed. Request a new code',
  'auth/expired-action-code': 'This link has expired',
  'auth/invalid-action-code': 'This link is invalid or already used',
  'auth/unverified-email': 'Verify your email before signing in',
  'auth/multi-factor-auth-required': 'This account needs a second verification step',
  'auth/provider-already-linked': 'This sign-in method is already linked',
  'auth/invalid-api-key': 'The Firebase API key is invalid',
  'auth/app-not-authorized': 'This app is not authorized to use Firebase Auth',
  'auth/internal-error': 'Firebase had an internal error. Try again',
};

const GENERIC_MESSAGE = 'Something went wrong. Please try again';

// The code lives in `error.code` for real FirebaseError instances. SDKs also
// wrap errors from native/web layers, so fall back to reading it out of the
// message — both "(auth/invalid-email)" and bare "auth/invalid-email" shapes.
function extractCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.length > 0) return code;
  }
  const message = typeof error === 'string' ? error : error instanceof Error ? error.message : '';
  const match = /\(([a-z0-9-]+\/[a-z0-9-]+)\)/i.exec(message) ?? /\b([a-z0-9-]+\/[a-z0-9-]+)\b/i.exec(message);
  return match ? match[1] : null;
}

export function authErrorMessage(error: unknown, fallback: string = GENERIC_MESSAGE): string {
  const code = extractCode(error);
  if (code) return AUTH_MESSAGES[code] ?? fallback;

  // No Firebase code: this is one of our own errors (for example "Firebase is
  // not configured…"), so its message is already meant for humans. Only the
  // SDK's own "Firebase:" / "FirebaseError:" wrappers are unusable noise.
  const message = typeof error === 'string' ? error : error instanceof Error ? error.message : '';
  const isFirebaseNoise = !message || /^Firebase(Error)?\s*:/.test(message);
  return isFirebaseNoise ? fallback : message;
}
