export const runtime = 'edge';
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { domainService } from '@/services/domainService'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Verify Master Admin Authorization
    const { isMasterAdmin } = await import('@/lib/admin-check');
    if (!await isMasterAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // 2. Fetch ALL domains using Admin Client (RLS Bypass)
    const { data, error } = await adminClient
      .from('user_domains')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('ADMIN-DOMAINS-LIST-ERROR:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
