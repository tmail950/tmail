"use client";

import { Globe, Home, LogOut, Shield, Menu, X, ShieldCheck, FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useState, useEffect, Suspense, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const HeaderContent = memo(() => {
  const { user, signOut, isAdmin } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDeleteAccount = async () => {
    if (!confirm("CRITICAL: This will permanently delete your account and all associated holographic transmissions. Archival recovery is impossible. Proceed?")) return;
    
    try {
      const response = await fetch('/api/user/delete', { method: 'DELETE' });
      if (!response.ok) throw new Error('System deletion failure');
      
      await signOut();
    } catch (err) {
      alert("Encryption error during deletion protocol.");
    }
  };

  const isMasterAdmin = user?.email === 'info369skills@gmail.com';

  const navLinks = useMemo(() => [
    { href: "/", label: "Home", icon: Home, active: pathname === "/" },
    { href: "/safety", label: "Safety", icon: ShieldCheck, active: pathname === "/safety" },
    { href: "/terms", label: "Terms", icon: FileText, active: pathname === "/terms" },
    ...(isMasterAdmin ? [
      { href: "/domains", label: "Domains", icon: Globe, active: pathname === "/domains", isAdmin: true },
      { href: "/admin/settings", label: "Settings", icon: Shield, active: pathname === '/admin/settings', isAdmin: true }
    ] : []),
  ], [pathname, isMasterAdmin]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-4">
      <div className="max-w-7xl mx-auto glass-panel rounded-2xl p-4 flex items-center justify-between border-[rgba(255,255,255,0.05)] shadow-xl relative z-20 scanline-effect">
        {/* Logo Text */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black tracking-widest bg-gradient-to-r from-[#7d12ff] via-[#ff12b1] to-[#ff8a12] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,18,177,0.4)] uppercase">
              Quamify
            </span>
            <span className="text-[8px] font-mono text-gray-500 tracking-[0.3em] ml-0.5 uppercase">v1.2 // Secure</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {mounted && navLinks.map((link, idx) => (
            <Link 
              key={`${link.href}-${idx}`}
              href={link.href} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/5 cursor-pointer ${link.active ? 'text-white bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <link.icon className={`w-3.5 h-3.5 ${link.isAdmin ? 'text-red-500' : ''}`} />
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-6">
          {/* Tech Stats - Desktop Only */}
          <div className="hidden lg:flex items-center gap-6 border-x border-white/5 px-6 mx-2">
            <div className="flex flex-col items-start">
              <span className="text-[8px] text-gray-600 font-bold uppercase tracking-tighter">Nodes</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-gray-400 font-mono">ACTIVE</span>
              </div>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[8px] text-gray-600 font-bold uppercase tracking-tighter">Enc</span>
              <span className="text-[10px] text-gray-400 font-mono">AES-256</span>
            </div>
          </div>

          {mounted && (
            user ? (
              <div className="flex items-center gap-2 sm:gap-4 sm:pl-4 sm:border-l border-white/10 relative">
                {/* Dedicated Logout Button - Always Visible for Auth Reliability */}
                <a 
                  href="/api/auth/signout"
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/10 mr-2"
                  title="Force Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </a>

                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 p-1 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group"
                >
                  <div className="flex flex-col items-end hidden lg:flex">
                    <span className="text-xs text-white font-black truncate max-w-[150px] uppercase tracking-tighter">{user.email?.split('@')[0]}</span>
                    <span className="text-[8px] text-[var(--color-brand-pink)] font-black uppercase tracking-widest">Active Member</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-brand-purple)] to-[var(--color-brand-pink)] flex items-center justify-center text-white font-black shadow-[0_0_15px_rgba(255,18,177,0.3)] group-hover:scale-105 transition-transform">
                    {user.email?.[0].toUpperCase()}
                  </div>
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsProfileOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute top-full right-0 mt-4 w-72 glass-panel rounded-3xl p-6 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                      >
                        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-brand-pink)] to-transparent opacity-50"></div>
                        <div className="space-y-6">
                          <div className="space-y-1">
                            <span className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em]">Transmission Identity</span>
                            <p className="text-sm font-black text-white truncate">{user.email}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em]">Access Key</span>
                            <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                              <p className="text-xs font-mono text-gray-400">••••••••••••</p>
                              <span className="text-[8px] text-[var(--color-brand-pink)] font-black uppercase tracking-widest">Encrypted</span>
                            </div>
                          </div>
                          <div className="pt-2 flex flex-col gap-2">
                            <button 
                              onClick={handleDeleteAccount}
                              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all mt-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete Account
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link 
                href="/login"
                className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-white text-black text-xs sm:text-sm font-bold hover:bg-gray-100 transition-all active:scale-95 cursor-pointer"
              >
                Login
              </Link>
            )
          )}

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-4 right-4 mt-2 md:hidden z-10"
          >
            <div className="glass-panel rounded-2xl p-4 space-y-2 border-[rgba(255,255,255,0.05)] shadow-2xl">
              {navLinks.map((link, idx) => (
                <Link 
                  key={`${link.href}-mobile-${idx}`}
                  href={link.href} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${link.active ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <link.icon className={`w-5 h-5 ${link.isAdmin ? 'text-red-500' : ''}`} />
                  <span className="font-bold uppercase tracking-wider text-xs">{link.label}</span>
                </Link>
              ))}
              {user && (
                <div className="pt-4 mt-4 border-t border-white/10 space-y-4">
                   <div className="flex items-center gap-3 px-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-brand-purple)] to-[var(--color-brand-pink)] flex items-center justify-center text-white text-sm font-black shadow-[0_0_15px_rgba(255,18,177,0.3)]">
                        {user.email?.[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-xs text-white font-black truncate w-full uppercase tracking-tighter">{user.email?.split('@')[0]}</span>
                        <span className="text-[8px] text-[var(--color-brand-pink)] font-black uppercase tracking-widest">Active Member</span>
                    </div>
                   </div>

                    <div className="grid grid-cols-1 gap-2 px-1">
                      <a 
                         href="/api/auth/signout"
                         className="flex items-center justify-center gap-2 py-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-black uppercase tracking-[0.2em] transition-all border border-red-500/10"
                       >
                         <LogOut className="w-4 h-4" />
                         Sign Out Permanently
                       </a>
                       
                       <button 
                         onClick={handleDeleteAccount}
                         className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-500/5 hover:bg-red-500/10 text-gray-500 hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-all mt-4 opacity-50 hover:opacity-100"
                       >
                         <Trash2 className="w-3.5 h-3.5" />
                         Delete Account
                       </button>
                    </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-brand-pink)]/30 to-transparent"></div>
    </header>
  );
});

export default function Header() {
  return (
    <Suspense fallback={null}>
      <HeaderContent />
    </Suspense>
  )
}
