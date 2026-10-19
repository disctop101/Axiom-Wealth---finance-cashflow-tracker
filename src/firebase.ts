import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  updatePassword,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  multiFactor,
  TotpMultiFactorGenerator,
  TotpSecret,
  getMultiFactorResolver,
  MultiFactorResolver,
  MultiFactorInfo,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// CRITICAL: Must use firestoreDatabaseId from firebase-applet-config.json
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Provider with Google Workspace Sheets scope
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

// In-memory token cache (Do NOT store access token in localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

/**
 * Friendly translation for Firebase Auth error codes
 */
export function getFriendlyAuthError(err: any): string {
  const code = err?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please verify your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters with a combination of letters and numbers.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Please allow popups or use email/password sign in.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled before completion.';
    case 'auth/too-many-requests':
      return 'Access temporarily disabled due to too many failed attempts. Please reset your password or try again later.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    case 'auth/unauthorized-domain': {
      const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'this domain';
      return `Google Sign-In is restricted for "${host}". Please sign in or register with Email & Password below, or add "${host}" to Firebase Console -> Authentication -> Settings -> Authorized Domains.`;
    }
    case 'auth/requires-recent-login':
      return 'This action requires recent authentication. Please sign out and sign back in to continue.';
    case 'auth/operation-not-allowed': {
      const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://localhost:3000';
      return `Passwordless Email Link or Multi-Factor Authentication is currently being updated in Firebase. If you just toggled it ON in Firebase Console, click "Check Status / Refresh" or try again in a few moments. (Authorized origin: "${origin}")`;
    }
    default:
      return err?.message || 'Authentication failed. Please try again.';
  }
}

/**
 * Sign in using Google OAuth with graceful popup fallback
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return { user: result.user, accessToken: cachedAccessToken || '' };
  } catch (error: any) {
    console.error('Google Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Register a new user with Email, Password and Display Name
 */
export const registerWithEmail = async (
  email: string,
  pass: string,
  displayName: string
): Promise<User> => {
  const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName.trim()) {
    try {
      await updateProfile(res.user, { displayName: displayName.trim() });
    } catch (profileErr) {
      console.warn('Failed to update user profile name:', profileErr);
    }
  }
  return res.user;
};

/**
 * Sign in with Email and Password.
 * Returns { user } on success, or throws an error with resolver if 2FA (MFA) is required.
 */
export const signInWithEmail = async (
  email: string,
  pass: string
): Promise<{ user?: User; mfaRequired?: boolean; resolver?: MultiFactorResolver }> => {
  try {
    const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return { user: res.user };
  } catch (err: any) {
    if (err?.code === 'auth/multi-factor-auth-required') {
      const resolver = getMultiFactorResolver(auth, err);
      return { mfaRequired: true, resolver };
    }
    throw err;
  }
};

/**
 * Resolve MFA / 2FA TOTP Sign In with 6-digit verification code
 */
export const resolveMfaTotpSignIn = async (
  resolver: MultiFactorResolver,
  verificationCode: string
): Promise<User> => {
  const totpHint = resolver.hints.find(
    (h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID
  );
  if (!totpHint) {
    throw new Error('No compatible Authenticator App (TOTP) factor found on this account.');
  }
  const assertion = TotpMultiFactorGenerator.assertionForSignIn(
    totpHint.uid,
    verificationCode.trim()
  );
  const cred = await resolver.resolveSignIn(assertion);
  return cred.user;
};

/**
 * Send password reset email
 */
export const sendPasswordReset = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email.trim());
};

/**
 * Send passwordless Magic Link to email
 */
export const sendMagicSignInLink = async (email: string): Promise<void> => {
  const cleanEmail = email.trim();
  const currentOrigin =
    typeof window !== 'undefined' && window.location && window.location.origin
      ? window.location.origin
      : 'http://localhost:3000';

  const actionCodeSettings = {
    // Explicitly set to the current window origin (e.g., http://localhost:3000)
    url: currentOrigin,
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, cleanEmail, actionCodeSettings);
  window.localStorage.setItem('axiom_email_for_sign_in', cleanEmail);
};

/**
 * Check if the active window URL is a Firebase magic sign-in link
 */
export const isMagicLink = (): boolean => {
  if (typeof window === 'undefined') return false;
  return isSignInWithEmailLink(auth, window.location.href);
};

/**
 * Complete passwordless Magic Link sign-in
 */
export const completeMagicLinkSignIn = async (emailOverride?: string): Promise<User | null> => {
  if (typeof window === 'undefined') return null;
  if (!isSignInWithEmailLink(auth, window.location.href)) {
    return null;
  }

  let email = emailOverride || window.localStorage.getItem('axiom_email_for_sign_in');
  if (!email) {
    email = window.prompt('Please confirm your email address to complete passwordless sign-in:');
  }

  if (!email || !email.trim()) {
    throw new Error('Email address is required to complete magic link sign-in.');
  }

  const result = await signInWithEmailLink(auth, email.trim(), window.location.href);
  window.localStorage.removeItem('axiom_email_for_sign_in');
  if (window.history && window.history.replaceState) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  return result.user;
};

/**
 * In-app Change Password for authenticated email/password user
 */
export const changeUserPassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error('No authenticated user found.');
  }
  // Re-authenticate first to ensure security
  const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
  await reauthenticateWithCredential(currentUser, credential);
  // Update to new password
  await updatePassword(currentUser, newPassword);
};

/**
 * Begin TOTP Multi-Factor Authentication setup for active user
 */
export const startTotpEnrollment = async (
  user: User
): Promise<{ totpSecret: TotpSecret; secretKey: string; qrCodeUrl: string }> => {
  // Force token refresh to bypass cached client claims and sync latest MFA backend status
  await user.getIdToken(true);
  const session = await multiFactor(user).getSession();
  const totpSecret = await TotpMultiFactorGenerator.generateSecret(session);
  const account = user.email || 'user';
  const qrCodeUrl = totpSecret.generateQrCodeUrl(account, 'Axiom Wealth');
  return {
    totpSecret,
    secretKey: totpSecret.secretKey,
    qrCodeUrl,
  };
};

/**
 * Finalize and activate TOTP Multi-Factor Authentication with verification code
 */
export const finalizeTotpEnrollment = async (
  user: User,
  totpSecret: TotpSecret,
  verificationCode: string,
  displayName = 'Authenticator App'
): Promise<void> => {
  const assertion = TotpMultiFactorGenerator.assertionForEnrollment(
    totpSecret,
    verificationCode.trim()
  );
  await multiFactor(user).enroll(assertion, displayName);
};

/**
 * Unenroll an MFA factor (disable 2FA)
 */
export const unenrollMfaFactor = async (user: User, factorUid: string): Promise<void> => {
  const factor = multiFactor(user).enrolledFactors.find((f) => f.uid === factorUid);
  if (factor) {
    await multiFactor(user).unenroll(factor);
  }
};

/**
 * Get enrolled MFA factors for active user
 */
export const getMfaFactors = (user: User | null): MultiFactorInfo[] => {
  if (!user) return [];
  try {
    return multiFactor(user).enrolledFactors;
  } catch {
    return [];
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Error handling conforming strictly to firebase-integration-rpc skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Critical boot connection validation
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration or internet connection.');
    }
  }
}
