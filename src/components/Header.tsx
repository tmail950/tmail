"use client";

import { Globe, Home, LogOut, Shield, Menu, X, ShieldCheck, FileText, Trash2, AlertTriangle, Users, PlusCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useState, useEffect, Suspense, useMemo, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { createClient } from '@/lib/supabase/client'

const HeaderContent = memo(() => {
  const { user, signOut, isAdmin } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    // Load saved accounts
    const accounts = JSON.parse(localStorage.getItem('TMAIL.PK_saved_accounts') || '[]');
    setSavedAccounts(accounts);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const saveCurrentAccount = useCallback(() => {
    if (!user?.email) return;
    const accounts = JSON.parse(localStorage.getItem('TMAIL.PK_saved_accounts') || '[]');
    if (!accounts.includes(user.email)) {
      const newAccounts = [user.email, ...accounts].slice(0, 5); // Keep last 5
      localStorage.setItem('TMAIL.PK_saved_accounts', JSON.stringify(newAccounts));
      setSavedAccounts(newAccounts);
    }
  }, [user]);

  useEffect(() => {
    if (user) saveCurrentAccount();
  }, [user, saveCurrentAccount]);

  const handleSwitchAccount = async (targetEmail: string) => {
    if (targetEmail === user?.email) return;
    setIsSwitchOpen(false);
    await signOut();
    // Redirect to login with pre-filled email
    window.location.href = `/login?email=${encodeURIComponent(targetEmail)}`;
  };

  const handleDeleteAccount = () => {
    setIsProfileOpen(false);
    setShowDeleteModal(true);
  };

  const confirmDeletion = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/user/delete', { method: 'DELETE' });
      if (!response.ok) throw new Error('System deletion failure');
      
      // Clear all local traces
      localStorage.clear();
      sessionStorage.clear();
      
      await signOut();
      window.location.href = '/?deleted=true';
    } catch (err) {
      alert("Encryption error during deletion protocol.");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const navLinks = useMemo(() => [
    { href: "/", label: "Home", icon: Home, active: pathname === "/" },
    { href: "/safety", label: "Safety", icon: ShieldCheck, active: pathname === "/safety" },
    { href: "/terms", label: "Terms", icon: FileText, active: pathname === "/terms" },
    ...(isAdmin ? [
      { href: "/domains", label: "Domains", icon: Globe, active: pathname === "/domains", isAdmin: true },
      { href: "/admin/settings", label: "Settings", icon: Shield, active: pathname === '/admin/settings', isAdmin: true }
    ] : []),
  ], [pathname, isAdmin]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-4 transition-all duration-300">
      <div className={`max-w-7xl mx-auto glass-panel rounded-2xl p-4 flex items-center justify-between border-[rgba(255,255,255,0.05)] shadow-xl relative z-20 scanline-effect transition-all duration-300 ${isScrolled ? 'bg-[#050505]/80 backdrop-blur-xl border-white/10' : ''}`}>
        {/* Logo Text */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black tracking-widest bg-gradient-to-r from-[#7d12ff] via-[#ff12b1] to-[#ff8a12] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,18,177,0.4)] uppercase">
              TMAIL.PK
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

        <div className="flex items-center gap-2 sm:gap-4">

          {mounted && (
            user ? (
              <div className="flex items-center gap-2 sm:gap-4 sm:pl-4 sm:border-l border-white/10 relative">
                {/* Multi-Account Switcher */}
                <div className="hidden sm:flex items-center gap-1 mr-2 relative">
                  <button
                    onClick={() => signOut('/login?signup=true')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 border border-white/5"
                    title="Create New Profile"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Create Profile
                  </button>

                  <button
                    onClick={() => setIsSwitchOpen(!isSwitchOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                    title="Switch Account"
                  >
                    <Users className="w-3.5 h-3.5 text-[var(--color-brand-pink)]" />
                    Switch
                  </button>

                  <AnimatePresence>
                    {isSwitchOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsSwitchOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full right-0 mt-2 w-56 glass-panel rounded-2xl p-2 border-white/10 shadow-2xl z-50 bg-[#0a0a0a]"
                        >
                          <div className="p-2 border-b border-white/5 mb-1">
                            <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Switch Identity</span>
                          </div>
                          {savedAccounts.filter(acc => acc !== user.email).map(acc => (
                            <button
                              key={acc}
                              onClick={() => handleSwitchAccount(acc)}
                              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 text-left transition-all"
                            >
                              <div className="w-6 h-6 rounded-lg bg-gray-800 flex items-center justify-center text-[8px] font-black">{acc[0].toUpperCase()}</div>
                              <span className="text-[10px] text-gray-300 font-bold truncate">{acc}</span>
                            </button>
                          ))}
                          <Link
                            href="/login?signup=true"
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 text-left transition-all text-[var(--color-brand-pink)]"
                          >
                            <PlusCircle className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">New Account</span>
                          </Link>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>

                  <a 
                    href="/api/auth/signout"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </a>
                  <button
                    onClick={handleDeleteAccount}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/10"
                    title="Delete Account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>

                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 p-1 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group"
                >
                  <div className="flex flex-col items-end hidden lg:flex">
                    <span className="text-xs text-white font-black truncate max-w-[150px] uppercase tracking-tighter">
                      {user.user_metadata?.username || user.email?.split('@')[0]}
                    </span>
                    <span className="text-[8px] text-[var(--color-brand-pink)] font-black uppercase tracking-widest">Active Member</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-brand-purple)] to-[var(--color-brand-pink)] flex items-center justify-center text-white font-black shadow-[0_0_15px_rgba(255,18,177,0.3)] group-hover:scale-105 transition-transform">
                    {(user.user_metadata?.username?.[0] || user.email?.[0]).toUpperCase()}
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
                        className="absolute top-full right-0 mt-4 w-72 glass-panel rounded-3xl p-6 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden bg-[#0a0a0a]/95 backdrop-blur-2xl"
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
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-4">
                <Link 
                  href="/login"
                  className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl border border-white/20 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all cursor-pointer bg-white/5"
                >
                  Login
                </Link>
                <Link 
                  href="/login?signup=true"
                  className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-white text-black text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                  Create Account
                </Link>
              </div>
            )
          )}
        </div>
      </div>

      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setShowDeleteModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg glass-panel p-8 sm:p-12 rounded-[40px] border border-red-500/20 shadow-[0_0_50px_rgba(220,38,38,0.2)] bg-[#050505] overflow-hidden text-center"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
              
              <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto mb-8 border border-red-500/20 group animate-pulse">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>

              <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">
                Confirm <span className="text-red-500">Purge</span>
              </h2>
              
              <p className="text-gray-400 text-sm leading-relaxed mb-10 font-medium">
                Are you absolutely sure? This will permanently delete your holographic identity, all reserved domains, and transmission history. <span className="text-red-500/80 italic font-black">This action is irreversible.</span>
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  disabled={isDeleting}
                  onClick={confirmDeletion}
                  className="flex-1 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-[10px] transition-all active:scale-[0.98] shadow-lg shadow-red-900/20 disabled:opacity-50"
                >
                  {isDeleting ? "Processing Purge..." : "YES, DELETE PERMANENTLY"}
                </button>
                <button
                  disabled={isDeleting}
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
                >
                  NO, KEEP ACCOUNT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-brand-pink)]/30 to-transparent"></div>
    </header>
  );
});

HeaderContent.displayName = "HeaderContent";

export default function Header() {
  return (
    <Suspense fallback={null}>
      <HeaderContent />
    </Suspense>
  )
}
