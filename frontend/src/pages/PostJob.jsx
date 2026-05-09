import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { formatApiError, useAuth } from "@/contexts/AuthContext";
import LocationPicker from "@/components/LocationPicker";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { usePincodeLookup } from "@/lib/usePincode";

const CATEGORIES = [
  { v: "construction", l: "🏗️ Construction" },
  { v: "farm",         l: "🌾 Agriculture / Farm" },
  { v: "electrical",   l: "⚡ Electrical" },
  { v: "cleaning",     l: "✨ Cleaning" },
  { v: "transport",    l: "🚛 Transport / Driving" },
  { v: "mechanical",   l: "🔧 Mechanical / Repair" },
  { v: "tailoring",    l: "✂️ Tailoring" },
  { v: "home",         l: "🏠 Home services" },
  { v: "other",        l: "📦 Other" },
];

export default function PostJob() {
  const nav = useNavigate();
  const { user } = useAuth();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [form, setForm] = useState({
    title: "",
    category: "construction",
    description: "",
    workers_needed: 1,
    daily_rate: 400,
    job_date: tomorrow,
    village: "",
    lat: null,
    lng: null,
  });
  const [loading, setLoading] = useState(false);
  const { pincode, setPincode, status: pinStatus, result: pinResult, errorMsg: pinError } = usePincodeLookup();
  // Keep pinResult accessible in submit via closure — it's already in scope above

  // Auto-fill village when pincode lookup succeeds
  useEffect(() => {
    if (pinResult) {
      setForm((f) => ({
        ...f,
        village: f.village || pinResult.village,
        address: { village: pinResult.name, district: pinResult.district, state: pinResult.state, pincode },
      }));
    }
  }, [pinResult, pincode]);

  if (user?.role === "worker") {
    return (
      <div className="p-12 text-center text-gray-500">
        Only customers can post jobs. Switch to a customer account.
      </div>
    );
  }

  const update = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value });

  const handleLocationChange = ({ lat, lng }) => {
    setForm((f) => ({ ...f, lat, lng }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.village.trim()) {
      toast.error("Please enter the village / area name.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        lat: form.lat || 22.9734,
        lng: form.lng || 78.6569,
        address: {
          village: form.village,
          district: pinResult?.district || "",
          state: pinResult?.state || "",
          pincode: pincode || "",
          post: null,
          block: null,
        },
      };
      const r = await api.post("/jobs", payload);
      if (window.posthog) {
        window.posthog.capture("job_posted", { category: form.category, rate: form.daily_rate });
      }
      toast.success("Job posted! Workers nearby will be notified.");
      nav(`/marketplace?job=${r.data.id}`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="post-job-page" className="max-w-2xl mx-auto px-6 py-10">
      <div className="kn-overline">Post a job</div>
      <h1 className="font-display text-4xl tracking-tight mt-2">What work do you need done?</h1>
      <p className="text-gray-600 mt-2">Workers will see this and respond within minutes.</p>

      <form onSubmit={submit} className="mt-8 space-y-5" data-testid="post-job-form">

        {/* Job title */}
        <div className="kn-card p-6">
          <Field label="Job title">
            <input
              data-testid="job-title"
              required
              value={form.title}
              onChange={update("title")}
              placeholder="e.g. Need 2 masons for boundary wall"
              className="kn-input"
            />
          </Field>
        </div>

        {/* Category */}
        <div className="kn-card p-6">
          <Field label="Category">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1" data-testid="job-categories">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c.v}
                  onClick={() => setForm({ ...form, category: c.v })}
                  data-testid={`cat-${c.v}`}
                  className={`px-3 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                    form.category === c.v
                      ? "border-[#3f37c9] bg-[#3f37c9] text-white"
                      : "border-gray-200 bg-gray-50 text-gray-700 hover:border-[#3f37c9] hover:text-[#3f37c9]"
                  }`}
                >
                  {c.l}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* Description */}
        <div className="kn-card p-6">
          <Field label="Description">
            <textarea
              data-testid="job-description"
              required
              value={form.description}
              onChange={update("description")}
              rows={3}
              placeholder="Briefly describe the work, hours, materials provided…"
              className="kn-input"
            />
          </Field>
        </div>

        {/* Workers / Rate / Date */}
        <div className="kn-card p-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Workers needed">
              <input
                data-testid="job-workers-needed"
                type="number"
                min={1}
                max={20}
                value={form.workers_needed}
                onChange={update("workers_needed")}
                className="kn-input"
              />
            </Field>
            <Field label="Daily rate (₹)">
              <input
                data-testid="job-rate"
                type="number"
                min={100}
                max={5000}
                value={form.daily_rate}
                onChange={update("daily_rate")}
                className="kn-input"
              />
            </Field>
            <Field label="Date">
              <input
                data-testid="job-date"
                type="date"
                value={form.job_date}
                onChange={update("job_date")}
                className="kn-input"
              />
            </Field>
          </div>
        </div>

        {/* Location — Pincode + Village */}
        <div className="kn-card p-6 space-y-4">

          {/* Pincode with auto-lookup */}
          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-gray-600 mb-1.5">
              Pincode <span className="text-red-500">*</span>
            </div>
            <div className="relative">
              <input
                data-testid="job-pincode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit pincode"
                className="kn-input pr-10"
              />
              {pinStatus === "loading" && (
                <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
              )}
              {pinStatus === "success" && (
                <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
              )}
              {pinStatus === "error" && (
                <AlertCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" />
              )}
            </div>

            {pinStatus === "success" && pinResult && (
              <div className="mt-2 flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: "#f0fdf4", color: "#15803d" }}>
                <CheckCircle2 size={12} />
                <span>✓ {pinResult.district} district · {pinResult.state}</span>
              </div>
            )}
            {pinStatus === "error" && (
              <p className="mt-1.5 text-xs text-red-500 font-medium">{pinError}</p>
            )}
          </div>

          {/* Village name — auto-filled, editable */}
          <Field label="Village / Area name">
            <input
              data-testid="job-village"
              required
              value={form.village}
              onChange={update("village")}
              placeholder={pinStatus === "loading" ? "Fetching from pincode…" : "e.g. Ramnagar, Pratapgarh"}
              className="kn-input"
            />
          </Field>

          {/* Map picker */}
          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-gray-600 mb-2">
              Pin job location on map <span className="font-normal text-gray-400 normal-case">(optional)</span>
            </div>
            <LocationPicker
              lat={form.lat}
              lng={form.lng}
              onChange={handleLocationChange}
              height="280px"
            />
          </div>
        </div>

        <button
          data-testid="post-job-submit"
          disabled={loading}
          className="btn-saffron w-full text-base disabled:opacity-60"
        >
          {loading ? "Posting…" : "Post job →"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider font-bold text-gray-600 mb-1.5">{label}</div>
      {children}
    </label>
  );
}
