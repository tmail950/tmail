import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Moved server-only imports inside the function to avoid boundary leakage errors in Next.js 15+
    const { createClient } = await import('@/lib/supabase/server')
    const dns = await import('dns/promises')
    const { cloudflare } = await import('@/lib/cloudflare')
    
    const supabase = await createClient()
    const { id } = await request.json()

    // 1. Fetch domain details
    const { data: domain, error: fetchError } = await supabase
      .from('user_domains')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !domain) {
      return NextResponse.json({ message: 'Domain not found' }, { status: 404 })
    }

    if (domain.is_verified) {
      return NextResponse.json({ message: 'Domain already verified', verified: true })
    }

    // 2. Perform Verification
    const isCloudflareDomain = !!domain.cloudflare_zone_id;
    let isVerified = false;

    // HIGH-SPEED CHECK: Attempt immediate NS verification first
    const { fastNSCheck } = await import('@/lib/dnsCheck');
    const isNSPointing = await fastNSCheck(domain.domain_name);
    
    if (isNSPointing) {
      console.log(`DOMAIN-VERIFY: [${domain.domain_name}] verified via high-speed NS lookup.`);
      isVerified = true;
    }

    if (!isVerified && isCloudflareDomain) {
      // Fallback to Cloudflare API check (slower)
      try {
        const zone = await cloudflare.getZone(domain.cloudflare_zone_id);
        if (zone.status === 'active') {
          isVerified = true;
        }
      } catch (e) {}
    }

    // Legacy TXT record verification as final fallback
    if (!isVerified && !isCloudflareDomain) {
      const cleanDomain = domain.domain_name
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')

      try {
        const txtRecords = await dns.resolveTxt(cleanDomain)
        const flattenedRecords = txtRecords.flat()
        isVerified = flattenedRecords.includes(domain.verification_token)
      } catch (dnsError) {}
    }

    if (isVerified) {
      // 3. Automate Cloudflare Stack if verified
      if (domain.cloudflare_status !== 'active' && isCloudflareDomain) {
        console.log(`DOMAIN-VERIFY: Domain [${domain.domain_name}] confirmed. Synchronizing Cloudflare stack...`);
        
        try {
          const workerName = process.env.CLOUDFLARE_WORKER_NAME || 'TMAIL.PK-email-worker';
          await cloudflare.setupEmailDNS(domain.cloudflare_zone_id);
          await cloudflare.setupGeneralDNS(domain.cloudflare_zone_id, domain.domain_name);
          await cloudflare.setupEmailRouting(domain.cloudflare_zone_id, workerName);
          
          await supabase
            .from('user_domains')
            .update({ cloudflare_status: 'active' })
            .eq('id', id);
        } catch (automationError: any) {
          console.warn(`DOMAIN-VERIFY: Background automation encountered a hurdle:`, automationError.message);
        }
      }

      // 4. Update database status
      const { error: updateError } = await supabase
        .from('user_domains')
        .update({ is_verified: true, verified_at: new Date().toISOString() })
        .eq('id', id)

      if (updateError) throw updateError

      return NextResponse.json({ 
        message: 'Domain verified successfully! Email routing is being configured.', 
        verified: true 
      })
    } else {
      const message = isCloudflareDomain 
        ? 'Cloudflare nameservers not yet active. Please ensure you have updated the nameservers at your registrar and wait a few minutes.'
        : 'Verification token not found in DNS records. Please check your setup and try again.';
        
      return NextResponse.json({ 
        message, 
        verified: false 
      }, { status: 400 })
    }
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ 
      message: `Verification failed: ${err.message}`, 
      verified: false 
    }, { status: 500 })
  }
}
