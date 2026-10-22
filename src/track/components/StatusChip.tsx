/** A status badge (design `.chip`): green for a good state, red for a stopped one. `label` is already translated. */
export function StatusChip({ isGood, label }: { isGood: boolean; label: string }) {
  return <span className={`chip ${isGood ? "ok" : "bad"}`}>{label}</span>;
}
