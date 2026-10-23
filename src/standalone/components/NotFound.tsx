import { Link } from "react-router";
import { useT } from "@/standalone/i18n/client";

/** Outside the app shell (an address no page has), so it keeps its own margins and a way back to the user's landing page. */
export function NotFound() {
  const t = useT();
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 16px" }}>
      <div className="empty">
        <b className="display">{t("Page not found")}</b>
        <span className="muted">{t("This page doesn't exist, or you don't have access to it.")}</span>
        <Link className="btn btn-primary" to="/" style={{ marginTop: 12 }}>{t("Go to my home page")}</Link>
      </div>
    </main>
  );
}
