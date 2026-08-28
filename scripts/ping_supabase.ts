import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=');
      const val = rest.join('=').replace(/^["'](.*)["']$/, '$1').trim();
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function pingSupabase() {
  console.log('🔍 Connecting to Supabase at:', supabaseUrl);
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase URL or key missing.');
    return;
  }

  const client = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Perform database query to register active traffic
    const { data, error } = await client.from('businesses').select('id, name').limit(5);

    if (error) {
      console.warn('⚠️ Query returned notice/error:', error.message);
      // Fallback query to auth/health
      const { error: authErr } = await client.auth.getSession();
      if (authErr) {
        console.warn('Auth session check notice:', authErr.message);
      } else {
        console.log('✅ Supabase Auth Ping Success!');
      }
    } else {
      console.log('🎉 Supabase Database Query Succeeded! (Activity Recorded)');
      console.log(`Found ${data?.length || 0} business records.`);
    }
  } catch (err: any) {
    console.error('Ping error:', err?.message || err);
  }
}

pingSupabase();
