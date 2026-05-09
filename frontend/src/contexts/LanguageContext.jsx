import { createContext, useContext, useState, useCallback } from "react";
import T from "@/lib/translations";

const LanguageContext = createContext(null);

function detectDefaultLang() {
  const saved = localStorage.getItem("kn_lang");
  if (saved === "hi" || saved === "en") return saved;
  const browser = navigator.language || navigator.userLanguage || "";
  return browser.startsWith("hi") ? "hi" : "en";
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectDefaultLang);

  const setLang = useCallback((l) => {
    localStorage.setItem("kn_lang", l);
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
