import { QueryClient } from "@tanstack/react-query";

/**
 * Server state lives here: every `useData(path)` is one cached query. After a successful write everything is
 * refetched, so the data on screen is always the API's current answer.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 0, gcTime: 5 * 60_000, retry: false, refetchOnWindowFocus: false } },
});
