import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const COOKIE_OPTIONS: CookieOptions = {
    maxAge: 60 * 60 * 24 * 365, // 1 year session
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Middleware: Missing Supabase environment variables.");
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
            ...COOKIE_OPTIONS,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
            ...COOKIE_OPTIONS,
            maxAge: 0,
          })
        },
      },
    }
  )

  const isLoginPath = request.nextUrl.pathname.startsWith('/login')
  const isAuthPath = request.nextUrl.pathname.startsWith('/auth') || request.nextUrl.pathname.startsWith('/api/auth')
  const isHomePath = request.nextUrl.pathname === '/'
  const isIngestPath = request.nextUrl.pathname.startsWith('/api/ingest')
  const isPublicApiPath = request.nextUrl.pathname.startsWith('/api/domains')
  const isPublicContent = request.nextUrl.pathname === '/terms' || request.nextUrl.pathname === '/safety' || request.nextUrl.pathname === '/icon.svg'

  // Skip getUser for truly public APIs and static content to save a network roundtrip
  if (isIngestPath || isPublicApiPath || isPublicContent) {
    return response
  }

  let user = null;
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    console.error("Middleware: getUser failed:", err);
  }

  // 1. If NO user and trying to access protected routes, redirect to login
  if (!user && !isLoginPath && !isAuthPath && !isHomePath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    
    // IMPORTANT: When redirecting, we must copy any updated cookies 
    // from the initial 'response' (which getUser may have updated)
    const redirectResponse = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  // 2. If user IS authenticated and trying to access login, redirect to dashboard (/)
  if (user && isLoginPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    
    const redirectResponse = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  return response
}
