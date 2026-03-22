"use client"

import { useState, useEffect, useCallback } from "react"
import { Settings, Loader2, Save } from "lucide-react"
import { useAuth } from "@/components/providers/AuthProvider"
import { useRouter } from "next/navigation"
import { domainService } from "@/services/domainService"

interface SystemSettings {
  admin_email: string;
  auto_approve_domains: boolean;
  copyright_text: string;
  terms_content: string;
  safety_clause_content: string;
}

export default function AdminSettings() {
  const { user, isAdmin, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [settings, setSettings] = useState<SystemSettings>({
    admin_email: "",
    auto_approve_domains: true,
    copyright_text: "",
    terms_content: "",
    safety_clause_content: ""
  })
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchAdminData = useCallback(async () => {
    if (!isAdmin) return
    try {
      setLoading(true)
      const siteSettings = await domainService.getSettings()
      
      const masterAdmin = siteSettings.admin_email || "info369skills@gmail.com"
      
      setSettings({
        admin_email: masterAdmin,
        auto_approve_domains: siteSettings.auto_approve_domains === 'true',
        copyright_text: siteSettings.copyright_text || "",
        terms_content: siteSettings.terms_content || "",
        safety_clause_content: siteSettings.safety_clause_content || ""
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin) {
      router.push("/")
      return
    }
    fetchAdminData()
  }, [authLoading, isAdmin, router, fetchAdminData])

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true)
      await Promise.all([
        domainService.updateSetting("admin_email", settings.admin_email),
        domainService.addAdmin(settings.admin_email),
        domainService.updateSetting("auto_approve_domains", settings.auto_approve_domains ? "true" : "false"),
        domainService.updateSetting("copyright_text", settings.copyright_text),
        domainService.updateSetting("terms_content", settings.terms_content),
        domainService.updateSetting("safety_clause_content", settings.safety_clause_content)
      ])
      alert("System updated successfully.")
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message)
      alert(`Update Failed: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-[var(--color-brand-pink)] animate-spin" />
      </div>
    )
  }

  if (isAdmin === false) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-[var(--color-brand-pink)] animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 space-y-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-3xl bg-red-500/10 border border-red-500/20">
            <Settings className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">System Configuration</h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Global Platform Parameters</p>
          </div>
        </div>
        
        <button 
          onClick={() => router.push('/domains')}
          className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
        >
          My Domains
        </button>
      </div>

      <div className="glass-panel p-8 rounded-[40px] border border-white/10 space-y-8 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Master Admin Email</label>
            <input 
              type="email" 
              value={settings.admin_email}
              onChange={(e) => setSettings({...settings, admin_email: e.target.value})}
              className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-medium focus:border-[var(--color-brand-purple)] outline-none"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Domain Approval Mode</label>
            <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex-1">
                <p className="text-xs text-white font-bold">{settings.auto_approve_domains ? 'Automatic' : 'Manual Permission'}</p>
                <p className="text-[9px] text-gray-500 font-medium italic">
                  {settings.auto_approve_domains ? 'New domains are approved instantly.' : 'Admin must approve new domains.'}
                </p>
              </div>
              <button 
                onClick={() => setSettings({...settings, auto_approve_domains: !settings.auto_approve_domains})}
                className={`w-12 h-6 rounded-full p-1 transition-all ${settings.auto_approve_domains ? 'bg-green-500' : 'bg-red-500'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-all ${settings.auto_approve_domains ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Terms & Conditions</label>
          <textarea 
            value={settings.terms_content}
            onChange={(e) => setSettings({...settings, terms_content: e.target.value})}
            className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white min-h-[150px] resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Safety Clause</label>
          <textarea 
            value={settings.safety_clause_content}
            onChange={(e) => setSettings({...settings, safety_clause_content: e.target.value})}
            className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white min-h-[150px] resize-none"
          />
        </div>

        <button 
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="w-full py-5 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-[var(--color-brand-pink)] hover:text-white transition-all disabled:opacity-50 shadow-xl"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Deploy System Update
        </button>
      </div>
    </div>
  )
}
