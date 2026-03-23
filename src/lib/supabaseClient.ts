import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

let instance: any = null

// Singleton instance for client-side use (Lazy via Proxy)
export const supabase = new Proxy({} as any, {
  get: (target, prop) => {
    if (!instance) {
      instance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        }
      })
    }
    return instance[prop]
  }
})
