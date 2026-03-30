'use client'

import { motion } from 'framer-motion'
import { Eye, ShieldCheck, Database, Cookie } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-20 px-4 relative overflow-hidden bg-[#050505]">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[var(--color-brand-purple)]/10 rounded-full blur-[120px] -translate-y-1/2 -translate-x-1/2" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[var(--color-brand-orange)]/10 rounded-full blur-[120px] translate-y-1/2 translate-x-1/2" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto relative z-10"
      >
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic">
            Privacy <span className="text-[var(--color-brand-purple)]">Policy</span>
          </h1>
          <p className="text-gray-500 font-mono text-sm tracking-widest uppercase">Last Updated: March 30, 2026</p>
        </div>

        <div className="grid gap-8 text-gray-400">
          <section className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-4 text-[var(--color-brand-purple)]">
              <Eye className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight italic text-white">1. Information We Collect</h2>
            </div>
            <p className="leading-relaxed">
              TMAIL.PK Mail collect minimal information to provide temporary email services. This includes:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>IP addresses for rate limiting and security purposes.</li>
              <li>Holographic prefixes and passwords for mailbox access.</li>
              <li>Email content received by your temporary addresses (deleted automatically after a short period).</li>
            </ul>
          </section>

          <section className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-4 text-green-500">
              <ShieldCheck className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight italic text-white">2. Data Usage</h2>
            </div>
            <p className="leading-relaxed">
              We use the collected data solely to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Operate and maintain the disposable email service.</li>
              <li>Prevent abuse and spamming on our platform.</li>
              <li>Improve user experience and troubleshoot technical issues.</li>
            </ul>
            <p className="mt-4 italic">We do not sell, trade, or otherwise transfer your personal information to outside parties.</p>
          </section>

          <section className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-4 text-yellow-500">
              <Cookie className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight italic text-white">3. Cookies & Advertising</h2>
            </div>
            <p className="leading-relaxed">
              We use cookies to understand site usage and remember your session. Our platform may use Google AdSense to serve ads. Google, as a third-party vendor, uses cookies to serve ads on our site based on your visit to our site and other sites on the Internet.
            </p>
          </section>

          <section className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-4 text-blue-500">
              <Database className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight italic text-white">4. Data Retention</h2>
            </div>
            <p className="leading-relaxed">
              Temporary email content is stored for a transient period (typically less than 24 hours) and is then permanently deleted from our servers. Professional mailboxes may persist based on your account status.
            </p>
          </section>
        </div>

        <div className="mt-20 p-8 rounded-[40px] bg-gradient-to-r from-[var(--color-brand-orange)]/20 to-[var(--color-brand-purple)]/20 border border-white/10 text-center">
          <p className="text-gray-300 text-sm font-black uppercase tracking-widest">
            Your privacy is our priority. If you have any questions, reach out to us.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
