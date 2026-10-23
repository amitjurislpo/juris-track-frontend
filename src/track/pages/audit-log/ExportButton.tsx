import { useState } from "react";
import { Icon } from "@/track/components/Icon";
import { isExportTooLarge, MAXIMUM_EXPORT_ROWS } from "@/track/lib/audit/audit-query";
import { useTrack } from "@/track/TrackContext";
import { auditLogExportPath } from "./actions";

/**
 * "Export CSV": a plain link to `GET /audit-logs?format=csv` with the current filters and sort, so the browser downloads the file
 * itself with the session cookie (the backend names it `audit-log-<date>.csv`).
 *
 * The API refuses an export of more than 10,000 entries (422 `EXPORT_TOO_LARGE`). The list on screen has the same filter, so its
 * `total` is the export's row count: when it is over the cap the link is not followed and the same explanation is shown here, and
 * no request is sent (a probe request would itself run, and audit, the export). Only if the log grows past the cap between loading
 * the list and the click does the browser report a failed download.
 */
export function ExportButton({ searchParams, isPlatform, total, onExported }: {
  searchParams: Record<string, string>;
  isPlatform: boolean;
  /** The number of entries of the current filter (all pages). */
  total: number;
  /** Called after the download started (the export writes an `audit.exported` entry that the list can show). */
  onExported: () => void;
}) {
  const { t, apiBasePath } = useTrack();
  const [isRefused, setIsRefused] = useState(false);
  const href = `${apiBasePath}${auditLogExportPath(searchParams, isPlatform)}`;
  return (
    <span className="export-wrap">
      <a className="btn" href={href} download
        onClick={(e) => {
          if (isExportTooLarge(total)) { e.preventDefault(); setIsRefused(true); return; }
          setIsRefused(false);
          onExported();
        }}>
        <Icon name="download" size={15} />{t("Export CSV")}
      </a>
      {isRefused && isExportTooLarge(total) && (
        <span className="notice warn export-refused" role="alert">
          <b>{t("Too many entries to export")}</b>
          <span>{t("The export would hold {total} entries; narrow the filters to at most {maximum}.", { total: total.toLocaleString("en-IN"), maximum: MAXIMUM_EXPORT_ROWS.toLocaleString("en-IN") })}</span>
        </span>
      )}
    </span>
  );
}
