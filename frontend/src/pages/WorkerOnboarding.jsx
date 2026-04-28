import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth, formatApiError } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  User,
  Phone,
  MapPin,
  Briefcase,
  Camera,
  ChevronRight,
  ChevronLeft,
  Check,
  Hammer,
  Leaf,
  Paintbrush,
  Wrench,
  Zap,
  HelpingHand,
  Sparkles,
  Scissors,
  Truck,
  Building2,
  Wheat,
  Wind,
} from "lucide-react";

/* ─── Skill Categories ─────────────────────────────────────────────────── */
const SKILL_CATEGORIES = [
  {
    category: "Construction",
    icon: Building2,
    color: "#e85a25",
    bg: "#fff4f0",
    skills: ["Mason", "Carpenter", "Painter", "Welder", "Plumber", "Helper"],
  },
  {
    category: "Agriculture",
    icon: Wheat,
    color: "#16a34a",
    bg: "#f0fdf4",
    skills: ["Harvesting", "Irrigation", "Pesticide", "Plowing", "Farm helper"],
  },
  {
    category: "Electrical",
    icon: Zap,
    color: "#d97706",
    bg: "#fffbeb",
    skills: ["Wiring", "Motor repair", "Panel work", "Electrician"],
  },
  {
    category: "Cleaning",
    icon: Sparkles,
    color: "#3f37c9",
    bg: "#f0f0ff",
    skills: ["House cleaning", "Sweeping", "Vessel washing", "Laundry"],
  },
  {
    category: "Transport",
    icon: Truck,
    color: "#0284c7",
    bg: "#f0f9ff",
    skills: ["Driving", "Loading", "Delivery", "Tractor operator"],
  },
  {
    category: "Mechanical",
    icon: Wrench,
    color: "#9333ea",
    bg: "#faf0ff",
    skills: ["Pump repair", "Engine work", "Welding", "Tool repair"],
  },
  {
    category: "Tailoring",
    icon: Scissors,
    color: "#db2777",
    bg: "#fff0f6",
    skills: ["Stitching", "Embroidery", "Alterations", "Fabric cutting"],
  },
  {
    category: "General",
    icon: HelpingHand,
    color: "#4b5563",
    bg: "#f9fafb",
    skills: ["Daily labour", "Watchman", "Peon", "Loader", "General helper"],
  },
];

const STEPS = [
  { id: "name", label: "Your Name", icon: User },
  { id: "phone", label: "Phone", icon: Phone },
  { id: "address", label: "Address", icon: MapPin },
  { id: "skills", label: "Skills", icon: Briefcase },
  { id: "photo", label: "Profile Photo", icon: Camera },
];

