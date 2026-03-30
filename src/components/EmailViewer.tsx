"use client";

import { Email } from "@/types";
import { memo } from "react";
import { ChevronLeft, ChevronRight, X, ArrowLeft, Forward, Mail } from 'lucide-react';

interface EmailViewerProps {
  email: Email | null;
  onClose?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

/**
 * Strips email headers (Received, ARC, DKIM, MIME etc.) and returns
 * only the actual message body.
 */
function extractBody(raw: string | null | undefined): string {
  if (!raw) return '';
  
  // Find the header/body separator (double newline)
  const doubleLf = raw.indexOf('\n\n');
  const doubleCrlf = raw.indexOf('\r\n\r\n');
  
  let bodyStart = -1;
  if (doubleLf !== -1 && doubleCrlf !== -1) {
    bodyStart = Math.min(doubleLf, doubleCrlf);
  } else if (doubleLf !== -1) {
    bodyStart = doubleLf;
  } else if (doubleCrlf !== -1) {
    bodyStart = doubleCrlf;
  }
  
  if (bodyStart === -1) return raw.trim();
  
  let content = raw.slice(bodyStart).trim();
  
  // Remove MIME headers and boundaries
  // This regex looks for --boundary, Content-Type, Content-Transfer-Encoding etc.
  content = content.replace(/--[a-zA-Z0-9'()+ ,./:?=-]+(--)?/g, '');
  content = content.replace(/Content-Type: [^\n]+\n/gi, '');
  content = content.replace(/Content-Transfer-Encoding: [^\n]+\n/gi, '');
  content = content.replace(/Content-Id: [^\n]+\n/gi, '');
  content = content.replace(/Content-Description: [^\n]+\n/gi, '');
  content = content.replace(/Content-Disposition: [^\n]+\n/gi, '');
  
  // Also common headers if they somehow end up in the body
  content = content.replace(/charset="?[a-zA-Z0-9-]+"?(;)?/gi, '');
  
  return content.trim();
}

/** Pakistan Standard Time (UTC+5) formatter with AM/PM and full date. */
function formatPST(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default memo(function EmailViewer({ 
  email, 
  onClose, 
  onNext, 
  onPrev,
  hasNext = false,
  hasPrev = false
}: EmailViewerProps) {
  if (!email) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8 bg-black/10 rounded-2xl border border-white/5">
        <p className="text-gray-500 font-medium">Select a transmission to decrypt reading view.</p>
      </div>
    );
  }

  const cleanBody = extractBody(email.body_html ? undefined : email.body_text);

  return (
    <div className="h-full w-full flex flex-col bg-[#050505] rounded-[32px] border border-white/10 overflow-hidden shadow-2xl relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      {/* Control Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 z-20 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all text-xs font-black uppercase tracking-widest border border-white/5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          <div className="h-4 w-[1px] bg-white/10 mx-2"></div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={onPrev}
              disabled={!hasPrev}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/5"
              title="Previous Email"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={onNext}
              disabled={!hasNext}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/5"
              title="Next Email"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-[var(--color-brand-pink)] transition-all text-xs font-black uppercase tracking-widest border border-white/5"
            onClick={() => alert("Forwarding sequence not yet initialized.")}
          >
            <Forward className="w-4 h-4" />
            Forward
          </button>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all border border-white/5"
            title="Close View"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Header Info */}
      <div className="p-8 sm:p-10 border-b border-white/5 z-10 relative bg-black/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--color-brand-pink)] to-[var(--color-brand-purple)] flex items-center justify-center p-2.5 shadow-[0_0_20px_rgba(255,18,177,0.3)]">
            <Mail className="w-full h-full text-white" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              {email.subject || "(No Subject)"}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Secure Transmission Decrypted</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-4 group">
              <span className="w-16 text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-gray-400 transition-colors">From</span>
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-sm font-bold text-gray-200">
                {email.sender || "Unknown Sender"}
              </div>
            </div>
            <div className="flex items-center gap-4 group">
              <span className="w-16 text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-gray-400 transition-colors">To</span>
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-sm font-medium text-gray-400">
                {email.recipient_address}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 font-mono text-xs text-gray-400">
              {formatPST(email.received_at)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Body Content - clean message only */}
      <div className="flex-1 p-8 sm:p-12 overflow-y-auto custom-scrollbar bg-black/10 z-10">
        <div className="max-w-4xl mx-auto">
          {email.body_html ? (
            <div className="bg-white rounded-3xl overflow-hidden min-h-[500px] shadow-2xl">
              <iframe
                srcDoc={email.body_html}
                className="w-full h-full min-h-[500px] border-0"
                sandbox="allow-same-origin"
                title="Email content"
              />
            </div>
          ) : (
            <div className="text-gray-200 leading-relaxed whitespace-pre-wrap font-sans text-lg selection:bg-[var(--color-brand-pink)] selection:text-white pb-20">
              {cleanBody || <span className="text-gray-600 italic font-medium">No decrypted content found in this transmission.</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
