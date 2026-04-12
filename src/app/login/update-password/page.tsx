'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Loader2, Eye, EyeOff } from "lucide-react"
import { useRouter } from 'next/navigation'

function UpdatePasswordContent() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Check if we actually have a hash fragment from Supabase auth reset
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) {
      // It's possible the user is already authenticated from the link via PKCE
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setMessage({ type: 'error', text: 'Invalid or expired recovery link.' });
        }
      });
    }
  }, [supabase]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }
    
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setMessage({ type: 'success', text: 'Password updated successfully! Redirecting...' })
      
      // Update local storage so next login uses the new master password
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        localStorage.setItem("TMAIL.PK_guest_password", password);
        localStorage.setItem("TMAIL.PK_active_email", user.email);
        localStorage.setItem("TMAIL.PK_last_confirmed_email", user.email);
        localStorage.setItem("TMAIL.PK_is_premium_access", "true");
        localStorage.setItem("TMAIL.PK_guest_activated", "true");
      }

      setTimeout(() => window.location.href = '/', 1500)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg p-8 rounded-[40px] bg-black/40 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden group"
      >
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[var(--color-brand-pink)]/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[var(--color-brand-orange)]/10 rounded-full blur-[100px]" />

        <div className="relative z-10 text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent">
              Set New Password
            </h1>
            <p className="text-gray-400 text-sm font-medium">
              Enter a secure new master key for your account
            </p>
          </div>

          <form onSubmit={handleUpdate} className="space-y-6" autoComplete="off">
            <div className="space-y-4">
              <div className="relative group/pass">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 transition-colors group-focus-within/pass:text-[var(--color-brand-pink)]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-14 py-5 rounded-[24px] bg-white/5 border border-white/10 focus:border-[var(--color-brand-pink)] transition-all outline-none text-white text-sm font-mono tracking-[0.2em] placeholder:tracking-normal placeholder:font-sans"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-2 text-gray-600 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 bg-gradient-to-r from-[var(--color-brand-purple)] to-[var(--color-brand-pink)] hover:shadow-[var(--color-brand-pink)]/30 text-white text-[11px]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'UPDATE PASSWORD'}
            </button>
          </form>

          <footer className="pt-4 border-t border-white/5">
            <button 
              onClick={() => router.push('/login')}
              className="text-gray-500 hover:text-white transition-all group/toggle flex items-center justify-center gap-2 mx-auto"
            >
              <span className="text-[10px] uppercase font-black tracking-widest text-[var(--color-brand-pink)] group-hover:underline underline-offset-4 decoration-2">
                Back to Login
              </span>
            </button>
          </footer>

          <AnimatePresence mode="wait">
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
                  message.type === 'error' 
                    ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                    : 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]'
                }`}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[70vh]"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <UpdatePasswordContent />
    </Suspense>
  )
}
