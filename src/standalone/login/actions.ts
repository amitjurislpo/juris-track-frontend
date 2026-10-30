import { navigate, standaloneApi } from "@/standalone/api";
import { readLang } from "@/standalone/i18n/lang";
import { translate } from "@/standalone/i18n/translate";
import { safeNextPath } from "@/standalone/next-path";
import { queryClient } from "@/standalone/query";
import { CURRENT_USER_QUERY_KEY, fetchCurrentUser } from "@/standalone/session";
import { homeFor } from "@/track/roles";

// Sign-in flows run in the Spring Boot API (/api/v1/auth/*): rate limits, lockout, audit and the session cookies (set by the
// API on the response; the browser keeps them). Signing in creates the session resource, signing out deletes it.

const somethingWentWrong = () => translate(readLang(), "Something went wrong. Please try again.");

export interface FormState {
  error?: string;
  ok?: string;
  /** Echoed back so the field survives React resetting the form after an action. */
  email?: string;
}

/** Step 1 of the emailed-code sign-in: asks the API to email a 6-digit code (`POST /api/v1/auth/otp-requests`). */
export async function requestSignInCode(_previousState: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").slice(0, 200);
  const response = await standaloneApi.call("POST", "/auth/otp-requests", { email });
  return response.body.ok ? { ok: response.body.message ?? "Code sent", email } : { error: response.body.error, email };
}

/** Step 2: exchanges the code for a session (`POST /api/v1/auth/sessions`), then opens `next` or the role's landing page. */
export async function signIn(_previousState: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").slice(0, 200);
  const response = await standaloneApi.call("POST", "/auth/sessions", {
    email,
    otp: String(form.get("otp") ?? ""),
    remember: true, // every sign-in needs an emailed code, so there is no choice to make: the session lasts the full 30 days
  });
  if (!response.body.ok) return { error: response.body.error, email };
  queryClient.clear();
  let user;
  try {
    user = await queryClient.fetchQuery({ queryKey: CURRENT_USER_QUERY_KEY, queryFn: fetchCurrentUser });
  } catch (error) {
    // signed in, but the profile could not be read (suspended business, API trouble): say so here, never throw out of the form action
    return { error: error instanceof Error ? error.message : somethingWentWrong(), email };
  }
  if (!user) return { error: somethingWentWrong(), email };
  navigate(safeNextPath(String(form.get("next") ?? "")) ?? homeFor(user.role));
  return { ok: response.body.message ?? "Signed in", email };
}

/**
 * Ends the session (`DELETE /api/v1/auth/sessions/current`; the API clears the cookies) and goes to the sign-in page. When the API
 * cannot be reached the user still leaves: the local data is dropped and the session ends by itself when its cookie expires.
 */
export async function signOut() {
  await standaloneApi.call("DELETE", "/auth/sessions/current");
  queryClient.clear();
  navigate("/login?signedout=1");
}
