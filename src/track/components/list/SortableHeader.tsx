import type { ReactNode } from "react";
import { nextSortDirection, type SortDirection } from "@/track/lib/list-query";
import { useListQuery } from "./useListQuery";

/** A column header that sorts the list by `sortKey` (`?sort=&sortDirection=`); clicking it again flips the direction. */
export function SortableHeader({ sortKey, defaultSort, children, className }: { sortKey: string; defaultSort: string; children: ReactNode; className?: string }) {
  const { read, update } = useListQuery();
  const currentSort = read("sort", defaultSort);
  const currentDirection: SortDirection = read("sortDirection") === "desc" ? "desc" : "asc";
  const isSorted = currentSort === sortKey;
  return (
    <th className={className} aria-sort={isSorted ? (currentDirection === "asc" ? "ascending" : "descending") : "none"}>
      <button className="sh" type="button" onClick={() => update({ sort: sortKey, sortDirection: nextSortDirection(currentSort, currentDirection, sortKey) })}>
        {children}
        <i aria-hidden="true">{isSorted ? (currentDirection === "asc" ? "↑" : "↓") : "↕"}</i>
      </button>
    </th>
  );
}
