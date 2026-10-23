import type { FilterOption } from "./SelectFilter";
import { useListQuery } from "./useListQuery";

/**
 * A segmented filter (design `.seg`) bound to `?<name>=`; choosing `defaultValue` removes the parameter. `isScrollable`: many
 * options scroll sideways inside the control on a narrow screen instead of widening the page.
 */
export function SegmentedFilter({ name, label, options, defaultValue, isScrollable = false }: {
  name: string;
  label: string;
  options: FilterOption[];
  defaultValue: string;
  isScrollable?: boolean;
}) {
  const { read, update } = useListQuery();
  const selectedValue = read(name, defaultValue);
  return (
    <div className={isScrollable ? "seg seg-scroll" : "seg"} role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" className={selectedValue === option.value ? "on" : undefined} aria-pressed={selectedValue === option.value}
          onClick={() => update({ [name]: option.value === defaultValue ? null : option.value })}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
