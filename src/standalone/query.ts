import { QueryClient } from "@tanstack/react-query";

/**
 * Server state lives here: every `useData(path)` is one cached query. After a successful write everything is
 * refetched, so the data on screen is always the API's current answer. `networkMode: "always"`: a read is tried even when the browser
 * says it is offline (the default pauses it, which left the old rows on screen with no message); a failed one reaches the page's
 * error boundary with a retry.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 0, gcTime: 5 * 60_000, retry: false, networkMode: "always", refetchOnWindowFocus: false } },
});
