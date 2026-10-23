/** Control characters (tab, newline, DEL…): URL parsers drop them, so "/<tab>/evil.test" would become "//evil.test". */
const hasControlCharacter = (text: string): boolean => [...text].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);

/** The page to open after sign-in: the `next` parameter when it is a path inside this app, else null (never an outside address). */
export function safeNextPath(next: string | undefined | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || hasControlCharacter(next)) return null;
  if (next === "/login" || next.startsWith("/login?") || next.startsWith("/login/")) return null;
  return next;
}
