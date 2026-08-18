"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox, Send, FileText, AlertTriangle, Trash2, Archive,
  RefreshCw, ChevronLeft, Paperclip, Mail, LogOut, Search, X
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface OMsg {
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

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function parseCombo(raw: string) {
  const flat = raw.replace(/\r?\n/g, "").trim();
  const parts = flat.split("|").map((p) => p.trim());
  if (parts.length < 4) return null;
  return {
    email:        parts[0],
    clientId:     parts[parts.length - 1],
    refreshToken: parts.slice(2, -1).join("|"),
  };
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", hour12: true });
  return d.toLocaleDateString("en-PK", {
    timeZone: "Asia/Karachi", day: "numeric", month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

function fmtFull(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-PK", {
    timeZone: "Asia/Karachi", weekday: "short", day: "numeric",
    month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function senderName(s: string): string {
  if (!s) return "Unknown";
  const m = s.match(/^(.+?)\s*<[^>]+>$/);
  if (m?.[1]?.trim()) return m[1].trim();
  return s.split("@")[0] || s;
}
function senderInitial(s: string) { return senderName(s).charAt(0).toUpperCase() || "?"; }
function senderAddress(s: string): string {
  const m = s.match(/<([^>]+)>/);
  return m ? m[1] : s;
}

const COLORS = ["#0555FF","#00D2FF","#0033BD","#22c55e","#f59e0b","#8b5cf6","#ec4899","#ef4444"];
function avatarBg(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

const FOLDERS: { id: Folder; label: string; icon: React.ReactNode }[] = [
  { id: "inbox",   label: "Inbox",   icon: <Inbox size={14} /> },
  { id: "sent",    label: "Sent",    icon: <Send  size={14} /> },
  { id: "drafts",  label: "Drafts",  icon: <FileText size={14} /> },
  { id: "junk",    label: "Junk",    icon: <AlertTriangle size={14} /> },
  { id: "trash",   label: "Trash",   icon: <Trash2 size={14} /> },
  { id: "archive", label: "Archive", icon: <Archive size={14} /> },
];

/* ─── Connect Screen ─────────────────────────────────────────────────────── */
function ConnectScreen({ onConnect }: { onConnect: (email: string, rt: string, cid: string) => void }) {
  const [combo, setCombo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const p = parseCombo(combo);
    if (!p) { setError("Invalid format — use: email | password | refresh_token | client_id"); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/outlook/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ combo }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Connection failed");
      onConnect(d.email, p.refreshToken, p.clientId);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex-1 flex items-start justify-center py-10 px-2">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px]"
      >
        {/* gradient border card — matches pastore style adapted to dark */}
        <div className="relative">
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-[#0555FF] via-[#00D2FF]/40 to-transparent opacity-60 pointer-events-none" />
          <div className="relative bg-[#0a0a12] border border-white/[0.07] rounded-2xl p-8 shadow-2xl">

            {/* Logo bar — same as pastore */}
            <div className="flex items-center gap-3 mb-7">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0555FF] to-[#00D2FF] flex items-center justify-center shadow-lg">
                <Mail size={20} className="text-white" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-white leading-tight">Outlook Mailbox</p>
                <p className="text-[11px] text-gray-500">Connect via Microsoft token</p>
              </div>
            </div>

            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
              Full Combo String
            </label>
            <textarea
              rows={5}
              value={combo}
              onChange={e => setCombo(e.target.value)}
              placeholder={"example@outlook.com|password|M.C5_...refresh_token...|9e5f94bc-..."}
              className="w-full bg-[#050508] border border-white/[0.07] rounded-xl px-4 py-3 text-[13px] text-white placeholder-gray-700 font-mono resize-none focus:outline-none focus:border-[#0555FF]/50 transition-colors"
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(); }}
            />
            <p className="text-[10px] text-gray-600 mt-1.5 mb-5 font-mono">
              email | password | refresh_token | client_id
            </p>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={submit}
              disabled={loading || !combo.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0555FF] to-[#00D2FF] text-white text-[13px] font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Connecting…</>
                : <><Mail size={14} />Connect &amp; View Inbox</>}
            </button>

            {/* guest note — same copy as pastore */}
            <p className="text-[10px] text-gray-600 mt-4 text-center leading-relaxed">
              View inbox without saving anything. Tokens are used only to call Microsoft Graph API — nothing is stored.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── 3-Pane Mail App ────────────────────────────────────────────────────── */
function MailApp({ email, refreshToken, clientId, onDisconnect }: {
  email: string; refreshToken: string; clientId: string; onDisconnect: () => void;
}) {
  const [folder, setFolder] = useState<Folder>("inbox");
  const [messages, setMessages] = useState<OMsg[]>([]);
  const [filtered, setFiltered] = useState<OMsg[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openMsg, setOpenMsg] = useState<OMsg | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [listErr, setListErr] = useState("");
  const [msgErr, setMsgErr] = useState("");
  const [showReader, setShowReader] = useState(false); // mobile: show reader pane
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  /* ── search filter ── */
  useEffect(() => {
    if (!search.trim()) { setFiltered(messages); return; }
    const q = search.toLowerCase();
    setFiltered(messages.filter(m =>
      senderName(m.sender).toLowerCase().includes(q) ||
      m.subject.toLowerCase().includes(q) ||
      (m.body_text || "").toLowerCase().includes(q)
    ));
  }, [search, messages]);

  const loadFolder = useCallback(async (f: Folder) => {
    setLoadingList(true); setListErr(""); setMessages([]); setFiltered([]);
    setSelectedId(null); setOpenMsg(null); setSearch(""); setShowReader(false);
    try {
      const r = await fetch("/api/outlook/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken, clientId, folder: f }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load");
      if (mounted.current) { setMessages(d.messages || []); setFiltered(d.messages || []); }
    } catch (e: any) { if (mounted.current) setListErr(e.message); }
    finally { if (mounted.current) setLoadingList(false); }
  }, [refreshToken, clientId]);

  useEffect(() => { loadFolder("inbox"); }, [loadFolder]);

  const openMessage = useCallback(async (id: string) => {
    setSelectedId(id); setOpenMsg(null); setMsgErr(""); setLoadingMsg(true); setShowReader(true);
    // mark read locally
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
    setFiltered(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
    try {
      const r = await fetch("/api/outlook/message", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken, clientId, messageId: id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to fetch");
      if (mounted.current) setOpenMsg(d.message);
    } catch (e: any) { if (mounted.current) setMsgErr(e.message); }
    finally { if (mounted.current) setLoadingMsg(false); }
  }, [refreshToken, clientId]);

  const unreadCount = messages.filter(m => !m.isRead).length;

  return (
    /* full-height 3-pane layout — same structure as pastore.my.id */
    <div className="flex h-[calc(100vh-5.5rem)] overflow-hidden rounded-2xl border border-white/[0.07] shadow-2xl bg-[#080810]">

      {/* ── SIDEBAR ── */}
      <aside className={`w-52 flex-shrink-0 bg-[#06060e] border-r border-white/[0.06] flex flex-col py-4 overflow-y-auto
        ${showReader ? "hidden" : "flex"} md:flex`}>

        {/* account */}
        <div className="px-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0555FF] to-[#00D2FF] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {email.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white truncate">{email.split("@")[0]}</p>
              <p className="text-[9px] text-gray-600 truncate">@{email.split("@")[1]}</p>
            </div>
          </div>
        </div>

        {/* compose-style label */}
        <div className="px-4 mb-3">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-600">Folders</p>
        </div>

        {/* folder list */}
        <nav className="flex flex-col gap-0.5 px-2">
          {FOLDERS.map(f => (
            <button
              key={f.id}
              onClick={() => { setFolder(f.id); loadFolder(f.id); }}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all text-left group ${
                folder === f.id
                  ? "bg-[#0555FF]/20 text-[#00D2FF] border border-[#0555FF]/30"
                  : "text-gray-500 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={folder === f.id ? "text-[#00D2FF]" : "text-gray-600 group-hover:text-gray-400"}>{f.icon}</span>
                {f.label}
              </span>
              {f.id === "inbox" && unreadCount > 0 && (
                <span className="text-[9px] font-black bg-[#0555FF] text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* disconnect */}
        <div className="mt-auto px-2 pt-4 border-t border-white/[0.05] mx-2">
          <button
            onClick={onDisconnect}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
          >
            <LogOut size={12} /> Disconnect
          </button>
        </div>
      </aside>

      {/* ── MESSAGE LIST ── */}
      <div className={`w-[300px] flex-shrink-0 bg-[#080810] border-r border-white/[0.06] flex flex-col overflow-hidden
        ${showReader ? "hidden" : "flex"} md:flex`}>

        {/* list header */}
        <div className="px-4 py-3 border-b border-white/[0.05] flex-shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-black text-white uppercase tracking-wider">{FOLDERS.find(f => f.id === folder)?.label}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-gray-600 font-mono">{filtered.length} msgs</span>
              <button
                onClick={() => loadFolder(folder)} disabled={loadingList}
                className="p-1 rounded-lg hover:bg-white/[0.05] text-gray-600 hover:text-white transition-all disabled:opacity-40"
              >
                <RefreshCw size={11} className={loadingList ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* search */}
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search messages…"
              className="w-full bg-[#050508] border border-white/[0.06] rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-white placeholder-gray-700 focus:outline-none focus:border-[#0555FF]/40 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
                <X size={10} />
              </button>
            )}
          </div>
        </div>

        {/* message rows */}
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="w-6 h-6 border-2 border-[#0555FF]/30 border-t-[#0555FF] rounded-full animate-spin" />
              <span className="text-[11px] text-gray-600">Loading…</span>
            </div>
          ) : listErr ? (
            <div className="p-4">
              <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{listErr}</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-700">
              <Inbox size={24} />
              <span className="text-[11px]">No messages</span>
            </div>
          ) : (
            filtered.map((m, i) => {
              const bg = avatarBg(m.sender);
              const active = m.id === selectedId;
              return (
                <button
                  key={m.id}
                  onClick={() => openMessage(m.id)}
                  className={`w-full flex gap-3 px-3 py-3 border-b border-white/[0.04] cursor-pointer text-left transition-colors relative group
                    ${active ? "bg-[#0555FF]/10 border-l-2 border-l-[#0555FF]" : "hover:bg-white/[0.03]"}`}
                >
                  {/* avatar */}
                  <div className="w-[34px] h-[34px] rounded-full flex-shrink-0 flex items-center justify-center text-white text-[12px] font-bold mt-0.5"
                    style={{ background: bg }}>
                    {senderInitial(m.sender)}
                  </div>
                  {/* body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className={`text-[12px] truncate ${!m.isRead ? "font-bold text-white" : "font-medium text-gray-300"}`}>
                        {senderName(m.sender)}
                      </span>
                      <span className="text-[10px] text-gray-600 flex-shrink-0">{fmtDate(m.received_at)}</span>
                    </div>
                    <div className={`text-[11px] truncate mt-0.5 ${!m.isRead ? "font-semibold text-gray-200" : "text-gray-400"}`}>
                      {m.subject || "(No Subject)"}
                    </div>
                    <div className="text-[10px] text-gray-600 truncate mt-0.5">{m.body_text}</div>
                  </div>
                  {/* indicators */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0 self-center">
                    {!m.isRead && <span className="w-2 h-2 rounded-full bg-[#0555FF] block" />}
                    {m.hasAttachments && <Paperclip size={9} className="text-gray-600" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── READING PANE ── */}
      <div className={`flex-1 min-w-0 bg-[#050508] flex flex-col overflow-hidden
        ${showReader ? "flex" : "hidden"} md:flex`}>

        {/* mobile back button */}
        <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-white/[0.05] flex-shrink-0">
          <button onClick={() => setShowReader(false)}
            className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={14} /> Back
          </button>
        </div>

        {!selectedId ? (
          /* empty state — same as pastore */
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-700">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
              <Mail size={24} className="text-gray-700" />
            </div>
            <p className="text-[12px] font-medium">Select a message to read</p>
          </div>
        ) : loadingMsg ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-[#0555FF]/30 border-t-[#0555FF] rounded-full animate-spin" />
            <span className="text-[12px] text-gray-600">Loading message…</span>
          </div>
        ) : msgErr ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4 max-w-md">{msgErr}</div>
          </div>
        ) : openMsg ? (
          /* reader content — mirrors pastore.my.id reader layout */
          <div className="flex-1 overflow-y-auto">
            <div className="px-8 py-6">
              {/* subject */}
              <h2 className="text-[18px] font-bold text-white mb-4 leading-snug">
                {openMsg.subject || "(No Subject)"}
              </h2>

              {/* from row */}
              <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06] mb-5">
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[14px] font-bold"
                  style={{ background: avatarBg(openMsg.sender) }}
                >
                  {senderInitial(openMsg.sender)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white">
                    {senderName(openMsg.sender)}{" "}
                    <span className="text-gray-500 font-normal text-[11px]">&lt;{senderAddress(openMsg.sender)}&gt;</span>
                  </p>
                  {openMsg.recipient_address && (
                    <p className="text-[11px] text-gray-600 mt-0.5">to {openMsg.recipient_address}</p>
                  )}
                </div>
                <div className="text-[11px] text-gray-600 flex-shrink-0">{fmtFull(openMsg.received_at)}</div>
              </div>

              {/* attachments badge */}
              {openMsg.hasAttachments && (
                <div className="flex items-center gap-1.5 mb-4 text-[11px] text-[#00D2FF]">
                  <Paperclip size={11} /> Has attachments
                </div>
              )}
            </div>

            {/* body — iframe for HTML, pre for plain text */}
            <div className="px-8 pb-8">
              {openMsg.body_html ? (
                <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-white shadow-2xl">
                  <iframe
                    srcDoc={openMsg.body_html}
                    className="w-full border-0 min-h-[60vh]"
                    sandbox="allow-same-origin"
                    title="Email content"
                    onLoad={e => {
                      const f = e.currentTarget;
                      try { f.style.height = f.contentDocument!.body.scrollHeight + 32 + "px"; } catch {}
                    }}
                  />
                </div>
              ) : (
                <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6 text-[13px] text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">
                  {openMsg.body_text || <span className="text-gray-600 italic">No content.</span>}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */
export default function OutlookPage() {
  const [session, setSession] = useState<{ email: string; rt: string; cid: string } | null>(null);

  return (
    <AnimatePresence mode="wait">
      {!session ? (
        <motion.div key="connect" className="flex-1 flex flex-col"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <ConnectScreen onConnect={(e, rt, cid) => setSession({ email: e, rt, cid })} />
        </motion.div>
      ) : (
        <motion.div key="app" className="flex-1 flex flex-col"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <MailApp email={session.email} refreshToken={session.rt} clientId={session.cid}
            onDisconnect={() => setSession(null)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
