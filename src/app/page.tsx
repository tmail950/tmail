"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, Loader2 } from "lucide-react";
import HeroAddress from "@/components/HeroAddress";
import Sidebar from "@/components/Sidebar";
import EmailViewer from "@/components/EmailViewer";
import EmptyState from "@/components/EmptyState";
import { useEmails } from "@/hooks/useEmails";
import { supabase } from "@/lib/supabase";
import { domainService, type DomainRecord } from "@/services/domainService";
import { useAuth } from "@/components/providers/AuthProvider";
import { generateAsianName } from "@/lib/nameGenerator";

function generateRandomString(length: number) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateRandomPassword() {
  return Math.random().toString(36).slice(-6);
}

export default function Home() {
  // 1. Auth & State Hooks
  const { user, isLoading: authLoading } = useAuth();
  const [prefix, setPrefix] = useState<string>("");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [verifiedDomains, setVerifiedDomains] = useState<DomainRecord[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [isAuto, setIsAuto] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [userEmails, setUserEmails] = useState<any[]>([]);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isDomainLoading, setIsDomainLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mailboxPassword, setMailboxPassword] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const lastActivatedAddr = useRef<string | null>(null);

  // 2. Memoized Values
  const address = useMemo(() => {
    if (!prefix || !selectedDomain) return "";
    return `${prefix.toLowerCase().replace(/[^a-z0-9]/g, '')}@${selectedDomain}`;
  }, [prefix, selectedDomain]);

  // 3. Callback Functions
  const fetchDomains = useCallback(async () => {
    try {
      // 1. Fetch Guest/Public Domains
      const platformDomains = await domainService.listPublicDomains();
      const publicMapped = platformDomains.map((d: any) => ({
        id: d.id,
        domain_name: d.domain_name,
        is_verified: d.is_verified,
        created_at: d.created_at
      } as DomainRecord));

      // 2. Fetch User's Professional Domains (if logged in)
      let professionalMapped: DomainRecord[] = [];
      if (user) {
        const userDomains = await domainService.listDomains();
        professionalMapped = (userDomains as any[])
          .filter(d => d.is_verified && d.admin_approval === 'approved')
          .map(d => ({
            id: d.id,
            domain_name: d.domain_name,
            is_verified: d.is_verified,
            created_at: d.created_at
          } as DomainRecord));
      }

      // 3. Merge & Deduplicate (Professional domains take priority)
      const mergedMap = new Map();
      publicMapped.forEach(d => mergedMap.set(d.domain_name, d));
      professionalMapped.forEach(d => mergedMap.set(d.domain_name, d));

      return Array.from(mergedMap.values()).sort((a, b) => 
        a.domain_name.localeCompare(b.domain_name)
      );
    } catch (err) {
      console.error("Domain fetch error:", err);
      return [];
    }
  }, [user]);

  const fetchUserEmails = useCallback(async () => {
    if (!user) return;
    try {
      const emails = await domainService.listUserEmails(user.id);
      setUserEmails(emails || []);
      return emails;
    } catch (err) {
      console.error("Error fetching user emails:", err);
      return [];
    }
  }, [user]);

  const handleDomainChange = useCallback((newDomain: string) => {
    setSelectedDomain(newDomain);
    localStorage.setItem("quamify_selected_domain", newDomain);
  }, []);

  const handleSwitchEmail = useCallback((newAddress: string) => {
    const [newPrefix, newDom] = newAddress.split('@');
    setPrefix(newPrefix);
    setSelectedDomain(newDom);
    setIsAuto(false);
    setSelectedEmailId(null);
    setShowSuccess(false);
    setSaveError(null);
  }, []);

  const handleSaveEmail = useCallback(async () => {
    if (!user) {
      if (!address || !mailboxPassword) {
        setSaveError("Please set a password to activate your guest inbox.");
        return;
      }
      
      setIsSavingEmail(true);
      setSaveError(null);
      setShowSuccess(false);

      try {
        // Check if this email is already confirmed in localStorage
        const confirmedEmail = localStorage.getItem("quamify_last_confirmed_email");
        if (confirmedEmail === address) {
          // Point 8: Strict check even for session restoration
          const isTaken = await domainService.isEmailTaken(address);
          if (!isTaken) {
            // If somehow it's not taken but was in our storage, we must re-associate
            await domainService.guestAssociateEmail(address, mailboxPassword);
          }
          
          setUserEmails(prev => {
            if (prev.some(e => e.email_address === address)) return prev;
            return [{ email_address: address, guest: true }, ...prev];
          });
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
          setIsSavingEmail(false);
          return;
        }

        const guestMailbox = await domainService.guestAssociateEmail(address, mailboxPassword);
        // Add to local userEmails to show as "Saved"
        setUserEmails(prev => [{ email_address: address, guest: true }, ...prev]);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        setIsSavingEmail(false);
        // Persist local activation with 24-hour timestamp
        localStorage.setItem("quamify_guest_activated", "true");
        localStorage.setItem("quamify_guest_password", mailboxPassword);
        localStorage.setItem("quamify_last_confirmed_email", address);
        localStorage.setItem("quamify_guest_created_at", Date.now().toString());
      } catch (err: any) {
        const msg = err.message || "";
        setIsSavingEmail(false);
        setSaveError(msg || "Activation failure.");
      }
      return;
    }
    
    if (!address || !address.includes('@') || address.endsWith('@')) {
      setSaveError("Please select a domain before activating.");
      return;
    }
    if (isSavingEmail) return;

    setIsSavingEmail(true);
    setSaveError(null);
    setShowSuccess(false);
    
    const spinnerTimeout = setTimeout(() => {
      setIsSavingEmail(false);
    }, 10000);

    try {
      const newEmail = await domainService.associateEmail(user.id, address, undefined, mailboxPassword);
      setUserEmails(prev => [newEmail, ...prev]);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      clearTimeout(spinnerTimeout);
      setIsSavingEmail(false);
    } catch (err: any) {
      clearTimeout(spinnerTimeout);
      setIsSavingEmail(false);
      const msg = err.message || "";
      setSaveError(msg || "Activation failure.");
      console.error("Save email error:", err);
    }
  }, [user, address, isSavingEmail, setUserEmails, mailboxPassword]);

  const handleAutoGenerate = useCallback(() => {
    if (isSavingEmail) return; // Prevent generating while saving
    
    const newPrefix = generateAsianName();
    setPrefix(newPrefix);
    setIsAuto(true);
    lastActivatedAddr.current = null; // Allow activation for new address
    
    // Always generate a secret key for unified persistence (logged-in or guest)
    setMailboxPassword(generateRandomPassword());
    setShowSuccess(false);
    setSaveError(null);

    // AUTO-ACTIVATE: If logged in, trigger save immediately
    if (user) {
      setTimeout(() => {
        handleSaveEmail();
      }, 500);
    }
  }, [user, isSavingEmail, handleSaveEmail]);

  const handleDeleteEmail = useCallback(async (addr: string) => {
    try {
      if (user) {
        await domainService.deleteUserEmail(user.id, addr);
      } else {
        await domainService.deleteGuestEmail(addr);
        // If current address is being deleted, generate new one
        if (address === addr) {
          localStorage.removeItem("quamify_last_confirmed_email");
          handleAutoGenerate();
        }
      }

      setUserEmails(prev => prev.filter(e => e.email_address !== addr));
      
      // If we deleted the active one, pick next or generate
      if (address === addr) {
        if (userEmails.length > 1) {
          const next = userEmails.find(e => e.email_address !== addr);
          if (next) handleSwitchEmail(next.email_address);
        } else if (!user) {
          // handled above
        }
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      setSaveError("Failed to delete inbox.");
    }
  }, [user, address, userEmails, handleAutoGenerate, handleSwitchEmail]);

  const simulateEmail = useCallback(async () => {
    if (!address) return;
    try {
      await supabase.from("emails").insert({
        sender: "test@future.corp",
        subject: "Holographic Protocol Approved",
        recipient_address: address,
        body_text: "Your temporary email sequence has been successfully initialized. Welcome to the Quamify network.\n\nKeep shifting the paradigm.",
        received_at: new Date().toISOString()
      });
    } catch (e) {
    }
  }, [address]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSimulateEmail = useCallback(async () => {
    if (!address) return;
    try {
      const { error } = await supabase.from("emails").insert({
        sender: "test@quamify.sbs",
        subject: "Welcome to your Holographic Inbox",
        recipient_address: address,
        body_text: "Your guest temporary mailbox is active and ready to receive. This is a simulated test message.",
        body_html: "<p>Your <b>guest temporary mailbox</b> is active and ready to receive. This is a simulated test message.</p>",
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Simulation error:", err);
    }
  }, [address]);

  // 4. Side Effects (useEffect)
  // Fetch domains only once on mount or when auth settles
  useEffect(() => {
    if (authLoading) return;
    
    let mounted = true;
    const loadDomains = async () => {
      console.log("DOMAINS: Initializing background fetch...");
      const domains = await fetchDomains();
      if (mounted) {
        setVerifiedDomains(domains);
        setIsDomainLoading(false);
      }
    };

    loadDomains();
    return () => { mounted = false; };
  }, [authLoading]); // Removed fetchDomains as dependency since it's a stable useCallback

  useEffect(() => {
    if (user && !authLoading) {
      console.log("EMAILS: Syncing holographic reserves...");
      fetchUserEmails();
    }
  }, [user, authLoading, fetchUserEmails]);

  useEffect(() => {
    if (!user || authLoading) return;

    // Once user emails are loaded, immediately activate the first one
    if (userEmails.length > 0) {
      const firstEmail = userEmails[0].email_address;
      // Only switch if not already on this address to avoid flicker
      if (address !== firstEmail) {
        const [p, d] = firstEmail.split('@');
        setPrefix(p);
        setSelectedDomain(d);
        setIsAuto(false);
        // Store in localStorage so the main init effect respects this choice
        localStorage.setItem('quamify_active_email', firstEmail);
      }
    } else if (userEmails.length === 0 && !localStorage.getItem('quamify_active_email')) {
      // New user with no emails: use login prefix as starting point
      const loginPrefix = user.email?.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || '';
      if (loginPrefix) {
        setPrefix(loginPrefix);
        setIsAuto(false);
      }
    }
  }, [user, userEmails, authLoading]);

  useEffect(() => {
    // Immediate completion for better performance unless we really need it
    setIsInitialLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const storedAddress = localStorage.getItem("quamify_active_email");
    const storedDomain = localStorage.getItem("quamify_selected_domain");
    const forceNew = sessionStorage.getItem("forceNewQuamifyEmail");

    if (forceNew === "true" || !storedAddress || !storedAddress.includes("@")) {
      if (user && userEmails.length > 0) {
        const [storedPrefix, storedDom] = userEmails[0].email_address.split("@");
        setPrefix(storedPrefix);
        setSelectedDomain(storedDom);
        setIsAuto(false);
      } else if (user?.email) {
        const loginPrefix = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        setPrefix(loginPrefix);
        setIsAuto(false);
      } else {
        setPrefix(generateAsianName());
        setIsAuto(true);
        setMailboxPassword(generateRandomPassword());
        // Track guest creation time
        if (!localStorage.getItem("quamify_guest_created_at")) {
          localStorage.setItem("quamify_guest_created_at", Date.now().toString());
        }
      }
      sessionStorage.removeItem("forceNewQuamifyEmail");
    } else {
      // Check 1-day session for anonymous users
      if (!user) {
        const createdAt = localStorage.getItem("quamify_guest_created_at");
        if (createdAt) {
          const oneDay = 24 * 60 * 60 * 1000;
          if (Date.now() - parseInt(createdAt) > oneDay) {
            setSessionExpired(true);
          }
        }
      }
      const [storedPrefix, storedDom] = storedAddress.split("@");
      setPrefix(storedPrefix);
      // Use stored domain if available, otherwise use domain from address
      setSelectedDomain(storedDomain || storedDom);
      setIsAuto(false);
      setSaveError(null);
      
      // Restore guest password if it exists
      const storedPass = localStorage.getItem("quamify_guest_password");
      if (storedPass) {
        setMailboxPassword(storedPass);
      }
    }
  }, [authLoading, user, userEmails, verifiedDomains]);

  useEffect(() => {
    if (user && !authLoading && verifiedDomains.length > 0 && userEmails.length === 0 && !address) {
      console.log("LOGIN: Auto-generating initial inbox for user...");
      handleAutoGenerate();
      const timer = setTimeout(() => {
        handleSaveEmail();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, verifiedDomains, userEmails, address, handleSaveEmail, handleAutoGenerate]);

  useEffect(() => {
    if (verifiedDomains.length > 0) {
      if (!user) {
        // Enforce the first domain for anonymous users
        if (!selectedDomain || !verifiedDomains.some(d => d.domain_name === selectedDomain)) {
          setSelectedDomain(verifiedDomains[0].domain_name);
        }
      } else {
        // Logged-in: Default to the first professional or first available domain
        if (!selectedDomain || !verifiedDomains.some(d => d.domain_name === selectedDomain)) {
          setSelectedDomain(verifiedDomains[0].domain_name);
        }
      }
    }
  }, [verifiedDomains, selectedDomain, user]);

  // Auto-activate mailbox logic
  useEffect(() => {
    if (!prefix || !mailboxPassword || verifiedDomains.length === 0 || !selectedDomain || isSavingEmail || showSuccess) return;

    const currentAddr = `${prefix.toLowerCase().replace(/[^a-z0-9]/g, '')}@${selectedDomain}`;
    
    // Check ref to avoid re-running
    if (lastActivatedAddr.current === currentAddr) return;

    const isAlreadySaved = userEmails.some(e => e.email_address === currentAddr);
    if (isAlreadySaved) {
      lastActivatedAddr.current = currentAddr;
      return;
    }

    // If this is the confirmed email in localStorage, restore silently
    const confirmedEmail = localStorage.getItem("quamify_last_confirmed_email");
    if (confirmedEmail === currentAddr) {
      lastActivatedAddr.current = currentAddr;
      setUserEmails(prev => {
        if (prev.some(e => e.email_address === currentAddr)) return prev;
        return [{ email_address: currentAddr, guest: !user, user_id: user?.id }, ...prev];
      });
      return;
    }

    const timer = setTimeout(() => {
      console.log("AUTO: Activating holographic inbox for", currentAddr);
      lastActivatedAddr.current = currentAddr;
      handleSaveEmail();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [user, prefix, mailboxPassword, selectedDomain, verifiedDomains.length, isSavingEmail, showSuccess, handleSaveEmail, userEmails]);

  useEffect(() => {
    if (address) localStorage.setItem("quamify_active_email", address);
  }, [address]);

  useEffect(() => {
    if (mailboxPassword) {
      localStorage.setItem("quamify_guest_password", mailboxPassword);
    }
  }, [mailboxPassword]);

  // 5. External Hook Usage
  const isAddressSaved = useMemo(() => userEmails.some(e => e.email_address === address), [userEmails, address]);
  const { emails, isLoading } = useEmails(isAddressSaved ? address : null);
  const selectedEmail = emails.find((e) => e.id === selectedEmailId) || null;

  // Memoize addresses to prevent HeroAddress re-renders
  const savedAddressList = useMemo(() => userEmails.map(e => e.email_address), [userEmails]);

  if (!isMounted) return null;

  return (
    <>
      <AnimatePresence>
        {isInitialLoading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[#050505] flex flex-col items-center justify-center gap-6"
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-[var(--color-brand-pink)]/20 blur-xl rounded-full animate-pulse"></div>
              <Loader2 className="w-12 h-12 text-[var(--color-brand-pink)] animate-spin relative z-10" />
            </div>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] animate-pulse">
              Calibrating Holographic Grid...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col h-[calc(100vh-120px)] w-full max-w-7xl mx-auto space-y-6 flex-1 px-4 sm:px-0">
        <div className="flex-1 flex flex-col items-center justify-start py-8 sm:py-16">
          <HeroAddress 
            emailAddress={address} 
            prefix={prefix}
            onPrefixChange={(val) => {
              if (val === "_LOCK_MSG_") {
                setLockMessage("Create account for more multiple domains.");
                setTimeout(() => setLockMessage(null), 5000);
                return;
              }
              setPrefix(val);
              setIsAuto(false);
            }}
            onAutoGenerate={handleAutoGenerate}
            isAuto={isAuto}
            selectedDomain={selectedDomain}
            verifiedDomains={verifiedDomains}
            onDomainChange={handleDomainChange}
            onSwitchAddress={handleSwitchEmail}
            onSaveAddress={handleSaveEmail}
            onDeleteAddress={handleDeleteEmail}
            savedAddresses={savedAddressList}
            isSaving={isSavingEmail}
            isSaved={isAddressSaved}
            showSuccess={showSuccess}
            isLoggedIn={!!user}
            isDomainLoading={isDomainLoading}
            error={lockMessage || saveError || (sessionExpired ? "Session expired. Please login to continue." : null)}
            password={mailboxPassword}
            onPasswordChange={setMailboxPassword}
            sessionExpired={sessionExpired}
            onSimulate={handleSimulateEmail}
          />
        </div>

        <div className="flex-1 min-h-0 border border-white/10 rounded-3xl overflow-hidden glass-panel flex flex-col shadow-2xl relative mb-8">
          <div className="flex h-full w-full overflow-hidden">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <span className="w-8 h-8 border-2 border-[var(--color-brand-pink)] border-t-transparent rounded-full animate-spin"></span>
              </div>
            ) : emails.length === 0 ? (
              <div className="flex-1 h-full">
                <EmptyState isSaved={userEmails.some(e => e.email_address === address)} />
              </div>
            ) : (
              <Sidebar 
                emails={emails} 
                selectedEmailId={selectedEmailId} 
                onSelectEmail={setSelectedEmailId} 
              />
            )}
          </div>
        </div>

        <AnimatePresence>
          {selectedEmail && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-md"
              onClick={() => setSelectedEmailId(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 40 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-5xl h-full max-h-[90vh] relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-[var(--color-brand-purple)] via-[var(--color-brand-pink)] to-[var(--color-brand-orange)] rounded-[40px] blur-2xl opacity-40 animate-pulse-glow pointer-events-none"></div>
                <div className="w-full h-full bg-[#050505]/95 rounded-[40px] relative overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                  <div className="flex-1 overflow-hidden">
                    <EmailViewer 
                      email={selectedEmail} 
                      onClose={() => setSelectedEmailId(null)}
                      onNext={() => {
                        const idx = emails.findIndex(e => e.id === selectedEmailId);
                        if (idx !== -1 && idx < emails.length - 1) {
                          setSelectedEmailId(emails[idx + 1].id);
                        }
                      }}
                      onPrev={() => {
                        const idx = emails.findIndex(e => e.id === selectedEmailId);
                        if (idx > 0) {
                          setSelectedEmailId(emails[idx - 1].id);
                        }
                      }}
                      hasNext={emails.findIndex(e => e.id === selectedEmailId) < emails.length - 1}
                      hasPrev={emails.findIndex(e => e.id === selectedEmailId) > 0}
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
