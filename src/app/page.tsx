"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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

function generateRandomString(length: number) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function Home() {
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

  // 1. Fetch Domains Logic
  const fetchDomains = useCallback(async () => {
    try {
      const platformDomains = await domainService.listPublicDomains();
      return platformDomains.map((d: any) => ({
        id: d.id,
        domain_name: d.domain_name,
        is_verified: d.is_verified,
        created_at: d.created_at
      } as DomainRecord));
    } catch (err) {
      console.error("Domain fetch error:", err);
      return [];
    }
  }, []);

  // 2. Domain Fetching (Background)
  useEffect(() => {
    if (authLoading) return;
    let mounted = true;

    const loadDomains = async () => {
      console.log("DOMAINS: Starting background fetch (waiting for auth settle)...");
      // Add a small 300ms delay to let the auth lock settle
      await new Promise(r => setTimeout(r, 300));
      const domains = await fetchDomains();
      if (mounted) {
        setVerifiedDomains(domains);
        setIsDomainLoading(false);
        console.log("DOMAINS: Sync complete. Count:", domains.length);
      }
    };

    loadDomains();
    return () => { mounted = false; };
  }, [authLoading, fetchDomains]);

  // 2.5. Fetch User's Saved Emails
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

  useEffect(() => {
    if (user) {
      fetchUserEmails();
    }
  }, [user, fetchUserEmails]);

  // 3. Initial UI Calibration (Hard Failsafe)
  useEffect(() => {
    if (user && userEmails.length > 0 && !localStorage.getItem("quamify_active_email")) {
      const firstEmail = userEmails[0].email_address;
      const [p, d] = firstEmail.split('@');
      setPrefix(p);
      setSelectedDomain(d);
      setIsAuto(false);
    } else if (user && userEmails.length === 0 && user.email && !localStorage.getItem("quamify_active_email")) {
      // New user: Use their login email prefix as default
      const loginPrefix = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      setPrefix(loginPrefix);
      setIsAuto(false);
      console.log("UI: Set default prefix for new user from login email.");
    }
  }, [user, userEmails]);

  useEffect(() => {
    let mounted = true;
    
    // Fast calibration experience - even if auth is slow
    const calibrationTimer = setTimeout(() => {
      if (mounted) {
        setIsInitialLoading(false);
        console.log("UI: Calibration forced to complete.");
      }
    }, 1500); 

    return () => { 
      mounted = false; 
      clearTimeout(calibrationTimer);
    };
  }, []); // Runs immediately on mount

  // 4. Address Restoration & Selection Sync
  useEffect(() => {
    if (authLoading) return;

    const storedAddress = localStorage.getItem("quamify_active_email");
    const forceNew = sessionStorage.getItem("forceNewQuamifyEmail");

    // Case 1: Force new or no stored address
    if (forceNew === "true" || !storedAddress || !storedAddress.includes("@")) {
      if (user && userEmails.length > 0) {
        // Use first saved address if available
        const [storedPrefix, storedDom] = userEmails[0].email_address.split("@");
        setPrefix(storedPrefix);
        setSelectedDomain(storedDom);
        setIsAuto(false);
      } else if (user?.email) {
        // Use login email prefix for new user
        const loginPrefix = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        setPrefix(loginPrefix);
        setIsAuto(false);
      } else {
        // Generate random guest address
        setPrefix(generateRandomString(10));
        setIsAuto(true);
      }
      sessionStorage.removeItem("forceNewQuamifyEmail");
    } else {
      // Case 2: Restore from localStorage
      const [storedPrefix, storedDom] = storedAddress.split("@");
      setPrefix(storedPrefix);
      setSelectedDomain(storedDom);
      setIsAuto(false);
    }
  }, [authLoading, user, userEmails]);

  // 5. Dynamic Selection Sync (Ensures selectedDomain is valid)
  useEffect(() => {
    if (verifiedDomains.length > 0) {
      if (!selectedDomain || !verifiedDomains.some(d => d.domain_name === selectedDomain)) {
        setSelectedDomain(verifiedDomains[0].domain_name);
      }
    }
  }, [verifiedDomains, selectedDomain]);

  // 3. Address Calculation (Memoized)
  const address = useMemo(() => {
    if (!prefix || !selectedDomain) return "";
    return `${prefix.toLowerCase().replace(/[^a-z0-9]/g, '')}@${selectedDomain}`;
  }, [prefix, selectedDomain]);

  // 4. Persistence Effect
  useEffect(() => {
    if (address) localStorage.setItem("quamify_active_email", address);
  }, [address]);

  const { emails, isLoading } = useEmails(address);
  const selectedEmail = emails.find((e) => e.id === selectedEmailId) || null;

  const handleDomainChange = useCallback((newDomain: string) => {
    setSelectedDomain(newDomain);
  }, []);

  const handleAutoGenerate = useCallback(() => {
    const newPrefix = generateRandomString(10);
    setPrefix(newPrefix);
    setIsAuto(true);
  }, []);

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

  const handleSaveEmail = useCallback(async () => {
    if (!user || !address || isSavingEmail) return;
    setIsSavingEmail(true);
    setSaveError(null);
    try {
      await domainService.associateEmail(user.id, address);
      await fetchUserEmails();
      console.log("UI: Holographic address reserved successfully.");
    } catch (err: any) {
      setSaveError(err.message || "Reservation failure.");
      console.error("Save email error:", err);
    } finally {
      setIsSavingEmail(false);
    }
  }, [user, address, isSavingEmail, fetchUserEmails]);

  const handleSwitchEmail = useCallback((newAddress: string) => {
    const [newPrefix, newDom] = newAddress.split('@');
    setPrefix(newPrefix);
    setSelectedDomain(newDom);
    setIsAuto(false);
    setSelectedEmailId(null);
  }, []);

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
            setPrefix(val);
            setIsAuto(false);
          }}
          onAutoGenerate={handleAutoGenerate}
          isAuto={isAuto}
          selectedDomain={selectedDomain}
          verifiedDomains={verifiedDomains}
          onDomainChange={handleDomainChange}
          onSimulate={simulateEmail}
          savedAddresses={userEmails.map(e => e.email_address)}
          isSaved={userEmails.some(e => e.email_address === address)}
          onSwitchAddress={handleSwitchEmail}
          onSaveAddress={handleSaveEmail}
          isSaving={isSavingEmail}
          isLoggedIn={!!user}
          isDomainLoading={isDomainLoading}
          error={saveError}
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

      {/* Floating 3D Modal for Email Reading */}
      <AnimatePresence>
        {selectedEmail && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-5xl h-full max-h-[90vh] relative"
            >
              <div 
                className="absolute -inset-1 bg-gradient-to-r from-[var(--color-brand-purple)] via-[var(--color-brand-pink)] to-[var(--color-brand-orange)] rounded-[40px] blur-2xl opacity-40 animate-pulse-glow pointer-events-none"
              ></div>
              <div className="w-full h-full bg-[#050505]/95 rounded-[40px] relative overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                <button 
                  onClick={() => setSelectedEmailId(null)}
                  className="absolute top-6 right-6 z-[110] p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all transform hover:rotate-90 active:scale-90"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <div className="flex-1 overflow-hidden">
                  <EmailViewer email={selectedEmail} />
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
