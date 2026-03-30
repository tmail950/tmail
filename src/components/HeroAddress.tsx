import { useState, useEffect } from "react";
import { Wand2, Copy, Check, Globe, Zap, Loader2, Eye, EyeOff } from 'lucide-react';
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
  onSaveAddress?: () => void;
  onDeleteAddress?: (addr: string) => void;
  onSwitchAddress?: (addr: string) => void;
  savedAddresses?: string[];
  isSaving?: boolean;
  isLoggedIn?: boolean;
  isDomainLoading?: boolean;
  isSaved?: boolean;
  showSuccess?: boolean;
  error?: string | null;
  password?: string;
  onPasswordChange?: (val: string) => void;
  sessionExpired?: boolean;
  onSimulate?: () => void;
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
  onSaveAddress,
  onDeleteAddress,
  onSwitchAddress,
  savedAddresses = [],
  isSaving = false,
  isLoggedIn = false,
  isDomainLoading = false,
  isSaved = false,
  showSuccess = false,
  error = null,
  password = "",
  onPasswordChange,
  sessionExpired = false,
  onSimulate
}: HeroAddressProps) => {
  const [copied, setCopied] = useState(false);
  const [prefixCopied, setPrefixCopied] = useState(false);
  const [passCopied, setPassCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deletingAddr, setDeletingAddr] = useState<string | null>(null);

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
            <h2 className="text-xs font-black text-gray-400 tracking-[0.3em] uppercase relative z-10">
              ACTIVE INBOX
            </h2>
          </div>

          <div className="flex flex-col gap-8 w-full relative z-10">
            {/* Main Interactive Address Input */}
            <div className={`flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 w-full p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-white/[0.03] border border-white/5 group-hover:border-white/10 transition-all mb-8`}>
              <input
                type="text"
                value={prefix}
                onChange={(e) => onPrefixChange(e.target.value)}
                readOnly={true}
                className="w-full sm:flex-1 bg-transparent text-2xl sm:text-3xl font-black text-white outline-none min-w-0 text-center sm:text-left pr-10 cursor-default"
                placeholder="prefix"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(emailAddress);
                  setPrefixCopied(true);
                  setTimeout(() => setPrefixCopied(false), 2000);
                }}
                className={`flex items-center gap-1 p-2 rounded-lg transition-all ${prefixCopied ? 'text-green-400 bg-green-400/10' : 'text-gray-500 hover:text-white'}`}
                title="Copy Full Address"
              >
                {prefixCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {prefixCopied && <span className="text-[8px] font-black uppercase">Copied</span>}
              </button>
              <span className="text-2xl text-gray-600 font-light my-1 sm:my-0">@</span>
              <div className="relative w-full sm:w-auto overflow-hidden group/dom">
                <select
                  value={selectedDomain}
                  onChange={(e) => onDomainChange(e.target.value)}
                  disabled={isLoggedIn}
                  className={`w-full sm:w-auto bg-white/5 hover:bg-white/10 text-base sm:text-lg font-bold text-gray-300 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl outline-none cursor-pointer appearance-none transition-all text-center sm:text-left min-w-[140px] ${!isLoggedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {verifiedDomains.length > 0 ? (
                    <>
                      <option value={selectedDomain} className="bg-[#050505]">{selectedDomain || "Select Domain"}</option>
                      {isLoggedIn && verifiedDomains
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
                {!isLoggedIn && (
                  <button
                    type="button"
                    onClick={() => onPrefixChange?.("_LOCK_MSG_")}
                    className="absolute inset-0 cursor-pointer z-10 w-full h-full bg-transparent border-none appearance-none"
                    title="Create account for more multiple domains"
                  ></button>
                )}
              </div>
            </div>

            {/* Password Input for All Users (Consistency) */}
            <div className="flex flex-col items-center gap-2 w-full max-w-sm mx-auto mb-4">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Mailbox Password</label>
              <div className="relative w-full">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => onPasswordChange?.(e.target.value)}
                  placeholder="Set secret key"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-white placeholder:text-gray-600 outline-none focus:border-[var(--color-brand-pink)]/50 transition-all font-mono"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(password);
                      setPassCopied(true);
                      setTimeout(() => setPassCopied(false), 2000);
                    }}
                    className={`p-1 transition-colors ${passCopied ? 'text-green-400' : 'text-gray-500 hover:text-white'}`}
                    title="Copy Password"
                  >
                    {passCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-red-400 text-[10px] font-bold uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-6 py-3 rounded-2xl mx-auto max-w-md"
              >
                {error.toLowerCase().includes("taken") || error.toLowerCase().includes("unique")
                  ? "This address is already taken. Try another."
                  : error}
              </motion.div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full">
              <button
                onClick={onAutoGenerate}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 sm:py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isAuto
                    ? "bg-[var(--color-brand-pink)] text-white shadow-[0_0_20px_var(--color-brand-pink)]/40"
                    : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5"
                  }`}
              >
                <Wand2 className="w-4 h-4" />
                REGENERATE
              </button>

              <button
                onClick={() => {
                  if (!emailAddress) return;
                  const credentials = `Email: ${emailAddress}\nPassword: ${password}`;
                  navigator.clipboard.writeText(credentials);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                disabled={!emailAddress}
                className={`w-full sm:flex-1 flex items-center justify-center gap-3 px-8 py-4 sm:py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${copied
                    ? "bg-green-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.5)]"
                    : "bg-white text-black hover:shadow-[0_0_30px_rgba(255,18,177,0.3)] hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  }`}
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? "COPIED" : "COPY CREDENTIALS"}
              </button>

              {(isSaved || showSuccess) && !sessionExpired && (
                <div className="flex items-center gap-3 px-8 py-4 sm:py-3.5 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 font-bold tracking-widest uppercase text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  Active
                  {onSimulate && (
                    <button
                      onClick={onSimulate}
                      className="ml-2 pl-2 border-l border-green-500/30 text-green-300 hover:text-white transition-colors"
                      title="Send Test Email"
                    >
                      <Zap className="w-3 h-3" />
                      Test
                    </button>
                  )}
                </div>
              )}


              {!isLoggedIn && sessionExpired && (
                <button
                  onClick={() => window.location.href = '/login'}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 sm:py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse"
                >
                  <Loader2 className="w-4 h-4" />
                  Session Expired - Login
                </button>
              )}
            </div>

            {/* Saved Addresses Quick Switcher */}
            {savedAddresses.length > 0 && (
              <div className="flex flex-col items-center gap-4 mt-4 py-6 border-t border-white/5">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">RESERVES EMAILS ({savedAddresses.length})</span>
                <div className="flex flex-wrap justify-center gap-2 max-w-2xl px-4">
                  {savedAddresses.map((addr) => (
                    <div key={addr} className="flex items-center gap-1 group/addr">
                      <button
                        onClick={() => onSwitchAddress?.(addr)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all border ${addr === emailAddress
                            ? "bg-[var(--color-brand-pink)]/20 text-[var(--color-brand-pink)] border-[var(--color-brand-pink)]/40 shadow-[0_0_15px_rgba(255,18,177,0.2)]"
                            : "bg-white/5 text-gray-400 border-white/5 hover:border-white/20 hover:text-white"
                          }`}
                      >
                        {addr}
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (deletingAddr === addr) return;
                          setDeletingAddr(addr);
                          try {
                            await onDeleteAddress?.(addr);
                          } finally {
                            setDeletingAddr(null);
                          }
                        }}
                        className={`p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover/addr:opacity-100 ${deletingAddr === addr ? 'opacity-100' : ''}`}
                        title="Delete Address"
                      >
                        {deletingAddr === addr ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        )}
                      </button>
                    </div>
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
