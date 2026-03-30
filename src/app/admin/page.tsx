'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Loader2, LogIn, Eye, EyeOff, ShieldAlert } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<'login' | 'otp'>('login')
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [devOtp, setDevOtp] = useState<string | null>(null)
  
  const supabase = createClient()

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { domainService } = await import('@/services/domainService')
      const settings = await domainService.getSettings()
      const masterAdmin = settings.admin_email || 'info369skills@gmail.com'

      // Step 1: Password Auth
      if (step === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        if (email !== masterAdmin && email !== 'info369skills@gmail.com') {
          await supabase.auth.signOut()
          throw new Error('Access denied: Unauthorized admin attempt.')
        }

        const res = await fetch('/api/admin/login/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        })
        
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)

        if (data.dev_otp) {
          setDevOtp(data.dev_otp)
          setTimeout(() => setDevOtp(null), 10000)
        }

        setStep('otp')
        setMessage({ type: 'success', text: '6-digit Numeric OTP sent to your email.' })
      } else {
        // Step 2: Numeric OTP Verification
        const res = await fetch('/api/admin/login/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp })
        })

        if (!res.ok) throw new Error((await res.json()).error)
        
        window.location.href = '/admin/settings'
      }
    } catch (error: unknown) {
      const err = error as Error;
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 rounded-[40px] bg-[#0A0A0A] border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)] relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldAlert className="w-24 h-24 text-red-500" />
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
              Admin <span className="text-red-500">Portal</span>
            </h1>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">
              {step === 'login' ? 'Master Identification' : 'Identity Verification'}
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            {step === 'login' ? (
              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                  <input
                    type="email"
                    placeholder="Master Email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-red-500/50 transition-all outline-none text-white text-sm"
                  />
                </div>
                
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Master Password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-red-500/50 transition-all outline-none text-white text-sm"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {devOtp && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center"
                  >
                    <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-1">Dev Mode — Master OTP</p>
                    <p className="text-2xl font-black text-white font-mono tracking-[0.5em]">{devOtp}</p>
                  </motion.div>
                )}
                
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                  <input
                    type="text"
                    placeholder="Enter 6-Digit OTP"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-12 pr-4 py-5 rounded-2xl bg-red-500/5 border border-red-500/30 focus:border-red-500 transition-all outline-none text-white text-lg font-black tracking-[1em] text-center uppercase"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-red-600 to-red-900 text-white font-black uppercase tracking-widest shadow-lg hover:shadow-red-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {step === 'login' ? 'Confirm Identity' : 'Verify & Access'}
            </button>
            
            {step === 'otp' && (
              <button
                type="button"
                onClick={() => setStep('login')}
                className="w-full text-[10px] text-gray-600 hover:text-white uppercase font-black tracking-widest transition-colors"
              >
                Back to Identification
              </button>
            )}
          </form>

          <AnimatePresence mode="wait">
            {message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold text-center"
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