/* ─── Progress Bar ─────────────────────────────────────────────────────── */
function ProgressBar({ step, total }) {
  return (
    <div className="w-full flex items-center gap-1 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-1.5 rounded-full transition-all duration-500"
          style={{
            background: i < step ? "var(--kn-saffron)" : i === step ? "var(--kn-indigo)" : "#e5e7eb",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Step Header ──────────────────────────────────────────────────────── */
function StepHeader({ icon: Icon, label, desc }) {
  return (
    <div className="mb-6">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{ background: "var(--kn-indigo)", color: "#fff" }}
      >
        <Icon size={22} />
      </div>
      <div className="kn-overline mb-1">{label}</div>
      <p className="text-gray-500 text-sm">{desc}</p>
    </div>
  );
}

/* ─── Skill Card ───────────────────────────────────────────────────────── */
function SkillCard({ category, icon: Icon, color, bg, skills, selected, onToggle }) {
  const selectedInCat = skills.filter((s) => selected.some((x) => x.skill === s && x.category === category));
  return (
    <div
      className="kn-card p-4 cursor-default"
      style={{ borderColor: selectedInCat.length ? color : undefined }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: bg }}>
          <Icon size={16} style={{ color }} />
        </div>
        <span className="font-bold text-sm">{category}</span>
        {selectedInCat.length > 0 && (
          <span
            className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: bg, color }}
          >
            {selectedInCat.length} selected
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => {
          const active = selected.some((x) => x.skill === skill && x.category === category);
          return (
            <button
              key={skill}
              type="button"
              onClick={() => onToggle(category, skill)}
              className="text-xs px-3 py-1.5 rounded-full border font-semibold transition-all duration-150"
              style={
                active
                  ? { background: color, color: "#fff", borderColor: color }
                  : { background: bg, color, borderColor: "transparent" }
              }
            >
              {active && <Check size={10} className="inline mr-1" />}
              {skill}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────────────── */
export default function WorkerOnboarding() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [daily_rate, setDailyRate] = useState(350);
  const [address, setAddress] = useState({
    village: user?.village || "",
    post: "",
    block: "",
    district: "",
    state: "",
    pincode: user?.pincode || "",
  });
  const [selectedSkills, setSelectedSkills] = useState([]); // [{category, skill}]
  const [bio, setBio] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    const loadWorker = async () => {
      try {
        const r = await api.get("/workers/me/profile");
        if (r.data) {
          setName(r.data.name || user?.name || "");
          setPhone(r.data.phone || user?.phone || "");
          setDailyRate(r.data.daily_rate || 350);
          if (r.data.address) setAddress(r.data.address);
          if (r.data.structured_skills) setSelectedSkills(r.data.structured_skills);
          setBio(r.data.bio || "");
          setPhotoPreview(r.data.photo_url);
        }
      } catch (e) {
        // No profile yet, that's fine
      } finally {
        setLoading(false);
      }
    };
    if (user) loadWorker();
  }, [user]);

  if (loading) return <div className="p-12 text-center text-gray-500 font-display text-xl animate-pulse">Loading profile...</div>;

  const toggleSkill = (category, skill) => {
    setSelectedSkills((prev) => {
      const exists = prev.some((x) => x.category === category && x.skill === skill);
      return exists
        ? prev.filter((x) => !(x.category === category && x.skill === skill))
        : [...prev, { category, skill }];
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const canProceed = () => {
    if (step === 0) return name.trim().length >= 2;
    if (step === 1) return phone.trim().length >= 8;
    if (step === 2) return address.village.trim() && address.pincode.trim().length === 6;
    if (step === 3) return selectedSkills.length >= 1;
    return true; // photo optional
  };

  const next = () => {
    if (!canProceed()) {
      toast.error(step === 2 ? "Enter village name and 6-digit pincode" : "Please fill this step first");
      return;
    }
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else handleSubmit();
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Build payload compatible with existing WorkerProfileIn schema
      const skills = selectedSkills.map((x) => x.skill.toLowerCase());
      const payload = {
        skills,
        structured_skills: selectedSkills,
        daily_rate: Number(daily_rate),
        bio,
        village: address.village,
        district: address.district,
        state: address.state,
        lat: 22.9734,
        lng: 78.6569,
        available: true,
        address,
        availability_status: "available",
      };

      await api.post("/workers/profile", payload);

      // Upload photo if provided
      if (photoFile) {
        try {
          const fd = new FormData();
          fd.append("file", photoFile);
          await api.post("/workers/me/photo", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch {
          // Photo upload is optional; don't block onboarding
        }
      }

      toast.success("🎉 Profile created! Welcome to KaamNow!");
      nav("/worker/dashboard");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== "worker") {
    return (
      <div className="p-12 text-center text-gray-500">
        This page is only for worker accounts.
      </div>
    );
  }

  return (
    <div data-testid="worker-onboarding" className="min-h-screen bg-[#fcfbf9] py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-6">
          <span className="font-display text-2xl tracking-tight">
            kaam<span style={{ color: "var(--kn-saffron)" }}>now</span>
          </span>
          <div className="text-xs text-gray-400 mt-1">Worker Onboarding · {step + 1} of {STEPS.length}</div>
        </div>

        <ProgressBar step={step} total={STEPS.length} />

        {/* ─── Step 0: Name ─── */}
        {step === 0 && (
          <div className="fade-up kn-card p-8">
            <StepHeader icon={User} label="Your Name" desc="Tell us your full name so customers can trust you." />
            <label className="block text-sm font-bold text-gray-700 mb-2">Full name</label>
            <input
              data-testid="onboard-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && next()}
              placeholder="e.g. Ramesh Kumar"
              className="kn-input text-lg"
            />
            <label className="block text-sm font-bold text-gray-700 mb-2 mt-4">Daily rate (₹)</label>
            <input
              data-testid="onboard-daily-rate"
              type="number"
              min={100}
              max={5000}
              value={daily_rate}
              onChange={(e) => setDailyRate(e.target.value)}
              className="kn-input"
            />
            <p className="text-xs text-gray-400 mt-2">This is what customers will see as your expected pay.</p>
          </div>
        )}

        {/* ─── Step 1: Phone ─── */}
        {step === 1 && (
          <div className="fade-up kn-card p-8">
            <StepHeader icon={Phone} label="Phone Number" desc="Your phone helps customers reach you quickly." />
            <label className="block text-sm font-bold text-gray-700 mb-2">Mobile number</label>
            <div className="flex gap-2">
              <span className="kn-input w-16 text-center font-bold flex items-center justify-center text-gray-600">+91</span>
              <input
                data-testid="onboard-phone"
                autoFocus
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                onKeyDown={(e) => e.key === "Enter" && next()}
                placeholder="9876543210"
                className="kn-input flex-1"
                maxLength={10}
              />
            </div>
            <div className="mt-4 rounded-xl p-3 text-sm text-gray-600" style={{ background: "#fff4f0" }}>
              📱 OTP verification will be available soon. Your number is safe with us.
            </div>
          </div>
        )}

        {/* ─── Step 2: Address ─── */}
        {step === 2 && (
          <div className="fade-up kn-card p-8">
            <StepHeader icon={MapPin} label="Your Address" desc="Customers nearby will find you based on your pincode." />
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Village / Town <span className="text-red-500">*</span></label>
                <input
                  data-testid="onboard-village"
                  autoFocus
                  value={address.village}
                  onChange={(e) => setAddress({ ...address, village: e.target.value })}
                  placeholder="e.g. Ramnagar"
                  className="kn-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Post</label>
                  <input
                    data-testid="onboard-post"
                    value={address.post}
                    onChange={(e) => setAddress({ ...address, post: e.target.value })}
                    placeholder="Post office"
                    className="kn-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Block</label>
                  <input
                    data-testid="onboard-block"
                    value={address.block}
                    onChange={(e) => setAddress({ ...address, block: e.target.value })}
                    placeholder="Block / Tehsil"
                    className="kn-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">District</label>
                  <input
                    data-testid="onboard-district"
                    value={address.district}
                    onChange={(e) => setAddress({ ...address, district: e.target.value })}
                    placeholder="District"
                    className="kn-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">State</label>
                  <input
                    data-testid="onboard-state"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    placeholder="State"
                    className="kn-input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <input
                  data-testid="onboard-pincode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                  placeholder="6-digit pincode"
                  className="kn-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 3: Skills ─── */}
        {step === 3 && (
          <div className="fade-up">
            <div className="kn-card p-6 mb-4">
              <StepHeader icon={Briefcase} label="Your Skills" desc="Select all skills that apply. Customers will match jobs to your skills." />
              {selectedSkills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl" style={{ background: "#f0f0ff" }}>
                  {selectedSkills.map((s) => (
                    <span
                      key={`${s.category}-${s.skill}`}
                      className="text-xs px-2 py-1 rounded-full font-bold"
                      style={{ background: "var(--kn-indigo)", color: "#fff" }}
                    >
                      {s.skill}
                    </span>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 mt-2">About you (optional)</label>
                <textarea
                  data-testid="onboard-bio"
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Years of experience, tools you own, work style…"
                  className="kn-input text-sm"
                />
              </div>
            </div>

            <div className="space-y-3">
              {SKILL_CATEGORIES.map((cat) => (
                <SkillCard
                  key={cat.category}
                  {...cat}
                  selected={selectedSkills}
                  onToggle={toggleSkill}
                />
              ))}
            </div>
          </div>
        )}

        {/* ─── Step 4: Photo ─── */}
        {step === 4 && (
          <div className="fade-up kn-card p-8 text-center">
            <StepHeader icon={Camera} label="Profile Photo" desc="A photo builds trust. Customers are more likely to hire workers with photos." />

            <div className="flex flex-col items-center gap-4">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-28 h-28 rounded-full object-cover border-4"
                  style={{ borderColor: "var(--kn-saffron)" }}
                />
              ) : (
                <div
                  className="w-28 h-28 rounded-full flex items-center justify-center text-4xl"
                  style={{ background: "#f0f0ff", color: "var(--kn-indigo)" }}
                >
                  {name?.[0]?.toUpperCase() || "?"}
                </div>
              )}

              <label className="btn-outline cursor-pointer flex items-center gap-2 text-sm">
                <Camera size={14} />
                {photoPreview ? "Change photo" : "Choose photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handlePhotoChange}
                  data-testid="onboard-photo"
                />
              </label>

              <p className="text-sm text-gray-400">
                Optional — you can always add it later from your dashboard.
              </p>
            </div>
          </div>
        )}

        {/* ─── Navigation ─── */}
        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <button
              onClick={back}
              className="btn-outline flex items-center gap-2"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          )}
          <button
            data-testid="onboard-next"
            disabled={saving}
            onClick={next}
            className="btn-saffron flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              "Saving…"
            ) : step === STEPS.length - 1 ? (
              <>
                <Check size={16} /> Complete setup
              </>
            ) : (
              <>
                Continue <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>

        {step === 4 && !saving && (
          <button
            onClick={handleSubmit}
            className="mt-3 w-full text-center text-sm text-gray-400 underline"
          >
            Skip photo, complete setup
          </button>
        )}
      </div>
    </div>
  );
}
