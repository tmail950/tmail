"use client";


import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type User, type Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  isAdmin: boolean | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: null,
  isLoading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const checkAdminStatus = async (userEmail: string | undefined) => {
      if (!userEmail) return false
      
      try {
        const { data, error } = await supabase
          .from('admins')
          .select('email')
          .eq('email', userEmail)
          .single()
        
        if (error) {
          console.warn("AUTH: Admin check failed (Normal result for non-admins):", error.message);
          // Fallback for master admins
          const masterAdmins = ['info369skills@gmail.com', 'danubaba369@gmail.com']
          return masterAdmins.includes(userEmail)
        }
        
        return !!data
      } catch (e) {
        console.warn("AUTH: Identity verification bypass triggered (406+).");
        return false;
      }
    }

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)
          
          if (session?.user) {
            const adminStatus = await checkAdminStatus(session.user.email)
            if (mounted) setIsAdmin(adminStatus)
          } else {
            setIsAdmin(false)
          }
          setIsLoading(false)
        }
      } catch (e) {
        if (mounted) {
          setIsAdmin(false)
          setIsLoading(false)
        }
      }
    }

    const failsafe = setTimeout(() => {
      if (isLoading) {
        console.warn("AUTH: Failsafe triggered - forcing isLoading to false.")
        setIsLoading(false)
      }
    }, 4500)

    initializeAuth().finally(() => {
      clearTimeout(failsafe)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return

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
        const adminStatus = await checkAdminStatus(currentSession.user.email)
        if (mounted) setIsAdmin(adminStatus)
      } else {
        setIsAdmin(false)
      }
      
      setIsLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      console.log("AUTH: Termination sequence initiated...");
      
      // 1. Purge local memory caches
      console.log("AUTH: Purging local memory caches...");
      localStorage.clear();
      sessionStorage.clear();

      // 2. Redirect to server-side signout endpoint (this clears cookies & redirects to /login)
      console.log("AUTH: Executing server-side termination...");
      window.location.href = '/api/auth/signout';
      
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
