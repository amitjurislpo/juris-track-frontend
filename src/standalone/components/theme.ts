export type Theme = "light" | "dark";

export const currentTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

/** Applies the theme and remembers it in a cookie so the next visit starts in it. */
export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    document.cookie = `jt_theme=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  } catch {
    // cookies are blocked (a sandboxed frame): the theme still changes for this visit
  }
}
