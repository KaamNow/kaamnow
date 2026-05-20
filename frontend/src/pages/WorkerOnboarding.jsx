import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth, formatApiError } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { usePincodeLookup } from "@/lib/usePincode";
import {
  User,
  Phone,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

/* ─── Skill Categories (Moved to SkillSelectorModal - Deferred Collection) ─── */

const STEPS = [
  { id: "name", label: "Your Name", icon: User },
  { id: "address", label: "Address", icon: MapPin },
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

/* ─── SkillCard Component (Moved to SkillSelectorModal - Deferred Collection) ─── */

/* ─── Main Component ───────────────────────────────────────────────────── */
export default function WorkerOnboarding() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(user?.phone_verified || false);
  const [otpLoading, setOtpLoading] = useState(false);

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
    pincode: user?.address?.pincode || "",
  });
  const { pincode: pincodeVal, setPincode: setPincodeVal, status: pinStatus, result: pinResult, errorMsg: pinError } = usePincodeLookup();

  useEffect(() => {
    const loadWorker = async () => {
      try {
        const r = await api.get("/workers/me/profile");
        if (r.data) {
          setName(r.data.name || user?.name || "");
          setPhone(r.data.phone || user?.phone || "");
          setDailyRate(r.data.daily_rate || 350);
          if (r.data.address) {
            setAddress(r.data.address);
            if (r.data.address.pincode) setPincodeVal(r.data.address.pincode);
          }
        }
      } catch (e) {
        // No profile yet, that's fine
      } finally {
        setLoading(false);
      }
    };
    if (user) loadWorker();
  }, [user]);

  // Auto-fill address when pincode lookup succeeds
  useEffect(() => {
    if (pinResult) {
      setAddress(prev => ({
        ...prev,
        district: pinResult.district,
        state: pinResult.state,
        pincode: pincodeVal,
        post: prev.post || pinResult.name,
        block: prev.block || pinResult.block || "",
      }));
    }
  }, [pinResult, pincodeVal]);

  if (loading) return <div className="p-12 text-center text-gray-500 font-display text-xl animate-pulse">Loading profile...</div>;

  const canProceed = () => {
    if (step === 0) return (name || "").trim().length >= 2;
    if (step === 1) return (address?.village || "").trim().length >= 2;
    return true;
  };

  const next = () => {
    if (!canProceed()) {
      if (step === 1) toast.error("Please enter your village or town name");
      else toast.error("Please fill this step first");
      return;
    }
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else handleSubmit();
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const sendOtp = async () => {
    if (phone.length !== 10) return;
    setOtpLoading(true);
    try {
      await api.post("/auth/send-otp", { phone });
      setOtpSent(true);
      toast.success("OTP sent to " + phone);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length < 4) return;
    setOtpLoading(true);
    try {
      await api.post("/auth/verify-otp", { phone, otp });
      setPhoneVerified(true);
      toast.success("Phone verified successfully!");
    } catch (err) {
      toast.error("Invalid OTP. Try '123456' for local testing.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Update base user profile with name, phone, and address
      await api.patch("/auth/me", {
        name,
        phone,
        village: address.village,
        pincode: address.pincode,
        address,
      });

      // Create minimal worker profile (skills deferred to job feed)
      const payload = {
        daily_rate: Number(daily_rate),
        village: address.village,
        district: address.district || "",
        state: address.state || "",
        address,
        availability_status: "available",
        structured_skills: [], // Empty initially - collected on job feed
      };

      await api.post("/workers/profile", payload);

      toast.success("🎉 Profile created! Let's find you some jobs!");
      if (window.posthog) {
        window.posthog.capture("worker_onboarded");
      }
      // Redirect to job feed, not dashboard
      nav("/worker/job-feed");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!user || user?.is_worker !== true) {
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

        {/* ─── Step 1: Address ─── */}
        {step === 1 && (
          <div className="fade-up kn-card p-8">
            <StepHeader icon={MapPin} label="Your Address" desc="Enter your pincode — district, state, and post office fill automatically. Type your village name." />
            <div className="space-y-3">

              {/* Pincode first — auto-fills the rest */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    data-testid="onboard-pincode"
                    autoFocus
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pincodeVal}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setPincodeVal(v);
                      setAddress(a => ({ ...a, pincode: v }));
                    }}
                    placeholder="6-digit pincode"
                    className="kn-input pr-10"
                  />
                  {pinStatus === "loading" && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
                  {pinStatus === "success" && <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />}
                  {pinStatus === "error" && <AlertCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" />}
                </div>
                {pinStatus === "success" && pinResult && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#f0fdf4", color: "#15803d" }}>
                    <CheckCircle2 size={11} /> {pinResult.district} district · {pinResult.state}
                  </div>
                )}
                {pinStatus === "error" && <p className="mt-1 text-xs text-red-500">{pinError}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Village / Town <span className="text-red-500">*</span></label>
                <input
                  data-testid="onboard-village"
                  value={address.village}
                  onChange={(e) => setAddress({ ...address, village: e.target.value })}
                  placeholder="e.g. Ramnagar"
                  className="kn-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">District</label>
                  <input
                    data-testid="onboard-district"
                    value={address.district}
                    onChange={(e) => setAddress({ ...address, district: e.target.value })}
                    placeholder="Auto-filled"
                    className="kn-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">State</label>
                  <input
                    data-testid="onboard-state"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    placeholder="Auto-filled"
                    className="kn-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Post office</label>
                  <input
                    data-testid="onboard-post"
                    value={address.post || ""}
                    onChange={(e) => setAddress({ ...address, post: e.target.value })}
                    placeholder="Optional"
                    className="kn-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Block / Tehsil</label>
                  <input
                    data-testid="onboard-block"
                    value={address.block || ""}
                    onChange={(e) => setAddress({ ...address, block: e.target.value })}
                    placeholder="Optional"
                    className="kn-input"
                  />
                </div>
              </div>
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
                <Check size={16} /> See Job Feed
              </>
            ) : (
              <>
                Continue <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
