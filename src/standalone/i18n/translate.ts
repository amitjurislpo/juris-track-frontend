import { trackHindiApiMessages } from "@/track/messages/hi-api";
import { trackHindiMessages } from "@/track/messages/hi";
import { DEFAULT_LANG, type Lang } from "./config";
import { standaloneHindiMessages } from "./messages/hi";

/** The Hindi dictionary: the JurisTrack pages' texts and API messages, and this app's own. */
export const HINDI_MESSAGES: Record<string, string> = { ...trackHindiApiMessages, ...trackHindiMessages, ...standaloneHindiMessages };

const DICTIONARIES: Record<Lang, Record<string, string>> = { en: {}, hi: HINDI_MESSAGES };

export type Vars = Record<string, string | number>;

/**
 * The English text is the key: a missing translation simply shows the English text, so strings can be wrapped
 * one page at a time. `{name}` placeholders are filled from `vars`.
 */
export function translate(lang: Lang, text: string, vars?: Vars): string {
  const out = (lang !== DEFAULT_LANG && DICTIONARIES[lang]?.[text]) || text;
  return vars ? out.replace(/\{(\w+)\}/g, (match, placeholderName: string) => (placeholderName in vars ? String(vars[placeholderName]) : match)) : out;
}

export type T = (text: string, vars?: Vars) => string;

export const translator = (lang: Lang): T => (text, vars) => translate(lang, text, vars);
