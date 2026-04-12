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
 * Decodes Quoted-Printable encoded strings (common in emails).
 * Handles soft line breaks (=\n) and hex escapes (=3D, =20 etc.)
 */
function decodeQuotedPrintable(str: string): string {
  if (!str) return '';
  return str
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-F]{2})/gi, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch (e) {
        return `=${hex}`;
      }
    });
}

/**
 * Strips email headers (Received, ARC, DKIM, MIME etc.) and returns
 * only the actual message body.
 */
function extractBody(raw: string | null | undefined): string {
  if (!raw) return '';
  
  // High-level Cleanup: If the worker already did its job, raw is clean.
  // We only run this logic for legacy raw-dump emails already in the DB.
  
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
  
  let content = (bodyStart === -1) ? raw.trim() : raw.slice(bodyStart).trim();
  
  // Handle older legacy multipart dumps if they still exist in DB
  if (content.includes('Content-Type: text/html')) {
    const htmlPart = content.split('Content-Type: text/html')[1]?.split(/\r?\n\r?\n/)[1]?.split('--')[0];
    if (htmlPart) content = htmlPart.trim();
  } else if (content.includes('Content-Type: text/plain')) {
    const textPart = content.split('Content-Type: text/plain')[1]?.split(/\r?\n\r?\n/)[1]?.split('--')[0];
    if (textPart) content = textPart.trim();
  }

  // Final sanitization of any remaining technical markers
  content = content
    .replace(/Content-(Type|Transfer-Encoding|Id|Description|Disposition): [^\n]+\n/gi, '')
    .replace(/;?\s?charset="?[a-zA-Z0-9-]+"?(;)?/gi, '') // Improved to catch leading semicolon
    .replace(/--[a-zA-Z0-9'()+ ,./:?=-]+(--)?(\s+)?/g, ''); // Improved boundary cleanup
  
  return decodeQuotedPrintable(content.trim());
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

  const cleanBodyText = extractBody(email.body_text);
  
  // More robust HTML detection: looks for any tag pattern like <div, <p, <br, <a etc.
  const isProbablyHtml = /<[a-z][\s\S]*>/i.test(cleanBodyText);
  let rawHtml = email.body_html ? decodeQuotedPrintable(email.body_html) : (isProbablyHtml ? cleanBodyText : null);

  // Inject minimal styling for the iframe, keeping it light/neutral
  const baseCss = `<style>
    body, html { background-color: white !important; color: #1a1a1a !important; font-family: system-ui, -apple-system, sans-serif !important; line-height: 1.6 !important; padding: 20px !important; }
    img { max-width: 100% !important; height: auto !important; }
    a { color: #0555FF !important; }
  </style>`;
  
  const displayHtml = rawHtml ? (rawHtml.includes('<head>') ? rawHtml.replace('<head>', `<head>${baseCss}`) : `${baseCss}${rawHtml}`) : null;

  return (
    <div className="h-full w-full flex flex-col bg-[#050505] rounded-[32px] border border-white/10 overflow-hidden shadow-2xl relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      {/* Control Bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 pt-6 sm:pt-8 pb-4 border-b border-white/5 z-20 bg-black/40 backdrop-blur-xl gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button 
            onClick={onClose}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all text-[10px] sm:text-[11px] font-black uppercase tracking-widest border border-white/10 shadow-lg active:scale-95 whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 h-4" />
            Back
          </button>
          
          <div className="h-4 w-[1px] bg-white/10 mx-1 sm:mx-2 hidden xs:block"></div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={onPrev}
              disabled={!hasPrev}
              className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/5"
              title="Previous Email"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 h-5" />
            </button>
            <button 
              onClick={onNext}
              disabled={!hasNext}
              className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/5"
              title="Next Email"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <button 
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-[var(--color-brand-pink)] transition-all text-[10px] sm:text-xs font-black uppercase tracking-widest border border-white/5 whitespace-nowrap"
            onClick={() => alert("Forwarding sequence not yet initialized.")}
          >
            <Forward className="w-3.5 h-3.5 sm:w-4 h-4" />
            <span className="hidden xs:inline">Forward</span>
          </button>
          <button 
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all border border-white/5 shadow-lg active:scale-95"
            title="Close View"
          >
            <X className="w-4 h-4 sm:w-5 h-5 font-black" />
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
        
        {/* Metadata removed as per user request */}
      </div>
      
      {/* Body Content - clean message only */}
      <div className="flex-1 p-4 sm:p-8 overflow-y-auto custom-scrollbar bg-black/50 z-10">
        <div className="max-w-4xl mx-auto">
          {displayHtml ? (
            <div className="bg-white rounded-3xl overflow-hidden min-h-[600px] shadow-2xl border border-white/10">
              <iframe
                srcDoc={displayHtml}
                className="w-full h-full min-h-[600px] border-0"
                sandbox="allow-same-origin"
                title="Email content"
              />
            </div>
          ) : (
            <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-2xl text-gray-900 leading-relaxed whitespace-pre-wrap font-sans text-lg selection:bg-[var(--color-brand-pink)] selection:text-white pb-20 border border-white/10">
              {cleanBodyText || <span className="text-gray-400 italic font-medium">No decrypted content found in this transmission.</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
