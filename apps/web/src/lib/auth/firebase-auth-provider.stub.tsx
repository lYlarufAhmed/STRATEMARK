/**
 * Live FirebaseAuthProvider / GoogleAuthProvider module.
 */
import type { ReactNode } from 'react';
import { GoogleAuthProvider, useAuth } from './AuthContext';

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  return <GoogleAuthProvider>{children}</GoogleAuthProvider>;
}

export function useFirebaseAuthStub() {
  return useAuth();
}
