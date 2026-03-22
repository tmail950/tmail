"use client";

import { Email } from "@/types";
import { memo } from "react";

interface EmailViewerProps {
  email: Email | null;
}

export default memo(function EmailViewer({ email }: EmailViewerProps) {
  if (!email) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8 bg-black/10 rounded-2xl border border-white/5">
        <p className="text-gray-500 font-medium">Select a transmission to decrypt reading view.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <svg fill="none" viewBox="0 0 24 24" stroke="url(#gradient-lines)" className="w-64 h-64 rotate-[15deg]">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 2L2 22h20L12 2zm0 8l-4 8h8l-4-8z" />
          <defs>
            <linearGradient id="gradient-lines" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#7d12ff" />
              <stop offset="50%" stopColor="#ff12b1" />
              <stop offset="100%" stopColor="#ff8a12" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {/* Header Info */}
      <div className="p-6 sm:p-8 border-b border-white/10 z-10 relative bg-black/40 backdrop-blur-lg">
        <h2 className="text-2xl font-bold text-white tracking-tight mb-4">
          {email.subject || "(No Subject)"}
        </h2>
        
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-mono text-xs uppercase">From:</span>
              <span className="text-white font-medium">{email.sender || "Unknown Sender"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-mono text-xs uppercase">To:</span>
              <span className="text-gray-300 font-medium">{email.recipient_address}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-center bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-[--color-brand-pink] shadow-[0_0_8px_var(--color-brand-pink)]"></span>
            <span className="text-gray-300 text-xs font-mono">{new Date(email.received_at).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
      
      {/* Body Content */}
      <div className="flex-1 p-8 sm:p-12 overflow-y-auto custom-scrollbar bg-black/40 z-10">
        <div className="text-gray-100 leading-relaxed whitespace-pre-wrap font-sans text-lg max-w-4xl mx-auto selection:bg-[var(--color-brand-pink)] selection:text-white pb-20">
          {email.body_text || <span className="text-gray-600 italic font-medium">No decrypted content found in this transmission.</span>}
        </div>
      </div>
    </div>
  );
});
