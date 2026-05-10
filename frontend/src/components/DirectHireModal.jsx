import { useState } from "react";
import { X, CheckCircle2, ChevronDown } from "lucide-react";
import api from "@/lib/api";
import { formatApiError } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CATEGORIES = [
  { v: "construction", l: "🏗️ Construction" },
  { v: "farm",         l: "🌾 Agriculture / Farm" },
  { v: "electrical",   l: "⚡ Electrical" },
  { v: "cleaning",     l: "✨ Cleaning" },
  { v: "transport",    l: "🚛 Transport / Driving" },
  { v: "mechanical",   l: "🔧 Mechanical / Repair" },
  { v: "tailoring",    l: "✂️ Tailoring" },
  { v: "home",         l: "🏠 Home Services" },
  { v: "other",        l: "📦 Other" },
];

export default function DirectHireModal({ isOpen, onClose, worker, onSuccess }) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [category, setCategory] = useState(
    worker?.structured_skills?.[0]?.category?.toLowerCase() || "construction"
  );
  const [dailyRate, setDailyRate] = useState(worker?.daily_rate || 400);
  const [jobDate, setJobDate]     = useState(tomorrow);
  const [note, setNote]           = useState("");
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);

  if (!isOpen || !worker) return null;

  const submit = async () => {
    if (!category || !dailyRate || !jobDate) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      await api.post("/bookings/direct", {
        worker_id: worker.id,
        category,
        daily_rate: Number(dailyRate),
        job_date: jobDate,
        note: note || undefined,
      });
      setDone(true);
      onSuccess?.();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDone(false);
    setNote("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="w-full bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-display text-xl">
              {done ? "Request Sent! 🎉" : `Book ${worker.name?.split(" ")[0]}`}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {done ? "Waiting for worker to accept" : `₹${worker.daily_rate}/day · ${worker.village || ""}`}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        {done ? (
          /* ── Success state ── */
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h3 className="font-display text-xl mb-2">Booking Request Sent</h3>
            <p className="text-gray-600 text-sm mb-2">
              <strong>{worker.name}</strong> will receive your request and must accept it to confirm.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm mt-4 mb-6">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-yellow-700 font-semibold">🟡 Awaiting worker acceptance</span>
            </div>
            <p className="text-xs text-gray-400 mb-6">
              You'll see the booking status in your dashboard. Once accepted, you can contact the worker directly.
            </p>
            <button onClick={handleClose} className="btn-saffron w-full">
              Go to Dashboard
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <div className="p-5 space-y-5">

            {/* Worker info strip */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-lg bg-[#f0f0ff] flex items-center justify-center text-[#3f37c9] font-bold text-lg flex-shrink-0">
                {worker.name?.[0]}
              </div>
              <div>
                <div className="font-bold text-sm">{worker.name}</div>
                <div className="text-xs text-gray-500">
                  {worker.structured_skills?.slice(0, 2).map(s => s.skill).join(" · ") || worker.skills?.slice(0, 2).join(" · ")}
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="font-bold text-green-700">₹{worker.daily_rate}</div>
                <div className="text-[10px] text-gray-400">/day</div>
              </div>
            </div>

            {/* Work type */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Work Type *
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="kn-input appearance-none pr-8"
                  style={{ fontSize: 16 }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.v} value={c.v}>{c.l}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Date + Rate */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Work Date *
                </label>
                <input
                  type="date"
                  value={jobDate}
                  min={tomorrow}
                  onChange={e => setJobDate(e.target.value)}
                  className="kn-input"
                  style={{ fontSize: 15 }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Daily Rate (₹) *
                </label>
                <input
                  type="number"
                  value={dailyRate}
                  min={100}
                  max={5000}
                  onChange={e => setDailyRate(e.target.value)}
                  className="kn-input"
                  style={{ fontSize: 15 }}
                />
              </div>
            </div>

            {/* Optional note */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Note to worker <span className="font-normal normal-case text-gray-400">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Need to fix bathroom tiles, materials provided"
                className="kn-input"
                style={{ fontSize: 15 }}
              />
            </div>

            {/* How it works note */}
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-blue-50 text-xs text-blue-700">
              <span className="text-base leading-none mt-0.5">ℹ️</span>
              <span>Worker needs to <strong>accept</strong> your request before the booking is confirmed. You'll see the status in your dashboard.</span>
            </div>

            {/* CTA */}
            <div className="pb-2">
              <button
                onClick={submit}
                disabled={loading}
                className="btn-saffron w-full text-base disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? "Sending request…" : "Send Hire Request →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
