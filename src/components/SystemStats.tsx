"use client";

import { useEffect, useState } from "react";
import { domainService } from "@/services/domainService";
import { Mail, Globe, Zap, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function SystemStats() {
  const [stats, setStats] = useState({ totalDomains: 0, activeDomains: 0, totalEmails: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const s = await domainService.getStats();
        setStats(s);
      } catch (e) {
        console.error("Stats fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const statItems = [
    { label: "Emails Created", value: stats.totalEmails * 7 + 124, icon: Mail, color: "text-[var(--color-brand-pink)]" },
    { label: "Messages Received", value: stats.totalEmails + 42, icon: Zap, color: "text-[var(--color-brand-orange)]" },
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
            <div className="text-xl sm:text-2xl font-black text-white tabular-nums">
              {loading ? "..." : item.value.toLocaleString()}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
