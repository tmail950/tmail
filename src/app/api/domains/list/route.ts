import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  try {
    const { data, error } = await supabaseAdmin
      .from('user_domains')
      .select('id, domain_name, is_verified, created_at')
      .eq('admin_approval', 'approved')
      .eq('is_verified', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('API-DOMAINS-LIST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
