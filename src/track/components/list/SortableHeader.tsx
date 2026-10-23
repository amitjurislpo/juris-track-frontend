import type { ReactNode } from "react";
import { sortChangeOf, type SortDirection } from "@/track/lib/list-query";
import { useTrack } from "@/track/TrackContext";
import { useListQuery } from "./useListQuery";

/**
 * A column header that sorts the list by `sortKey` (`?sort=&sortDirection=`); clicking it again flips the direction.
 * `defaultDirection` is the endpoint's direction when the URL names none (`asc` for most lists, `desc` for the history).
 */
export function SortableHeader({ sortKey, defaultSort, defaultDirection = "asc", children, className }: {
  sortKey: string;
  defaultSort: string;
  defaultDirection?: SortDirection;
  children: ReactNode;
  className?: string;
}) {
  const { readCurrentSearch } = useTrack();
  const { read, update } = useListQuery();
  const currentSort = read("sort", defaultSort);
  const directionInUrl = read("sortDirection");
  const currentDirection: SortDirection = directionInUrl === "desc" || directionInUrl === "asc" ? directionInUrl : defaultDirection;
  const isSorted = currentSort === sortKey;
  return (
    <th className={className} aria-sort={isSorted ? (currentDirection === "asc" ? "ascending" : "descending") : "none"}>
      <button className="sh" type="button" onClick={() => update(sortChangeOf(readCurrentSearch(), sortKey, defaultSort, defaultDirection))}>
        {children}
        <i aria-hidden="true">{isSorted ? (currentDirection === "asc" ? "↑" : "↓") : "↕"}</i>
      </button>
    </th>
  );
}
