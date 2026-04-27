import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth, formatApiError } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Check } from "lucide-react";

const SKILL_SUGGESTIONS = [
  "mason",
  "farm work",
  "painting",
  "plumbing",
  "electrical",
  "helper",
  "cleaning",
  "carpentry",
  "welding",
  "harvesting",
];

export default function WorkerSetup() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    skills: "",
    daily_rate: 350,
    bio: "",
    village: user?.village || "",
    district: "",
    state: "",
    lat: 22.9734,
    lng: 78.6569,
    available: true,
  });

  useEffect(() => {
    if (!user) return;
    if (user.role !== "worker") {
      setLoading(false);
      return;
    }
    api
      .get("/workers/me/profile")
      .then((r) => {
        if (r.data) {
          const w = r.data;
          setProfile(w);
          setForm({
            skills: w.skills.join(", "),
            daily_rate: w.daily_rate,
            bio: w.bio || "",
            village: w.village || user.village || "",
            district: w.district || "",
            state: w.state || "",
            lat: w.lat || 22.9734,
            lng: w.lng || 78.6569,
            available: w.available ?? true,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const update = (k) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [k]: value });
  };

  const addSkill = (skill) => () => {
    const skills = form.skills.split(",").map((s) => s.trim()).filter(Boolean);
    if (!skills.includes(skill)) {
      skills.push(skill);
      setForm({ ...form, skills: skills.join(", ") });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!user || user.role !== "worker") return;
    setSaving(true);
    try {
      const payload = {
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        daily_rate: Number(form.daily_rate),
        bio: form.bio,
        village: form.village,
        district: form.district,
        state: form.state,
        lat: Number(form.lat),
        lng: Number(form.lng),
        available: Boolean(form.available),
      };
      const r = await api.post("/workers/profile", payload);
      setProfile(r.data);
      toast.success("Worker profile saved.");
      nav("/dashboard");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading profile…</div>;
  if (!user) return <div className="p-12 text-center text-gray-500">Loading user…</div>;
  if (user.role !== "worker") {
    return (
      <div className="p-12 text-center text-gray-500">
        Worker profile setup is only available for worker accounts.
        <div className="mt-4">
          <Link to="/dashboard" className="btn-saffron">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="worker-setup-page" className="max-w-3xl mx-auto px-6 py-10">
      <div className="kn-overline">Worker onboarding</div>
      <h1 className="font-display text-4xl tracking-tight mt-2">{profile ? "Update" : "Complete"} your worker profile</h1>
      <p className="text-gray-600 mt-3">Fill in your skills, village, and availability so customers can hire you faster.</p>

      <form onSubmit={submit} className="mt-8 kn-card p-6 space-y-5" data-testid="worker-setup-form">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Skills</label>
          <input
            data-testid="worker-skills"
            required
            placeholder="e.g. mason, plumbing, helper"
            value={form.skills}
            onChange={update("skills")}
            className="kn-input"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {SKILL_SUGGESTIONS.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={addSkill(skill)}
                className="text-xs px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200"
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Daily rate (₹)">
            <input
              data-testid="worker-rate"
              required
              type="number"
              min={100}
              max={5000}
              value={form.daily_rate}
              onChange={update("daily_rate")}
              className="kn-input"
            />
          </Field>
          <Field label="Availability">
            <div className="flex items-center gap-3">
              <input
                data-testid="worker-available"
                type="checkbox"
                checked={form.available}
                onChange={update("available")}
                className="accent-[#ff6b35] h-5 w-5"
              />
              <span className="text-sm text-gray-600">Available for work</span>
            </div>
          </Field>
        </div>

        <Field label="Village">
          <input
            data-testid="worker-village"
            required
            value={form.village}
            onChange={update("village")}
            placeholder="Village name"
            className="kn-input"
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="District">
            <input
              data-testid="worker-district"
              value={form.district}
              onChange={update("district")}
              placeholder="District"
              className="kn-input"
            />
          </Field>
          <Field label="State">
            <input
              data-testid="worker-state"
              value={form.state}
              onChange={update("state")}
              placeholder="State"
              className="kn-input"
            />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Latitude">
            <input
              data-testid="worker-lat"
              required
              type="number"
              step="0.0001"
              value={form.lat}
              onChange={update("lat")}
              className="kn-input"
            />
          </Field>
          <Field label="Longitude">
            <input
              data-testid="worker-lng"
              required
              type="number"
              step="0.0001"
              value={form.lng}
              onChange={update("lng")}
              className="kn-input"
            />
          </Field>
        </div>

        <Field label="About you">
          <textarea
            data-testid="worker-bio"
            rows={4}
            value={form.bio}
            onChange={update("bio")}
            placeholder="Describe your experience, tools, and work style"
            className="kn-input"
          />
        </Field>

        <button data-testid="worker-setup-submit" disabled={saving} className="btn-saffron w-full disabled:opacity-60 flex items-center justify-center gap-2">
          <Check size={16} /> {saving ? "Saving…" : profile ? "Update profile" : "Save profile"}
        </button>
      </form>

      <div className="mt-6 text-sm text-gray-500">
        Your worker profile makes it easy for customers to trust you and hire you quickly.
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-sm font-bold text-gray-700 mb-2">{label}</div>
      {children}
    </label>
  );
}
