import { useT } from "@/standalone/i18n/client";

export function NotFound() {
  const t = useT();
  return (
    <div className="empty">
      <b className="display">{t("Page not found")}</b>
      <span className="muted">{t("This page doesn't exist, or you don't have access to it.")}</span>
    </div>
  );
}
