/** Languages the UI is available in. To add one: add it here and create `messages/<code>.ts` (English text -> translation). */
export const LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "hi", label: "हिन्दी", short: "हि" },
] as const;

export type Lang = (typeof LANGUAGES)[number]["code"];
export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "jt_lang";

export const isLang = (value: unknown): value is Lang => LANGUAGES.some((language) => language.code === value);
