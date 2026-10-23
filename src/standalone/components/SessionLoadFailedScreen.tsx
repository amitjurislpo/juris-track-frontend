import { useT } from "@/standalone/i18n/client";
import { queryClient } from "@/standalone/query";
import { CURRENT_USER_QUERY_KEY } from "@/standalone/session";
import { Icon } from "@/track/components/Icon";

/**
 * Shown when "who am I?" could not be answered (the API is down or unreachable, a server error). The session is probably fine, so
 * the user is not sent to the sign-in page: they can try again.
 */
export function SessionLoadFailedScreen() {
  const t = useT();
  return (
    <main className="paused">
      <div className="empty" role="alert">
        <span className="otp-mail"><Icon name="lock" size={22} /></span>
        <b className="display">{t("We could not load your account")}</b>
        <span className="muted">{t("Could not reach the server. Please check your connection and try again.")}</span>
        <button type="button" className="btn btn-gold" style={{ marginTop: 12 }} onClick={() => { void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY }); }}>{t("Try again")}</button>
      </div>
    </main>
  );
}
