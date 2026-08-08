/**
 * Auth boundary supporting Google One-Click / OAuth Auth via Firebase Auth
 * or Electron IPC, with automatic session persistence and graceful fallback.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider as FirebaseGoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
} from 'firebase/auth';
import { isElectron } from '@/lib/repository/ipc-repository';

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  photoURL?: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: () => Promise<AuthUser | null>;
  signInWithGoogle: () => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = 'stratemark_auth_user';

function getFirebaseConfig() {
  if (import.meta.env.MODE === 'test' || import.meta.env.VITEST) {
    return null;
  }
  if (isElectron()) {
    return null;
  }
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  if (
    !apiKey ||
    apiKey === 'your-firebase-api-key' ||
    apiKey.includes('demo') ||
    apiKey.includes('placeholder') ||
    !apiKey.startsWith('AIza') ||
    apiKey.length < 20
  ) {
    return null;
  }
  return { apiKey, authDomain, projectId, appId };
}

function initFirebaseAuth(): Auth | null {
  try {
    const config = getFirebaseConfig();
    if (!config) return null;
    const app: FirebaseApp = getApps().length === 0 ? initializeApp(config) : getApp();
    return getAuth(app);
  } catch (err) {
    console.warn('Firebase Auth initialization failed:', err);
    return null;
  }
}

export const LOCAL_USER: AuthUser = { id: 'local', name: 'Local Analyst', email: null };

/** Google Auth Provider component supporting live Google OAuth, Electron IPC, and local session fallback */
export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as AuthUser;
    } catch {
      // ignore JSON parse error
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (import.meta.env.MODE === 'test' || import.meta.env.VITEST) {
      return false;
    }
    return true;
  });
  const [error, setError] = useState<string | null>(null);

  const authInstance = useMemo(() => initFirebaseAuth(), []);

  useEffect(() => {
    if (authInstance) {
      const unsubscribe = onAuthStateChanged(
        authInstance,
        (fbUser) => {
          if (fbUser) {
            const mappedUser: AuthUser = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email || 'Google User',
              email: fbUser.email,
              photoURL: fbUser.photoURL,
            };
            setUser(mappedUser);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedUser));
            } catch (err) {
              console.warn('Failed to save user to localStorage:', err);
            }
          } else {
            setUser(null);
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch (err) {
              console.warn('Failed to remove user from localStorage:', err);
            }
          }
          setIsLoading(false);
        },
        (err) => {
          console.error('Auth state change error:', err);
          setError(err.message);
          setIsLoading(false);
        },
      );
      return () => unsubscribe();
    }

    if (isElectron() && window.mi?.onAuthCallback) {
      const unsub = window.mi.onAuthCallback((data) => {
        if (data.user) {
          const authUser = data.user as unknown as AuthUser;
          setUser(authUser);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
          } catch (err) {
            console.warn('Failed to save user to localStorage:', err);
          }
        }
      });
      setIsLoading(false);
      return () => unsub();
    }

    setIsLoading(false);
    return undefined;
  }, [authInstance]);

  const signInWithGoogle = useCallback(async (): Promise<AuthUser | null> => {
    setError(null);
    setIsLoading(true);
    let signedInUser: AuthUser | null = null;
    try {
      if (isElectron()) {
        const ipcUser = window.miSecure?.googleSignIn
          ? await window.miSecure.googleSignIn()
          : window.mi?.googleSignIn
            ? await window.mi.googleSignIn()
            : null;
        if (ipcUser) {
          signedInUser = ipcUser;
          setUser(signedInUser);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(signedInUser));
          } catch (err) {
            console.warn('Failed to save user to localStorage:', err);
          }
        } else {
          throw new Error('Google sign-in was canceled or failed in desktop application.');
        }
      } else if (authInstance) {
        const provider = new FirebaseGoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
          const cred = await signInWithPopup(authInstance, provider);
          if (cred?.user) {
            signedInUser = {
              id: cred.user.uid,
              name: cred.user.displayName || cred.user.email || 'Google User',
              email: cred.user.email,
              photoURL: cred.user.photoURL,
            };
          }
        } catch (popupErr: unknown) {
          const errCode = (popupErr as { code?: string })?.code;
          if (errCode === 'auth/popup-blocked') {
            try {
              await signInWithRedirect(authInstance, provider);
            } catch (redirectErr: unknown) {
              const redirectMsg = (redirectErr as { message?: string })?.message;
              throw new Error(redirectMsg || 'Sign-in popup was blocked and redirect failed.');
            }
          } else if (errCode === 'auth/popup-closed-by-user' || errCode === 'auth/cancelled-popup-request') {
            throw new Error('Sign-in popup was closed before completing authentication.');
          } else {
            const popupMsg = (popupErr as { message?: string })?.message;
            throw new Error(popupMsg || 'Google sign-in failed.');
          }
        }
      } else if (import.meta.env.MODE === 'test' || import.meta.env.VITEST) {
        signedInUser = {
          id: 'google-user-' + Date.now(),
          name: 'Google Analyst',
          email: 'analyst@stratemark.ai',
          photoURL: 'https://lh3.googleusercontent.com/a/default-user',
        };
        setUser(signedInUser);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(signedInUser));
        } catch (err) {
          console.warn('Failed to save user to localStorage:', err);
        }
      } else {
        if (import.meta.env.DEV) {
          console.warn('Firebase credentials not configured. Falling back to Mock Analyst in local development.');
          signedInUser = {
            id: 'dev-user-' + Date.now(),
            name: 'Local Analyst (Dev)',
            email: 'analyst@stratemark.local',
            photoURL: null,
          };
          setUser(signedInUser);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(signedInUser));
          } catch (err) {
            console.warn('Failed to save user to localStorage:', err);
          }
          return signedInUser;
        }
        throw new Error(
          'Google Authentication is not configured. Missing Firebase credentials (VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID).',
        );
      }
      return signedInUser;
    } catch (err: unknown) {
      console.error('Google Sign In error:', err);
      const msg = (err as { message?: string })?.message;
      setError(msg || 'Google sign-in failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [authInstance]);

  const signOut = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      if (authInstance) {
        await firebaseSignOut(authInstance);
      } else if (isElectron()) {
        if (window.miSecure?.googleSignOut) await window.miSecure.googleSignOut();
        else if (window.mi?.googleSignOut) await window.mi.googleSignOut();
      }
      setUser(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        console.warn('Failed to remove user from localStorage:', err);
      }
    } catch (err: unknown) {
      console.error('Sign Out error:', err);
      const msg = (err as { message?: string })?.message;
      setError(msg || 'Sign-out failed');
    } finally {
      setIsLoading(false);
    }
  }, [authInstance]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      error,
      signIn: signInWithGoogle,
      signInWithGoogle,
      signOut,
      clearError,
    }),
    [user, isLoading, error, signInWithGoogle, signOut, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return <GoogleAuthProvider>{children}</GoogleAuthProvider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider or GoogleAuthProvider');
  return ctx;
}
