import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Dynamic imports to strictly isolate server logic from build-time tracing
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const { createClient: createServerClient } = await import('@/lib/supabase/server');

    const supabaseAdmin = createAdminClient();
    const supabase = await createServerClient();
    
    // 1. Get current session with a timeout to prevent 60s hangs
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth Session Timeout')), 5000)
    );
    
    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

    // 2. Build the domain query
    let query = supabaseAdmin
      .from('user_domains')
      .select('id, domain_name, is_verified, created_at, user_id, admin_approval')
      .eq('is_verified', true);

    const masterAdminEmails = [
      'info369skills@gmail.com',
      'danubaba369@gmail.com',
      'Admin@tmail.pk',
      'master@tmail.pk'
    ];

    const isAdmin = session?.user?.email && masterAdminEmails.includes(session.user.email.toLowerCase());

    if (isAdmin) {
      // MASTER ADMIN: See everything that is approved (even if not verified yet)
      query = supabaseAdmin
        .from('user_domains')
        .select('id, domain_name, is_verified, created_at, user_id, admin_approval')
        .eq('admin_approval', 'approved');
      console.log(`API-DOMAINS-LIST: User ${session?.user?.email} is Master Admin. Showing all approved domains.`);
    } else if (session?.user?.id) {
      // NORMAL USER: Approved OR owned by current user (but must be verified)
      query = query.or(`admin_approval.eq.approved,user_id.eq.${session.user.id}`);
    } else {
      // PUBLIC/GUEST: Only approved domains
      query = query.eq('admin_approval', 'approved');
    }

    // 3. Execute query with order
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(50); // Sanity limit for performance

    if (error) throw error;
    
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('API-DOMAINS-LIST Critical Error:', error.message);
    
    // Fallback: If DB or Auth hangs, return a minimal set or empty array to keep UI alive
    return NextResponse.json([], { status: 200 }); 
  }
}
