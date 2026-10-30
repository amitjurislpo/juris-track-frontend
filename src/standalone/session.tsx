import { useQuery } from "@tanstack/react-query";
import { ApiError, BUSINESS_SUSPENDED } from "@/track/api";
import type { TrackUser } from "@/track/TrackContext";
import { standaloneApi } from "./api";

/**
 * The signed-in user: the answer of `GET /api/v1/me`. This is a contract the backend implements:
 * `{ id, firstName, lastName, email, role, businessName, employeeCode, managerName, businessTimeZone }` (`role` includes SUPER_ADMIN,
 * whose `businessName` and `businessTimeZone` are null) inside the usual `{ ok: true, data }` envelope; 401 when signed out, 403
 * `BUSINESS_SUSPENDED` when the user's business is suspended.
 */
export type CurrentUser = TrackUser;

export const CURRENT_USER_QUERY_KEY = ["standalone", "me"];

export const fetchCurrentUser = () => standaloneApi.get<CurrentUser>("/me");

/** First and last name together, for the top bar. */
export const fullNameOf = (user: CurrentUser) => `${user.firstName} ${user.lastName}`.trim();

/**
 * The signed-in user, or null when signed out. The API validates the session on every request, so this is re-fetched
 * whenever data is invalidated. `isLoading` is true until the first answer. `hasLoadFailed`: the answer could not be read (API down, network, server error) and there is no earlier one: not the same as signed out. `isBusinessSuspended`: signed in, but the
 * platform has suspended the user's business (then `user` is null and the app shows the "access is paused" screen).
 */
export function useCurrentUser(): { user: CurrentUser | null; isLoading: boolean; isBusinessSuspended: boolean; hasLoadFailed: boolean } {
  const query = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    // keep showing the user while a refetch runs
    placeholderData: (previousUser) => previousUser,
  });
  const isBusinessSuspended = query.error instanceof ApiError && query.error.code === BUSINESS_SUSPENDED;
  const hasLoadFailed = query.isError && !isBusinessSuspended && !query.data;
  return { user: isBusinessSuspended ? null : (query.data ?? null), isLoading: query.isPending, isBusinessSuspended, hasLoadFailed };
}
