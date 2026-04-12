"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Email } from "@/types";

export function useEmails(recipientAddress: string | null) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEmails = useCallback(async (isMounted: boolean) => {
    if (!recipientAddress) {
      if (isMounted) setIsLoading(false);
      return;
    }

    const normalizedAddress = recipientAddress.toLowerCase().trim();

    // Safety timeout to prevent infinite spinner
    const timeout = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 5000);

    try {
      if (isMounted) setIsLoading(true);
      const { data, error } = await supabase
        .from("emails")
        .select("*")
        .eq("recipient_address", normalizedAddress)
        .order("received_at", { ascending: false });

      if (error) throw error;
      
      if (data && isMounted) {
        setEmails(data as Email[]);
      }
    } catch (err) {
      console.error("Fetch emails error:", err);
    } finally {
      clearTimeout(timeout);
      if (isMounted) setIsLoading(false);
    }
  }, [recipientAddress]);

  useEffect(() => {
    let isMounted = true;
    fetchEmails(isMounted);

    if (!recipientAddress) return;

    const normalizedAddress = recipientAddress.toLowerCase().trim();

    // Set up realtime subscription
    const channel = supabase
      .channel(`emails-${normalizedAddress}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "emails",
          filter: `recipient_address=eq.${normalizedAddress}`,
        },
        (payload: any) => {
          if (isMounted) {
            setEmails((prev) => {
              // Deduplication check: only add if the email ID is not already in the list
              const isDuplicate = prev.some(e => e.id === payload.new.id);
              if (isDuplicate) return prev;
              return [payload.new as Email, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [recipientAddress, fetchEmails]);

  return { emails, isLoading, refetch: () => fetchEmails(true) };
}
