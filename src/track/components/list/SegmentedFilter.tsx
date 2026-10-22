import type { FilterOption } from "./SelectFilter";
import { useListQuery } from "./useListQuery";

/** A segmented filter (design `.seg`) bound to `?<name>=`; choosing `defaultValue` removes the parameter. */
export function SegmentedFilter({ name, label, options, defaultValue }: { name: string; label: string; options: FilterOption[]; defaultValue: string }) {
  const { read, update } = useListQuery();
  const selectedValue = read(name, defaultValue);
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" className={selectedValue === option.value ? "on" : undefined} aria-pressed={selectedValue === option.value}
          onClick={() => update({ [name]: option.value === defaultValue ? null : option.value })}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
