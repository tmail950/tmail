"use client";

import { Email } from "@/types";
import { memo } from "react";

interface EmailViewerProps {
  email: Email | null;
  onClose?: () => void;
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
  
  let potential = raw.slice(bodyStart).trim();
  
  // If the body still looks like headers (e.g. multi-part), find next separator
  const headerPattern = /^(Received|ARC|DKIM|Authentication|Return-Path|X-|Content-Type|Content-Transfer|MIME|Message-ID|Delivered-To):/im;
  if (headerPattern.test(potential.substring(0, 300))) {
    const second = potential.indexOf('\n\n', 1);
    if (second !== -1) potential = potential.slice(second).trim();
  }
  
  return potential;
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

export default memo(function EmailViewer({ email, onClose }: EmailViewerProps) {
  if (!email) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8 bg-black/10 rounded-2xl border border-white/5">
        <p className="text-gray-500 font-medium">Select a transmission to decrypt reading view.</p>
      </div>
    );
  }

  const cleanBody = extractBody(email.body_html ? undefined : email.body_text);

  return (
    <div className="h-full w-full flex flex-col bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
      {/* Header Info */}
      <div className="p-6 sm:p-8 border-b border-white/10 z-10 relative bg-black/40 backdrop-blur-lg">
        <h2 className="text-2xl font-bold text-white tracking-tight mb-4 pr-14">
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
            <span className="text-gray-300 text-xs font-mono">{formatPST(email.received_at)}</span>
          </div>
        </div>
      </div>
      
      {/* Body Content - clean message only */}
      <div className="flex-1 p-8 sm:p-12 overflow-y-auto custom-scrollbar bg-black/40 z-10">
        {email.body_html ? (
          <iframe
            srcDoc={email.body_html}
            className="w-full h-full min-h-[400px] border-0 rounded-xl"
            sandbox="allow-same-origin"
            title="Email content"
          />
        ) : (
          <div className="text-gray-100 leading-relaxed whitespace-pre-wrap font-sans text-base max-w-4xl mx-auto selection:bg-[var(--color-brand-pink)] selection:text-white pb-20">
            {cleanBody || <span className="text-gray-600 italic font-medium">No decrypted content found in this transmission.</span>}
          </div>
        )}
      </div>
    </div>
  );
});
