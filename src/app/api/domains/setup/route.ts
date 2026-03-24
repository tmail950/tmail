import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cloudflare } from '@/lib/cloudflare';

export async function POST(request: Request) {
  try {
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

    if (countError) {
    } else if (count !== null && count >= 9) {
      return NextResponse.json(
        { message: 'Domain limit reached. You can add up to 9 domains.' },
        { status: 403 }
      );
    }

    // 2. Check site settings for auto-approval
    const { data: autoApproveSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'auto_approve_domains')
      .single();
    
    const isAutoApprove = autoApproveSetting?.value === 'true';

    // 1. Clean domain name
    const cleanDomain = domainName
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .split('/')[0];

    // 2. Generate Verification Token
    const verificationToken = `quamify-verify-${Math.random().toString(36).substring(2, 15)}`;

    // Get valid admins from settings or hardcoded fallback
    const settings = await supabase.from('site_settings').select('value').eq('key', 'admin_email').single();
    const masterAdmin = settings.data?.value || 'info369skills@gmail.com';
    const isAdmin = session.user.email === masterAdmin || 
                    session.user.email === 'info369skills@gmail.com' || 
                    session.user.email === 'danubaba369@gmail.com';

    if (!isAutoApprove && !isAdmin) {
      // Manual approval mode: Just insert the domain as pending
      const { data: domain, error: insertError } = await supabase
        .from('user_domains')
        .insert([
          {
            domain_name: cleanDomain,
            verification_token: verificationToken,
            user_id: session.user.id,
            admin_approval: 'pending',
            cloudflare_status: 'pending'
          }
        ])
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ message: insertError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Domain submitted for admin approval.',
        domain
      });
    }

    // 3. Create Zone in Cloudflare (Auto-approval flow)
    let zone;
    try {
      console.log(`DOMAIN SETUP: Processing [${cleanDomain}] for user [${session.user.email}]`);
      
      // First, try to find if it already exists to avoid unnecessary create calls
      zone = await cloudflare.findZoneByName(cleanDomain);
      
      if (!zone) {
        console.log(`DOMAIN SETUP: Zone not found, creating new Cloudflare zone...`);
        zone = await cloudflare.createZone(cleanDomain);
      } else {
        console.log(`DOMAIN SETUP: Existing zone found in Cloudflare, reusing ID: ${zone.id}`);
      }
    } catch (error: any) {
      console.error(`DOMAIN SETUP: Cloudflare failure for [${cleanDomain}]:`, error.message);
      let errorMsg = error.message;
      if (errorMsg.includes('Invalid access token')) {
        errorMsg = "Cloudflare error: Invalid access token. Please verify your CLOUDFLARE_API_TOKEN in Netlify Site Settings.";
      }
      return NextResponse.json({ message: errorMsg }, { status: 500 });
    }

    // 4. Insert into Supabase
    const { data: domain, error: insertError } = await supabase
      .from('user_domains')
      .insert([
        {
          domain_name: cleanDomain,
          verification_token: verificationToken,
          user_id: session.user.id,
          cloudflare_zone_id: zone.id,
          cloudflare_nameservers: zone.name_servers,
          cloudflare_status: 'pending',
          admin_approval: 'approved'
        }
      ])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ message: insertError.message }, { status: 500 });
    }

    // 5. Optional: Add the TXT record and setup Routing if Active
    try {
      await cloudflare.addVerificationTXT(zone.id, verificationToken);
      
      // NEW: If zone is already active (reused or fast-pointed), automate routing immediately
      if (zone.status === 'active') {
        console.log(`DOMAIN SETUP: Zone [${cleanDomain}] is already ACTIVE. Automating routing...`);
        const workerName = process.env.CLOUDFLARE_WORKER_NAME || 'quamify-email-worker';
        
        // Setup DNS first
        await cloudflare.setupEmailDNS(zone.id);
        await cloudflare.setupGeneralDNS(zone.id, cleanDomain);
        
        // Setup Routing
        await cloudflare.setupEmailRouting(zone.id, workerName);

        // Update DB status to active since we just successfully provisioned it
        await supabase
          .from('user_domains')
          .update({ cloudflare_status: 'active' })
          .eq('id', domain.id);
          
        console.log(`DOMAIN SETUP: Automation finalized for [${cleanDomain}]`);
      }
    } catch (e) {
      console.warn(`DOMAIN SETUP: Background automation (Best effort) failed:`, e);
    }

    return NextResponse.json({
      success: true,
      domain,
      nameservers: zone.name_servers
    });

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
