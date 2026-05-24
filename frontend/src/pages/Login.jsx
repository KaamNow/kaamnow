import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "@/lib/api";
import { useAuth, formatApiError } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const { loginComplete } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1); // 1 = phone, 2 = otp
  const [phone, setPhone] = useState(location.state?.phone || "");
  const [otp, setOtp] = useState("");
  const [otpToken, setOtpToken] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [isDeactivated, setIsDeactivated] = useState(false);

  const validatePhone = (v) => /^\+91[0-9]{10}$/.test(v);

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value.startsWith("91")) {
      value = value.length > 0 ? "91" + value : "91";
    }
    value = value.slice(0, 12);
    setPhone(value.length > 0 ? "+" + value : "");
    setPhoneError("");
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!validatePhone(phone)) {
      setPhoneError("Enter a valid 10-digit number with +91");
      return;
    }
    setLoading(true);
    try {
      // Pre-check: block login if number not registered or show reactivation if deactivated
      const check = await api.get("/auth/check-phone", { params: { phone } });
      if (!check.data.exists || check.data.expired) {
        // Expired accounts treated as non-existent — user must create fresh account
        check.data.expired
          ? toast.error("This account was permanently deleted. Please create a new account.")
          : setNotFound(true);
        setLoading(false);
        return;
      }
      if (check.data.is_active === false) {
        setIsDeactivated(true);
        setLoading(false);
        return;
      }
      const r = await api.post("/auth/send-otp", { phone });
      setOtpToken(r.data.otp_token);
      setStep(2);
      setResendTimer(30);
      const countdown = setInterval(() => {
        setResendTimer((t) => { if (t <= 1) { clearInterval(countdown); return 0; } return t - 1; });
      }, 1000);
      toast.success("OTP sent to your phone");
    } catch (err) {
      setPhoneError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const r = await api.post("/auth/verify-otp", { phone, otp });
      if (!r.data.created_user) {
        toast.error("No account found for this number. Please sign up.");
        setStep(1);
        return;
      }
      const user = await loginComplete(r.data.otp_token);
      toast.success(`Welcome back, ${user.name}!`);
      nav(user?.has_service_profile ? "/find-work" : "/marketplace");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const r = await api.post("/auth/send-otp", { phone });
      setOtpToken(r.data.otp_token);
      setOtp("");
      setResendTimer(30);
      const countdown = setInterval(() => {
        setResendTimer((t) => { if (t <= 1) { clearInterval(countdown); return 0; } return t - 1; });
      }, 1000);
      toast.success("OTP resent");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center p-6">

      {/* Deactivated account modal */}
      {isDeactivated && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
            <div className="text-4xl mb-3">😴</div>
            <h3 className="font-display text-xl mb-2">Account Deactivated</h3>
            <p className="text-sm text-gray-600 mb-6">
              This account was deactivated. Verify your number with an OTP to <strong>reactivate</strong> and login instantly.
            </p>
            <div className="flex flex-col gap-3">
              <button
                className="btn-saffron w-full"
                onClick={async () => {
                  setIsDeactivated(false);
                  setLoading(true);
                  try {
                    const r = await api.post("/auth/send-otp", { phone });
                    setOtpToken(r.data.otp_token);
                    setStep(2);
                    setResendTimer(30);
                    const countdown = setInterval(() => {
                      setResendTimer(t => { if (t <= 1) { clearInterval(countdown); return 0; } return t - 1; });
                    }, 1000);
                    toast.success("OTP sent — verify to reactivate your account");
                  } catch (err) { setPhoneError(formatApiError(err)); }
                  finally { setLoading(false); }
                }}
              >
                Reactivate & Login
              </button>
              <button onClick={() => setIsDeactivated(false)} className="btn-outline w-full">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Not registered modal */}
      {notFound && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-3xl mb-3 text-center">🔍</div>
            <h3 className="font-display text-xl text-center mb-2">Number not registered</h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              This mobile number is not registered with us. Please create an account first.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to="/signup"
                state={{ phone }}
                className="btn-saffron w-full text-center"
                onClick={() => setNotFound(false)}
              >
                Create Account
              </Link>
              <button onClick={() => setNotFound(false)} className="btn-outline w-full">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-8 font-display text-2xl">
          kaamnow<span className="text-[#ff6b35]">.com</span>
        </Link>

        <div className="kn-card p-8">
          {step === 1 && (
            <>
              <h1 className="font-display text-3xl">Welcome back</h1>
              <p className="text-gray-600 text-sm mt-1">Log in with your phone number.</p>

              <form onSubmit={handleSendOTP} className="mt-6 space-y-4">
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
                  <p className="text-xs text-gray-500 mt-1">10-digit number with +91 country code</p>
                </div>
                <button
                  type="submit"
                  disabled={loading || !validatePhone(phone)}
                  className="btn-saffron w-full disabled:opacity-60"
                >
                  {loading ? "Sending OTP…" : "Send OTP"}
                </button>
              </form>

              <div className="mt-5 text-sm text-gray-600 text-center">
                New to KaamNow?{" "}
                <Link to="/signup" className="text-[#3f37c9] font-bold">Create account</Link>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setStep(1)} className="p-2 hover:bg-gray-100 rounded-lg">←</button>
                <h1 className="font-display text-3xl">Enter OTP</h1>
              </div>
              <p className="text-gray-600 text-sm mb-6">
                Sent to {phone.replace(/(\+91)(\d{2})(\d{4})(\d{4})/, "$1$2****$4")}
              </p>

              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength="6"
                  className="kn-input text-center font-mono text-2xl tracking-widest"
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="btn-saffron w-full disabled:opacity-60"
                >
                  {loading ? "Verifying…" : "Verify & Log in"}
                </button>
              </form>

              <div className="mt-4 text-sm text-center">
                <button
                  onClick={handleResend}
                  disabled={resendTimer > 0 || loading}
                  className="text-[#3f37c9] font-medium disabled:text-gray-400"
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
