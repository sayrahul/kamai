import { getFirebaseApp, getFirestoreDb, isValidFirebaseAppId } from './config';
import { getMessaging, getToken, onMessage, Messaging, isSupported } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';

let messagingInstance: Messaging | null = null;

export async function initFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp || !isValidFirebaseAppId(firebaseApp.options.appId)) return null;

  try {
    const supported = await isSupported();
    if (supported && !messagingInstance) {
      messagingInstance = getMessaging(firebaseApp);
    }
  } catch (err) {
    console.warn('Firebase Messaging not supported in this browser:', err);
  }

  return messagingInstance;
}

/**
 * Requests notification permission from shop owner / staff and saves the FCM token to Firestore
 */
export async function requestPushPermission(businessId = 'biz_default'): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied by user');
      return null;
    }

    const messaging = await initFirebaseMessaging();
    if (!messaging) return null;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

    const currentToken = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
    });

    if (currentToken) {
      // Save FCM Token in Firestore for Admin & Owner push alerts
      const firestore = getFirestoreDb();
      if (firestore) {
        const tokenRef = doc(firestore, `businesses/${businessId}/fcm_devices`, currentToken.slice(-20));
        await setDoc(tokenRef, {
          token: currentToken,
          platform: 'web',
          user_agent: navigator.userAgent,
          updated_at: new Date().toISOString(),
        }, { merge: true });
      }

      return currentToken;
    }
  } catch (err) {
    console.warn('Error retrieving FCM registration token:', err);
  }

  return null;
}

/**
 * Listens for live foreground push notifications
 */
export function onForegroundPush(
  callback: (payload: { title?: string; body?: string; data?: any }) => void
) {
  if (typeof window === 'undefined') return () => {};

  initFirebaseMessaging().then((messaging) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        callback({
          title: payload.notification?.title || 'KamaiPlus Alert',
          body: payload.notification?.body || '',
          data: payload.data,
        });
      });
    }
  });
}
