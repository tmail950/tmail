"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Inbox, Send, FileText, AlertTriangle, Trash2, Archive, RefreshCw, X, ChevronLeft, ChevronRight, Paperclip, Eye } from "lucide-react";

/* ─── Types ────────────────────────────────────────────────────────────────── */
interface OutlookMessage {
  id: string;
  subject: string;
  sender: string;
  recipient_address: string;
  body_text: string | null;
  body_html: string | null;
  received_at: string;
  isRead: boolean;
  hasAttachments: boolean;
}

type Folder = "inbox" | "sent" | "drafts" | "junk" | "trash" | "archive";

/* ─── Helpers ────────────────────────────────────────────────────────────────*/
function parseCombo(combo: string): { email: string; clientId: string; refreshToken: string } | null {
  const flat = combo.replace(/\r?\n/g, "").trim();
  const parts = flat.split("|").map((p) => p.trim());
  if (parts.length < 4) return null;
  return {
    email: parts[0],
    clientId: parts[parts.length - 1],
    refreshToken: parts.slice(2, -1).join("|"),
  };
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", hour12: true });
  return d.toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", day: "numeric", month: "short", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

function getSenderName(sender: string): string {
  if (!sender) return "Unknown";
  const match = sender.match(/^(.+?)\s*<[^>]+>$/);
  if (match && match[1].trim()) return match[1].trim().split(/\s+/)[0];
  return sender.split("@")[0] || sender;
}

function getSenderInitial(sender: string): string {
  return getSenderName(sender).charAt(0).toUpperCase() || "?";
}

const AVATAR_COLORS = ["#0555FF","#00D2FF","#0033BD","#22c55e","#f59e0b","#8b5cf6","#ec4899","#06b6d4"];
function avatarColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const FOLDERS: { id: Folder; label: string; icon: React.ReactNode }[] = [
  { id: "inbox",   label: "Inbox",   icon: <Inbox   size={15} /> },
  { id: "sent",    label: "Sent",    icon: <Send    size={15} /> },
  { id: "drafts",  label: "Drafts",  icon: <FileText size={15} /> },
  { id: "junk",    label: "Junk",    icon: <AlertTriangle size={15} /> },
  { id: "trash",   label: "Trash",   icon: <Trash2  size={15} /> },
  { id: "archive", label: "Archive", icon: <Archive size={15} /> },
];

/* ─── Connect screen ────────────────────────────────────────────────────────*/
function ConnectScreen({ onConnect }: { onConnect: (email: string, refreshToken: string, clientId: string) => void }) {
  const [combo, setCombo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConnect() {
    const parsed = parseCombo(combo);
    if (!parsed) { setError("Invalid format. Use: email|password|refresh_token|client_id"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/outlook/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ combo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");
      onConnect(data.email, parsed.refreshToken, parsed.clientId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        {/* Glow ring */}
        <div className="relative mb-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#0555FF] via-[#00D2FF] to-[#0033BD] rounded-[32px] blur-2xl opacity-30 animate-pulse-glow pointer-events-none" />
          <div className="relative glass-card rounded-[28px] p-8 border border-white/10">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0555FF] to-[#00D2FF] flex items-center justify-center shadow-lg">
                <Mail size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Outlook Inbox</h1>
                <p className="text-xs text-gray-400 mt-0.5">Connect via Microsoft refresh token</p>
              </div>
            </div>

            {/* Combo input */}
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
              Credential Combo
            </label>
            <textarea
              rows={5}
              value={combo}
              onChange={(e) => setCombo(e.target.value)}
              placeholder={"example@outlook.com|password|M.C5_...refresh_token...|9e5f94bc-..."}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 font-mono resize-none focus:outline-none focus:border-[#0555FF]/60 focus:bg-black/60 transition-all"
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleConnect(); }}
            />
            <p className="text-[10px] text-gray-600 mt-1.5 mb-5">
              Format: <span className="font-mono text-gray-500">email | password | refresh_token | client_id</span>
            </p>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Connect button */}
            <button
              onClick={handleConnect}
              disabled={loading || !combo.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0555FF] to-[#00D2FF] text-white font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connecting…</>
              ) : (
                <><Mail size={16} /> Connect & View Inbox</>
              )}
            </button>

            <p className="text-[10px] text-gray-600 mt-4 text-center">
              Credentials are used only to fetch emails from Microsoft Graph API. Nothing is stored.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Email viewer modal ─────────────────────────────────────────────────────*/
function EmailModal({
  message, onClose, onNext, onPrev, hasNext, hasPrev,
}: {
  message: OutlookMessage; onClose: () => void;
  onNext?: () => void; onPrev?: () => void;
  hasNext?: boolean; hasPrev?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-2xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 40 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-5xl h-full sm:h-[92vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-[#0555FF] via-[#00D2FF] to-[#0033BD] rounded-[40px] blur-2xl opacity-40 animate-pulse-glow pointer-events-none" />
        <div className="w-full h-full bg-[#050505]/95 rounded-[40px] relative overflow-hidden border border-white/10 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-white/5">
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-base font-semibold text-white truncate">{message.subject || "(No Subject)"}</div>
              <div className="text-xs text-gray-500 mt-0.5 truncate">{message.sender}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onPrev} disabled={!hasPrev} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button onClick={onNext} disabled={!hasNext} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Meta */}
          <div className="px-6 py-3 border-b border-white/5 flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00D2FF] animate-pulse" />
              {formatDate(message.received_at)}
            </span>
            {message.hasAttachments && (
              <span className="flex items-center gap-1.5 text-[#00D2FF]">
                <Paperclip size={11} /> Has attachments
              </span>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {message.body_html ? (
              <div className="bg-white rounded-[24px] overflow-hidden min-h-[500px] shadow-2xl border border-white/5">
                <iframe
                  srcDoc={message.body_html}
                  className="w-full min-h-[500px] h-full border-0"
                  sandbox="allow-same-origin"
                  title="Email body"
                />
              </div>
            ) : (
              <div className="bg-white p-8 sm:p-12 rounded-[28px] shadow-2xl text-gray-900 leading-relaxed whitespace-pre-wrap font-sans text-base">
                {message.body_text || <span className="text-gray-400 italic">No content found.</span>}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Inbox view ─────────────────────────────────────────────────────────────*/
function InboxView({
  email, refreshToken, clientId, onDisconnect,
}: {
  email: string; refreshToken: string; clientId: string; onDisconnect: () => void;
}) {
  const [folder, setFolder] = useState<Folder>("inbox");
  const [messages, setMessages] = useState<OutlookMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fullMessage, setFullMessage] = useState<OutlookMessage | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  const loadFolder = useCallback(async (f: Folder) => {
    setLoadingList(true); setError(""); setMessages([]); setSelectedId(null); setFullMessage(null);
    try {
      const res = await fetch("/api/outlook/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken, clientId, folder: f }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load messages");
      if (mountedRef.current) setMessages(data.messages || []);
    } catch (e: any) {
      if (mountedRef.current) setError(e.message);
    } finally {
      if (mountedRef.current) setLoadingList(false);
    }
  }, [refreshToken, clientId]);

  useEffect(() => { loadFolder("inbox"); }, [loadFolder]);

  const openMessage = useCallback(async (id: string) => {
    setSelectedId(id); setLoadingMsg(true); setFullMessage(null);
    try {
      const res = await fetch("/api/outlook/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken, clientId, messageId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load message");
      if (mountedRef.current) setFullMessage(data.message);
    } catch (e: any) {
      if (mountedRef.current) { setError(e.message); setSelectedId(null); }
    } finally {
      if (mountedRef.current) setLoadingMsg(false);
    }
  }, [refreshToken, clientId]);

  const selectedIndex = messages.findIndex((m) => m.id === selectedId);

  return (
    <div className="flex-1 flex flex-col min-h-0 pb-8">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0555FF] to-[#00D2FF] flex items-center justify-center">
            <Mail size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">{email}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Outlook • Microsoft Graph</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadFolder(folder)}
            disabled={loadingList}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 transition-all disabled:opacity-40"
          >
            <RefreshCw size={12} className={loadingList ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={onDisconnect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs text-red-400 transition-all"
          >
            <X size={12} /> Disconnect
          </button>
        </div>
      </div>

      {/* Folder tabs */}
      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        {FOLDERS.map((f) => (
          <button
            key={f.id}
            onClick={() => { setFolder(f.id); loadFolder(f.id); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              folder === f.id
                ? "bg-gradient-to-r from-[#0555FF] to-[#00D2FF] text-white border-transparent shadow-lg"
                : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-white/10"
            }`}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between"
          >
            <span>{error}</span>
            <button onClick={() => setError("")}><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message list */}
      <div className="glass-card rounded-[24px] border border-white/10 overflow-hidden flex-1 min-h-0">
        {loadingList ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-2 border-[#0555FF]/30 border-t-[#0555FF] rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Loading messages…</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-600">
            <Inbox size={32} />
            <span className="text-sm">No messages in {folder}</span>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {messages.map((msg, idx) => {
              const initLetter = getSenderInitial(msg.sender);
              const bgColor = avatarColor(msg.sender);
              return (
                <motion.button
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  onClick={() => openMessage(msg.id)}
                  className={`w-full flex items-start gap-4 px-5 py-4 hover:bg-white/5 text-left transition-colors group ${
                    !msg.isRead ? "bg-white/[0.02]" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-sm font-bold mt-0.5"
                    style={{ background: bgColor }}
                  >
                    {initLetter}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${!msg.isRead ? "font-semibold text-white" : "text-gray-300"}`}>
                        {getSenderName(msg.sender)}
                      </span>
                      <span className="text-[10px] text-gray-600 flex-shrink-0 group-hover:text-gray-400 transition-colors">
                        {formatDate(msg.received_at)}
                      </span>
                    </div>
                    <div className={`text-xs truncate mt-0.5 ${!msg.isRead ? "text-gray-300" : "text-gray-500"}`}>
                      {msg.subject || "(No Subject)"}
                    </div>
                    <div className="text-[11px] text-gray-600 truncate mt-0.5">{msg.body_text}</div>
                  </div>

                  {/* Indicators */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {!msg.isRead && <div className="w-2 h-2 rounded-full bg-[#0555FF]" />}
                    {msg.hasAttachments && <Paperclip size={10} className="text-gray-600" />}
                    <Eye size={12} className="text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Loading spinner overlay for message fetch */}
      <AnimatePresence>
        {loadingMsg && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="glass-card rounded-2xl px-8 py-6 flex flex-col items-center gap-3 border border-white/10">
              <div className="w-8 h-8 border-2 border-[#0555FF]/30 border-t-[#0555FF] rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Opening message…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email modal */}
      <AnimatePresence>
        {fullMessage && (
          <EmailModal
            message={fullMessage}
            onClose={() => { setFullMessage(null); setSelectedId(null); }}
            onNext={() => { if (selectedIndex < messages.length - 1) openMessage(messages[selectedIndex + 1].id); }}
            onPrev={() => { if (selectedIndex > 0) openMessage(messages[selectedIndex - 1].id); }}
            hasNext={selectedIndex < messages.length - 1}
            hasPrev={selectedIndex > 0}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────*/
export default function OutlookPage() {
  const [session, setSession] = useState<{ email: string; refreshToken: string; clientId: string } | null>(null);

  return (
    <>
      <AnimatePresence mode="wait">
        {!session ? (
          <motion.div key="connect" className="flex-1 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ConnectScreen
              onConnect={(email, refreshToken, clientId) => setSession({ email, refreshToken, clientId })}
            />
          </motion.div>
        ) : (
          <motion.div key="inbox" className="flex-1 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <InboxView
              email={session.email}
              refreshToken={session.refreshToken}
              clientId={session.clientId}
              onDisconnect={() => setSession(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
