/**
 * The language times, dates and durations are written in. The formatters (`format.ts`, `zone-names.ts`) are plain functions that
 * pages call in many places, so the language is set once by `TrackProvider` (from the host's `locale` and translator) instead of
 * being passed to every call. Without a provider (tests, plain scripts) it is English (en-GB), as the golden fixtures expect.
 */
const DEFAULT_LOCALE = "en-GB";

let currentLocale = DEFAULT_LOCALE;
type Translate = (text: string, variables?: Record<string, string | number>) => string;

const fillPlaceholders: Translate = (text, variables) =>
  variables ? text.replace(/\{(\w+)\}/g, (placeholder, name: string) => (name in variables ? String(variables[name]) : placeholder)) : text;

let currentTranslate: Translate = fillPlaceholders;

/** Sets the language of the formatters: a BCP 47 locale (`en-GB`, `hi-IN`) and the host's translator. */
export function setDisplayLanguage(locale: string, translate?: Translate): void {
  currentLocale = locale;
  if (translate) currentTranslate = translate;
}

/** Back to English (for tests). */
export function resetDisplayLanguage(): void {
  currentLocale = DEFAULT_LOCALE;
  currentTranslate = fillPlaceholders;
}

export const displayLocale = (): string => currentLocale;

/** A translated text of the formatters (a unit pattern such as "{minutes}m {seconds}s"). */
export const displayText = (text: string, variables?: Record<string, string | number>): string => currentTranslate(text, variables);
