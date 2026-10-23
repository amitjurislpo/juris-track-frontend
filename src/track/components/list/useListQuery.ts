import { startTransition, useCallback, useMemo } from "react";
import { useTrack } from "@/track/TrackContext";

/**
 * The URL-backed state of a list page (search, filters, sorting, paging). Changing anything but `page` goes back to page 1.
 * The page's `useData(listPath(…))` then loads the new rows; the transition keeps the current rows on screen meanwhile.
 * The address comes from the host's router through the TrackContext.
 */
export function useListQuery() {
  const { navigate, location, readCurrentSearch } = useTrack();
  const { pathname, search } = location;
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);

  const read = useCallback((name: string, defaultValue = "") => searchParams.get(name) ?? defaultValue, [searchParams]);

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      // start from the address bar, not the router state: during a transition the state lags a change that was just made
      const nextParams = new URLSearchParams(readCurrentSearch());
      for (const [name, value] of Object.entries(changes)) {
        if (value === null || value === "") nextParams.delete(name);
        else nextParams.set(name, value);
      }
      if (!("page" in changes)) nextParams.delete("page");
      const queryString = nextParams.toString();
      startTransition(() => { navigate(queryString ? `${pathname}?${queryString}` : pathname, { replace: true, keepScroll: true }); });
    },
    [navigate, pathname, readCurrentSearch],
  );

  return { read, update };
}
