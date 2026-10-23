import { useListQuery } from "@/track/components/list/useListQuery";
import { AUDIT_ACTION_GROUPS, AUDIT_ACTION_LABELS, actionLabel } from "@/track/lib/audit/audit-labels";
import { useTrack } from "@/track/TrackContext";

/**
 * The action filter (`?action=`): a group of actions (the API's prefix ending with a dot, `time.`) or one action of the catalogue.
 * A value from the URL that the list does not know (a hand-typed action) stays selectable.
 */
export function ActionFilter() {
  const { t } = useTrack();
  const { read, update } = useListQuery();
  const selectedAction = read("action");
  const isKnown = !selectedAction || AUDIT_ACTION_GROUPS.some((group) => group.prefix === selectedAction) || selectedAction in AUDIT_ACTION_LABELS;
  return (
    <label className="tsel">
      <span>{t("Action")}</span>
      <select value={selectedAction} onChange={(e) => update({ action: e.target.value || null })}>
        <option value="">{t("Any action")}</option>
        {!isKnown && <option value={selectedAction}>{actionLabel(selectedAction, t)}</option>}
        <optgroup label={t("Groups")}>
          {AUDIT_ACTION_GROUPS.map((group) => <option key={group.prefix} value={group.prefix}>{t("All: {group}", { group: t(group.label) })}</option>)}
        </optgroup>
        {AUDIT_ACTION_GROUPS.map((group) => (
          <optgroup key={group.prefix} label={t(group.label)}>
            {Object.keys(AUDIT_ACTION_LABELS).filter((action) => action.startsWith(group.prefix)).map((action) => (
              <option key={action} value={action}>{actionLabel(action, t)}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
