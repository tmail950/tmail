import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const COOKIE_OPTIONS: CookieOptions = {
  maxAge: 60 * 60 * 24 * 365, // 1 year session
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
}

export async function createClient() {
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
