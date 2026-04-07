export const runtime = 'edge';
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // 1. Check if we have a session to end
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    // 2. Sign out from Supabase (clears server-side session and cookies)
    await supabase.auth.signOut()
  }

  // 3. Clear any local storage/cookies (handled by redirect & client-side purge)
  const { searchParams } = new URL(request.url)
  const next = searchParams.get('next') || '/login?logout=success'
  const url = new URL(next, request.url)
  
  return NextResponse.redirect(url, {
    status: 302,
  })
}

// Support GET for simplicity if needed, but POST is safer
export async function GET(request: Request) {
  return POST(request)
}
