import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth, formatApiError } from "@/contexts/AuthContext";
import { toast } from "sonner";
import api from "@/lib/api";

/**
 * Phone-First Signup: 3-Screen Flow
 * Screen 1: Phone Entry (numeric input, +91 prefix)
 * Screen 2: OTP Verification (6-digit input)
 * Screen 3: Profile Completion (name, role, language)
 */

export default function PhoneSignup() {
  const { sendOTP, verifyOTP, completeSignup, loginComplete, otpFlow, resetOTPFlow } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  // Screen 1: Phone Entry
  const [phone, setPhone] = useState(location.state?.phone || "");
  const [phoneError, setPhoneError] = useState("");

  // Screen 2: OTP Verification
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpResendTimer, setOtpResendTimer] = useState(0);

  // Screen 3: Profile Completion
  const [profile, setProfile] = useState({
    name: "",
    role: "customer",
    preferredLanguage: "en",
  });

  const [loading, setLoading] = useState(false);

  // Reset OTP timer on mount
  useEffect(() => {
    return () => resetOTPFlow();
  }, [resetOTPFlow]);

  // OTP Resend Timer
  useEffect(() => {
    if (otpResendTimer > 0) {
      const timer = setTimeout(() => setOtpResendTimer(otpResendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpResendTimer]);

  // ============ Screen 1: Phone Entry ============
  const validatePhone = (value) => {
    const phoneRegex = /^\+91[0-9]{10}$/;
    return phoneRegex.test(value);
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, ""); // Remove non-digits
    if (!value.startsWith("91")) {
      if (value.length > 0 && !value.startsWith("91")) {
        value = "91" + value;
      } else if (value.length === 0) {
        value = "91";
      }
    }
    // Keep at max +91XXXXXXXXXX (13 chars total)
    value = value.slice(0, 12);
    const formatted = value.length > 0 ? "+" + value : "";
    setPhone(formatted);
    setPhoneError("");
  };

  const [alreadyExists, setAlreadyExists] = useState(false);
  const [isDeactivated, setIsDeactivated] = useState(false);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (!phone) { setPhoneError("Phone number required"); return; }
    if (!validatePhone(phone)) { setPhoneError("Enter a valid 10-digit number with +91"); return; }
    setLoading(true);
    try {
      // Pre-check: block signup if number already registered
      const check = await api.get("/auth/check-phone", { params: { phone } });
      if (check.data.exists && !check.data.expired) {
        if (check.data.is_active === false) {
          setIsDeactivated(true);
        } else {
          setAlreadyExists(true);
        }
        setLoading(false);
        return;
      }
      if (check.data.expired) {
        // Phone freed after 30 days — allow fresh signup, just continue
        toast("Previous account permanently deleted. Creating a fresh account.");
      }
      await sendOTP(phone);
      setOtpResendTimer(30);
      toast.success("OTP sent to your phone");
    } catch (err) {
      setPhoneError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // ============ Screen 2: OTP Verification ============
  const handleOtpChange = (e) => {
    let value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(value);
    setOtpError("");
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setOtpError("Enter 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const result = await verifyOTP(otpFlow.phone, otp);
      if (result.created_user) {
        // Existing user — log them in directly, skip profile step
        const user = await loginComplete(result.otp_token);
        toast.success(`Welcome back, ${user.name}!`);
        if (user.role === "worker") {
          const profile = await import("@/lib/api").then(m => m.default.get("/workers/me/profile").then(r => r.data).catch(() => null));
          nav(profile ? "/worker/job-feed" : "/worker/onboarding");
        } else {
          nav("/marketplace");
        }
      } else {
        toast.success("OTP verified!");
      }
    } catch (err) {
      setOtpError(formatApiError(err));
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await sendOTP(otpFlow.phone);
      setOtp("");
      setOtpError("");
      setOtpResendTimer(30);
      toast.success("OTP resent");
    } catch (err) {
      setOtpError(formatApiError(err));
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // ============ Screen 3: Profile Completion ============
  const handleProfileChange = (key, value) => {
    setProfile({ ...profile, [key]: value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profile.name || profile.name.length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    setLoading(true);
    try {
      const user = await completeSignup(
        profile.name,
        profile.role,
        undefined,
        profile.preferredLanguage
      );
      toast.success(`Welcome to KaamNow, ${user.name}!`);
      nav(user.role === "worker" ? "/worker/onboarding" : "/customer-onboarding");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    if (otpFlow.step === 1) {
      nav("/");
    } else {
      resetOTPFlow();
    }
  };

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-8 font-display text-2xl">
          kaamnow<span className="text-[#ff6b35]">.com</span>
        </Link>

        <div className="kn-card p-8">
          {/* ===== Screen 1: Phone Entry ===== */}
          {/* Deactivated account modal */}
          {isDeactivated && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
                <div className="text-4xl mb-3">😴</div>
                <h3 className="font-display text-xl mb-2">Account Deactivated</h3>
                <p className="text-sm text-gray-600 mb-6">
                  This number has a deactivated account. You can reactivate it by logging in with OTP.
                </p>
                <div className="flex flex-col gap-3">
                  <Link
                    to="/login"
                    state={{ phone }}
                    className="btn-saffron w-full text-center"
                    onClick={() => setIsDeactivated(false)}
                  >
                    Reactivate & Login
                  </Link>
                  <button onClick={() => setIsDeactivated(false)} className="btn-outline w-full">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Already registered modal */}
          {alreadyExists && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                <div className="text-3xl mb-3 text-center">📱</div>
                <h3 className="font-display text-xl text-center mb-2">Number already registered</h3>
                <p className="text-sm text-gray-600 text-center mb-6">
                  This mobile number is already registered with us. Please login to continue.
                </p>
                <div className="flex flex-col gap-3">
                  <Link
                    to="/login"
                    state={{ phone }}
                    className="btn-saffron w-full text-center"
                    onClick={() => setAlreadyExists(false)}
                  >
                    Login Now
                  </Link>
                  <button
                    onClick={() => setAlreadyExists(false)}
                    className="btn-outline w-full"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {otpFlow.step === 1 && (
            <>
              <h1 className="font-display text-3xl">Join KaamNow</h1>
              <p className="text-gray-600 text-sm mt-1">
                Phone-first signup. Faster & safer for everyone.
              </p>

              <form onSubmit={handlePhoneSubmit} className="mt-6 space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  <div className="relative mt-1">
                    <input
                      type="tel"
                      placeholder="+918765432109"
                      value={phone}
                      onChange={handlePhoneChange}
                      maxLength="13"
                      className={`kn-input ${phoneError ? "border-red-400" : ""}`}
                      disabled={loading}
                    />
                    {phone && validatePhone(phone) && (
                      <span className="absolute right-3 top-3 text-green-600 text-lg">✓</span>
                    )}
                  </div>
                  {phoneError && <p className="text-red-600 text-sm mt-1">{phoneError}</p>}
                  <p className="text-xs text-gray-500 mt-2">
                    10-digit number with +91 country code
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !validatePhone(phone)}
                  className="btn-saffron w-full disabled:opacity-60"
                >
                  {loading ? "Sending OTP…" : "Send OTP"}
                </button>
              </form>

              <div className="mt-6 text-sm text-gray-600 text-center">
                Already registered?{" "}
                <Link to="/login" className="text-[#3f37c9] font-bold">
                  Log in
                </Link>
              </div>
            </>
          )}

          {/* ===== Screen 2: OTP Verification ===== */}
          {otpFlow.step === 2 && (
            <>
              <div className="flex items-center gap-2 mb-6">
                <button
                  onClick={handleBackClick}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ←
                </button>
                <h1 className="font-display text-3xl">Verify OTP</h1>
              </div>
              <p className="text-gray-600 text-sm">
                Sent to {otpFlow.phone.replace(/(\d{2})(\d{2})(\d)/, "$1****$3")}
              </p>

              <form onSubmit={handleOtpSubmit} className="mt-6 space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">6-Digit OTP</label>
                  <input
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={handleOtpChange}
                    maxLength="6"
                    className={`kn-input text-center font-mono text-2xl tracking-widest ${
                      otpError ? "border-red-400" : ""
                    }`}
                    disabled={loading}
                    autoFocus
                  />
                  {otpError && <p className="text-red-600 text-sm mt-1">{otpError}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="btn-saffron w-full disabled:opacity-60"
                >
                  {loading ? "Verifying…" : "Verify OTP"}
                </button>
              </form>

              <div className="mt-4 flex gap-2 text-sm">
                <button
                  onClick={handleResendOtp}
                  disabled={otpResendTimer > 0 || loading}
                  className="text-[#3f37c9] font-medium disabled:text-gray-400"
                >
                  {otpResendTimer > 0 ? `Resend in ${otpResendTimer}s` : "Resend OTP"}
                </button>
              </div>
            </>
          )}

          {/* ===== Screen 3: Profile Completion ===== */}
          {otpFlow.step === 3 && (
            <>
              <div className="flex items-center gap-2 mb-6">
                <button
                  onClick={handleBackClick}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ←
                </button>
                <h1 className="font-display text-3xl">Your Profile</h1>
              </div>

              <form onSubmit={handleProfileSubmit} className="mt-6 space-y-4">
                {/* Role Selection */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Who are you?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { v: "customer", l: "I need workers" },
                      { v: "worker", l: "I am a worker" },
                    ].map((r) => (
                      <button
                        key={r.v}
                        type="button"
                        onClick={() => handleProfileChange("role", r.v)}
                        className={`px-3 py-2 rounded-lg text-sm font-bold transition ${
                          profile.role === r.v
                            ? "bg-[#3f37c9] text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {r.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={profile.name}
                    onChange={(e) => handleProfileChange("name", e.target.value)}
                    className="kn-input mt-1"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                {/* Preferred Language */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Language</label>
                  <select
                    value={profile.preferredLanguage}
                    onChange={(e) => handleProfileChange("preferredLanguage", e.target.value)}
                    className="kn-input mt-1"
                    disabled={loading}
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="mr">मराठी (Marathi)</option>
                    <option value="gu">ગુજરાતી (Gujarati)</option>
                    <option value="ta">தமிழ் (Tamil)</option>
                    <option value="te">తెలుగు (Telugu)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading || !profile.name}
                  className="btn-saffron w-full disabled:opacity-60"
                >
                  {loading ? "Creating account…" : "Create Account"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
