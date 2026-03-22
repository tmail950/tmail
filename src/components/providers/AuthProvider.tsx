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
        // Direct fetch from Supabase to check admin status
        // This assumes RLS is set up to allow users to read their own admin flag 
        // or a public/authenticated table for admin checks
        const { data, error } = await supabase
          .from('admins')
          .select('email')
          .eq('email', userEmail)
          .single()
        
        if (error) {
          // Fallback for master admins
          const masterAdmins = ['info369skills@gmail.com', 'danubaba369@gmail.com']
          return masterAdmins.includes(userEmail)
        }
        
        return !!data
      } catch (e) {
        return false
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

    initializeAuth()

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
      
      // 1. Clear Supabase session (non-blocking for UX)
      supabase.auth.signOut().catch(e => console.error("AUTH: Supabase signOut failed:", e));
      
      // 2. Explicitly wipe all local and session storage
      console.log("AUTH: Purging local memory caches...");
      localStorage.clear();
      sessionStorage.clear();
      
      // 3. Force redirect with a hard reload
      console.log("AUTH: Force redirecting to portal...");
      window.location.href = '/login?logout=success';
      
      // Final fallback if href takes time
      setTimeout(() => {
        window.location.replace('/login');
      }, 1000);
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
