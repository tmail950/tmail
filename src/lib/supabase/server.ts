import { createServerClient, type CookieOptions } from '@supabase/ssr'

const COOKIE_OPTIONS: CookieOptions = {
  maxAge: 60 * 60 * 24 * 365, // 1 year session
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
}

/**
 * Creates a Supabase client for Server Components, Server Actions, and API routes.
 * Strictly checks for server environment to prevent build-time boundary leakage.
 */
export async function createClient() {
  // Environment guard: If this is called in the browser, redirect to the client-side creator
  if (typeof window !== 'undefined') {
    const { createClient: createBrowserClient } = await import('@/lib/supabase/client');
    return createBrowserClient();
  }

  // Dynamic import of next/headers is mandatory to prevent Turbopack from tracing 
  // this module into the client bundle at build time.
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options, ...COOKIE_OPTIONS })
          } catch {
            // Safe to ignore in Server Components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options, ...COOKIE_OPTIONS, maxAge: 0 })
          } catch {
            // Safe to ignore in Server Components
          }
        },
      },
    }
  )
}
