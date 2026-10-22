import { useT } from "@/standalone/i18n/client";
import { signOut } from "@/standalone/login/actions";
import { queryClient } from "@/standalone/query";
import { CURRENT_USER_QUERY_KEY } from "@/standalone/session";
import { Icon } from "@/track/components/Icon";

/**
 * Shown instead of the app while the user's business is suspended by the platform (the API answers 403 `BUSINESS_SUSPENDED`):
 * no broken pages, just what happened, a way to check again and a way to sign out (which still works).
 */
export function BusinessSuspendedScreen() {
  const t = useT();
  return (
    <main className="paused">
      <div className="empty" role="alert">
        <span className="otp-mail"><Icon name="lock" size={22} /></span>
        <b className="display">{t("Your company's access is paused")}</b>
        <span className="muted">{t("Your company's access to JurisTrack is suspended. Please contact support.")}</span>
        <span style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button type="button" className="btn" onClick={() => { void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY }); }}>{t("Try again")}</button>
          <button type="button" className="btn btn-gold" onClick={() => { void signOut(); }}><Icon name="logout" size={16} />{t("Sign out")}</button>
        </span>
      </div>
    </main>
  );
}
