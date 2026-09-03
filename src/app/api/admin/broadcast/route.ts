import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin/adminAuth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getFirestoreDb } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface AnnouncementPayload {
  enabled: boolean;
  message: string;
  type: 'info' | 'warning' | 'success' | 'festive';
  link?: string;
  target_audience?: 'all' | 'free' | 'pro';
  expires_at?: string;
  updatedAt: string;
}

// In-memory fallback
let cachedAnnouncement: AnnouncementPayload = {
  enabled: false,
  message: '✨ Welcome to KamaiPlus! Zero-commission digital POS billing & inventory.',
  type: 'festive',
  link: '',
  target_audience: 'all',
  expires_at: undefined,
  updatedAt: new Date().toISOString(),
};

export async function GET(req: NextRequest) {
  try {
    // 1. Try Cloud Firestore (Primary reliable persistent store)
    try {
      const firestore = getFirestoreDb();
      if (firestore) {
        const docRef = doc(firestore, 'platform_settings', 'broadcast');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as AnnouncementPayload;
          cachedAnnouncement = data;

          if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
            return NextResponse.json({ 
              success: true, 
              announcement: { ...data, enabled: false, is_expired: true } 
            });
          }
          return NextResponse.json({ success: true, announcement: data });
        }
      }
    } catch (fsErr: any) {
      // Suppress noisy stack trace in terminal when Firestore security rules are pending publication
      if (fsErr?.code !== 'permission-denied') {
        console.warn('Firestore broadcast fetch notice:', fsErr?.message || fsErr);
      }
    }

    // 2. Try Supabase
    try {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        const { data } = await supabase
          .from('platform_announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
            return NextResponse.json({ success: true, announcement: { ...data, enabled: false, is_expired: true } });
          }
          return NextResponse.json({ success: true, announcement: data });
        }
      }
    } catch (supErr) {
      console.warn('Supabase broadcast fetch warning:', supErr);
    }

    // 3. Fallback to memory
    if (cachedAnnouncement.expires_at && new Date(cachedAnnouncement.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ success: true, announcement: { ...cachedAnnouncement, enabled: false, is_expired: true } });
    }

    return NextResponse.json({ success: true, announcement: cachedAnnouncement });
  } catch (err: any) {
    return NextResponse.json({ success: true, announcement: cachedAnnouncement });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { enabled, message, type, link, target_audience, expires_at } = body;

    const payload: AnnouncementPayload = {
      enabled: Boolean(enabled),
      message: (message || '').trim(),
      type: type || 'festive',
      link: (link || '').trim(),
      target_audience: target_audience || 'all',
      expires_at: expires_at || undefined,
      updatedAt: new Date().toISOString(),
    };

    cachedAnnouncement = payload;

    // 1. Save to Cloud Firestore (Primary persistent document)
    try {
      const firestore = getFirestoreDb();
      if (firestore) {
        const docRef = doc(firestore, 'platform_settings', 'broadcast');
        await setDoc(docRef, payload, { merge: true });
      }
    } catch (fsErr) {
      console.warn('Firestore broadcast save warning:', fsErr);
    }

    // 2. Save to Supabase (Secondary)
    try {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        await supabase.from('platform_announcements').insert({
          enabled: payload.enabled,
          message: payload.message,
          type: payload.type,
          link: payload.link,
          expires_at: payload.expires_at,
          created_at: payload.updatedAt,
        });
      }
    } catch (supErr) {
      console.warn('Supabase broadcast insert warning:', supErr);
    }

    return NextResponse.json({
      success: true,
      message: payload.enabled 
        ? 'Live broadcast banner published successfully to all POS screens!' 
        : 'Broadcast banner disabled successfully.',
      announcement: payload,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update announcement' },
      { status: 500 }
    );
  }
}
