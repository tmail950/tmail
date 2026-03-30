import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { emailService } from '@/lib/email'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 1. Get current master email from settings
    const adminClient = createAdminClient()
    const { data: settings } = await adminClient.from('site_settings').select('*')
    const settingsMap: Record<string, string> = {}
    settings?.forEach((s: any) => settingsMap[s.key] = s.value)
    
    // Fallback to current session email if settings are empty
    const masterEmail = settingsMap.admin_email || session.user.email || ''
    if (!masterEmail) return NextResponse.json({ error: 'No master email found.' }, { status: 400 })

    // 2. Generate a 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

    // 3. Store OTP in site_settings for verification (Secure internal key)
    await adminClient.from('site_settings').upsert([
      { key: 'pending_master_otp', value: otp, updated_at: new Date().toISOString() },
      { key: 'pending_master_otp_expiry', value: expiresAt, updated_at: new Date().toISOString() }
    ])

    // 4. Send numeric OTP via emailService
    const delivery = await emailService.sendNumericOTP(masterEmail, otp)

    return NextResponse.json({ 
      success: true, 
      message: delivery.mode === 'console' 
        ? 'OTP logged to console (RESEND_API_KEY missing).' 
        : 'Numeric OTP sent to current master email.',
      dev_otp: process.env.NODE_ENV === 'development' ? otp : undefined
    })
  } catch (error: any) {
    console.error('Send OTP Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
