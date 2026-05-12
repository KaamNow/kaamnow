import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import T from "../lib/translations";

const LanguageContext = createContext(null);
const LANG_KEY = "kn_lang";

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(LANG_KEY);
        if (saved === "hi" || saved === "en") setLangState(saved);
      } catch {}
    })();
  }, []);

  const setLang = useCallback(async (l) => {
    try {
      await SecureStore.setItemAsync(LANG_KEY, l);
    } catch {}
    setLangState(l);
  }, []);

  const t = useCallback((key) => T[lang]?.[key] ?? T.en[key] ?? key, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
