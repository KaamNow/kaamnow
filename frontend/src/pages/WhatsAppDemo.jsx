import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { Send, RotateCcw, Zap } from "lucide-react";

const SESSION_KEY = "kn_wa_session";

function ensureSession() {
  let s = localStorage.getItem(SESSION_KEY);
  if (!s) {
    s = "wa-" + Math.random().toString(36).slice(2, 12);
    localStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

/** Render WhatsApp-style markdown: *bold*, line breaks */
function BotText({ text }) {
  // Split on *bold* markers and render each segment
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
      {parts.map((p, i) =>
        p.startsWith("*") && p.endsWith("*")
          ? <strong key={i}>{p.slice(1, -1)}</strong>
          : p
      )}
    </span>
  );
}

const QUICK_REPLIES = [
  { label: "JOBS", hint: "Open jobs near me" },
  { label: "STATUS", hint: "My applications" },
  { label: "HELP", hint: "All commands" },
  { label: "MENU", hint: "Start over" },
];

const COMMAND_GUIDE = [
  { cmd: "JOBS", desc: "Open jobs near your area, nearest first" },
  { cmd: "JOBS 841219", desc: "Jobs in any pincode (temporary search)" },
  { cmd: "JOBS farm", desc: "Filter by category" },
  { cmd: "1 – 5", desc: "View job details from the list" },
  { cmd: "APPLY", desc: "Express interest in a job" },
  { cmd: "MORE", desc: "Next 5 jobs" },
  { cmd: "WITHDRAW", desc: "Cancel a pending application" },
  { cmd: "STATUS", desc: "Your active bookings" },
  { cmd: "PINCODE 841219", desc: "Save your home pincode" },
  { cmd: "HELP", desc: "See all commands" },
];

export default function WhatsAppDemo() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sessionId = useRef(ensureSession());
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    sendMsg("hi", true);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMsg = async (textOverride, hideUser) => {
    const text = (textOverride ?? input).trim();
    if (!text) return;
    setSending(true);
    if (!hideUser) setMessages((m) => [...m, { from: "user", text }]);
    setInput("");
    try {
      const r = await api.post("/whatsapp/message", { session_id: sessionId.current, message: text });
      setMessages((m) => [...m, { from: "bot", text: r.data.reply }]);
    } catch {
      setMessages((m) => [...m, { from: "bot", text: "Something went wrong. Try again." }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const reset = () => {
    localStorage.removeItem(SESSION_KEY);
    sessionId.current = ensureSession();
    setMessages([]);
    setTimeout(() => sendMsg("hi", true), 150);
  };

  const quickReply = (label) => {
    setMessages((m) => [...m, { from: "user", text: label }]);
    sendMsg(label, true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="kn-overline mb-1">Live bot preview</div>
        <h1 className="font-display text-4xl tracking-tight">
          Try the KaamNow bot
        </h1>
        <p className="text-gray-500 mt-2 text-sm max-w-lg">
          This is the real bot — same conversation your workers have on WhatsApp.
          Type a command or tap a quick reply below.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6 items-start">

        {/* ── Chat window ── */}
        <div className="lg:col-span-3 rounded-2xl overflow-hidden shadow-lg border border-gray-200 flex flex-col" style={{ height: 600 }}>

          {/* Chat header — WhatsApp green */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ background: "#075E54" }}>
            <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white font-bold text-lg shadow">
              K
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm leading-tight">KaamNow Worker Bot</div>
              <div className="text-white/70 text-xs">kaamnow.com · live demo</div>
            </div>
            <button
              onClick={reset}
              title="Reset chat"
              className="p-1.5 rounded-lg hover:bg-white/10 transition text-white/70 hover:text-white"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-2"
            style={{ background: "#ECE5DD" }}
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[78%] px-3 py-2 rounded-2xl shadow-sm text-sm"
                  style={
                    m.from === "user"
                      ? { background: "#DCF8C6", color: "#111", borderBottomRightRadius: 4 }
                      : { background: "#fff", color: "#111", borderBottomLeftRadius: 4 }
                  }
                >
                  {m.from === "bot" ? <BotText text={m.text} /> : m.text}
                  <div className="text-[10px] mt-1 text-right" style={{ color: m.from === "user" ? "#6e9e6e" : "#999" }}>
                    {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {m.from === "user" && <span className="ml-1" style={{ color: "#53bdeb" }}>✓✓</span>}
                  </div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-2.5 rounded-2xl shadow-sm text-sm text-gray-400" style={{ borderBottomLeftRadius: 4 }}>
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick replies */}
          <div className="flex gap-2 px-3 py-2 overflow-x-auto" style={{ background: "#ECE5DD", borderTop: "1px solid #d1c7bc" }}>
            {QUICK_REPLIES.map((q) => (
              <button
                key={q.label}
                onClick={() => quickReply(q.label)}
                disabled={sending}
                title={q.hint}
                className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border border-[#075E54] text-[#075E54] bg-white hover:bg-[#e8f5e9] transition disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); sendMsg(); }}
            className="flex gap-2 px-3 py-3 bg-[#F0F0F0] border-t border-gray-200"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              disabled={sending}
              className="flex-1 px-4 py-2.5 rounded-full text-sm bg-white border border-gray-200 outline-none focus:border-[#075E54] transition"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white transition disabled:opacity-40"
              style={{ background: "#075E54" }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>

        {/* ── Command guide ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="kn-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-[#ff6b35]" />
              <span className="font-bold text-sm">Worker Commands</span>
            </div>
            <div className="space-y-2.5">
              {COMMAND_GUIDE.map((c) => (
                <button
                  key={c.cmd}
                  onClick={() => { setInput(c.cmd); inputRef.current?.focus(); }}
                  className="w-full text-left group flex items-start gap-3 hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded-lg transition"
                >
                  <code className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-md bg-[#f0f0ff] text-[#3f37c9] group-hover:bg-[#3f37c9] group-hover:text-white transition">
                    {c.cmd}
                  </code>
                  <span className="text-xs text-gray-500 leading-relaxed pt-0.5">{c.desc}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">Tap any command to paste it in the chat.</p>
          </div>

          <div className="kn-card p-5">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Live on real WhatsApp</div>
            <p className="text-sm text-gray-600 leading-relaxed">
              This preview runs the same backend your workers use on WhatsApp. Messages sent from registered numbers reach real jobs and bookings in the platform.
            </p>
            <a
              href="https://wa.me/917834811114"
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center gap-2 text-sm font-bold text-[#075E54] hover:underline"
            >
              <span className="w-5 h-5 rounded-full bg-[#25D366] flex items-center justify-center text-white text-xs">W</span>
              Message on WhatsApp →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
