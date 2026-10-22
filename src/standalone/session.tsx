import { useQuery } from "@tanstack/react-query";
import type { TrackUser } from "@/track/TrackContext";
import { standaloneApi } from "./api";

/**
 * The signed-in user: the answer of `GET /api/me`. This is a contract the backend implements:
 * `{ id, firstName, lastName, email, role, businessName }` (`role` includes SUPER_ADMIN, whose `businessName` is null) (inside the usual `{ ok: true, data }` envelope), 401 when signed out.
 */
export type CurrentUser = TrackUser;

export const CURRENT_USER_QUERY_KEY = ["standalone", "me"];

export const fetchCurrentUser = () => standaloneApi.get<CurrentUser>("/me");

/** First and last name together, for the top bar. */
export const fullNameOf = (user: CurrentUser) => `${user.firstName} ${user.lastName}`.trim();

/**
 * The signed-in user, or null when signed out. The API validates the session on every request, so this is re-fetched
 * whenever data is invalidated. `isLoading` is true until the first answer.
 */
export function useCurrentUser(): { user: CurrentUser | null; isLoading: boolean } {
  const query = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    // keep showing the user while a refetch runs
    placeholderData: (previousUser) => previousUser,
  });
  return { user: query.data ?? null, isLoading: query.isPending };
}
