'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, Loader2 } from 'lucide-react'
import { domainService } from '@/services/domainService'

export default function SafetyPage() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContent()
  }, [])

  const fetchContent = async () => {
    try {
      const settings = await domainService.getSettings()
      setContent(settings.safety_clause_content || 'TMAIL.PK ka structure third-party providers (Vercel, Supabase, Cloudflare) par depend karta hai. In platforms ki policies, free-tier limits, ya uptime humare control mein nahi hain.')
    } catch (err) {
      setContent('Security and safety protocols are active. Details available upon system sync.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-20 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-3xl bg-red-500/10 border border-red-500/20">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Safety Clause</h1>
            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.3em]">Liability Limitation Framework</p>
          </div>
        </div>

        <div className="glass-panel p-12 rounded-[50px] border border-red-500/5 bg-white/[0.02] backdrop-blur-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
          
          {loading ? (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
                <div className="p-8 rounded-3xl bg-red-500/5 border border-red-500/10 mb-8">
                    <p className="text-[10px] uppercase font-black tracking-widest text-red-500/50 mb-2">Notice of Infrastructure Dependency</p>
                    <p className="text-gray-400 leading-relaxed whitespace-pre-wrap font-medium italic">
                        {content}
                    </p>
                </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
