import { apiFile } from "@/track/api";
import { workdayExportPath } from "@/track/lib/report-query";

/**
 * The CSV of the report the URL shows: `GET /reports/workdays` with `Accept: text/csv`, the same filters and order, every row,
 * times in `timeZone` (the chosen display time zone). The API builds the file; errors come back as problem details.
 */
export function downloadWorkdayReportCsv(searchParams: Record<string, string>, timeZone: string) {
  return apiFile(workdayExportPath(searchParams, timeZone), "text/csv");
}
