import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

// Resolution: EXPO_PUBLIC_API_URL env var → app.json extra.apiUrl → localhost fallback.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants?.expoConfig?.extra?.apiUrl ||
  "http://localhost:8000";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync("kn_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return config;
});

export default api;

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (err?.message === "Network Error" || err?.code === "ERR_NETWORK") {
    return `Cannot reach KaamNow server. Check internet/backend URL: ${API_URL}`;
  }
  if (err?.code === "ECONNABORTED") {
    return `KaamNow server timed out. Please try again. (${API_URL})`;
  }
  if (!detail) return err?.message || "Something went wrong";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return String(detail);
}
