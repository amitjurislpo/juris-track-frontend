import { startTransition, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

/**
 * The URL-backed state of a list page (search, filters, sorting, paging). Changing anything but `page` goes back to page 1.
 * The page's `useData(listPath(…))` then loads the new rows; the transition keeps the current rows on screen meanwhile.
 */
export function useListQuery() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();

  const read = useCallback((name: string, defaultValue = "") => searchParams.get(name) ?? defaultValue, [searchParams]);

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      // start from the browser's URL, not the router state: during a transition the state lags a change that was just made
      const nextParams = new URLSearchParams(window.location.search);
      for (const [name, value] of Object.entries(changes)) {
        if (value === null || value === "") nextParams.delete(name);
        else nextParams.set(name, value);
      }
      if (!("page" in changes)) nextParams.delete("page");
      const queryString = nextParams.toString();
      startTransition(() => { void navigate(queryString ? `${pathname}?${queryString}` : pathname, { replace: true, preventScrollReset: true }); });
    },
    [navigate, pathname],
  );

  return { read, update };
}
