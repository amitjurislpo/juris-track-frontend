import { SelectFilter } from "@/track/components/list/SelectFilter";
import { useTrack } from "@/track/TrackContext";
import { useManagerOptions } from "../admin-employees/useManagerOptions";

/** The owner's filter for the people of one manager (`?managerId=`). The manager list is for the owner to read, so only the owner gets this. */
export function RosterManagerFilter() {
  const { t } = useTrack();
  const managers = useManagerOptions();
  return (
    <SelectFilter name="managerId" label={t("Manager")} defaultValue=""
      options={[{ value: "", label: t("Anyone") }, ...managers.map((manager) => ({ value: manager.id, label: manager.name }))]} />
  );
}
