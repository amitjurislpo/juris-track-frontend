/** Languages the UI is available in. To add one: add it here and create `messages/<code>.ts` (English text -> translation). */
export const LANGUAGES = [
  { code: "en", label: "English", short: "EN", locale: "en-GB" },
  { code: "hi", label: "हिन्दी", short: "हि", locale: "hi-IN" },
] as const;

export type Lang = (typeof LANGUAGES)[number]["code"];
export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "jt_lang";

/** The BCP 47 locale dates and times are written in for a language. */
export const localeOf = (lang: Lang): string => LANGUAGES.find((language) => language.code === lang)?.locale ?? "en-GB";

export const isLang = (value: unknown): value is Lang => LANGUAGES.some((language) => language.code === value);
