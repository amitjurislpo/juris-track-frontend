import { navigate, standaloneApi } from "@/standalone/api";
import { safeNextPath } from "@/standalone/next-path";
import { queryClient } from "@/standalone/query";
import { CURRENT_USER_QUERY_KEY, fetchCurrentUser } from "@/standalone/session";
import { homeFor } from "@/track/roles";

// Sign-in flows run in the Spring Boot API (/api/auth/*): rate limits, lockout, audit and the session cookies (set by the
// API on the response; the browser keeps them). Signing in creates the session resource, signing out deletes it.

export interface FormState {
  error?: string;
  ok?: string;
  /** Echoed back so the field survives React resetting the form after an action. */
  email?: string;
}

/** Step 1 of the emailed-code sign-in: asks the API to email a 6-digit code (`POST /api/auth/otp-requests`). */
export async function requestSignInCode(_previousState: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").slice(0, 200);
  const response = await standaloneApi.call("POST", "/auth/otp-requests", { email });
  return response.body.ok ? { ok: response.body.message ?? "Code sent", email } : { error: response.body.error, email };
}

/** Step 2: exchanges the code for a session (`POST /api/auth/sessions`), then opens `next` or the role's landing page. */
export async function signIn(_previousState: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").slice(0, 200);
  const response = await standaloneApi.call("POST", "/auth/sessions", {
    email,
    otp: String(form.get("otp") ?? ""),
    remember: form.get("remember") === "on",
  });
  if (!response.body.ok) return { error: response.body.error, email };
  queryClient.clear();
  const user = await queryClient.fetchQuery({ queryKey: CURRENT_USER_QUERY_KEY, queryFn: fetchCurrentUser });
  if (!user) return { error: "Something went wrong. Please try again.", email };
  navigate(safeNextPath(String(form.get("next") ?? "")) ?? homeFor(user.role));
  return { ok: response.body.message ?? "Signed in", email };
}

/** Ends the session (`DELETE /api/auth/sessions/current`; the API clears the cookies) and goes to the sign-in page. */
export async function signOut() {
  await standaloneApi.call("DELETE", "/auth/sessions/current");
  queryClient.clear();
  navigate("/login?signedout=1");
}
