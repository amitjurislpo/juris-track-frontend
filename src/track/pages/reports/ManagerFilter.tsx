import { SelectFilter } from "@/track/components/list/SelectFilter";
import { useTrack } from "@/track/TrackContext";
import type { ReportManager } from "./useReportManagers";

/** The owner's manager filter (`?managerId=`): only the workdays whose manager of the day was this person. */
export function ManagerFilter({ managers, selectedId }: { managers: ReportManager[]; selectedId: string | undefined }) {
  const { t } = useTrack();
  const options = [
    { value: "", label: t("Any manager") },
    ...managers.map((manager) => ({ value: manager.id, label: manager.isActive ? manager.name : t("{name} (inactive)", { name: manager.name }) })),
  ];
  // a manager not in the list (still loading, or beyond the first 100) stays chosen
  if (selectedId && !managers.some((manager) => manager.id === selectedId)) options.push({ value: selectedId, label: t("Selected manager") });
  return <SelectFilter name="managerId" label={t("Manager")} defaultValue="" options={options} />;
}
