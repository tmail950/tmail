"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  isSaved?: boolean;
}

const EmptyState = memo(({ isSaved = true }: EmptyStateProps) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
      <motion.div 
        animate={{ 
          y: [-10, 10, -10],
          rotate: [0, 2, -2, 0]
        }}
        transition={{ 
          duration: 6, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-brand-pink)] to-transparent blur-3xl opacity-30 rounded-full scale-110"></div>
        <div className="absolute inset-0 bg-[var(--color-brand-pink)]/10 blur-xl rounded-full scale-90"></div>
        <div className={`w-24 h-24 rounded-3xl glass-card flex items-center justify-center relative z-10 border transition-all duration-700 ${!isSaved ? 'border-[--color-brand-pink]/40 shadow-[0_0_30px_var(--color-brand-pink)]/20' : 'border-white/10'}`}>
          <Inbox className={`w-10 h-10 ${!isSaved ? 'text-[--color-brand-pink] animate-bounce' : 'text-gray-500 animate-pulse'}`} />
        </div>
        
        {/* Floating Particles */}
        <motion.div 
          animate={{ y: [-20, -40], x: [-10, 10], opacity: [0, 0.4, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
          className="absolute -top-4 -right-4 w-1.5 h-1.5 rounded-full bg-[var(--color-brand-pink)] opacity-50 blur-[1px]"
        />
        <motion.div 
          animate={{ y: [0, -30], x: [10, -20], opacity: [0, 0.4, 0] }}
          transition={{ duration: 4, repeat: Infinity, delay: 1.2 }}
          className="absolute top-10 -left-6 w-1 h-1 rounded-full bg-[var(--color-brand-purple)] opacity-50 blur-[1px]"
        />
        <motion.div 
          animate={{ y: [10, -20], x: [0, 15], opacity: [0, 0.4, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, delay: 2 }}
          className="absolute bottom-4 -right-8 w-2 h-2 rounded-full bg-[var(--color-brand-pink)] opacity-50 blur-[2px]"
        />
      </motion.div>
      
      <motion.h3 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 text-2xl font-semibold text-white tracking-wide uppercase italic"
      >
        {!isSaved ? "RESERVATION REQUIRED" : "AWAITING EMAIL"}
      </motion.h3>
      
      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-3 text-gray-400 max-w-sm"
      >
        {!isSaved 
          ? "This TMAIL.PK address is not yet activated. Click 'REGENERATE' to begin receiving mail."
          : "Your temporary inbox is active. Send an email to your address and it will materialize here."}
      </motion.p>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 2 }}
        className="mt-8 flex items-center space-x-2 text-xs text-gray-500 font-mono uppercase tracking-widest"
      >
        <span className={`w-2 h-2 rounded-full ${!isSaved ? 'bg-orange-500 animate-ping' : 'bg-green-500 animate-pulse'}`}></span>
        <span>{!isSaved ? "Offline / Not Activated" : "Listening for incoming signals"}</span>
      </motion.div>
    </div>
  );
});

EmptyState.displayName = "EmptyState";
export default EmptyState;
