'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Settings, 
  Mail, 
  Shield, 
  Save, 
  Loader2, 
  LogOut, 
  ChevronRight,
  RefreshCw,
  Lock,
  Globe
} from 'lucide-react'
import { domainService } from '@/services/domainService'

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Master email change flow
  const [showEmailChange, setShowEmailChange] = useState(false)
  const [newMasterEmail, setNewMasterEmail] = useState('')
  const [newMasterPassword, setNewMasterPassword] = useState('')
  const [emailChangeOtp, setEmailChangeOtp] = useState('')
  const [emailChangeStep, setEmailChangeStep] = useState<'form' | 'verify'>('form')
  const [emailChangeSending, setEmailChangeSending] = useState(false)
  const [devOtp, setDevOtp] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    checkAdmin()
    fetchSettings()
  }, [])

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      window.location.href = '/admin'
      return
    }
    
    // In a real app, we'd check against the 'admins' table or a specific claim
    // For this implementation, the /admin login already filtered them.
    setIsAdmin(true)
  }

  const fetchSettings = async () => {
    try {
      const data = await domainService.getSettings()
      setSettings(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage(null)
    try {
      for (const [key, value] of Object.entries(settings)) {
        await domainService.updateSetting(key, value)
      }
      setMessage({ type: 'success', text: 'Settings updated successfully!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/admin'
  }

  const sendEmailChangeOtp = async () => {
    if (!newMasterEmail || !newMasterPassword) {
      setMessage({ type: 'error', text: 'Enter new email and new password first.' })
      return
    }
    
    // Point 1: Direct update without OTP from dashboard
    confirmEmailChange("DIRECT_UPDATE");
  }

  const confirmEmailChange = async (otpOverride?: string) => {
    const finalOtp = otpOverride || emailChangeOtp;
    if (!finalOtp) return
    setEmailChangeSending(true)
    try {
      const res = await fetch('/api/admin/confirm-change-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: finalOtp, newEmail: newMasterEmail, newPassword: newMasterPassword })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      setMessage({ type: 'success', text: data.message || 'Master email updated successfully!' })
      setShowEmailChange(false)
      setEmailChangeStep('form')
      setNewMasterEmail('')
      setNewMasterPassword('')
      setEmailChangeOtp('')
      setTimeout(fetchSettings, 2000)
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setEmailChangeSending(false)
    }
  }

  if (!isAdmin || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050505]">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] p-6 sm:p-12 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2" />
      
      <div className="max-w-5xl mx-auto relative z-10">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-red-500 mb-2">
              <Shield className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Master Control</span>
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">
              System <span className="text-red-500">Settings</span>
            </h1>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-red-500/50 transition-all font-black uppercase text-[10px] tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            Terminate Session
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Configuration */}
          <div className="lg:col-span-2 space-y-6">
            <section className="p-8 rounded-[40px] bg-[#0A0A0A] border border-white/5 shadow-2xl space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                <Settings className="w-5 h-5 text-red-500" />
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Global Configuration</h2>
              </div>

              <div className="space-y-6">
                 {/* Master Admin Email */}
                 <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Mail className="w-3 h-3" /> Master Admin Email
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="email"
                      value={settings.admin_email || ''}
                      readOnly
                      className="flex-1 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 outline-none text-white font-mono text-sm cursor-not-allowed opacity-60"
                    />
                    <button
                      onClick={() => setShowEmailChange(true)}
                      className="px-4 py-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/20 transition-all whitespace-nowrap"
                    >
                      Update Master Credentials
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-600 font-medium italic">Directly update the system's root identification. Changes take effect on next login.</p>
                </div>

                {/* Support Email */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <RefreshCw className="w-3 h-3" /> Public Support Email
                  </label>
                  <input
                    type="email"
                    value={settings.support_email || ''}
                    onChange={(e) => handleUpdateSetting('support_email', e.target.value)}
                    placeholder="support@domain.com"
                    className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-white/20 transition-all outline-none text-white text-sm"
                  />
                </div>

                {/* Site Name / Copy */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <LogOut className="w-3 h-3" /> Copyright Text
                  </label>
                  <input
                    type="text"
                    value={settings.copyright_text || ''}
                    onChange={(e) => handleUpdateSetting('copyright_text', e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-white/20 transition-all outline-none text-white text-sm"
                  />
                </div>
              </div>

              <div className="pt-8">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-red-900/20 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Deploy Policy Changes
                </button>
              </div>
            </section>
          </div>

          {/* Sidebar / Quick Stats/ Security */}
          <div className="space-y-6">
            <section className="p-8 rounded-[40px] bg-blue-600/5 border border-blue-500/10 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-blue-500" />
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">Platform Nodes</h2>
                </div>
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              </div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                Connect and manage custom domains for decentralized mail nodes.
              </p>
              <button 
                onClick={() => window.location.href = '/domains'}
                className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest transition-all group"
              >
                Manage Domains
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </section>

            <section className="p-8 rounded-[40px] bg-red-600/5 border border-red-500/10 space-y-6">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-red-500" />
                <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Security Status</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 rounded-2xl bg-black/40 border border-white/5">
                    <span className="text-[10px] text-gray-500 uppercase font-black">Admin OTP</span>
                    <span className="text-[10px] text-green-500 uppercase font-black">Shield Active</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-2xl bg-black/40 border border-white/5">
                    <span className="text-[10px] text-gray-500 uppercase font-black">Persistence</span>
                    <span className="text-[10px] text-blue-500 uppercase font-black">Synced</span>
                </div>
              </div>
            </section>
            
            <section className="p-8 rounded-[40px] bg-white/[0.02] border border-white/5 space-y-4 group">
               <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Site Footer Links</h4>
               <div className="space-y-2">
                 <button className="w-full flex justify-between items-center p-3 rounded-xl hover:bg-white/5 transition-all group-hover:text-white">
                   <span className="text-xs">Terms of Service</span>
                   <ChevronRight className="w-4 h-4 opacity-30" />
                 </button>
                 <button className="w-full flex justify-between items-center p-3 rounded-xl hover:bg-white/5 transition-all group-hover:text-white">
                   <span className="text-xs">Privacy Policy</span>
                   <ChevronRight className="w-4 h-4 opacity-30" />
                 </button>
               </div>
            </section>
          </div>
        </div>

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 rounded-full border shadow-2xl z-50 ${
                message.type === 'success' ? 'bg-black border-green-500/50 text-green-400' : 'bg-black border-red-500/50 text-red-400'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest">{message.text}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Master Email Change Modal */}
        <AnimatePresence>
          {showEmailChange && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setShowEmailChange(false); setEmailChangeStep('form'); }}
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-[#050505] rounded-[40px] border border-red-500/20 shadow-[0_0_60px_rgba(220,38,38,0.2)] p-8 sm:p-12 overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Change Master Email</h3>
                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-0.5">
                      Step {emailChangeStep === 'form' ? '1 — New Credentials' : '2 — Verify OTP'}
                    </p>
                  </div>
                </div>

                {emailChangeStep === 'form' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block">New Master Email</label>
                      <input
                        type="email"
                        value={newMasterEmail}
                        onChange={e => setNewMasterEmail(e.target.value)}
                        placeholder="new-admin@domain.com"
                        className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-red-500/50 outline-none text-white text-sm transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block">New Admin Password</label>
                      <input
                        type="password"
                        value={newMasterPassword}
                        onChange={e => setNewMasterPassword(e.target.value)}
                        placeholder="Set new password..."
                        className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-red-500/50 outline-none text-white text-sm transition-all"
                      />
                    </div>
                    <p className="text-[9px] text-gray-600 italic">An OTP will be sent to the current master email for verification.</p>
                    <button
                      onClick={sendEmailChangeOtp}
                      disabled={emailChangeSending}
                      className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-[10px] transition-all mt-4 disabled:opacity-50"
                    >
                      {emailChangeSending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send Verification OTP →'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-400">Enter the 6-digit OTP sent to the current master email to confirm this change.</p>
                    
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

                    <input
                      type="text"
                      maxLength={6}
                      value={emailChangeOtp}
                      onChange={e => setEmailChangeOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full px-5 py-5 rounded-2xl bg-white/5 border border-white/10 focus:border-green-500/50 outline-none text-white font-mono text-3xl tracking-[0.5em] text-center transition-all"
                    />
                    <button
                      onClick={() => confirmEmailChange()}
                      disabled={emailChangeSending || emailChangeOtp.length < 6}
                      className="w-full py-4 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
                    >
                      {emailChangeSending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Change ✓'}
                    </button>
                    <button onClick={() => setEmailChangeStep('form')} className="w-full py-3 rounded-2xl text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">
                      ← Back
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
