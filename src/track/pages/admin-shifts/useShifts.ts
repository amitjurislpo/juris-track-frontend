import type { ListPage, Shift } from "@/track/api-types";
import { useData } from "@/track/usePage";

/**
 * The business's shifts (`GET /shifts`), by start time as the API orders them. `isActive: true` leaves out the deactivated ones
 * (what a select offers). The answer is read as a plain list or as a page of rows, whichever the API sends.
 */
export function useShifts(options: { isActive?: boolean } = {}): Shift[] {
  const query = options.isActive === undefined ? "" : `?isActive=${options.isActive}`;
  const data = useData<Shift[] | ListPage<Shift>>(`/shifts${query}`);
  if (!data) return [];
  return Array.isArray(data) ? data : data.rows;
}
