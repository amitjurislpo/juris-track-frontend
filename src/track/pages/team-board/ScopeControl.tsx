import { useListQuery } from "@/track/components/list/useListQuery";
import { scopeSearchChange, selectedScope, type TeamScope } from "@/track/lib/team-board-query";
import { useTrack } from "@/track/TrackContext";

/** The labels of the owner's scopes (translation keys). */
const OWNER_SCOPE_LABELS: Record<TeamScope, string> = {
  all: "Everybody",
  direct: "My direct reports",
  indirect: "My reporting line",
};

/**
 * Whose people the board shows, kept in the URL as `scope`. A manager: their direct reports, or with "Include indirect reports"
 * also the people who report to those. The owner: everybody (the default), or only their own reporting line.
 */
export function ScopeControl() {
  const { user, t } = useTrack();
  const { read, update } = useListQuery();
  const scope = selectedScope(user.role, read("scope"));
  if (user.role === "ADMIN") {
    return (
      <div className="seg seg-scroll" role="group" aria-label={t("Show")}>
        {(["all", "direct", "indirect"] as const).map((option) => (
          <button key={option} type="button" className={scope === option ? "on" : undefined} aria-pressed={scope === option}
            onClick={() => update(scopeSearchChange(user.role, option))}>
            {t(OWNER_SCOPE_LABELS[option])}
          </button>
        ))}
      </div>
    );
  }
  const isIncludingIndirect = scope === "indirect";
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
      <button type="button" className="switch" role="switch" aria-checked={isIncludingIndirect}
        onClick={() => update(scopeSearchChange(user.role, isIncludingIndirect ? "direct" : "indirect"))}>
        <i aria-hidden="true"></i>
      </button>
      {t("Include indirect reports")}
    </label>
  );
}
