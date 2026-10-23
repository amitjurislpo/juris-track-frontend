import { useId, useState } from "react";
import { Icon } from "@/track/components/Icon";
import { exportFallbackFileName } from "@/track/lib/report-query";
import { fileNameFromContentDisposition, saveFile } from "@/track/lib/file-download";
import { problemMessage } from "@/track/lib/problems";
import { zoneAbbreviation } from "@/track/lib/time/zone-names";
import { useTrack } from "@/track/TrackContext";
import { downloadWorkdayReportCsv } from "./actions";

/**
 * "Export CSV": downloads the workday report of the current filters as the API builds it (English, times in the chosen display
 * time zone), saved under the file name the API gives. Disabled while the file is on its way; a refusal (400, 403, 404, 422
 * `EXPORT_TOO_LARGE`) is shown as a toast.
 */
export function ExportCsvButton({ searchParams, timeZone, from, to }: { searchParams: Record<string, string>; timeZone: string; from: string; to: string }) {
  const { t, toast } = useTrack();
  const noteId = useId();
  const [isExporting, setIsExporting] = useState(false);
  const exportCsv = async () => {
    setIsExporting(true);
    try {
      const result = await downloadWorkdayReportCsv(searchParams, timeZone);
      if (result.ok) {
        saveFile(result.blob, fileNameFromContentDisposition(result.contentDisposition, exportFallbackFileName(from, to)));
        toast(t("The CSV file is downloading."));
      } else {
        // a 400 names the parameter that was wrong (e.g. a time zone the business does not offer); show that, not the general detail
        toast(result.errors?.[0]?.message ?? problemMessage(result, t), "bad");
      }
    } catch {
      toast(t("The export could not be downloaded. Check your connection and try again."), "bad");
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <div className="export-csv">
      <button type="button" className="btn" onClick={() => void exportCsv()} disabled={isExporting} aria-busy={isExporting} aria-describedby={noteId}>
        <Icon name="download" size={15} />{isExporting ? t("Exporting…") : t("Export CSV")}
      </button>
      <span id={noteId} className="export-note">{t("The file is in English, with times in {zone}.", { zone: `${zoneAbbreviation(timeZone)} (${timeZone})` })}</span>
    </div>
  );
}
