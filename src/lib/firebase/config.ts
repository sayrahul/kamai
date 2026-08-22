import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getRemoteConfig, RemoteConfig } from 'firebase/remote-config';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'kamaiplus.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'kamaiplus',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'kamaiplus.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let remoteConfig: RemoteConfig | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;
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
    db = getFirestore(firebaseApp);
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
  if (!firebaseApp) return null;
  if (!remoteConfig) {
    try {
      remoteConfig = getRemoteConfig(firebaseApp);
      remoteConfig.settings.minimumFetchIntervalMillis = 60000; // 1 minute cache in dev/production
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
