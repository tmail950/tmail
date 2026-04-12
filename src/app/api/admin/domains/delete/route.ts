import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    // Dynamic imports to strictly isolate server logic from build-time tracing
    const { createClient: createServerClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { isMasterAdmin } = await import('@/lib/admin-check')

    const supabase = await createServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify Master Admin Authorization
    if (!await isMasterAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'Domain ID is required.' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    
    // 1. Fetch domain to get Cloudflare Zone ID
    const { data: domain } = await adminClient
      .from('user_domains')
      .select('domain_name, cloudflare_zone_id')
      .eq('id', id)
      .single()

    if (domain?.cloudflare_zone_id) {
      try {
        const { cloudflare } = await import('@/lib/cloudflare')
        await cloudflare.deleteZone(domain.cloudflare_zone_id)
        console.log(`ADMIN-DELETE: Deleted Cloudflare zone for ${domain.domain_name}`)
      } catch (cfError: any) {
        console.warn(`ADMIN-DELETE: Cloudflare zone deletion failed (Non-blocking):`, cfError.message)
      }
    }

    // 2. Delete from Database
    const { error, count } = await adminClient
      .from('user_domains')
      .delete({ count: 'exact' })
      .eq('id', id)

    if (error) throw error
    if (count === 0) {
        return NextResponse.json({ error: 'Domain not found or deletion failed.' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Domain deleted successfully.' })
  } catch (error: any) {
    console.error('ADMIN-DOMAIN-DELETE-ERROR:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
