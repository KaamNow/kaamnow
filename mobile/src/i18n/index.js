import { useLanguage } from "../contexts/LanguageContext";
import T from "./translations";

/**
 * useTranslation — the single hook every component uses for strings.
 *
 * Usage:
 *   const { t, lang } = useTranslation();
 *   <Text>{t('nav_home')}</Text>
 *   <Text>{t('landing_hello', { name: user.name })}</Text>
 *
 * Fallback chain: selected language → English → raw key
 * Variable substitution: t('wallet_credit', { amount: 100 }) → "+ ₹100"
 */
export function useTranslation() {
  const { lang } = useLanguage();

  const t = (key, vars = {}) => {
    const raw = T[lang]?.[key] ?? T.en?.[key] ?? key;
    if (!vars || Object.keys(vars).length === 0) return raw;
    return Object.entries(vars).reduce(
      (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
      raw
    );
  };

  return { t, lang };
}

export default useTranslation;
