"use client";

import { Globe, Home, LogOut, Shield, Menu, X, Trash2, AlertTriangle, Users, PlusCircle, LogIn, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useState, useEffect, Suspense, useMemo, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { createClient } from '@/lib/supabase/client'

// ---------- Profile Store Helpers ----------
type StoredProfile = { email: string; password?: string; type: 'account' | 'guest'; guestData?: any };

function getProfiles(): StoredProfile[] {
  try { return JSON.parse(localStorage.getItem('TMAIL.PK_profiles') || '[]'); } catch { return []; }
}
function saveProfile(p: StoredProfile) {
  const list = getProfiles();
  const idx = list.findIndex(x => x.email === p.email);
  if (idx >= 0) {
    // Only overwrite password if a new one is provided. Keep existing password otherwise.
    list[idx] = { ...list[idx], ...p, password: p.password || list[idx].password };
  } else {
    list.unshift(p);
  }
  localStorage.setItem('TMAIL.PK_profiles', JSON.stringify(list.slice(0, 9)));
}
function preserveProfileData() {
  return {
    profiles: localStorage.getItem('TMAIL.PK_profiles'),
    savedAccounts: localStorage.getItem('TMAIL.PK_saved_accounts'),
    guestHistory: localStorage.getItem('TMAIL.PK_guest_history'),
  };
}
function restoreProfileData(data: ReturnType<typeof preserveProfileData>) {
  if (data.profiles) localStorage.setItem('TMAIL.PK_profiles', data.profiles);
  if (data.savedAccounts) localStorage.setItem('TMAIL.PK_saved_accounts', data.savedAccounts);
  if (data.guestHistory) localStorage.setItem('TMAIL.PK_guest_history', data.guestHistory);
}
// ------------------------------------------

const HeaderContent = memo(() => {
  const { user, signOut, isAdmin } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [guestHistory, setGuestHistory] = useState<any[]>([]);
  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<string | null>(null);
  const supabase = createClient();

  const refreshProfiles = useCallback(() => {
    setProfiles(getProfiles());
    const history = JSON.parse(localStorage.getItem('TMAIL.PK_guest_history') || '[]');
    setGuestHistory(history);
  }, []);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    refreshProfiles();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [refreshProfiles]);

  // Save current Supabase account into profile store
  const saveCurrentAccount = useCallback((password?: string) => {
    if (!user?.email) return;
    // Update profiles list
    saveProfile({ email: user.email, password, type: 'account' });
    // Keep legacy saved_accounts list in sync
    const accounts = JSON.parse(localStorage.getItem('TMAIL.PK_saved_accounts') || '[]');
    if (!accounts.includes(user.email)) {
      localStorage.setItem('TMAIL.PK_saved_accounts', JSON.stringify([user.email, ...accounts].slice(0, 9)));
    }
    refreshProfiles();
  }, [user, refreshProfiles]);

  useEffect(() => {
    if (user) saveCurrentAccount();
  }, [user, saveCurrentAccount]);

  const handleSwitchAccount = async (target: any) => {
    const targetEmail = typeof target === 'string' ? target : target.email_address;
    const isGuest = typeof target !== 'string';

    if (targetEmail === user?.email && !isGuest) return;
    setIsSwitchOpen(false);
    setIsMenuOpen(false);

    if (isGuest) {
      // ── Guest profile switch: just swap active localStorage keys ──
      setIsSwitching(true);
      setSwitchTarget(targetEmail);
      const data = preserveProfileData();
      localStorage.setItem("TMAIL.PK_active_email", target.email_address);
      if (target.password) localStorage.setItem("TMAIL.PK_guest_password", target.password);
      localStorage.setItem("TMAIL.PK_last_confirmed_email", target.email_address);
      restoreProfileData(data);
      window.location.href = "/?switched=true";
      return;
    }

    // ── Supabase account switch ──
    setIsSwitching(true);
    setSwitchTarget(targetEmail);

    // Check if we have stored credentials for this profile
    const storedProfiles = getProfiles();
    const targetProfile = storedProfiles.find(p => p.email === targetEmail);

    if (targetProfile?.password) {
      try {
        const data = preserveProfileData();
        // Client-side sign out only (faster, no server round-trip)
        await supabase.auth.signOut({ scope: 'local' });
        restoreProfileData(data);
        // Auto sign-in to target account
        const { error } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: targetProfile.password,
        });
        if (!error) {
          window.location.href = '/?switched=true';
          return;
        }
      } catch (e) {
        // fall through to login redirect
      }
    }

    // Fallback: no credentials → preserve profiles & redirect to prefilled login
    const data = preserveProfileData();
    await supabase.auth.signOut({ scope: 'local' });
    restoreProfileData(data);
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
    ...(isAdmin ? [
      { href: "/domains", label: "Domains", icon: Globe, active: pathname === "/domains", isAdmin: true },
      { href: "/admin/settings", label: "Settings", icon: Shield, active: pathname === '/admin/settings', isAdmin: true }
    ] : []),
  ], [pathname, isAdmin]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-4 transition-all duration-300">
      <div suppressHydrationWarning={true} className={`max-w-7xl mx-auto glass-panel rounded-2xl p-4 flex items-center justify-between border-[rgba(255,255,255,0.05)] shadow-xl relative z-20 transition-all duration-300 ${isScrolled ? 'bg-[#050505]/80 backdrop-blur-xl border-white/10' : ''}`}>
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
                    onClick={() => {
                      const data = preserveProfileData();
                      signOut('/login?signup=true');
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 border border-white/5"
                    title="Create New Profile"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Add a Profile
                  </button>

                  <button
                    onClick={() => setIsSwitchOpen(!isSwitchOpen)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                      isSwitchOpen
                        ? 'bg-[var(--color-brand-purple)]/30 border-[var(--color-brand-pink)]/50 text-white'
                        : 'bg-[var(--color-brand-purple)]/15 border-[var(--color-brand-pink)]/25 text-gray-200 hover:bg-[var(--color-brand-purple)]/25 hover:text-white'
                    }`}
                    title="Switch Identity"
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
                          className="absolute top-full right-0 mt-2 w-72 bg-[#050505] rounded-2xl p-2 border border-white/20 shadow-2xl z-[200] max-h-80 overflow-y-auto"
                        >
                          <div className="p-2 border-b border-white/5 mb-1">
                            <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Identities & Reserves</span>
                          </div>
                          
                          {/* Supabase Accounts */}
                          {profiles.filter((p: StoredProfile) => p.email !== user?.email && p.type === 'account').length === 0 && guestHistory.length === 0 && (
                            <p className="text-[10px] text-gray-500 text-center py-3">No other identities saved yet</p>
                          )}
                          {profiles.filter((p: StoredProfile) => p.email !== user?.email && p.type === 'account').map((p: StoredProfile) => (
                            <button
                              key={`acc-${p.email}`}
                              onClick={() => handleSwitchAccount(p.email)}
                              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 text-left transition-all"
                            >
                              <div className="w-6 h-6 rounded-lg bg-[var(--color-brand-purple)]/20 text-[var(--color-brand-purple)] flex items-center justify-center text-[8px] font-black border border-white/5">{p.email[0].toUpperCase()}</div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-gray-300 font-bold truncate">{p.email}</span>
                                <span className="text-[7px] text-gray-500 font-black uppercase tracking-widest">{p.password ? 'Quick Switch ✓' : 'Account'}</span>
                              </div>
                            </button>
                          ))}

                          {/* Guest Profiles */}
                          {guestHistory.filter(h => h.email_address !== localStorage.getItem("TMAIL.PK_active_email")).map(h => (
                            <button
                              key={`guest-${h.email_address}`}
                              onClick={() => handleSwitchAccount(h)}
                              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 text-left transition-all"
                            >
                              <div className="w-6 h-6 rounded-lg bg-[var(--color-brand-pink)]/20 text-[var(--color-brand-pink)] flex items-center justify-center text-[8px] font-black border border-white/5">G</div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-gray-300 font-bold truncate">{h.email_address}</span>
                                <span className="text-[7px] text-[var(--color-brand-pink)]/70 font-black uppercase tracking-widest">Holographic Guest</span>
                              </div>
                            </button>
                          ))}

                          <div className="h-[1px] bg-white/5 my-1" />
                          
                          <Link
                            href="/login?signup=true"
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 text-left transition-all text-[var(--color-brand-pink)] group"
                            onClick={() => setIsSwitchOpen(false)}
                          >
                            <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-[var(--color-brand-pink)]/20">
                              <PlusCircle className="w-3 h-3" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Add a Profile</span>
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

                {/* Mobile Hamburger Button */}
                <button 
                  onClick={() => setIsMenuOpen(true)}
                  className="md:hidden w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white"
                >
                  <Menu className="w-5 h-5" />
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
        {/* Mobile Sidebar Navigation */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md" 
                onClick={() => setIsMenuOpen(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-80 z-[110] bg-[#0A0A0A] border-l border-white/10 p-8 shadow-2xl"
              >
                {/* Header within sidebar */}
                <div className="flex items-center justify-between mb-12">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#ff12b1]">Navigation</span>
                  <button onClick={() => setIsMenuOpen(false)} className="p-2 rounded-xl bg-white/5 text-gray-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-8">
                  {/* Account Section */}
                  <div className="space-y-4">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-500">Identity Control</span>
                    {user ? (
                      <div className="grid grid-cols-1 gap-3">
                        <button
                          onClick={() => { preserveProfileData(); setIsMenuOpen(false); signOut('/login?signup=true'); }}
                          className="flex items-center gap-3 w-full p-4 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Add a Profile
                        </button>
                        <button
                          onClick={() => setIsSwitchOpen(!isSwitchOpen)}
                          className={`flex items-center gap-3 w-full p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                            isSwitchOpen
                              ? 'bg-white/10 border-[var(--color-brand-pink)]/40 text-white'
                              : 'bg-white/5 border-white/10 text-white'
                          }`}
                        >
                          <Users className="w-4 h-4 text-[#ff12b1]" />
                          Switch Identity ({profiles.filter((p: StoredProfile) => p.email !== user?.email && p.type === 'account').length + guestHistory.length})
                        </button>
                        
                        <AnimatePresence>
                          {isSwitchOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              className="space-y-1 bg-white/5 rounded-2xl p-2 border border-white/5"
                            >
                              {/* Other Accounts */}
                              {profiles.filter((p: StoredProfile) => p.email !== user?.email && p.type === 'account').length === 0 && guestHistory.length === 0 && (
                                <p className="text-[10px] text-gray-500 text-center py-2">No other identities saved</p>
                              )}
                              {profiles.filter((p: StoredProfile) => p.email !== user?.email && p.type === 'account').map((p: StoredProfile) => (
                                <button
                                  key={`mob-acc-${p.email}`}
                                  onClick={() => handleSwitchAccount(p.email)}
                                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-left transition-all"
                                >
                                  <div className="w-6 h-6 rounded-lg bg-[var(--color-brand-purple)]/20 text-[var(--color-brand-purple)] flex items-center justify-center text-[8px] font-black shrink-0">{p.email[0].toUpperCase()}</div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] text-gray-300 font-bold truncate">{p.email}</span>
                                    <span className="text-[7px] text-gray-500 font-black uppercase tracking-widest">{p.password ? 'Quick Switch ✓' : 'Account'}</span>
                                  </div>
                                </button>
                              ))}
                              {/* Guest Profiles */}
                              {guestHistory.map(h => (
                                <button
                                  key={`mob-guest-${h.email_address}`}
                                  onClick={() => handleSwitchAccount(h)}
                                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-left transition-all"
                                >
                                  <div className="w-6 h-6 rounded-lg bg-[var(--color-brand-pink)]/20 text-[var(--color-brand-pink)] flex items-center justify-center text-[8px] font-black shrink-0">G</div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] text-gray-300 font-bold truncate">{h.email_address}</span>
                                    <span className="text-[7px] text-[var(--color-brand-pink)]/70 font-black uppercase tracking-widest">Holographic Guest</span>
                                  </div>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <a
                          href="/api/auth/signout"
                          className="flex items-center gap-3 w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </a>
                        <button
                          onClick={() => { setIsMenuOpen(false); handleDeleteAccount(); }}
                          className="flex items-center gap-3 w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest"
                        >
                          <Trash2 className="w-4 h-4" />
                          Discard Identity
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        <Link 
                          href="/login"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest"
                        >
                          <LogIn className="w-4 h-4" />
                          System Login
                        </Link>
                        <Link 
                          href="/login?signup=true"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 w-full p-4 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest shadow-xl shadow-white/5"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Generate Account
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Links Section */}
                  <div className="space-y-4">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-500">Node Directories</span>
                    <div className="grid grid-cols-1 gap-2">
                       {navLinks.map((link, idx) => (
                        <Link 
                          key={`${link.href}-${idx}-mobile`}
                          href={link.href} 
                          onClick={() => setIsMenuOpen(false)}
                          className={`flex items-center gap-3 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${link.active ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-transparent text-gray-400'}`}
                        >
                          <link.icon className={`w-4 h-4 ${link.isAdmin ? 'text-red-500' : ''}`} />
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Brand Sidebar */}
                <div className="absolute bottom-8 left-8 right-8 text-center">
                  <div className="flex flex-col items-center gap-2 opacity-30">
                    <span className="text-xl font-black text-white italic uppercase tracking-[0.2em]">TMAIL.PK</span>
                    <span className="text-[6px] font-mono text-gray-500 uppercase tracking-widest">Protocol v4.0.1 // Distributed Node</span>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

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

      <AnimatePresence>
        {isSwitching && (
          <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel p-8 rounded-3xl flex flex-col items-center gap-4 border border-white/10 shadow-2xl"
            >
              <Loader2 className="w-10 h-10 text-[var(--color-brand-purple)] animate-spin" />
              <div className="text-center">
                <h3 className="text-white font-black tracking-widest uppercase">Connecting Identity</h3>
                <p className="text-gray-400 text-xs mt-1 font-mono">{switchTarget}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
