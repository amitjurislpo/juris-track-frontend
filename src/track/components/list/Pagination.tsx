import { pageRange } from "@/track/lib/list-query";
import { useTrack } from "@/track/TrackContext";
import { useEffect } from "react";
import { Icon } from "../Icon";
import { useListQuery } from "./useListQuery";

/** "1–25 of 40" with Previous / Next, bound to `?page=`. Hidden when everything fits on one page. */
export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const { t } = useTrack();
  const { update } = useListQuery();
  const { from, to, lastPage, shownPage } = pageRange(page, pageSize, total);
  // a page beyond the last one (a bookmarked address, or the last row of the last page went away) has no rows: go to the last page
  const isBeyondLastPage = total > 0 && page > lastPage;
  useEffect(() => { if (isBeyondLastPage) update({ page: lastPage > 1 ? String(lastPage) : null }); }, [isBeyondLastPage, lastPage, update]);
  if (total <= pageSize && page <= 1) return null;
  return (
    <nav className="pager" aria-label={t("Pages")}>
      <span className="mono">{t("{from}–{to} of {total}", { from, to, total })}</span>
      <span style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-sm" type="button" disabled={shownPage <= 1} onClick={() => update({ page: shownPage - 1 > 1 ? String(shownPage - 1) : null })}>
          <Icon name="chevL" size={14} />{t("Previous")}
        </button>
        <button className="btn btn-sm" type="button" disabled={shownPage >= lastPage} onClick={() => update({ page: String(shownPage + 1) })}>
          {t("Next")}<Icon name="chevR" size={14} />
        </button>
      </span>
    </nav>
  );
}
