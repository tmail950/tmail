import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Dynamic imports to strictly isolate server logic from build-time tracing
    const { createClient } = await import('@/lib/supabase/server');
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const { isMasterAdmin } = await import('@/lib/admin-check');

    const supabase = await createClient();
    const { id } = await request.json();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 1. Verify Admin Status
    if (!await isMasterAdmin(session.user.email)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // 2. Update Status to Rejected
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
      .from('user_domains')
      .update({
        admin_approval: 'rejected',
        cloudflare_status: 'rejected'
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ message: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Domain request rejected.'
    });

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
