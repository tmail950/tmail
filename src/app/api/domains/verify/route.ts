import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import dns from 'dns/promises'
import { cloudflare } from '@/lib/cloudflare'

export async function POST(request: Request) {
  try {
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

    // 2. Perform Cloudflare Check if it's a Cloudflare-managed domain
    const isCloudflareDomain = !!domain.cloudflare_zone_id;
    let isVerified = false;

    if (isCloudflareDomain) {
      const zone = await cloudflare.getZone(domain.cloudflare_zone_id);
      
      if (zone.status === 'active') {
        isVerified = true;
        // Automatically setup Email Routing if not already done
        if (domain.cloudflare_status !== 'active') {
          try {
            await cloudflare.setupEmailRouting(zone.id, process.env.CLOUDFLARE_WORKER_NAME!);
            await cloudflare.setupEmailDNS(zone.id);
            await supabase
              .from('user_domains')
              .update({ cloudflare_status: 'active' })
              .eq('id', id);
          } catch (e) {
          }
        }
      }
    } else {
      // Legacy TXT record verification
      const cleanDomain = domain.domain_name
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')

      try {
        const txtRecords = await dns.resolveTxt(cleanDomain)
        const flattenedRecords = txtRecords.flat()
        isVerified = flattenedRecords.includes(domain.verification_token)
      } catch (dnsError) {
      }
    }

    if (isVerified) {
      // 3. Update database
      const { error: updateError } = await supabase
        .from('user_domains')
        .update({ is_verified: true, verified_at: new Date().toISOString() })
        .eq('id', id)

      if (updateError) throw updateError

      return NextResponse.json({ message: 'Domain verified successfully! Email routing is being configured.', verified: true })
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
