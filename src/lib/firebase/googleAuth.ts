'use client';

import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User, 
  AuthError 
} from 'firebase/auth';
import { getFirebaseAuth } from './config';
import { db } from '@/lib/db';

export interface GoogleAuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Initiates Google OAuth Sign-In Popup using Firebase Authentication
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return {
      success: false,
      error: 'Firebase Authentication is not initialized. Please verify your environment variables.',
    };
  }

  try {
    const provider = new GoogleAuthProvider();
    // Request profile and email scopes
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Link user details to local Dexie store if business exists
    try {
      const existingBiz = await db.businesses.toCollection().first();
      if (existingBiz) {
        await db.businesses.update(existingBiz.id, {
          owner_name: user.displayName || existingBiz.owner_name,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('Could not sync Google user profile to local store:', e);
    }

    return {
      success: true,
      user,
    };
  } catch (err: any) {
    const authError = err as AuthError;
    console.error('Google Sign-In Error:', authError);

    let userFriendlyMsg = 'Failed to sign in with Google. Please try again.';
    if (authError.code === 'auth/popup-closed-by-user') {
      userFriendlyMsg = 'Sign-in cancelled. You closed the Google login window.';
    } else if (authError.code === 'auth/popup-blocked') {
      userFriendlyMsg = 'Google login popup was blocked by your browser. Please allow popups for this site.';
    } else if (authError.code === 'auth/cancelled-popup-request') {
      userFriendlyMsg = 'Another sign-in attempt is already in progress.';
    } else if (authError.code === 'auth/unauthorized-domain') {
      userFriendlyMsg = 'This domain is not authorized for Google OAuth in Firebase Console. Please add it to Authorized Domains.';
    } else if (authError.message) {
      userFriendlyMsg = authError.message;
    }

    return {
      success: false,
      error: userFriendlyMsg,
    };
  }
}

/**
 * Signs out the currently authenticated Google user
 */
export async function signOutUser(): Promise<{ success: boolean; error?: string }> {
  const auth = getFirebaseAuth();
  if (!auth) return { success: true };

  try {
    await signOut(auth);
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to sign out',
    };
  }
}

/**
 * Subscribes to real-time Firebase Auth state changes
 */
export function onGoogleAuthStateChanged(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
