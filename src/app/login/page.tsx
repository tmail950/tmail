'use client'

import { useState, Suspense, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Chrome, Lock, Loader2, Eye, EyeOff } from "lucide-react"
import { useSearchParams, useRouter } from 'next/navigation'
import { domainService } from '@/services/domainService';

function LoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const errorFromUrl = searchParams.get('error')
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(
    errorFromUrl ? { type: 'error', text: errorFromUrl } : null
  )
  const [availableDomains, setAvailableDomains] = useState<string[]>([])
  const [selectedDomain, setSelectedDomain] = useState('')
  const supabase = createClient()

  // Fetch professional domains on mount
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const platformDomains = await domainService.listPublicDomains();
        if (platformDomains && platformDomains.length > 0) {
          const names = platformDomains.map((d: any) => d.domain_name);
          setAvailableDomains(names);
          setSelectedDomain(names[0]);
        } else {
          setAvailableDomains([]);
          setSelectedDomain("");
        }
      } catch (e) {
        console.error('Failed to fetch domains', e);
        setAvailableDomains([]);
      }
    };
    fetchDomains();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const fullEmail = isSignUp ? `${username.toLowerCase().trim()}@${selectedDomain}` : username.trim();

    try {
      if (isSignUp) {
        // Use a custom API route for signup to bypass email confirmation using service role
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: fullEmail, password, username: username.toLowerCase().trim() }),
        })

        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Signup failed')

        // If signup success, sign in immediately
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: fullEmail,
          password,
        })
        if (signInError) throw signInError

        setMessage({ type: 'success', text: 'Account created! Logging you in...' })
        setTimeout(() => {
          window.location.href = '/?auth=success'
        }, 1000)
      } else {
        // Sign in logic
        const { error } = await supabase.auth.signInWithPassword({
          email: username.includes('@') ? username : `${username}@${selectedDomain}`, // Fallback if they just type username
          password,
        })
        if (error) throw error
        
        await supabase.auth.getSession()
        router.refresh()
        setTimeout(() => {
          window.location.href = '/?auth=success'
        }, 500)
      }
    } catch (error: unknown) {
      const err = error as Error;
      setMessage({ type: 'error', text: err.message === 'User already registered' ? 'This address is already in use' : err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden group"
      >
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[var(--color-brand-pink)]/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[var(--color-brand-orange)]/10 rounded-full blur-[100px]" />

        <div className="relative z-10 text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-gray-400 text-sm">
              {isSignUp ? 'Choose your professional disposable address' : 'Login to your professional inbox'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="flex flex-col gap-3">
              <div className="relative flex items-center">
                <Mail className="absolute left-4 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder={isSignUp ? "Username" : "Email or Username"}
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-[var(--color-brand-pink)] transition-all outline-none text-white text-sm"
                />
              </div>

              {isSignUp && (
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 transition-all">
                  <span className="pl-4 text-gray-500 font-bold text-xl">@</span>
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    className="flex-1 bg-transparent text-white text-sm font-bold py-2.5 outline-none cursor-pointer"
                  >
                    {availableDomains.map(d => (
                      <option key={d} value={d} className="bg-[#050505]">{d}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-[var(--color-brand-pink)] transition-all outline-none text-white text-sm"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--color-brand-purple)] to-[var(--color-brand-pink)] text-white font-black uppercase tracking-widest shadow-lg hover:shadow-[var(--color-brand-pink)]/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="pt-2 text-sm">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {isSignUp ? (
                <>Already have an account? <span className="text-[var(--color-brand-pink)] font-bold">Sign In</span></>
              ) : (
                <>Don&apos;t have an account? <span className="text-[var(--color-brand-pink)] font-bold">Sign Up</span></>
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-4 rounded-xl text-xs font-medium ${
                  message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="w-12 h-12 text-[var(--color-brand-pink)] animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
