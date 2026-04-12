import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Dynamic imports to prevent boundary leakage errors in App Router
    const { createClient } = await import('@/lib/supabase/server');
    const { cloudflare } = await import('@/lib/cloudflare');
    const { isMasterAdmin } = await import('@/lib/admin-check');
    const { fastNSCheck } = await import('@/lib/dnsCheck');

    const supabase = await createClient();
    const { domainName } = await request.json();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 1. Check existing domain count (Limit to 9)
    const { count, error: countError } = await supabase
      .from('user_domains')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id);

    if (!countError && count !== null && count >= 9) {
      return NextResponse.json(
        { message: 'Domain limit reached. You can add up to 9 domains.' },
        { status: 403 }
      );
    }

    // 2. Auth Check & Clean Domain
    const isAdmin = await isMasterAdmin(session.user.email);
    const { data: autoApproveSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'auto_approve_domains')
      .maybeSingle();
    
    const isAutoApprove = autoApproveSetting?.value === 'true' || isAdmin;

    const cleanDomain = domainName
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .split('/')[0];

    const verificationToken = `TMAIL.PK-verify-${Math.random().toString(36).substring(2, 15)}`;

    if (!isAutoApprove) {
      // Manual approval mode: Just insert the domain as pending
      const { data: domain, error: insertError } = await supabase
        .from('user_domains')
        .insert([{
          domain_name: cleanDomain,
          verification_token: verificationToken,
          user_id: session.user.id,
          admin_approval: 'pending',
          cloudflare_status: 'pending',
          is_verified: false
        }])
        .select()
        .single();

      if (insertError) return NextResponse.json({ message: insertError.message }, { status: 500 });
      return NextResponse.json({ success: true, message: 'Domain submitted for admin approval.', domain });
    }

    // 3. Create/Find Zone in Cloudflare
    console.log(`DOMAIN SETUP: Processing [${cleanDomain}] for user [${session.user.email}]`);
    let zone;
    try {
      zone = await cloudflare.findZoneByName(cleanDomain);
      if (!zone) {
        zone = await cloudflare.createZone(cleanDomain);
      }
    } catch (error: any) {
      console.error(`DOMAIN SETUP: Cloudflare failure for [${cleanDomain}]:`, error.message);
      return NextResponse.json({ message: `Cloudflare setup failed: ${error.message}` }, { status: 500 });
    }

    // 4. INSTANT NS CHECK: Detect if nameservers are already pointed
    const isAlreadyPointed = await fastNSCheck(cleanDomain);
    
    const status = (zone.status === 'active' || isAlreadyPointed) ? 'active' : 'pending';
    const isVerified = status === 'active';

    // 5. Insert into Supabase
    const { data: domain, error: insertError } = await supabase
      .from('user_domains')
      .insert([{
        domain_name: cleanDomain,
        verification_token: verificationToken,
        user_id: session.user.id,
        cloudflare_zone_id: zone.id,
        cloudflare_nameservers: zone.name_servers,
        cloudflare_status: status,
        is_verified: isVerified,
        admin_approval: 'approved'
      }])
      .select()
      .single();

    if (insertError) return NextResponse.json({ message: insertError.message }, { status: 500 });

    // 6. Automation (Don't await fully to return response faster)
    (async () => {
      try {
        await cloudflare.addVerificationTXT(zone.id, verificationToken);
        if (isVerified) {
          console.log(`DOMAIN SETUP: Instant Activation for [${cleanDomain}]`);
          const workerName = process.env.CLOUDFLARE_WORKER_NAME || 'TMAIL.PK-email-worker';
          await Promise.all([
            cloudflare.setupEmailDNS(zone.id),
            cloudflare.setupGeneralDNS(zone.id, cleanDomain)
          ]);
          await cloudflare.setupEmailRouting(zone.id, workerName);
        }
      } catch (e) {
        console.warn(`DOMAIN SETUP: Background sync failed for [${cleanDomain}]`, e);
      }
    })();

    return NextResponse.json({
      success: true,
      domain,
      nameservers: zone.name_servers,
      isVerified
    });

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
