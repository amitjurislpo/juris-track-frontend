import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { apiData } from "@/track/api";
import { useListQuery } from "@/track/components/list/useListQuery";
import { useTrack } from "@/track/TrackContext";

export interface PickerOption {
  value: string;
  label: string;
  /** A second line (an email, an employee code). */
  detail?: string;
}

/** Names of chosen values, remembered for this page visit (the URL holds only the id). */
const rememberedLabels = new Map<string, string>();

/** The label a filter shows for `value`: the remembered one, else the caller's (from the rows on screen), else null. */
export const rememberedLabel = (value: string) => rememberedLabels.get(value) ?? null;

/**
 * A filter that is chosen by searching (a combobox): typing searches the API (`searchPath(text)`, a moment after typing stops)
 * and lists the matches; choosing one writes its id to `?<name>=`. "Anyone" (the empty option) removes the filter. Nothing is
 * loaded until the field is used. Arrow keys move through the list, Enter chooses, Escape closes.
 */
export function SearchPicker<Data>({ name, label, emptyLabel, selectedLabel, searchPath, toOptions, fixedOptions = [] }: {
  name: string;
  label: string;
  /** The empty option ("Anyone", "Any business"). */
  emptyLabel: string;
  /** The name of the current value when the page knows it (from the rows on screen). */
  selectedLabel: string | null;
  searchPath: (text: string) => string;
  toOptions: (data: Data) => PickerOption[];
  /** Options that are always offered after the empty one ("No business"). */
  fixedOptions?: PickerOption[];
}) {
  const { t } = useTrack();
  const { read, update } = useListQuery();
  const selectedValue = read(name);
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(debounceTimer.current), []);

  const path = searchPath(searchText);
  const query = useQuery({
    queryKey: ["track", path],
    queryFn: () => apiData<Data>(path),
    enabled: isOpen,
    placeholderData: keepPreviousData,
  });
  const foundOptions = query.data ? toOptions(query.data) : [];
  const options: PickerOption[] = [{ value: "", label: emptyLabel }, ...fixedOptions, ...foundOptions];
  const fixedLabel = fixedOptions.find((option) => option.value === selectedValue)?.label;
  const shownLabel = selectedValue ? (fixedLabel ?? rememberedLabel(selectedValue) ?? selectedLabel ?? t("Selected")) : "";

  const close = () => { setIsOpen(false); setTypedText(""); setSearchText(""); };
  const choose = (option: PickerOption) => {
    if (option.value) rememberedLabels.set(option.value, option.label);
    update({ [name]: option.value || null });
    close();
  };

  return (
    <div className="picker">
      <label className="tsel picker-field">
        <span>{label}</span>
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && options[activeIndex] ? `${listId}-${activeIndex}` : undefined}
          value={isOpen ? typedText : shownLabel}
          placeholder={emptyLabel}
          onFocus={() => { setIsOpen(true); setActiveIndex(0); }}
          onClick={() => setIsOpen(true)}
          onBlur={close}
          onChange={(e) => {
            const text = e.target.value;
            setIsOpen(true);
            setTypedText(text);
            setActiveIndex(0);
            clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => setSearchText(text.trim()), 250);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setIsOpen(true); setActiveIndex((index) => Math.min(index + 1, options.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
            else if (e.key === "Enter" && isOpen) { e.preventDefault(); const option = options[activeIndex]; if (option) choose(option); (e.target as HTMLInputElement).blur(); }
            else if (e.key === "Escape" && isOpen) { e.stopPropagation(); close(); (e.target as HTMLInputElement).blur(); }
          }}
          maxLength={100}
        />
      </label>
      {isOpen && (
        <ul id={listId} role="listbox" aria-label={label} className="picker-list">
          {options.map((option, index) => (
            <li key={option.value || "any"} id={`${listId}-${index}`} role="option" aria-selected={index === activeIndex}
              className={index === activeIndex ? "on" : undefined}
              onMouseDown={(e) => { e.preventDefault(); choose(option); }} onMouseEnter={() => setActiveIndex(index)}>
              <span>{option.label}</span>
              {option.detail && <small>{option.detail}</small>}
            </li>
          ))}
          {query.isFetching && <li className="picker-note" aria-live="polite">{t("Searching…")}</li>}
          {query.isError && <li className="picker-note">{t("Could not search. Try again.")}</li>}
          {!query.isFetching && query.data !== undefined && !foundOptions.length && searchText && <li className="picker-note">{t("No matches")}</li>}
        </ul>
      )}
    </div>
  );
}
