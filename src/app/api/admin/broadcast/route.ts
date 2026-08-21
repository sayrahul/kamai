import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin/adminAuth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

interface AnnouncementPayload {
  enabled: boolean;
  message: string;
  type: 'info' | 'warning' | 'success' | 'festive';
  link?: string;
  updatedAt: string;
}

// In-memory fallback if Supabase table is not yet configured
let cachedAnnouncement: AnnouncementPayload = {
  enabled: false,
  message: 'Welcome to KamaiPlus! Enjoy zero-commission digital billing & inventory.',
  type: 'info',
  link: '',
  updatedAt: new Date().toISOString(),
};

export async function GET(req: NextRequest) {
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
        return NextResponse.json({ success: true, announcement: data });
      }
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
    const { enabled, message, type, link } = body;

    const payload: AnnouncementPayload = {
      enabled: Boolean(enabled),
      message: message || '',
      type: type || 'info',
      link: link || '',
      updatedAt: new Date().toISOString(),
    };

    cachedAnnouncement = payload;

    const supabase = getSupabaseServerClient();
    if (supabase) {
      await supabase.from('platform_announcements').insert({
        enabled: payload.enabled,
        message: payload.message,
        type: payload.type,
        link: payload.link,
        created_at: payload.updatedAt,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Global announcement updated successfully',
      announcement: payload,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update announcement' },
      { status: 500 }
    );
  }
}
