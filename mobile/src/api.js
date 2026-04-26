import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

export const API_URL =
  (Constants?.expoConfig?.extra?.apiUrl) ||
  "https://adb859de-82e2-4ac1-9d9b-f64456df6b58.preview.emergentagent.com";

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
  if (!detail) return err?.message || "Something went wrong";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return String(detail);
}
