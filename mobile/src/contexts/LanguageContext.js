import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import T from "../i18n/translations";

const LanguageContext = createContext(null);
const LANG_KEY = "kn_lang";
const SUPPORTED = ["en", "hi", "bho", "mai"];

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(LANG_KEY);
        if (saved && SUPPORTED.includes(saved)) setLangState(saved);
      } catch {}
    })();
  }, []);

  const setLang = useCallback(async (l) => {
    if (!SUPPORTED.includes(l)) return;
    try {
      await SecureStore.setItemAsync(LANG_KEY, l);
    } catch {}
    setLangState(l);
  }, []);

  // Kept for backwards compat — prefer useTranslation() from i18n/index.js
  const t = useCallback(
    (key, vars = {}) => {
      const raw = T[lang]?.[key] ?? T.en?.[key] ?? key;
      if (!vars || Object.keys(vars).length === 0) return raw;
      return Object.entries(vars).reduce(
        (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
        raw
      );
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, supported: SUPPORTED }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
