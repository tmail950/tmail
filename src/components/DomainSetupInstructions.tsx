'use client'

import { Copy, Check, Info } from 'lucide-react'
import { useState } from 'react'

interface DomainSetupInstructionsProps {
  domainName: string
  verificationToken: string
}

export default function DomainSetupInstructions({ domainName, verificationToken }: DomainSetupInstructionsProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const records = [
    { type: 'TXT', host: '@', value: verificationToken, purpose: 'Verification' },
    { type: 'MX', host: '@', value: 'mx1.TMAIL.PK.mail', priority: '10', purpose: 'Receiving' },
    { type: 'MX', host: '@', value: 'mx2.TMAIL.PK.mail', priority: '20', purpose: 'Receiving' },
  ]

  return (
    <div className="space-y-6 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
      <div className="flex items-center gap-2 text-[var(--color-brand-gold)]">
        <Info className="w-5 h-5" />
        <h3 className="font-semibold text-lg">DNS Configuration for {domainName}</h3>
      </div>
      
      <p className="text-gray-400 text-sm">
        To verify ownership and start receiving emails, add the following DNS records to your domain registrar (e.g., Namecheap, Cloudflare, GoDaddy).
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 text-gray-500">
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Host</th>
              <th className="pb-3 font-medium">Value</th>
              <th className="pb-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {records.map((record, i) => (
              <tr key={i} className="group">
                <td className="py-4">
                  <span className="px-2 py-1 rounded-md bg-white/10 text-white font-mono text-xs">
                    {record.type}
                  </span>
                </td>
                <td className="py-4 font-mono text-gray-300">{record.host}</td>
                <td className="py-4 max-w-[200px] md:max-w-xs truncate font-mono text-gray-300">
                  {record.value} {record.priority && <span className="text-gray-500 pl-2">Priority: {record.priority}</span>}
                </td>
                <td className="py-4 text-right">
                  <button
                    onClick={() => copyToClipboard(record.value, i.toString())}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer group/copy"
                  >
                    {copied === i.toString() ? (
                      <>
                        <span className="text-green-400">Copied!</span>
                        <Check className="w-4 h-4 text-green-400" />
                      </>
                    ) : (
                      <>
                        <span className="text-gray-500 group-hover/copy:text-gray-300 transition-colors">Copy</span>
                        <Copy className="w-4 h-4 text-gray-400 group-hover/copy:text-white transition-colors" />
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 rounded-2xl bg-black/60 border border-[var(--color-brand-pink)]/20 text-[var(--color-brand-pink)] text-xs">
        Note: DNS changes can take up to 24-48 hours to propagate, although they often happen in minutes.
      </div>
    </div>
  )
}
