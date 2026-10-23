import { useSyncExternalStore } from "react";

/** The width (px) at or below which the sidebar becomes a drawer (`@media(max-width:980px)` in globals.css). */
const NARROW_SCREEN_QUERY = "(max-width: 980px)";

function subscribe(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(NARROW_SCREEN_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

/** True while the screen is narrow enough for the sidebar to be a drawer. */
export function useIsNarrowScreen(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(NARROW_SCREEN_QUERY).matches, () => false);
}
