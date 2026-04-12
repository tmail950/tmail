"use client";

import { useEffect, useState, useRef } from "react";
import { domainService } from "@/services/domainService";
import { supabase } from "@/lib/supabase";
import { Mail, Globe, Zap } from "lucide-react";
import { motion, useSpring, useTransform, animate } from "framer-motion";

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    const controls = animate(prevValue.current, value, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (latest) => setDisplayValue(Math.floor(latest)),
    });
    prevValue.current = value;
    return () => controls.stop();
  }, [value]);

  return <>{displayValue.toLocaleString()}</>;
}

export default function SystemStats() {
  const [stats, setStats] = useState({ totalMailboxes: 0, activeDomains: 0, totalMessages: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const s = await domainService.getStats() as any;
        setStats(s);
      } catch (e) {
        console.error("Stats fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();

    // REAL-TIME SUBSCRIPTIONS
    const channel = supabase
      .channel('system-stats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emails' }, () => {
        setStats(prev => ({ ...prev, totalMessages: prev.totalMessages + 1 }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_emails' }, () => {
        setStats(prev => ({ ...prev, totalMailboxes: prev.totalMailboxes + 1 }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guest_mailboxes' }, () => {
        setStats(prev => ({ ...prev, totalMailboxes: prev.totalMailboxes + 1 }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const statItems = [
    { label: "Emails Created", value: stats.totalMailboxes, icon: Mail, color: "text-[var(--color-brand-pink)]" },
    { label: "Messages Received", value: stats.totalMessages, icon: Zap, color: "text-[var(--color-brand-orange)]" },
    { label: "Active Domains", value: stats.activeDomains, icon: Globe, color: "text-[var(--color-brand-purple)]" },
  ];

  return (
    <div className="w-full py-6 px-4 border-t border-white/5 bg-black/20 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-8 sm:gap-16">
        {statItems.map((item, idx) => (
          <motion.div 
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex flex-col items-center sm:items-start gap-1"
          >
            <div className="flex items-center gap-2">
              <item.icon className={`w-3 h-3 ${item.color}`} />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500">{item.label}</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tabular-nums min-w-[60px]">
              {loading ? "..." : <AnimatedNumber value={item.value} />}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
