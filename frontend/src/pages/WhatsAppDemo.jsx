import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { Send, MessageCircle } from "lucide-react";

const SESSION_KEY = "kn_wa_session";

function ensureSession() {
  let s = localStorage.getItem(SESSION_KEY);
  if (!s) {
    s = "wa-" + Math.random().toString(36).slice(2, 12);
    localStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

export default function WhatsAppDemo() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sessionId = useRef(ensureSession());
  const scrollRef = useRef(null);

  useEffect(() => {
    // Send empty message to get welcome
    send("hi", true);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (textOverride, hideUser) => {
    const text = textOverride ?? input;
    if (!text.trim()) return;
    setSending(true);
    if (!hideUser) setMessages((m) => [...m, { from: "user", text }]);
    setInput("");
    try {
      const r = await api.post("/whatsapp/message", {
        session_id: sessionId.current,
        message: text,
      });
      setMessages((m) => [...m, { from: "bot", text: r.data.reply }]);
    } catch {
      setMessages((m) => [...m, { from: "bot", text: "Sorry, something went wrong." }]);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    localStorage.removeItem(SESSION_KEY);
    sessionId.current = ensureSession();
    setMessages([]);
    setTimeout(() => send("hi", true), 200);
  };

  return (
    <div data-testid="whatsapp-demo-page" className="max-w-4xl mx-auto px-6 py-10">
      <div className="kn-overline">WhatsApp bot — simulated demo</div>
      <h1 className="font-display text-4xl tracking-tight mt-2">
        Book workers without an app.
      </h1>
      <p className="text-gray-600 mt-2 max-w-xl">
        This is exactly how the conversation flows on real WhatsApp. Try it: type <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">1</code> to book workers, or <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">menu</code> to restart.
      </p>

      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 kn-card overflow-hidden flex flex-col h-[640px]">
          <div className="px-5 py-4 border-b border-gray-200 bg-[#3f37c9] text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ff6b35] flex items-center justify-center font-display">K</div>
            <div>
              <div className="font-bold">KaamNow Bot</div>
              <div className="text-xs text-white/80">online · simulated WhatsApp</div>
            </div>
            <button data-testid="reset-chat" onClick={reset} className="ml-auto text-xs underline">Reset</button>
          </div>

          <div ref={scrollRef} data-testid="chat-messages" className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#f5f4ef]">
            {messages.map((m, i) => (
              <div key={i} className={m.from === "user" ? "flex" : "flex"}>
                <div className={m.from === "user" ? "bubble-user" : "bubble-bot"}>{m.text}</div>
              </div>
            ))}
            {sending && <div className="bubble-bot opacity-60">typing…</div>}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="border-t border-gray-200 p-3 flex gap-2 bg-white"
            data-testid="chat-form"
          >
            <input
              data-testid="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              className="kn-input"
            />
            <button data-testid="chat-send" disabled={sending} className="btn-saffron flex items-center gap-1">
              <Send size={14} />
            </button>
          </form>
        </div>

        <div className="kn-card p-6">
          <MessageCircle size={24} className="text-[#3f37c9]" />
          <h3 className="font-display text-xl mt-4">Why WhatsApp first?</h3>
          <ul className="mt-4 space-y-3 text-sm text-gray-700">
            <li>• 700M+ Indians on WhatsApp daily</li>
            <li>• No app download or learning curve</li>
            <li>• Voice notes work perfectly for low-literacy users</li>
            <li>• Works on the cheapest Android phones</li>
            <li>• Familiar trust — they already use it daily</li>
          </ul>
          <div className="mt-6 p-4 bg-[#fff7f3] border border-[#ffd4c2] rounded-lg text-xs text-[#993c1d]">
            <b>Coming soon:</b> Real WhatsApp Business API via Gupshup with Hindi voice in/out using Sarvam AI.
          </div>
        </div>
      </div>
    </div>
  );
}
