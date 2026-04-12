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
  return Math.random().toString(36).slice(2, 10);
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
  const [guestTimeLeft, setGuestTimeLeft] = useState<number | null>(null);
  const [isGuestSessionExpired, setIsGuestSessionExpired] = useState(false);

  // 2. Memoized Values
  const address = useMemo(() => {
    if (!prefix || !selectedDomain) return "";
    return `${prefix.toLowerCase().replace(/[^a-z0-9]/g, '')}@${selectedDomain.toLowerCase()}`;
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

  const lastUserId = useRef<string | null>(null);
  const fetchUserEmails = useCallback(async () => {
    if (!user?.id) {
      // Guest logic: Merge guest history and other profiles
      const history = JSON.parse(localStorage.getItem("TMAIL.PK_guest_history") || "[]");
      const profiles = JSON.parse(localStorage.getItem("TMAIL.PK_profiles") || "[]");
      
      const combined = [...history.map((h:any) => ({ ...h, guest: true }))];
      profiles.forEach((p:any) => {
        if (!combined.some(c => c.email_address === p.email)) {
          combined.push({ email_address: p.email, guest: false, password: p.password });
        }
      });
      
      setUserEmails(combined.slice(0, 9));
      return combined;
    }
    
    if (lastUserId.current !== user.id) {
      setUserEmails([]); 
    }
    lastUserId.current = user.id;

    try {
      const dbEmails = await domainService.listUserEmails(user.id);
      
      // Merge with other profiles and YOUR OWN login identity to ensure "Universal Reserves"
      const profiles = JSON.parse(localStorage.getItem("TMAIL.PK_profiles") || "[]");
      const combined = [...(dbEmails || [])];

      // 1. Ensure current identity is ALWAYS in the reserves list
      const identityEmail = user.email?.toLowerCase();
      if (identityEmail && !combined.some(c => c.email_address?.toLowerCase() === identityEmail)) {
        combined.unshift({ email_address: identityEmail, guest: false, isIdentity: true });
      }
      
      // 2. Merge other saved profiles
      profiles.forEach((p: any) => {
        const addr = p.email?.toLowerCase();
        if (addr && !combined.some(c => c.email_address?.toLowerCase() === addr)) {
          combined.push({ email_address: p.email, password: p.password, guest: false });
        }
      });

      // Strictly enforce the limits: 9 for Pro, 4 for Guest (though this block is user-only)
      const limit = user ? 9 : 4;
      setUserEmails(combined.slice(0, limit));
      return combined;
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
    } else if (!user) {
      // Guest-only shortcut: read from local history if not logged in
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
        setSaveError("Please set a Password to activate your mailbox.");
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
          
          if (history.length > 4) {
             history = history.slice(0, 4);
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
      // 1. Initial local check: Is it already in our state list?
      const isAlreadyOwned = userEmails.some(e => e.email_address?.toLowerCase() === targetAddress.toLowerCase());
      const isIdentity = targetAddress.toLowerCase() === user.email?.toLowerCase();
      
      if (isAlreadyOwned || isIdentity) {
        // If it's identity, we try to ensure it's in DB but don't block the UI
        if (isIdentity && !isAlreadyOwned) {
           domainService.associateEmail(user.id, targetAddress, undefined, targetPassword).catch(e => {
             console.warn("Identity auto-save background failed (likely limit related):", e.message);
           });
        }
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        setIsSavingEmail(false);
        return;
      }

      // 2. Database associate attempt
      const newEmail = await domainService.associateEmail(user.id, targetAddress, undefined, targetPassword);
      
      setUserEmails(prev => {
        const filtered = prev.filter(e => e.email_address !== newEmail.email_address);
        return [newEmail, ...filtered];
      });
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setIsSavingEmail(false);
      
      // Removed: Clearing manual switch flag. This should stick until a new generation or logout.
    } catch (err: any) {
      setIsSavingEmail(false);
      
      // 3. Graceful error handling for "Already Taken" or "Duplicate"
      const errorMsg = err.message || "";
      if (errorMsg.includes('already taken') || errorMsg.includes('duplicate key') || errorMsg.includes('23505') || errorMsg.includes('Reservation DB error')) {
        console.warn(`DOMAINS: Gracefully handled reservation retry for ${targetAddress}.`);
        // If it's already taken, we just treat it as "Saved" for the UI to prevent a crash
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        setSaveError(errorMsg);
      }
    }
  }, [user, address, isSavingEmail, mailboxPassword, userEmails]);

  const handleAutoGenerate = useCallback((explicit = false) => {
    if (isSavingEmail || (!explicit && localStorage.getItem("TMAIL.PK_active_email"))) return;
    
    const isPremium = !!user; // Strictly check for logged-in user
    const limit = isPremium ? 9 : 4;

    if (userEmails.length >= limit) {
      setSaveError("Limit reached");
      return;
    }

    const newCount = regenCount + 1;
    setRegenCount(newCount);
    if (tabId) {
      localStorage.setItem(`TMAIL.PK_regen_count_${tabId}`, newCount.toString());
    }

    const newPrefix = generateAsianName();
    const newPassword = generateRandomPassword();
    const newDomain = verifiedDomains.length > 0 
      ? verifiedDomains[Math.floor(Math.random() * verifiedDomains.length)].domain_name 
      : selectedDomain;

    setPrefix(newPrefix);
    setSelectedDomain(newDomain);
    setMailboxPassword(newPassword);
    
    // Set manual switch flag to prevent the 'Active Address' reset logic from interfering
    if (user) {
      localStorage.setItem('TMAIL.PK_switched_manually', 'true');
    } else if (tabId) {
      localStorage.setItem(`TMAIL.PK_guest_password_${tabId}`, newPassword);
      localStorage.setItem("TMAIL.PK_guest_password", newPassword);
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
    // Manual password setting combined in top of function for atomicity
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
    if (!authLoading) {
      fetchUserEmails();

      if (user) {
        // MIGRATION LOGIC: One-time adoption of guest history into account
        const hasMigrated = sessionStorage.getItem("TMAIL.PK_migrated");
        const guestHistoryStr = localStorage.getItem("TMAIL.PK_guest_history");
        
        if (!hasMigrated && guestHistoryStr) {
          try {
            const guestHistory = JSON.parse(guestHistoryStr);
            if (guestHistory.length > 0) {
              console.log("MIGRATION: Starting guest-to-account migration...");
              domainService.migrateGuestEmails(user.id, guestHistory).then((migratedAddrs) => {
                if (migratedAddrs.length > 0) {
                  console.log(`MIGRATION: Successfully migrated ${migratedAddrs.length} emails.`);
                  fetchUserEmails(); // Refresh list after migration
                  
                  // Selective cleanup: Only remove migrated items from guest history
                  const remaining = guestHistory.filter((item: any) => {
                    const addr = (typeof item === "string" ? item : item.email_address)?.toLowerCase()?.trim();
                    return !migratedAddrs.includes(addr);
                  });
                  
                  if (remaining.length === 0) {
                    localStorage.removeItem("TMAIL.PK_guest_history");
                  } else {
                    localStorage.setItem("TMAIL.PK_guest_history", JSON.stringify(remaining));
                  }
                }
                sessionStorage.setItem("TMAIL.PK_migrated", "true");
              });
            }
          } catch (e) {
            console.error("MIGRATION: Parse error:", e);
          }
        }
      }
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
    } else if (!isSwitchedManually && userEmails.length > 0 && user?.email) {
       // If we just logged in and have NO active address chosen, prefer the IDENTITY email
       const identityEmail = user.email.toLowerCase();
       const hasIdentityInReserves = userEmails.some(e => e.email_address?.toLowerCase() === identityEmail);
       
       if (hasIdentityInReserves && address !== identityEmail && !address) {
         const [p, d] = identityEmail.split('@');
         setPrefix(p.toLowerCase().replace(/[^a-z0-9]/g, ''));
         setSelectedDomain(d);
         setIsAuto(false);
       }
    } else if (!isSwitchedManually && userEmails.length === 0 && user?.email && !address) {
      const loginPrefix = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const loginDom = user.email.split('@')[1];
      setPrefix(loginPrefix);
      setSelectedDomain(loginDom);
      setIsAuto(false);
      localStorage.setItem('TMAIL.PK_switched_manually', 'true');
    }
  }, [user, userEmails, authLoading, address]);

  useEffect(() => {
    setIsInitialLoading(false);
  }, []);

  // Guest Session Timer Logic (10 Minutes)
  useEffect(() => {
    // Hide timer only for registered users or those who have ENTERED a password on the login page
    if (user || localStorage.getItem("TMAIL.PK_is_premium_access") === "true") {
      setGuestTimeLeft(null);
      return;
    }

    // Initialize timer for guest
    if (guestTimeLeft === null && !isGuestSessionExpired) {
      const storedStartTime = localStorage.getItem("TMAIL.PK_guest_session_start");
      const now = Date.now();
      
      if (storedStartTime) {
        const elapsed = Math.floor((now - parseInt(storedStartTime)) / 1000);
        const remaining = 600 - elapsed;
        if (remaining <= 0) {
          setGuestTimeLeft(0);
        } else {
          setGuestTimeLeft(remaining);
        }
      } else {
        localStorage.setItem("TMAIL.PK_guest_session_start", now.toString());
        setGuestTimeLeft(600);
      }
    }

    if (guestTimeLeft !== null && guestTimeLeft > 0) {
      const timer = setInterval(() => {
        setGuestTimeLeft(prev => (prev !== null && prev > 0) ? prev - 1 : 0);
      }, 1000);
      return () => clearInterval(timer);
    }

    if (guestTimeLeft === 0 && !isGuestSessionExpired) {
      setIsGuestSessionExpired(true);
      // "Zero out" the system for guest
      localStorage.removeItem("TMAIL.PK_guest_history");
      localStorage.removeItem("TMAIL.PK_guest_password");
      localStorage.removeItem("TMAIL.PK_last_confirmed_email");
      localStorage.removeItem("TMAIL.PK_guest_activated");
      localStorage.removeItem("TMAIL.PK_guest_session_start");
      
      // Clear tab-specific storage too
      if (tabId) {
        localStorage.removeItem(`TMAIL.PK_active_email_${tabId}`);
        localStorage.removeItem(`TMAIL.PK_guest_password_${tabId}`);
      }
    }
  }, [user, authLoading, guestTimeLeft, isGuestSessionExpired, tabId]);

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

    // Priority 1: Recent login or explicit intent from global storage (Absolute Source of Truth)
    const globalActive = localStorage.getItem("TMAIL.PK_active_email");

    // Anti-Deadlock: If we are at the limit and current address is not in reserves, 
    // automatically switch to the first valid reserve.
    if (user && userEmails.length >= 9 && hasInitialized.current) {
      const currentAddr = globalActive || storedAddress || address;
      const isReserved = userEmails.some(e => e.email_address?.toLowerCase() === currentAddr?.toLowerCase());
      
      if (!isReserved && userEmails[0]?.email_address) {
        console.log("LIMIT: User at 9/9, auto-switching to first reserve to avoid deadlock.");
        handleSwitchEmail(userEmails[0].email_address);
        return;
      }
    }

    let effectiveAddress = globalActive || (storedAddress && storedAddress.includes("@") ? storedAddress : null);

    if (authSuccess || globalActive || forceNew === "true" || !effectiveAddress) {
      if (authSuccess && user && verifiedDomains.length > 0) {
        // PRIORITIZE: The specific email used for login/creation
        const loginTarget = globalActive || (user.email && user.email.includes('@') ? user.email : null);
        
        if (loginTarget) {
          const [loginPrefix, loginDom] = loginTarget.split('@');
          const cleanPrefix = loginPrefix.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
          
          if (loginDom) {
            setPrefix(cleanPrefix);
            setSelectedDomain(loginDom);
            setIsAuto(false);
            
            // Priority: Match database password for this address
            const dbMatch = userEmails.find((e: any) => e.email_address?.toLowerCase() === loginTarget.toLowerCase());
            const storedPass = dbMatch?.password || localStorage.getItem("TMAIL.PK_guest_password");
            const finalPass = storedPass || generateRandomPassword();
            
            if (finalPass) setMailboxPassword(finalPass);
            
            setTimeout(() => {
              const isAlreadyOwned = userEmails.some((e: any) => e.email_address?.toLowerCase() === loginTarget.toLowerCase());
              if (!isAlreadyOwned) {
                handleSaveEmail(true, loginTarget, finalPass);
              }
              localStorage.removeItem("TMAIL.PK_active_email"); 
              localStorage.setItem('TMAIL.PK_switched_manually', 'true');
            }, 1000);
            hasInitialized.current = true;
          } else {
            handleAutoGenerate(true);
            hasInitialized.current = true;
          }
        } else if (userEmails.length > 0) {
           handleSwitchEmail(userEmails[0].email_address);
           hasInitialized.current = true;
        } else {
           handleAutoGenerate(true);
           hasInitialized.current = true;
        }
      } else if (effectiveAddress && verifiedDomains.length > 0) {
        // Recovery path for existing tab session
        const [p, d] = effectiveAddress.split("@");
        setPrefix(p.toLowerCase().replace(/[^a-z0-9]/g, ''));
        setSelectedDomain(d);
        setIsAuto(false);
        hasInitialized.current = true;
        
        const dbPass = userEmails.find((e: any) => e.email_address?.toLowerCase() === effectiveAddress?.toLowerCase())?.password;
        const storedPass = dbPass || localStorage.getItem(passwordKey) || localStorage.getItem("TMAIL.PK_guest_password");
        if (storedPass) setMailboxPassword(storedPass);
        
        localStorage.setItem('TMAIL.PK_switched_manually', 'true');
        // Clear global session after sync is fully established
        setTimeout(() => localStorage.removeItem("TMAIL.PK_active_email"), 2000);
      } else if (user && userEmails.length > 0) {
        const firstEmail = userEmails[0].email_address.toLowerCase();
        const [storedPrefix, storedDom] = firstEmail.split("@");
        setPrefix(storedPrefix.toLowerCase().replace(/[^a-z0-9]/g, ''));
        setSelectedDomain(storedDom);
        setIsAuto(false);
        hasInitialized.current = true;
      } else if (user?.email && user.email.includes('@')) {
        const [lp, ld] = user.email.split('@');
        setPrefix(lp.toLowerCase().replace(/[^a-z0-9]/g, ''));
        setSelectedDomain(ld);
        setIsAuto(false);
        hasInitialized.current = true;
      } else if (!user && verifiedDomains.length > 0) {
        // For guest, check global history first
        const historyStr = localStorage.getItem("TMAIL.PK_guest_history") || "[]";
        try {
          const history = JSON.parse(historyStr);
          if (history.length > 0) {
            const lastAddr = history[0].email_address || history[0];
            const [hPrefix, hDom] = lastAddr.split('@');
            setPrefix(hPrefix.toLowerCase().replace(/[^a-z0-9]/g, ''));
            setSelectedDomain(hDom);
            setIsAuto(false);
          } else {
            handleAutoGenerate(true); // Triggers explicit randomization only if no history
          }
        } catch (e) {
          handleAutoGenerate(true);
        }
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
      hasInitialized.current = true;
    }
  }, [authLoading, isDomainLoading, user, userEmails, verifiedDomains, tabId, handleAutoGenerate]);

  useEffect(() => {
    // FALLBACK for logged-in users with no existing emails:
    // Only trigger if we are fully initialized, logged in, and STILL have no address and no saved emails.
    if (hasInitialized.current && user && !authLoading && verifiedDomains.length > 0 && userEmails.length === 0 && !address) {
      handleAutoGenerate();
      const timer = setTimeout(() => handleSaveEmail(), 2000);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, verifiedDomains, userEmails.length, address, handleSaveEmail, handleAutoGenerate]);

  useEffect(() => {
    if (verifiedDomains.length === 0 || authLoading || !hasInitialized.current) return;
    
    let targetDomain = selectedDomain;
    const isManualSwitch = localStorage.getItem('TMAIL.PK_switched_manually') === 'true';

    // Priority: Try to recover from localStorage if we don't have a valid domain yet
    if (!targetDomain || !verifiedDomains.some(d => d.domain_name === targetDomain)) {
       const storedDomain = localStorage.getItem(`TMAIL.PK_selected_domain_${tabId}`) || localStorage.getItem("TMAIL.PK_selected_domain");
       if (storedDomain && verifiedDomains.some(d => d.domain_name === storedDomain)) {
         targetDomain = storedDomain;
       }
    }

    // Stabilize only if truly invalid
    const sessionEmail = localStorage.getItem("TMAIL.PK_active_email");
    const sessionDomain = (sessionEmail && sessionEmail.includes('@')) ? sessionEmail.split('@')[1] : null;

    if (sessionDomain && verifiedDomains.some(d => d.domain_name === sessionDomain)) {
      targetDomain = sessionDomain;
    } else if (!targetDomain || (!isManualSwitch && !verifiedDomains.some(d => d.domain_name === targetDomain))) {
       // Fallback to first available if we are totally lost, but DO NOT randomize randomly
       if (user?.email) {
          const userDom = user.email.split('@')[1];
          if (verifiedDomains.some(d => d.domain_name === userDom)) {
            targetDomain = userDom;
          } else {
            targetDomain = verifiedDomains[0].domain_name;
          }
       } else if (verifiedDomains.length > 0) {
          targetDomain = verifiedDomains[0].domain_name;
       }
    }
    
    if (targetDomain && targetDomain !== selectedDomain) {
      setSelectedDomain(targetDomain);
    }
  }, [verifiedDomains, selectedDomain, user, authLoading, tabId]);

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
    // isFirstLoad restriction removed to enable immediate mailbox activation for new users.
    const timer = setTimeout(() => {
      // Final limit check before auto-save
      if (user && userEmails.length >= 9) {
        console.warn("LIMIT: Skipping auto-save because user is at 9/9");
        return;
      }
      
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

  // Sync password when address or user list changes for logged-in users
  useEffect(() => {
    if (user && address) {
      const dbMatch = userEmails.find(e => e.email_address?.toLowerCase() === address.toLowerCase());
      if (dbMatch?.password && dbMatch.password !== mailboxPassword) {
        setMailboxPassword(dbMatch.password);
      } else {
        // Fallback to profile store if not found in list
        const profiles = JSON.parse(localStorage.getItem('TMAIL.PK_profiles') || '[]');
        const profileMatch = profiles.find((p: any) => p.email?.toLowerCase() === address.toLowerCase());
        if (profileMatch?.password && profileMatch.password !== mailboxPassword) {
          setMailboxPassword(profileMatch.password);
        }
      }
    }
  }, [user, address, userEmails, mailboxPassword]);

  useEffect(() => {
    if (selectedEmailId) {
      document.documentElement.classList.add('is-reading-mail');
    } else {
      document.documentElement.classList.remove('is-reading-mail');
    }
    return () => document.documentElement.classList.remove('is-reading-mail');
  }, [selectedEmailId]);

  const isAddressSaved = useMemo(() => {
    if (address.toLowerCase() === user?.email?.toLowerCase()) return true; // Identity is always "saved"
    return userEmails.some(e => e.email_address === address);
  }, [userEmails, address, user]);
  
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

        {isGuestSessionExpired && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[250] bg-[#050505]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-8 animate-pulse border border-red-500/20 relative">
              <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full"></div>
              <Loader2 className="w-10 h-10 text-red-500 relative z-10" />
            </div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4 italic">
              Guest Session Expired
            </h2>
            <p className="text-gray-400 max-w-sm mb-10 font-medium leading-relaxed text-sm">
              Your 10-minute guest security session has concluded. Previous temporary access has been zeroed out.
              <br/><br/>
              <span className="text-[var(--color-brand-pink)] uppercase tracking-widest text-[10px] font-black italic">Credentials required for re-access</span>
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-16 py-5 bg-white text-black rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:shadow-none"
            >
              Refresh System
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col h-[calc(100vh-60px)] w-full max-w-7xl mx-auto space-y-2 flex-1 px-4 sm:px-0">
        <div className="flex-0 flex flex-col items-center justify-start pt-10 pb-1 sm:pt-12 sm:pb-1">
          {user && (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => user.email && handleSwitchEmail(user.email)}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 mb-4 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 hover:bg-white/10 hover:text-white hover:border-[var(--color-brand-pink)]/50 transition-all cursor-pointer shadow-lg hover:shadow-[var(--color-brand-pink)]/10"
            >
              Account Active: <span className="text-[var(--color-brand-pink)]">{user.email}</span>
            </motion.button>
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
            isIdentity={address.toLowerCase() === user?.email?.toLowerCase()}
            guestTimeLeft={guestTimeLeft}
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
              className="fixed inset-0 z-[500] flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-2xl"
              onClick={() => setSelectedEmailId(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 40 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-6xl h-full sm:h-[92vh] relative"
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
