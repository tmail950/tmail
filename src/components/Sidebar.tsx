"use client";

import { Email } from "@/types";
import { motion } from "framer-motion";
import { memo } from "react";

interface SidebarProps {
  emails: Email[];
  selectedEmailId: string | null;
  onSelectEmail: (id: string) => void;
}

// Pakistan Standard Time formatter (UTC+5)
function formatPSTime(dateStr: string | undefined): string {
  if (!dateStr) return 'Just now';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Just now';
  return date.toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Extracts a friendly sender name from complex email strings.
 * Handles "Name <email@domain.com>" and strips technical "bounces+" VERP prefixes.
 */
function getFriendlySender(sender: string | null | undefined): string {
  if (!sender) return "Unknown Sender";
  
  // 1. Try to extract Name from "Name <email@domain.com>"
  if (sender.includes('<') && sender.includes('>')) {
    const namePart = sender.split('<')[0].trim();
    if (namePart) {
      return namePart.replace(/^"|"$/g, ''); // Strip quotes if any
    }
  }

  // 2. Extract the actual email part
  const emailMatch = sender.match(/<?([^<>\s]+)>?/);
  const email = emailMatch ? emailMatch[1] : sender;

  // 3. Special Case: VERP / Bounce addresses (e.g., bounces+...=domain.com@...)
  if (email.toLowerCase().includes('bounces+')) {
    // Try to find the actual sender domain after '='
    const verpMatch = email.match(/=([^=@]+)@/);
    if (verpMatch) {
      return verpMatch[1]; // e.g. "qamify.net"
    }
    // Fallback to the main domain part
    const domainPart = email.split('@')[1];
    if (domainPart) return domainPart;
  }

  // 4. Fallback: Return the local part or the whole email if no @
  return email.split('@')[0] || email;
}

/** Returns a very short preview, skipping raw email header lines. */
function getBodyPreview(text: string | null | undefined): string {
  if (!text) return 'Empty transmission content.';
  const lines = text.split('\n').filter(line => {
    const stripped = line.trim();
    if (!stripped) return false;
    // Skip known header patterns
    return !/^(Received|ARC-|DKIM-|Authentication|Return-Path|X-|Content-Type|Content-Transfer|MIME|Message-ID|Delivered-To|From:|To:|Subject:|Date:)\s/i.test(stripped);
  });
  return lines.join(' ').substring(0, 70) || 'Transmission received.';
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
          className="absolute left-0 top-1 bottom-1 w-[3px] bg-[var(--color-brand-pink)] shadow-[4px_0_15px_rgba(0,210,255,0.6)] rounded-r-full"
        ></motion.div>
      )}
      
      <div className="flex justify-between items-start w-full">
        <span className={`font-black tracking-tight truncate max-w-[70%] ${isSelected ? 'text-white text-lg' : 'text-gray-300'}`}>
          {getFriendlySender(email.sender)}
        </span>
        <span className="text-[9px] text-gray-500 font-mono tracking-tighter whitespace-nowrap mt-1 text-right leading-tight">
          {formatPSTime(email.received_at)}
        </span>
      </div>
      
      <span className={`text-sm tracking-tight truncate w-full ${isSelected ? 'text-[var(--color-brand-pink)] font-bold' : 'text-gray-400'}`}>
        {email.subject || "(No Subject)"}
      </span>
      
      <p className="text-xs text-gray-600 line-clamp-1 leading-relaxed">
        {getBodyPreview(email.body_text)}
      </p>
    </button>
  );
});
