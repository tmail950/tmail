"use client";

import { Globe, Home, LogOut, Shield, Menu, X, Users, PlusCircle, LogIn, Loader2, CheckCircle2, CreditCard } from "lucide-react";
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
  // Aggressive deduping by email
  const cleanList = list.filter((item, index, self) => index === self.findIndex((t) => t.email.toLowerCase() === item.email.toLowerCase()));
  const idx = cleanList.findIndex(x => x.email.toLowerCase() === p.email.toLowerCase());
  
  if (idx >= 0) {
    // PRESERVE the password if the new update is missing it!
    const updatedPassword = p.password || cleanList[idx].password;
    
    cleanList[idx] = { 
      ...cleanList[idx], 
      ...p, 
      password: updatedPassword 
    };
  } else {
    cleanList.unshift(p);
  }
  localStorage.setItem('TMAIL.PK_profiles', JSON.stringify(cleanList.slice(0, 5)));
}
function preserveProfileData() {
  return {
    profiles: localStorage.getItem('TMAIL.PK_profiles'),
    savedAccounts: localStorage.getItem('TMAIL.PK_saved_accounts'),
  };
}
function restoreProfileData(data: ReturnType<typeof preserveProfileData>) {
  if (data.profiles) localStorage.setItem('TMAIL.PK_profiles', data.profiles);
  if (data.savedAccounts) localStorage.setItem('TMAIL.PK_saved_accounts', data.savedAccounts);
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
      localStorage.setItem('TMAIL.PK_saved_accounts', JSON.stringify([user.email, ...accounts].slice(0, 5)));
    }
    refreshProfiles();
  }, [user, refreshProfiles]);

  useEffect(() => {
    if (user) saveCurrentAccount();
  }, [user, saveCurrentAccount]);

  // Switch to another saved account
  const handleSwitchAccount = async (targetEmail: string) => {
    if (targetEmail === user?.email) return;
    setIsSwitchOpen(false);
    setIsMenuOpen(false);
    setIsSwitching(true);
    setSwitchTarget(targetEmail);

    const storedProfiles = getProfiles();
    const targetProfile = storedProfiles.find(p => p.email === targetEmail);

    if (targetProfile) {
      if (targetProfile.password) {
        try {
          const { error } = await supabase.auth.signInWithPassword({
            email: targetEmail,
            password: targetProfile.password,
          });

          if (!error) { 
            // Force the home page to land on this specific email
            localStorage.setItem("TMAIL.PK_active_email", targetEmail);
            localStorage.setItem('TMAIL.PK_switched_manually', 'true');
            
            await new Promise(r => setTimeout(r, 600));
            window.location.href = '/?switched=true'; 
            return; 
          } else {
            console.error("Supabase Switch Auth Error:", error);
            setIsSwitching(false);
            window.location.href = `/login?email=${encodeURIComponent(targetEmail)}&error=${encodeURIComponent(error.message)}`;
            return;
          }
        } catch (e: any) {
           console.error("Switch catch Error:", e);
           setIsSwitching(false);
           return;
        }
      }
    }

    // No password saved or other failure
    const data = preserveProfileData();
    localStorage.setItem('TMAIL.PK_switched_manually', 'true');
    await supabase.auth.signOut({ scope: 'local' });
    restoreProfileData(data);
    window.location.href = `/login?email=${encodeURIComponent(targetEmail)}&error=${encodeURIComponent('Please re-enter your password to switch.')}`;
  };

  // Individual profile sign-out: remove from list, auto-switch to next account
  const handleProfileSignOut = async (targetEmail: string) => {
    setIsSwitchOpen(false);
    setIsMenuOpen(false);

    // 1. Remove from local profile store
    const currentProfiles = getProfiles();
    const updatedProfiles = currentProfiles.filter(p => 
      p.email.toLowerCase() !== targetEmail.toLowerCase()
    );
    localStorage.setItem('TMAIL.PK_profiles', JSON.stringify(updatedProfiles.slice(0, 5)));
    
    // Also remove from saved_accounts string list
    const saved = JSON.parse(localStorage.getItem('TMAIL.PK_saved_accounts') || '[]');
    const filteredSaved = saved.filter((e: string) => e.toLowerCase() !== targetEmail.toLowerCase());
    localStorage.setItem('TMAIL.PK_saved_accounts', JSON.stringify(filteredSaved));

    // 2. If we are signing out the CURRENTLY active user, we need to switch context
    if (targetEmail.toLowerCase() === user?.email?.toLowerCase()) {
      const nextAccount = updatedProfiles.find(p => p.type === 'account' && p.password);
      
      if (nextAccount) {
        setIsSwitching(true);
        setSwitchTarget(nextAccount.email);
        
        try {
          // Preserve local storage state during the Supabase sign-out/sign-in flip
          const snap = preserveProfileData();
          await supabase.auth.signOut();
          restoreProfileData(snap);
          
          // Force the home page to land on the next account email
          localStorage.setItem("TMAIL.PK_active_email", nextAccount.email);
          localStorage.setItem('TMAIL.PK_switched_manually', 'true');

          const { error } = await supabase.auth.signInWithPassword({ 
            email: nextAccount.email, 
            password: nextAccount.password! 
          });
          
          if (!error) { 
            window.location.href = '/?switched=true'; 
            return; 
          }
        } catch (err) {
          console.error("Sequential logout switch failed:", err);
        }
        
        // Fallback: If switch failed, go to login page with next email pre-filled
        window.location.href = `/login?email=${encodeURIComponent(nextAccount.email)}&error=Session+expired`;
      } else {
        // No accounts left: perform full system reset
        await handleLogout();
      }
    } else {
      // Just removing a background account, refresh the menu and UI
      refreshProfiles();
    }
  };

  const handleLogout = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsMenuOpen(false);
    setIsProfileOpen(false);
    
    // If multiple accounts exist and user clicks Logout, use the sequential logic
    const profiles = getProfiles();
    const otherAccounts = profiles.filter(p => p.type === 'account' && p.email !== user?.email);

    if (user?.email && otherAccounts.length > 0) {
      handleProfileSignOut(user.email);
    } else {
      // Guest or final account: Complete cleanup but PRESERVE guest history if it exists
      const guestHistory = localStorage.getItem('TMAIL.PK_guest_history');
      
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('TMAIL.PK_') && key !== 'TMAIL.PK_guest_history') {
          localStorage.removeItem(key);
        }
      });
      
      // If we preserve history, we can't do a total reset, but we clear the session markers
      localStorage.removeItem('TMAIL.PK_profiles');
      localStorage.removeItem('TMAIL.PK_active_email');

      await supabase.auth.signOut();
      window.location.href = '/?logout=total'; 
    }
  };


  const navLinks = useMemo(() => [
    { href: "/", label: "Home", icon: Home, active: pathname === "/" },
    { href: "/cards", label: "Generate Cards", icon: CreditCard, active: pathname === "/cards" },
    ...(isAdmin ? [
      { href: "/domains", label: "Domains", icon: Globe, active: pathname === "/domains", isAdmin: true },
      { href: "/admin/settings", label: "Settings", icon: Shield, active: pathname === '/admin/settings', isAdmin: true }
    ] : []),
  ], [pathname, isAdmin]);

  return (
    <header className="fixed top-0 left-0 right-0 z-[160] p-4 transition-all duration-300">
      <div suppressHydrationWarning={true} className={`max-w-7xl mx-auto glass-panel rounded-2xl p-4 flex items-center justify-between border-[rgba(255,255,255,0.05)] shadow-xl relative z-20 transition-all duration-300 ${isScrolled ? 'bg-[#050505]/80 backdrop-blur-xl border-white/10' : ''}`}>
        {/* Logo Text */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group/logo">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover/logo:border-[var(--color-brand-pink)]/50 transition-all duration-500 shadow-2xl">
            <Shield className="w-6 h-6 text-[var(--color-brand-pink)] drop-shadow-[0_0_8px_rgba(0,210,255,0.6)]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl sm:text-2xl font-semibold text-white tracking-widest uppercase">
                TMAIL
              </span>
              <span className="text-xl sm:text-2xl font-black text-[var(--color-brand-pink)] tracking-widest uppercase drop-shadow-[0_0_10px_rgba(0,210,255,0.4)]">
                .PK
              </span>
            </div>
            <span className="text-[7px] font-mono text-gray-600 tracking-[0.4em] ml-0.5 uppercase">Node Protocol v2.0 // Secure</span>
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

        <div className="flex items-center gap-2 sm:gap-4 font-black">
          {mounted && (
            <>
              {/* Switch Menu - ONLY for logged-in users, ONLY shows real account profiles */}
              {user && (
              <div className="relative">
                {profiles.filter(p => p.type === 'account' && p.email !== user.email).length > 0 && (
                  <button
                    onClick={() => setIsSwitchOpen(!isSwitchOpen)}
                    className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                      isSwitchOpen
                        ? 'bg-[var(--color-brand-purple)]/30 border-[var(--color-brand-pink)]/50 text-white shadow-[0_0_20px_rgba(255,18,177,0.2)]'
                        : 'bg-[var(--color-brand-purple)]/15 border-white/10 text-gray-200 hover:bg-[var(--color-brand-purple)]/25 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-[var(--color-brand-pink)]" />
                    <span>Switch</span>
                  </button>
                )}

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
                          <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Logged-In Accounts</span>
                        </div>

                        {profiles
                          .filter(p => p.type === 'account' && p.email !== user.email)
                          .map((p) => (
                          <div key={`switch-${p.email}`} className="flex items-center gap-1 group/item">
                            <button
                              onClick={() => handleSwitchAccount(p.email)}
                              className="flex-1 flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 text-left transition-all min-w-0"
                            >
                              <div className="w-6 h-6 shrink-0 rounded-lg bg-[var(--color-brand-purple)]/20 text-[var(--color-brand-purple)] flex items-center justify-center text-[8px] font-black border border-white/5">{p.email?.[0]?.toUpperCase()}</div>
                              <div className="flex flex-col min-w-0 overflow-hidden">
                                <span className="text-[10px] text-gray-300 font-bold truncate">{p.email}</span>
                                <span className="text-[7px] text-gray-500 font-black uppercase tracking-widest">Quick Switch ✓</span>
                              </div>
                            </button>
                            <button
                              onClick={() => handleProfileSignOut(p.email)}
                              title="Sign out this account"
                              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover/item:opacity-100"
                            >
                              <LogOut className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              )}

              {user ? (
                <div className="flex items-center gap-2 sm:gap-4 sm:pl-4 sm:border-l border-white/10">
                  {profiles.length < 5 && (
                  <button
                    onClick={() => {
                      saveCurrentAccount();
                      router.push('/login?signup=true');
                    }}
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 border border-white/5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Add Profile
                  </button>
                  )}

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 text-nowrap"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>

                  <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-3 p-1 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-brand-purple)] to-[var(--color-brand-pink)] flex items-center justify-center text-white font-black shadow-[0_0_15px_rgba(0,210,255,0.3)] group-hover:scale-105 transition-transform shrink-0">
                      {(user.user_metadata?.username?.[0] || user.email?.[0]).toUpperCase()}
                    </div>
                  </button>
                  
                  {/* Mobile Hamburger (Visible to all on mobile) */}
                  <button 
                    onClick={() => setIsMenuOpen(true)}
                    className="md:hidden w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="hidden md:flex items-center gap-2 sm:gap-4">
                    <Link 
                      href="/login"
                      className="px-4 py-2 sm:py-2.5 rounded-xl border border-white/20 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all cursor-pointer bg-white/5"
                    >
                      Login
                    </Link>
                    <Link 
                      href="/login?signup=true"
                      className="px-4 py-2 sm:py-2.5 rounded-xl bg-white text-black text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.1)] text-nowrap"
                    >
                      Create Account
                    </Link>
                  </div>

                  {/* Mobile Hamburger for Logged-Out Users */}
                  <button 
                    onClick={() => setIsMenuOpen(true)}
                    className="md:hidden w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
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
              <div className="flex items-center justify-between mb-12">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-brand-pink)]">Navigation</span>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 rounded-xl bg-white/5 text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-500">Identity Control</span>
                  {user ? (
                    <div className="grid grid-cols-1 gap-3">
                      {profiles.length < 5 && (
                      <button
                        onClick={() => { saveCurrentAccount(); setIsMenuOpen(false); router.push('/login?signup=true'); }}
                        className="flex items-center gap-3 w-full p-4 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Add a Profile
                      </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
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
                        CREATE ACCOUNT
                      </Link>
                    </div>
                  )}
                </div>

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

      <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-brand-pink)]/50 to-transparent"></div>

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
