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
    
    // Check master admin or developer backup
    if (session.user.email !== masterAdmin && 
        session.user.email !== 'info369skills@gmail.com' && 
        session.user.email !== 'danubaba369@gmail.com') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // 2. Check Cloudflare environment
    if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
        return NextResponse.json({ 
            message: 'Cloudflare configuration missing in server environment (Missing API_TOKEN or ACCOUNT_ID).' 
        }, { status: 500 });
    }

    // 3. Fetch Domain Info
    const { data: domain, error: fetchError } = await supabase
      .from('user_domains')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !domain) {
      return NextResponse.json({ message: 'Domain not found' }, { status: 404 });
    }

    // 4. Recovery: If zone ID is missing, try to find or create it
    let zoneId = domain.cloudflare_zone_id;
    if (!zoneId) {
        console.log(`CLOUDFLARE-SYNC: Zone ID missing for ${domain.domain_name}. Searching...`);
        let zone = await cloudflare.findZoneByName(domain.domain_name);
        
        if (!zone) {
            console.log(`CLOUDFLARE-SYNC: Zone not found for ${domain.domain_name}. Creating...`);
            zone = await cloudflare.createZone(domain.domain_name);
        }

        if (zone) {
            zoneId = zone.id;
            // Update database with the recovered/created ID
            await supabase
                .from('user_domains')
                .update({ cloudflare_zone_id: zoneId })
                .eq('id', id);
        } else {
            return NextResponse.json({ message: 'Failed to recover or create Cloudflare zone.' }, { status: 500 });
        }
    }

    console.log(`CLOUDFLARE-SYNC: Syncing ${domain.domain_name} (${zoneId})...`);

    // 5. Re-run Cloudflare Setup
    const workerName = process.env.CLOUDFLARE_WORKER_NAME || 'quamify-email-worker';
    
    try {
      await cloudflare.setupEmailRouting(zoneId, workerName);
      await cloudflare.setupEmailDNS(zoneId);
      await cloudflare.setupGeneralDNS(zoneId, domain.domain_name);
    } catch (e: any) {
      console.error('CLOUDFLARE-SYNC: Re-setup failed:', e.message);
      return NextResponse.json({ message: `Cloudflare API Error: ${e.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Cloudflare configuration re-synced successfully.'
    });

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
