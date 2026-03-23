import { useState, useEffect } from "react";
import { Wand2, Copy, Check, Globe, Zap, Loader2 } from 'lucide-react';
import { motion } from "framer-motion";
import { type DomainRecord } from "@/services/domainService";

interface HeroAddressProps {
  emailAddress: string;
  prefix: string;
  onPrefixChange: (val: string) => void;
  onAutoGenerate: () => void;
  isAuto: boolean;
  selectedDomain: string;
  verifiedDomains: DomainRecord[];
  onDomainChange: (val: string) => void;
  onSimulate?: () => void;
  onSaveAddress?: () => void;
  onSwitchAddress?: (addr: string) => void;
  savedAddresses?: string[];
  isSaving?: boolean;
  isLoggedIn?: boolean;
  isDomainLoading?: boolean;
  error?: string | null;
}

const HeroAddress = ({ 
  emailAddress, 
  prefix, 
  onPrefixChange, 
  onAutoGenerate, 
  isAuto,
  selectedDomain,
  verifiedDomains,
  onDomainChange,
  onSimulate,
  onSaveAddress,
  onSwitchAddress,
  savedAddresses = [],
  isSaving = false,
  isLoggedIn = false,
  isDomainLoading = false,
  error = null
}: HeroAddressProps) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.log("HERO-ADDRESS: State Check -> Domains:", verifiedDomains.length, "Selected:", selectedDomain);
  }, [verifiedDomains, selectedDomain]);

  const handleCopy = () => {
    if (!emailAddress) return;
    navigator.clipboard.writeText(emailAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="w-full flex justify-center py-4"
    >
      <div className="relative group w-full max-w-3xl">
        <div className="absolute -inset-1 bg-gradient-to-r from-[--color-brand-purple] via-[--color-brand-pink] to-[--color-brand-orange] rounded-[40px] blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000 animate-pulse-glow"></div>
        
        <div className="relative bg-black/40 backdrop-blur-md sm:backdrop-blur-2xl rounded-[30px] sm:rounded-[40px] p-6 sm:p-12 border border-white/10 flex flex-col items-center text-center overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-30"></div>
          
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[--color-brand-pink] animate-ping"></span>
            <h2 className="text-xs font-black text-gray-400 tracking-[0.3em] uppercase relative z-10">Active Holographic Inbox</h2>
          </div>
          
          <div className="flex flex-col gap-8 w-full relative z-10">
            {/* Main Interactive Address Input */}
            <div className={`flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 w-full p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-white/[0.03] border border-white/5 group-hover:border-white/10 transition-all mb-8`}>
              <input
                type="text"
                value={prefix}
                onChange={(e) => onPrefixChange(e.target.value)}
                className="w-full sm:flex-1 bg-transparent text-2xl sm:text-3xl font-black text-white outline-none min-w-0 text-center sm:text-left"
                placeholder="prefix"
              />
              <span className="text-2xl text-gray-600 font-light my-1 sm:my-0">@</span>
              <select 
                value={selectedDomain}
                onChange={(e) => onDomainChange(e.target.value)}
                className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-base sm:text-lg font-bold text-gray-300 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl outline-none cursor-pointer appearance-none transition-all text-center sm:text-left min-w-[140px]"
              >
                {verifiedDomains.length > 0 ? (
                  <>
                    <option value={selectedDomain} className="bg-[#050505]">{selectedDomain || "Select Domain"}</option>
                    {verifiedDomains
                      .filter(d => d.domain_name !== selectedDomain)
                      .map(d => (
                        <option key={d.id} value={d.domain_name} className="bg-[#050505]">{d.domain_name}</option>
                      ))}
                  </>
                ) : (
                  <option value="" className="bg-[#050505]">
                    {isDomainLoading ? "Calibrating Domains..." : "No Approved Domains"}
                  </option>
                )}
              </select>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-red-400 text-[10px] font-bold uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-6 py-3 rounded-2xl mx-auto max-w-md"
              >
                {error}
              </motion.div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full">
              <button
                onClick={onAutoGenerate}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 sm:py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                  isAuto 
                    ? "bg-[var(--color-brand-pink)] text-white shadow-[0_0_20px_var(--color-brand-pink)]/40" 
                    : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5"
                }`}
              >
                < Wand2 className="w-4 h-4" />
                Auto-Gen
              </button>
              
              <button
                onClick={handleCopy}
                disabled={!emailAddress}
                className={`w-full sm:flex-1 flex items-center justify-center gap-3 px-8 py-4 sm:py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                  copied 
                    ? "bg-green-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.5)]" 
                    : "bg-white text-black hover:shadow-[0_0_30px_rgba(255,18,177,0.3)] hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                }`}
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? "Copied" : "Copy Address"}
              </button>

              {onSimulate && (
                <button
                  onClick={onSimulate}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 sm:py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 border border-blue-500/20 transition-all active:scale-95 group/sim"
                >
                  <Zap className="w-4 h-4 group-hover/sim:scale-125 transition-transform" />
                  Simulate
                </button>
              )}

              {isLoggedIn && !savedAddresses.includes(emailAddress) && (
                <button
                  onClick={onSaveAddress}
                  disabled={isSaving}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 sm:py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300 border border-green-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Save Address
                </button>
              )}
            </div>

            {/* Saved Addresses Quick Switcher */}
            {isLoggedIn && savedAddresses.length > 0 && (
              <div className="flex flex-col items-center gap-4 mt-4 py-6 border-t border-white/5">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Holographic Reserves ({savedAddresses.length})</span>
                <div className="flex flex-wrap justify-center gap-2 max-w-2xl px-4">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr}
                      onClick={() => onSwitchAddress?.(addr)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all border ${
                        addr === emailAddress
                          ? "bg-[var(--color-brand-pink)]/20 text-[var(--color-brand-pink)] border-[var(--color-brand-pink)]/40 shadow-[0_0_15px_rgba(255,18,177,0.2)]"
                          : "bg-white/5 text-gray-400 border-white/5 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {addr}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-8 pt-8 border-t border-white/5 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <Globe className="w-3 h-3" />
              {selectedDomain}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
              <Zap className="w-3 h-3 text-[var(--color-brand-orange)]" />
              SSL/HOLO-ENCRYPTED
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default HeroAddress;
