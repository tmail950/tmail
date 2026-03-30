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
    const adminClient = createAdminClient();
    const { data: settingsData } = await adminClient.from('site_settings').select('*');
    const settings: Record<string, string> = {};
    settingsData?.forEach((s: any) => settings[s.key] = s.value);

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
        let zone = await cloudflare.findZoneByName(domain.domain_name);
        if (!zone) {
            zone = await cloudflare.createZone(domain.domain_name);
        }

        if (zone) {
            zoneId = zone.id;
            await supabase
                .from('user_domains')
                .update({ cloudflare_zone_id: zoneId })
                .eq('id', id);
        } else {
            return NextResponse.json({ message: 'Failed to recover or create Cloudflare zone.' }, { status: 500 });
        }
    }

    const workerName = process.env.CLOUDFLARE_WORKER_NAME || 'TMAIL.PK-email-worker';
    try {
      await cloudflare.setupEmailDNS(zoneId);
      await cloudflare.setupGeneralDNS(zoneId, domain.domain_name);
      await cloudflare.setupEmailRouting(zoneId, workerName);
      
      // Update DB status to active
      await supabase
        .from('user_domains')
        .update({ cloudflare_status: 'active' })
        .eq('id', id);
        
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
