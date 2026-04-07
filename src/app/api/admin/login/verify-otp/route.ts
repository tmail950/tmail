export const runtime = 'edge';
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json()
    if (!email || !otp) return NextResponse.json({ error: 'All fields required' }, { status: 400 })

    const adminClient = createAdminClient()
    const { data: settings } = await adminClient.from('site_settings').select('*')
    const settingsMap: Record<string, string> = {}
    settings?.forEach((s: any) => settingsMap[s.key] = s.value)
    
    const dbOtp = settingsMap[`login_otp_${email}`]
    const dbExpiry = settingsMap[`login_otp_expiry_${email}`]
    
    if (!dbOtp || !dbExpiry || dbOtp !== otp || new Date() > new Date(dbExpiry)) {
      return NextResponse.json({ error: 'Invalid or expired OTP.' }, { status: 401 })
    }

    // Clear OTP after success
    await adminClient.from('site_settings').delete().in('key', [`login_otp_${email}`, `login_otp_expiry_${email}`])

    return NextResponse.json({ success: true, message: 'OTP verified.' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
