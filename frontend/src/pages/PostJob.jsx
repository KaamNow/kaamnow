import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { formatApiError, useAuth } from "@/contexts/AuthContext";
import { usePincodeLookup } from "@/lib/usePincode";
import {
  ChevronLeft, ChevronRight, Check, Loader2,
  CheckCircle2, AlertCircle, TrendingUp, AlertTriangle, Edit3,
} from "lucide-react";

/* ── Category config ─────────────────────────────────────────────────── */
const CATEGORIES = [
  { v: "construction", icon: "🏗️", label: "Construction" },
  { v: "farm",         icon: "🌾", label: "Agriculture" },
  { v: "electrical",   icon: "⚡", label: "Electrical" },
  { v: "cleaning",     icon: "✨", label: "Cleaning" },
  { v: "transport",    icon: "🚛", label: "Transport" },
  { v: "mechanical",   icon: "🔧", label: "Mechanical" },
  { v: "tailoring",    icon: "✂️", label: "Tailoring" },
  { v: "home",         icon: "🏠", label: "Home Services" },
  { v: "other",        icon: "📦", label: "Other" },
];

const SKILLS = {
  construction: ["Mason", "Helper", "Painter", "Tiles worker", "Bar bender", "Shuttering carpenter", "Plumber", "Welder"],
  farm:         ["Harvester", "Farm helper", "Tractor driver", "Irrigation worker", "Pesticide spraying", "Weeder"],
  electrical:   ["House wiring", "Industrial electrician", "AC technician", "Motor repair", "Solar panel"],
  cleaning:     ["House cleaning", "Office cleaning", "Deep cleaning", "Bathroom cleaning", "Kitchen cleaning"],
  transport:    ["Truck driver", "Mini truck driver", "Loader", "Delivery helper", "Auto driver"],
  mechanical:   ["Auto repair", "Pump repair", "Welding", "Diesel mechanic", "Generator repair"],
  tailoring:    ["Blouse stitching", "Alteration", "Machine operator", "Salwar kameez", "Embroidery"],
  home:         ["Cook", "Housekeeping", "Babysitter", "Security guard", "Gardener", "Caretaker"],
  other:        [],
};

/* ── Market rate intelligence ────────────────────────────────────────── */
const RATES = {
  mason: [600, 900], helper: [350, 500], painter: [450, 700], plumber: [500, 800],
  welder: [600, 900], "tiles worker": [600, 850], "bar bender": [550, 800],
  "shuttering carpenter": [600, 850], harvester: [300, 450], "farm helper": [280, 400],
  "tractor driver": [700, 1000], "irrigation worker": [300, 400], "pesticide spraying": [350, 500],
  weeder: [280, 380], "house wiring": [600, 900], "industrial electrician": [700, 1100],
  "ac technician": [700, 1100], "motor repair": [500, 800], "house cleaning": [300, 500],
  "office cleaning": [350, 550], "deep cleaning": [400, 650], "bathroom cleaning": [250, 400],
  "truck driver": [800, 1200], "mini truck driver": [600, 900], loader: [350, 500],
  "delivery helper": [400, 600], "auto repair": [500, 800], "pump repair": [450, 700],
  welding: [550, 850], cook: [400, 700], housekeeping: [300, 500], babysitter: [350, 550],
  "security guard": [400, 700], gardener: [300, 500],
};

function getRateInsight(skill, rate) {
  if (!skill || !rate) return null;
  const key = skill.toLowerCase();
  const range = RATES[key];
  if (!range) return null;
  const [low, high] = range;
  if (rate < low) return { type: "low", msg: `Market rate is ₹${low}–₹${high}/day. Low wages may reduce responses.` };
  if (rate > high) return { type: "high", msg: `Above market rate (₹${low}–₹${high}/day). You'll attract workers fast!` };
  return { type: "good", msg: `Good rate! Market average is ₹${low}–₹${high}/day.` };
}

/* ── Auto description ────────────────────────────────────────────────── */
function generateDesc(form) {
  const cat = CATEGORIES.find(c => c.v === form.category);
  const skill = form.skill || (cat?.label || "worker");
  const n = form.workers_needed || 1;
  const date = form.job_date
    ? new Date(form.job_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long" })
    : "soon";
  const loc = form.village ? form.village : form.pincode ? `pincode ${form.pincode} area` : "nearby area";
  const rate = form.daily_rate ? `₹${form.daily_rate}` : "competitive";
  return `Need ${n} experienced ${skill}${n > 1 ? "s" : ""} for ${cat?.label.toLowerCase() || "work"} on ${date} near ${loc}. Daily wage ${rate}/day.`;
}

/* ── Progress bar ────────────────────────────────────────────────────── */
function ProgressBar({ step, total = 4 }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
          style={{ background: i < step ? "#3f37c9" : "#e5e7eb" }} />
      ))}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */
