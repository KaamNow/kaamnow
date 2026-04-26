import { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync("kn_token");
      if (!token) return setUser(null);
      try {
        const r = await api.get("/auth/me");
        setUser(r.data);
      } catch {
        await SecureStore.deleteItemAsync("kn_token");
        setUser(null);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    await SecureStore.setItemAsync("kn_token", r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const register = async (payload) => {
    const r = await api.post("/auth/register", payload);
    await SecureStore.setItemAsync("kn_token", r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync("kn_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
