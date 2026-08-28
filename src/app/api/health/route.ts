import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const timestamp = new Date().toISOString();
  let supabaseStatus = 'not_configured';

  if (isSupabaseServerConfigured()) {
    try {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        // Lightweight keep-alive query to prevent Supabase from pausing free tier
        const { error } = await supabase.from('businesses').select('id').limit(1);
        supabaseStatus = error ? `query_error: ${error.message}` : 'healthy';
      }
    } catch (err: any) {
      supabaseStatus = `exception: ${err?.message || err}`;
    }
  }

  return NextResponse.json({
    status: 'ok',
    app: 'KamaiPlus POS',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '3.33.0',
    timestamp,
    services: {
      supabase: supabaseStatus,
      dexie: 'offline-first (client-side IndexedDB)',
    },
  });
}
