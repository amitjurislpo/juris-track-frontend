import { useLocation } from "react-router";
import { ROLES, homeFor } from "../roles";
import { useTrack } from "../TrackContext";
import { Icon } from "./Icon";

/** Where each role lands after sign-in: these pages have nothing to go back to. */
const LANDING_PATHS = ["/", ...ROLES.map(homeFor)];

/**
 * Page header: eyebrow, display title, subtitle, actions. Every page but a landing page gets a Back button: to `back`
 * (the parent page) when given, else to the previous page.
 */
export function PageHeader({ back, eyebrow, title, sub, children }: { back?: string; eyebrow: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  const { t, navigate } = useTrack();
  const { pathname } = useLocation();
  const goBack = () => { if (back) navigate(back); else if ((window.history.state as { idx?: number } | null)?.idx) navigate(-1); else navigate("/"); };
  return (
    <div className="page-h enter">
      <div>
        <div className="page-top">
          {(back || !LANDING_PATHS.includes(pathname)) && (
            <button type="button" className="back-btn" onClick={goBack}><Icon name="chevL" size={14} />{t("Back")}</button>
          )}
          <span className="eyebrow">{eyebrow}</span>
        </div>
        <h1 className="display">{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>{children}</div>}
    </div>
  );
}
