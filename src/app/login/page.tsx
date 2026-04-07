'use client'

import { useState, Suspense, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Chrome, Lock, Loader2, Eye, EyeOff, Check, Copy, Wand2, Mail } from "lucide-react"
import { useSearchParams, useRouter } from 'next/navigation'
import { domainService } from '@/services/domainService';

function LoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const signupParam = searchParams.get('signup')
  const errorFromUrl = searchParams.get('error')
  
  const [fullEmail, setFullEmail] = useState('')
  const [username, setUsername] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(signupParam === 'true')
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(
    errorFromUrl ? { type: 'error', text: errorFromUrl } : null
  )
  const [availableDomains, setAvailableDomains] = useState<string[]>([])
  const [prefixCopied, setPrefixCopied] = useState(false);
  const [passCopied, setPassCopied] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user))
  }, [])

  useEffect(() => {
    const isSignupFromUrl = signupParam === 'true';
    if (isSignUp !== isSignupFromUrl) {
      setIsSignUp(isSignupFromUrl);
    }
  }, [signupParam]);

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const platformDomains = await domainService.listPublicDomains();
        if (platformDomains && platformDomains.length > 0) {
          const names = platformDomains.map((d: any) => d.domain_name);
          setAvailableDomains(names);
          if (names.length > 0 && !selectedDomain) {
            const randomIndex = Math.floor(Math.random() * names.length);
            setSelectedDomain(names[randomIndex]);
          }
          
          // Password field should always start empty for security
        }
      } catch (e) {
        console.error('Failed to init auth page', e);
      }
    };
    fetchDomains();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullEmail.includes('@') || fullEmail.length < 5) {
      setMessage({ type: 'error', text: 'Enter a valid email address.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(fullEmail.toLowerCase().trim(), {
        redirectTo: `${window.location.origin}/login/update-password`,
      });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Recovery link sent! Check your inbox.' });
      setTimeout(() => setIsForgotPassword(false), 5000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send recovery link.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const loginEmail = (isSignUp 
      ? `${username.toLowerCase().trim()}@${selectedDomain}` 
      : fullEmail.toLowerCase().trim());

    if (!loginEmail.includes('@') || loginEmail.length < 5) {
      setMessage({ type: 'error', text: 'Enter a valid email (e.g. name@domain.com)' });
      setLoading(false);
      return;
    }

    try {
      // 1. Try standard login first
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (!authError) {
        try {
          const profiles = JSON.parse(localStorage.getItem('TMAIL.PK_profiles') || '[]');
          const p = { email: loginEmail, password, type: 'account' };
          const idx = profiles.findIndex((x: any) => x.email === p.email);
          if (idx >= 0) profiles[idx] = { ...profiles[idx], ...p };
          else profiles.unshift(p);
          localStorage.setItem('TMAIL.PK_profiles', JSON.stringify(profiles.slice(0, 5)));
        } catch(e) {}
        
        localStorage.setItem("TMAIL.PK_active_email", loginEmail);
        localStorage.setItem('TMAIL.PK_switched_manually', 'true');
        setMessage({ type: 'success', text: 'Signing you in...' })
        setTimeout(() => window.location.href = '/?auth=success', 500);
        return;
      }

      if (isSignUp) {
        const [prefix, domain] = loginEmail.split('@');
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmail, password, username: prefix }),
        })

        const result = await response.json()
        if (!response.ok) {
          if (result.code === 'GUEST_EXISTS') {
            setMessage({ type: 'error', text: result.error });
            setTimeout(() => {
              setIsSignUp(false);
              router.push('/login');
            }, 3000);
            return;
          }
          throw new Error(result.error || 'Signup failed')
        }

        // Before signing into the new account, we must sign out of the current one
        // but preserve our profile store
        const profiles = localStorage.getItem('TMAIL.PK_profiles');
        const savedAccounts = localStorage.getItem('TMAIL.PK_saved_accounts');
        const guestHistory = localStorage.getItem('TMAIL.PK_guest_history');

        await supabase.auth.signOut();

        if (profiles) localStorage.setItem('TMAIL.PK_profiles', profiles);
        if (savedAccounts) localStorage.setItem('TMAIL.PK_saved_accounts', savedAccounts);
        if (guestHistory) localStorage.setItem('TMAIL.PK_guest_history', guestHistory);

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        })
        if (signInError) throw signInError

        // Save to switcher list
        try {
          const profiles = JSON.parse(localStorage.getItem('TMAIL.PK_profiles') || '[]');
          const p = { email: loginEmail, password, type: 'account' };
          const idx = profiles.findIndex((x: any) => x.email.toLowerCase() === p.email.toLowerCase());
          if (idx >= 0) profiles[idx] = { ...profiles[idx], ...p };
          else profiles.unshift(p);
          localStorage.setItem('TMAIL.PK_profiles', JSON.stringify(profiles.slice(0, 5)));
        } catch(e) {}

        setMessage({ type: 'success', text: 'Account created!' })
        setTimeout(() => window.location.href = '/?auth=success', 1000)
        return;
      }

      const [prefix, domain] = loginEmail.split('@');
      let guestMailbox = await domainService.verifyGuestMailbox(prefix, password).catch(() => null);
      if (!guestMailbox) {
        guestMailbox = await domainService.verifyGuestMailbox(loginEmail, password).catch(() => null);
      }

      if (guestMailbox) {
        const email = guestMailbox.email_address;
        
        // Purge old session state to prevent "hybrid" email leakage (old name + new domain)
        try {
          await supabase.auth.signOut();
          Object.keys(localStorage).forEach(key => {
            if (key.includes('TMAIL.PK_prefix') || key.includes('TMAIL.PK_domain')) {
              localStorage.removeItem(key);
            }
          });
        } catch (e) {}

        localStorage.setItem("TMAIL.PK_active_email", email);
        localStorage.setItem("TMAIL.PK_last_confirmed_email", email);
        localStorage.setItem("TMAIL.PK_guest_activated", "true");
        localStorage.setItem("TMAIL.PK_guest_password", password);
        localStorage.setItem("TMAIL.PK_is_premium_access", "true"); 
        localStorage.setItem('TMAIL.PK_switched_manually', 'true');        
        try {
          const hJSON = localStorage.getItem("TMAIL.PK_guest_history") || "[]";
          const history = JSON.parse(hJSON);
          if (!history.find((x: any) => x.email_address === email)) {
            history.unshift({ email_address: email, password });
            localStorage.setItem("TMAIL.PK_guest_history", JSON.stringify(history.slice(0, 5)));
          }
        } catch(e) {}

        setMessage({ type: 'success', text: 'Identity verified. You have 5 mailbox slots now!' })
        setTimeout(() => window.location.href = '/', 1000)
        return;
      }

      const { data: userEmail } = await supabase
        .from('user_emails')
        .select('*')
        .eq('email_address', loginEmail)
        .eq('password', password)
        .maybeSingle();

      if (userEmail) {
        const email = userEmail.email_address;
        
        // Save to switcher list
        try {
          const profiles = JSON.parse(localStorage.getItem('TMAIL.PK_profiles') || '[]');
          const p = { email: email, password, type: 'account' };
          const idx = profiles.findIndex((x: any) => x.email.toLowerCase() === p.email.toLowerCase());
          if (idx >= 0) profiles[idx] = { ...profiles[idx], ...p };
          else profiles.unshift(p);
          localStorage.setItem('TMAIL.PK_profiles', JSON.stringify(profiles.slice(0, 5)));
        } catch(e) {}

        localStorage.setItem("TMAIL.PK_active_email", email);
        localStorage.setItem("TMAIL.PK_last_confirmed_email", email);
        localStorage.setItem("TMAIL.PK_guest_activated", "true");
        localStorage.setItem("TMAIL.PK_guest_password", password);
        localStorage.setItem("TMAIL.PK_is_premium_access", "true");
        localStorage.setItem('TMAIL.PK_switched_manually', 'true');

        setMessage({ type: 'success', text: 'Inbox access granted!' })
        setTimeout(() => window.location.href = '/', 1000)
        return;
      }

      throw authError;
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg p-8 rounded-[40px] bg-black/40 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden group"
      >
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[var(--color-brand-pink)]/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[var(--color-brand-orange)]/10 rounded-full blur-[100px]" />

        <div className="relative z-10 text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent">
              {isForgotPassword ? 'Recover Access' : (isSignUp ? 'New Inbox' : 'Access Mail')}
            </h1>
              <p className="text-gray-400 text-sm font-medium">
                {isForgotPassword ? 'Enter your email to receive a secure reset link' : (isSignUp ? 'Create a new professional email' : 'Sign in to access your mail')}
              </p>
              
              {isSignUp && currentUser && (
                <div className="flex flex-col items-center gap-2 pt-2 animate-in fade-in slide-in-from-top-2">
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                    Adding Profile from: <span className="text-[var(--color-brand-pink)]">{currentUser.email}</span>
                  </p>
                  <button 
                    onClick={() => router.push('/')}
                    className="text-[9px] text-gray-400 hover:text-white underline underline-offset-4 font-black uppercase tracking-widest decoration-[var(--color-brand-pink)]/50"
                  >
                    Back to Dashboard
                  </button>
                </div>
              )}
            </div>

          {isForgotPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-6" autoComplete="off">
              <div className="space-y-4">
                <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-[32px] transition-all group-within:border-[var(--color-brand-pink)]/30 hover:bg-white/10 transition-colors">
                  <div className="pl-4 text-[var(--color-brand-pink)] shrink-0">
                    <Mail className="w-5 h-5 opacity-70" />
                  </div>
                  <input
                    type="email"
                    placeholder="Enter your account email"
                    required
                    autoComplete="off"
                    value={fullEmail}
                    onChange={(e) => setFullEmail(e.target.value)}
                    className="flex-1 min-w-0 px-4 py-4 bg-transparent outline-none text-white text-xl sm:text-2xl font-black lowercase placeholder:text-gray-700"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 bg-gradient-to-r from-[var(--color-brand-purple)] to-[var(--color-brand-pink)] hover:shadow-[var(--color-brand-pink)]/30 text-white text-[11px]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'SEND RECOVERY LINK'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-6" autoComplete="off">
              <div className="space-y-4">
              <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-[32px] transition-all group-within:border-[var(--color-brand-pink)]/30 group-hover:bg-white/10 transition-colors">
                <div className="pl-4 text-[var(--color-brand-pink)] shrink-0">
                  <Mail className="w-5 h-5 opacity-70" />
                </div>
                
                {isSignUp ? (
                  <>
                    <input
                      type="text"
                      placeholder="prefix"
                      required
                      autoComplete="off"
                      data-lpignore="true"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="flex-1 min-w-0 px-2 py-4 bg-transparent outline-none text-white text-xl sm:text-2xl font-black lowercase placeholder:text-gray-700"
                    />
                    <div className="flex items-center shrink-0 pr-2">
                      <span className="text-gray-600 font-bold font-mono mr-1">@</span>
                      <select
                        value={selectedDomain}
                        onChange={(e) => setSelectedDomain(e.target.value)}
                        className="bg-transparent text-gray-300 text-sm font-black py-1 outline-none cursor-pointer appearance-none min-w-[100px]"
                      >
                        {availableDomains.map(d => (
                          <option key={d} value={d} className="bg-[#050505]">{d}</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <input
                    type="email"
                    placeholder="name@domain.com"
                    required
                    autoComplete="off"
                    data-lpignore="true"
                    value={fullEmail}
                    onChange={(e) => setFullEmail(e.target.value)}
                    className="flex-1 min-w-0 px-4 py-4 bg-transparent outline-none text-white text-xl sm:text-2xl font-black lowercase placeholder:text-gray-700"
                  />
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    const textToCopy = isSignUp ? `${username}@${selectedDomain}` : fullEmail;
                    if (textToCopy) {
                      navigator.clipboard.writeText(textToCopy);
                      setPrefixCopied(true);
                      setTimeout(() => setPrefixCopied(false), 2000);
                    }
                  }}
                  className={`mr-2 p-3 transition-all ${prefixCopied ? 'text-green-400' : 'text-gray-500 hover:text-white'} rounded-xl`}
                >
                  {prefixCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              
              <div className="relative group/pass">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 transition-colors group-focus-within/pass:text-[var(--color-brand-pink)]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Secret Key"
                  required
                  autoComplete="new-password"
                  data-lpignore="true"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-28 py-5 rounded-[24px] bg-white/5 border border-white/10 focus:border-[var(--color-brand-pink)] transition-all outline-none text-white text-sm font-mono tracking-[0.2em] placeholder:tracking-normal placeholder:font-sans"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(password);
                      setPassCopied(true);
                      setTimeout(() => setPassCopied(false), 2000);
                    }}
                    className={`p-2 rounded-lg transition-all ${passCopied ? 'text-green-400 bg-green-400/10' : 'text-gray-600 hover:text-white'}`}
                  >
                    {passCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-2 text-gray-600 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isSignUp && (
                <div className="flex justify-end px-2 mt-1">
                  <button 
                    type="button" 
                    onClick={() => setIsForgotPassword(true)}
                    className="text-[10px] uppercase font-black tracking-widest text-gray-500 hover:text-[var(--color-brand-pink)] active:scale-95 transition-all"
                  >
                    Forgot Secret Key?
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 bg-gradient-to-r from-[var(--color-brand-purple)] to-[var(--color-brand-pink)] hover:shadow-[var(--color-brand-pink)]/30 text-white text-[11px]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (isSignUp ? 'SignUP' : 'Login now')}
            </button>
          </form>
          )}

          <footer className="pt-4 border-t border-white/5">
            {isForgotPassword ? (
              <button 
                onClick={() => setIsForgotPassword(false)}
                className="text-gray-500 hover:text-white transition-all group/toggle flex items-center justify-center gap-2 mx-auto"
              >
                <span className="text-[10px] uppercase font-black tracking-widest">
                  Remembered it?
                </span>
                <span className="text-[10px] uppercase font-black tracking-widest text-[var(--color-brand-pink)] group-hover:underline underline-offset-4 decoration-2">
                  Back to Login
                </span>
              </button>
            ) : (
              <button 
                onClick={() => {
                  const goingToSignup = !isSignUp;
                  router.push(goingToSignup ? '/login?signup=true' : '/login');
                }}
                className="text-gray-500 hover:text-white transition-all group/toggle flex items-center justify-center gap-2 mx-auto"
              >
                <span className="text-[10px] uppercase font-black tracking-widest">
                  {isSignUp ? 'Already member?' : 'New here?'}
                </span>
                <span className="text-[10px] uppercase font-black tracking-widest text-[var(--color-brand-pink)] group-hover:underline underline-offset-4 decoration-2">
                  {isSignUp ? 'Log In' : 'Create One'}
                </span>
              </button>
            )}
          </footer>

          <AnimatePresence mode="wait">
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
                  message.type === 'error' 
                    ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                    : 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]'
                }`}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="mt-8 opacity-20 hover:opacity-100 transition-opacity">
        <button className="flex items-center gap-3 px-8 py-3 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-all">
          <Chrome className="w-4 h-4" />
          Quick Access Coming Soon
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[70vh]"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  )
}
