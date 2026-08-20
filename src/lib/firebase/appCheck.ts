import { getFirebaseApp } from './config';
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from 'firebase/app-check';

let appCheckInstance: AppCheck | null = null;

/**
 * Initializes Firebase App Check to protect Firestore and Storage
 * from unauthorized scrapers, bots, and malicious requests.
 */
export function initFirebaseAppCheck(): AppCheck | null {
  if (typeof window === 'undefined') return null;
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;

  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

  // In localhost / development, allow debug token to avoid blocking developers
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    // @ts-ignore
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  if (!appCheckInstance && recaptchaSiteKey) {
    try {
      appCheckInstance = initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (err) {
      console.warn('Firebase App Check initialization skipped:', err);
    }
  }

  return appCheckInstance;
}
