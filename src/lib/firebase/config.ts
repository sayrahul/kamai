import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore, setLogLevel } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getRemoteConfig, RemoteConfig } from 'firebase/remote-config';

// Suppress non-critical internal connection retry logs in browser console
if (typeof window !== 'undefined') {
  try {
    setLogLevel('error');
  } catch {}
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let remoteConfig: RemoteConfig | null = null;

export function isValidFirebaseAppId(appId?: string): boolean {
  if (!appId) return false;
  // Firebase Web App ID format: 1:<project-number>:web:<alphanumeric-hash>
  // Must have a valid alphanumeric hash from Firebase console, not a placeholder word
  return /^1:\d+:web:[a-f0-9]{12,}$/i.test(appId);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    return null;
  }
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!auth) {
    auth = getAuth(firebaseApp);
  }
  return auth;
}

export function getFirestoreDb(): Firestore | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!db) {
    try {
      db = initializeFirestore(firebaseApp, {
        experimentalAutoDetectLongPolling: true,
      });
    } catch {
      db = getFirestore(firebaseApp);
    }
  }
  return db;
}

export function getFirebaseStorage(): FirebaseStorage | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!storage) {
    storage = getStorage(firebaseApp);
  }
  return storage;
}

export function getFirebaseRemoteConfig(): RemoteConfig | null {
  if (typeof window === 'undefined') return null;
  const firebaseApp = getFirebaseApp();
  // Remote Config and Firebase Installations require a genuine Firebase Web App ID
  if (!firebaseApp || !isValidFirebaseAppId(firebaseConfig.appId)) return null;
  
  if (!remoteConfig) {
    try {
      remoteConfig = getRemoteConfig(firebaseApp);
      remoteConfig.settings.minimumFetchIntervalMillis = 60000; // 1 minute cache
      remoteConfig.defaultConfig = {
        platform_ad_title: '⚡ Billed with KamaiPlus POS',
        platform_ad_subtitle: 'Free Retail Invoicing & Khata',
        platform_ad_desc: 'Get your free GST billing & WhatsApp invoicing app • kamaiplus.proventure.in',
        platform_ad_badge: 'Kamai+',
        platform_ad_url: 'https://kamaiplus.proventure.in',
        platform_ad_enabled: true,
      };
    } catch {
      return null;
    }
  }
  return remoteConfig;
}
