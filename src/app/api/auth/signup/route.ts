import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password, username } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    
    // 1. Block signup if email is already a guest mailbox
    const { data: guestMail } = await supabase
      .from('guest_mailboxes')
      .select('email_address')
      .eq('email_address', email)
      .maybeSingle();

    if (guestMail) {
      return NextResponse.json({ 
        error: 'This email is already in use. Please use the Login page to sign in.',
        code: 'GUEST_EXISTS'
      }, { status: 403 });
    }

    // 2. Create the user with email_confirm: true
    const { data: userData, error: signupError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username }
    })

    if (signupError) {
      return NextResponse.json({ error: signupError.message }, { status: signupError.status || 500 })
    }

    // 3. Link the signup email to the user's personal inbox list
    const { error: linkError } = await supabase
      .from('user_emails')
      .insert({
        user_id: userData.user.id,
        email_address: email,
        password: password,
        created_at: new Date().toISOString()
      });

    if (linkError) {
      console.error('Signup link error (non-fatal):', linkError.message);
      // We don't block the result if just the link fails, but it's important for the UI
    }

    return NextResponse.json({ 
      message: 'User created successfully',
      user: userData.user
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
