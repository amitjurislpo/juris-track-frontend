import { useTrack } from "../TrackContext";
import { PageHeader } from "./PageHeader";

/** Placeholder body of a page that is built in a later phase: the page title and a "Coming soon" card. */
export function ComingSoon({ title }: { title: string }) {
  const { t } = useTrack();
  return (
    <>
      <PageHeader eyebrow="JurisTrack" title={t(title)} />
      <div className="empty enter" style={{ ["--i" as string]: 2 }}>
        <b className="display">{t("Coming soon")}</b>
        <span className="muted">{t("This page is being built and will be available in a later release.")}</span>
      </div>
    </>
  );
}
