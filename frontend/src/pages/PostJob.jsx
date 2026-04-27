import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { formatApiError, useAuth } from "@/contexts/AuthContext";

const CATEGORIES = [
  { v: "farm", l: "Farm work" },
  { v: "construction", l: "Construction" },
  { v: "home", l: "Home services" },
  { v: "other", l: "Other" },
];

const VILLAGE_PRESETS = [
  { name: "Pratapgarh", lat: 25.892, lng: 81.944 },
  { name: "Wardha", lat: 20.7453, lng: 78.6022 },
  { name: "Muzaffarpur", lat: 26.1209, lng: 85.3647 },
  { name: "Hoshangabad", lat: 22.744, lng: 77.7242 },
  { name: "Jodhpur", lat: 26.2389, lng: 73.0243 },
];

export default function PostJob() {
  const nav = useNavigate();
  const { user } = useAuth();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: "",
    category: "farm",
    description: "",
    workers_needed: 1,
    daily_rate: 400,
    job_date: tomorrow,
    village: VILLAGE_PRESETS[0].name,
    lat: VILLAGE_PRESETS[0].lat,
    lng: VILLAGE_PRESETS[0].lng,
  });
  const [loading, setLoading] = useState(false);

  if (user?.role === "worker") {
    return <div className="p-12 text-center text-gray-500">Only customers can post jobs. Switch to a customer account.</div>;
  }

  const update = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value });

  const pickVillage = (e) => {
    const v = VILLAGE_PRESETS.find((x) => x.name === e.target.value);
    if (v) setForm({ ...form, village: v.name, lat: v.lat, lng: v.lng });
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post("/jobs", form);
      toast.success("Job posted!");
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

      <form onSubmit={submit} className="mt-8 kn-card p-6 space-y-4" data-testid="post-job-form">
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

        <Field label="Category">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="job-categories">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.v}
                onClick={() => setForm({ ...form, category: c.v })}
                data-testid={`cat-${c.v}`}
                className={`px-3 py-2 rounded-lg text-sm font-bold transition ${
                  form.category === c.v
                    ? "bg-[#3f37c9] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {c.l}
              </button>
            ))}
          </div>
        </Field>

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

        <div className="grid sm:grid-cols-3 gap-3">
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

        <Field label="Village">
          <select data-testid="job-village" value={form.village} onChange={pickVillage} className="kn-input">
            {VILLAGE_PRESETS.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>

        <button data-testid="post-job-submit" disabled={loading} className="btn-saffron w-full disabled:opacity-60">
          {loading ? "Posting…" : "Post job"}
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
