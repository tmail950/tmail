"use client";

import { Email } from "@/types";
import { motion } from "framer-motion";
import { memo } from "react";

interface SidebarProps {
  emails: Email[];
  selectedEmailId: string | null;
  onSelectEmail: (id: string) => void;
}

// Helper to format "time ago" safely avoiding NaN
function getTimeAgo(dateStr: string | undefined): string {
  if (!dateStr) return 'Just now';
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Just now'; // Fallback if still invalid
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

export default memo(function Sidebar({ emails, selectedEmailId, onSelectEmail }: SidebarProps) {
  if (emails.length === 0) {
    return (
      <div className="h-full flex flex-col justify-center items-center p-6 text-gray-500">
        <p className="text-sm font-medium tracking-tight">Vault is empty</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto w-full custom-scrollbar bg-black/40 backdrop-blur-md">
      <div className="p-6 pb-2 border-b border-white/5">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4">Transmission Log ({emails.length})</h3>
      </div>
      <div className="flex flex-col p-3 space-y-3">
        {emails.map((email) => (
          <SidebarItem 
            key={email.id} 
            email={email} 
            isSelected={selectedEmailId === email.id} 
            onSelect={onSelectEmail} 
          />
        ))}
      </div>
    </div>
  );
});

const SidebarItem = memo(({ email, isSelected, onSelect }: { email: Email, isSelected: boolean, onSelect: (id: string) => void }) => {
  return (
    <button
      onClick={() => onSelect(email.id)}
      className={`text-left w-full p-5 rounded-2xl transition-all duration-500 relative overflow-hidden flex flex-col gap-2 oil-slick border border-transparent ${
        isSelected 
          ? "bg-white/10 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] scale-[1.02] z-10" 
          : "hover:bg-white/5 hover:border-white/5"
      }`}
    >
      {isSelected && (
        <motion.div 
          layoutId="active-indicator"
          className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[var(--color-brand-purple)] to-[var(--color-brand-pink)] shadow-[0_0_20px_var(--color-brand-pink)]"
        ></motion.div>
      )}
      
      <div className="flex justify-between items-start w-full">
        <span className={`font-black tracking-tight truncate max-w-[70%] ${isSelected ? 'text-white text-lg' : 'text-gray-300'}`}>
          {email.sender?.split('<')[0].trim() || "Unknown"}
        </span>
        <span className="text-[10px] text-gray-500 font-mono tracking-tighter uppercase whitespace-nowrap mt-1">
          {getTimeAgo(email.received_at)}
        </span>
      </div>
      
      <span className={`text-sm tracking-tight truncate w-full ${isSelected ? 'text-[var(--color-brand-pink)] font-bold' : 'text-gray-400'}`}>
        {email.subject || "(No Subject)"}
      </span>
      
      <p className="text-xs text-gray-600 line-clamp-1 leading-relaxed">
        {email.body_text?.substring(0, 60) || "Empty transmission content."}
      </p>
    </button>
  );
});
