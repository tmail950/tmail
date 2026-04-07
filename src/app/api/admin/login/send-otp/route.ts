import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const adminClient = createAdminClient()
    const { data: settings } = await adminClient.from('site_settings').select('*')
    const settingsMap: Record<string, string> = {}
    settings?.forEach((s: any) => settingsMap[s.key] = s.value)
    
    // Safety: Only send to the official master emails
    const authorizedAdmins = [
      settingsMap.admin_email, 
      'info369skills@gmail.com',
      'Admin@tmail.pk',
      'master@tmail.pk'
    ].filter(Boolean).map(e => e?.toLowerCase());

    if (!authorizedAdmins.includes(email.toLowerCase())) {
      return NextResponse.json({ error: 'Unauthorized email' }, { status: 403 })
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 mins for login

    await adminClient.from('site_settings').upsert([
      { key: `login_otp_${email}`, value: otp, updated_at: new Date().toISOString() },
      { key: `login_otp_expiry_${email}`, value: expiresAt, updated_at: new Date().toISOString() }
    ])

    await emailService.sendNumericOTP(email, otp)

    return NextResponse.json({ 
      success: true, 
      message: 'Numeric OTP sent.',
      dev_otp: otp 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
