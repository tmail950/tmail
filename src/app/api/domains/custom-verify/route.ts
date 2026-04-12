import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Dynamic imports to strictly isolate server logic from build-time tracing
    const { createClient } = await import('@/lib/supabase/server')
    const dns = await import('dns/promises')

    const supabase = await createClient()
    const { domain } = await request.json()

    if (!domain) {
      return NextResponse.json({ message: 'Domain name is required' }, { status: 400 })
    }

    const cleanDomain = domain.toLowerCase().trim()
    
    const VERCEL_IP = "76.76.21.21"
    const VERCEL_CNAME = "cname.vercel-dns.com"
    const TMAIL_PK_CNAME = "cname.quammify.fun"
    const TMAIL_PK_MX1 = "mx1.quammify.fun"
    const TMAIL_PK_MX2 = "mx2.quammify.fun"
    
    let isVerified = false
    let reason = ""

    // 1. Check A Record
    try {
      const aRecords = await dns.resolve4(cleanDomain)
      if (aRecords.includes(VERCEL_IP)) {
        isVerified = true
        reason = "A-Record detected"
      }
    } catch {}

    // 2. Check CNAME (especially for subdomains)
    if (!isVerified) {
      try {
        const cnameRecords = await dns.resolveCname(cleanDomain)
        if (cnameRecords.includes(VERCEL_CNAME) || cnameRecords.includes(TMAIL_PK_CNAME)) {
          isVerified = true
          reason = "CNAME detected"
        }
      } catch {}
    }

    // 3. Check MX Records (Crucial for Mail)
    if (!isVerified) {
      try {
        const mxRecords = await dns.resolveMx(cleanDomain)
        const hasMX = mxRecords.some(mx => 
          mx.exchange.includes(TMAIL_PK_MX1) || 
          mx.exchange.includes(TMAIL_PK_MX2)
        )
        if (hasMX) {
          isVerified = true
          reason = "MX Records detected"
        }
      } catch {}
    }

    if (isVerified) {
      const { error } = await supabase
        .from('user_domains')
        .update({ is_verified: true, verified_at: new Date().toISOString() })
        .eq('domain_name', cleanDomain)

      if (error) throw error

      return NextResponse.json({ 
        message: `Verification Successful via ${reason}! Domain is now active.`, 
        verified: true 
      })
    } else {
      return NextResponse.json({ 
        message: 'DNS records not propagated yet. Please ensure A, CNAME, or MX records are set correctly.', 
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
