import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    const settings = await domainService.getSettings();
    const masterAdmin = settings.admin_email || 'info369skills@gmail.com';
    
    if (session.user.email !== masterAdmin && 
        session.user.email !== 'info369skills@gmail.com') {
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

    if (!domain.cloudflare_zone_id) {
        return NextResponse.json({ message: 'Domain has no Cloudflare Zone ID. Approve it first.' }, { status: 400 });
    }

    console.log(`CLOUDFLARE-SYNC: Re-syncing ${domain.domain_name} (${domain.cloudflare_zone_id})...`);

    // 3. Re-run Cloudflare Setup
    const workerName = process.env.CLOUDFLARE_WORKER_NAME || 'quamify-email-worker';
    
    try {
      await cloudflare.setupEmailRouting(domain.cloudflare_zone_id, workerName);
      await cloudflare.setupEmailDNS(domain.cloudflare_zone_id);
      await cloudflare.setupGeneralDNS(domain.cloudflare_zone_id, domain.domain_name);
    } catch (e: any) {
      console.error('CLOUDFLARE-SYNC: Re-setup failed:', e.message);
      return NextResponse.json({ message: `Sync failed: ${e.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Cloudflare configuration re-synced successfully.'
    });

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
