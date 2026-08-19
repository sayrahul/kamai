// src/lib/db/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import {
    getFirestore,
    enableMultiTabIndexedDbPersistence
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 1. Safe initialization to prevent duplicate app crashes in Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 2. Initialize Firestore and Auth
const db = getFirestore(app);
const auth = getAuth(app);

// 3. Safe multi-tab offline persistence check (Browser-only execution)
if (typeof window !== 'undefined') {
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn("Multiple tabs open, persistence can only be enabled in one open tab at a time.");
        } else if (err.code === 'unimplemented') {
            console.warn("The current browser does not support offline persistence.");
        }
    });
}

export { db, auth };