import { Icon } from "@/track/components/Icon";
import { BrandLockup } from "@/standalone/components/BrandLockup";
import { LanguageSwitcher } from "@/standalone/components/LanguageSwitcher";
import { useT } from "@/standalone/i18n/client";

/** Login layout from the prototype: form column + animated art panel. */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  const t = useT();
  return (
    <div className="login">
      <section className="login-form-wrap">
        <div className="brandmark">
          <BrandLockup product="JURIS TRACK" />
          <span style={{ marginLeft: "auto" }}><LanguageSwitcher /></span>
        </div>
        {children}
        <div className="faint" style={{ fontSize: 12.5, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span>© {new Date().getFullYear()} JurisTrack</span>
          <span>{t("Privacy")} · {t("Help desk")}</span>
        </div>
      </section>
      <section className="login-art" aria-hidden="true">
        <div className="mesh"><i></i><i></i><i></i><i></i></div>
        <div className="gridlines"></div>
        <div className="grain"></div>
        <div className="copy">
          <span className="pill-glass"><i className="dot live" style={{ color: "#7CFFB2" }}></i>{t("Start · Break · Resume · End day")}</span>
          <h1 className="display">{t("Every working hour,")}<br />{t("clearly counted.")}</h1>
          <p>{t("One place for your team to track the workday, take breaks and see productive hours.")}</p>
        </div>
        <div className="mock">
          <div className="glass a">
            <small>Today</small>
            <div className="mono" style={{ fontSize: 34, fontWeight: 500, margin: "6px 0 10px" }}>04:28:12</div>
            <div style={{ height: 6, borderRadius: 9, background: "rgba(255,255,255,.2)" }}>
              <div style={{ width: "50%", height: "100%", borderRadius: 9, background: "#fff" }}></div>
            </div>
          </div>
          <div className="glass b" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#7CFFB2", color: "#0D3B24", display: "grid", placeItems: "center", flex: "none" }}>
              <Icon name="ok" size={16} />
            </span>
            <div><b style={{ fontSize: 14 }}>Workday started</b><br /><small>Productive time is counting</small></div>
          </div>
        </div>
        <div className="foot"><span>{t("Role-based access")}</span><span>·</span><span>{t("Live team board")}</span><span>·</span><span>{t("Works on any device")}</span></div>
      </section>
    </div>
  );
}
