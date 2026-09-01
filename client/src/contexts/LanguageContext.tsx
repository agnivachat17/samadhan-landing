import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { en } from "@/lib/i18n/en";
import { hi } from "@/lib/i18n/hi";

export type Language = "en" | "hi" | "sat";
export const STORAGE_KEY = "samadhan-language";

export type TranslationKey = keyof typeof en;

// Santali has no hand-written dictionary (see AutoTranslate.tsx) — every string
// that would come from a dictionary lookup is left in English here and picked
// up by the live-translate layer instead, same as any other English text on
// the page. Only en/hi have curated static dictionaries.
const dictionaries: Partial<Record<Language, Record<TranslationKey, string>>> =
  {
    en: en as Record<TranslationKey, string>,
    hi: hi as Record<TranslationKey, string>,
  };

interface LanguageContextValue {
  language: Language;
  hasChosen: boolean;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

function getInitial(): { language: Language; hasChosen: boolean } {
  if (typeof window === "undefined")
    return { language: "en", hasChosen: false };
  const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
  if (stored === "en" || stored === "hi" || stored === "sat")
    return { language: stored, hasChosen: true };
  return { language: "en", hasChosen: false };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(getInitial);

  useEffect(() => {
    document.documentElement.lang = state.language;
    document.documentElement.dataset.lang = state.language;
    if (state.hasChosen) {
      localStorage.setItem(STORAGE_KEY, state.language);
    }
  }, [state.language, state.hasChosen]);

  const setLanguage = useCallback((lang: Language) => {
    setState({ language: lang, hasChosen: true });
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const dict = dictionaries[state.language];
      return (dict?.[key] ?? en[key] ?? key) as string;
    },
    [state.language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language: state.language,
        hasChosen: state.hasChosen,
        setLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
