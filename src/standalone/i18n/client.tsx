import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { type Lang } from "./config";
import { readLang, writeLang } from "./lang";
import { translator, type T } from "./translate";

const LangContext = createContext<{ lang: Lang; setLang: (language: Lang) => void }>({ lang: "en", setLang: () => {} });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const language = readLang();
    document.documentElement.lang = language;
    return language;
  });
  const setLang = useCallback((language: Lang) => {
    writeLang(language);
    setLangState(language);
  }, []);
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext).lang;
export const useSetLang = () => useContext(LangContext).setLang;

/** Translator for components: `const t = useT(); t("Sign out")`. */
export function useT(): T {
  const lang = useContext(LangContext).lang;
  return useMemo(() => translator(lang), [lang]);
}
