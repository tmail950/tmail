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
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(
    errorFromUrl ? { type: 'error', text: errorFromUrl } : null
  )
  const [availableDomains, setAvailableDomains] = useState<string[]>([])
  const [prefixCopied, setPrefixCopied] = useState(false);
  const [passCopied, setPassCopied] = useState(false);
  const supabase = createClient()

  // sync signup state from URL - only update if different to avoid redundant renders
  useEffect(() => {
    const isSignupFromUrl = signupParam === 'true';
    if (isSignUp !== isSignupFromUrl) {
      setIsSignUp(isSignupFromUrl);
    }
    
    // Multi-profile session reset: if we are on signup page, clear existing session
    // to allow creating a new account (since Supabase only allows one session)
    if (isSignupFromUrl) {
      supabase.auth.signOut().then(() => {
        // Clear local guest state too
        localStorage.removeItem('TMAIL.PK_guest_activated');
      });
    }
  }, [signupParam, isSignUp]);

  // Fetch domains and pre-fill from guest session
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const platformDomains = await domainService.listPublicDomains();
        if (platformDomains && platformDomains.length > 0) {
          const names = platformDomains.map((d: any) => d.domain_name);
          setAvailableDomains(names);
          if (names.length > 0 && !selectedDomain) setSelectedDomain(names[0]);
          
          // Pre-fill from localStorage if available
          const storedAddr = localStorage.getItem("TMAIL.PK_active_email");
          const storedPass = localStorage.getItem("TMAIL.PK_guest_password");
          
          if (storedAddr && storedAddr.includes("@")) {
            setFullEmail(storedAddr);
          }
          
          if (storedPass) setPassword(storedPass);
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
      setMessage({ type: 'error', text: 'Please enter a valid email address (name@domain.com)' });
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
        setMessage({ type: 'success', text: 'Signing you in...' })
        setTimeout(() => window.location.href = '/?auth=success', 500);
        return;
      }

      // 2. If Sign Up flow requested
      if (isSignUp) {
        // Parse prefix and domain for legacy signup API if needed
        const [prefix, domain] = loginEmail.split('@');
        
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmail, password, username: prefix }),
        })

        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Signup failed')

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        })
        if (signInError) throw signInError

        setMessage({ type: 'success', text: 'Account created!' })
        setTimeout(() => window.location.href = '/?auth=success', 1000)
        return;
      }

      // 3. Fallback: Search for guest mailbox or reserved user email if standard login failed
      try {
        const [prefix, domain] = loginEmail.split('@');
        
        // 3a. Check Guest Mailboxes (Try Prefix only, then Full Email)
        let guestMailbox = await domainService.verifyGuestMailbox(prefix, password).catch(() => null);
        if (!guestMailbox) {
          guestMailbox = await domainService.verifyGuestMailbox(loginEmail, password).catch(() => null);
        }

        if (guestMailbox) {
          localStorage.setItem("TMAIL.PK_active_email", guestMailbox.email_address);
          localStorage.setItem("TMAIL.PK_guest_activated", "true");
          localStorage.setItem("TMAIL.PK_guest_created_at", Date.now().toString());
          localStorage.setItem("TMAIL.PK_guest_password", password);
          
          setMessage({ type: 'success', text: 'Guest mailbox verified!' })
          setTimeout(() => window.location.href = '/', 1000)
          return;
        }
      } catch (guestErr) {
        // 3b. Check User Emails (reserved emails with passwords)
        try {
          const { data: userEmail, error: ueError } = await supabase
            .from('user_emails')
            .select('*')
            .eq('email_address', loginEmail)
            .eq('password', password)
            .single();

          if (userEmail) {
            localStorage.setItem("TMAIL.PK_active_email", userEmail.email_address);
            localStorage.setItem("TMAIL.PK_guest_activated", "false"); // It's a real user's reserved email
            localStorage.setItem("TMAIL.PK_switched_manually", "true");
            
            setMessage({ type: 'success', text: 'Inbox access granted!' })
            setTimeout(() => window.location.href = '/', 1000)
            return;
          }
        } catch (ueErr) {
          // If all fail, show the original auth error
          throw authError;
        }
        throw authError;
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message.includes('unique') ? 'This address is already in use' : error.message })
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
              {isSignUp ? 'New Inbox' : 'Access Mail'}
            </h1>
            <p className="text-gray-400 text-sm font-medium">
              {isSignUp ? 'Choose your professional holographic prefix' : 'Sign in to your disposable workspace'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-4">
              {/* Holographic Input - Prefix + Domain (Unified Ultra-Streamlined) */}
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
                        {availableDomains.length > 0 ? (
                          availableDomains.map(d => (
                            <option key={d} value={d} className="bg-[#050505]">{d}</option>
                          ))
                        ) : (
                          <option value="" className="bg-[#050505]">Loading...</option>
                        )}
                      </select>
                    </div>
                  </>
                ) : (
                  <input
                    type="email"
                    placeholder="name@domain.com"
                    required
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
                  title="Copy Address"
                >
                  {prefixCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password Input with Eye & Copy */}
              <div className="relative group/pass">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 transition-colors group-focus-within/pass:text-[var(--color-brand-pink)]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Secret Key"
                  required
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
                    title="Copy Password"
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
                <div className="flex justify-end px-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const emailToReset = fullEmail.toLowerCase().trim();
                      if (!emailToReset || !emailToReset.includes('@')) {
                        setMessage({ type: 'error', text: 'Please enter your email address first.' });
                        return;
                      }
                      setLoading(true);
                      try {
                        const res = await fetch('/api/auth/request-reset', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: emailToReset }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Failed to send request');
                        setMessage({ type: 'success', text: 'Reset request sent to master admin.' });
                      } catch (err: any) {
                        setMessage({ type: 'error', text: err.message });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-[var(--color-brand-pink)] transition-colors"
                  >
                    Forgot Password?
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

          <div className="pt-4 border-t border-white/5">
            <button 
              onClick={() => {
                const goingToSignup = !isSignUp;
                // Just push the route, the useEffect will sync the state
                // This reduces the 'hang' feeing by letting Next.js handle the navigation
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
          </div>

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

      {/* Social Login (Optional/Coming Soon/Standard) */}
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
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="p-8 rounded-full bg-white/5 border border-white/10">
          <Loader2 className="w-8 h-8 text-[var(--color-brand-pink)] animate-spin" />
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
