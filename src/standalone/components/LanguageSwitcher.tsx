
import { LANGUAGES } from "@/standalone/i18n/config";
import { useLang, useSetLang, useT } from "@/standalone/i18n/client";
import { isLang } from "@/standalone/i18n/config";

/** Language picker: stores the choice in a cookie and re-renders the page in that language. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const lang = useLang();
  const t = useT();
  const setLang = useSetLang();
  return (
    <select
      className={`lang-switch ${className}`.trim()}
      value={lang}
      aria-label={t("Language")}
      onChange={(e) => { if (isLang(e.target.value)) setLang(e.target.value); }}
    >
      {LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
    </select>
  );
}
