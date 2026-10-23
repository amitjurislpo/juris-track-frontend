import { useListQuery } from "./useListQuery";

export interface FilterOption {
  value: string;
  label: string;
}

/** A dropdown filter (design `.tsel`) bound to `?<name>=`; choosing `defaultValue` removes the parameter. */
export function SelectFilter({ name, label, options, defaultValue }: { name: string; label: string; options: FilterOption[]; defaultValue: string }) {
  const { read, update } = useListQuery();
  return (
    <label className="tsel">
      <span>{label}</span>
      <select value={read(name, defaultValue)} onChange={(e) => update({ [name]: e.target.value === defaultValue ? null : e.target.value })}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
