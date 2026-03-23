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

    // Safety timeout to prevent infinite spinner
    const timeout = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 5000);

    try {
      if (isMounted) setIsLoading(true);
      const { data, error } = await supabase
        .from("emails")
        .select("*")
        .eq("recipient_address", recipientAddress)
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

    // Set up realtime subscription
    const channel = supabase
      .channel(`emails-${recipientAddress}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "emails",
          filter: `recipient_address=eq.${recipientAddress}`,
        },
        (payload: any) => {
          if (isMounted) {
            setEmails((prev) => [payload.new as Email, ...prev]);
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
