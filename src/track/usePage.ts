import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { apiData } from "./api";
import { useSearchRecord } from "./router";
import { useTrack, type TrackContextValue } from "./TrackContext";

/**
 * What a page needs: the signed-in user, the translator, the URL search params and the route params.
 *   const { user, t, searchParams, params } = usePage();   (the route already checked the role, see RequireRole)
 */
export function usePage(): Pick<TrackContextValue, "user" | "t"> & { searchParams: Record<string, string>; params: Record<string, string> } {
  const { user, t } = useTrack();
  const searchParams = useSearchRecord();
  const params = useParams() as Record<string, string>;
  return { user, t, searchParams, params };
}

/**
 * One GET against the API (`path` is relative to the API base path), cached and refetched after any write. The first load
 * suspends; errors go to the host's error boundary. `path` null means "not yet" and gives `undefined`.
 */
export function useData<T>(path: string | null): T | undefined {
  const query = useSuspenseQuery({
    queryKey: ["track", path],
    queryFn: async () => (path === null ? null : await apiData<T>(path)),
  });
  return (query.data ?? undefined) as T | undefined;
}
