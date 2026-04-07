import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { otp, newEmail, newPassword } = await req.json()

    if (!otp || !newEmail || !newPassword) {
      return NextResponse.json({ error: 'OTP, new email, and new password are required.' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: settings } = await adminClient.from('site_settings').select('*')
    const settingsMap: Record<string, string> = {}
    settings?.forEach((s: any) => settingsMap[s.key] = s.value)

    // POINT 1: Skip OTP if explicitly requested from a valid admin session
    if (otp === 'DIRECT_UPDATE') {
      const isAdminSession = session.user.email === settingsMap.admin_email || 
                           session.user.email === 'info369skills@gmail.com';
      if (!isAdminSession) {
        return NextResponse.json({ error: 'Direct update unauthorized.' }, { status: 403 })
      }
      console.log("ADMIN-CHANGE: Processing direct update bypass...");
    } else {
      const dbOtp = settingsMap.pending_master_otp
      const dbExpiry = settingsMap.pending_master_otp_expiry
      
      if (!dbOtp || !dbExpiry || dbOtp !== otp || new Date() > new Date(dbExpiry)) {
        return NextResponse.json({ error: 'Invalid or expired OTP.' }, { status: 400 })
      }

      // Clear pending OTP info immediately to prevent reuse
      await adminClient.from('site_settings').delete().in('key', ['pending_master_otp', 'pending_master_otp_expiry'])
    }

    // 3. Update master email and password in site_settings
    const updates = [
      { key: 'admin_email', value: newEmail, updated_at: new Date().toISOString() },
      { key: 'admin_password', value: newPassword, updated_at: new Date().toISOString() },
    ]
    
    for (const update of updates) {
      await adminClient.from('site_settings').upsert(update)
    }

    // 4. Verification flow for the NEW email (Double-check requirement)
    // We update the Supabase Auth user email, which triggers verification by default
    const isMasterUser = session.user.email === settingsMap.admin_email || 
                         session.user.email === 'info369skills@gmail.com';
    
    if (isMasterUser) {
      // Trigger Supabase's native email change flow (sends verification to new email)
      const { error: authError } = await adminClient.auth.admin.updateUserById(session.user.id, {
        email: newEmail,
        password: newPassword
      })
      
      if (authError) {
        console.warn('Auth update error (possibly fine if not the same user):', authError.message)
      } else {
        // Also send a custom notification using our service
        await emailService.sendNewEmailVerification(newEmail)
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Master email settings updated. Please verify your identity in the NEW inbox.' 
    })
  } catch (error: any) {
    console.error('Confirm email change error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
