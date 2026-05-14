import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import api from "../api";

// Show notification banners when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerPushToken() {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    // Android needs a notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "KaamNow",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (token) {
      await api.post("/auth/push-token", { token });
    }
  } catch {
    // Push registration failure must never crash the app
  }
}

const AuthContext = createContext(null);
const TOKEN_KEY = "kn_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading

  const [otpFlow, setOtpFlow] = useState({
    phone: "",
    otpToken: null,
    otpSent: false,
    otpVerified: false,
    step: 1,
  });

  const refreshUser = useCallback(async () => {
    try {
      const r = await api.get("/auth/me");
      setUser(r.data);
      return r.data;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) return setUser(null);
      try {
        const r = await api.get("/auth/me");
        setUser(r.data);
        // Register push token now that we have a valid session
        registerPushToken();
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setUser(null);
      }
    })();
  }, []);

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
      // Only advance to step 3 (name/role) if this is a NEW user.
      // For existing users, the screen will call loginComplete and navigate away.
      step: r.data.created_user ? prev.step : 3,
    }));
    return r.data; // { otp_token, created_user }
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
      { headers: { Authorization: `Bearer ${otpFlow.otpToken}` } }
    );
    await SecureStore.setItemAsync(TOKEN_KEY, r.data.access_token);
    setUser(r.data.user);
    resetOTPFlow();
    registerPushToken();
    return r.data.user;
  };

  const loginComplete = async (otpToken) => {
    const r = await api.post(
      "/auth/login-complete",
      {},
      { headers: { Authorization: `Bearer ${otpToken}` } }
    );
    await SecureStore.setItemAsync(TOKEN_KEY, r.data.access_token);
    setUser(r.data.user);
    registerPushToken();
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

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        logout,
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
