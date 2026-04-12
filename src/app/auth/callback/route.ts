import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Moved server-only import inside the handler function to ensure accurate boundary evaluation
  const { createClient } = await import('@/lib/supabase/server')
  
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
  const errorMsg = 'Authentication failed. Please check your credentials or try again.'
  const redirectUrl = new URL(`/login?error=${encodeURIComponent(errorMsg)}`, request.url)
  return NextResponse.redirect(redirectUrl)
}
