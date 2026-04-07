import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // use "code" from search params to exchange for session

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL('/?auth=success', origin))
    }
  }

  // redirect the user to login with an error message
  return NextResponse.redirect(new URL('/login?error=Authentication failed. Please check your credentials or try again.', request.url))
}
