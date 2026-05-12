import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading

  // OTP signup flow state
  const [otpFlow, setOtpFlow] = useState({
    phone: "",
    otpToken: null,
    otpSent: false,
    otpVerified: false,
    step: 1, // 1 = phone entry, 2 = OTP verification, 3 = profile completion
  });

  const refreshUser = useCallback(async () => {
    try {
      const r = await api.get("/auth/me");
      setUser(r.data);
      return r.data;
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    localStorage.removeItem("kn_token");
    setUser(null);
  };

  // NEW: Phone-first OTP signup flow
  const sendOTP = async (phone) => {
    const r = await api.post("/auth/send-otp", { phone });
    setOtpFlow((prev) => ({
      ...prev,
      phone,
      otpToken: r.data.otp_token,
      otpSent: true,
      step: 2,
    }));
    return r.data;
  };

  const verifyOTP = async (phone, otp) => {
    const r = await api.post("/auth/verify-otp", { phone, otp });
    setOtpFlow((prev) => ({
      ...prev,
      otpToken: r.data.otp_token,
      otpVerified: true,
      step: 3,
    }));
    return r.data;
  };

  const completeSignup = async (name, role, password, preferredLanguage = "en") => {
    const r = await api.post(
      "/auth/signup-complete",
      {
        name,
        role,
        password: password || undefined,
        preferred_language: preferredLanguage,
      },
      {
        headers: {
          Authorization: `Bearer ${otpFlow.otpToken}`,
        },
      }
    );
    localStorage.setItem("kn_token", r.data.access_token);
    setUser(r.data.user);
    // Reset OTP flow
    setOtpFlow({
      phone: "",
      otpToken: null,
      otpSent: false,
      otpVerified: false,
      step: 1,
    });
    return r.data.user;
  };

  const resetOTPFlow = useCallback(() => {
    setOtpFlow({
      phone: "",
      otpToken: null,
      otpSent: false,
      otpVerified: false,
      step: 1,
    });
  }, []);

  const loginComplete = async (otpToken) => {
    const r = await api.post(
      "/auth/login-complete",
      {},
      { headers: { Authorization: `Bearer ${otpToken}` } }
    );
    localStorage.setItem("kn_token", r.data.access_token);
    setUser(r.data.user);
    return r.data.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        logout,
        // OTP flow
        otpFlow,
        sendOTP,
        verifyOTP,
        completeSignup,
        loginComplete,
        resetOTPFlow,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (!detail) return err?.message || "Something went wrong";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return String(detail);
}
