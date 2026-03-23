import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const supabase = await createServerClient(); // For session
  const { data: { session } } = await supabase.auth.getSession();

  try {
    let query = supabaseAdmin
      .from('user_domains')
      .select('id, domain_name, is_verified, created_at, user_id')
      .eq('is_verified', true);

    // If session exists, include user's own verified domains OR approved ones
    if (session) {
      query = query.or(`admin_approval.eq.approved,user_id.eq.${session.user.id}`);
    } else {
      query = query.eq('admin_approval', 'approved');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('API-DOMAINS-LIST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
