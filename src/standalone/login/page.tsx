import { useMemo } from "react";
import { Navigate, useSearchParams } from "react-router";
import { AuthFrame } from "@/standalone/auth/AuthFrame";
import { LoginForm } from "@/standalone/auth/LoginForm";
import { useT } from "@/standalone/i18n/client";
import { useCurrentUser } from "@/standalone/session";
import { homeFor } from "@/track/roles";

/** The fixed sign-in code of a development/e2e API (VITE_DEV_OTP_CODE at build time). Left unset in every real environment. */
const DEV_CODE = (import.meta.env.VITE_DEV_OTP_CODE as string | undefined) || undefined;

export default function LoginPage() {
  const { user } = useCurrentUser();
  const t = useT();
  const [searchParams] = useSearchParams();
  const searchString = searchParams.toString();
  const queryParameters = useMemo(() => Object.fromEntries(new URLSearchParams(searchString).entries()), [searchString]);
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  const notice = queryParameters.signedout ? t("Signed out securely.") : undefined;
  return (
    <AuthFrame>
      <LoginForm notice={notice} next={queryParameters.next} devCode={DEV_CODE} />
    </AuthFrame>
  );
}
