import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cloudflare } from '@/lib/cloudflare';
import { domainService } from '@/services/domainService';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { id } = await request.json();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 1. Verify Admin Status
    const { isMasterAdmin } = await import('@/lib/admin-check');
    if (!await isMasterAdmin(session.user.email)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // 2. Fetch Domain Info
    const { data: domain, error: fetchError } = await supabase
      .from('user_domains')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !domain) {
      return NextResponse.json({ message: 'Domain not found' }, { status: 404 });
    }

    if (domain.admin_approval === 'approved') {
      return NextResponse.json({ message: 'Domain already approved' });
    }

    // 3. Trigger Cloudflare Setup
    let zone;
    try {
      zone = await cloudflare.createZone(domain.domain_name);
    } catch (error: any) {
      return NextResponse.json({ message: `Cloudflare error: ${error.message}` }, { status: 500 });
    }

    // 4. Update Status and Cloudflare Info
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
      .from('user_domains')
      .update({
        admin_approval: 'approved',
        cloudflare_zone_id: zone.id,
        cloudflare_nameservers: zone.name_servers,
        cloudflare_status: 'pending'
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ message: updateError.message }, { status: 500 });
    }

    // 5. Setup Email Routing (Worker & DNS)
    const workerName = process.env.CLOUDFLARE_WORKER_NAME || 'TMAIL.PK-email-worker';
    console.log(`CLOUDFLARE: Setting up Email Routing for zone ${zone.id} with worker ${workerName}`);
    try {
      await cloudflare.setupEmailRouting(zone.id, workerName);
      await cloudflare.setupEmailDNS(zone.id);
      await cloudflare.setupGeneralDNS(zone.id, domain.domain_name);
    } catch (e: any) {
      console.error('CLOUDFLARE: Routing/DNS setup failed:', e.message);
    }

    // 6. Best effort TXT record
    try {
      await cloudflare.addVerificationTXT(zone.id, domain.verification_token);
    } catch (e) {
    }

    return NextResponse.json({
      success: true,
      message: 'Domain approved and Cloudflare setup initiated.',
      nameservers: zone.name_servers
    });

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
