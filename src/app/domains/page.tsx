"use client"

import { useState, useEffect, useCallback } from "react"
import { Globe, Plus, Trash2, Loader2, AlertTriangle, ShieldCheck, Copy, Check, Info } from "lucide-react"
import { useAuth } from "@/components/providers/AuthProvider"
import { useRouter } from "next/navigation"
import { domainService, type DomainRecord } from "@/services/domainService"
import { supabase } from "@/lib/supabase"

export default function UserDomains() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [allDomains, setAllDomains] = useState<DomainRecord[]>([])
  const [newDomain, setNewDomain] = useState("")
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedType, setCopiedType] = useState<string | null>(null)

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopiedType(type)
    setTimeout(() => setCopiedType(null), 2000)
  }

  const fetchUserDomains = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      const domains = await domainService.listDomains()
      setAllDomains(domains || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    
    // Strict Admin Protection: Only master admin can access domain management
    if (user.email !== 'info369skills@gmail.com') {
      router.push("/")
      return
    }

    fetchUserDomains()
  }, [authLoading, user, router, fetchUserDomains])

  const handleAddDomain = async () => {
    if (!newDomain) return
    if (allDomains.length >= 9) {
      alert("Domain limit reached. You can add up to 9 domains.")
      return
    }
    try {
      setIsSaving(true)
      await domainService.addDomain(newDomain)
      setNewDomain("")
      fetchUserDomains()
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleVerifyDomain = async (id: string, domainName: string) => {
    try {
      setVerifying(id)
      // Use the robust verification API that handles both Cloudflare automation and legacy DNS
      const res = await domainService.verifyDomain(id)
      
      alert(res.message)
      fetchUserDomains()
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message)
    } finally {
      setVerifying(null)
    }
  }

  const handleDeleteDomain = async (id: string) => {
    if (!confirm("Are you sure you want to delete this domain?")) return
    try {
      await domainService.deleteDomain(id)
      setAllDomains(prev => prev.filter(d => d.id !== id))
      setError(null)
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message)
      alert(`Deletion Failed: ${error.message}`)
      setTimeout(() => setError(null), 5000)
    }
  }

  if (authLoading) {
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
          <div className="p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20">
            <Globe className="w-8 h-8 text-blue-500" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">My Domains</h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Connect your own domains for temporary mail nodes</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center gap-4 text-red-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Domain Addition & Instructions */}
        <div className="space-y-8">
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[var(--color-brand-purple)]" />
                <h2 className="text-xl font-black text-white uppercase tracking-widest">Connect New Node</h2>
              </div>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${allDomains.length >= 9 ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                {allDomains.length} / 9 DOMAINS
              </span>
            </div>
            
            <div className="glass-panel p-8 rounded-[40px] border border-white/10 space-y-6">
              <p className="text-xs text-gray-400 font-medium italic">Enter your domain (e.g. example.com). You will need to verify DNS after adding.</p>
              
              <div className="flex gap-4">
                <input 
                  type="text" 
                  placeholder="domain.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="flex-1 px-5 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-[var(--color-brand-purple)] outline-none text-white transition-all font-medium"
                />
                <button 
                  onClick={handleAddDomain}
                  disabled={isSaving || !newDomain}
                  className="px-8 rounded-2xl bg-white/10 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest hover:bg-[var(--color-brand-pink)] hover:text-white transition-all disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
                </button>
              </div>
            </div>
          </div>

          {allDomains.length > 0 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-500" />
                <h2 className="text-xl font-black text-white uppercase tracking-widest">DNS Configuration</h2>
              </div>
              
              <div className="glass-panel p-8 rounded-[40px] border border-white/10 space-y-6 overflow-hidden relative">
                 <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-30" />
                
                <p className="text-xs text-gray-400 font-medium">Add these records to your domain&apos;s DNS settings to activate the node and start receiving mail.</p>
                
                <div className="overflow-x-auto -mx-4 sm:-mx-0">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] uppercase font-black tracking-widest text-gray-500">
                        <th className="px-4 py-3 pb-4">Type</th>
                        <th className="px-4 py-3 pb-4">Name</th>
                        <th className="px-4 py-3 pb-4">Value</th>
                        <th className="px-4 py-3 pb-4">TTL</th>
                        <th className="px-4 py-3 pb-4 text-right">Copy</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] font-mono divide-y divide-white/5">
                      {/* Priority 1: Show Nameservers if available */}
                      {allDomains.some(d => d.cloudflare_nameservers) && (
                        <>
                          {allDomains.find(d => d.cloudflare_nameservers)?.cloudflare_nameservers?.map((ns, i) => (
                            <tr key={`ns-${i}`} className="group hover:bg-white/[0.02] transition-colors border-l-2 border-blue-500/50">
                              <td className="px-4 py-4">
                                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold">
                                  NS
                                </span>
                              </td>
                              <td className="px-4 py-4 text-gray-400">@</td>
                              <td className="px-4 py-4 text-white">{ns}</td>
                              <td className="px-4 py-4 text-gray-600">Auto</td>
                              <td className="px-4 py-4 text-right">
                                <button 
                                  onClick={() => copyToClipboard(ns, `NS-${i}`)}
                                  className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all inline-flex items-center justify-center min-w-[60px]"
                                >
                                  {copiedType === `NS-${i}` ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                      
                      {/* Standard Records (Fallback/Manual) */}
                      {[
                        { type: 'A', name: '@', value: '76.76.21.21', ttl: '14400' },
                        { type: 'CNAME', name: 'www', value: 'cname.quammify.fun', ttl: '14400' },
                        { type: 'MX', name: '@', value: 'mx1.quammify.fun', ttl: '14400', priority: '10' },
                        { type: 'MX', name: '@', value: 'mx2.quammify.fun', ttl: '14400', priority: '20' }
                      ].map((record, i) => (
                        <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-4">
                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300 font-bold">
                              {record.type}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-gray-400">{record.name}</td>
                          <td className="px-4 py-4 text-white">
                            {record.value} {record.priority && <span className="text-[9px] text-gray-500 ml-1">Pr: {record.priority}</span>}
                          </td>
                          <td className="px-4 py-4 text-gray-600">{record.ttl}</td>
                          <td className="px-4 py-4 text-right">
                            <button 
                              onClick={() => copyToClipboard(record.value, `${record.type}-${i}`)}
                              className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all inline-flex items-center justify-center min-w-[60px]"
                            >
                              {copiedType === `${record.type}-${i}` ? (
                                <Check className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[10px] text-blue-400 font-bold uppercase">Automated Configuration Active</p>
                    <p className="text-[10px] text-blue-400/70 font-medium leading-relaxed italic">
                      Move your domain to the Nameservers listed above. Once active, we will automatically configure MX records and Email Workers on Cloudflare.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* List of User Domains */}
        <div className="space-y-8">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--color-brand-pink)]" />
            <h2 className="text-xl font-black text-white uppercase tracking-widest">Connected Nodes ({allDomains.length})</h2>
          </div>

          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
              </div>
            ) : allDomains.length === 0 ? (
              <div className="p-12 rounded-[40px] border border-dashed border-white/5 text-center">
                <p className="text-xs text-gray-600 font-black uppercase tracking-widest italic">No domains registered yet.</p>
              </div>
            ) : (
              allDomains.map(domain => (
                <div key={domain.id} className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-white/20 transition-all overflow-hidden relative">
                   {domain.is_verified && (
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <ShieldCheck className="w-12 h-12 text-green-500 -mr-4 -mt-4 rotate-12" />
                    </div>
                  )}
                  
                  <div className="relative z-10">
                    <h4 className="text-lg font-bold text-white tracking-tight">{domain.domain_name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {domain.admin_approval === 'pending' ? (
                        <>
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                          <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest">
                            Pending Admin Approval
                          </p>
                        </>
                      ) : domain.admin_approval === 'rejected' ? (
                        <>
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <p className="text-[10px] text-red-500 font-black uppercase tracking-widest">
                            Request Rejected
                          </p>
                        </>
                      ) : (
                        <>
                          <div className={`w-1.5 h-1.5 rounded-full ${domain.is_verified ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                            {domain.is_verified ? 'Live / Active' : 'Pending Verification'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                    <div className="flex items-center gap-2 relative z-10">
                      {(user?.email === 'info369skills@gmail.com' && domain.admin_approval !== 'approved') && (
                        <button 
                          onClick={async () => {
                            await domainService.approveDomain(domain.id);
                            fetchUserDomains();
                          }}
                          className="px-4 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest border border-green-500/10"
                        >
                          Approve Platform
                        </button>
                      )}
                      {domain.admin_approval === 'approved' && (
                        <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5" />
                          Platform Active
                        </div>
                      )}
                      {!domain.is_verified && (
                        <button 
                          onClick={() => handleVerifyDomain(domain.id, domain.domain_name)}
                          disabled={verifying === domain.id}
                          className="px-6 py-3 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-brand-purple)] hover:text-white transition-all disabled:opacity-50 shadow-lg active:scale-95"
                        >
                          {verifying === domain.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Final Verify'}
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteDomain(domain.id)}
                        className="p-3 rounded-2xl bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
