'use client'

import { useState, Suspense, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Chrome, Lock, Loader2, Eye, EyeOff, Check, Copy, Wand2, Mail } from "lucide-react"
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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
        }
      } catch (e) {
        console.error('Failed to init auth page', e);
      }
    };
    fetchDomains();
  }, []);

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
      // 1. ADMIN SEGREGATION CHECK: Ensure admins use the /admin portal
      const { isMasterAdmin } = await import('@/lib/admin-check');
      const isAdmin = await isMasterAdmin(loginEmail);
      
      if (isAdmin && !isSignUp) {
        setMessage({ 
          type: 'error', 
          text: 'Admin account detected. Please use the specialized /admin portal for management.' 
        });
        setLoading(false);
        return;
      }

      // 2. Try standard login first
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

        try {
          const profiles = JSON.parse(localStorage.getItem('TMAIL.PK_profiles') || '[]');
          const p = { email: loginEmail, password, type: 'account' };
          const idx = profiles.findIndex((x: any) => x.email.toLowerCase() === p.email.toLowerCase());
          if (idx >= 0) profiles[idx] = { ...profiles[idx], ...p };
          else profiles.unshift(p);
          localStorage.setItem('TMAIL.PK_profiles', JSON.stringify(profiles.slice(0, 5)));
        } catch(e) {}

        localStorage.setItem("TMAIL.PK_guest_password", password);
        localStorage.setItem("TMAIL.PK_active_email", loginEmail);
        localStorage.setItem('TMAIL.PK_switched_manually', 'true');

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
        className={`w-full max-w-3xl p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-black/40 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden group transition-all duration-500`}
      >
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[var(--color-brand-pink)]/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[var(--color-brand-purple)]/10 rounded-full blur-[100px]" />
 
        <div className="relative z-10 text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent">
              {isSignUp ? 'New Inbox' : 'Access Mail'}
            </h1>
            <p className="text-gray-400 text-sm font-medium">
              {isSignUp ? 'Create a new professional email' : 'Sign in to access your mail'}
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
 
          <form onSubmit={handleAuth} className="space-y-6" autoComplete="off">
            {isSignUp ? (
              <div className="space-y-8">
                {/* Hero-style Signup Block */}
                <div className="relative group w-full">
                  <div className="absolute -inset-[1px] bg-white/10 rounded-[32px]"></div>
                  <div className="absolute -inset-0.5 bg-[var(--color-brand-pink)]/20 rounded-[32px] blur-md opacity-0 group-hover:opacity-100 transition duration-700"></div>

                  <div className="relative bg-[#0A0A0A] rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 border border-white/5 flex flex-col items-center text-center overflow-hidden transition-all">
                    <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-brand-pink)]/40 to-transparent"></div>
                    
                    <div className="flex items-center gap-2 mb-8">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-pink)] animate-ping"></span>
                      <h2 className="text-[10px] font-black text-[var(--color-brand-pink)] tracking-[0.5em] uppercase font-mono">
                        NEW ACCOUNT
                      </h2>
                    </div>

                    <div className="flex flex-col gap-8 w-full">
                      {/* Interactive Address Block (Matched to HeroAddress Style) */}
                      <div className="flex flex-col items-center justify-center gap-3 w-full p-4 sm:p-6 rounded-[20px] sm:rounded-[32px] bg-white/[0.03] border border-white/5 group-hover:border-white/10 transition-all">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 w-full">
                          <input
                            type="text"
                            placeholder="prefix"
                            required
                            autoComplete="off"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="bg-transparent text-2xl sm:text-3xl font-black text-white outline-none min-w-0 text-center sm:text-left lowercase w-full sm:w-auto"
                          />
                          
                          <span className="text-xl text-gray-700 font-black hidden sm:inline">@</span>
                          <span className="sm:hidden text-lg text-gray-700 font-black">@</span>
                          
                          <div className="relative shrink-0 w-full sm:w-auto">
                            <select
                              value={selectedDomain}
                              onChange={(e) => setSelectedDomain(e.target.value)}
                              className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-base sm:text-lg font-bold text-gray-300 px-5 py-3 rounded-2xl outline-none cursor-pointer appearance-none transition-all text-center sm:text-left min-w-[150px]"
                            >
                              {availableDomains.map(d => (
                                <option key={d} value={d} className="bg-[#050505]">{d}</option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const email = `${username}@${selectedDomain}`;
                              navigator.clipboard.writeText(email.toLowerCase());
                              setPrefixCopied(true);
                              setTimeout(() => setPrefixCopied(false), 2000);
                            }}
                            className={`p-2 transition-all ${prefixCopied ? 'text-green-400 bg-green-400/10' : 'text-gray-600 hover:text-white'} rounded-xl`}
                          >
                            {prefixCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Password Section */}
                      <div className="flex flex-col items-center gap-1 w-full max-w-sm mx-auto">
                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.4em] mb-1">PASSWORD</p>
                        <div className="relative w-full">
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-[20px] px-6 py-4 text-center text-white placeholder:text-gray-700 outline-none focus:border-[var(--color-brand-pink)]/50 transition-all font-mono"
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

                      {/* Action Row */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full mt-4">
                        <button
                          type="button"
                          onClick={() => {
                            const email = `${username}@${selectedDomain}`;
                            const creds = `Email: ${email}\nPassword: ${password}`;
                            navigator.clipboard.writeText(creds);
                            setPassCopied(true);
                            setTimeout(() => setPassCopied(false), 2000);
                          }}
                          className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border whitespace-nowrap ${passCopied ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                        >
                          {passCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {passCopied ? 'COPIED' : 'COPY CREDENTIALS'}
                        </button>
                        
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full sm:flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all bg-white text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                            <>
                              <Check className="w-4 h-4" />
                              CREATE ACCOUNT NOW
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Hero-style Login Block */}
                <div className="relative group w-full">
                  <div className="absolute -inset-[1px] bg-white/10 rounded-[32px]"></div>
                  <div className="absolute -inset-0.5 bg-[var(--color-brand-pink)]/20 rounded-[32px] blur-md opacity-0 group-hover:opacity-100 transition duration-700"></div>

                  <div className="relative bg-[#0A0A0A] rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 border border-white/5 flex flex-col items-center text-center overflow-hidden transition-all">
                    <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-brand-pink)]/40 to-transparent"></div>
                    
                    <div className="flex items-center gap-2 mb-8">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-pink)] animate-ping"></span>
                      <h2 className="text-[10px] font-black text-[var(--color-brand-pink)] tracking-[0.5em] uppercase font-mono">
                        ACCESS NOW
                      </h2>
                    </div>

                    <div className="flex flex-col gap-6 w-full">
                      {/* Email Input Box */}
                      <div className="flex items-center gap-3 p-2 bg-white/[0.03] border border-white/10 rounded-[24px] transition-all group-within:border-[var(--color-brand-pink)]/30 group-within:bg-white/[0.05]">
                        <div className="pl-4 text-[var(--color-brand-pink)] shrink-0">
                          <Mail className="w-5 h-5 opacity-70" />
                        </div>
                        <input
                          type="email"
                          placeholder="name@domain.com"
                          required
                          autoComplete="off"
                          value={fullEmail}
                          onChange={(e) => setFullEmail(e.target.value)}
                          className="flex-1 min-w-0 pr-4 py-4 bg-transparent outline-none text-white text-xl sm:text-2xl font-black lowercase placeholder:text-gray-800"
                        />
                      </div>
                      
                      {/* Password Input Box */}
                      <div className="relative group/pass">
                        <div className="flex items-center gap-3 p-2 bg-white/[0.03] border border-white/10 rounded-[24px] transition-all group-within:border-[var(--color-brand-pink)]/30 group-within:bg-white/[0.05]">
                          <div className="pl-4 text-gray-600 shrink-0">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="flex-1 min-w-0 pr-24 py-4 bg-transparent outline-none text-white text-base font-mono tracking-[0.1em] placeholder:tracking-normal placeholder:font-sans placeholder:text-gray-800"
                          />
                        </div>
                        
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(password);
                              setPassCopied(true);
                              setTimeout(() => setPassCopied(false), 2000);
                            }}
                            className={`p-2 rounded-lg transition-all ${passCopied ? 'text-green-400' : 'text-gray-600 hover:text-white'}`}
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

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 whitespace-nowrap mt-2"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                          <>
                            <Check className="w-4 h-4 text-gray-400" />
                            LOGIN TO INBOX NOW
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>

          <footer className="pt-4 border-t border-white/5">
            <Link 
              href={isSignUp ? '/login?add=true' : '/login?signup=true'}
              className="text-gray-500 hover:text-white transition-all group/toggle flex items-center justify-center gap-2 mx-auto no-underline"
            >
              <span className="text-[10px] uppercase font-black tracking-widest">
                {isSignUp ? 'Already member?' : 'New here?'}
              </span>
              <span className="text-[10px] uppercase font-black tracking-widest text-[var(--color-brand-pink)] group-hover:underline underline-offset-4 decoration-2">
                {isSignUp ? 'Log In' : 'Create One'}
              </span>
            </Link>
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
