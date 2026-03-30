"use client";


import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { type User, type Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  isAdmin: boolean | null
  isLoading: boolean
  signOut: (logoutNext?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: null,
  isLoading: true,
  signOut: async (logoutNext?: string) => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const checkAdminStatus = async (userEmail: string | undefined) => {
      if (!userEmail) return false
      
      try {
        const masterAdmins = ['info369skills@gmail.com', 'danubaba369@gmail.com', 'abc@artradering.com']
        if (masterAdmins.includes(userEmail)) return true

        const { data, error } = await supabase
          .from('admins')
          .select('email')
          .eq('email', userEmail)
          .maybeSingle()
        
        if (error) {
          console.warn("AUTH: Admin check failed:", error.message);
          return false
        }
        return !!data
      } catch (e) {
        return false;
      }
    }

    const initializeAuth = async () => {
      try {
        console.log("AUTH: Initializing session...");
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        
        if (mounted) {
          setSession(initialSession)
          setUser(initialSession?.user ?? null)
          
          if (initialSession?.user) {
            checkAdminStatus(initialSession.user.email).then(status => {
              if (mounted) setIsAdmin(status)
            })
          } else {
            setIsAdmin(false)
          }
          // We set isLoading to false ONLY after session is retrieved
          setIsLoading(false)
        }
      } catch (e) {
        console.error("AUTH: Critical initialization error:", e)
        if (mounted) {
          setIsAdmin(false)
          setIsLoading(false)
        }
      }
    }

    const failsafe = setTimeout(() => {
      if (isLoading && mounted) {
        console.warn("AUTH: Failsafe triggered - forcing isLoading to false.")
        setIsLoading(false)
      }
    }, 10000)

    initializeAuth().finally(() => {
      if (mounted) clearTimeout(failsafe)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, currentSession: Session | null) => {
      if (!mounted) return
      console.log(`AUTH: Event -> ${event}`);

      if (event === 'SIGNED_OUT') {
        setSession(null)
        setUser(null)
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        checkAdminStatus(currentSession.user.email).then(status => {
          if (mounted) setIsAdmin(status)
        })
      } else {
        setIsAdmin(false)
      }
      
      setIsLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(failsafe)
    }
  }, [])

  const signOut = async (logoutNext?: string) => {
    try {
      console.log("AUTH: Termination sequence initiated...");
      
      // 1. Purge local memory caches
      console.log("AUTH: Purging local memory caches...");
      localStorage.clear();
      sessionStorage.clear();

      // 2. Redirect to server-side signout endpoint (this clears cookies & redirects to /login)
      console.log("AUTH: Executing server-side termination...");
      const target = logoutNext ? `/api/auth/signout?next=${encodeURIComponent(logoutNext)}` : '/api/auth/signout';
      window.location.href = target;
      
      // 3. Optional client-side cleanup if redirect takes time
      supabase.auth.signOut().catch(() => {});
      
    } catch (error) {
      console.error('AUTH: Critical termination failure:', error);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
