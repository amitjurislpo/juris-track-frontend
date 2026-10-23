import { useEffect, type ReactNode } from "react";
import { homeFor, type Role } from "./roles";
import { useTrack } from "./TrackContext";

/** Route guard: the signed-in user's role must be one of `roles`, else they go to their own landing page. The API enforces the role too; this only keeps people out of screens that would show nothing. */
export function RequireRole({ roles, children }: { roles: readonly Role[]; children: ReactNode }) {
  const { user, navigate } = useTrack();
  const isAllowed = roles.includes(user.role);
  useEffect(() => { if (!isAllowed) navigate(homeFor(user.role), { replace: true }); }, [isAllowed, navigate, user.role]);
  return isAllowed ? children : null;
}
