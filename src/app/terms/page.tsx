'use client'

import { motion } from 'framer-motion'
import { Shield, Lock, Globe, AlertCircle } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen py-20 px-4 relative overflow-hidden bg-[#050505]">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--color-brand-pink)]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[var(--color-brand-purple)]/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto relative z-10"
      >
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic">
            Terms of <span className="text-[var(--color-brand-pink)]">Service</span>
          </h1>
          <p className="text-gray-500 font-mono text-sm tracking-widest uppercase">Last Updated: March 30, 2026</p>
        </div>

        <div className="grid gap-8">
          <section className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-4 text-[var(--color-brand-pink)]">
              <Globe className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight italic">1. Acceptance of Terms</h2>
            </div>
            <p className="text-gray-400 leading-relaxed">
              By accessing and using Quamify Mail ("the Service"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site. The Service provides temporary, holographic email addresses for testing, development, and privacy purposes.
            </p>
          </section>

          <section className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-4 text-[var(--color-brand-purple)]">
              <Shield className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight italic">2. Use License</h2>
            </div>
            <p className="text-gray-400 leading-relaxed">
              Permission is granted to temporarily use the Service for personal or commercial testing. This is the grant of a license, not a transfer of title, and under this license, you may not:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Use the Service for any illegal activities or spamming.</li>
              <li>Attempt to decompile or reverse engineer any software contained on Quamify's website.</li>
              <li>Remove any copyright or other proprietary notations from the materials.</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server.</li>
            </ul>
          </section>

          <section className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-4 text-orange-500">
              <AlertCircle className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight italic">3. Disclaimer</h2>
            </div>
            <p className="text-gray-400 leading-relaxed">
              The materials on Quamify Mail's website are provided on an 'as is' basis. Quamify Mail makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-4 text-blue-500">
              <Lock className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight italic">4. Limitations</h2>
            </div>
            <p className="text-gray-400 leading-relaxed">
              In no event shall Quamify Mail or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Quamify Mail's website, even if Quamify Mail has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>
        </div>

        <div className="mt-20 p-8 rounded-[40px] bg-gradient-to-r from-[var(--color-brand-purple)]/20 to-[var(--color-brand-pink)]/20 border border-white/10 text-center">
          <p className="text-gray-300 text-sm font-black uppercase tracking-widest">
            For support regarding terms, contact us at: <span className="text-white underline underline-offset-4 decoration-[var(--color-brand-pink)]">support@369aiventures.com</span>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