export default function PostJob() {
  const nav = useNavigate();
  const { user } = useAuth();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);

  const [form, setForm] = useState({
    category: null,
    categoryLabel: null,
    skill: null,
    customSkill: "",
    workers_needed: 1,
    daily_rate: "",
    job_date: tomorrow,
    pincode: "",
    village: "",
    description: "",
  });

  const { pincode: pcValue, setPincode, status: pinStatus, result: pinResult, errorMsg: pinError } = usePincodeLookup();

  // Sync pincode hook → form
  useEffect(() => {
    setForm(f => ({ ...f, pincode: pcValue }));
  }, [pcValue]);

  // Auto-fill village from pincode lookup — always overwrite on new lookup
  useEffect(() => {
    if (pinResult?.name) {
      setForm(f => ({ ...f, village: pinResult.name }));
    }
  }, [pinResult]);

  // Regenerate description on any field change
  useEffect(() => {
    if (!editingDesc) {
      setForm(f => ({ ...f, description: generateDesc(f) }));
    }
  }, [form.category, form.skill, form.workers_needed, form.daily_rate, form.job_date, form.village, form.pincode, editingDesc]);

  const rateInsight = getRateInsight(form.skill, form.daily_rate ? Number(form.daily_rate) : null);

  /* ── Navigation ── */
  const canNext = () => {
    if (step === 1) return !!form.category;
    if (step === 2) return !!(form.skill || form.customSkill);
    if (step === 3) {
      return form.workers_needed >= 1 && form.daily_rate >= 100 && form.job_date && form.pincode.length === 6;
    }
    return true;
  };

  const next = () => { if (canNext()) setStep(s => Math.min(s + 1, 4)); };
  const back = () => setStep(s => Math.max(s - 1, 1));

  const selectCategory = (cat) => {
    setForm(f => ({ ...f, category: cat.v, categoryLabel: cat.label, skill: null, customSkill: "" }));
    setTimeout(() => setStep(2), 220);
  };

  const selectSkill = (sk) => {
    setForm(f => ({ ...f, skill: sk, customSkill: "" }));
  };

  /* ── Submit ── */
  const submit = async () => {
    setLoading(true);
    try {
      const effectiveSkill = form.skill || form.customSkill;
      const payload = {
        title: `Need ${form.workers_needed} ${effectiveSkill} — ${form.categoryLabel}`,
        category: form.category,
        description: form.description,
        workers_needed: Number(form.workers_needed),
        daily_rate: Number(form.daily_rate),
        job_date: form.job_date,
        village: form.village,
        lat: 22.9734,
        lng: 78.6569,
        address: {
          village: form.village,
          district: pinResult?.district || "",
          state: pinResult?.state || "",
          pincode: form.pincode,
          post: null, block: null,
        },
        required_skills: [{ category: form.categoryLabel, skill: effectiveSkill }],
      };
      const r = await api.post("/jobs", payload);
      if (window.posthog) window.posthog.capture("job_posted", { category: form.category });
      toast.success("Job posted! Workers will be notified.");
      nav(`/marketplace?job=${r.data.id}`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ["Category", "Skill", "Details", "Review"];

  return (
    <div className="min-h-screen bg-[#fcfbf9]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-2">
            {step > 1 && (
              <button onClick={back} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <ChevronLeft size={18} />
              </button>
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Step {step} of 4 — {stepLabels[step - 1]}
                </span>
                <span className="text-xs text-gray-400">{Math.round((step / 4) * 100)}%</span>
              </div>
              <ProgressBar step={step} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-32">

        {/* ── STEP 1: Category ── */}
        {step === 1 && (
          <div>
            <h1 className="font-display text-2xl mb-1">What type of work?</h1>
            <p className="text-sm text-gray-500 mb-6">Select the category that fits your job.</p>
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.v}
                  onClick={() => selectCategory(cat)}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 active:scale-95"
                  style={{
                    borderColor: form.category === cat.v ? "#3f37c9" : "#e5e7eb",
                    background: form.category === cat.v ? "#f0f0ff" : "white",
                    boxShadow: form.category === cat.v ? "0 0 0 3px rgba(63,55,201,0.12)" : "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-xs font-bold text-center leading-tight" style={{ color: form.category === cat.v ? "#3f37c9" : "#374151" }}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Skill ── */}
        {step === 2 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{CATEGORIES.find(c => c.v === form.category)?.icon}</span>
              <h1 className="font-display text-2xl">{form.categoryLabel}</h1>
            </div>
            <p className="text-sm text-gray-500 mb-6">What specific skill do you need?</p>

            <div className="grid grid-cols-2 gap-2.5">
              {(SKILLS[form.category] || []).map(sk => (
                <button
                  key={sk}
                  onClick={() => selectSkill(sk)}
                  className="flex items-center justify-between px-4 py-3.5 rounded-xl border-2 text-sm font-semibold transition-all duration-150 active:scale-95 text-left"
                  style={{
                    borderColor: form.skill === sk ? "#3f37c9" : "#e5e7eb",
                    background: form.skill === sk ? "#f0f0ff" : "white",
                    color: form.skill === sk ? "#3f37c9" : "#374151",
                  }}
                >
                  {sk}
                  {form.skill === sk && <Check size={15} style={{ color: "#3f37c9", flexShrink: 0 }} />}
                </button>
              ))}

              {/* Other option */}
              <button
                onClick={() => selectSkill("other")}
                className="flex items-center justify-between px-4 py-3.5 rounded-xl border-2 text-sm font-semibold transition-all border-dashed col-span-2"
                style={{
                  borderColor: form.skill === "other" ? "#ff6b35" : "#e5e7eb",
                  background: form.skill === "other" ? "#fff4f0" : "white",
                  color: form.skill === "other" ? "#ff6b35" : "#9ca3af",
                }}
              >
                Other (type your own)
                {form.skill === "other" && <Check size={15} />}
              </button>
            </div>

            {form.skill === "other" && (
              <input
                autoFocus
                className="kn-input mt-3"
                placeholder="Describe the skill (e.g. Roof tiling)"
                value={form.customSkill}
                onChange={e => setForm(f => ({ ...f, customSkill: e.target.value }))}
              />
            )}
          </div>
        )}

        {/* ── STEP 3: Details ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h1 className="font-display text-2xl mb-1">Job details</h1>
              <p className="text-sm text-gray-500">Almost done — just a few more details.</p>
            </div>

            {/* Workers needed */}
            <div className="kn-card p-5">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Workers needed *</div>
              <div className="flex items-center gap-4">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setForm(f => ({ ...f, workers_needed: n }))}
                    className="w-11 h-11 rounded-xl font-bold text-sm transition-all border-2"
                    style={{
                      borderColor: form.workers_needed === n ? "#3f37c9" : "#e5e7eb",
                      background: form.workers_needed === n ? "#3f37c9" : "white",
                      color: form.workers_needed === n ? "white" : "#374151",
                    }}
                  >{n}</button>
                ))}
                <input
                  type="number" min={1} max={50}
                  value={form.workers_needed > 5 ? form.workers_needed : ""}
                  onChange={e => setForm(f => ({ ...f, workers_needed: Math.max(1, parseInt(e.target.value) || 1) }))}
                  placeholder="6+"
                  className="w-16 h-11 rounded-xl border-2 border-gray-200 text-center text-sm font-bold outline-none focus:border-[#3f37c9]"
                />
              </div>
            </div>

            {/* Daily rate */}
            <div className="kn-card p-5">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Daily rate (₹) *</div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-lg">₹</span>
                <input
                  type="number" min={100} max={5000}
                  value={form.daily_rate}
                  onChange={e => setForm(f => ({ ...f, daily_rate: e.target.value }))}
                  placeholder="e.g. 600"
                  className="kn-input pl-9 text-lg font-bold"
                />
              </div>
              {/* Quick select */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {[300, 400, 500, 600, 800, 1000].map(r => (
                  <button key={r}
                    onClick={() => setForm(f => ({ ...f, daily_rate: r }))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border transition"
                    style={{
                      borderColor: Number(form.daily_rate) === r ? "#3f37c9" : "#e5e7eb",
                      background: Number(form.daily_rate) === r ? "#f0f0ff" : "white",
                      color: Number(form.daily_rate) === r ? "#3f37c9" : "#6b7280",
                    }}
                  >₹{r}</button>
                ))}
              </div>
              {/* Rate insight */}
              {rateInsight && (
                <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
                  style={{
                    background: rateInsight.type === "low" ? "#fff7ed" : rateInsight.type === "high" ? "#f0fdf4" : "#f0fdf4",
                    color: rateInsight.type === "low" ? "#c2410c" : "#15803d",
                  }}>
                  {rateInsight.type === "low"
                    ? <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    : <TrendingUp size={14} style={{ flexShrink: 0, marginTop: 1 }} />}
                  {rateInsight.msg}
                </div>
              )}
            </div>

            {/* Date */}
            <div className="kn-card p-5">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Work date *</div>
              <input
                type="date"
                value={form.job_date}
                min={tomorrow}
                onChange={e => setForm(f => ({ ...f, job_date: e.target.value }))}
                className="kn-input"
              />
            </div>

            {/* Pincode + village */}
            <div className="kn-card p-5 space-y-4">
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pincode *</div>
                <div className="relative">
                  <input
                    type="text" inputMode="numeric" maxLength={6}
                    value={pcValue}
                    onChange={e => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit pincode"
                    className="kn-input pr-9"
                  />
                  {pinStatus === "loading" && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
                  {pinStatus === "success" && <CheckCircle2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />}
                  {pinStatus === "error" && <AlertCircle size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" />}
                </div>
                {pinStatus === "success" && pinResult && (
                  <div className="mt-2 text-xs font-semibold text-green-700 flex items-center gap-1.5">
                    <CheckCircle2 size={11} /> {pinResult.name}, {pinResult.district}, {pinResult.state}
                  </div>
                )}
                {pinStatus === "error" && <p className="mt-1 text-xs text-red-500">{pinError}</p>}
              </div>

              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Village / Area <span className="font-normal normal-case text-gray-400">(optional)</span></div>
                <input
                  value={form.village}
                  onChange={e => setForm(f => ({ ...f, village: e.target.value }))}
                  placeholder={pinStatus === "loading" ? "Fetching…" : "e.g. Ramnagar"}
                  className="kn-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Review ── */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h1 className="font-display text-2xl mb-1">Review your job</h1>
              <p className="text-sm text-gray-500">Looks good? Post it and workers will respond.</p>
            </div>

            {/* Summary card */}
            <div className="kn-card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100" style={{ background: "linear-gradient(135deg, #f8f7ff 0%, #fff4f0 100%)" }}>
                <div className="font-display text-xl">
                  {form.skill || form.customSkill} · {form.categoryLabel}
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {CATEGORIES.find(c => c.v === form.category)?.icon} {form.categoryLabel}
                </div>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <SummaryItem label="Workers" value={`${form.workers_needed} worker${form.workers_needed > 1 ? "s" : ""}`} />
                <SummaryItem label="Daily wage" value={`₹${form.daily_rate}`} />
                <SummaryItem label="Date" value={new Date(form.job_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />
                <SummaryItem label="Location" value={form.village ? `${form.village}, ${form.pincode}` : form.pincode} />
              </div>
            </div>

            {/* Auto-generated description */}
            <div className="kn-card p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Job description</div>
                <button
                  onClick={() => setEditingDesc(!editingDesc)}
                  className="flex items-center gap-1 text-xs font-bold text-[#3f37c9] hover:underline"
                >
                  <Edit3 size={11} /> {editingDesc ? "Done" : "Edit"}
                </button>
              </div>
              {editingDesc ? (
                <textarea
                  autoFocus
                  rows={4}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="kn-input text-sm"
                />
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed">{form.description}</p>
              )}
              <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                ✨ Auto-generated — tap Edit to customize
              </div>
            </div>

            {/* Rate insight on review */}
            {rateInsight && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm font-semibold border"
                style={{
                  borderColor: rateInsight.type === "low" ? "#fed7aa" : "#bbf7d0",
                  background: rateInsight.type === "low" ? "#fff7ed" : "#f0fdf4",
                  color: rateInsight.type === "low" ? "#c2410c" : "#15803d",
                }}>
                {rateInsight.type === "low"
                  ? <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  : <TrendingUp size={16} style={{ flexShrink: 0, marginTop: 2 }} />}
                {rateInsight.msg}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky bottom CTA */}
      {step > 1 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-20">
          <div className="max-w-lg mx-auto">
            {step < 4 ? (
              <button
                onClick={next}
                disabled={!canNext()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base transition-all disabled:opacity-40"
                style={{ background: canNext() ? "#3f37c9" : "#e5e7eb", color: canNext() ? "white" : "#9ca3af" }}
              >
                Continue <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #E56A47 0%, #CF5535 100%)", color: "white", boxShadow: "0 4px 16px rgba(229,106,71,0.35)" }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {loading ? "Posting…" : "Post Job Now"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div>
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="font-semibold text-gray-800">{value}</div>
    </div>
  );
}
