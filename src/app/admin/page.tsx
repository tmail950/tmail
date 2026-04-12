'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Loader2, LogIn, Eye, EyeOff } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const supabase = createClient()

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      // Step 1: Password Auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      // Fetch settings to verify admin authorization
      const { domainService } = await import('@/services/domainService')
      const settings = await domainService.getSettings()
      const masterAdmin = (settings.admin_email || 'info369skills@gmail.com').toLowerCase()

      const authorizedAdmins = [
        masterAdmin, 
        'info369skills@gmail.com',
        'admin@tmail.pk',
        'master@tmail.pk'
      ].filter(Boolean).map(e => e.toLowerCase());

      if (!authorizedAdmins.includes(email.toLowerCase())) {
        await supabase.auth.signOut()
        throw new Error('Access denied: Unauthorized admin attempt.')
      }

      // Successful login
      setMessage({ type: 'success', text: 'Authentication successful. Accessing dashboard...' })
      setTimeout(() => {
        window.location.href = '/admin/settings'
      }, 1000)

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Login failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-10 rounded-[40px] bg-[#0A0A0A] border border-white/5 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
        
        <div className="relative z-10 space-y-8">
          <div className="space-y-4 text-center">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
              Admin <span className="text-red-500">Portal</span>
            </h1>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">
              Identification Required
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 transition-colors group-focus-within:text-red-500">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  placeholder="Master Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-16 pr-6 py-5 rounded-3xl bg-white/[0.03] border border-white/10 focus:border-red-500/50 transition-all outline-none text-white text-sm"
                />
              </div>
              
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 transition-colors group-focus-within:text-red-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Master Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-16 pr-16 py-5 rounded-3xl bg-white/[0.03] border border-white/10 focus:border-red-500/50 transition-all outline-none text-white text-sm"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 rounded-3xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-red-900/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              Access Dashboard
            </button>
          </form>

          <AnimatePresence mode="wait">
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest text-center ${
                  message.type === 'error' 
                    ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                    : 'bg-green-500/10 text-green-400 border-green-500/20'
                }`}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      
      <p className="mt-8 text-[10px] text-gray-700 font-black uppercase tracking-[0.4em]">
        Authorized Personnel Only
      </p>
    </div>
  )
}
