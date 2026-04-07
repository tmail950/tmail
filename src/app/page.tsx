"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import HeroAddress from "@/components/HeroAddress";
import Sidebar from "@/components/Sidebar";
import EmailViewer from "@/components/EmailViewer";
import EmptyState from "@/components/EmptyState";
import { useEmails } from "@/hooks/useEmails";
import { supabase } from "@/lib/supabase";
import { domainService, type DomainRecord } from "@/services/domainService";
import { useAuth } from "@/components/providers/AuthProvider";
import { generateAsianName } from "@/lib/nameGenerator";
import SystemStats from "@/components/SystemStats";

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
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [tabId, setTabId] = useState<string | null>(null);
  const [regenCount, setRegenCount] = useState<number>(0);
  const lastActivatedAddr = useRef<string | null>(null);
  const hasInitialized = useRef(false);

  // 2. Memoized Values
  const address = useMemo(() => {
    if (!prefix || !selectedDomain) return "";
    return `${prefix.toLowerCase().replace(/[^a-z0-9]/g, '')}@${selectedDomain}`;
  }, [prefix, selectedDomain]);

  // 3. Callback Functions
  const fetchDomains = useCallback(async () => {
    try {
      const platformDomains = await domainService.listPublicDomains();
      const publicMapped = platformDomains.map((d: any) => ({
        id: d.id,
        domain_name: d.domain_name,
        is_verified: d.is_verified,
        created_at: d.created_at
      } as DomainRecord));

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

      const mergedMap = new Map();
      publicMapped.forEach(d => mergedMap.set(d.domain_name, d));
      professionalMapped.forEach(d => mergedMap.set(d.domain_name, d));

      let finalDomains = Array.from(mergedMap.values()).sort((a, b) => 
        a.domain_name.localeCompare(b.domain_name)
      );

      return finalDomains;
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
    if (user) return; 
    setSelectedDomain(newDomain);
    localStorage.setItem("TMAIL.PK_selected_domain", newDomain);
  }, [user]);


  const handleSwitchEmail = useCallback((newAddress: string) => {
    const [newPrefix, newDom] = newAddress.split('@');
    setPrefix(newPrefix.toLowerCase().replace(/[^a-z0-9]/g, ''));
    setSelectedDomain(newDom);
    
    // Update local list order to keep switched email at top
    setUserEmails(prev => {
      const target = prev.find(e => (e.email_address || e) === newAddress);
      const filtered = prev.filter(e => (e.email_address || e) !== newAddress);
      if (target) return [target, ...filtered];
      return prev;
    });

    const target = userEmails.find(e => e.email_address === newAddress);
    if (target && target.password) {
      setMailboxPassword(target.password);
    } else {
      const historyJSON = localStorage.getItem("TMAIL.PK_guest_history") || "[]";
      const history = JSON.parse(historyJSON);
      const found = history.find((h: any) => h.email_address === newAddress);
      if (found && (found.password || found.password_hash)) {
        setMailboxPassword(found.password || found.password_hash);
      }
    }

    setIsAuto(false);
    setSelectedEmailId(null);
    setShowSuccess(false);
    setSaveError(null);
    
    // Sync to tab localStorage immediately
    if (tabId) {
      localStorage.setItem(`TMAIL.PK_active_email_${tabId}`, newAddress);
    }
  }, [userEmails, tabId]);

  const handleSaveEmail = useCallback(async (isAutoSave = false, overrideAddress?: string, overridePassword?: string) => {
    const targetAddress = overrideAddress || address;
    const targetPassword = overridePassword || mailboxPassword;
    
    if (!user) {
      if (!targetAddress || !targetPassword) {
        setSaveError("Please set a Secret Key to activate your mailbox.");
        return;
      }
      
      setIsSavingEmail(true);
      setSaveError(null);
      setShowSuccess(false);

      try {
        const confirmedEmail = localStorage.getItem("TMAIL.PK_last_confirmed_email");
        if (confirmedEmail === targetAddress) {
          const isTaken = await domainService.isEmailTaken(targetAddress);
          if (!isTaken) {
            await domainService.guestAssociateEmail(targetAddress, targetPassword);
          }
          
          setUserEmails(prev => {
            if (prev.some(e => e.email_address === targetAddress)) return prev;
            return [{ email_address: targetAddress, guest: true }, ...prev];
          });
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
          setIsSavingEmail(false);
          return;
        }

        await domainService.guestAssociateEmail(targetAddress, targetPassword);
        
        const historyJSON = localStorage.getItem("TMAIL.PK_guest_history") || "[]";
        let history = JSON.parse(historyJSON);
        if (!history.find((h: any) => h.email_address === targetAddress)) {
          history.unshift({ email_address: targetAddress, password: targetPassword });
          
          const isPremium = !!user;
          const limit = isPremium ? 9 : 4;
          
          if (history.length > limit) {
             history = history.slice(0, limit);
          }
          localStorage.setItem("TMAIL.PK_guest_history", JSON.stringify(history));
        }

        setUserEmails(prev => {
          const isPremium = !!user;
          const limit = isPremium ? 9 : 4;
          const filteredPrev = prev.filter(e => e.email_address !== targetAddress);
          const newEmails = [{ email_address: targetAddress, guest: true, password: targetPassword }, ...filteredPrev];
          return newEmails.slice(0, limit);
        });
        
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        setIsSavingEmail(false);
        localStorage.setItem("TMAIL.PK_guest_activated", "true");
        localStorage.setItem("TMAIL.PK_guest_password", targetPassword);
        localStorage.setItem("TMAIL.PK_last_confirmed_email", targetAddress);
        localStorage.setItem("TMAIL.PK_guest_created_at", Date.now().toString());
      } catch (err: any) {
        setIsSavingEmail(false);
        setSaveError(err.message || "Failed to activate. Please try again.");
      }
      return;
    }
    
    if (user && userEmails.length >= 9) {
      setSaveError("You have reached the limit of 9 emails for your account.");
      return;
    }

    setIsSavingEmail(true);
    setSaveError(null);
    setShowSuccess(false);

    try {
      const isAlreadyOwned = userEmails.some(e => e.email_address === targetAddress);
      if (isAlreadyOwned) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        setIsSavingEmail(false);
        return;
      }

      const newEmail = await domainService.associateEmail(user.id, targetAddress, undefined, targetPassword);
      // Immediately move the newly created/activated email to the top of the reserve list
      setUserEmails(prev => {
        const filtered = prev.filter(e => e.email_address !== newEmail.email_address);
        return [newEmail, ...filtered];
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setIsSavingEmail(false);
      // Clear manual switch flag after successful save to allow standard sync
      setTimeout(() => localStorage.removeItem('TMAIL.PK_switched_manually'), 2000);
    } catch (err: any) {
      setIsSavingEmail(false);
      const msg = err.message || "";
      if (isAutoSave && (msg.includes("unique") || msg.includes("taken"))) {
        setTimeout(() => handleAutoGenerate(), 100);
        return;
      }
      setSaveError(msg || "Failed to activate. Please try again.");
    }
  }, [user, address, isSavingEmail, mailboxPassword, userEmails]);

  const handleAutoGenerate = useCallback((explicit = false) => {
    if (isSavingEmail) return;
    
    const isPremium = !!user; // Strictly check for logged-in user
    const limit = isPremium ? 9 : 4;

    if (userEmails.length >= limit) {
      const msg = user 
        ? "You have reached the limit of 9 emails." 
        : `Limit reached (Max ${limit}). Create an account for more.`;
      setSaveError(msg);
      return;
    }

    const newCount = regenCount + 1;
    setRegenCount(newCount);
    if (tabId) {
      localStorage.setItem(`TMAIL.PK_regen_count_${tabId}`, newCount.toString());
    }

    const newPrefix = generateAsianName();
    setPrefix(newPrefix);
    
    // Set manual switch flag to prevent the 'Active Address' reset logic from interfering
    if (user) {
      localStorage.setItem('TMAIL.PK_switched_manually', 'true');
    }

    if (user?.email && !selectedDomain && verifiedDomains.length > 0) {
      const userDom = user.email.split('@')[1];
      if (verifiedDomains.some(d => d.domain_name === userDom)) {
        setPrefix(user.email.split('@')[0]);
        setSelectedDomain(userDom);
      }
    } else if (verifiedDomains.length > 0) {
      // Randomize domain for EVERYONE (guest or logged in)
      const randomIndex = Math.floor(Math.random() * verifiedDomains.length);
      setSelectedDomain(verifiedDomains[randomIndex].domain_name);
    }
    
    setIsAuto(true);
    if (explicit) setIsFirstLoad(false); 
    lastActivatedAddr.current = null; 
    setMailboxPassword(generateRandomPassword());
    setShowSuccess(false);
    setSaveError(null);
  }, [user, isSavingEmail, regenCount, tabId, verifiedDomains, selectedDomain, userEmails.length]);

  useEffect(() => {
    setIsMounted(true);
    let currentTabId = sessionStorage.getItem("TMAIL.PK_tab_id");
    if (!currentTabId) {
      currentTabId = generateRandomString(8);
      sessionStorage.setItem("TMAIL.PK_tab_id", currentTabId);
    }
    setTabId(currentTabId);
    const storedRegen = localStorage.getItem(`TMAIL.PK_regen_count_${currentTabId}`);
    if (storedRegen) {
      setRegenCount(parseInt(storedRegen));
    }
  }, []);

  const handleSimulateEmail = useCallback(async () => {
    if (!address) return;
    try {
      await supabase.from("emails").insert({
        sender: "test@TMAIL.PK.sbs",
        subject: "Welcome to your Holographic Inbox",
        recipient_address: address,
        body_text: "Your guest temporary mailbox is active and ready to receive.",
        body_html: "<p>Your <b>guest temporary mailbox</b> is active and ready to receive.</p>",
      });
    } catch (err: any) {
      console.error("Simulation error:", err);
    }
  }, [address]);

  useEffect(() => {
    if (authLoading) return;
    let mounted = true;
    const loadDomains = async () => {
      const domains = await fetchDomains();
      if (mounted) {
        setVerifiedDomains(domains);
        setIsDomainLoading(false);
      }
    };
    loadDomains();
    return () => { mounted = false; };
  }, [authLoading, fetchDomains]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchUserEmails();
    }
  }, [user, authLoading, fetchUserEmails]);

  useEffect(() => {
    if (!user || authLoading) return;
    
    const isSwitchedManually = localStorage.getItem('TMAIL.PK_switched_manually') === 'true';
    
    if (userEmails.length > 0 && !isSwitchedManually) {
      const firstEmail = userEmails[0].email_address;
      if (address !== firstEmail) {
        const [p, d] = firstEmail.split('@');
        setPrefix(p.toLowerCase().replace(/[^a-z0-9]/g, ''));
        setSelectedDomain(d);
        setIsAuto(false);
      }
    } else if (userEmails.length === 0 && user?.email && !address) {
      const loginPrefix = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const loginDom = user.email.split('@')[1];
      setPrefix(loginPrefix);
      setSelectedDomain(loginDom);
      setIsAuto(false);
    }
  }, [user, userEmails, authLoading, address]);

  useEffect(() => {
    setIsInitialLoading(false);
  }, []);

  useEffect(() => {
    if (!tabId || hasInitialized.current || authLoading || isDomainLoading) return;

    const activeKey = `TMAIL.PK_active_email_${tabId}`;
    const domainKey = `TMAIL.PK_selected_domain_${tabId}`;
    const passwordKey = `TMAIL.PK_guest_password_${tabId}`;
    const createdKey = `TMAIL.PK_guest_created_at_${tabId}`;

    const storedAddress = localStorage.getItem(activeKey);
    const storedDomain = localStorage.getItem(domainKey);
    const forceNew = sessionStorage.getItem("forceNewTMAIL.PKEmail");
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth') === 'success';

    if (forceNew === "true" || !storedAddress || !storedAddress.includes("@") || authSuccess) {
      if (authSuccess && user?.email && verifiedDomains.length > 0) {
        const [loginPrefix, loginDom] = user.email.split('@');
        const cleanPrefix = loginPrefix.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (verifiedDomains.some(d => d.domain_name === loginDom)) {
          setPrefix(cleanPrefix);
          setSelectedDomain(loginDom);
          setIsAuto(false);
          const defaultPass = generateRandomPassword();
          setMailboxPassword(defaultPass);
          setTimeout(() => {
            handleSaveEmail(true, user.email, defaultPass);
          }, 1000);
          hasInitialized.current = true;
        } else {
          handleAutoGenerate();
          hasInitialized.current = true;
        }
      } else if (user && userEmails.length > 0) {
        const [storedPrefix, storedDom] = userEmails[0].email_address.split("@");
        setPrefix(storedPrefix.toLowerCase().replace(/[^a-z0-9]/g, ''));
        setSelectedDomain(storedDom);
        setIsAuto(false);
        hasInitialized.current = true;
      } else if (user?.email) {
        const loginPrefix = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        setPrefix(loginPrefix);
        setIsAuto(false);
        hasInitialized.current = true;
      } else if (!user && verifiedDomains.length > 0) {
        handleAutoGenerate();
        if (!localStorage.getItem(createdKey)) {
          localStorage.setItem(createdKey, Date.now().toString());
        }
        setIsFirstLoad(false); 
        hasInitialized.current = true;
      }
      sessionStorage.removeItem("forceNewTMAIL.PKEmail");
    } else if (storedAddress && verifiedDomains.length > 0) {
      if (!user) {
        const createdAt = localStorage.getItem(createdKey);
        if (createdAt && Date.now() - parseInt(createdAt) > 24 * 60 * 60 * 1000) {
          setSessionExpired(true);
        }
      }
      const [storedPrefix, storedDom] = storedAddress.split("@");
      setPrefix(storedPrefix.toLowerCase().replace(/[^a-z0-9]/g, ''));
      setSelectedDomain(storedDomain || storedDom);
      setIsAuto(false);
      const storedPass = localStorage.getItem(passwordKey);
      if (storedPass) setMailboxPassword(storedPass);
      
      if (!user) {
        const history = JSON.parse(localStorage.getItem("TMAIL.PK_guest_history") || "[]");
        setUserEmails(prev => {
          const isPremium = typeof window !== 'undefined' && localStorage.getItem('TMAIL.PK_is_premium_access') === 'true';
          const limit = isPremium ? 9 : 4;
          const currentHistory = history.map((h: any) => ({ ...h, guest: true }));
          if (storedAddress && !currentHistory.some((e:any) => e.email_address === storedAddress)) {
            currentHistory.unshift({ email_address: storedAddress, guest: true, password: storedPass });
          }
          return currentHistory.slice(0, limit);
        });
      }
      hasInitialized.current = true;
    }
  }, [authLoading, isDomainLoading, user, userEmails.length, verifiedDomains, tabId, handleAutoGenerate]);

  useEffect(() => {
    if (user && !authLoading && verifiedDomains.length > 0 && userEmails.length === 0 && !address) {
      handleAutoGenerate();
      const timer = setTimeout(() => handleSaveEmail(), 2000);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, verifiedDomains, userEmails.length, address, handleSaveEmail, handleAutoGenerate]);

  useEffect(() => {
    if (verifiedDomains.length === 0 || authLoading || !hasInitialized.current) return;
    let targetDomain = selectedDomain;
    if (!targetDomain || !verifiedDomains.some(d => d.domain_name === targetDomain)) {
       if (user?.email) {
          targetDomain = user.email.split('@')[1];
       } else {
          const randomIndex = Math.floor(Math.random() * verifiedDomains.length);
          targetDomain = verifiedDomains[randomIndex]?.domain_name || "";
       }
    }
    if (targetDomain && targetDomain !== selectedDomain) {
      setSelectedDomain(targetDomain);
    }
  }, [verifiedDomains, selectedDomain, user, authLoading]);

  useEffect(() => {
    if (!prefix || !mailboxPassword || verifiedDomains.length === 0 || !selectedDomain || isSavingEmail || showSuccess) return;
    const currentAddr = `${prefix.toLowerCase().replace(/[^a-z0-9]/g, '')}@${selectedDomain}`;
    if (lastActivatedAddr.current === currentAddr) return;
    const isAlreadySaved = userEmails.some(e => e.email_address === currentAddr);
    if (isAlreadySaved) {
      lastActivatedAddr.current = currentAddr;
      return;
    }
    const confirmedEmail = localStorage.getItem("TMAIL.PK_last_confirmed_email");
    if (confirmedEmail === currentAddr) {
      lastActivatedAddr.current = currentAddr;
      setUserEmails(prev => {
        if (prev.some(e => e.email_address === currentAddr)) return prev;
        return [{ email_address: currentAddr, guest: !user, user_id: user?.id }, ...prev];
      });
      return;
    }
    if (isFirstLoad) return;
    const timer = setTimeout(() => {
      lastActivatedAddr.current = currentAddr;
      handleSaveEmail(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [user, prefix, mailboxPassword, selectedDomain, verifiedDomains.length, isSavingEmail, showSuccess, handleSaveEmail, userEmails.length]);

  useEffect(() => {
    if (address && tabId) {
      const activeKey = `TMAIL.PK_active_email_${tabId}`;
      if (localStorage.getItem(activeKey) !== address) {
        localStorage.setItem(activeKey, address);
      }
    }
  }, [address, tabId]);

  useEffect(() => {
    if (mailboxPassword && tabId) {
      localStorage.setItem(`TMAIL.PK_guest_password_${tabId}`, mailboxPassword);
    }
  }, [mailboxPassword, tabId]);

  const isAddressSaved = useMemo(() => userEmails.some(e => e.email_address === address), [userEmails, address]);
  const { emails, isLoading } = useEmails(isAddressSaved ? address : null);
  const selectedEmail = emails.find((e) => e.id === selectedEmailId) || null;
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
              Starting your mail session...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col h-[calc(100vh-60px)] w-full max-w-7xl mx-auto space-y-2 flex-1 px-4 sm:px-0">
        <div className="flex-0 flex flex-col items-center justify-start pt-1 pb-1 sm:pt-2 sm:pb-1">
          {user && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-1 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-gray-500"
            >
              Account Active: <span className="text-[var(--color-brand-pink)]">{user.email}</span>
            </motion.div>
          )}
          <HeroAddress 
            emailAddress={address} 
            prefix={prefix}
            onPrefixChange={(val) => {
              if (val === "_LOCK_MSG_") {
                setLockMessage("Create an account to use more domains.");
                setTimeout(() => setLockMessage(null), 5000);
                return;
              }
              setPrefix(val.toLowerCase().replace(/[^a-z0-9]/g, ''));
              setIsAuto(false);
            }}
            onAutoGenerate={() => handleAutoGenerate(true)}
            isAuto={isAuto}
            selectedDomain={selectedDomain}
            verifiedDomains={verifiedDomains}
            onDomainChange={handleDomainChange}
            onSwitchAddress={handleSwitchEmail}
            onSaveAddress={handleSaveEmail}
            savedAddresses={savedAddressList}
            isSaving={isSavingEmail}
            isSaved={isAddressSaved}
            showSuccess={showSuccess}
            isLoggedIn={!!user}
            isDomainLoading={isDomainLoading}
            error={lockMessage || saveError || (sessionExpired ? "Session expired. Please login again." : null)}
            password={mailboxPassword}
            onPasswordChange={setMailboxPassword}
            sessionExpired={sessionExpired}
            onSimulate={handleSimulateEmail}
          />
        </div>

        <div className="flex-1 min-h-[200px] sm:min-h-[300px] border border-white/10 rounded-2xl overflow-hidden glass-panel flex flex-col shadow-2xl relative mb-2">
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

        <SystemStats />

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
